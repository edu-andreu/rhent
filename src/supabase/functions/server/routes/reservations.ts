import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";
import * as kv from "../kv_store.ts";
import { batchResolveImageUrls } from "../helpers/images.ts";

export function registerReservationsRoutes(app: Hono, supabase: SupabaseClient) {

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const getTodayGmt3String = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt3 = new Date(utc + 3600000 * -3);
    return `${gmt3.getFullYear()}-${String(gmt3.getMonth() + 1).padStart(2, "0")}-${String(
      gmt3.getDate(),
    ).padStart(2, "0")}`;
  };

// GET active reservations - rental_items with status 'reserved'
app.get("/make-server-918f1e54/reservations/active", async (c) => {
  try {
    const { data, error } = await supabase
      .from("rental_items")
      .select(`
        id,
        rental_id,
        item_id,
        start_date,
        end_date,
        unit_price,
        status,
        created_at,
        alteration_notes,
        inventory_items!inner (
          id,
          sku,
          curr_price,
          description,
          name:name_id (
            name
          ),
          size:size_id (
            size
          ),
          category:category_id (
            category,
            default_image
          ),
          subcategory:subcategory_id (
            subcategory
          ),
          brand:brand_id (
            brand
          ),
          inventory_item_colors (
            color:color_id (
              color
            )
          )
        ),
        rentals!inner (
          id,
          customer_id,
          status,
          customers (
            customer_id,
            first_name,
            last_name
          )
        )
      `)
      .eq("status", "reserved")
      .order("start_date", { ascending: true });

    if (error) {
      console.log("Error fetching active reservations:", error);
      return c.json({ error: `Failed to fetch active reservations: ${error.message}` }, 500);
    }

    // Auto-cancel overdue reservations past the grace period (1 business day)
    const OVERDUE_GRACE_BUSINESS_DAYS = 1;
    const todayStr = getTodayGmt3String();

    const autoCancelledIds = new Set<string>();
    for (const item of (data || [])) {
      if (item.start_date >= todayStr) continue;

      // Count business days between start_date (exclusive) and today (inclusive)
      const startParts = item.start_date.split('-');
      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      const todayParts = todayStr.split('-');
      const todayDate = new Date(parseInt(todayParts[0]), parseInt(todayParts[1]) - 1, parseInt(todayParts[2]));
      let businessDays = 0;
      const cursor = new Date(startDate);
      cursor.setDate(cursor.getDate() + 1);
      while (cursor <= todayDate) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) businessDays++;
        cursor.setDate(cursor.getDate() + 1);
      }

      if (businessDays <= OVERDUE_GRACE_BUSINESS_DAYS) continue;

      console.log(`⏰ Auto-cancelling overdue reservation rental_item ${item.id} (start_date=${item.start_date}, ${businessDays} business days overdue)`);

      // Cancel the rental_item
      const { error: cancelErr } = await supabase
        .from("rental_items")
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (cancelErr) {
        console.log(`Error auto-cancelling rental_item ${item.id}:`, cancelErr.message);
        continue;
      }

      // Reset inventory location to default (Showroom)
      const defaultLocationId = "2d1cd314-22b1-4616-b576-123f26299317";
      await supabase
        .from("inventory_items")
        .update({ location_id: defaultLocationId, updated_at: new Date().toISOString() })
        .eq("id", item.item_id);

      // Create audit record
      await supabase
        .from("rental_events")
        .insert({
          rental_item_id: item.id,
          event_type: "cancelled",
          event_time: new Date().toISOString(),
          actor: "system",
          notes: `Auto-cancelled: reservation was ${businessDays} business days overdue (grace period: ${OVERDUE_GRACE_BUSINESS_DAYS} day).`,
          created_by: "system-auto-cancel",
        });

      // Check if all items in the rental are now cancelled
      const { data: siblingItems } = await supabase
        .from("rental_items")
        .select("status")
        .eq("rental_id", item.rental_id);

      if (siblingItems?.every((si: any) => si.status === 'cancelled')) {
        await supabase
          .from("rentals")
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq("id", item.rental_id);
      }

      autoCancelledIds.add(item.id);
    }

    // Filter out auto-cancelled items from the response
    const activeItems = (data || []).filter((item: any) => !autoCancelledIds.has(item.id));

    const activeItemIds = activeItems.map((item: any) => item.item_id).filter(Boolean);
    const categoryDefaults = new Map(
      activeItems.map((item: any) => [item.item_id, item.inventory_items?.category?.default_image || ""])
    );
    const imageUrlMap = await batchResolveImageUrls(supabase, activeItemIds, categoryDefaults);

    const reservations = activeItems.map((item: any) => {
      const itemName = item.inventory_items?.name?.name || "Unknown";
      const size = item.inventory_items?.size?.size || "";
      const colors = item.inventory_items?.inventory_item_colors?.map((ic: any) => ic.color?.color).filter(Boolean) || [];
      const customer = item.rentals?.customers;
      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
        : "Unknown";
      const isOverdue = item.start_date < todayStr;

      return {
        id: item.id,
        dressId: item.item_id,
        dressName: itemName,
        dressImage: imageUrlMap.get(item.item_id) || "",
        dressSize: size,
        dressColors: colors,
        dressPricePerDay: parseFloat(item.inventory_items?.curr_price) || 0,
        reservationDate: item.start_date,
        status: 'pending',
        createdAt: item.created_at,
        rentalId: item.rental_id,
        customerId: item.rentals?.customer_id || "",
        startDate: item.start_date,
        endDate: item.end_date,
        customerName: customerName,
        sku: item.inventory_items?.sku || "",
        category: item.inventory_items?.category?.category || "",
        type: item.inventory_items?.subcategory?.subcategory || "",
        brand: item.inventory_items?.brand?.brand || "",
        description: item.inventory_items?.description || "",
        alteration_notes: item.alteration_notes || "",
        isOverdue,
      };
    });

    return c.json({ reservations });
  } catch (error) {
    console.log("Unexpected error fetching active reservations:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// POST - Calculate cancellation fee and credit
app.post("/make-server-918f1e54/calculate-cancellation", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Calculate cancellation request body:", JSON.stringify(body));
    
    const { rentalItemId } = body;

    if (!rentalItemId) {
      console.log("rentalItemId is missing or falsy:", rentalItemId);
      return c.json({ error: "Rental item ID is required" }, 400);
    }

    console.log("Calculating cancellation for rental_item_id:", rentalItemId, "Type:", typeof rentalItemId);

    // Fetch rental item details with unit_price
    console.log("Querying rental_items table with id:", rentalItemId);

    const { data: rentalItem, error: itemError } = await supabase
      .from("rental_items")
      .select("id, status, rental_id, unit_price, start_date")
      .eq("id", rentalItemId)
      .single();

    console.log("Query result - data:", rentalItem, "error:", itemError);

    if (itemError) {
      console.log("Error fetching rental item for cancellation calculation:", JSON.stringify(itemError));
      return c.json({ error: `Database error: ${itemError.message}` }, 500);
    }

    if (!rentalItem) {
      console.log("Rental item not found with ID:", rentalItemId);
      return c.json({ error: "Rental item not found" }, 404);
    }

    console.log("Found rental_item:", JSON.stringify(rentalItem));

    // Fetch rental details for discount_percent
    const { data: rental, error: rentalFetchError } = await supabase
      .from("rentals")
      .select("id, discount_percent")
      .eq("id", rentalItem.rental_id)
      .single();

    if (rentalFetchError || !rental) {
      console.log("Error fetching rental for cancellation calculation:", rentalFetchError);
      return c.json({ error: "Associated rental not found" }, 404);
    }

    // Fetch ALL rental items for this rental (to calculate proportions for multi-item orders)
    const { data: allItems, error: allItemsError } = await supabase
      .from("rental_items")
      .select("id, unit_price")
      .eq("rental_id", rentalItem.rental_id);

    if (allItemsError) {
      console.log("Error fetching all rental items for proportion calc:", allItemsError);
      return c.json({ error: `Failed to fetch rental items: ${allItemsError.message}` }, 500);
    }

    // Get actual total paid from payments table for this rental
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount")
      .eq("rental_id", rentalItem.rental_id);

    if (paymentsError) {
      console.log("Error fetching payments for rental:", paymentsError);
      return c.json({ error: `Failed to fetch payment data: ${paymentsError.message}` }, 500);
    }

    // Calculate total amount actually paid for this rental
    const totalPaidRental = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    console.log("Total paid from payments table:", totalPaidRental, "Payments:", payments);

    const todayStr = getTodayGmt3String();
    const isOverdue = (rentalItem as any).start_date < todayStr;

    // Get cancellation fee percentage from config (always applies on cancellation)
    const cancellationFeePercent = parseFloat((await kv.get("config_cancelation_fee")) as string || "25");
    
    // Calculate this item's order total (after discount)
    const discountPercent = parseFloat(rental.discount_percent) || 0;
    const itemOrderTotal = rentalItem.unit_price * (1 - discountPercent / 100);

    // Calculate grand total across ALL items in the rental (for proportional allocation)
    const grandTotal = (allItems || []).reduce((sum, item) => {
      return sum + item.unit_price * (1 - discountPercent / 100);
    }, 0);

    // Proportionally allocate the total paid to this specific item
    const itemProportion = grandTotal > 0 ? itemOrderTotal / grandTotal : 1;
    const proportionalPaid = totalPaidRental * itemProportion;

    // Cancellation fee is based on the item's ORDER TOTAL (not what was paid)
    // Per config: "Percentage of full reservation price applied to a cancellation"
    // Rounded to whole number (no decimals) for consistency with other pricing
    const cancellationFeeAmount = Math.round(itemOrderTotal * (cancellationFeePercent / 100));
    
    // Round proportional paid for consistency with other pricing
    const roundedProportionalPaid = Math.round(proportionalPaid);

    // Credit = what was proportionally paid minus the fee (both rounded)
    const creditAmount = roundedProportionalPaid - cancellationFeeAmount;

    console.log("Cancellation calculation:", { 
      itemPrice: rentalItem.unit_price, 
      discountPercent, 
      itemOrderTotal, 
      grandTotal, 
      itemProportion, 
      totalPaidRental, 
      proportionalPaid, 
      roundedProportionalPaid,
      cancellationFeeAmount, 
      creditAmount,
      itemCount: allItems?.length 
    });

    return c.json({
      totalPaid: roundedProportionalPaid,
      itemOrderTotal,
      cancellationFeePercent,
      cancellationFeeAmount,
      creditAmount,
      itemStatus: rentalItem.status,
      itemCount: allItems?.length || 1,
      isOverdue,
    });
  } catch (error) {
    console.log("Error calculating cancellation:", error);
    return c.json({ error: `Failed to calculate cancellation: ${error.message}` }, 500);
  }
});
// POST - Cancel reservation and add credit to customer
app.post("/make-server-918f1e54/cancel-reservation", async (c) => {
  try {
    const { rentalItemId } = await c.req.json();

    if (!rentalItemId) {
      return c.json({ error: "Rental item ID is required" }, 400);
    }

    console.log("Cancelling reservation for rental_item_id:", rentalItemId);

    // Fetch rental item details with unit_price
    const { data: rentalItem, error: itemError } = await supabase
      .from("rental_items")
      .select("id, status, item_id, rental_id, unit_price, start_date")
      .eq("id", rentalItemId)
      .single();

    if (itemError) {
      console.log("Error fetching rental item for cancellation:", itemError);
      return c.json({ error: `Database error: ${itemError.message}` }, 500);
    }

    if (!rentalItem) {
      console.log("Rental item not found with ID:", rentalItemId);
      return c.json({ error: "Rental item not found" }, 404);
    }

    console.log("Found rental_item:", rentalItem);

    // Validate status is 'reserved'
    if (rentalItem.status !== 'reserved') {
      return c.json({ 
        error: `Cannot cancel item with status '${rentalItem.status}'. Only items with status 'reserved' can be cancelled.` 
      }, 400);
    }

    // Fetch rental details for customer_id and discount_percent
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, customer_id, discount_percent")
      .eq("id", rentalItem.rental_id)
      .single();

    if (rentalError || !rental) {
      console.log("Error fetching rental for cancellation:", rentalError);
      return c.json({ error: "Associated rental not found" }, 404);
    }

    console.log("Found rental:", rental);

    // Fetch ALL rental items for this rental (to calculate proportions for multi-item orders)
    const { data: allItems, error: allItemsError } = await supabase
      .from("rental_items")
      .select("id, unit_price")
      .eq("rental_id", rentalItem.rental_id);

    if (allItemsError) {
      console.log("Error fetching all rental items for proportion calc:", allItemsError);
      return c.json({ error: `Failed to fetch rental items: ${allItemsError.message}` }, 500);
    }

    // Get actual total paid from payments table for this rental
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount")
      .eq("rental_id", rentalItem.rental_id);

    if (paymentsError) {
      console.log("Error fetching payments for rental:", paymentsError);
      return c.json({ error: `Failed to fetch payment data: ${paymentsError.message}` }, 500);
    }

    // Calculate total amount actually paid for this rental
    const totalPaidRental = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    console.log("Total paid from payments table:", totalPaidRental);

    const todayStr = getTodayGmt3String();
    const isOverdue = (rentalItem as any).start_date < todayStr;

    // Get cancellation fee percentage from config (always applies on cancellation)
    const cancellationFeePercent = parseFloat((await kv.get("config_cancelation_fee")) as string || "25");
    
    // Calculate this item's order total (after discount)
    const discountPercent = parseFloat(rental.discount_percent) || 0;
    const itemOrderTotal = rentalItem.unit_price * (1 - discountPercent / 100);

    // Calculate grand total across ALL items in the rental (for proportional allocation)
    const grandTotal = (allItems || []).reduce((sum, item) => {
      return sum + item.unit_price * (1 - discountPercent / 100);
    }, 0);

    // Proportionally allocate the total paid to this specific item
    const itemProportion = grandTotal > 0 ? itemOrderTotal / grandTotal : 1;
    const proportionalPaid = totalPaidRental * itemProportion;

    // Cancellation fee is based on the item's ORDER TOTAL (not what was paid)
    // Rounded to whole number (no decimals) for consistency with other pricing
    const cancellationFeeAmount = Math.round(itemOrderTotal * (cancellationFeePercent / 100));
    
    // Round proportional paid for consistency with other pricing
    const roundedProportionalPaid = Math.round(proportionalPaid);

    // Credit = what was proportionally paid minus the fee (both rounded)
    const creditAmount = roundedProportionalPaid - cancellationFeeAmount;

    console.log("Cancellation amounts:", { 
      itemPrice: rentalItem.unit_price, 
      discountPercent, 
      itemOrderTotal, 
      grandTotal, 
      itemProportion, 
      totalPaidRental, 
      proportionalPaid, 
      roundedProportionalPaid,
      cancellationFeeAmount, 
      creditAmount 
    });

    const nowUTC = new Date();

    // Step 1: Update rental_items status to 'cancelled'
    const { error: updateItemError } = await supabase
      .from("rental_items")
      .update({ 
        status: 'cancelled',
        updated_at: nowUTC.toISOString(),
      })
      .eq("id", rentalItemId);

    if (updateItemError) {
      console.log("Error updating rental item status to cancelled:", updateItemError);
      return c.json({ error: "Failed to update rental item status" }, 500);
    }

    // Step 2: Update inventory location to the specified cancellation location
    const cancellationLocationId = "2d1cd314-22b1-4616-b576-123f26299317";
    const { error: updateLocationError } = await supabase
      .from("inventory_items")
      .update({
        location_id: cancellationLocationId,
        updated_at: nowUTC.toISOString(),
      })
      .eq("id", rentalItem.item_id);

    if (updateLocationError) {
      console.log("Error updating inventory location during cancellation:", updateLocationError);
      // Continue even if location update fails - this is not critical
    }

    // Step 3: Add credit to customer's credit_balance
    const customerId = rental.customer_id;

    // Detect any swap credit already given (old code gave credit at swap time; new code defers it)
    // We must deduct previously-given swap credit so the customer isn't credited twice.
    let cancelSwapCreditGiven = 0;
    const { data: cancelSwapEvts } = await supabase
      .from("rental_events")
      .select("notes")
      .eq("rental_item_id", rentalItemId)
      .eq("event_type", "item_swapped")
      .order("created_at", { ascending: false });

    if (cancelSwapEvts && cancelSwapEvts.length > 0) {
      for (const evt of cancelSwapEvts) {
        const notes = (evt as any).notes as string || '';
        if (notes.includes('(deferred to checkout)')) continue;
        const totalMatch = notes.match(/Total swap credit: \$(\d[\d,]*)/);
        if (totalMatch) {
          cancelSwapCreditGiven = parseFloat(totalMatch[1].replace(/,/g, ''));
          break;
        }
      }
      if (cancelSwapCreditGiven > 0) {
        console.log(`⚠️ [CANCEL] Found $${cancelSwapCreditGiven} swap credit already given for rental_item ${rentalItemId}. Will deduct from cancellation credit.`);
      }
    }

    // Adjust credit to avoid double-counting with swap credit
    const netCancelCredit = creditAmount - cancelSwapCreditGiven;
    
    // Fetch current credit balance
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("credit_balance")
      .eq("customer_id", customerId)
      .single();

    if (customerError) {
      console.log("Error fetching customer for credit update:", customerError);
      return c.json({ error: "Failed to fetch customer data" }, 500);
    }

    const currentCreditBalance = customer?.credit_balance || 0;
    const newCreditBalance = currentCreditBalance + netCancelCredit;

    const { error: updateCreditError } = await supabase
      .from("customers")
      .update({
        credit_balance: newCreditBalance,
        updated_at: nowUTC.toISOString(),
      })
      .eq("customer_id", customerId);

    if (updateCreditError) {
      console.log("Error updating customer credit balance:", updateCreditError);
      return c.json({ error: "Failed to update customer credit balance" }, 500);
    }

    // Step 4: Check if all items in rental are cancelled
    const { data: allRentalItems, error: checkAllItemsError } = await supabase
      .from("rental_items")
      .select("status")
      .eq("rental_id", rentalItem.rental_id);

    if (checkAllItemsError) {
      console.log("Error checking rental items status:", checkAllItemsError);
      // Continue even if this check fails
    } else {
      const allCancelled = allRentalItems?.every(item => item.status === 'cancelled');
      
      if (allCancelled) {
        // Update rentals.status to 'cancelled'
        const { error: updateRentalError } = await supabase
          .from("rentals")
          .update({
            status: 'cancelled',
            updated_at: nowUTC.toISOString(),
          })
          .eq("id", rentalItem.rental_id);

        if (updateRentalError) {
          console.log("Error updating rental status to cancelled:", updateRentalError);
          // Continue even if rental update fails
        }
      }
    }

    // Step 5: Create audit record in rental_events
    const { error: eventError } = await supabase
      .from("rental_events")
      .insert({
        rental_item_id: rentalItemId,
        event_type: "cancelled",
        event_time: nowUTC.toISOString(),
        actor: "system",
        notes: `Reservation cancelled. Item order total: ${itemOrderTotal.toFixed(2)}, Proportional paid: ${roundedProportionalPaid.toFixed(2)}, Cancellation fee (${cancellationFeePercent}%): ${cancellationFeeAmount.toFixed(2)}, Gross credit: ${creditAmount.toFixed(2)}, Swap credit deducted: ${cancelSwapCreditGiven.toFixed(2)}, Net credit: ${netCancelCredit.toFixed(2)}`,
        created_by: getCurrentUserDisplay(c),
      });

    if (eventError) {
      console.log("Error creating rental event for cancellation:", eventError);
      // Continue even if event creation fails - not critical
    }

    return c.json({ 
      success: true,
      creditAmount,
      newCreditBalance,
    });
  } catch (error) {
    console.log("Error cancelling reservation:", error);
    return c.json({ error: `Failed to cancel reservation: ${error.message}` }, 500);
  }
});
}
