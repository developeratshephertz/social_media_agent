import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import AppLayout from "./layout/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateCampaign from "./pages/CreateCampaign.jsx";
import MyCampaigns from "./pages/MyCampaigns.jsx";
import Analytics from "./pages/Analytics.jsx";
import IdeaGenerator from "./pages/IdeaGenerator.jsx";
import Settings from "./pages/Settings.jsx";
import Pricing from "./pages/Pricing.jsx";
import HelpSupport from "./pages/HelpSupport.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <ErrorBoundary>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <Navigate to="/dashboard" replace />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute>
              <AppLayout>
                <CreateCampaign />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns" element={
            <ProtectedRoute>
              <AppLayout>
                <MyCampaigns />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AppLayout>
                <Analytics />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/idea-generator" element={
            <ProtectedRoute>
              <AppLayout>
                <IdeaGenerator />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/pricing" element={
            <ProtectedRoute>
              <AppLayout>
                <Pricing />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/help-support" element={
            <ProtectedRoute>
              <AppLayout>
                <HelpSupport />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
