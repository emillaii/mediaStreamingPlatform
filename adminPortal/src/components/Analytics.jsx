import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, Eye, Clock, Users as UsersIcon } from "lucide-react";
import { Badge } from "./ui/badge";

export function Analytics() {
  const viewsData = [
    { month: "Jan", views: 12400 },
    { month: "Feb", views: 15800 },
    { month: "Mar", views: 18200 },
    { month: "Apr", views: 22100 },
    { month: "May", views: 19800 },
    { month: "Jun", views: 24500 },
  ];

  const topVideos = [
    { id: 1, name: "Product Launch 2025", views: "125K", duration: "12:34", engagement: "92%" },
    { id: 2, name: "CEO Keynote Address", views: "98K", duration: "45:18", engagement: "88%" },
    { id: 3, name: "Tutorial Series Ep.1", views: "87K", duration: "8:22", engagement: "94%" },
    { id: 4, name: "Customer Success Story", views: "76K", duration: "6:45", engagement: "91%" },
    { id: 5, name: "Technical Deep Dive", views: "65K", duration: "32:15", engagement: "85%" },
  ];

  const metrics = [
    { label: "Total Views", value: "2.4M", change: "+12.5%", icon: Eye, color: "text-blue-600", bgColor: "bg-blue-100" },
    { label: "Watch Time", value: "34.2K hrs", change: "+18.3%", icon: Clock, color: "text-purple-600", bgColor: "bg-purple-100" },
    { label: "Active Users", value: "45.8K", change: "+8.7%", icon: UsersIcon, color: "text-green-600", bgColor: "bg-green-100" },
    { label: "Avg. Engagement", value: "89.2%", change: "+3.2%", icon: TrendingUp, color: "text-orange-600", bgColor: "bg-orange-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-slate-600 text-sm">{metric.label}</p>
                  <p className="text-slate-900">{metric.value}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <p className="text-green-600 text-sm">{metric.change}</p>
                  </div>
                </div>
                <div className={`${metric.bgColor} ${metric.color} p-3 rounded-xl`}>
                  <metric.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Monthly Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {viewsData.map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.month}</span>
                    <span className="text-slate-900">{(item.views / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${(item.views / 25000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Top Performing Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-transparent hover:from-slate-100 transition-all"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate">{video.name}</p>
                    <p className="text-xs text-slate-500">{video.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-900">{video.views}</p>
                    <Badge variant="outline" className="text-xs">
                      {video.engagement}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
