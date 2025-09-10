import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import AppLayout from "./layout/AppLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateCampaign from "./pages/CreateCampaign.jsx";
import MyCampaigns from "./pages/MyCampaigns.jsx";
import Analytics from "./pages/Analytics.jsx";
import Settings from "./pages/Settings.jsx";
import Pricing from "./pages/Pricing.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <ErrorBoundary>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/campaigns" element={<MyCampaigns />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppLayout>
      </ErrorBoundary>
    </div>
  );
}

export default App;
