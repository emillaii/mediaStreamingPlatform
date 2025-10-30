import { useState } from "react";
import { Login } from "./components/Login.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { Footer } from "./components/Footer.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { MediaLibrary } from "./components/MediaLibrary.jsx";
import { ProcessingQueue } from "./components/ProcessingQueue.jsx";
import { Analytics } from "./components/Analytics.jsx";
import { Users } from "./components/Users.jsx";
import { Settings } from "./components/Settings.jsx";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
      case "analytics":
        return <Analytics />;
      case "users":
        return <Users />;
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
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <div className="px-8 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-slate-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {activeTab === "dashboard" && "Overview of your media processing operations"}
                  {activeTab === "media" && "Manage and organize your media files"}
                  {activeTab === "processing" && "Monitor active processing jobs"}
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

        <main className="flex-1 px-8 py-8">{renderContent()}</main>

        <Footer />
      </div>
    </div>
  );
}
