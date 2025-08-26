import { useMemo, useState, useEffect } from "react";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { useCampaignStore } from "../store/campaignStore.js";
import { toast } from "sonner";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import { format } from "date-fns";

const steps = ["Input", "Create", "Schedule"];

function Progress({ current = 0 }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, idx) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold " +
              (idx <= current
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600")
            }
          >
            {idx + 1}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={
                "w-10 h-0.5 " + (idx < current ? "bg-blue-600" : "bg-gray-200")
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CreateCampaign() {
  const [description, setDescription] = useState("");
  const [days, setDays] = useState("");
  const [numPosts, setNumPosts] = useState("");

  const [batchId, setBatchId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("instagram"); // Default platform
  const [creationProgress, setCreationProgress] = useState({
    visible: false,
    progress: 0,
    currentStep: 0,
    totalSteps: 0,
    steps: ["Generating Posts", "Saving to Database"]
  });
  const [schedulingProgress, setSchedulingProgress] = useState({
    visible: false,
    progress: 0,
    currentStep: 0,
    steps: ["Uploading to Drive", "Creating Calendar Events", "Finalizing Schedule"]
  });
  const [showImagePreview, setShowImagePreview] = useState(true);

  const campaigns = useCampaignStore((s) => s.campaigns);
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign);

  const batchItems = useMemo(
    () => campaigns.filter((c) => c.batchId === batchId),
    [campaigns, batchId]
  );

  const validate = () => {
    if (!description.trim()) {
      toast.error("Please enter a product description.");
      return false;
    }
    if (description.trim().length < 3) {
      toast.error("Description must be at least 3 characters long.");
      return false;
    }
    const d = parseInt(days, 10);
    const n = parseInt(numPosts, 10);
    if (Number.isNaN(d) || d <= 0) {
      toast.error("Days must be a positive number.");
      return false;
    }
    if (Number.isNaN(n) || n <= 0) {
      toast.error("Number of posts must be a positive number.");
      return false;
    }
    if (n > 20) {
      toast.error("Limit number of posts to 20 at once.");
      return false;
    }
    return true;
  };

  const createBatch = async () => {
    if (!validate()) return;
    setCreating(true);
    setProgressText("Creating batch...");
    
    // Show creation progress bar
    const totalPosts = parseInt(numPosts, 10);
    setCreationProgress({
      visible: true,
      progress: 0,
      currentStep: 0,
      totalSteps: totalPosts,
      steps: ["Generating Posts", "Saving to Database"]
    });
    
    try {
      // Step 1: Start generation
      setCreationProgress(prev => ({ ...prev, progress: 10, currentStep: 0 }));
      
      const res = await fetch("http://localhost:8000/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          days: parseInt(days, 10),
          num_posts: totalPosts,
        }),
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Batch failed");
      
      // Step 2: Processing completed, saving to database
      setCreationProgress(prev => ({ ...prev, progress: 80, currentStep: 1 }));
      
      // Use the actual batch_id from backend response
      const actualBatchId = data.batch_id;
      setBatchId(actualBatchId);
      
      let created = 0;
      // Count successful items
      for (const item of data.items) {
        if (item.error) continue;
        created += 1;
      }
      
      // Step 3: Finalize and load from database
      setCreationProgress(prev => ({ ...prev, progress: 100, currentStep: 1 }));
      
      toast.success(`Created ${created} posts in batch!`);
      setProgressText("");
      
      // Load the created campaigns to display them
      // The backend has already created them with the correct batch_id
      setTimeout(async () => {
        const { loadCampaignsFromDB } = useCampaignStore.getState();
        await loadCampaignsFromDB();
        console.log(`Campaigns reloaded from database for batch: ${actualBatchId}`);
      }, 500);
      
    } catch (e) {
      console.error(e);
      toast.error(String(e.message || e));
    } finally {
      setCreating(false);
      // Hide progress bar after a short delay
      setTimeout(() => {
        setCreationProgress(prev => ({ ...prev, visible: false }));
      }, 1000);
    }
  };

  const scheduleDates = (count, totalDays) => {
    const perDay = Math.ceil(count / Math.max(1, totalDays));
    const now = new Date();
    
    // Start from next hour after current time
    const startTime = new Date(now);
    startTime.setHours(now.getHours() + 1, 0, 0, 0);
    
    const out = [];
    for (let i = 0; i < count; i++) {
      const dayIndex = Math.floor(i / perDay);
      const slotIndex = i % perDay;
      
      let scheduleTime = new Date(startTime);
      scheduleTime.setDate(startTime.getDate() + dayIndex);
      
      if (perDay === 1) {
        // Single post per day, schedule 2 hours after start time or maintain time
        scheduleTime.setHours(scheduleTime.getHours() + (dayIndex * 2));
      } else {
        // Multiple posts per day, spread them out
        const hourStep = Math.max(1, Math.floor(12 / perDay)); // Spread over 12 hours
        scheduleTime.setHours(scheduleTime.getHours() + (slotIndex * hourStep));
        
        // Don't schedule too late (before 10 PM)
        if (scheduleTime.getHours() > 22) {
          scheduleTime.setHours(22, 0, 0, 0);
        }
      }
      
      out.push(scheduleTime.toISOString());
    }
    return out;
  };

  const scheduleBatch = async () => {
    if (!batchId) {
      toast.error("Create a batch first");
      return;
    }
    const n = batchItems.length;
    if (n === 0) return;
    
    setScheduling(true);
    setSchedulingProgress({
      visible: true,
      progress: 0,
      currentStep: 0,
      steps: ["Preparing Schedule", "Uploading to Drive", "Creating Calendar Events"]
    });
    
    try {
      const dates = scheduleDates(n, parseInt(days, 10));
      
      // Step 1: Update campaigns with schedule and platform
      setSchedulingProgress(prev => ({ ...prev, progress: 10, currentStep: 0 }));
      
      // Update campaigns with schedule info and platform in local state
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        
        // Update local state with scheduling info and platform
        updateCampaign(item.id, { 
          scheduledAt: dates[i], 
          status: "Scheduled", 
          platform: selectedPlatform 
        });
        
        // Also update the database with platform and scheduling info
        try {
          const updateResponse = await fetch(`http://localhost:8000/api/posts/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduled_at: dates[i],
              status: "scheduled",
              platform: selectedPlatform
            })
          });
          
          if (updateResponse.ok) {
            console.log(`📅 Campaign ${item.id} scheduled for ${new Date(dates[i]).toLocaleString()} on ${selectedPlatform}`);
          } else {
            console.error(`Failed to update database for campaign ${item.id}`);
          }
        } catch (dbUpdateError) {
          console.error(`Database update error for campaign ${item.id}:`, dbUpdateError);
        }
      }
      
      setSchedulingProgress(prev => ({ ...prev, progress: 30, currentStep: 1 }));
      
      // Step 2: Check Google connection and upload to Google Drive
      let googleConnected = false;
      try {
        const googleStatusResponse = await fetch("http://localhost:8000/google/status");
        const googleStatusData = await googleStatusResponse.json();
        googleConnected = googleStatusData.connected;
      } catch (error) {
        console.error("Failed to check Google status:", error);
      }
      
      if (googleConnected) {
        console.log("Google is connected, proceeding with Drive upload...");
        // Upload each campaign to Google Drive
        for (let i = 0; i < batchItems.length; i++) {
          const item = batchItems[i];
          try {
            // Ensure the imageUrl is in the correct format for backend access
            let processedImageUrl = item.imageUrl;
            if (processedImageUrl && processedImageUrl.startsWith('/public/')) {
              processedImageUrl = `http://localhost:8000${processedImageUrl}`;
            }
            
            const campaignData = {
              id: item.id,
              productDescription: item.productDescription || item.description,
              generatedContent: item.generatedContent || item.caption,
              scheduledAt: dates[i],
              status: "Scheduled",
              platform: selectedPlatform, // Include selected platform
              imageUrl: processedImageUrl,
              driveImageUrl: null, // Will be updated after upload
              activity: [
                { time: Date.now(), text: "Campaign created" },
                { time: Date.now(), text: "AI caption generated" },
                { time: Date.now(), text: "AI image generated" },
                { time: Date.now(), text: "Campaign scheduled" },
                { time: Date.now(), text: `Scheduled for ${selectedPlatform}` }
              ]
            };
            
            console.log(`Uploading campaign ${item.id} to Google Drive...`);
            const driveResponse = await fetch("http://localhost:8000/google-drive/save-campaign", {
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
                console.log(`   - JSON file ID: ${driveData.fileId}`);
                if (driveData.imageFileId) {
                  console.log(`   - Image file ID: ${driveData.imageFileId}`);
                  console.log(`   - Drive image URL: ${driveData.driveImageUrl}`);
                }
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
          const driveProgress = 30 + ((i + 1) / batchItems.length) * 30;
          setSchedulingProgress(prev => ({ ...prev, progress: driveProgress }));
        }
        console.log("✅ Google Drive upload process completed");
      } else {
        console.log("⚠️ Google not connected, skipping Drive upload");
        setSchedulingProgress(prev => ({ ...prev, progress: 60 }));
      }
      
      setSchedulingProgress(prev => ({ ...prev, progress: 60, currentStep: 2 }));
      
      // Step 3: Create calendar events
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        try {
          const eventData = {
            title: `📱 ${item.productDescription?.substring(0, 40) || 'Campaign Post'}`,
            description: item.generatedContent || item.productDescription,
            start_time: dates[i],
            end_time: new Date(new Date(dates[i]).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
            color: "#3174ad",
            all_day: false,
            post_id: item.id
          };
          
          const calendarResponse = await fetch("http://localhost:8000/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData)
          });
          
          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            if (calendarData.success) {
              // Update campaign with calendar event info
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
                productDescription: item.productDescription || item.description,
                generatedContent: item.generatedContent || item.caption,
                scheduledAt: dates[i],
                status: "Scheduled",
                imageUrl: item.imageUrl,
                driveImageUrl: item.driveImageUrl || item.imageUrl,
                activity: [{ time: Date.now(), text: "Calendar event created" }]
              };
              
              console.log(`📅 Creating Google Calendar event for ${item.id}...`);
              const googleCalendarResponse = await fetch("http://localhost:8000/google-calendar/create-event", {
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
                  console.log(`✅ Google Calendar event created for campaign ${item.id}: ${googleCalData.eventLink}`);
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
        const progress = 60 + ((i + 1) / batchItems.length) * 40;
        setSchedulingProgress(prev => ({ ...prev, progress }));
      }
      
      // Finalize
      setSchedulingProgress(prev => ({ ...prev, progress: 100, currentStep: 2 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const successMessage = googleConnected 
        ? `Scheduled ${n} posts, saved to database, uploaded to Google Drive, and created calendar events! Redirecting to My Campaigns...`
        : `Scheduled ${n} posts, saved to database, and created calendar events! Redirecting to My Campaigns...`;
      
      toast.success(successMessage);
      
      // Navigate to My Campaigns after a short delay
      setTimeout(() => {
        window.location.href = '/campaigns';
      }, 1500);
      
    } catch (error) {
      console.error("Error during scheduling:", error);
      toast.error("Failed to complete scheduling process");
    } finally {
      setScheduling(false);
      setTimeout(() => {
        setSchedulingProgress(prev => ({ ...prev, visible: false }));
      }, 1000);
    }
  };

  const deleteAndReplace = async (idToDelete) => {
    const current = batchItems.find((b) => b.id === idToDelete);
    deleteCampaign(idToDelete);
    try {
      const res = await fetch("http://localhost:8000/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      createCampaign({
        description: description.trim(),
        caption: data.caption,
        imageUrl: `http://localhost:8000${data.image_path}`,
        status: current?.status || "Draft",
        scheduledAt: current?.scheduledAt || null,
        batchId,
      });
      toast.success("Replaced with a new post");
    } catch (e) {
      toast.error("Failed to replace post");
    }
  };

  const currentStep =
    batchItems.length > 0
      ? batchItems.some((b) => b.status === "Scheduled")
        ? 2
        : 1
      : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create Campaign</h1>
      </div>

      <Card
        title="Campaign Details"
        action={<Progress current={currentStep} />}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="border rounded-md p-3">
            <Input
              label="Product Description"
              placeholder="Enter your product description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-md p-3">
              <Input
                label="Days"
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="border rounded-md p-3">
              <Input
                label="Number of Posts"
                type="number"
                min={1}
                placeholder="e.g. 10"
                value={numPosts}
                onChange={(e) => setNumPosts(e.target.value)}
              />
            </div>
          </div>
          <div className="text-xs text-gray-600 border rounded-md p-3 bg-gray-50">
            <div className="font-medium mb-1">Example</div>
            Description: "Eco-friendly bamboo toothbrush" | Days: 5 | Number of
            Posts: 10
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Platform Selection Dropdown - Only show after posts are created but before scheduling */}
            {batchItems.length > 0 && !batchItems.some(b => b.status === "Scheduled") && (
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Choose Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
                >
                  <option value="instagram">📷 Instagram</option>
                  <option value="facebook">👥 Facebook</option>
                  <option value="twitter">🐦 X (Twitter)</option>
                </select>
                <p className="text-xs text-gray-600 text-center">
                  All {batchItems.length} posts will be scheduled for <strong>{selectedPlatform}</strong>
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              {!batchId ? (
                <Button
                  type="button"
                  onClick={createBatch}
                  disabled={creating}
                  size="sm"
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={scheduleBatch}
                  disabled={scheduling}
                  size="sm"
                >
                  {scheduling ? "Scheduling..." : "Schedule"}
                </Button>
              )}
            </div>
          </div>

          {progressText && (
            <div className="text-xs text-gray-600">{progressText}</div>
          )}
        </div>
      </Card>

      {/* Progress Bar for Creation */}
      {creationProgress.visible && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Creating Posts...</h3>
            <ProgressBar
              progress={creationProgress.progress}
              isVisible={creationProgress.visible}
              steps={creationProgress.steps}
              currentStep={creationProgress.currentStep}
              variant="primary"
            />
          </div>
        </Card>
      )}

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

      {/* Batch Items Preview */}
      {batchItems.length > 0 && (
        <Card title={`Created Posts (${batchItems.length})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {batchItems.map((item, index) => (
              <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm bg-white">
                <div className="bg-gray-100 aspect-video overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productDescription}
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
                    <Badge color={item.status === "Scheduled" ? "green" : "gray"}>
                      {item.status}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      Post {index + 1}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                    {item.productDescription}
                  </div>
                  {item.generatedContent && (
                    <div className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {item.generatedContent}
                    </div>
                  )}
                  {item.scheduledAt && (
                    <div className="text-xs text-green-600">
                      📅 Scheduled: {format(new Date(item.scheduledAt), "MMM d, h:mm a")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}

export default CreateCampaign;
