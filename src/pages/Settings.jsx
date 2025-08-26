import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useState, useEffect } from "react";
import { toast } from "sonner";

function Settings() {
  const [igConnected, setIgConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check Google Drive connection status on page load
  useEffect(() => {
    checkGoogleStatus();
  }, []);

  const checkGoogleStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await fetch("http://localhost:8000/google/status");
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
        "http://localhost:8000/google/connect", 
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
          const statusResponse = await fetch("http://localhost:8000/google/status");
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
    // For now, we'll just update the UI. In a real app, you'd call an endpoint to revoke tokens
    try {
      setLoading(true);
      // You would typically call an endpoint to revoke the token here
      // await fetch("http://localhost:8000/google/disconnect", { method: "POST" });
      
      setDriveConnected(false);
      toast.success("Disconnected from Google Drive");
    } catch (error) {
      toast.error("Failed to disconnect from Google Drive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Instagram Account">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Connection status</div>
              <div className="text-sm text-gray-600">
                {igConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
            {igConnected ? (
              <Button variant="secondary" onClick={() => setIgConnected(false)}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => setIgConnected(true)}>Connect</Button>
            )}
          </div>
        </Card>

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
                <div className={`w-2 h-2 rounded-full ${
                  checkingStatus ? 'bg-yellow-500' : driveConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
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
                <div className={`w-2 h-2 rounded-full ${
                  checkingStatus ? 'bg-yellow-500' : calendarConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {checkingStatus ? "Checking" : calendarConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {calendarConnected ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCalendarConnected(false);
                    setDriveConnected(false);
                    toast.success("Disconnected from Google Calendar");
                  }}
                  disabled={calendarLoading}
                >
                  {calendarLoading ? "Disconnecting..." : "Disconnect"}
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

        <Card title="Account">
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              User: Alex Johnson (alex@example.com)
            </div>
            <Button variant="danger">Delete account</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
