import { useMemo, useState } from "react";
import { Toaster } from "sonner";
import { Login } from "./components/Login.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { Footer } from "./components/Footer.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { MediaLibrary } from "./components/MediaLibrary.jsx";
import { ProcessingQueue } from "./components/ProcessingQueue.jsx";
import { Analytics } from "./components/Analytics.jsx";
import { Users } from "./components/Users.jsx";
import { Settings } from "./components/Settings.jsx";
import { MediaWorkers } from "./components/MediaWorkers.jsx";

const ADMIN_SESSION_STORAGE_KEY = "mediaflow-admin-session";

const getStoredAdminSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);

    if (parsed && typeof parsed === "object" && "admin" in parsed) {
      return {
        admin: parsed.admin ?? null,
        savedAt: parsed.savedAt ?? null,
      };
    }

    return { admin: parsed ?? null, savedAt: null };
  } catch {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return null;
  }
};

export default function App() {
  const storedSession = useMemo(() => getStoredAdminSession(), []);
  const [admin, setAdmin] = useState(storedSession?.admin ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(storedSession));
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogin = (adminInfo) => {
    setIsAuthenticated(true);
    setAdmin(adminInfo ?? null);

    if (typeof window !== "undefined") {
      const sessionPayload = {
        admin: adminInfo ?? null,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdmin(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
    setActiveTab("dashboard");
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "media":
        return <MediaLibrary />;
      case "processing":
        return <ProcessingQueue />;
      case "workers":
        return <MediaWorkers />;
      case "analytics":
        return <Analytics />;
      case "users":
        return <Users admin={admin} />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col">
        <Toaster position="bottom-right" richColors />
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <div className="px-8 py-5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-slate-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {activeTab === "dashboard" && "Overview of your media processing operations"}
                  {activeTab === "media" && "Manage and organize your media files"}
                  {activeTab === "processing" && "Monitor active processing jobs"}
                  {activeTab === "workers" && "Configure media processing workers and capacity"}
                  {activeTab === "analytics" && "Track performance and engagement metrics"}
                  {activeTab === "users" && "Manage user accounts and permissions"}
                  {activeTab === "settings" && "Configure system preferences"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
                  <p className="text-xs text-slate-600">System Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-slate-900">All Systems Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">
          <div className="max-w-7xl mx-auto w-full">{renderContent()}</div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
