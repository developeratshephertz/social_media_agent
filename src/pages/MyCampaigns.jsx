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
  const clearAllCampaigns = useCampaignStore((s) => s.clearAllCampaigns);
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
  const [selectedPlatformsForScheduling, setSelectedPlatformsForScheduling] = useState([]);
  const [schedulingProgress, setSchedulingProgress] = useState({
    visible: false,
    progress: 0,
    currentStep: 0,
    steps: ["Uploading to Drive", "Creating Calendar Events", "Finalizing"]
  });
  const [deleteBatchConfirm, setDeleteBatchConfirm] = useState(null);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '', preset: 'all' });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const handlePlatformToggle = (platform) => {
    setSelectedPlatformsForScheduling(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      }
      return [...prev, platform];
    });
  };

  // Date filter handlers
  const handleDateFilterPreset = (preset) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (preset) {
      case 'today':
        startDate = format(now, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = format(yesterday, 'yyyy-MM-dd');
        endDate = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'last7days':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = format(weekAgo, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'last30days':
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        startDate = format(monthAgo, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = format(lastMonth, 'yyyy-MM-dd');
        endDate = format(lastMonthEnd, 'yyyy-MM-dd');
        break;
      case 'all':
      default:
        startDate = '';
        endDate = '';
        break;
    }

    setDateFilter({ startDate, endDate, preset });
  };

  const clearDateFilter = () => {
    setDateFilter({ startDate: '', endDate: '', preset: 'all' });
  };

  const batches = useMemo(() => {
    // First filter campaigns by date if filter is active
    let filteredCampaigns = campaigns;
    
    if (dateFilter.startDate || dateFilter.endDate) {
      filteredCampaigns = campaigns.filter(campaign => {
        const createdAt = new Date(campaign.createdAt || Date.now());
        const campaignDate = format(createdAt, 'yyyy-MM-dd');
        
        let matchesFilter = true;
        
        if (dateFilter.startDate) {
          matchesFilter = matchesFilter && campaignDate >= dateFilter.startDate;
        }
        
        if (dateFilter.endDate) {
          matchesFilter = matchesFilter && campaignDate <= dateFilter.endDate;
        }
        
        return matchesFilter;
      });
    }
    
    // Group filtered campaigns into batches
    const map = new Map();
    for (const c of filteredCampaigns) {
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
  }, [campaigns, dateFilter]);

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
        try {
          // Method 1: Delete by calendarEventId if available
          if (item.calendarEventId) {
            await apiFetch(`/api/calendar/events/${item.calendarEventId}`, { method: "DELETE" });
          }
          // Method 2: Delete by post_id to catch any events not linked via calendarEventId
          const eventsResponse = await apiFetch(`/api/calendar/events/post/${item.id}`);
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            if (eventsData.success && eventsData.events) {
              for (const event of eventsData.events) {
                await apiFetch(`/api/calendar/events/${event.id}`, { method: "DELETE" });
              }
            }
          }
        } catch (eventError) {
          console.warn(`Failed to delete calendar events for campaign ${item.id}:`, eventError);
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
          
          // Best-effort: delete any existing calendar events for the post
          try {
            // Method 1: Delete by calendarEventId if available
            if (item.calendarEventId) {
              await apiFetch(`/api/calendar/events/${item.calendarEventId}`, { method: "DELETE" });
            }
            // Method 2: Delete by post_id to catch any events not linked via calendarEventId
            const eventsResponse = await apiFetch(`/api/calendar/events/post/${item.id}`);
            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              if (eventsData.success && eventsData.events) {
                for (const event of eventsData.events) {
                  await apiFetch(`/api/calendar/events/${event.id}`, { method: "DELETE" });
                }
              }
            }
          } catch (eventError) {
            console.warn(`Failed to delete calendar events for campaign ${item.id}:`, eventError);
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
      const numPosts = draftItems.length;
      let days = 2; // Default to 2 days
      
      // Try to fetch the original days parameter from the batch operation
      if (batchId && batchId !== "single") {
        try {
          const batchResponse = await apiFetch(`/api/batch/${batchId}/status`);
          if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            if (batchData.success && batchData.batch && batchData.batch.days_duration) {
              days = batchData.batch.days_duration;
              console.log(`📅 Retrieved original days parameter from batch: ${days}`);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch batch info for ${batchId}:`, error);
        }
      }
      
      // Fallback logic if we couldn't get the original days parameter
      if (days <= 0) {
        if (numPosts <= 3) {
          days = 1;
        } else if (numPosts <= 6) {
          days = 2;
        } else if (numPosts <= 14) {
          days = 7;
        } else {
          days = Math.ceil(numPosts / 3); // Distribute more posts across more days
        }
      }

      // Use backend API for consistent scheduling logic
      console.log(`📅 Getting schedule dates from backend for ${numPosts} posts across ${days} days`);
      let dates;
      try {
        const scheduleResponse = await apiClient.generateScheduleDates({
          num_posts: numPosts,
          days: days
        });
        
        if (!scheduleResponse || !scheduleResponse.schedule_times) {
          throw new Error('Failed to get schedule times from backend');
        }
        
        dates = scheduleResponse.schedule_times;
        console.log(`✅ Retrieved ${dates.length} schedule times from backend:`);
        dates.forEach((date, i) => {
          console.log(`   Post ${i + 1}: ${new Date(date).toLocaleString()}`);
        });
      } catch (error) {
        console.error('❌ Failed to get schedule from backend:', error);
        toast.error('Failed to generate schedule times');
        return;
      }

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

        // Use robust backend scheduling endpoint that automatically creates calendar events
        try {
          const scheduleResponse = await apiFetch(`/api/posts/${item.id}/schedule`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduled_at: dates[i],
              status: "scheduled",
              platforms: [selectedPlatformForScheduling || item.platform || "instagram"]
            })
          });

          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            if (scheduleData.success) {
              console.log(`✅ Campaign ${item.id} scheduled for ${new Date(dates[i]).toLocaleString()} with calendar event created`);
            } else {
              console.error(`❌ Failed to schedule campaign ${item.id}:`, scheduleData.error);
            }
          } else {
            const errorText = await scheduleResponse.text();
            console.error(`❌ Failed to schedule campaign ${item.id}: ${scheduleResponse.status} - ${errorText}`);
          }
        } catch (scheduleError) {
          console.error(`❌ Schedule error for campaign ${item.id}:`, scheduleError);
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

      // Refresh campaigns to get updated data after scheduling
      console.log('🔄 Refreshing campaigns after scheduling...');
      await loadCampaignsFromDB();

      // Step 4: Finalize
      setSchedulingProgress(prev => ({ ...prev, progress: 100, currentStep: 2 }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh calendar events
      await fetchCalendarEvents();

      const successMessage = googleConnected
        ? `Scheduled ${draftItems.length} posts and uploaded to Google Drive!`
        : `Scheduled ${draftItems.length} posts!`;

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showDateFilter || dateFilter.preset !== 'all'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Filter by Date
            {dateFilter.preset !== 'all' && (
              <span className="ml-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {dateFilter.preset === 'today' ? 'Today' :
                 dateFilter.preset === 'yesterday' ? 'Yesterday' :
                 dateFilter.preset === 'last7days' ? 'Last 7 days' :
                 dateFilter.preset === 'last30days' ? 'Last 30 days' :
                 dateFilter.preset === 'thisMonth' ? 'This month' :
                 dateFilter.preset === 'lastMonth' ? 'Last month' : 'Custom'}
              </span>
            )}
          </button>
          {dateFilter.preset !== 'all' && (
            <button
              onClick={clearDateFilter}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear filter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Panel */}
      {showDateFilter && (
        <Card>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Filter Campaigns by Creation Date</h3>
              <button
                onClick={() => setShowDateFilter(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Quick Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'last7days', label: 'Last 7 Days' },
                  { value: 'last30days', label: 'Last 30 Days' },
                  { value: 'thisMonth', label: 'This Month' },
                  { value: 'lastMonth', label: 'Last Month' }
                ].map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handleDateFilterPreset(preset.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      dateFilter.preset === preset.value
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date Range</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter(prev => ({ 
                      ...prev, 
                      startDate: e.target.value, 
                      preset: e.target.value || prev.endDate ? 'custom' : 'all' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter(prev => ({ 
                      ...prev, 
                      endDate: e.target.value, 
                      preset: prev.startDate || e.target.value ? 'custom' : 'all' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Filter Summary */}
            {(dateFilter.startDate || dateFilter.endDate) && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-800">
                    Showing campaigns created {dateFilter.startDate && dateFilter.endDate
                      ? `between ${format(new Date(dateFilter.startDate), 'MMM dd, yyyy')} and ${format(new Date(dateFilter.endDate), 'MMM dd, yyyy')}`
                      : dateFilter.startDate
                        ? `from ${format(new Date(dateFilter.startDate), 'MMM dd, yyyy')} onwards`
                        : `up to ${format(new Date(dateFilter.endDate), 'MMM dd, yyyy')}`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

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

      <Card title={`Campaigns ${dateFilter.preset !== 'all' ? `(${batches.length} ${batches.length === 1 ? 'batch' : 'batches'} found)` : ''}`}>
        <div className="divide-y">
          {batches.length === 0 && dateFilter.preset !== 'all' ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500 mb-4">
                No campaigns were created in the selected date range.
              </p>
              <button
                onClick={clearDateFilter}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear filter to show all campaigns
              </button>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500">Create your first campaign to get started.</p>
            </div>
          ) : (
            batches.map((b) => {
            const total = b.items.length;
            const scheduled = b.items.filter(
              (x) => x.status === "Scheduled"
            ).length;
            const posted = b.items.filter((x) => x.status === "Posted").length;
            const failed = b.items.filter((x) => x.status === "Failed").length;
            const sample = b.items[0];
            const name = sample?.campaignName || sample?.productDescription || "Untitled Campaign";
            const draft = b.items.filter((x) => x.status === "Draft").length;
            // More descriptive status logic
            let schedulingStatus;
            if (posted === total && posted > 0) {
              schedulingStatus = "Posted";
            } else if (failed > 0 && (posted + failed) === total) {
              schedulingStatus = posted > 0 ? "Partially Posted" : "Failed";
            } else if (scheduled > 0 && draft > 0) {
              schedulingStatus = "Partially Scheduled";
            } else if (scheduled > 0) {
              schedulingStatus = "Scheduled";
            } else if (draft > 0) {
              schedulingStatus = "Draft";
            } else {
              schedulingStatus = "Empty";
            }
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
                  <Badge color={
                    schedulingStatus === "Posted" ? "blue" :
                      schedulingStatus === "Partially Posted" ? "purple" :
                        schedulingStatus === "Scheduled" ? "green" :
                          schedulingStatus === "Partially Scheduled" ? "orange" :
                            schedulingStatus === "Draft" ? "yellow" :
                              schedulingStatus === "Failed" ? "red" : "gray"
                  }>
                    {schedulingStatus}
                  </Badge>
                  {/* Show Schedule button only if there are drafts AND no scheduled/posted posts */}
                  {draft > 0 && scheduled === 0 && posted === 0 ? (
                    // Blue Schedule button for campaigns with only drafts
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
                  ) : scheduled > 0 ? (
                    // Gray Scheduled button for campaigns that have any scheduled posts
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
                  ) : posted > 0 ? (
                    // Gray Posted button for campaigns that have posted content
                    <button
                      disabled
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md border border-blue-200 shadow-sm cursor-default"
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
                      Posted
                    </button>
                  ) : null}
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
          })
          )}
        </div>
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
                          {c.campaignName || c.productDescription}
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
      {!!deleteBatchConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete {(deleteBatchConfirm.items || []).length} Post{(deleteBatchConfirm.items || []).length !== 1 ? 's' : ''}?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to permanently delete {(deleteBatchConfirm.items || []).length > 1 ? 'these posts' : 'this post'}? 
                  This action cannot be undone and will remove all associated data including images, schedules, and calendar events.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setDeleteBatchConfirm(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    const id = deleteBatchConfirm.id;
                    setDeleteBatchConfirm(null);
                    await deleteBatch(id);
                  }}
                  className="flex-1"
                >
                  Yes, Delete {(deleteBatchConfirm.items || []).length > 1 ? 'All' : 'It'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  : (c.batchId === batchCalendarView || c.id === batchCalendarView)
              )?.campaignName || campaigns.find(c =>
                batchCalendarView === "single"
                  ? !c.batchId
                  : (c.batchId === batchCalendarView || c.id === batchCalendarView)
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
                events={(() => {
                console.log(`🔍 STARTING CALENDAR FILTER FOR BATCH: ${batchCalendarView}`);

                  // Get campaigns for this specific batch or individual campaign
                  const batchCampaigns = campaigns.filter(c => {
                    if (batchCalendarView === "single") {
                      return !c.batchId || c.batchId === null || c.batchId === undefined;
                    } else {
                      // More robust matching for batch ID
                      const matchesBatchId = String(c.batchId) === String(batchCalendarView);
                      const matchesId = String(c.id) === String(batchCalendarView);
                      return matchesBatchId || matchesId;
                    }
                  });

                  console.log(`📊 Found ${batchCampaigns.length} campaigns for batch ${batchCalendarView}`);
                  if (batchCampaigns.length === 0) {
                    console.log(`⚠️ No campaigns found for batch ${batchCalendarView}`);
                    return [];
                  }

                  // Simple and robust filtering by post_id
                  const batchPostIds = new Set(batchCampaigns.map(c => String(c.id)));
                  
                  const filteredEvents = allCalendarEvents.filter(event => {
                    const eventPostId = String(event.post_id || '');
                    return batchPostIds.has(eventPostId);
                  });

                  console.log(`✅ Returning ${filteredEvents.length} filtered events for batch ${batchCalendarView}`);
                  if (filteredEvents.length === 0) {
                    console.log(`⚠️ No events found for this batch`);
                  }

                  // If no events matched but we have campaigns, there might be a data sync issue
                  if (batchCampaigns.length > 0 && filteredEvents.length === 0) {
                    console.log(`❌ NO EVENTS MATCHED for batch with ${batchCampaigns.length} campaigns`);
                    console.log(`🔧 This indicates calendar events may not be properly linked to posts`);
                    return []; // Return empty array - don't show wrong events
                  }

                  return filteredEvents;
                })()}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose Platforms *</label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    {[
                      { id: "facebook", name: "Facebook", icon: "/icons/facebook.png" },
                      { id: "twitter", name: "X (Twitter)", icon: "/icons/x.png" },
                      { id: "reddit", name: "Reddit", icon: "/icons/reddit.png" }
                    ].map((platform) => (
                      <label
                        key={platform.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedPlatformsForScheduling.includes(platform.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlatformsForScheduling.includes(platform.id)}
                          onChange={(e) => {
                            console.log(`Checkbox clicked for ${platform.id}, checked: ${e.target.checked}`);
                            handlePlatformToggle(platform.id);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <img src={platform.icon} alt={platform.name} className="w-5 h-5" />
                        <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Campaign:</strong> {platformScheduleModal.items[0]?.campaignName || platformScheduleModal.items[0]?.productDescription || "Untitled"}<br />
                    <strong>Posts:</strong> {platformScheduleModal.items.filter(x => x.status === "Draft").length} draft posts will be scheduled for <strong>{selectedPlatformsForScheduling.length > 0 ? selectedPlatformsForScheduling.join(", ") : "no platforms selected"}</strong>
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
                      if (selectedPlatformsForScheduling.length === 0) {
                        toast.error("Please select at least one platform");
                        return;
                      }
                      const batch = platformScheduleModal;
                      setPlatformScheduleModal(null);
                      // Update campaigns with selected platforms before scheduling
                      const draftItems = batch.items.filter(item => item.status === "Draft");
                      draftItems.forEach(item => {
                        updateCampaign(item.id, { platforms: selectedPlatformsForScheduling });
                      });
                      // Then schedule the batch
                      scheduleBatch(batch.id, batch.items);
                    }}
                    size="sm"
                    disabled={selectedPlatformsForScheduling.length === 0}
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
