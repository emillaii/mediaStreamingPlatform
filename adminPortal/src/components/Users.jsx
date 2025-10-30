import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Search, UserPlus, MoreVertical, Mail, Shield, Ban } from "lucide-react";

export function Users() {
  const [searchQuery, setSearchQuery] = useState("");

  const users = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@company.com",
      role: "admin",
      status: "active",
      lastActive: "5 min ago",
      uploads: 234,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.j@company.com",
      role: "editor",
      status: "active",
      lastActive: "2 hours ago",
      uploads: 156,
    },
    {
      id: 3,
      name: "Michael Chen",
      email: "michael.c@company.com",
      role: "viewer",
      status: "active",
      lastActive: "1 day ago",
      uploads: 45,
    },
    {
      id: 4,
      name: "Emily Brown",
      email: "emily.b@company.com",
      role: "editor",
      status: "inactive",
      lastActive: "3 days ago",
      uploads: 89,
    },
    {
      id: 5,
      name: "David Wilson",
      email: "david.w@company.com",
      role: "admin",
      status: "active",
      lastActive: "1 hour ago",
      uploads: 312,
    },
  ];

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRoleBadge = (role) => {
    const colors = {
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      editor: "bg-blue-100 text-blue-700 border-blue-200",
      viewer: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return (
      <Badge variant="outline" className={colors[role]}>
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
    ) : (
      <Badge variant="outline" className="bg-slate-100 text-slate-700">
        Inactive
      </Badge>
    );
  };

  const getInitials = (name) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Uploads</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{user.lastActive}</TableCell>
                      <TableCell className="text-sm text-slate-900">{user.uploads}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="w-4 h-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend User
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
    </div>
  );
}
