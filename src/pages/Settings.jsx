import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiFetch, apiUrl } from "../lib/api.js";
import apiClient from "../lib/apiClient.js";
import SocialMediaConnectionModal from "../components/ui/SocialMediaConnectionModal.jsx";
import { Facebook, Twitter, MessageCircle, Instagram } from "lucide-react";
import { useAuthStore } from "../store/authStore";

// Small usage widget component
function UsageWidget() {
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await apiFetch('/api/usage-stats');
      const data = await response.json();
      console.log('Usage stats response:', data);
      if (data.success) {
        setUsage(data.usage || {});
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading usage...</div>;
  }

  const totalTokens = Object.values(usage).reduce((sum, service) => sum + (service.tokens_used || 0), 0);
  const totalCredits = Object.values(usage).reduce((sum, service) => sum + (service.credits_used || 0), 0);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Total Tokens:</span>
        <span className="font-medium">{totalTokens.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Total Credits:</span>
        <span className="font-medium">{totalCredits.toLocaleString()}</span>
      </div>
      {Object.keys(usage).length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 mb-1">By Service:</div>
          {Object.entries(usage).map(([service, stats]) => (
            <div key={service} className="flex justify-between text-xs">
              <span className="capitalize">{service}:</span>
              <span>{stats.tokens_used || 0} tokens, {stats.credits_used || 0} credits</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [driveConnected, setDriveConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { user, logout } = useAuthStore();

  // Delete account function
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const response = await apiClient.deleteAccount();

      if (response) {
        toast.success('Account deleted successfully');
        logout();
        window.location.href = '/login';
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Social media connection states
  const [socialMediaModal, setSocialMediaModal] = useState({ open: false, platform: null });
  const [platformStatus, setPlatformStatus] = useState({
    facebook: { connected: false, checking: false },
    instagram: { connected: false, checking: false },
    twitter: { connected: false, checking: false },
    reddit: { connected: false, checking: false }
  });

  // Check Google Drive connection status on page load
  useEffect(() => {
    checkGoogleStatus();
    checkAllSocialMediaStatus();
  }, []);

  const checkGoogleStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await apiFetch("/google/status");
      const data = await response.json();
      setDriveConnected(data.connected);
      setCalendarConnected(data.connected); // Same OAuth token works for both
    } catch (error) {
      console.error("Failed to check Google status:", error);
      setDriveConnected(false);
      setCalendarConnected(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const connectToGoogle = async () => {
    try {
      setLoading(true);
      // Open Google OAuth in a new window
      const authWindow = window.open(
        apiUrl("/google/connect"),
        "GoogleAuth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      // Poll for connection status
      const pollInterval = setInterval(async () => {
        if (authWindow.closed) {
          clearInterval(pollInterval);
          await checkGoogleStatus();
          if (driveConnected) {
            toast.success("Successfully connected to Google Drive!");
          }
          setLoading(false);
          return;
        }

        try {
          const statusResponse = await apiFetch("/google/status");
          const statusData = await statusResponse.json();
          if (statusData.connected) {
            setDriveConnected(true);
            clearInterval(pollInterval);
            authWindow.close();
            toast.success("Successfully connected to Google Drive!");
            setLoading(false);
          }
        } catch (error) {
          // Continue polling
        }
      }, 2000);

      // Stop polling after 60 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!authWindow.closed) {
          authWindow.close();
        }
        setLoading(false);
      }, 60000);
    } catch (error) {
      console.error("Failed to connect to Google:", error);
      toast.error("Failed to connect to Google Drive");
      setLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/google/disconnect", { method: "POST" });

      if (response.ok) {
        setDriveConnected(false);
        setCalendarConnected(false);
        toast.success("Successfully disconnected from Google services");
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect from Google:", error);
      toast.error("Failed to disconnect from Google services");
    } finally {
      setLoading(false);
    }
  };

  // Social media platform management functions
  const checkAllSocialMediaStatus = async () => {
    const platforms = ['facebook', 'instagram', 'twitter', 'reddit'];

    for (const platform of platforms) {
      setPlatformStatus(prev => ({ ...prev, [platform]: { ...prev[platform], checking: true } }));

      try {
        const response = await apiFetch(`/social-media/${platform}/status`);
        const data = await response.json();
        setPlatformStatus(prev => ({
          ...prev,
          [platform]: { connected: data.connected, checking: false }
        }));
      } catch (error) {
        console.error(`Failed to check ${platform} status:`, error);
        setPlatformStatus(prev => ({
          ...prev,
          [platform]: { connected: false, checking: false }
        }));
      }
    }
  };

  const handleSocialMediaConnect = (platform) => {
    setSocialMediaModal({ open: true, platform });
  };

  const handleSocialMediaDisconnect = async (platform) => {
    try {
      const response = await apiFetch(`/social-media/${platform}/disconnect`, { method: "POST" });
      if (response.ok) {
        setPlatformStatus(prev => ({
          ...prev,
          [platform]: { ...prev[platform], connected: false }
        }));
        toast.success(`Successfully disconnected from ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
      }
    } catch (error) {
      console.error(`Failed to disconnect from ${platform}:`, error);
      toast.error(`Failed to disconnect from ${platform}`);
    }
  };

  const handleSaveCredentials = async (platform, credentials) => {
    try {
      const response = await apiFetch(`/social-media/${platform}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPlatformStatus(prev => ({
          ...prev,
          [platform]: { ...prev[platform], connected: true }
        }));
        toast.success(`Successfully connected to ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`);
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      console.error(`Failed to connect to ${platform}:`, error);
      toast.error(`Failed to connect to ${platform}: ${error.message}`);
      throw error;
    }
  };

  const getSocialMediaPlatformConfig = (platform) => {
    const configs = {
      facebook: {
        name: 'Facebook',
        icon: Facebook,
        color: 'bg-blue-600',
        description: 'Connect your Facebook page to post content automatically'
      },
      instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        description: 'Connect your Instagram account to post content automatically'
      },
      twitter: {
        name: 'Twitter',
        icon: Twitter,
        color: 'bg-black',
        description: 'Connect your Twitter account to post tweets automatically'
      },
      reddit: {
        name: 'Reddit',
        icon: MessageCircle,
        color: 'bg-orange-600',
        description: 'Connect your Reddit account to post to subreddits automatically'
      }
    };
    return configs[platform];
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Social Media Connections Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Social Media Connections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['facebook', 'instagram', 'twitter', 'reddit'].map((platform) => {
            const config = getSocialMediaPlatformConfig(platform);
            const status = platformStatus[platform];
            const Icon = config.icon;

            return (
              <Card key={platform} title={config.name}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Integration status</div>
                        <div className="text-sm text-gray-600">
                          {status.checking ? "Checking..." : status.connected ? "Connected" : "Not connected"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`${status.checking ? 'bg-yellow-500' : status.connected ? 'bg-green-500' : 'bg-red-500'} w-2 h-2 rounded-full`} />
                      <span className="text-sm text-gray-600">
                        {status.checking ? "Checking" : status.connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {status.connected ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSocialMediaDisconnect(platform)}
                        disabled={status.checking}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSocialMediaConnect(platform)}
                        disabled={status.checking}
                      >
                        {status.checking ? "Checking..." : "Connect"}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setPlatformStatus(prev => ({ ...prev, [platform]: { ...prev[platform], checking: true } }));
                        checkAllSocialMediaStatus();
                      }}
                      disabled={status.checking}
                    >
                      {status.checking ? "Checking..." : "Refresh"}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {config.description}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Google Drive">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Integration status</div>
                <div className="text-sm text-gray-600">
                  {checkingStatus ? "Checking..." : driveConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`${checkingStatus ? 'bg-yellow-500' : driveConnected ? 'bg-green-500' : 'bg-red-500'} w-2 h-2 rounded-full`} />
                <span className="text-sm text-gray-600">
                  {checkingStatus ? "Checking" : driveConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {driveConnected ? (
                <Button
                  variant="secondary"
                  onClick={disconnectGoogle}
                  disabled={loading}
                >
                  {loading ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : (
                <Button
                  onClick={connectToGoogle}
                  disabled={loading}
                >
                  {loading ? "Connecting..." : "Connect"}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={checkGoogleStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? "Checking..." : "Refresh Status"}
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Save your campaigns and images to Google Drive in JSON format
            </div>
          </div>
        </Card>

        <Card title="Google Calendar">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Integration status</div>
                <div className="text-sm text-gray-600">
                  {checkingStatus ? "Checking..." : calendarConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`${checkingStatus ? 'bg-yellow-500' : calendarConnected ? 'bg-green-500' : 'bg-red-500'} w-2 h-2 rounded-full`} />
                <span className="text-sm text-gray-600">
                  {checkingStatus ? "Checking" : calendarConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {calendarConnected ? (
                <Button
                  variant="secondary"
                  onClick={disconnectGoogle}
                  disabled={loading}
                >
                  {loading ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : (
                <Button
                  onClick={connectToGoogle}
                  disabled={calendarLoading || loading}
                >
                  {calendarLoading || loading ? "Connecting..." : "Connect"}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={checkGoogleStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? "Checking..." : "Refresh Status"}
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Create calendar events for scheduled social media posts with reminders
            </div>
          </div>
        </Card>

        <Card title="Notifications">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable notifications</div>
              <div className="text-sm text-gray-600">
                Receive updates about campaign status
              </div>
            </div>
            <button
              role="switch"
              aria-checked={notifications}
              onClick={() => setNotifications((v) => !v)}
              className={
                (notifications ? "bg-blue-600" : "bg-gray-300") +
                " relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              }
            >
              <span
                className={
                  (notifications ? "translate-x-6" : "translate-x-1") +
                  " inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                }
              />
            </button>
          </div>
        </Card>

        <Card title="API Usage">
          <UsageWidget />
        </Card>

        <Card title="Account">
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              User: {user?.name || 'User'} ({user?.email || 'user@example.com'})
            </div>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete account'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Social Media Connection Modal */}
      <SocialMediaConnectionModal
        open={socialMediaModal.open}
        onOpenChange={(open) => setSocialMediaModal({ open, platform: socialMediaModal.platform })}
        platform={socialMediaModal.platform}
        onSave={handleSaveCredentials}
      />

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Account
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
              All your data, campaigns, and posts will be permanently deleted.
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
