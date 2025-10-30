import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export function Settings() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your portal preferences and configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="portal-name">Portal Name</Label>
                <Input id="portal-name" defaultValue="Media Processing Portal" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input id="admin-email" type="email" defaultValue="admin@mediaprocessing.com" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-delete Failed Jobs</Label>
                  <p className="text-slate-500 text-sm">Automatically remove failed jobs after 7 days</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Analytics</Label>
                  <p className="text-slate-500 text-sm">Track media performance and user engagement</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Processing Settings</CardTitle>
              <CardDescription>Configure media processing parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="max-concurrent">Max Concurrent Jobs</Label>
                <Select defaultValue="4">
                  <SelectTrigger id="max-concurrent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 jobs</SelectItem>
                    <SelectItem value="4">4 jobs</SelectItem>
                    <SelectItem value="6">6 jobs</SelectItem>
                    <SelectItem value="8">8 jobs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-format">Default Output Format</Label>
                <Select defaultValue="mp4">
                  <SelectTrigger id="default-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                    <SelectItem value="hls">HLS</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="dash">DASH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality-preset">Quality Preset</Label>
                <Select defaultValue="balanced">
                  <SelectTrigger id="quality-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast (Lower Quality)</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="high">High Quality</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-generate Thumbnails</Label>
                  <p className="text-slate-500 text-sm">Create preview thumbnails for all uploaded videos</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Hardware Acceleration</Label>
                  <p className="text-slate-500 text-sm">Use GPU for faster processing (if available)</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Storage Settings</CardTitle>
              <CardDescription>Manage storage and retention policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="retention-period">Media Retention Period</Label>
                <Select defaultValue="90">
                  <SelectTrigger id="retention-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage-location">Storage Location</Label>
                <Select defaultValue="cloud">
                  <SelectTrigger id="storage-location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="cloud">Cloud Storage</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-archive Old Media</Label>
                  <p className="text-slate-500 text-sm">Move media to archive storage after retention period</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compress Archived Files</Label>
                  <p className="text-slate-500 text-sm">Reduce storage costs by compressing archived media</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Processing Complete</Label>
                  <p className="text-slate-500 text-sm">Notify when media processing is complete</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Processing Failed</Label>
                  <p className="text-slate-500 text-sm">Notify when media processing fails</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Storage Warnings</Label>
                  <p className="text-slate-500 text-sm">Alert when storage usage exceeds threshold</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Updates</Label>
                  <p className="text-slate-500 text-sm">Receive notifications about system updates</p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notification-email">Notification Email</Label>
                <Input id="notification-email" type="email" defaultValue="admin@mediaprocessing.com" />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
