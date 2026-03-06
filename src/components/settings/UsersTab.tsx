import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import { getFunction, putFunction } from "../../shared/api/client";
import { handleApiError } from "../../shared/utils/errorHandler";
import { useAuth } from "../../providers/AuthProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Label } from "../ui/label";
import { ChevronDown } from "lucide-react";

const TAB_OPTIONS: { id: string; permission: string; label: string }[] = [
  { id: "dashboard", permission: "tab:dashboard", label: "Dashboard" },
  { id: "catalog", permission: "tab:catalog", label: "Catalog" },
  { id: "rentals", permission: "tab:rentals", label: "Rentals" },
  { id: "reservations", permission: "tab:reservations", label: "Reservations" },
  { id: "customers", permission: "tab:customers", label: "Customers" },
  { id: "cash", permission: "tab:cash", label: "Cash Drawer" },
  { id: "settings", permission: "tab:settings", label: "Settings" },
];

const ACTION_OPTIONS: { key: string; label: string }[] = [
  { key: "action:move_money", label: "Move Money" },
  { key: "action:view_cash_drawer_history", label: "View cash drawer history" },
];

interface AppUserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "employee" | "owner";
  is_active: boolean;
  created_at: string;
}

export function UsersTab() {
  const { appUser, role } = useAuth();
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({ owner: [], admin: [], employee: [] });
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSaving, setPermsSaving] = useState<string | null>(null);
  const canManagePermissions = role === "admin" || role === "owner";

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFunction<{ users: AppUserRow[] }>("users");
      setUsers(data.users);
    } catch (error) {
      handleApiError(error, "users");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRolePermissions = useCallback(async () => {
    if (!canManagePermissions) return;
    try {
      setPermsLoading(true);
      const data = await getFunction<{ roles: Record<string, string[]> }>("role-permissions");
      setRolePermissions(data.roles || { owner: [], admin: [], employee: [] });
    } catch (error) {
      handleApiError(error, "role permissions");
    } finally {
      setPermsLoading(false);
    }
  }, [canManagePermissions]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadRolePermissions();
  }, [loadRolePermissions]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await putFunction(`users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole as "admin" | "employee" | "owner" } : u
        )
      );
      toast.success("Role updated successfully");
    } catch (error) {
      handleApiError(error, "user role", "Failed to update role");
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      await putFunction(`users/${userId}/status`, { is_active: isActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
      );
      toast.success(isActive ? "User activated" : "User deactivated");
    } catch (error) {
      handleApiError(error, "user status", "Failed to update status");
    }
  };

  const updateRolePerms = (r: string, permission: string, enabled: boolean) => {
    setRolePermissions((prev) => {
      const list = prev[r] || [];
      if (enabled) return { ...prev, [r]: list.includes(permission) ? list : [...list, permission] };
      return { ...prev, [r]: list.filter((p) => p !== permission) };
    });
  };

  const saveRolePermissions = async (targetRole: string) => {
    try {
      setPermsSaving(targetRole);
      await putFunction("role-permissions", {
        role: targetRole,
        permissions: rolePermissions[targetRole] || [],
      });
      toast.success(`Permissions for ${targetRole} updated`);
    } catch (error) {
      handleApiError(error, "role permissions", "Failed to update permissions");
    } finally {
      setPermsSaving(null);
    }
  };

  const getInitials = (user: AppUserRow) => {
    if (user.full_name) {
      return user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage user access and roles. Users sign in with Google and appear here automatically.
          </p>
        </div>
        <Badge variant="secondary">{users.length} user{users.length !== 1 ? "s" : ""}</Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[140px]">Role</TableHead>
              <TableHead className="w-[100px] text-center">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === appUser?.id;
              return (
                <TableRow key={user.id} className={!user.is_active ? "opacity-50" : undefined}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? user.email} referrerPolicy="no-referrer" />
                      <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.full_name ?? "-"}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={isSelf}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={(checked) => handleStatusChange(user.id, checked)}
                      disabled={isSelf}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {canManagePermissions && (
        <div className="mt-8 space-y-4">
          <div>
            <h3 className="text-lg font-medium">Role management</h3>
            <p className="text-sm text-muted-foreground">
              Configure which tabs and actions each role can access. Only admin and owner can change these.
            </p>
          </div>
          {permsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              Loading permissions...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(["owner", "admin", "employee"] as const).map((r) => (
                <Card key={r}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base capitalize">{r}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Visible tabs</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between font-normal">
                            {(() => {
                              const perms = rolePermissions[r] || [];
                              const tabPerms = perms.filter((p) => p.startsWith("tab:"));
                              return tabPerms.length ? `${tabPerms.length} tab(s) selected` : "Select tabs...";
                            })()}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {TAB_OPTIONS.map((tab) => (
                              <label
                                key={tab.permission}
                                className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                              >
                                <Checkbox
                                  checked={(rolePermissions[r] || []).includes(tab.permission)}
                                  onCheckedChange={(checked) =>
                                    updateRolePerms(r, tab.permission, !!checked)
                                  }
                                />
                                <span className="text-sm">{tab.label}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Actions</Label>
                      <div className="space-y-2">
                        {ACTION_OPTIONS.map((action) => (
                          <div
                            key={action.key}
                            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                          >
                            <span className="text-sm">{action.label}</span>
                            <Switch
                              checked={(rolePermissions[r] || []).includes(action.key)}
                              onCheckedChange={(checked) =>
                                updateRolePerms(r, action.key, checked)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveRolePermissions(r)}
                      disabled={permsSaving === r}
                    >
                      {permsSaving === r ? "Saving..." : "Save"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
