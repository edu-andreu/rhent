import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";
import * as kv from "../kv_store.ts";
import { roundToNearestThousand } from "../priceUtils.ts";

export function registerConfigurationRoutes(app: Hono, supabase: SupabaseClient) {

// GET all payment methods
app.get("/make-server-918f1e54/payment-methods", async (c) => {
  try {
    const { data, error } = await supabase
      .from("payments_methods")
      .select("id, payment_method, status, created_at, updated_at, payment_user_enabled, payment_type")
      .eq("status", "On")
      .order("payment_method", { ascending: true });

    if (error) {
      console.log("Error fetching payment methods:", error);
      return c.json({ error: `Failed to fetch payment methods: ${error.message}` }, 500);
    }

    return c.json({ paymentMethods: data });
  } catch (error) {
    console.log("Unexpected error fetching payment methods:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// POST new payment method
app.post("/make-server-918f1e54/payment-methods", async (c) => {
  try {
    const body = await c.req.json();
    const { value } = body;

    if (!value || typeof value !== "string" || value.trim() === "") {
      return c.json({ error: "Value is required and must be a non-empty string" }, 400);
    }

    const { data, error } = await supabase
      .from("payments_methods")
      .insert([
        {
          payment_method_raw: value.trim(),
          status: "On",
          created_by: getCurrentUserDisplay(c),
        },
      ])
      .select("id, payment_method, status, created_at")
      .single();

    if (error) {
      console.log("Error creating payment method:", error);
      return c.json({ error: `Failed to create payment method: ${error.message}` }, 500);
    }

    return c.json({ paymentMethod: data }, 201);
  } catch (error) {
    console.log("Unexpected error creating payment method:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// PUT update payment method
app.put("/make-server-918f1e54/payment-methods/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { value } = body;

    if (!value || typeof value !== "string" || value.trim() === "") {
      return c.json({ error: "Value is required and must be a non-empty string" }, 400);
    }

    const { data, error } = await supabase
      .from("payments_methods")
      .update({
        payment_method_raw: value.trim(),
        updated_by: getCurrentUserDisplay(c),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, payment_method, status, created_at, updated_at")
      .single();

    if (error) {
      console.log("Error updating payment method:", error);
      return c.json({ error: `Failed to update payment method: ${error.message}` }, 500);
    }

    return c.json({ paymentMethod: data });
  } catch (error) {
    console.log("Unexpected error updating payment method:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});

// DELETE payment method
app.delete("/make-server-918f1e54/payment-methods/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const { error } = await supabase
      .from("payments_methods")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("Error deleting payment method:", error);
      return c.json({ error: `Failed to delete payment method: ${error.message}` }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Unexpected error deleting payment method:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
app.post("/make-server-918f1e54/update-inventory-prices", async (c) => {
  try {
    const { categoryIds, percentage } = await c.req.json();

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return c.json({ error: "Category IDs are required" }, 400);
    }

    if (percentage === undefined || percentage === null) {
      return c.json({ error: "Percentage is required" }, 400);
    }

    // Fetch all inventory items in the specified categories (both rental and sale items)
    const { data: items, error: fetchError } = await supabase
      .from("inventory_items")
      .select("id, curr_price, is_for_sale, sale_price")
      .in("category_id", categoryIds)
      .eq("status", "On");

    if (fetchError) {
      console.log("Error fetching inventory items for price update:", fetchError);
      return c.json({ error: `Failed to fetch inventory items: ${fetchError.message}` }, 500);
    }

    if (!items || items.length === 0) {
      return c.json({ updatedCount: 0 });
    }

    // Filter to items that have a valid price (rental items use curr_price, sale items use sale_price)
    const pricedItems = items.filter((item) => {
      if (item.is_for_sale) return item.sale_price !== null && item.sale_price !== undefined;
      return item.curr_price !== null && item.curr_price !== undefined;
    });

    if (pricedItems.length === 0) {
      return c.json({ updatedCount: 0 });
    }

    // Update each item's price based on whether it's a sale or rental item
    const updatePromises = pricedItems.map(async (item) => {
      if (item.is_for_sale) {
        // Sale item: update sale_price
        const currentPrice = parseFloat(item.sale_price);
        const calculatedPrice = currentPrice * (1 + percentage);
        const newPrice = roundToNearestThousand(calculatedPrice);

        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            sale_price: newPrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updateError) {
          console.log(`Error updating sale item ${item.id}:`, updateError);
          return { success: false, id: item.id };
        }

        return { success: true, id: item.id };
      } else {
        // Rental item: update curr_price
        const currentPrice = parseFloat(item.curr_price);
        const calculatedPrice = currentPrice * (1 + percentage);
        // Round to nearest thousand using shared utility
        const newPrice = roundToNearestThousand(calculatedPrice);

        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({ 
            curr_price: newPrice,
            prev_price: currentPrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updateError) {
          console.log(`Error updating item ${item.id}:`, updateError);
          return { success: false, id: item.id };
        }

        return { success: true, id: item.id };
      }
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r.success).length;

    return c.json({ 
      updatedCount: successCount,
      totalProcessed: items.length,
    });
  } catch (error) {
    console.log("Unexpected error updating inventory prices:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// GET category price statistics
app.get("/make-server-918f1e54/category-price-stats", async (c) => {
  try {
    // Fetch categories with aggregated price stats from inventory_items
    const { data, error } = await supabase.rpc("get_category_price_stats");

    if (error) {
      console.log("Error fetching category price stats via RPC:", error);
      
      // Fallback: Use manual query if RPC function doesn't exist
      const { data: categories, error: catError } = await supabase
        .from("category")
        .select("id, category")
        .eq("status", "On")
        .order("category", { ascending: true });

      if (catError) {
        console.log("Error fetching categories:", catError);
        return c.json({ error: `Failed to fetch categories: ${catError.message}` }, 500);
      }

      // For each category, fetch price statistics (both rental and sale items)
      const statsPromises = categories.map(async (cat) => {
        const { data: items, error: itemsError } = await supabase
          .from("inventory_items")
          .select("curr_price, is_for_sale, sale_price")
          .eq("category_id", cat.id)
          .eq("status", "On");

        if (itemsError) {
          console.log(`Error fetching items for category ${cat.id}:`, itemsError);
          return {
            id: cat.id,
            category: cat.category,
            min_price: null,
            max_price: null,
            avg_price: null,
          };
        }

        // Use sale_price for sale items, curr_price for rental items
        const prices = items
          .map((item) => {
            if (item.is_for_sale) return item.sale_price !== null ? parseFloat(item.sale_price) : null;
            return item.curr_price !== null ? parseFloat(item.curr_price) : null;
          })
          .filter((p): p is number => p !== null && !isNaN(p));
        
        if (prices.length === 0) {
          return {
            id: cat.id,
            category: cat.category,
            min_price: null,
            max_price: null,
            avg_price: null,
          };
        }

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        return {
          id: cat.id,
          category: cat.category,
          min_price: minPrice,
          max_price: maxPrice,
          avg_price: avgPrice,
        };
      });

      const stats = await Promise.all(statsPromises);
      return c.json({ categoryStats: stats });
    }

    return c.json({ categoryStats: data });
  } catch (error) {
    console.log("Unexpected error fetching category price stats:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// GET configuration settings from KV store
app.get("/make-server-918f1e54/get-configuration", async (c) => {
  try {
    // Load all configuration keys individually to ensure order
    // kv.mget does not guarantee order of returned values
    const configKeys = [
      "config_rental_days",
      "config_reservation_down_payment",
      "config_rent_down_payment",
      "config_extra_days_price",
      "config_late_days_price",
      "config_cancelation_fee",
      "config_return_location",
      "config_storeAssistant_wageByHour",
      "config_reserve_block_prev_days",
      "config_reserve_block_next_days",
    ];

    const values = await Promise.all(configKeys.map(key => kv.get(key)));
    
    // Backwards compatibility: check for old key if new one doesn't exist
    let rentalDaysValue = values[0];
    if (!rentalDaysValue) {
      const oldValue = await kv.get("config_rental_working_days");
      if (oldValue) {
        rentalDaysValue = oldValue;
        // Migrate the old key to the new key
        await kv.set("config_rental_days", oldValue);
        console.log("Migrated config_rental_working_days to config_rental_days:", oldValue);
      }
    }
    
    // Map KV values to config object with defaults
    let reservationDp = values[1] || "25";
    let rentDp = values[2] || "50";

    // Safety: auto-correct if values are swapped (reservation must be < rent)
    const resParsed = parseFloat(reservationDp as string);
    const rentParsed = parseFloat(rentDp as string);
    console.log(`📖 get-configuration: Read from KV - rent=${rentDp}, reservation=${reservationDp}`);
    if (!isNaN(resParsed) && !isNaN(rentParsed) && resParsed > rentParsed) {
      console.log(`⚠️ get-configuration: DETECTED SWAPPED down payment config (rent=${rentDp}%, res=${reservationDp}%). Auto-swapping...`);
      const temp = reservationDp;
      reservationDp = rentDp;
      rentDp = temp;
      console.log(`🔄 get-configuration: After swap - rent=${rentDp}%, res=${reservationDp}%`);
      // Also fix in KV for future requests
      await kv.mset(
        ["config_rent_down_payment", "config_reservation_down_payment"],
        [String(rentDp), String(reservationDp)]
      );
      console.log(`✅ get-configuration: Swapped values saved back to KV`);
    } else {
      console.log(`✅ get-configuration: Down payment config is correct (rent=${rentDp}%, res=${reservationDp}%)`);
    }

    // Safety: auto-correct if late_days_price (should be number) and return_location (should be UUID/String) are swapped
    let lateDaysPrice = values[4] || "75";
    let returnLocation = values[6] || "";

    // Check if late_days_price looks like a UUID (contains dashes) and return_location looks like a number
    const isLatePriceUUID = typeof lateDaysPrice === 'string' && lateDaysPrice.includes('-');
    const isReturnLocNumber = typeof returnLocation === 'string' && !returnLocation.includes('-') && !isNaN(parseFloat(returnLocation));

    if (isLatePriceUUID && isReturnLocNumber) {
      console.log(`get-configuration: detected swapped late_days_price/return_loc (late=${lateDaysPrice}, return=${returnLocation}). Auto-swapping.`);
      const temp = lateDaysPrice;
      lateDaysPrice = returnLocation;
      returnLocation = temp;
      
      // Also fix in KV for future requests
      await kv.mset(
        ["config_late_days_price", "config_return_location"],
        [String(lateDaysPrice), String(returnLocation)]
      );
    }

    const config = {
      rentalDays: rentalDaysValue || "2",
      reservationDownPayment: reservationDp,
      rentDownPayment: rentDp,
      extraDaysPrice: values[3] || "75",
      lateDaysPrice: lateDaysPrice,
      cancelationFee: values[5] || "20",
      returnLocation: returnLocation,
      storeAssistantWageByHour: values[7] || "5000",
      reserveBlockPrevDays: values[8] || "4",
      reserveBlockNextDays: values[9] || "1",
    };

    return c.json({ config });
  } catch (error) {
    console.log("Error loading configuration:", error);
    return c.json({ error: `Failed to load configuration: ${error.message}` }, 500);
  }
});
// POST repair corrupted inventory items (one-time fix for items with nulled FK fields)
app.post("/make-server-918f1e54/repair-items", async (c) => {
  try {
    // Find items where critical fields are NULL (corrupted by the old PUT bug)
    const { data: brokenItems, error: fetchError } = await supabase
      .from("inventory_items")
      .select("id, sku, name_id, category_id, subcategory_id, brand_id, size_id, curr_price")
      .is("name_id", null)
      .not("sku", "is", null);

    if (fetchError) {
      console.log("Error finding corrupted items:", fetchError);
      return c.json({ error: `Failed to scan for corrupted items: ${fetchError.message}` }, 500);
    }

    if (!brokenItems || brokenItems.length === 0) {
      return c.json({ message: "No corrupted items found.", repaired: 0 });
    }

    console.log(`Found ${brokenItems.length} corrupted item(s):`, brokenItems.map((i: any) => i.sku));

    let repairedCount = 0;
    const results: any[] = [];

    for (const broken of brokenItems) {
      const sku = (broken as any).sku as string;
      // Strategy: find a sibling item with the same SKU prefix (everything up to the last dash-number segment)
      const lastDash = sku.lastIndexOf("-");
      const prefix = lastDash > 0 ? sku.substring(0, lastDash) : sku;

      // Look for a sibling item that has the same prefix AND has name_id set
      const { data: siblings } = await supabase
        .from("inventory_items")
        .select("id, sku, name_id, category_id, subcategory_id, brand_id, size_id, curr_price")
        .like("sku", `${prefix}%`)
        .not("name_id", "is", null)
        .limit(1);

      if (siblings && siblings.length > 0) {
        const donor = siblings[0] as any;
        console.log(`Repairing ${sku} using sibling ${donor.sku}`);

        const repairFields: Record<string, any> = {};
        if (!(broken as any).name_id && donor.name_id) repairFields.name_id = donor.name_id;
        if (!(broken as any).category_id && donor.category_id) repairFields.category_id = donor.category_id;
        if (!(broken as any).subcategory_id && donor.subcategory_id) repairFields.subcategory_id = donor.subcategory_id;
        if (!(broken as any).brand_id && donor.brand_id) repairFields.brand_id = donor.brand_id;
        if (!(broken as any).size_id && donor.size_id) repairFields.size_id = donor.size_id;
        if ((!(broken as any).curr_price || parseFloat((broken as any).curr_price) === 0) && donor.curr_price) {
          repairFields.curr_price = donor.curr_price;
        }

        if (Object.keys(repairFields).length > 0) {
          const { error: repairError } = await supabase
            .from("inventory_items")
            .update(repairFields)
            .eq("id", (broken as any).id);

          if (repairError) {
            console.log(`Failed to repair ${sku}:`, repairError);
            results.push({ sku, status: "failed", error: repairError.message });
          } else {
            repairedCount++;
            results.push({ sku, status: "repaired", fieldsRestored: Object.keys(repairFields), donorSku: donor.sku });
          }
        } else {
          results.push({ sku, status: "no_fields_to_repair" });
        }
      } else {
        console.log(`No sibling found for ${sku} with prefix ${prefix}`);
        results.push({ sku, status: "no_sibling_found", prefix });
      }
    }

    return c.json({ message: `Repair complete. ${repairedCount}/${brokenItems.length} items repaired.`, repaired: repairedCount, results });
  } catch (error) {
    console.log("Unexpected error during repair:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// GET catalog config (lightweight endpoint for "Move to Showroom" shortcut)
app.get("/make-server-918f1e54/catalog-config", async (c) => {
  try {
    // Fetch the default return location from config
    const returnLocationValue = await kv.get("config_return_location");
    let defaultReturnLocationId: string | null = null;

    if (returnLocationValue) {
      const raw = returnLocationValue as string;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(raw)) {
        defaultReturnLocationId = raw;
      } else {
        // It's a name, look up the UUID
        const { data: loc } = await supabase
          .from("location")
          .select("id")
          .ilike("location", raw)
          .single();
        if (loc) {
          defaultReturnLocationId = (loc as any).id;
        }
      }
    }

    // Fetch the "Showroom" location ID
    let showroomLocationId: string | null = null;
    const { data: showroomLoc } = await supabase
      .from("location")
      .select("id")
      .ilike("location", "Showroom")
      .single();
    if (showroomLoc) {
      showroomLocationId = (showroomLoc as any).id;
    }

    return c.json({
      defaultReturnLocationId,
      showroomLocationId,
    });
  } catch (error) {
    console.log("Error loading catalog config:", error);
    return c.json({ error: `Failed to load catalog config: ${error.message}` }, 500);
  }
});
// GET rental days config (lightweight endpoint for rental dialog)
app.get("/make-server-918f1e54/config/rental-days", async (c) => {
  try {
    let value = await kv.get("config_rental_days");
    
    // Backwards compatibility: check old key if new one doesn't exist
    if (!value) {
      const oldValue = await kv.get("config_rental_working_days");
      if (oldValue) {
        value = oldValue;
        // Migrate the old key to the new key
        await kv.set("config_rental_days", oldValue);
        console.log("Migrated config_rental_working_days to config_rental_days:", oldValue);
      }
    }
    
    const rentalDays = value || "3"; // Default to 3 if not set
    return c.json({ rentalDays });
  } catch (error: any) {
    console.log("Error fetching rental days config:", error);
    return c.json({ error: `Failed to fetch rental days: ${error?.message || String(error)}` }, 500);
  }
});
// GET holidays (proxy to external API to avoid CORS issues)
app.get("/make-server-918f1e54/holidays", async (c) => {
  try {
    const response = await fetch(
      'https://www.i-pyxis.com/api/holidays?token=30d7d6c2eaafe598c553aa6b44f26c07'
    );

    if (!response.ok) {
      throw new Error(`Holiday API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // API returns array of objects with "Fecha" field in dd/mm/yyyy format
    // Example: [{"Fecha":"25/05/2020"}, {"Fecha":"15/06/2020"}, ...]
    let holidays = [];
    
    if (Array.isArray(data)) {
      // Convert from dd/mm/yyyy format to ISO format (yyyy-mm-dd)
      holidays = data.map((item: any) => {
        const fecha = item.Fecha || item.fecha;
        if (!fecha) return null;
        
        // Parse dd/mm/yyyy
        const parts = fecha.split('/');
        if (parts.length !== 3) return null;
        
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        
        // Convert to ISO format (yyyy-mm-dd)
        const isoDate = `${year}-${month}-${day}`;
        
        return {
          date: isoDate,
          name: `Holiday ${fecha}` // Generic name since API doesn't provide it
        };
      }).filter(h => h !== null);
    }

    return c.json({ holidays });
  } catch (error: any) {
    console.log("Error fetching holidays from external API:", error);
    return c.json({ error: `Failed to fetch holidays: ${error?.message || String(error)}` }, 500);
  }
});
// POST save configuration settings to KV store
app.post("/make-server-918f1e54/save-configuration", async (c) => {
  try {
    const { config } = await c.req.json();

    if (!config) {
      return c.json({ error: "Configuration data is required" }, 400);
    }

    console.log("💾 Saving configuration:", JSON.stringify(config, null, 2));

    // Save each configuration value to KV store
    // mset expects two arrays: keys[] and values[]
    const keys = [
      "config_rental_days",
      "config_reservation_down_payment",
      "config_rent_down_payment",
      "config_extra_days_price",
      "config_late_days_price",
      "config_cancelation_fee",
      "config_return_location",
      "config_storeAssistant_wageByHour",
      "config_reserve_block_prev_days",
      "config_reserve_block_next_days",
    ];
    
    const values = [
      config.rentalDays,
      config.reservationDownPayment,
      config.rentDownPayment,
      config.extraDaysPrice,
      config.lateDaysPrice,
      config.cancelationFee,
      config.returnLocation,
      config.storeAssistantWageByHour,
      config.reserveBlockPrevDays,
      config.reserveBlockNextDays,
    ];

    console.log("💾 Saving to KV - Keys:", keys);
    console.log("💾 Saving to KV - Values:", values);

    await kv.mset(keys, values);
    
    console.log("✅ Configuration saved successfully to KV store");

    return c.json({ success: true });
  } catch (error) {
    console.log("Error saving configuration:", error);
    return c.json({ error: `Failed to save configuration: ${error.message}` }, 500);
  }
});
}
