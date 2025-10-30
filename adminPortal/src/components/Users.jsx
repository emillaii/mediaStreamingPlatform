import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Search, UserPlus, MoreVertical, Loader2, Shield, Ban, Mail } from "lucide-react";
import { fetchUsers, createUser } from "../api/client";

const CREATE_USER_INITIAL_STATE = {
  email: "",
  password: "",
  displayName: "",
  role: "member"
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const getRoleBadgeClass = (role) => {
  const colors = {
    admin: "bg-purple-100 text-purple-700 border-purple-200",
    member: "bg-blue-100 text-blue-700 border-blue-200"
  };

  return colors[role] ?? "bg-slate-100 text-slate-700 border-slate-200";
};

export function Users({ admin }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_USER_INITIAL_STATE);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchUsers();
        setUsers(response.users ?? []);
      } catch (loadError) {
        setError(loadError.message ?? "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await createUser(createForm);
      setUsers((prev) => [response.user, ...prev]);
      setCreateForm(CREATE_USER_INITIAL_STATE);
      setShowCreateForm(false);
    } catch (createError) {
      setError(createError.message ?? "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const name = user.displayName ?? "";
      return (
        name.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage platform members and invite new users.</CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <UserPlus className="w-4 h-4" />
              {showCreateForm ? "Cancel" : "Add User"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm ? (
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  name="email"
                  type="email"
                  value={createForm.email}
                  onChange={handleCreateChange}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-displayName">Display Name</Label>
                <Input
                  id="create-displayName"
                  name="displayName"
                  value={createForm.displayName}
                  onChange={handleCreateChange}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  name="password"
                  type="password"
                  value={createForm.password}
                  onChange={handleCreateChange}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <select
                  id="create-role"
                  name="role"
                  value={createForm.role}
                  onChange={handleCreateChange}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-70"
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-sm text-slate-500">
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading users...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-sm text-slate-500">
                        No users found. Try adjusting your search or add a new user.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {getInitials(user.displayName || user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm text-slate-900">{user.displayName || "—"}</p>
                              <p className="text-xs text-slate-500">ID: {user.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                            {user.role ?? "member"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{formatDate(user.createdAt)}</TableCell>
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
                                Contact
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="w-4 h-4 mr-2" />
                                Update Role
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
