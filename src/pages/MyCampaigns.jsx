import { useMemo, useState, useEffect } from "react";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import DatePicker from "../components/ui/DatePicker.jsx";
import Calendar from "../components/Calendar.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import PostEventModal from "../components/PostEventModal.jsx";
import { useCampaignStore } from "../store/campaignStore.js";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiFetch, apiUrl } from "../lib/api.js";
import apiClient from "../lib/apiClient.js";

function statusColor(status) {
  if (status === "Posted") return "green";
  if (status === "Scheduled") return "yellow";
  if (status === "Failed") return "red";
  return "gray";
}

function IconButton({ title, onClick, children, variant = "ghost" }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        "inline-flex items-center justify-center h-8 w-8 rounded-md border border-transparent " +
        (variant === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100")
      }
    >
      {children}
    </button>
  );
}

function MyCampaigns() {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign);
  const deleteCampaignsWhere = useCampaignStore((s) => s.deleteCampaignsWhere);
  const loadCampaignsFromDB = useCampaignStore((s) => s.loadCampaignsFromDB);
  const isLoading = useCampaignStore((s) => s.isLoading);

  const [scheduleForId, setScheduleForId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [viewBatchId, setViewBatchId] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [viewMode, setViewMode] = useState("batches"); // "batches" or "calendar"
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedPostEvent, setSelectedPostEvent] = useState(null);
  const [isPostEventModalOpen, setIsPostEventModalOpen] = useState(false);
  const [batchCalendarView, setBatchCalendarView] = useState(null); // For batch-specific calendar
  const [platformScheduleModal, setPlatformScheduleModal] = useState(null); // For platform selection when scheduling
  const [selectedPlatformForScheduling, setSelectedPlatformForScheduling] = useState("instagram");
  const [schedulingProgress, setSchedulingProgress] = useState({
    visible: false,
    progress: 0,
    currentStep: 0,
    steps: ["Uploading to Drive", "Creating Calendar Events", "Finalizing"]
  });
  const [deleteBatchConfirm, setDeleteBatchConfirm] = useState(null);

  const batches = useMemo(() => {
    const map = new Map();
    for (const c of campaigns) {
      const key = c.batchId || "single";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    const list = [];
    map.forEach((arr, key) => list.push({ id: key, items: arr }));
    // sort by most recent createdAt in batch
    return list.sort(
      (a, b) => (b.items[0]?.createdAt || 0) - (a.items[0]?.createdAt || 0)
    );
  }, [campaigns]);

  const saveSchedule = () => {
    if (!scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(
      `${scheduleDate}T${scheduleTime}:00`
    ).toISOString();
    updateCampaign(scheduleForId, { scheduledAt, status: "Scheduled" });
    setScheduleForId(null);
  };

  const deleteBatch = async (batchId) => {
    const itemsToDelete = campaigns.filter((c) =>
      batchId === "single" ? !c.batchId : c.batchId === batchId
    );
    
    if (itemsToDelete.length === 0) {
      toast.error("No items to delete");
      return;
    }
    
    try {
      // Best-effort delete any linked calendar events first
      await Promise.allSettled(itemsToDelete.map(async (item) => {
        if (item.calendarEventId) {
          try { await apiFetch(`/api/calendar/events/${item.calendarEventId}`, { method: "DELETE" }); } catch {}
        }
      }));

      // Delete each campaign via store (optimistic + backend)
      const results = await Promise.allSettled(itemsToDelete.map((item) => deleteCampaign(item.id)));
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed === 0) {
        toast.success(`Deleted ${itemsToDelete.length} posts`);
      } else if (failed < itemsToDelete.length) {
        toast.warning(`Deleted ${itemsToDelete.length - failed} posts. ${failed} failed.`);
      } else {
        toast.error("Failed to delete posts");
      }

      // Refresh campaigns from database to ensure consistency
      await loadCampaignsFromDB();
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast.error("Failed to delete some items");
      await loadCampaignsFromDB();
    }
  };

  // Save entire batch as Draft (unschedule + keep)
  const saveBatchAsDraft = async (batchId) => {
    const itemsToDraft = campaigns.filter((c) =>
      batchId === "single" ? !c.batchId : c.batchId === batchId
    );
    if (itemsToDraft.length === 0) {
      toast.error("No items to update");
      return;
    }
    try {
      // For each item: clear schedule and set Draft
      for (const item of itemsToDraft) {
        try {
          // Update local + DB via store helper
          await updateCampaign(item.id, { status: "Draft", scheduledAt: null });
          // Best-effort: delete any existing calendar event for the post
          if (item.calendarEventId) {
            try {
              await apiFetch(`/api/calendar/events/${item.calendarEventId}`, { method: "DELETE" });
            } catch {}
          }
        } catch (e) {
          console.warn("Failed to save as draft:", item.id, e);
        }
      }
      toast.success(`Saved ${itemsToDraft.length} posts as Draft`);
    } catch (e) {
      console.error("Batch draft save failed:", e);
      toast.error("Failed to save items as Draft");
    }
  };

  // Load campaigns from database on component mount
  useEffect(() => {
    loadCampaignsFromDB();
  }, [loadCampaignsFromDB]);

  // Load calendar events and database posts on component mount
  useEffect(() => {
    fetchCalendarEvents();
    fetchDatabasePosts();
  }, [campaigns]);

  // Fetch calendar events from backend
  const fetchCalendarEvents = async () => {
    try {
      const data = await apiClient.getCalendarEvents();
      if (data && data.success) {
        setCalendarEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
    }
  };

  // Fetch posts from database to ensure calendar reflects database state
  const fetchDatabasePosts = async () => {
    try {
      const data = await apiClient.getPosts({ limit: 50 });
      if (data && data.success && data.posts) {
        console.log(`Fetched ${data.posts.length} posts from database`);
        data.posts.forEach(post => {
          if (post.scheduled_at) {
            console.log(`Database post: ${post.original_description} scheduled for ${post.scheduled_at}`);
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch database posts:", error);
    }
  };

  // Enhanced schedule batch with progress tracking and Google integration
  const scheduleBatch = async (batchId, items) => {
    const draftItems = items.filter(item => item.status === "Draft");
    if (draftItems.length === 0) {
      toast.error("No draft items to schedule");
      return;
    }

    setIsScheduling(true);
    setSchedulingProgress({
      visible: true,
      progress: 0,
      currentStep: 0,
      steps: ["Scheduling Posts", "Uploading to Drive", "Creating Calendar Events"]
    });

    try {
      // Use the same scheduling logic as in CreateCampaign
      const scheduleDates = (count) => {
        const now = new Date();
        const startTime = new Date(now);
        startTime.setHours(now.getHours() + 1, 0, 0, 0);
        
        const out = [];
        for (let i = 0; i < count; i++) {
          let scheduleTime = new Date(startTime);
          // Space posts 2 hours apart
          scheduleTime.setHours(scheduleTime.getHours() + (i * 2));
          
          // Don't schedule too late (before 10 PM)
          if (scheduleTime.getHours() > 22) {
            scheduleTime.setDate(scheduleTime.getDate() + 1);
            scheduleTime.setHours(10, 0, 0, 0);
          }
          
          out.push(scheduleTime.toISOString());
        }
        return out;
      };

      const dates = scheduleDates(draftItems.length);
      
      // Step 1: Update campaigns with schedule info
      setSchedulingProgress(prev => ({ ...prev, progress: 10, currentStep: 0 }));
      
      // Update campaigns with schedule and platform
      draftItems.forEach(async (item, i) => {
        const updatedData = {
          scheduledAt: dates[i], 
          status: "Scheduled",
          platform: selectedPlatformForScheduling || item.platform || "instagram"
        };
        
        // Update local state
        updateCampaign(item.id, updatedData);
        
        // Also update the database
        try {
          const updateResponse = await apiFetch(`/api/posts/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduled_at: dates[i],
              status: "scheduled",
              platform: selectedPlatformForScheduling || item.platform || "instagram"
            })
          });
          
          if (updateResponse.ok) {
            console.log(`📅 Campaign ${item.id} scheduled for ${new Date(dates[i]).toLocaleString()} on ${selectedPlatformForScheduling || item.platform || "instagram"}`);
          } else {
            console.error(`Failed to update database for campaign ${item.id}`);
          }
        } catch (dbUpdateError) {
          console.error(`Database update error for campaign ${item.id}:`, dbUpdateError);
        }
      });
      
      setSchedulingProgress(prev => ({ ...prev, progress: 30, currentStep: 1 }));
      
      // Step 2: Check Google connection and upload to Google Drive
      let googleConnected = false;
      try {
        const googleStatusResponse = await apiFetch("/google/status");
        const googleStatusData = await googleStatusResponse.json();
        googleConnected = googleStatusData.connected;
        console.log(`Google connection status: ${googleConnected}`);
      } catch (error) {
        console.error("Failed to check Google status:", error);
      }
      
      if (googleConnected) {
        console.log("Google is connected, proceeding with Drive upload...");
        // Upload each campaign to Google Drive
        for (let i = 0; i < draftItems.length; i++) {
          const item = draftItems[i];
          try {
            // Ensure the imageUrl is in the correct format for backend access
            let processedImageUrl = item.imageUrl;
            if (processedImageUrl && processedImageUrl.startsWith('/public/')) {
              processedImageUrl = apiUrl(processedImageUrl);
            }
            
            const campaignData = {
              id: item.id,
              productDescription: item.productDescription,
              generatedContent: item.generatedContent,
              scheduledAt: dates[i],
              status: "Scheduled",
              platform: selectedPlatformForScheduling || item.platform || "instagram",
              imageUrl: processedImageUrl,
              activity: [
                { time: Date.now(), text: "Campaign created" },
                { time: Date.now(), text: "AI caption generated" },
                { time: Date.now(), text: "AI image generated" },
                { time: Date.now(), text: "Campaign scheduled" },
                { time: Date.now(), text: `Scheduled for ${selectedPlatformForScheduling || item.platform || "instagram"}` }
              ]
            };
            
            console.log(`Uploading campaign ${item.id} to Google Drive...`);
            const driveResponse = await apiFetch("/google-drive/save-campaign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(campaignData)
            });
            
            if (driveResponse.ok) {
              const driveData = await driveResponse.json();
              console.log(`Drive response for ${item.id}:`, driveData);
              if (driveData.success) {
                // Update campaign with Google Drive info
                updateCampaign(item.id, { 
                  driveFileId: driveData.fileId,
                  driveImageUrl: driveData.driveImageUrl || item.imageUrl,
                  imageFileId: driveData.imageFileId
                });
                console.log(`✅ Campaign ${item.id} uploaded to Google Drive successfully`);
              } else {
                console.error(`❌ Drive upload failed for ${item.id}:`, driveData.error || 'Unknown error');
              }
            } else {
              const errorText = await driveResponse.text();
              console.error(`❌ Failed to upload campaign ${item.id} to Google Drive: ${driveResponse.status} - ${errorText}`);
            }
          } catch (driveError) {
            console.error(`❌ Google Drive upload error for campaign ${item.id}:`, driveError);
          }
          
          // Update progress
          const driveProgress = 30 + ((i + 1) / draftItems.length) * 30;
          setSchedulingProgress(prev => ({ ...prev, progress: driveProgress }));
        }
        console.log("✅ Google Drive upload process completed");
      } else {
        console.log("⚠️ Google not connected, skipping Drive upload");
        setSchedulingProgress(prev => ({ ...prev, progress: 60 }));
      }
      
      setSchedulingProgress(prev => ({ ...prev, progress: 60, currentStep: 2 }));
      
      // Step 3: Create calendar events for each scheduled item
      for (let i = 0; i < draftItems.length; i++) {
        const item = draftItems[i];
        try {
          const eventData = {
            title: `📱 Post: ${item.productDescription?.substring(0, 50)}...`,
            description: item.generatedContent || item.productDescription,
            start_time: dates[i],
            end_time: dates[i], // Point-in-time event matching scheduled time
            color: "#3174ad",
            post_id: item.id
          };
          
          const response = await apiFetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData)
          });
          
          if (response.ok) {
            const calendarData = await response.json();
            if (calendarData.success) {
              updateCampaign(item.id, { 
                calendarEventId: calendarData.event?.id
              });
              console.log(`Calendar event created for campaign ${item.id}`);
            }
          } else {
            console.error(`Failed to create calendar event for ${item.id}`);
          }
          
          // Also create Google Calendar event if connected
          if (googleConnected) {
            try {
              const googleCalendarData = {
                id: item.id,
                productDescription: item.productDescription,
                generatedContent: item.generatedContent,
                scheduledAt: dates[i],
                status: "Scheduled",
                imageUrl: item.imageUrl,
                driveImageUrl: item.driveImageUrl || item.imageUrl,
                activity: [{ time: Date.now(), text: "Calendar event created" }]
              };
              
              console.log(`📅 Creating Google Calendar event for ${item.id}...`);
              const googleCalendarResponse = await apiFetch("/google-calendar/create-event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(googleCalendarData)
              });
              
              if (googleCalendarResponse.ok) {
                const googleCalData = await googleCalendarResponse.json();
                console.log(`Google Calendar response for ${item.id}:`, googleCalData);
                if (googleCalData.success) {
                  updateCampaign(item.id, { 
                    googleCalendarEventId: googleCalData.eventId,
                    googleCalendarLink: googleCalData.eventLink
                  });
                  console.log(`✅ Google Calendar event created for campaign ${item.id}`);
                } else {
                  console.error(`❌ Google Calendar creation failed for ${item.id}:`, googleCalData.error || 'Unknown error');
                }
              } else {
                const errorText = await googleCalendarResponse.text();
                console.error(`❌ Failed to create Google Calendar event for ${item.id}: ${googleCalendarResponse.status} - ${errorText}`);
              }
            } catch (googleCalError) {
              console.error(`❌ Google Calendar error for campaign ${item.id}:`, googleCalError);
            }
          }
        } catch (error) {
          console.error(`Error creating calendar event for ${item.id}:`, error);
        }
        
        // Update progress
        const progress = 60 + ((i + 1) / draftItems.length) * 40;
        setSchedulingProgress(prev => ({ ...prev, progress }));
      }
      
      // Step 4: Finalize
      setSchedulingProgress(prev => ({ ...prev, progress: 100, currentStep: 2 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh calendar events
      await fetchCalendarEvents();
      
      const successMessage = googleConnected 
        ? `Scheduled ${draftItems.length} draft posts, uploaded to Google Drive, and created calendar events!`
        : `Scheduled ${draftItems.length} draft posts and created calendar events!`;
      
      toast.success(successMessage);
      
    } catch (error) {
      console.error("Error during scheduling:", error);
      toast.error("Failed to complete scheduling process");
    } finally {
      setIsScheduling(false);
      setTimeout(() => {
        setSchedulingProgress(prev => ({ ...prev, visible: false }));
      }, 1000);
    }
  };

  // Calendar event handlers
  const handleCalendarEventCreate = async (eventData) => {
    try {
      const response = await apiFetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCalendarEvents();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  };

  const handleCalendarEventUpdate = async (eventId, updateData) => {
    try {
      const response = await apiFetch(`/api/calendar/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCalendarEvents();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  };

  const handleCalendarEventDelete = async (eventId) => {
    try {
      const response = await apiFetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE"
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCalendarEvents();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  };

  // Only use PostgreSQL calendar events to avoid duplicates
  const allCalendarEvents = useMemo(() => {
    return calendarEvents.map(event => ({
      ...event,
      // Ensure consistent data format
      start: event.start_time || event.start,
      end: event.end_time || event.end,
      title: event.title || `📱 Post Event`,
      metadata: {
        ...event.metadata,
        type: "database_event"
      }
    }));
  }, [calendarEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Campaigns</h1>
      </div>
      
      {/* Progress Bar for Scheduling */}
      {schedulingProgress.visible && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Scheduling Posts...</h3>
            <ProgressBar
              progress={schedulingProgress.progress}
              isVisible={schedulingProgress.visible}
              steps={schedulingProgress.steps}
              currentStep={schedulingProgress.currentStep}
              variant="primary"
            />
          </div>
        </Card>
      )}

      <Card title="Campaigns">
        <div className="divide-y">
          {batches.map((b) => {
            const total = b.items.length;
            const scheduled = b.items.filter(
              (x) => x.status === "Scheduled"
            ).length;
            const posted = b.items.filter((x) => x.status === "Posted").length;
            const failed = b.items.filter((x) => x.status === "Failed").length;
            const sample = b.items[0];
            const name = sample?.productDescription || "Untitled Campaign";
            const draft = b.items.filter((x) => x.status === "Draft").length;
            const schedulingStatus = scheduled > 0 ? "Scheduled" : draft > 0 ? "Draft" : "Empty";
            return (
              <div
                key={b.id}
                className="flex items-center py-4 px-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-medium text-gray-900 truncate mb-1">{name}</div>
                  <div className="text-sm text-gray-500">
                    {total} posts • Created {new Date(sample?.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge color={schedulingStatus === "Scheduled" ? "green" : schedulingStatus === "Draft" ? "yellow" : "gray"}>
                    {schedulingStatus}
                  </Badge>
                  {/* Always show Schedule button - blue for drafts, gray for scheduled */}
                  {draft > 0 ? (
                    // Blue Schedule button for campaigns with drafts
                    <button
                      onClick={() => setPlatformScheduleModal(b)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md border border-blue-600 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      Schedule
                    </button>
                  ) : (
                    // Gray Scheduled button for campaigns that are already scheduled
                    <button
                      disabled
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md border border-gray-200 shadow-sm cursor-default"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      Scheduled
                    </button>
                  )}
                  <IconButton title="View" onClick={() => setViewBatchId(b.id)}>
                    {/* eye icon */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </IconButton>
                  <IconButton 
                    title="View Calendar" 
                    onClick={() => setBatchCalendarView(b.id)}
                  >
                    {/* calendar icon */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </IconButton>
                  <IconButton
                    title="Delete"
                    variant="danger"
                    onClick={() => setDeleteBatchConfirm(b)}
                  >
                    {/* trash icon */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
        {batches.length === 0 && (
          <div className="text-center text-gray-500 py-10">No batches yet.</div>
        )}
      </Card>

      <Modal
        open={!!viewBatchId}
        onOpenChange={(open) => !open && setViewBatchId(null)}
      >
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[95vw] max-w-6xl max-height-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Batch Details</h2>
            <IconButton title="Close" onClick={() => setViewBatchId(null)}>
              {/* x icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {viewBatchId && campaigns.filter((c) => 
              viewBatchId === "single" ? !c.batchId : c.batchId === viewBatchId
            ).length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <div className="text-4xl mb-2">📦</div>
                <div>No posts found in this batch.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns
                  .filter((c) => 
                    viewBatchId === "single" ? !c.batchId : c.batchId === viewBatchId
                  )
                  .map((c) => (
                  <div key={c.id} className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-100 aspect-video overflow-hidden">
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.productDescription}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-4xl">🖼️</div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge color={statusColor(c.status)}>{c.status}</Badge>
                        <div className="text-xs text-gray-500">
                          {c.scheduledAt
                            ? format(new Date(c.scheduledAt), "PP p")
                            : "Not scheduled"}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 line-clamp-2">
                        {c.productDescription}
                      </div>
                      {c.generatedContent && (
                        <div className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                          {c.generatedContent}
                        </div>
                      )}
                    </div>
                  </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteBatchConfirm}
        onOpenChange={(open) => !open && setDeleteBatchConfirm(null)}
      >
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[90vw] max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Delete Campaigns</h2>
            <IconButton title="Close" onClick={() => setDeleteBatchConfirm(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </IconButton>
          </div>
          <div className="p-6 space-y-4">
            {deleteBatchConfirm && (
              <>
                <p className="text-sm text-gray-700">
                  You are about to remove <strong>{(deleteBatchConfirm.items || []).length}</strong> post(s) from <strong>{deleteBatchConfirm.items?.[0]?.productDescription || 'this campaign'}</strong>.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  Choose "Save as Draft" to keep the posts but unschedule them, or "Delete Permanently" to remove them.
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setDeleteBatchConfirm(null)} size="sm">Cancel</Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const id = deleteBatchConfirm.id;
                      setDeleteBatchConfirm(null);
                      await saveBatchAsDraft(id);
                    }}
                    size="sm"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      const id = deleteBatchConfirm.id;
                      setDeleteBatchConfirm(null);
                      await deleteBatch(id);
                    }}
                    size="sm"
                  >
                    Delete Permanently
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!scheduleForId}
        onClose={() => setScheduleForId(null)}
        title="Schedule Campaign"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <DatePicker value={scheduleDate} onChange={setScheduleDate} />
            </div>
            <Input
              label="Time"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setScheduleForId(null)}>
              Cancel
            </Button>
            <Button onClick={saveSchedule}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Batch-specific Calendar Modal */}
      <Modal
        open={!!batchCalendarView}
        onOpenChange={(open) => !open && setBatchCalendarView(null)}
      >
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Calendar - {campaigns.find(c => 
                batchCalendarView === "single" 
                  ? !c.batchId 
                  : c.batchId === batchCalendarView
              )?.productDescription || "Batch"}
            </h2>
            <IconButton title="Close" onClick={() => setBatchCalendarView(null)}>
              {/* x icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </div>
          <div className="p-6 h-[calc(90vh-120px)]">
            {batchCalendarView && (
              <Calendar
                events={allCalendarEvents.filter(event => {
                  // Filter events to only show those from this batch
                  const batchCampaigns = campaigns.filter(c => 
                    batchCalendarView === "single" 
                      ? !c.batchId 
                      : c.batchId === batchCalendarView
                  );
                  const batchCampaignIds = batchCampaigns.map(c => c.id);
                  return batchCampaignIds.includes(event.post_id);
                })}
                onEventCreate={handleCalendarEventCreate}
                onEventUpdate={handleCalendarEventUpdate}
                onEventDelete={handleCalendarEventDelete}
                onEventSelect={(event) => {
                  setSelectedPostEvent(event);
                  setIsPostEventModalOpen(true);
                }}
                editable={true}
                height={window.innerHeight - 200}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Platform Selection Modal for Scheduling */}
      <Modal
        open={!!platformScheduleModal}
        onOpenChange={(open) => !open && setPlatformScheduleModal(null)}
      >
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[90vw] max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Choose Platform & Schedule</h2>
            <IconButton title="Close" onClick={() => setPlatformScheduleModal(null)}>
              {/* x icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </div>
          <div className="p-6">
            {platformScheduleModal && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Platform</label>
                  <select
                    value={selectedPlatformForScheduling}
                    onChange={(e) => setSelectedPlatformForScheduling(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="instagram">📷 Instagram</option>
                    <option value="facebook">👥 Facebook</option>
                    <option value="twitter">🐦 X (Twitter)</option>
                  </select>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Campaign:</strong> {platformScheduleModal.items[0]?.productDescription || "Untitled"}<br/>
                    <strong>Posts:</strong> {platformScheduleModal.items.filter(x => x.status === "Draft").length} draft posts will be scheduled for <strong>{selectedPlatformForScheduling}</strong>
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => setPlatformScheduleModal(null)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      const batch = platformScheduleModal;
                      setPlatformScheduleModal(null);
                      // Update campaigns with selected platform before scheduling
                      const draftItems = batch.items.filter(item => item.status === "Draft");
                      draftItems.forEach(item => {
                        updateCampaign(item.id, { platform: selectedPlatformForScheduling });
                      });
                      // Then schedule the batch
                      scheduleBatch(batch.id, batch.items);
                    }}
                    size="sm"
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Custom Post Event Modal */}
      <PostEventModal
        isOpen={isPostEventModalOpen}
        onClose={() => {
          setIsPostEventModalOpen(false);
          setSelectedPostEvent(null);
        }}
        event={selectedPostEvent}
        onEventUpdate={handleCalendarEventUpdate}
        onEventDelete={handleCalendarEventDelete}
      />
    </div>
  );
}

export default MyCampaigns;
