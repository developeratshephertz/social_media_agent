import { useMemo, useState, useEffect } from "react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Hero from "./Hero.jsx";
import Badge from "../components/ui/Badge.jsx";
import CalendarPicker from "../components/ui/CalendarPicker.jsx";
import { Calendar } from 'lucide-react';
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient.js";
import { format } from "date-fns";
import PageHeader from "../components/layout/PageHeader.jsx";
import WeeklyTrends from "../components/WeeklyTrends.jsx";
import { useCampaignStore } from "../store/campaignStore.js";
import { useAuthStore } from "../store/authStore.js";

function Stat({ label, value, sub, icon }) {
  return (
    <div className="glass-hover p-6 rounded-3xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-gradient-primary-start/5 to-gradient-primary-end/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-[var(--text-muted)] font-medium">{label}</div>
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-[var(--primary)] mb-1">{value}</div>
        {sub && <div className="text-xs text-[var(--text-muted)]">{sub}</div>}
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // integrations list (static)
  const integrations = ['Canva', 'Reddit', 'Facebook', 'Twitter', 'HubSpot', 'Slack', 'Google Analytics', 'Giphy', 'Unsplash', 'Bitly'];

  // Get campaigns from store
  const campaigns = useCampaignStore((state) => state.campaigns);
  const recentActivity = useCampaignStore((state) => state.recentActivity);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [heroData, setHeroData] = useState(null);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsPosts, setAnalyticsPosts] = useState([]);
  const [followers, setFollowers] = useState(null);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);

  function getWeekDates(fromDate) {
    const d = new Date(fromDate);
    const week = [];
    for (let i = 0; i < 7; i++) {
      const copy = new Date(d);
      copy.setDate(d.getDate() + i);
      week.push(copy);
    }
    return week;
  }

  // Derive counts per day from scheduled posts in the next 7 days
  const weekDates = getWeekDates(new Date());
  // Prioritize scheduled posts over calendar events since they're more current
  const scheduledSource = useMemo(() => {
    console.log('📊 scheduledPosts:', scheduledPosts);
    console.log('📊 calendarEvents:', calendarEvents);
    console.log('📊 allPosts:', allPosts);

    return (scheduledPosts && scheduledPosts.length > 0)
      ? scheduledPosts
      : (calendarEvents && calendarEvents.length > 0)
        ? calendarEvents
        : (allPosts || []).filter((p) => (p.status || '').toLowerCase() === 'scheduled');
  }, [scheduledPosts, calendarEvents, allPosts]);

  const weekCounts = useMemo(() => {
    console.log('📊 Calculating week counts from scheduled source:', scheduledSource);
    const counts = new Array(7).fill(0);
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Start of today
    const end = new Date();
    end.setDate(start.getDate() + 7);
    end.setHours(23, 59, 59, 999); // End of 7th day

    for (const item of scheduledSource) {
      const when = new Date(
        item.scheduled_at ||
        item.scheduled_time ||
        item.scheduledAt ||
        item.start_time ||
        item.start ||
        item.date || 0
      );
      console.log(`📊 Processing item:`, item);
      console.log(`📊 Parsed date:`, when);
      console.log(`📊 Date range: ${start.toISOString()} to ${end.toISOString()}`);
      console.log(`📊 Is valid date:`, !isNaN(when.getTime()));
      console.log(`📊 Is in range:`, when >= start && when < end);

      if (!isNaN(when.getTime()) && when >= start && when < end) {
        const diffDays = Math.floor((when - start) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          counts[diffDays] += 1;
          console.log(`📊 Added post to day ${diffDays}:`, item);
        }
      } else {
        console.log(`📊 Skipped item (not in range):`, item);
      }
    }
    console.log('📊 Final week counts:', counts);
    return counts;
  }, [scheduledSource]);

  // Group scheduled posts by day for the next 7 days
  const dayBuckets = useMemo(() => {
    const buckets = [];
    const start = new Date();
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(start);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const posts = scheduledSource
        .filter((item) => {
          const when = new Date(
            item.scheduled_at ||
            item.scheduled_time ||
            item.scheduledAt ||
            item.start_time ||
            item.start ||
            item.date || 0
          );
          return !isNaN(when.getTime()) && when >= dayStart && when < dayEnd;
        })
        .sort((a, b) => {
          const aw = new Date(a.scheduled_at || a.scheduled_time || a.scheduledAt || a.start_time || a.start || 0).getTime();
          const bw = new Date(b.scheduled_at || b.scheduled_time || b.scheduledAt || b.start_time || b.start || 0).getTime();
          return aw - bw;
        });

      buckets.push({
        label: dayStart.toLocaleDateString(undefined, { weekday: 'short' }),
        date: dayStart,
        posts,
      });
    }
    return buckets;
  }, [scheduledSource]);
  const stats = useMemo(() => {
    // Use campaigns from the store as primary source
    const campaignData = campaigns.length > 0 ? campaigns : (allPosts || []);

    const batches = new Set();
    campaignData.forEach(p => {
      if (p.batchId || p.batch_id) {
        batches.add(p.batchId || p.batch_id);
      } else {
        batches.add(`single_${p.id}`);
      }
    });
    const totalCampaigns = batches.size;
    const totalPosts = campaignData.length;
    const scheduledThisWeek = weekCounts.reduce((a, b) => a + b, 0) || campaignData.filter(p => {
      const status = p.status?.toLowerCase() || '';
      return status === 'scheduled';
    }).length;
    const activePosts = campaignData.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s === 'scheduled' || s === 'posted' || s === 'published';
    }).length;
    const avgEngagement = (analyticsOverview && analyticsOverview.avgEngagement) ? analyticsOverview.avgEngagement : 4.6;
    return { total: totalCampaigns, scheduledThisWeek, active: activePosts, avgEngagement, totalPosts };
  }, [campaigns, allPosts, weekCounts, analyticsOverview]);

  // Load analytics and hero data from backend (stale-safe: never overwrite with empty)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Load campaigns from the store first
        const { loadCampaignsFromDB } = useCampaignStore.getState();
        await loadCampaignsFromDB();

        // Skip hero and analytics calls since they don't exist
        // const [heroRes, analyticsRes] = await Promise.all([
        //   apiClient.getHero(),
        //   apiClient.getAnalyticsOverview(),
        // ]);

        if (!mounted) return;

        // Skip hero and analytics data setting since we're not calling those APIs
        // if (heroRes && heroRes.success && heroRes.data) {
        //   setHeroData(prev => heroRes.data || prev);
        // }
        // if (analyticsRes && analyticsRes.success && analyticsRes.data) {
        //   setAnalyticsOverview(prev => analyticsRes.data || prev);
        // }

        // Skip analytics posts and followers calls since they might not exist
        // try {
        //   const postsRes = await apiClient.getAnalyticsPosts({ limit: 12 });
        //   if (postsRes && postsRes.success && Array.isArray(postsRes.posts)) {
        //     setAnalyticsPosts(prev => (postsRes.posts.length ? postsRes.posts : prev));
        //   }
        // } catch (e) {
        //   console.warn('Failed to load analytics posts', e);
        // }

        // try {
        //   const followersRes = await apiClient.getFollowers();
        //   if (followersRes && followersRes.success) {
        //     const f = followersRes.followers ?? followersRes.followers_count;
        //     if (typeof f === 'number') setFollowers(prev => f ?? prev);
        //   }
        // } catch (e) {
        //   console.warn('Failed to load followers', e);
        // }

        try {
          const calRes = await apiClient.getCalendarEvents();
          console.log('📅 Calendar events response:', calRes);
          if (calRes && calRes.success && Array.isArray(calRes.events)) {
            const normalized = calRes.events.map((ev, idx) => ({
              id: String(ev.id ?? idx),
              title: ev.title || 'Post Event',
              description: ev.description || '',
              start_time: ev.start_time || ev.start || null,
              end_time: ev.end_time || ev.end || null,
              scheduled_at: ev.start_time || ev.start || null,
              platforms: Array.isArray(ev.platforms) ? ev.platforms : (
                Array.isArray(ev.metadata?.platforms) ? ev.metadata.platforms : (
                  ev.platform ? [ev.platform] : ['Instagram']
                )
              ),
              platform: ev.platform || "",
              post_id: ev.post_id || null,
            }));
            console.log('📅 Normalized calendar events:', normalized);
            setCalendarEvents(prev => (normalized.length ? normalized : prev));
          }
        } catch (e) {
          console.warn('Failed to load calendar events', e);
        }

        try {
          console.log('🚀 Making API call to getScheduledPosts...');
          const schedRes = await apiClient.getScheduledPosts();
          console.log('📅 Scheduled posts response:', schedRes);
          if (schedRes && schedRes.success && Array.isArray(schedRes.scheduled_posts)) {
            const normalized = schedRes.scheduled_posts.map((sp, idx) => ({
              id: String(sp.id ?? sp.post_id ?? sp.event_id ?? idx),
              original_description: sp.original_description || sp.caption || sp.title || sp.message || "",
              caption: sp.caption || "",
              campaign_name: sp.campaign_name || "",
              platforms: sp.platforms || [],
              platform: sp.platform || "",
              scheduled_at: sp.scheduled_at || sp.scheduled_time || sp.start_time || sp.date || null,
              status: (sp.status || "scheduled").toLowerCase(),
              start_time: sp.start_time || null,
            }));
            console.log('📅 Normalized scheduled posts:', normalized);
            console.log('📅 Setting scheduled posts state...');
            setScheduledPosts(prev => {
              console.log('📅 Previous scheduled posts:', prev);
              const newValue = normalized.length ? normalized : prev;
              console.log('📅 New scheduled posts value:', newValue);
              return newValue;
            });
          } else {
            console.log('📅 No scheduled posts found or invalid response');
          }
        } catch (e) {
          console.error('❌ Failed to load scheduled posts', e);
        }

        try {
          const allRes = await apiClient.getAllPosts({ limit: 100 });
          console.log('📅 All posts response:', allRes);
          if (allRes && allRes.success && Array.isArray(allRes.posts)) {
            const normalized = allRes.posts.map((p) => ({
              id: String(p.id),
              original_description: p.original_description || p.caption || p.title || p.message || "",
              caption: p.caption || "",
              campaign_name: p.campaign_name || "",
              platforms: p.platforms || [],
              platform: p.platform || "",
              created_at: p.created_at || p.createdAt || null,
              scheduled_at: p.scheduled_at || p.scheduled_time || p.start_time || p.scheduledAt || null,
              status: (p.status || "").toLowerCase(),
              batch_id: p.batch_id || null,
            }));
            console.log('📅 Normalized all posts:', normalized);
            setAllPosts(prev => (normalized.length ? normalized : prev));
          }
        } catch (e) {
          console.warn('Failed to load all posts', e);
        }

        // Skip scheduler status call since it might not exist
        // try {
        //   const schedStatus = await apiClient.getSchedulerStatus();
        //   if (schedStatus && schedStatus.success && typeof schedStatus.status !== 'undefined') {
        //     setSchedulerStatus(prev => schedStatus.status ?? prev);
        //   }
        // } catch (e) {
        //   console.warn('Failed to load scheduler status', e);
        // }

      } catch (e) {
        console.error("Failed to load analytics/hero:", e);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // Removed state store dependency: rely solely on backend data in this page

  // derive effective stats from analyticsOverview or computed stats
  const effectiveStats = analyticsOverview ? {
    total: analyticsOverview.total || stats.total,
    scheduledThisWeek: analyticsOverview.scheduledThisWeek || stats.scheduledThisWeek,
    active: analyticsOverview.active || stats.active,
    avgEngagement: analyticsOverview.avgEngagement || stats.avgEngagement,
    totalPosts: analyticsOverview.totalPosts || stats.totalPosts
  } : stats;

  const recent = useMemo(() => {
    // Use campaign store activity first, then campaigns, then backend data
    if (recentActivity && recentActivity.length > 0) {
      return recentActivity.slice(0, 6);
    }

    if (campaigns && campaigns.length > 0) {
      return campaigns
        .slice()
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 6)
        .map(c => ({
          text: c.campaignName || c.productDescription || `Campaign created`,
          time: c.createdAt || Date.now()
        }));
    }

    if (allPosts && allPosts.length > 0) {
      return allPosts
        .slice()
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 6)
        .map(p => ({
          text: p.campaign_name || p.original_description || `Campaign ${p.id}`,
          time: new Date(p.created_at || Date.now()).getTime()
        }));
    }

    return heroData && heroData.recent ? heroData.recent : [];
  }, [recentActivity, campaigns, allPosts, heroData]);

  return (
    <div className="space-y-8">
      <Hero />

      <PageHeader
        title={`Welcome back, ${user?.name || 'User'}`}
        description={`Here is what is happening with your campaigns today.`}
        actions={
          <Link to="/create">
            <Button variant="primary" size="md" className="">New Campaign</Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Stat
          label="Total campaigns"
          value={effectiveStats.total}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <Stat
          label="Posts this week"
          value={effectiveStats.scheduledThisWeek}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <Stat
          label="Active"
          value={effectiveStats.active}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Recent Activity + Upcoming Posts - 60% */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Activity */}
          <Card title="Recent Activity">
            <ul className="space-y-3">
              {recent.map((a, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-muted)]">
                  <div className="text-sm text-contrast truncate max-w-[70%]">{a.text}</div>
                  <div className="text-xs text-[var(--text-muted)]">{format(a.time, "PP p")}</div>
                </li>
              ))}
              {recent.length === 0 && <div className="text-sm text-[var(--text-muted)] text-center py-4">No recent activity</div>}
            </ul>
          </Card>

          {/* Upcoming Posts */}
          <Card title="Upcoming Posts">
            <div className="space-y-3">
              {(() => {
                // Get scheduled posts from campaigns first, then fallback to other sources
                const scheduledCampaigns = campaigns.filter(c => c.status?.toLowerCase() === 'scheduled');
                const upcomingPosts = scheduledCampaigns.length > 0
                  ? scheduledCampaigns
                  : (scheduledPosts && scheduledPosts.length > 0
                    ? scheduledPosts
                    : (allPosts || []).filter((p) => (p.status || '').toLowerCase() === 'scheduled'));

                return upcomingPosts.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-muted)]">
                    <div className="text-sm text-contrast truncate max-w-[70%]">
                      {c.campaignName || c.campaign_name || c.productDescription || 'Scheduled post'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {format(new Date(c.scheduledAt || c.scheduled_at || c.start_time || Date.now()), "PP p")}
                    </div>
                  </div>
                ));
              })()}
              {campaigns.filter(c => c.status?.toLowerCase() === 'scheduled').length === 0 &&
                (scheduledPosts || []).length === 0 &&
                (allPosts || []).filter((p) => (p.status || '').toLowerCase() === 'scheduled').length === 0 && (
                  <div className="text-sm text-[var(--text-muted)] text-center py-4">No upcoming posts</div>
                )}
            </div>
          </Card>
        </div>

        {/* Right Column: Weekly Trending Topics - 40% */}
        <div className="lg:col-span-2">
          <WeeklyTrends />
        </div>
      </div>

      {/* Create Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">AI Copywriter</h3>
              <p className="text-sm text-[var(--text-muted)]">Captions, ads & blogs in 28+ languages.</p>
            </div>
            <div></div>
          </div>
        </Card>
        <Card>
          <div>
            <h3 className="text-lg font-semibold">Templates & Graphics</h3>
            <p className="text-sm text-[var(--text-muted)]">Drag & drop editor, stock photos & brand kits.</p>
          </div>
        </Card>
      </div>

      {/* Integrations chips */}
      <div className="mt-6">
        <h4 className="font-semibold mb-3">Integrations</h4>
        <div className="flex flex-wrap gap-3">
          {['Canva', 'Reddit', 'Facebook', 'Twitter', 'HubSpot', 'Slack', 'Google Analytics', 'Giphy', 'Unsplash', 'Bitly'].map((it) => (
            <div
              key={it}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--text)] cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
              onClick={() => navigate('/settings')}
            >
              {it}
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Chart + KPI Cards */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Engagement Over Time" className="lg:col-span-2">
          <div className="h-56">
            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* build polyline from demo.chart or computed series */}
              {(() => {
                const source = (analyticsPosts && analyticsPosts.length > 0)
                  ? analyticsPosts.map(p => p.impressions || p.reach || p.impressions_count || 0)
                  : (analyticsOverview && analyticsOverview.chart ? analyticsOverview.chart : weekCounts);
                const points = source.map((y, i) => `${(i * 600 / (source.length - 1 || 1))},${200 - (Math.min(300, y) / 300 * 200)}`).join(' ');
                return <polyline fill="none" stroke="#1f2937" strokeWidth="3" points={points} />;
              })()}
            </svg>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="text-sm text-[var(--text-muted)]">Posts Scheduled</div>
            <div className="text-3xl font-bold">{effectiveStats.scheduledThisWeek}</div>
            <div className="text-xs text-[var(--text-muted)]">Next 7 days</div>
          </Card>
          <Card>
            <div className="text-sm text-[var(--text-muted)]">AI Captions</div>
            <div className="text-3xl font-bold">{(analyticsOverview && analyticsOverview.aiCaptions) || stats.totalPosts}</div>
            <div className="text-xs text-[var(--text-muted)]">This month</div>
          </Card>
        </div>
      </div>

      {/* Features removed per request */}

      {/* Schedule & Automate placeholder */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Schedule & Automate</h3>
            <button aria-label="Open calendar" onClick={() => setCalendarOpen(true)} className="p-2 rounded-md hover:bg-[var(--bg-muted)]">
              <Calendar className="w-5 h-5 text-[var(--text)]" />
            </button>
          </div>

        </div>

        {/* 7-day overview */}
        <div className="mb-4 flex items-center gap-4">
          {weekDates.map((d, i) => (
            <div key={d.toDateString()} className="flex flex-col items-center px-3 py-2 bg-[var(--bg-muted)] rounded-md">
              <div className="text-xs text-[var(--text-muted)]">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
              <div className="text-lg font-semibold text-[var(--text)]">{weekCounts[i]}</div>
            </div>
          ))}
        </div>
        <Card>
          <div className="space-y-4">
            {dayBuckets.map((bucket) => (
              <div key={bucket.date.toISOString()} className="p-4 bg-[var(--bg-muted)] rounded-lg">
                <div className="font-semibold mb-2">{bucket.label}</div>
                <div className="space-y-2">
                  {bucket.posts.length === 0 && (
                    <div className="px-4 py-3 bg-[var(--surface)] rounded-md text-[var(--text-muted)] text-sm">No posts</div>
                  )}
                  {bucket.posts.map((p) => {
                    const when = new Date(p.scheduled_at || p.scheduled_time || p.scheduledAt || p.start_time || p.start || 0);
                    const timeStr = isNaN(when.getTime()) ? '' : format(when, 'p');

                    // Enhanced platform detection with multiple fallbacks and better logic
                    let platforms = [];
                    
                    // Try to get platforms from various possible sources
                    if (Array.isArray(p.platforms) && p.platforms.length > 0) {
                      platforms = p.platforms.filter(p => p && p.trim());
                    } else if (p.platform && p.platform.trim()) {
                      platforms = [p.platform.trim()];
                    } else if (p.metadata && Array.isArray(p.metadata.platforms)) {
                      platforms = p.metadata.platforms.filter(p => p && p.trim());
                    } else {
                      // Try to extract from title or description if it contains platform info
                      const text = (p.title || p.original_description || '').toLowerCase();
                      if (text.includes('instagram')) platforms = ['Instagram'];
                      else if (text.includes('facebook')) platforms = ['Facebook'];
                      else if (text.includes('twitter')) platforms = ['Twitter'];
                      else if (text.includes('reddit')) platforms = ['Reddit'];
                      else if (text.includes('linkedin')) platforms = ['LinkedIn'];
                      else platforms = ['Social Media']; // Generic fallback
                    }

                    const platformStr = platforms.map(platform => {
                      // Capitalize and format platform names properly
                      const clean = platform.toString().trim();
                      const formatted = clean.toLowerCase();
                      switch (formatted) {
                        case 'facebook': return 'Facebook';
                        case 'instagram': return 'Instagram';
                        case 'twitter': case 'x': return 'Twitter';
                        case 'reddit': return 'Reddit';
                        case 'linkedin': return 'LinkedIn';
                        case 'tiktok': return 'TikTok';
                        case 'youtube': return 'YouTube';
                        case 'pinterest': return 'Pinterest';
                        case 'snapchat': return 'Snapchat';
                        default: return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                      }
                    }).join(', ');

                    // Generate more meaningful title based on campaign data
                    let campaignTitle = '';
                    
                    // Priority order for title selection:
                    if (p.campaign_name && p.campaign_name.trim() && p.campaign_name !== 'Untitled Campaign') {
                      campaignTitle = p.campaign_name.trim();
                    } else if (p.campaignName && p.campaignName.trim()) {
                      campaignTitle = p.campaignName.trim();
                    } else if (p.title && p.title.trim()) {
                      campaignTitle = p.title.trim();
                    } else if (p.original_description && p.original_description.trim()) {
                      const desc = p.original_description.trim();
                      // Avoid showing UUID-like strings as titles
                      if (desc.length > 10 && !desc.match(/^[a-f0-9-]{30,}$/i) && !desc.startsWith('Post ')) {
                        campaignTitle = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
                      } else {
                        campaignTitle = 'Campaign Post';
                      }
                    } else if (p.caption && p.caption.trim()) {
                      const cap = p.caption.trim();
                      campaignTitle = cap.length > 30 ? cap.substring(0, 30) + '...' : cap;
                    } else {
                      campaignTitle = 'Social Media Campaign';
                    }

                    return (
                      <div key={p.id} className="px-4 py-3 bg-[var(--surface)] rounded-md">
                        <div className="text-base font-medium text-contrast mb-1">{campaignTitle}</div>
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                          <span>{timeStr}</span>
                          <span className="flex items-center gap-1">
                            <span>•</span>
                            <span>{platformStr}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <CalendarPicker open={calendarOpen} onOpenChange={setCalendarOpen} date={selectedDate} onChange={setSelectedDate} />
      </div>
    </div>
  );
}

export default Dashboard;
