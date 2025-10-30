import { Card, CardContent } from "./ui/card";
import { Video, Clock, CheckCircle2, AlertCircle, TrendingUp, HardDrive } from "lucide-react";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

export function Dashboard() {
  const stats = [
    {
      title: "Total Media Files",
      value: "1,284",
      change: "+12.3%",
      icon: Video,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Processing",
      value: "23",
      change: "-5.2%",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Completed Today",
      value: "147",
      change: "+18.7%",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Failed",
      value: "3",
      change: "-2 from yesterday",
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  const recentActivity = [
    { id: 1, name: "summer_vacation_4k.mp4", status: "completed", time: "2 min ago", size: "2.4 GB" },
    { id: 2, name: "product_demo_hd.mov", status: "processing", time: "5 min ago", size: "1.8 GB", progress: 67 },
    { id: 3, name: "interview_session.mp4", status: "completed", time: "12 min ago", size: "987 MB" },
    { id: 4, name: "conference_keynote.mp4", status: "processing", time: "18 min ago", size: "3.2 GB", progress: 34 },
    { id: 5, name: "tutorial_basics.mov", status: "completed", time: "25 min ago", size: "654 MB" },
  ];

  const storageData = {
    used: 2847,
    total: 5000,
    percentage: 57,
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-slate-600 text-sm">{stat.title}</p>
                  <p className="text-slate-900">{stat.value}</p>
                  <p className="text-slate-500 text-sm">{stat.change}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl shadow-sm`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <p className="text-sm text-slate-500">Latest updates from your media workflow</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-transparent rounded-xl hover:from-slate-100 transition-all border border-slate-100"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 text-sm truncate">{item.name}</p>
                      <p className="text-slate-500 text-sm">{item.size}</p>
                      {item.status === "processing" && item.progress ? (
                        <Progress value={item.progress} className="mt-2 h-1.5" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-slate-500 text-sm whitespace-nowrap">{item.time}</p>
                    <Badge variant={item.status === "completed" ? "default" : "secondary"}>{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <h3 className="text-slate-900 font-semibold">Storage Usage</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Used</span>
                  <span className="text-slate-900">{storageData.used} GB</span>
                </div>
                <Progress value={storageData.percentage} className="h-2.5" />
                <p className="text-slate-500 text-sm">
                  {storageData.used} GB of {storageData.total} GB used
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-slate-900 font-semibold">Performance</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Avg. Processing Time</span>
                  <span className="text-slate-900">8.3 min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Success Rate</span>
                  <span className="text-green-600">98.2%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Active Encoders</span>
                  <span className="text-slate-900">4/6</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
