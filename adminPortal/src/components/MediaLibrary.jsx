import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Upload, MoreVertical, Play, Download, Trash2, Eye } from "lucide-react";

export function MediaLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);

  const mediaFiles = [
    {
      id: 1,
      name: "summer_vacation_4k.mp4",
      format: "MP4",
      resolution: "3840x2160",
      size: "2.4 GB",
      duration: "12:34",
      status: "ready",
      uploadedAt: "2025-10-28",
      views: "1.2K",
    },
    {
      id: 2,
      name: "product_demo_hd.mov",
      format: "MOV",
      resolution: "1920x1080",
      size: "1.8 GB",
      duration: "8:45",
      status: "processing",
      uploadedAt: "2025-10-30",
      views: "847",
    },
    {
      id: 3,
      name: "interview_session.mp4",
      format: "MP4",
      resolution: "1920x1080",
      size: "987 MB",
      duration: "15:22",
      status: "ready",
      uploadedAt: "2025-10-29",
      views: "2.3K",
    },
    {
      id: 4,
      name: "conference_keynote.mp4",
      format: "MP4",
      resolution: "1920x1080",
      size: "3.2 GB",
      duration: "45:18",
      status: "ready",
      uploadedAt: "2025-10-27",
      views: "5.6K",
    },
    {
      id: 5,
      name: "tutorial_basics.mov",
      format: "MOV",
      resolution: "1280x720",
      size: "654 MB",
      duration: "6:12",
      status: "ready",
      uploadedAt: "2025-10-26",
      views: "3.4K",
    },
    {
      id: 6,
      name: "webinar_recording.mp4",
      format: "MP4",
      resolution: "1920x1080",
      size: "2.1 GB",
      duration: "32:45",
      status: "ready",
      uploadedAt: "2025-10-25",
      views: "1.8K",
    },
  ];

  const filteredMedia = mediaFiles.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStatusBadge = (status) => {
    const variants = {
      ready: "default",
      processing: "secondary",
      failed: "destructive",
    };

    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Media Library</CardTitle>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Upload className="w-4 h-4" />
              Upload Media
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedia.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{file.format}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{file.resolution}</TableCell>
                      <TableCell className="text-sm">{file.size}</TableCell>
                      <TableCell className="text-sm">{file.duration}</TableCell>
                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                      <TableCell className="text-sm">{file.views}</TableCell>
                      <TableCell className="text-sm">{file.uploadedAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedMedia(file)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Play className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedMedia)} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>
          {selectedMedia ? (
            <div className="space-y-4">
              <div>
                <p className="text-slate-500 text-sm">File Name</p>
                <p className="text-slate-900">{selectedMedia.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-sm">Format</p>
                  <p className="text-slate-900">{selectedMedia.format}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Resolution</p>
                  <p className="text-slate-900">{selectedMedia.resolution}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Size</p>
                  <p className="text-slate-900">{selectedMedia.size}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Duration</p>
                  <p className="text-slate-900">{selectedMedia.duration}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Views</p>
                  <p className="text-slate-900">{selectedMedia.views}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Status</p>
                  {getStatusBadge(selectedMedia.status)}
                </div>
              </div>
              <div>
                <p className="text-slate-500 text-sm">Uploaded At</p>
                <p className="text-slate-900">{selectedMedia.uploadedAt}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
