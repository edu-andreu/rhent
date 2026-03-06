import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";

function isAdminOrOwner(role: string): boolean {
  return role === "admin" || role === "owner";
}

export function registerUsersRoutes(app: Hono, supabase: SupabaseClient) {

// GET current user's profile (includes permissions for their role)
app.get("/make-server-918f1e54/users/me", async (c) => {
  try {
    const appUser = c.get("appUser");
    if (!appUser) {
      return c.json({ error: "User profile not found" }, 404);
    }
    const role = appUser.role as string;
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role", role);
    const permissions = (perms || []).map((p) => p.permission_key);
    return c.json({ ...appUser, permissions });
  } catch (error: any) {
    console.log("Error fetching current user:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// GET all users (admin or owner only)
app.get("/make-server-918f1e54/users", async (c) => {
  try {
    const role = c.get("role") as string;
    if (!isAdminOrOwner(role)) {
      return c.json({ error: "Admin or Owner access required" }, 403);
    }

    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.log("Error fetching users:", error);
      return c.json({ error: `Failed to fetch users: ${error.message}` }, 500);
    }

    return c.json({ users: data });
  } catch (error: any) {
    console.log("Unexpected error fetching users:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// GET employees list (for payroll dropdown; any authenticated user)
app.get("/make-server-918f1e54/users/employees", async (c) => {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, full_name, email")
      .eq("role", "employee")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.log("Error fetching employees:", error);
      return c.json({ error: `Failed to fetch employees: ${error.message}` }, 500);
    }

    return c.json({ employees: data || [] });
  } catch (error: any) {
    console.log("Unexpected error fetching employees:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// GET role permissions (admin or owner only)
app.get("/make-server-918f1e54/role-permissions", async (c) => {
  try {
    const role = c.get("role") as string;
    if (!isAdminOrOwner(role)) {
      return c.json({ error: "Admin or Owner access required" }, 403);
    }

    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permission_key")
      .in("role", ["owner", "admin", "employee"]);

    if (error) {
      console.log("Error fetching role permissions:", error);
      return c.json({ error: `Failed to fetch role permissions: ${error.message}` }, 500);
    }

    const roles: Record<string, string[]> = { owner: [], admin: [], employee: [] };
    for (const row of data || []) {
      if (!roles[row.role]) roles[row.role] = [];
      roles[row.role].push(row.permission_key);
    }
    return c.json({ roles });
  } catch (error: any) {
    console.log("Unexpected error fetching role permissions:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// PUT role permissions (admin or owner only)
app.put("/make-server-918f1e54/role-permissions", async (c) => {
  try {
    const role = c.get("role") as string;
    if (!isAdminOrOwner(role)) {
      return c.json({ error: "Admin or Owner access required" }, 403);
    }

    const body = await c.req.json();
    const { role: targetRole, permissions } = body as { role: string; permissions: string[] };

    if (!targetRole || !["owner", "admin", "employee"].includes(targetRole)) {
      return c.json({ error: "Invalid role" }, 400);
    }
    if (!Array.isArray(permissions)) {
      return c.json({ error: "permissions must be an array" }, 400);
    }

    await supabase.from("role_permissions").delete().eq("role", targetRole);

    if (permissions.length > 0) {
      const rows = permissions.map((permission_key: string) => ({ role: targetRole, permission_key }));
      const { error: insertError } = await supabase.from("role_permissions").insert(rows);
      if (insertError) {
        console.log("Error updating role permissions:", insertError);
        return c.json({ error: `Failed to update role permissions: ${insertError.message}` }, 500);
      }
    }

    return c.json({ ok: true });
  } catch (error: any) {
    console.log("Unexpected error updating role permissions:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// PUT update user role (admin or owner only)
app.put("/make-server-918f1e54/users/:id/role", async (c) => {
  try {
    const role = c.get("role") as string;
    if (!isAdminOrOwner(role)) {
      return c.json({ error: "Admin or Owner access required" }, 403);
    }

    const userId = c.req.param("id");
    const currentUser = c.get("appUser");
    const body = await c.req.json();
    const newRole = body.role;

    if (!newRole || !["admin", "employee", "owner"].includes(newRole)) {
      return c.json({ error: "Invalid role. Must be 'admin', 'employee', or 'owner'" }, 400);
    }

    // Prevent self-demotion: cannot change own role to employee
    if (userId === currentUser.id && newRole === "employee") {
      return c.json({ error: "Cannot change your own role to employee" }, 400);
    }

    const { data, error } = await supabase
      .from("app_users")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.log("Error updating user role:", error);
      return c.json({ error: `Failed to update role: ${error.message}` }, 500);
    }

    return c.json(data);
  } catch (error: any) {
    console.log("Unexpected error updating user role:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// PUT update user active status (admin or owner only)
app.put("/make-server-918f1e54/users/:id/status", async (c) => {
  try {
    const role = c.get("role") as string;
    if (!isAdminOrOwner(role)) {
      return c.json({ error: "Admin or Owner access required" }, 403);
    }

    const userId = c.req.param("id");
    const currentUser = c.get("appUser");
    const body = await c.req.json();
    const isActive = body.is_active;

    if (typeof isActive !== "boolean") {
      return c.json({ error: "is_active must be a boolean" }, 400);
    }

    if (userId === currentUser.id && !isActive) {
      return c.json({ error: "Cannot deactivate your own account" }, 400);
    }

    const { data, error } = await supabase
      .from("app_users")
      .update({ is_active: isActive })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.log("Error updating user status:", error);
      return c.json({ error: `Failed to update status: ${error.message}` }, 500);
    }

    return c.json(data);
  } catch (error: any) {
    console.log("Unexpected error updating user status:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

} // end registerUsersRoutes
