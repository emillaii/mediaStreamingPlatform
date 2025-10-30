import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Clock, CheckCircle2, XCircle, Pause, Play, X } from "lucide-react";

export function ProcessingQueue() {
  const queueItems = [
    {
      id: 1,
      name: "marketing_video_final.mp4",
      operation: "Transcoding to HLS",
      status: "processing",
      progress: 67,
      startedAt: "10:34 AM",
      estimatedTime: "4 min remaining",
      priority: "high",
    },
    {
      id: 2,
      name: "product_launch.mov",
      operation: "Thumbnail Generation",
      status: "processing",
      progress: 34,
      startedAt: "10:38 AM",
      estimatedTime: "2 min remaining",
      priority: "medium",
    },
    {
      id: 3,
      name: "training_module_1.mp4",
      operation: "Quality Enhancement",
      status: "queued",
      progress: 0,
      startedAt: "-",
      estimatedTime: "Waiting in queue",
      priority: "low",
    },
    {
      id: 4,
      name: "event_highlights.mp4",
      operation: "Audio Normalization",
      status: "processing",
      progress: 89,
      startedAt: "10:22 AM",
      estimatedTime: "1 min remaining",
      priority: "high",
    },
    {
      id: 5,
      name: "interview_raw.mov",
      operation: "Format Conversion",
      status: "queued",
      progress: 0,
      startedAt: "-",
      estimatedTime: "Waiting in queue",
      priority: "medium",
    },
    {
      id: 6,
      name: "webcast_recording.mp4",
      operation: "Multi-bitrate Encoding",
      status: "completed",
      progress: 100,
      startedAt: "10:15 AM",
      estimatedTime: "Completed",
      priority: "high",
    },
    {
      id: 7,
      name: "demo_version2.mp4",
      operation: "Transcoding to HLS",
      status: "failed",
      progress: 0,
      startedAt: "10:28 AM",
      estimatedTime: "Error occurred",
      priority: "medium",
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "processing":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      processing: "secondary",
      completed: "default",
      failed: "destructive",
      queued: "outline",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-700",
      medium: "bg-orange-100 text-orange-700",
      low: "bg-slate-100 text-slate-700",
    };

    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority}
      </Badge>
    );
  };

  const stats = [
    { label: "In Queue", value: "2", icon: Clock, color: "text-slate-600" },
    { label: "Processing", value: "3", icon: Clock, color: "text-orange-600" },
    { label: "Completed", value: "1", icon: CheckCircle2, color: "text-green-600" },
    { label: "Failed", value: "1", icon: XCircle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">{stat.label}</p>
                  <p className="text-slate-900 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>File Name</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.operation}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.startedAt}</TableCell>
                    <TableCell className="text-sm">{item.estimatedTime}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {item.status === "processing" ? (
                          <Button variant="ghost" size="sm">
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : null}
                        {item.status === "queued" ? (
                          <Button variant="ghost" size="sm">
                            <Play className="w-4 h-4" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
