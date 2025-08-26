import { create } from "zustand";

function nowIso() {
  return new Date().toISOString();
}

export const useCampaignStore = create((set, get) => ({
  campaigns: [],
  recentActivity: [],
  preferences: {
    notifications: true,
  },
  isLoading: false,
  
  // Load campaigns from PostgreSQL
  loadCampaignsFromDB: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("http://localhost:8000/api/posts?limit=50");
      const data = await response.json();
      
      if (data.success && data.posts) {
        const campaigns = data.posts.map(post => ({
          id: post.id,
          batchId: post.batch_id || null,
          createdAt: new Date(post.created_at).getTime(),
          productDescription: post.original_description,
          generatedContent: post.caption || "",
          scheduledAt: post.scheduled_at,
          status: post.scheduled_at && (post.status === "scheduled" || post.status === "Scheduled") ? "Scheduled" : 
                 (post.status === "posted" || post.status === "Posted") ? "Posted" : 
                 (post.status === "failed" || post.status === "Failed") ? "Failed" : "Draft",
          imageUrl: post.image_path ? `http://localhost:8000${post.image_path}` : "",
          // Add additional fields from database if they exist
          driveFileId: post.drive_file_id || null,
          driveImageUrl: post.drive_image_url || null,
          imageFileId: post.image_file_id || null,
          calendarEventId: post.calendar_event_id || null,
          googleCalendarEventId: post.google_calendar_event_id || null,
          googleCalendarLink: post.google_calendar_link || null,
          activity: [
            { time: new Date(post.created_at).getTime(), text: "Campaign created" },
            post.caption ? { time: new Date(post.created_at).getTime() + 1000, text: "AI caption generated" } : null,
            post.image_path ? { time: new Date(post.created_at).getTime() + 2000, text: "AI image generated" } : null,
            post.scheduled_at ? {
              time: new Date(post.created_at).getTime() + 3000,
              text: `Scheduled for ${new Date(post.scheduled_at).toLocaleString()}`,
            } : null,
          ].filter(Boolean),
        }));
        
        set({ campaigns });
        console.log(`✅ Loaded ${campaigns.length} campaigns from database`);
        
        // Store in localStorage as backup
        try {
          localStorage.setItem('campaigns_backup', JSON.stringify(campaigns));
        } catch (e) {
          console.warn('Failed to store campaigns backup:', e);
        }
      } else {
        console.log("No campaigns found in database");
        // Try to load from localStorage backup if database is empty
        try {
          const backup = localStorage.getItem('campaigns_backup');
          if (backup) {
            const campaigns = JSON.parse(backup);
            set({ campaigns });
            console.log(`📦 Loaded ${campaigns.length} campaigns from backup`);
          }
        } catch (e) {
          console.warn('Failed to load campaigns backup:', e);
        }
      }
    } catch (error) {
      console.error("Failed to load campaigns from database:", error);
      // Try to load from localStorage backup on network error
      try {
        const backup = localStorage.getItem('campaigns_backup');
        if (backup) {
          const campaigns = JSON.parse(backup);
          set({ campaigns });
          console.log(`📦 Loaded ${campaigns.length} campaigns from backup (network error)`);
        }
      } catch (e) {
        console.warn('Failed to load campaigns backup:', e);
      }
    } finally {
      set({ isLoading: false });
    }
  },
  addActivity: (text) =>
    set((state) => ({
      recentActivity: [
        { time: Date.now(), text },
        ...state.recentActivity,
      ].slice(0, 20),
    })),
  createCampaign: async ({
    description,
    caption,
    imageUrl,
    scheduledAt = null,
    status = "Draft",
    batchId = null,
  }) => {
    const id = `cmp_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    const newCampaign = {
      id,
      batchId,
      createdAt,
      productDescription: description,
      generatedContent: caption || "",
      scheduledAt,
      status,
      imageUrl: imageUrl || "",
      activity: [
        { time: createdAt, text: "Campaign created" },
        caption ? { time: Date.now(), text: "AI caption generated" } : null,
        imageUrl ? { time: Date.now(), text: "AI image generated" } : null,
        scheduledAt
          ? {
              time: Date.now(),
              text: `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
            }
          : null,
      ].filter(Boolean),
    };
    
    // Add to local state immediately
    set((state) => ({ campaigns: [newCampaign, ...state.campaigns] }));
    get().addActivity(`Created campaign ${id}`);
    
    // Try to sync with database
    try {
      const postData = {
        original_description: description,
        caption: caption || "",
        image_path: imageUrl?.replace('http://localhost:8000', '') || null,
        scheduled_at: scheduledAt,
        status: status.toLowerCase(),
        platform: "instagram",
        batch_id: batchId
      };
      
      console.log(`Saving campaign ${id} to database:`, postData);
      // Note: We're not awaiting this to avoid blocking UI, but we should handle errors
      fetch("http://localhost:8000/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)
      }).then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`Campaign ${id} saved to database with ID: ${data.post_id}`);
          } else {
            console.error(`Failed to save campaign ${id}:`, data.error);
          }
        })
        .catch(error => {
          console.error(`Database error for campaign ${id}:`, error);
        });
    } catch (error) {
      console.error("Error syncing campaign with database:", error);
    }
    
    return id;
  },
  updateCampaign: async (id, updates) => {
    // Update local state immediately
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    
    // Try to sync with database if this is a scheduling update
    if (updates.scheduledAt || updates.status) {
      try {
        const campaign = get().campaigns.find(c => c.id === id);
        if (campaign) {
          const postData = {
            scheduled_at: updates.scheduledAt || campaign.scheduledAt,
            status: (updates.status || campaign.status).toLowerCase()
          };
          
          console.log(`Updating campaign ${id} in database:`, postData);
          // Note: We're not awaiting this to avoid blocking UI
          fetch(`http://localhost:8000/api/posts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postData)
          }).then(response => response.json())
            .then(data => {
              if (data.success) {
                console.log(`Campaign ${id} updated in database`);
              } else {
                console.error(`Failed to update campaign ${id}:`, data.error);
              }
            })
            .catch(error => {
              console.error(`Database update error for campaign ${id}:`, error);
            });
        }
      } catch (error) {
        console.error("Error syncing campaign update with database:", error);
      }
    }
  },
  updateCampaignsWhere: (predicate, updatesFn) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        predicate(c) ? { ...c, ...updatesFn(c) } : c
      ),
    })),
  deleteCampaign: (id) =>
    set((state) => ({ campaigns: state.campaigns.filter((c) => c.id !== id) })),
  deleteCampaignsWhere: (predicate) =>
    set((state) => ({
      campaigns: state.campaigns.filter((c) => !predicate(c)),
    })),
  // Simulate real-time status updates
  tick: () => {
    const now = Date.now();
    set((state) => ({
      campaigns: state.campaigns.map((c) => {
        if (
          c.status === "Scheduled" &&
          c.scheduledAt &&
          new Date(c.scheduledAt).getTime() <= now
        ) {
          const didFail = Math.random() < 0.1;
          const status = didFail ? "Failed" : "Posted";
          return {
            ...c,
            status,
            activity: [
              {
                time: now,
                text: status === "Posted" ? "Post published" : "Posting failed",
              },
              ...(c.activity || []),
            ],
          };
        }
        return c;
      }),
    }));
  },
}));

// Start a simple interval for real-time updates
if (typeof window !== "undefined") {
  setInterval(() => {
    try {
      useCampaignStore.getState().tick();
    } catch {}
  }, 5000);
}
