import { useState, useEffect } from "react";
import Card from "../components/ui/Card.jsx";
import analyticsService from "../services/analyticsService.js";

function Analytics() {
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    followers: null,
    demographics: null,
    posts: null,
    bestPost: null,
    worstPost: null,
    status: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all analytics data
      const [overview, followers, demographics, posts, bestPost, worstPost, status] = await Promise.all([
        analyticsService.getAnalyticsOverview(),
        analyticsService.getFollowers(), 
        analyticsService.getDemographics(),
        analyticsService.getPostsAnalytics(10),
        analyticsService.getBestPost(),
        analyticsService.getWorstPost(), 
        analyticsService.getAnalyticsStatus()
      ]);
      
      setAnalyticsData({
        overview,
        followers,
        demographics,
        posts,
        bestPost,
        worstPost,
        status
      });
      
      setIsConfigured(status.configured);
      
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadAnalyticsData();
  };

  // Helper function to format numbers
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  // Helper function to get safe data with fallbacks
  const safeGet = (obj, path, fallback = 'N/A') => {
    try {
      const value = path.split('.').reduce((o, p) => o && o[p], obj);
      return value !== null && value !== undefined ? value : fallback;
    } catch {
      return fallback;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">Loading analytics data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isConfigured ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {isConfigured ? 'Live Data' : 'Demo Data'}
            </span>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">
            <strong>Error loading analytics:</strong> {error}
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Followers">
          <div className="text-2xl font-semibold">
            {formatNumber(safeGet(analyticsData.followers, 'followers', 0))}
          </div>
          <div className="text-sm text-gray-500">Total page followers</div>
        </Card>
        
        <Card title="Impressions">
          <div className="text-2xl font-semibold">
            {formatNumber(safeGet(analyticsData.overview, 'totals.impressions', 0))}
          </div>
          <div className="text-sm text-gray-500">Post impressions</div>
        </Card>
        
        
        <Card title="Reach">
          <div className="text-2xl font-semibold">
            {formatNumber(safeGet(analyticsData.overview, 'totals.reach', 0))}
          </div>
          <div className="text-sm text-gray-500">Total reach</div>
        </Card>
      </div>

      {/* Demographics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Audience by Country">
          <div className="space-y-2">
            {analyticsData.demographics?.by_country && Object.keys(analyticsData.demographics.by_country).length > 0 ? (
              Object.entries(analyticsData.demographics.by_country)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([country, count]) => (
                  <div key={country} className="flex justify-between items-center">
                    <span className="text-gray-700">{country}</span>
                    <span className="font-semibold">{formatNumber(count)}</span>
                  </div>
                ))
            ) : (
              <div className="text-gray-500 text-center py-4">
                No country data available
              </div>
            )}
          </div>
        </Card>

        <Card title="Audience by Age & Gender">
          <div className="space-y-2">
            {analyticsData.demographics?.by_age_gender && Object.keys(analyticsData.demographics.by_age_gender).length > 0 ? (
              Object.entries(analyticsData.demographics.by_age_gender)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([segment, count]) => (
                  <div key={segment} className="flex justify-between items-center">
                    <span className="text-gray-700">{segment}</span>
                    <span className="font-semibold">{formatNumber(count)}</span>
                  </div>
                ))
            ) : (
              <div className="text-gray-500 text-center py-4">
                No demographic data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Post Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Best Performing Post">
          {analyticsData.bestPost?.post && Object.keys(analyticsData.bestPost.post).length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 line-clamp-3">
                {safeGet(analyticsData.bestPost.post, 'message', 'No message available')}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Reach:</span>
                  <div className="font-semibold">
                    {formatNumber(safeGet(analyticsData.bestPost.post, 'reach', 0))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Impressions:</span>
                  <div className="font-semibold">
                    {formatNumber(safeGet(analyticsData.bestPost.post, 'impressions', 0))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Engaged Users:</span>
                  <div className="font-semibold">
                    {formatNumber(safeGet(analyticsData.bestPost.post, 'engaged_users', 0))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              No post data available
            </div>
          )}
        </Card>

        <Card title="Worst Performing Post">
          {analyticsData.worstPost?.post && Object.keys(analyticsData.worstPost.post).length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 line-clamp-3">
                {safeGet(analyticsData.worstPost.post, 'message', 'No message available')}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Reach:</span>
                  <div className="font-semibold">
                    {formatNumber(safeGet(analyticsData.worstPost.post, 'reach', 0))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Impressions:</span>
                  <div className="font-semibold">
                    {formatNumber(safeGet(analyticsData.worstPost.post, 'impressions', 0))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Engaged Users:</span>
                  <div className="font-semibold">
                    {formatNumber(safeGet(analyticsData.worstPost.post, 'engaged_users', 0))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              No post data available
            </div>
          )}
        </Card>
      </div>

      {/* Recent Posts Performance */}
      {analyticsData.posts?.posts && analyticsData.posts.posts.length > 0 && (
        <Card title="Recent Posts Performance">
          <div className="space-y-4">
            {analyticsData.posts.posts.slice(0, 5).map((post, index) => {
              // Use actual engagement data from Facebook API
              const totalLikes = post.reactions_count || 0;
              const actualComments = post.comments_count || 0;
              const actualShares = post.shares_count || 0;
              
              return (
                <div key={post.id || index} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 text-sm text-gray-600 line-clamp-2">
                      {post.message || 'No message available'}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs text-gray-500">
                    <div>
                      <span>Reach: </span>
                      <span className="font-semibold text-gray-700">{formatNumber(post.reach)}</span>
                    </div>
                    <div>
                      <span>Likes: </span>
                      <span className="font-semibold text-gray-700">{formatNumber(totalLikes)}</span>
                    </div>
                    <div>
                      <span>Comments: </span>
                      <span className="font-semibold text-gray-700">{formatNumber(actualComments)}</span>
                    </div>
                    <div>
                      <span>Shares: </span>
                      <span className="font-semibold text-gray-700">{formatNumber(actualShares)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Configuration notice */}
      {!isConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> Facebook analytics not configured. Showing sample data. 
                Add your PAGE_ID and ACCESS_TOKEN to the server/.env file to see real Facebook data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
