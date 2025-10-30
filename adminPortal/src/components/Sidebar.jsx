import { LayoutDashboard, Video, Clock, Settings, LogOut, BarChart3, Users, FileVideo } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function Sidebar({ activeTab, onTabChange, onLogout }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "media", label: "Media Library", icon: Video },
    { id: "processing", label: "Processing Queue", icon: Clock },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
  ];

  const bottomItems = [{ id: "settings", label: "Settings", icon: Settings }];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <FileVideo className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white">MediaFlow</h2>
            <p className="text-slate-400 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      <Separator className="bg-slate-700" />

      <nav className="flex-1 px-3 py-6 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === item.id
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 space-y-1">
        <Separator className="bg-slate-700 mb-3" />
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === item.id
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-red-900/20 hover:text-red-400 justify-start"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Logout</span>
        </Button>
      </div>

      <div className="p-4 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">Admin User</p>
            <p className="text-xs text-slate-400 truncate">admin@mediaflow.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
