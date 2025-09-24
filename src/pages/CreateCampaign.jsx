import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
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
  console.log('🎬 CreateCampaign component rendering...');

  const location = useLocation();
  const [campaignName, setCampaignName] = useState("");
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
  const [captionProviders, setCaptionProviders] = useState([]);
  const [selectedCaptionProvider, setSelectedCaptionProvider] = useState("groq");
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
  const [mode, setMode] = useState("easy"); // "easy" or "advanced"
  const [generatedCaptions, setGeneratedCaptions] = useState([]);
  const [assetSelections, setAssetSelections] = useState({}); // Track asset type for each caption
  const [uploadedImages, setUploadedImages] = useState({}); // Track uploaded images
  const [sessionStartTime, setSessionStartTime] = useState(null); // Track when current session started

  const updatePlatformsForPost = (postId, platform) => {
    setPlatformsByPost(prev => {
      const current = prev[postId] || [];
      const next = current.includes(platform) ? current.filter(p => p !== platform) : [...current, platform];
      return { ...prev, [postId]: next };
    });
  };

  const updateAssetSelection = (captionIndex, assetType) => {
    setAssetSelections(prev => ({
      ...prev,
      [captionIndex]: assetType
    }));
  };

  const handleImageUpload = (captionIndex, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages(prev => ({
          ...prev,
          [captionIndex]: {
            file: file,
            url: e.target.result,
            name: file.name
          }
        }));
        toast.success(`Image uploaded for caption ${captionIndex + 1}`);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid image file');
    }
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

  const batchItems = useMemo(() => {
    console.log(`🔍 batchItems calculation - mode: ${mode}, batchId: ${batchId}, sessionStartTime: ${sessionStartTime}`);
    console.log(`📊 Total campaigns: ${campaigns.length}`);

    if (mode === "advanced") {
      // In advanced mode, show only campaigns created in this session
      if (!sessionStartTime) {
        console.log(`❌ No sessionStartTime in advanced mode`);
        return [];
      }
      const filtered = campaigns.filter(c =>
        c.batchId === batchId &&
        c.createdAt > sessionStartTime &&
        c.productDescription === description.trim()
      );
      console.log(`🎯 Advanced mode filtered campaigns: ${filtered.length}`);
      console.log(`📋 Filter criteria: batchId=${batchId}, sessionStartTime=${sessionStartTime}, description="${description.trim()}"`);
      filtered.forEach((c, i) => {
        console.log(`  Campaign ${i + 1}: batchId=${c.batchId}, createdAt=${c.createdAt}, description="${c.productDescription}"`);
      });
      return filtered;
    } else {
      // In basic mode, filter by batchId as usual
      const filtered = campaigns.filter((c) => c.batchId === batchId);
      console.log(`🎯 Basic mode filtered campaigns: ${filtered.length}`);
      return filtered;
    }
  }, [campaigns, batchId, mode, sessionStartTime, description]);

  const validate = () => {
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name.");
      return false;
    }
    if (campaignName.trim().length < 2) {
      toast.error("Campaign name must be at least 2 characters long.");
      return false;
    }
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

  const generateCaptions = async () => {
    if (!validate()) return;

    setCreating(true);
    setProgressText("Generating captions...");

    try {
      const totalPosts = parseInt(numPosts, 10);
      const data = await apiClient.generateCaptionsBatch({
        description: description.trim(),
        num_posts: totalPosts,
        days: parseInt(days, 10),
        caption_provider: selectedCaptionProvider,
      });

      if (!data || data.success === false) throw new Error((data && (data.error || data.message)) || "Caption generation failed");

      // Extract captions from the response
      const captions = data.captions || [];

      setGeneratedCaptions(captions);
      toast.success(`Generated ${captions.length} captions successfully!`);
      setProgressText("");

    } catch (e) {
      console.error('❌ Error generating captions:', e);
      toast.error(String(e.message || e));
    } finally {
      setCreating(false);
    }
  };

  const createMixedAssetPosts = async () => {
    setCreating(true);
    setProgressText("Creating posts with mixed assets...");

    try {
      const totalPosts = generatedCaptions.length;
      // Set session start time to track campaigns created in this session
      const currentTime = Date.now();
      setSessionStartTime(currentTime);

      // Create a batch operation first via the backend
      let batchId = null;
      try {
        const batchResponse = await apiClient.createBatch({
          description: description.trim(),
          num_posts: totalPosts,
          days: parseInt(days, 10), // Use the actual days parameter from user input
          campaign_name: campaignName.trim()
        });
        if (batchResponse && batchResponse.batch_id) {
          batchId = batchResponse.batch_id;
          console.log(`📦 Created batch operation: ${batchId}`);
          // Update the component's batchId state immediately
          console.log(`🔄 Setting batchId state to: ${batchId}`);
          setBatchId(batchId);
        }
      } catch (error) {
        console.warn("Failed to create batch operation, continuing without batch:", error);
      }

      // Create posts with mixed assets
      for (let i = 0; i < totalPosts; i++) {
        const caption = generatedCaptions[i];
        const assetType = assetSelections[i] || "ai";

        let imageUrl = "";

        if (assetType === "custom" && uploadedImages[i]) {
          // Upload custom image to server first
          try {
            console.log(`🖼️ Uploading custom image for post ${i + 1}:`, {
              assetType,
              hasUploadedImage: !!uploadedImages[i],
              fileName: uploadedImages[i].name,
              dataUrlLength: uploadedImages[i].url.length
            });

            const uploadResponse = await apiClient.uploadCustomImage({
              data_url: uploadedImages[i].url,
              description: description.trim()
            });

            if (uploadResponse && uploadResponse.success && uploadResponse.image_path) {
              imageUrl = apiUrl(uploadResponse.image_path);
              console.log(`✅ Custom image uploaded successfully:`, imageUrl);
            } else {
              console.error(`❌ Failed to upload custom image:`, uploadResponse);
              imageUrl = "";
            }
          } catch (error) {
            console.error(`❌ Error uploading custom image for post ${i + 1}:`, error);
            imageUrl = "";
          }
        } else {
          // Generate AI image only (without creating a post)
          console.log(`🤖 Generating AI image for post ${i + 1}:`, {
            assetType,
            hasUploadedImage: !!uploadedImages[i],
            caption: caption?.substring(0, 50) + "..."
          });
          try {
            const imageData = await apiClient.generateImageOnly({
              description: caption,
              image_provider: imageProvider,
            });
            imageUrl = imageData.image_path ? apiUrl(imageData.image_path) : "";
            console.log(`✅ AI image generated for post ${i + 1}:`, imageUrl);
          } catch (error) {
            console.error(`Failed to generate AI image for caption ${i + 1}:`, error);
            imageUrl = "";
          }
        }

        // Create campaign with mixed asset - now with proper batchId
        console.log(`🔍 Creating campaign ${i + 1} with batchId: ${batchId}`);
        console.log(`📝 Campaign data:`, {
          description: description.trim(),
          caption: caption?.substring(0, 100) + "...",
          imageUrl: imageUrl?.substring(0, 100) + "...",
          assetType,
          isCustomImage: assetType === "custom"
        });
        await createCampaign({
          campaignName: campaignName.trim(),
          description: description.trim(),
          caption: caption,
          imageUrl: imageUrl,
          status: "Draft",
          scheduledAt: null,
          batchId: batchId, // Use the batch ID from backend
        });
      }

      toast.success(`Created ${totalPosts} posts with mixed assets!`);
      setProgressText("");

      // Load campaigns to display them
      setTimeout(async () => {
        try {
          console.log(`🔄 Reloading campaigns for advanced mode`);
          const { loadCampaignsFromDB } = useCampaignStore.getState();
          await loadCampaignsFromDB();

          const allCampaigns = useCampaignStore.getState().campaigns;
          // In advanced mode, we show only campaigns with the same batchId
          const sessionCampaigns = allCampaigns.filter(c =>
            c.batchId === batchId &&
            c.productDescription === description.trim()
          );

          console.log(`🎯 Found ${sessionCampaigns.length} session campaigns for advanced mode`);
          console.log(`📊 Total campaigns in store: ${allCampaigns.length}`);
          console.log(`📦 Batch ID: ${batchId}`);
          console.log(`📝 Description: "${description.trim()}"`);
          console.log(`⏰ Session start time: ${sessionStartTime}`);

          const mapping = {};
          sessionCampaigns.forEach(p => { mapping[p.id] = []; });
          setPlatformsByPost(mapping);

          console.log(`✅ Platform mapping set for ${Object.keys(mapping).length} posts`);
        } catch (error) {
          console.error('Error reloading campaigns:', error);
        }
      }, 2000); // Increased delay to ensure database sync

    } catch (e) {
      console.error('❌ Error creating mixed asset posts:', e);
      toast.error(String(e.message || e));
    } finally {
      setCreating(false);
    }
  };

  const createBatch = async () => {
    if (!validate()) return;

    try {
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
        campaign_name: campaignName.trim(),
      });

      if (!data || data.success === false) throw new Error((data && (data.error || data.message)) || "Batch failed");

      // Step 2: Processing completed, saving to database
      setCreationProgress(prev => ({ ...prev, progress: 80, currentStep: 1 }));

      // Use the actual batch_id from backend response
      const actualBatchId = data.batch_id;
      setBatchId(actualBatchId);
      // Don't auto-open platform selection modal - let user click the button

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
        try {
          console.log(`🔄 Reloading campaigns for batch: ${actualBatchId}`);
          const { loadCampaignsFromDB } = useCampaignStore.getState();
          await loadCampaignsFromDB();
          console.log(`✅ Campaigns reloaded from database for batch: ${actualBatchId}`);

          // Get fresh campaigns from store
          const allCampaigns = useCampaignStore.getState().campaigns;
          console.log(`📊 Total campaigns in store: ${allCampaigns.length}`);

          // Filter campaigns for this batch
          const fresh = allCampaigns.filter(c => c.batchId === actualBatchId);
          console.log(`🎯 Campaigns for batch ${actualBatchId}: ${fresh.length}`);

          // Initialize per-post platform selections
          const mapping = {};
          fresh.forEach(p => {
            mapping[p.id] = [];
            console.log(`📝 Initialized platform mapping for campaign ${p.id}`);
          });
          setPlatformsByPost(mapping);
          console.log(`✅ Platform mapping initialized for ${fresh.length} campaigns`);
        } catch (error) {
          console.error('❌ Error reloading campaigns:', error);
          // Don't throw the error, just log it to prevent the page from crashing
        }
      }, 500);

    } catch (e) {
      console.error('❌ Error in createBatch:', e);
      toast.error(String(e.message || e));
    } finally {
      setCreating(false);
      // Hide progress bar after a short delay
      setTimeout(() => {
        setCreationProgress(prev => ({ ...prev, visible: false }));
      }, 1000);
    }
  };

  // Note: scheduleDates function removed - now using backend API via apiClient.generateScheduleDates()

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
    // In advanced mode, we don't need batchId - we use individual posts
    if (mode === "easy" && !batchId) {
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
      // Get proper schedule dates from backend API instead of problematic frontend function
      console.log(`🔄 Getting schedule dates from backend for ${n} posts over ${days} days`);
      const scheduleResponse = await apiClient.generateScheduleDates({
        num_posts: n,
        days: parseInt(days, 10)
      });
      
      if (!scheduleResponse || !scheduleResponse.schedule_times) {
        throw new Error('Failed to get schedule times from backend');
      }
      
      const dates = scheduleResponse.schedule_times;
      console.log(`✅ Retrieved ${dates.length} schedule times from backend:`);
      dates.forEach((date, i) => {
        console.log(`   Post ${i + 1}: ${new Date(date).toLocaleString()}`);
      });

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
            title: campaignName?.trim() ? campaignName.trim() : `📱 ${item.productDescription?.substring(0, 40) || 'Campaign Post'}`,
            description: item.generatedContent || item.productDescription,
            start_time: dates[i],
            end_time: dates[i], // Point-in-time event
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

  const scheduleSelectedPosts = async () => {
    // Get posts that have platforms selected
    const postsToSchedule = batchItems.filter(item =>
      platformsByPost[item.id] && platformsByPost[item.id].length > 0
    );

    if (postsToSchedule.length === 0) {
      toast.error("Please select platforms for at least one post");
      return;
    }

    setScheduling(true);
    setSchedulingProgress({
      visible: true,
      progress: 0,
      steps: ["Scheduling posts", "Uploading to Google Drive", "Creating calendar events", "Scheduling to platforms"],
      currentStep: 0
    });

    try {
      // Get proper schedule dates from backend API instead of scheduling all at same time
      console.log(`🔄 Getting schedule dates from backend for ${postsToSchedule.length} posts over ${days} days`);
      const scheduleResponse = await apiClient.generateScheduleDates({
        num_posts: postsToSchedule.length,
        days: parseInt(days, 10)
      });
      
      if (!scheduleResponse || !scheduleResponse.schedule_times) {
        throw new Error('Failed to get schedule times from backend');
      }
      
      const scheduleTimes = scheduleResponse.schedule_times;
      console.log(`✅ Retrieved ${scheduleTimes.length} schedule times from backend:`);
      scheduleTimes.forEach((date, i) => {
        console.log(`   Post ${i + 1}: ${new Date(date).toLocaleString()}`);
      });

      let successCount = 0;
      let errorCount = 0;

      // Process each selected post with distributed schedule times
      for (let i = 0; i < postsToSchedule.length; i++) {
        const post = postsToSchedule[i];
        const selectedPlatforms = platformsByPost[post.id] || [];

        setSchedulingProgress(prev => ({
          ...prev,
          progress: (i / postsToSchedule.length) * 100,
          currentStep: 0
        }));

        try {
          // Step 1: Update the existing post in the database with distributed schedule time
          const scheduled_at = scheduleTimes[i]; // Use individual schedule time for each post
          const updateData = {
            scheduled_at: scheduled_at,
            status: "scheduled",
            platforms: selectedPlatforms,
            subreddit: selectedPlatforms.includes("reddit") ? subreddit : null
          };

          console.log(`Updating campaign ${post.id} in database:`, updateData);
          await apiClient.updatePost(post.id, updateData);
          console.log(`Campaign ${post.id} updated in database`);

          // Step 2: Upload to Google Drive (skip if it fails)
          try {
            const campaignData = {
              id: post.id,
              productDescription: post.productDescription,
              generatedContent: post.generatedContent || post.caption,
              imageUrl: post.imageUrl,
              driveImageUrl: null,
              activity: [
                { time: Date.now(), text: "Campaign created" },
                { time: Date.now(), text: "AI caption generated" },
                { time: Date.now(), text: "AI image generated" },
                { time: Date.now(), text: "Campaign scheduled" },
                { time: Date.now(), text: `Scheduled for ${selectedPlatforms.join(', ')}` }
              ]
            };

            const driveData = await apiClient.saveCampaignToDrive(campaignData);
            if (driveData && driveData.success) {
              updateCampaign(post.id, {
                driveFileId: driveData.fileId,
                driveImageUrl: driveData.driveImageUrl || post.imageUrl,
                imageFileId: driveData.imageFileId,
              });
            }
          } catch (driveError) {
            console.warn("Google Drive upload failed (non-blocking):", driveError);
          }

          // Step 3: Create calendar event (skip if it fails)
          try {
            const calendarData = {
              title: campaignName?.trim() ? campaignName.trim() : `Post: ${post.productDescription?.slice(0, 50)}...`,
              description: post.generatedContent || post.caption,
              start_time: scheduled_at,
              end_time: scheduled_at,
              post_id: post.id, // Use the existing post ID
              platforms: selectedPlatforms,
              imageUrl: post.imageUrl
            };

            await apiClient.createCalendarEvent(calendarData);
          } catch (calendarError) {
            console.warn("Calendar event creation failed (non-blocking):", calendarError);
          }

          // Step 4: Schedule to platforms (skip if it fails)
          const content = post.generatedContent || post.caption || post.productDescription || "";

          for (const platform of selectedPlatforms) {
            try {
              if (platform === 'twitter') {
                await fetch("/api/twitter/schedule", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content, image_path: post.imageUrl, scheduled_at })
                });
              } else if (platform === 'reddit') {
                await fetch("/api/reddit/schedule", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: post.productDescription || content.slice(0, 80),
                    content,
                    scheduled_time: scheduled_at,
                    subreddit: subreddit || undefined
                  })
                });
              } else if (platform === 'facebook') {
                await fetch("/api/facebook/schedule", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content, image_path: post.imageUrl, scheduled_at })
                });
              }
            } catch (platformError) {
              console.warn(`Platform scheduling error for ${platform} (non-blocking):`, platformError);
            }
          }

          // Update the local state
          updateCampaign(post.id, {
            status: "Scheduled",
            scheduledAt: scheduled_at,
            platforms: selectedPlatforms
          });

          successCount++;

        } catch (error) {
          console.error(`Error scheduling post ${post.id}:`, error);
          errorCount++;
        }
      }

      // Final progress update
      setSchedulingProgress(prev => ({
        ...prev,
        progress: 100,
        currentStep: 3
      }));

      // Show results and redirect
      if (successCount > 0) {
        const successMessage = `Successfully scheduled ${successCount} post${successCount > 1 ? 's' : ''}! Redirecting to My Campaigns...`;
        toast.success(successMessage);

        // Navigate to My Campaigns after a short delay
        setTimeout(() => {
          window.location.href = '/campaigns';
        }, 2000);
      }
      if (errorCount > 0) {
        toast.error(`Failed to schedule ${errorCount} post${errorCount > 1 ? 's' : ''}`);
      }

    } catch (error) {
      console.error("Error scheduling selected posts:", error);
      toast.error(`Failed to schedule posts: ${error.message}`);
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
        campaignName: campaignName.trim(),
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

  try {
    console.log('🎯 Rendering CreateCampaign component...');

    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Create Campaign</h1>
        </div>

        {/* Mode Toggle - At the top */}
        <Card title="Campaign Mode">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-contrast mb-2">Choose Your Campaign Mode</h3>
                <p className="text-sm text-muted-contrast">
                  {mode === "easy"
                    ? "Basic workflow: Create posts with AI-generated content and images"
                    : "Advanced workflow: Generate captions first, then manage assets and create mixed content"
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`text-sm font-medium ${mode === "easy" ? "text-blue-600" : "text-gray-500"}`}>
                  Basic
                </span>
                <button
                  onClick={() => setMode(mode === "easy" ? "advanced" : "easy")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${mode === "advanced" ? "bg-blue-600" : "bg-gray-200"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mode === "advanced" ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
                <span className={`text-sm font-medium ${mode === "advanced" ? "text-blue-600" : "text-gray-500"}`}>
                  Advanced
                </span>
              </div>
            </div>
          </div>
        </Card>

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
                label="Campaign Name"
                placeholder="Enter your campaign name..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                maxLength={100}
              />
            </div>

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
              {/* Image Provider Selection */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-contrast">Image Provider:</label>
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

              {/* Create Posts Button - Only for Basic Mode */}
              {mode === "easy" && !batchId && (
                <div className="flex gap-3 items-center">
                  <Button
                    type="button"
                    onClick={createBatch}
                    disabled={creating}
                    size="md"
                    className="px-8 py-3"
                  >
                    {creating ? "Creating..." : "Create Posts"}
                  </Button>
                </div>
              )}
            </div>

            {progressText && (
              <div className="text-xs text-muted-contrast">{progressText}</div>
            )}
          </div>
        </Card>

        {/* Schedule Button - Only for Basic Mode */}
        {batchItems.length > 0 && mode === "easy" && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-center">
                <Button
                  onClick={scheduleBatch}
                  size="lg"
                  className="px-8 py-3"
                  disabled={scheduling || selectedPlatforms.length === 0}
                >
                  {scheduling ? "Scheduling Posts..." : "Schedule All Posts"}
                </Button>
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Select at least one platform to enable scheduling
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Advanced Mode: Caption Generation */}
        {mode === "advanced" && !generatedCaptions.length && (
          <Card title="Step 1: Generate Captions">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-contrast mb-2">Generate Captions for All Posts</h3>
                <p className="text-sm text-muted-contrast">
                  First, we'll generate {numPosts} unique captions based on your campaign description.
                  Then you can choose which captions to use with your own images vs AI-generated images.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <Button
                  onClick={generateCaptions}
                  disabled={creating}
                  size="lg"
                  className="px-8 py-3"
                >
                  {creating ? "Generating Captions..." : `Generate ${numPosts} Captions`}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Advanced Mode: Asset Management - Inline */}
        {mode === "advanced" && generatedCaptions.length > 0 && (
          <Card title="Step 2: Manage Assets">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-contrast mb-2">Review Generated Captions</h3>
                <p className="text-sm text-muted-contrast">
                  Review the generated captions and choose which ones to use with your own images vs AI-generated images.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {generatedCaptions.map((caption, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="mb-3">
                      <div className="text-sm font-medium text-contrast mb-1">Caption {index + 1}</div>
                      <p className="text-sm text-muted-contrast">{caption}</p>
                    </div>

                    {/* Asset Type Selection - Inline */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`asset-type-${index}`}
                            value="ai"
                            checked={assetSelections[index] === "ai" || assetSelections[index] === undefined}
                            onChange={(e) => updateAssetSelection(index, e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm">🤖 AI Generated Image</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`asset-type-${index}`}
                            value="custom"
                            checked={assetSelections[index] === "custom"}
                            onChange={(e) => updateAssetSelection(index, e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm">📸 My Own Image</span>
                        </label>
                      </div>

                      {/* Image Upload Area - Inline */}
                      {assetSelections[index] === "custom" && (
                        <div className="space-y-2">
                          {uploadedImages[index] ? (
                            <div className="border border-gray-200 rounded-lg p-3 bg-green-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={uploadedImages[index].url}
                                    alt="Uploaded"
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-green-800">{uploadedImages[index].name}</p>
                                    <p className="text-xs text-green-600">✅ Image uploaded successfully</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setUploadedImages(prev => {
                                      const newImages = { ...prev };
                                      delete newImages[index];
                                      return newImages;
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors cursor-pointer"
                              onClick={() => document.getElementById(`image-upload-${index}`).click()}
                            >
                              <div className="text-gray-500">
                                <div className="text-lg mb-1">📁</div>
                                <p className="text-xs">Click to upload image</p>
                                <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`image-upload-${index}`}
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    handleImageUpload(index, e.target.files[0]);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center">
                <Button
                  onClick={async () => {
                    // Validate that custom selections have uploaded images
                    const customSelections = Object.entries(assetSelections)
                      .filter(([index, type]) => type === "custom");

                    const missingImages = customSelections.filter(([index]) => !uploadedImages[index]);

                    if (missingImages.length > 0) {
                      toast.error(`Please upload images for captions: ${missingImages.map(([i]) => parseInt(i) + 1).join(', ')}`);
                      return;
                    }

                    // Create mixed asset posts
                    await createMixedAssetPosts();
                  }}
                  size="lg"
                  className="px-8 py-3"
                  disabled={creating}
                >
                  {creating ? "Creating Posts..." : "Continue to Scheduling"}
                </Button>
              </div>
            </div>
          </Card>
        )}

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

        {/* Platform Selection - Different for Basic vs Advanced Mode */}
        {(() => {
          console.log(`🔍 Platform Selection render check - batchItems.length: ${batchItems.length}, mode: ${mode}`);
          return batchItems.length > 0;
        })() && (
            <Card title="Platform Selection">
              <div className="p-6">
                {mode === "easy" ? (
                  // Basic Mode: Global Platform Selection
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-contrast mb-2">Choose where to post your content</h3>
                      <p className="text-sm text-muted-contrast">
                        Select platforms for all posts at once, or use individual selection for more control
                      </p>
                    </div>

                    {/* Global Platform Selection */}
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-contrast">Select Platforms (for all posts):</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: "facebook", name: "Facebook", icon: "📘", color: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
                          { id: "twitter", name: "X (Twitter)", icon: "🐦", color: "bg-gray-50 border-gray-200 hover:bg-gray-100" },
                          { id: "reddit", name: "Reddit", icon: "🔴", color: "bg-orange-50 border-orange-200 hover:bg-orange-100" }
                        ].map((platform) => (
                          <label
                            key={platform.id}
                            className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${platform.color} ${selectedPlatforms.includes(platform.id)
                              ? 'ring-2 ring-blue-500 border-blue-500'
                              : 'border-gray-200'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPlatforms.includes(platform.id)}
                              onChange={() => handlePlatformToggle(platform.id)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{platform.icon}</span>
                              <span className="text-sm font-semibold text-contrast">{platform.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Reddit subreddit input */}
                      {selectedPlatforms.includes("reddit") && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <Input
                            label="Subreddit (optional)"
                            placeholder="e.g., r/technology, r/programming"
                            value={subreddit}
                            onChange={(e) => setSubreddit(e.target.value)}
                            className="max-w-md"
                          />
                          <p className="text-xs text-orange-600 mt-1">Leave empty to post to your profile</p>
                        </div>
                      )}
                    </div>

                  </>
                ) : (
                  // Advanced Mode: Individual Platform Selection Only
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-contrast mb-2">Choose platforms for each post</h3>
                      <p className="text-sm text-muted-contrast">
                        Select which platforms each post should be published to. You can choose different platforms for each post.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {batchItems.map((item, index) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                          {/* Post Header */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <h4 className="font-semibold text-gray-900">Post {index + 1}</h4>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{item.generatedContent || item.caption || item.productDescription}</p>
                          </div>

                          {/* Platform Selection */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">Select Platforms:</label>
                            <div className="space-y-2">
                              {[
                                { key: 'facebook', name: 'Facebook', icon: '📘' },
                                { key: 'reddit', name: 'Reddit', icon: '🔴' },
                                { key: 'twitter', name: 'Twitter', icon: '🐦' }
                              ].map(platform => (
                                <label key={platform.key} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={platformsByPost[item.id]?.includes(platform.key) || false}
                                    onChange={() => updatePlatformsForPost(item.id, platform.key)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm">{platform.icon} {platform.name}</span>
                                </label>
                              ))}
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reddit Subreddit Input for Advanced Mode */}
                    {batchItems.some(item => platformsByPost[item.id]?.includes('reddit')) && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <Input
                          label="Subreddit (optional)"
                          placeholder="e.g., r/technology, r/programming"
                          value={subreddit}
                          onChange={(e) => setSubreddit(e.target.value)}
                          className="max-w-md"
                        />
                        <p className="text-xs text-orange-600 mt-1">Leave empty to post to your profile</p>
                      </div>
                    )}

                    {/* Schedule Selected Posts Button for Advanced Mode */}
                    {batchItems.some(item => platformsByPost[item.id] && platformsByPost[item.id].length > 0) && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center">
                          <Button
                            onClick={scheduleSelectedPosts}
                            size="lg"
                            className="px-8 py-3"
                            disabled={scheduling}
                          >
                            {scheduling ? "Scheduling Selected Posts..." : "Schedule Selected Posts"}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Only posts with selected platforms will be scheduled
                        </p>
                      </div>
                    )}

                  </>
                )}
              </div>
            </Card>
          )}

        {/* Batch Items Preview */}
        {batchItems.length > 0 && (
          <Card title={`Generated Posts (${batchItems.length})`}>
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

          </Card>
        )}

        {/* Individual Platform Selection Modal */}
        {showPlatformOptions && batchItems.length > 0 && (
          <Modal
            open={showPlatformOptions}
            onOpenChange={setShowPlatformOptions}
            title="Individual Platform Selection"
          >
            <div className="space-y-6 max-w-4xl">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">🎯</span>
                  </div>
                  <h3 className="font-semibold text-blue-900">Choose Different Platforms for Each Post</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Select which platforms each post should be published to. You can choose different platforms for each post, or leave some posts without platform selection to use the global selection above.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {batchItems.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    {/* Post Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-gray-900">Post {index + 1}</h4>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.generatedContent || item.caption || item.productDescription}</p>
                    </div>

                    {/* Platform Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Select Platforms:</label>
                      <div className="space-y-2">
                        {[
                          { key: 'facebook', name: 'Facebook', icon: '📘' },
                          { key: 'reddit', name: 'Reddit', icon: '🔴' },
                          { key: 'twitter', name: 'Twitter', icon: '🐦' }
                        ].map(platform => (
                          <label key={platform.key} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={platformsByPost[item.id]?.includes(platform.key) || false}
                              onChange={() => updatePlatformsForPost(item.id, platform.key)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm">{platform.icon} {platform.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowPlatformOptions(false)}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowPlatformOptions(false);
                    // Auto-schedule if all posts have platforms selected
                    const allPostsHavePlatforms = batchItems.every(item =>
                      platformsByPost[item.id] && platformsByPost[item.id].length > 0
                    );
                    if (allPostsHavePlatforms) {
                      scheduleBatch();
                    }
                  }}
                  size="sm"
                >
                  {(() => {
                    const allPostsHavePlatforms = batchItems.every(item =>
                      platformsByPost[item.id] && platformsByPost[item.id].length > 0
                    );
                    return allPostsHavePlatforms ? "Schedule All Posts" : "Save Selection";
                  })()}
                </Button>
              </div>
            </div>
          </Modal>
        )}


      </div>
    );
  } catch (error) {
    console.error('❌ Error in CreateCampaign render:', error);
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Create Campaign</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Component Error</h2>
          <p className="text-red-700 mb-4">There was an error rendering the Create Campaign page.</p>
          <p className="text-sm text-red-600 mb-4">Error: {error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default CreateCampaign;
