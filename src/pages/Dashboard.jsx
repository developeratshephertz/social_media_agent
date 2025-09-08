import { useMemo, useEffect } from "react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { Link } from "react-router-dom";
import { useCampaignStore } from "../store/campaignStore.js";
import { format } from "date-fns";

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const { campaigns, loadCampaignsFromDB } = useCampaignStore();
  
  // Load campaigns from database on component mount
  useEffect(() => {
    loadCampaignsFromDB();
  }, [loadCampaignsFromDB]);
  const stats = useMemo(() => {
    // Count unique batches (campaigns) instead of individual posts
    const uniqueBatches = new Set();
    campaigns.forEach(c => {
      if (c.batchId) {
        uniqueBatches.add(c.batchId);
      } else {
        uniqueBatches.add(`single_${c.id}`);
      }
    });
    
    const totalCampaigns = uniqueBatches.size;
    const totalPosts = campaigns.length;
    const scheduledPosts = campaigns.filter((c) => c.status === "Scheduled").length;
    const activePosts = campaigns.filter((c) => c.status === "Scheduled" || c.status === "Posted").length;
    const avgEngagement = 4.6;
    
    return { 
      total: totalCampaigns, 
      scheduledThisWeek: scheduledPosts, 
      active: activePosts, 
      avgEngagement,
      totalPosts 
    };
  }, [campaigns]);

  const recent = campaigns
    .flatMap((c) => (c.activity || []).map((a) => ({ 
      ...a, 
      id: c.id, 
      campaignName: c.productDescription || 'Untitled Campaign'
    })))
    .filter((a) => {
      // Filter out technical messages, only show meaningful activity
      const text = a.text.toLowerCase();
      return !text.includes('ai image generated') && 
             !text.includes('ai caption generated') && 
             !text.includes('campaign created');
    })
    .sort((a, b) => b.time - a.time)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, Alex</h1>
          <p className="text-gray-600">
            Here is what is happening with your campaigns today.
          </p>
        </div>
        <Link to="/create">
          <Button>New Campaign</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total campaigns" value={stats.total} />
        <Stat label="Posts this week" value={stats.scheduledThisWeek} />
        <Stat label="Avg engagement" value={`${stats.avgEngagement}%`} />
        <Stat label="Active" value={stats.active} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Recent Activity"
          action={
            <Link to="/campaigns" className="text-sm text-blue-600">
              View all
            </Link>
          }
        >
          <ul className="space-y-3">
            {recent.map((a, idx) => (
              <li key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {a.campaignName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(a.time, "MMM d, h:mm a")}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {a.text}
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <div className="text-sm text-gray-500">No recent activity</div>
            )}
          </ul>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Quick Actions">
            <div className="flex flex-wrap gap-3">
              <Link to="/create">
                <Button size="md">Create campaign</Button>
              </Link>
              <Link to="/campaigns">
                <Button variant="secondary">Manage campaigns</Button>
              </Link>
              <Link to="/analytics">
                <Button variant="secondary">View analytics</Button>
              </Link>
            </div>
          </Card>

          <Card title="Upcoming Posts">
            <div className="space-y-3">
              {campaigns
                .filter((c) => c.status === "Scheduled")
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="text-sm text-gray-800 truncate max-w-[60%]">
                      {c.productDescription}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color="yellow">Scheduled</Badge>
                      <div className="text-xs text-gray-500">
                        {format(new Date(c.scheduledAt), "PP p")}
                      </div>
                    </div>
                  </div>
                ))}
              {campaigns.filter((c) => c.status === "Scheduled").length ===
                0 && (
                <div className="text-sm text-gray-500">No upcoming posts</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
