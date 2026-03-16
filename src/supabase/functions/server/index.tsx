import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.ts";
import { registerReservationConversionRoutes } from "./reservationConversion.tsx";
import { getCurrentOpenDrawer, validateDateNotWeekendOrHoliday } from "./helpers/validation.ts";
import { getGMT3DateString } from "./helpers/calculations.ts";

import { registerListsRoutes } from "./routes/lists.ts";
import { registerCustomersRoutes } from "./routes/customers.ts";
import { registerInventoryRoutes } from "./routes/inventory.ts";
import { registerRentalsRoutes } from "./routes/rentals.ts";
import { registerReservationsRoutes } from "./routes/reservations.ts";
import { registerCheckoutRoutes } from "./routes/checkout.ts";
import { registerCashDrawerRoutes } from "./routes/cashDrawer.ts";
import { registerConfigurationRoutes } from "./routes/configuration.ts";
import { registerDashboardRoutes } from "./routes/dashboard.ts";
import { registerUsersRoutes } from "./routes/users.ts";

const app = new Hono();

// Apply middleware
app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  throw new Error("Server configuration error: Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Anon-key client used only for verifying user JWTs (auth.getUser)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey);
console.log("Supabase client initialized successfully");

// One-time startup migration: detect and fix swapped down payment config values
(async () => {
  try {
    const [rentRaw, resRaw] = await Promise.all([
      kv.get("config_rent_down_payment"),
      kv.get("config_reservation_down_payment")
    ]);
    const rentVal = parseFloat(rentRaw as string);
    const resVal = parseFloat(resRaw as string);
    if (!isNaN(rentVal) && !isNaN(resVal) && resVal > rentVal) {
      console.log(`Detected swapped down payment config: rent=${rentVal}%, reservation=${resVal}%. Auto-correcting...`);
      await kv.mset(
        ["config_rent_down_payment", "config_reservation_down_payment"],
        [String(resVal), String(rentVal)]
      );
      console.log(`Down payment config corrected: rent=${resVal}%, reservation=${rentVal}%`);
    } else {
      console.log(`Down payment config OK: rent=${rentVal}%, reservation=${resVal}%`);
    }
  } catch (e) {
    console.log("Error during down payment config migration:", e);
  }
})();

// One-time startup migration: fix swapped late_days_price and return_location
(async () => {
  try {
    const [lateRaw, locRaw] = await Promise.all([
      kv.get("config_late_days_price"),
      kv.get("config_return_location")
    ]);
    const isLateUUID = lateRaw && typeof lateRaw === 'string' && lateRaw.includes('-');
    const isLocNum = locRaw && typeof locRaw === 'string' && !locRaw.includes('-') && !isNaN(parseFloat(locRaw));
    if (isLateUUID && isLocNum) {
      console.log(`Detected swapped late_days/return_loc config. Auto-correcting...`);
      await kv.mset(
        ["config_late_days_price", "config_return_location"],
        [String(locRaw), String(lateRaw)]
      );
      console.log("Config corrected: late_days_price and return_location swapped.");
    }
  } catch (e) {
    console.log("Error during late_days/return_loc migration:", e);
  }
})();

// Global error handler
app.onError((err, c) => {
  if (err && (err.name === "Http" || String(err).includes("broken pipe") || String(err).includes("EPIPE"))) {
    console.log("Client disconnected (broken pipe) during:", c.req.method, c.req.path);
    return c.json({ error: "Client disconnected" }, 499);
  }
  console.log("Unhandled server error:", err?.message || String(err), "Route:", c.req.method, c.req.path);
  return c.json({ error: "Internal server error: " + (err?.message || "Unknown error") }, 500);
});

// Health check (no auth required)
app.get("/make-server-918f1e54/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth middleware – verifies JWT and attaches user + role to context.
// Skips health check (matched above before this middleware runs on other routes).
app.use("/make-server-918f1e54/*", async (c, next) => {
  // Health check already handled above
  if (c.req.path.endsWith("/health")) return next();

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Look up app_users row for role + active status
  let appUser: { id: string; role: string; is_active: boolean; [k: string]: unknown } | null = null;
  let appUserError: Error | null = null;
  {
    const result = await supabase
      .from("app_users")
      .select("id, role, is_active, email, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    appUser = result.data;
    appUserError = result.error;
  }

  // If no profile (trigger may not have run), ensure one exists: first user = admin, rest = employee.
  if (appUserError || !appUser) {
    const { count } = await supabase.from("app_users").select("*", { count: "exact", head: true });
    const role = (count ?? 0) === 0 ? "admin" : "employee";
    const meta = user.user_metadata ?? {};
    const { error: insertErr } = await supabase.from("app_users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name: meta.full_name ?? meta.name ?? null,
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
        role,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (insertErr) {
      console.error("Failed to ensure app_users row:", insertErr, {
        code: (insertErr as { code?: string })?.code,
        message: (insertErr as { message?: string })?.message,
        details: (insertErr as { details?: string })?.details,
      });
      // Fallback: trigger may have just created the row; wait and refetch once.
      await new Promise((r) => setTimeout(r, 150));
      const fallback = await supabase.from("app_users").select("id, role, is_active, email, full_name, avatar_url").eq("id", user.id).single();
      if (!fallback.error && fallback.data) {
        appUser = fallback.data;
        appUserError = null;
        console.log("[auth] Using app_users row created by trigger:", user.id, "role:", fallback.data?.role);
      } else {
        return c.json({ error: "User profile not found" }, 403);
      }
    } else {
      const refetch = await supabase.from("app_users").select("id, role, is_active, email, full_name, avatar_url").eq("id", user.id).single();
      appUser = refetch.data;
      appUserError = refetch.error;
      if (!refetch.error && refetch.data) {
        console.log("[auth] Ensured app_users profile for new user:", user.id, "role:", refetch.data?.role);
      }
    }
  }

  if (appUserError || !appUser) {
    return c.json({ error: "User profile not found" }, 403);
  }

  if (!appUser.is_active) {
    return c.json({ error: "Account is deactivated" }, 403);
  }

  c.set("user", user);
  c.set("appUser", appUser);
  c.set("role", appUser.role);

  await next();
});

// Register all route modules
registerListsRoutes(app, supabase);
registerCustomersRoutes(app, supabase);
registerInventoryRoutes(app, supabase);
registerRentalsRoutes(app, supabase);
registerReservationsRoutes(app, supabase);
registerCheckoutRoutes(app, supabase, validateDateNotWeekendOrHoliday);
registerCashDrawerRoutes(app, supabase);
registerConfigurationRoutes(app, supabase);
registerDashboardRoutes(app, supabase);
registerUsersRoutes(app, supabase);

// Register reservation conversion routes (existing separate module)
registerReservationConversionRoutes(
  app,
  supabase,
  () => getCurrentOpenDrawer(supabase),
  getGMT3DateString,
  validateDateNotWeekendOrHoliday,
);

console.log("Starting Rhent server...");
Deno.serve(app.fetch);
