import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { useCampaignStore } from "../store/campaignStore.js";
import { toast } from "sonner";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import { format } from "date-fns";
import apiClient from "../lib/apiClient.js";
import { apiUrl } from "../lib/api.js";

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
  const location = useLocation();
  const [description, setDescription] = useState("");
  const [days, setDays] = useState("");
  const [numPosts, setNumPosts] = useState("");
  const [trendingInfo, setTrendingInfo] = useState(null);

  const [batchId, setBatchId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [subreddit, setSubreddit] = useState("");
  const [imageProvider, setImageProvider] = useState("stability");
  const [imageProviders, setImageProviders] = useState([]);
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
  const [showPlatformOptions, setShowPlatformOptions] = useState(false);
  const [platformsByPost, setPlatformsByPost] = useState({});

  const updatePlatformsForPost = (postId, platform) => {
    setPlatformsByPost(prev => {
      const current = prev[postId] || [];
      const next = current.includes(platform) ? current.filter(p => p !== platform) : [...current, platform];
      return { ...prev, [postId]: next };
    });
  };

  const campaigns = useCampaignStore((s) => s.campaigns);
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign);

  const wsRef = useRef(null);

  const handlePlatformToggle = (platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      }
      return [...prev, platform];
    });
  };

  const batchItems = useMemo(
    () => campaigns.filter((c) => c.batchId === batchId),
    [campaigns, batchId]
  );

  const validate = () => {
    if (!description.trim()) {
      toast.error("Please enter a campaign description.");
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

  // Handle pre-filled data from trending topics or other sources
  useEffect(() => {
    if (location.state) {
      const { prefilledDescription, fromTrending, trendingTopic, trendingCategory } = location.state;
      
      if (prefilledDescription && fromTrending) {
        setDescription(prefilledDescription);
        setTrendingInfo({ topic: trendingTopic, category: trendingCategory });
        
        // Set default values for trending topics
        if (!days) setDays("7");
        if (!numPosts) setNumPosts("5");
        
        toast.success(`🔥 Creating content for trending topic: ${trendingTopic}`);
        
        // Clear the state to prevent re-triggering on re-renders
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  // Load available providers from backend health endpoint
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const health = await apiClient.getHealth();
        const services = (health && health.services) || {};
        const caps = [];
        if (services.groq_configured) caps.push({ value: "groq", label: "Groq (LLM)" });
        if (services.chatgpt_configured) caps.push({ value: "chatgpt", label: "ChatGPT" });
        if (caps.length === 0) caps.push({ value: "groq", label: "Groq (demo)" });

        const imgs = [];
        if (services.stability_configured) imgs.push({ value: "stability", label: "Stability" });
        if (services.chatgpt_configured) imgs.push({ value: "chatgpt", label: "ChatGPT Images" });
        if (services.nano_banana_configured) imgs.push({ value: "nano_banana", label: "Nano Banana" });
        if (imgs.length === 0) imgs.push({ value: "stability", label: "Stability (demo)" });

        if (!mounted) return;
        setCaptionProviders(caps);
        setImageProviders(imgs);
        setSelectedCaptionProvider(caps[0].value);
        setImageProvider(imgs[0].value);
      } catch (err) {
        console.error("Failed to load providers:", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

      const data = await apiClient.generateBatch({
        description: description.trim(),
        days: parseInt(days, 10),
        num_posts: totalPosts,
        // remove caption provider, only send image provider
        image_provider: imageProvider,
        platforms: selectedPlatforms.length ? selectedPlatforms : undefined,
        subreddit: selectedPlatforms.includes("reddit") ? subreddit : undefined,
      });

      if (!data || data.success === false) throw new Error((data && (data.error || data.message)) || "Batch failed");

      // Step 2: Processing completed, saving to database
      setCreationProgress(prev => ({ ...prev, progress: 80, currentStep: 1 }));

      // Use the actual batch_id from backend response
      const actualBatchId = data.batch_id;
      setBatchId(actualBatchId);
      // Show platform selection UI after batch created
      setShowPlatformOptions(true);

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
        const { loadCampaignsFromDB, campaigns: allCampaigns } = useCampaignStore.getState();
        await loadCampaignsFromDB();
        console.log(`Campaigns reloaded from database for batch: ${actualBatchId}`);
        // initialize per-post platform selections
        const fresh = useCampaignStore.getState().campaigns.filter(c => c.batchId === actualBatchId);
        const mapping = {};
        fresh.forEach(p => { mapping[p.id] = [] });
        setPlatformsByPost(mapping);
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

  const handleContinueToSchedule = async () => {
    // Check if individual platforms are selected for all posts
    const allPostsHaveIndividualPlatforms = batchItems.every(item =>
      platformsByPost[item.id] && platformsByPost[item.id].length > 0
    );

    if (allPostsHaveIndividualPlatforms) {
      // Individual platforms are selected - skip global platform selection and go directly to scheduling
      console.log('🎯 Individual platforms selected - going directly to scheduling');
      await scheduleBatch();
    } else {
      // No individual platforms selected - show global platform selection as before
      console.log('🎯 No individual platforms - showing global platform selection');
      setShowPlatformOptions(false);
    }
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

        // Get individual platform selection for this post, fallback to global selection
        const postPlatforms = platformsByPost[item.id] && platformsByPost[item.id].length > 0
          ? platformsByPost[item.id]
          : selectedPlatforms;

        // Update local state with scheduling info and selected platforms
        updateCampaign(item.id, {
          scheduledAt: dates[i],
          status: "Scheduled",
          platforms: postPlatforms
        });

        // Also update the database with platform(s) and scheduling info
        try {
          const updateData = {
            scheduled_at: dates[i],
            status: "scheduled",
            platforms: postPlatforms,
            subreddit: postPlatforms.includes("reddit") ? subreddit : null
          };
          await apiClient.updatePost(item.id, updateData);
          console.log(`📅 Campaign ${item.id} scheduled for ${new Date(dates[i]).toLocaleString()} on ${postPlatforms.join(', ')}`);
        } catch (dbUpdateError) {
          console.error(`Database update error for campaign ${item.id}:`, dbUpdateError);
        }
      }

      setSchedulingProgress(prev => ({ ...prev, progress: 30, currentStep: 1 }));

      // Step 2: Check Google connection and upload to Google Drive
      let googleConnected = false;
      try {
        const googleStatusData = await apiClient.getGoogleStatus();
        googleConnected = googleStatusData && (googleStatusData.connected || googleStatusData.success);
      } catch (error) {
        console.error("Failed to check Google status:", error);
      }

      if (googleConnected) {
        console.log("Google is connected, proceeding with Drive upload...");
        // Upload each campaign to Google Drive
        for (let i = 0; i < batchItems.length; i++) {
          const item = batchItems[i];

          // Ensure the imageUrl is in the correct format for backend access
          let processedImageUrl = item.imageUrl;
          if (processedImageUrl && processedImageUrl.startsWith('/public/')) {
            processedImageUrl = apiUrl(processedImageUrl);
          }

          const campaignData = {
            id: item.id,
            productDescription: item.productDescription || item.description,
            generatedContent: item.generatedContent || item.caption,
            scheduledAt: dates[i],
            status: "Scheduled",
            platforms: selectedPlatforms, // Include selected platforms
            imageUrl: processedImageUrl,
            driveImageUrl: null, // Will be updated after upload
            activity: [
              { time: Date.now(), text: "Campaign created" },
              { time: Date.now(), text: "AI caption generated" },
              { time: Date.now(), text: "AI image generated" },
              { time: Date.now(), text: "Campaign scheduled" },
              { time: Date.now(), text: `Scheduled for ${selectedPlatforms.join(', ')}` }
            ]
          };

          try {
            console.log(`Uploading campaign ${item.id} to Google Drive...`);
            const driveData = await apiClient.saveCampaignToDrive(campaignData);
            console.log(`Drive response for ${item.id}:`, driveData);
            if (driveData && driveData.success) {
              updateCampaign(item.id, {
                driveFileId: driveData.fileId,
                driveImageUrl: driveData.driveImageUrl || item.imageUrl,
                imageFileId: driveData.imageFileId,
              });
              console.log(`✅ Campaign ${item.id} uploaded to Google Drive successfully`);
              // Attempt to call platform scheduling endpoints (best-effort, non-blocking)
              try {
                const content = item.generatedContent || item.caption || item.productDescription || "";
                const scheduled_at = dates[i];
                for (const pf of selectedPlatforms) {
                  if (pf === 'twitter') {
                    await fetch("/api/twitter/schedule", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content, image_path: processedImageUrl, scheduled_at })
                    });
                  } else if (pf === 'reddit') {
                    await fetch("/api/reddit/schedule", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: item.productDescription || content.slice(0, 80), content, scheduled_time: scheduled_at, subreddit: subreddit || undefined })
                    });
                  } else if (pf === 'facebook') {
                    await fetch("/api/facebook/schedule", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content, image_path: processedImageUrl, scheduled_at })
                    });
                  }
                }
              } catch (platformErr) {
                console.warn('Platform scheduling error (non-blocking):', platformErr);
              }
            } else {
              console.error(`❌ Drive upload failed for ${item.id}:`, driveData && (driveData.error || driveData.message));
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

          try {
            const calendarData = await apiClient.createCalendarEvent(eventData);
            if (calendarData && calendarData.success) {
              updateCampaign(item.id, { calendarEventId: calendarData.event?.id });
              console.log(`Calendar event created for campaign ${item.id}`);
            } else {
              console.error(`Failed to create calendar event for ${item.id}:`, calendarData && (calendarData.error || calendarData.message));
            }
          } catch (calendarErr) {
            console.error(`Failed to create calendar event for ${item.id}:`, calendarErr);
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

              try {
                console.log(`📅 Creating Google Calendar event for ${item.id}...`);
                const googleCalData = await apiClient.createGoogleCalendarEvent(googleCalendarData);
                console.log(`Google Calendar response for ${item.id}:`, googleCalData);
                if (googleCalData && googleCalData.success) {
                  updateCampaign(item.id, {
                    googleCalendarEventId: googleCalData.eventId,
                    googleCalendarLink: googleCalData.eventLink,
                  });
                  console.log(`✅ Google Calendar event created for campaign ${item.id}: ${googleCalData.eventLink}`);
                } else {
                  console.error(`❌ Google Calendar creation failed for ${item.id}:`, googleCalData && (googleCalData.error || googleCalData.message));
                }
              } catch (googleCalError) {
                console.error(`❌ Google Calendar error for campaign ${item.id}:`, googleCalError);
              }
            } catch (googleOuterError) {
              console.error(`❌ Google Calendar preparation error for campaign ${item.id}:`, googleOuterError);
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
      // Use API client and include selected image model
      const data = await apiClient.generatePost({
        description: description.trim(),
        image_provider: imageProvider,
      });
      if (!data || data.success === false) throw new Error(data.error || data.message || "Generation failed");
      createCampaign({
        description: description.trim(),
        caption: data.caption,
        imageUrl: apiUrl(data.image_path || data.image_path || data.image || ""),
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
          {/* Trending Topic Indicator */}
          {trendingInfo && (
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-lg">🔥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900 text-sm">Creating from Trending Topic</h3>
                  <p className="text-xs text-orange-800 mt-1">
                    <strong>{trendingInfo.topic}</strong> from {trendingInfo.category} category
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="border rounded-md p-3">
            <Input
              label="Campaign Description"
              placeholder="Enter your campaign description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
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
            <div className="border rounded-md p-3 relative">
              <label className="block text-sm font-medium text-contrast mb-1">
                Reels
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                  placeholder=""
                  disabled
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-sm text-gray-400 font-medium">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 border rounded-md p-3 bg-gray-50">
            <div className="font-medium mb-1">Example</div>
            Description: "Eco-friendly bamboo toothbrush" | Days: 5 | Number of
            Posts: 10
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Platform selection (multi-platform checkboxes shown below) */}

            {/* Platform Selection (global) and Action Buttons + Provider Selects */}
            {(batchItems.length > 0 || batchId) && !batchItems.some(b => b.status === "Scheduled") && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-sm font-medium text-contrast">Choose Platforms *</div>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {[
                    { id: "facebook", name: "Facebook", icon: "/icons/facebook.png" },
                    { id: "twitter", name: "X (Twitter)", icon: "/icons/x.png" },
                    { id: "reddit", name: "Reddit", icon: "/icons/reddit.png" }
                  ].map((platform) => (
                    <label
                      key={platform.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedPlatforms.includes(platform.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={(e) => {
                          console.log(`Checkbox clicked for ${platform.id}, checked: ${e.target.checked}`);
                          handlePlatformToggle(platform.id);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <img src={platform.icon} alt={platform.name} className="w-5 h-5" />
                      <span className="text-sm font-medium text-contrast">{platform.name}</span>
                    </label>
                  ))}
                </div>

                {selectedPlatforms.includes("reddit") && (
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-sm font-medium text-contrast">Subreddit *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={subreddit}
                        onChange={(e) => setSubreddit(e.target.value)}
                        placeholder="e.g., funny, technology"
                        className="pl-8 pr-4 py-2 border rounded-lg bg-[var(--surface)] text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px] border-[var(--border)] text-contrast"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <span className="text-muted-contrast text-sm">r/</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-contrast text-center">Enter the subreddit name without "r/" prefix</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 items-center">
              {!batchId ? (
                <>
                  <Button
                    type="button"
                    onClick={createBatch}
                    disabled={creating}
                    size="sm"
                    className="px-6 py-2"
                  >
                    {creating ? "Creating..." : "Create"}
                  </Button>

                  <div className="flex items-center gap-3">

                    <div>
                      <select
                        value={imageProvider}
                        onChange={(e) => setImageProvider(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        disabled={creating}
                        aria-label="Select image model"
                      >
                        <option value="chatgpt">ChatGPT</option>
                        <option value="stability">Stability</option>
                        <option value="nano_banana">Nano Banana</option>
                      </select>
                    </div>
                  </div>
                </>
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
            <div className="text-xs text-muted-contrast">{progressText}</div>
          )}
        </div>
      </Card>

      {/* Progress Bar for Creation */}
      {creationProgress.visible && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-contrast mb-3">Creating Posts...</h3>
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
            <h3 className="font-medium text-contrast mb-3">Scheduling Posts...</h3>
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
                    <div className="text-xs text-muted-contrast">
                      Post {index + 1}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-contrast line-clamp-2">
                    {item.productDescription}
                  </div>
                  {item.generatedContent && (
                    <div className="text-xs text-muted-contrast line-clamp-3 leading-relaxed">
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

          {/* Individual Platform Selection Button */}
          {batchItems.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-contrast mb-1">Individual Platform Selection</h4>
                  <p className="text-sm text-muted-contrast">
                    Choose different platforms for each post, or use global platform selection below
                  </p>
                </div>
                <Button
                  onClick={() => setShowPlatformOptions(true)}
                  variant="secondary"
                  size="sm"
                >
                  Select Individual Platforms
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Individual Platform Selection */}
      {showPlatformOptions && batchItems.length > 0 && (
        <Card title="🎯 Individual Platform Selection">
          <div className="p-6">
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">🎯</span>
                </div>
                <h3 className="font-semibold text-blue-900 text-lg">Choose Platforms for Each Post</h3>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Select which platforms each post should be published to.</strong> You can choose different platforms for each post in your batch. For example: Post 1 → Facebook+Twitter, Post 2 → Reddit only, Post 3 → All platforms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batchItems.map((item, index) => (
                <div key={item.id} className="group border-2 border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
                  {/* Post Header */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold text-gray-900">Post {index + 1}</h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{item.caption}</p>
                  </div>

                  {/* Platform Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Select Platforms:
                    </label>
                    <div className="space-y-3">
                      {[
                        { key: 'facebook', name: 'Facebook', icon: '📘', color: 'blue' },
                        { key: 'reddit', name: 'Reddit', icon: '🔴', color: 'orange' },
                        { key: 'twitter', name: 'Twitter', icon: '🐦', color: 'sky' }
                      ].map(platform => (
                        <label key={platform.key} className="flex items-center space-x-3 cursor-pointer group/label">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={platformsByPost[item.id]?.includes(platform.key) || false}
                              onChange={() => updatePlatformsForPost(item.id, platform.key)}
                              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 transition-all duration-200"
                            />
                            {platformsByPost[item.id]?.includes(platform.key) && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-blue-600 text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg">{platform.icon}</span>
                            <span className="text-sm font-medium text-gray-700 capitalize group-hover/label:text-gray-900 transition-colors">
                              {platform.name}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Selection Summary */}
                    {platformsByPost[item.id]?.length > 0 && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-xs">✓</span>
                          </div>
                          <p className="text-sm font-medium text-green-800">
                            Selected: {platformsByPost[item.id].map(p => {
                              const platformInfo = { facebook: '📘 Facebook', reddit: '🔴 Reddit', twitter: '🐦 Twitter' };
                              return platformInfo[p] || p;
                            }).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Individual Platform Selection Summary */}
      {batchItems.length > 0 && (
        <Card>
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                {(() => {
                  const allPostsHaveIndividualPlatforms = batchItems.every(item =>
                    platformsByPost[item.id] && platformsByPost[item.id].length > 0
                  );

                  if (allPostsHaveIndividualPlatforms) {
                    return (
                      <>
                        <h4 className="font-medium text-green-900 mb-1">✅ Individual Platforms Selected</h4>
                        <p className="text-sm text-green-700">
                          {batchItems.length} posts ready • All posts have individual platform selections
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <h4 className="font-medium text-gray-900 mb-1">Platform Selection Summary</h4>
                        <p className="text-sm text-gray-600">
                          {batchItems.length} posts ready • {Object.values(platformsByPost).flat().length} total platform selections
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
              <Button
                onClick={handleContinueToSchedule}
                variant="secondary"
                size="sm"
              >
                {(() => {
                  const allPostsHaveIndividualPlatforms = batchItems.every(item =>
                    platformsByPost[item.id] && platformsByPost[item.id].length > 0
                  );
                  return allPostsHaveIndividualPlatforms ? "Schedule Now" : "Continue to Schedule";
                })()}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default CreateCampaign;
