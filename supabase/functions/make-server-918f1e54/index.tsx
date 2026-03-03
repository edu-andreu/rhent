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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  throw new Error("Server configuration error: Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

// Health check
app.get("/make-server-918f1e54/health", (c) => {
  return c.json({ status: "ok" });
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
