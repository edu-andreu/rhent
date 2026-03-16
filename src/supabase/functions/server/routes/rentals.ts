import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";
import * as kv from "../kv_store.ts";
import { countBusinessDays, fetchHolidaysFromAPI, calculateExtraDays, getGMT3DateString } from "../helpers/calculations.ts";
import { getCurrentOpenDrawer, validateDateNotWeekendOrHoliday } from "../helpers/validation.ts";

export function registerRentalsRoutes(app: Hono, supabase: SupabaseClient) {

  const supabaseUrl = Deno.env.get("SUPABASE_URL");

app.get("/make-server-918f1e54/rentals/active", async (c) => {
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
        checked_out_at,
        alteration_notes,
        inventory_items!inner (
          id,
          sku,
          curr_price,
          description,
          name:name_id (
            name
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
          size:size_id (
            size
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
      .eq("status", "checked_out")
      .order("start_date", { ascending: false });

    if (error) {
      console.log("Error fetching active rentals:", error);
      return c.json({ error: `Failed to fetch active rentals: ${error.message}` }, 500);
    }

    // Transform data to match frontend Rental interface
    const bucketName = 'photos';
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    
    const rentals = await Promise.all((data || []).map(async (item: any) => {
      const itemName = item.inventory_items?.name?.name || "Unknown";
      const customer = item.rentals?.customers;
      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
        : "Unknown";
      
      // Extract colors
      const colors = item.inventory_items?.inventory_item_colors?.map((ic: any) => ic.color?.color).filter(Boolean) || [];

      // Get image from storage
      let imageUrl = "";
      const { data: files } = await supabase.storage
        .from(bucketName)
        .list('', { search: item.item_id });
      
      if (files && files.length > 0) {
        const { data: signedUrlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(files[0].name, 31536000); // 1 year
        
        if (signedUrlData) {
          imageUrl = signedUrlData.signedUrl;
        }
      } else if (item.inventory_items?.category?.default_image) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${item.inventory_items.category.default_image}`;
      }
      
      return {
        id: item.id,
        dressId: item.item_id,
        dressName: itemName,
        dressImage: imageUrl,
        startDate: item.start_date, // Keep as YYYY-MM-DD string, frontend will parse with parseDateLocal
        endDate: item.end_date, // Keep as YYYY-MM-DD string, frontend will parse with parseDateLocal
        totalCost: item.unit_price,
        status: 'active',
        rentalId: item.rental_id,
        customerId: item.rentals?.customer_id || "",
        customerName: customerName,
        sku: item.inventory_items?.sku || "",
        category: item.inventory_items?.category?.category || "",
        type: item.inventory_items?.subcategory?.subcategory || "",
        brand: item.inventory_items?.brand?.brand || "",
        size: item.inventory_items?.size?.size || "",
        colors: colors,
        description: item.inventory_items?.description || "",
        pricePerDay: parseFloat(item.inventory_items?.curr_price) || 0,
        alteration_notes: item.alteration_notes || "",
      };
    }));

    return c.json({ rentals });
  } catch (error) {
    console.log("Unexpected error fetching active rentals:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// GET return details - fetch rental item info + rental financial summary for return dialog
app.get("/make-server-918f1e54/rentals/return-details/:rentalItemId", async (c) => {
  try {
    const rentalItemId = c.req.param("rentalItemId");

    // Fetch rental item with nested relations (including new price component columns)
    const { data: rentalItem, error: riError } = await supabase
      .from("rental_items")
      .select(`
        id,
        rental_id,
        item_id,
        start_date,
        end_date,
        unit_price,
        extra_days,
        extra_days_amount,
        discount_amount,
        status,
        checked_out_at,
        late_days,
        late_fee_amount,
        inventory_items (
          id,
          sku,
          curr_price,
          description,
          name:name_id ( name ),
          category:category_id ( category, default_image ),
          subcategory:subcategory_id ( subcategory ),
          brand:brand_id ( brand ),
          size:size_id ( size ),
          inventory_item_colors ( color:color_id ( color ) )
        ),
        rentals (
          id,
          customer_id,
          status,
          discount_percent,
          notes,
          customers (
            customer_id,
            first_name,
            last_name,
            phone,
            email
          )
        )
      `)
      .eq("id", rentalItemId)
      .single();

    if (riError || !rentalItem) {
      console.log("Error fetching rental item for return:", riError);
      return c.json({ error: `Rental item not found: ${riError?.message || 'Not found'}` }, 404);
    }

    const rentalId = (rentalItem as any).rental_id;

    // Fetch rental financial totals from the view
    const { data: totals, error: totalsError } = await supabase
      .from("v_rental_totals")
      .select("*")
      .eq("rental_id", rentalId)
      .single();

    if (totalsError) {
      console.log("Error fetching rental totals for return:", totalsError);
      return c.json({ error: `Failed to fetch rental totals: ${totalsError.message}` }, 500);
    }

    // Fetch all rental items for this rental (order summary)
    const { data: allItems, error: allItemsError } = await supabase
      .from("rental_items")
      .select(`
        id,
        item_id,
        unit_price,
        extra_days,
        extra_days_amount,
        discount_amount,
        status,
        start_date,
        end_date,
        late_days,
        late_fee_amount,
        deposit_amount,
        inventory_items (
          id,
          sku,
          name:name_id ( name ),
          category:category_id ( category, default_image ),
          size:size_id ( size )
        )
      `)
      .eq("rental_id", rentalId);

    if (allItemsError) {
      console.log("Error fetching all rental items:", allItemsError);
    }

    // Get image for the item being returned
    const bucketName = 'photos';
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    let imageUrl = "";
    const { data: files } = await supabase.storage
      .from(bucketName)
      .list('', { search: (rentalItem as any).item_id });

    if (files && files.length > 0) {
      const { data: signedUrlData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(files[0].name, 31536000);
      if (signedUrlData) {
        imageUrl = signedUrlData.signedUrl;
      }
    } else if ((rentalItem as any).inventory_items?.category?.default_image) {
      imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${(rentalItem as any).inventory_items.category.default_image}`;
    }

    const item = rentalItem as any;
    const customer = item.rentals?.customers;
    const colors = item.inventory_items?.inventory_item_colors?.map((ic: any) => ic.color?.color).filter(Boolean) || [];

    // Fetch configuration for late fee calculations
    const [lateDaysPriceRaw, rentalDaysRaw, extraDaysPriceRaw] = await Promise.all([
      kv.get("config_late_days_price"),
      kv.get("config_rental_days"),
      kv.get("config_extra_days_price"),
    ]);
    const lateDaysPricePct = parseFloat(lateDaysPriceRaw as string || "75");
    const extraDaysPricePct = parseFloat(extraDaysPriceRaw as string || "75");
    const configRentalDays = parseInt(rentalDaysRaw as string || "3", 10) || 3;
    
    // Use STORED values from database (already calculated during checkout)
    const unitPrice = parseFloat(item.unit_price) || 0; // Base price only (no extra days)
    const extraDaysCount = item.extra_days || 0; // Stored extra days count
    const extraDaysAmount = parseFloat(item.extra_days_amount) || 0; // Stored extra days charge

    // Calculate rental period for informational purposes
    const startDate = new Date(item.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(item.end_date);
    endDate.setHours(0, 0, 0, 0);
    const rentalPeriodMs = endDate.getTime() - startDate.getTime();
    const rentalPeriodDays = Math.max(1, Math.round(rentalPeriodMs / (1000 * 60 * 60 * 24)) + 1);

    // Calculate rates for late fees (based on standard price)
    const basePrice = unitPrice; // unit_price is now the base price
    const standardDayPrice = basePrice / configRentalDays;
    const lateDayRate = standardDayPrice * (lateDaysPricePct / 100);

    // Calculate suggested late days (business days past end_date, excluding weekends and holidays)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const returnHolidays = await fetchHolidaysFromAPI();
    const suggestedLateDays = today > endDate ? countBusinessDays(endDate, today, returnHolidays) : 0;

    // Check if this item already has late fee recorded (from a previous partial process)
    const existingLateDays = item.late_days || 0;
    const existingLateFee = parseFloat(item.late_fee_amount) || 0;

    const itemDiscountAmount = parseFloat(item.discount_amount) || 0;
    const itemGrandTotal = unitPrice + extraDaysAmount + existingLateFee - itemDiscountAmount;

    // Query actual per-item payments from the payments table (stored during checkout)
    const { data: thisItemPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("rental_item_id", rentalItemId);
    const itemPaymentsTotal = (thisItemPayments || []).reduce(
      (sum: number, p: any) => sum + (parseFloat(p.amount) || 0),
      0
    );
    const itemBalanceDue = Math.max(0, itemGrandTotal - itemPaymentsTotal);

    return c.json({
      rentalItemId: item.id,
      rentalId: rentalId,
      itemId: item.item_id,
      item: {
        name: item.inventory_items?.name?.name || "Unknown",
        sku: item.inventory_items?.sku || "",
        category: item.inventory_items?.category?.category || "",
        subcategory: item.inventory_items?.subcategory?.subcategory || "",
        brand: item.inventory_items?.brand?.brand || "",
        size: item.inventory_items?.size?.size || "",
        colors,
        description: item.inventory_items?.description || "",
        imageUrl,
        unitPrice: parseFloat(item.unit_price) || 0,
        startDate: item.start_date,
        endDate: item.end_date,
      },
      customer: customer ? {
        id: customer.customer_id,
        name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
        phone: customer.phone || "",
        email: customer.email || "",
      } : null,
      financials: {
        rentalSubtotal: parseFloat(totals?.rental_subtotal) || 0,
        extraDaysTotal: parseFloat(totals?.extra_days_total) || 0,
        discountAmount: parseFloat(totals?.discount_amount) || 0,
        lateFeesTotal: parseFloat(totals?.late_fees_total) || 0,
        depositsTotal: parseFloat(totals?.deposits_total) || 0,
        grandTotal: parseFloat(totals?.grand_total) || 0,
        paymentsTotal: parseFloat(totals?.payments_total) || 0,
        balanceDue: parseFloat(totals?.balance_due) || 0,
        itemCount: parseInt(totals?.item_count) || 0,
        discountPercent: parseFloat(totals?.discount_percent) || 0,
      },
      itemFinancials: {
        subtotal: unitPrice,
        extraDaysAmount,
        lateFee: existingLateFee,
        discountAmount: itemDiscountAmount,
        grandTotal: itemGrandTotal,
        paymentsTotal: itemPaymentsTotal,
        balanceDue: itemBalanceDue,
      },
      lateFeeConfig: {
        lateDaysPricePct,
        configRentalDays,
        standardDayPrice,
        lateDayRate,
        suggestedLateDays,
        suggestedLateFee: suggestedLateDays * lateDayRate,
        existingLateDays,
        existingLateFee,
      },
      extraDaysInfo: {
        extraDaysCount,
        extraDaysAmount,
        extraDaysPricePct,
        rentalPeriodDays,
        basePrice,
      },
      orderItems: (allItems || []).map((oi: any) => ({
        id: oi.id,
        itemId: oi.item_id,
        name: oi.inventory_items?.name?.name || "Unknown",
        sku: oi.inventory_items?.sku || "",
        size: oi.inventory_items?.size?.size || "",
        unitPrice: parseFloat(oi.unit_price) || 0,
        extraDays: oi.extra_days || 0,
        extraDaysAmount: parseFloat(oi.extra_days_amount) || 0,
        discountAmount: parseFloat(oi.discount_amount) || 0,
        status: oi.status,
        startDate: oi.start_date,
        endDate: oi.end_date,
        lateDays: oi.late_days || 0,
        lateFee: parseFloat(oi.late_fee_amount) || 0,
        deposit: parseFloat(oi.deposit_amount) || 0,
      })),
    });
  } catch (error: any) {
    console.log("Unexpected error fetching return details:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// POST process return - mark item as returned, add payments for balance, update inventory location
app.post("/make-server-918f1e54/rentals/return", async (c) => {
  try {
    const body = await c.req.json();
    const { rentalItemId, rentalId, itemId, payments, discount, lateFee, extraDays, creditApplied, customerId, surplusHandling } = body;

    console.log(`\n🔄 ===== RETURN CHECKOUT REQUEST ===== 
rentalItemId: ${rentalItemId}
rentalId: ${rentalId}
itemId: ${itemId}
extraDays:`, extraDays,`
discount:`, discount,`
lateFee:`, lateFee,`
creditApplied: ${creditApplied}
payments:`, payments);

    if (!rentalItemId || !rentalId || !itemId) {
      return c.json({ error: "rentalItemId, rentalId, and itemId are required" }, 400);
    }

    // DRAWER VALIDATION - Only check if cash payment is being used
    let openDrawer: any = null;
    
    if (payments && Array.isArray(payments) && payments.length > 0) {
      // Get payment method IDs from the payments array
      const paymentMethodIds = payments.map((p: any) => p.methodId).filter(Boolean);
      console.log('🔍 [RETURN] Drawer validation - paymentMethodIds:', paymentMethodIds);
      
      if (paymentMethodIds.length > 0) {
        // Fetch payment methods to check payment_type
        const { data: paymentMethodsData, error: pmError } = await supabase
          .from("payments_methods")
          .select("id, payment_type")
          .in("id", paymentMethodIds);

        console.log('🔍 [RETURN] Drawer validation - paymentMethodsData:', paymentMethodsData);
        console.log('🔍 [RETURN] Drawer validation - pmError:', pmError);

        if (!pmError && paymentMethodsData) {
          // Check if any payment method has payment_type = 'cash'
          const hasCashPayment = paymentMethodsData.some((pm: any) => pm.payment_type === 'cash');
          console.log('🔍 [RETURN] Drawer validation - hasCashPayment:', hasCashPayment);

          if (hasCashPayment) {
            // Only validate drawer if cash is being used
            openDrawer = await getCurrentOpenDrawer(supabase);
            if (!openDrawer) {
              return c.json({ 
                error: "No cash drawer is open. Please open a cash drawer first." 
              }, 400);
            }

            // Validate drawer date matches today (GMT-3)
            const todayGMT3String = getGMT3DateString();
            const drawerDateString = new Date(openDrawer.business_date).toISOString().split('T')[0];
            if (drawerDateString !== todayGMT3String) {
              return c.json({ 
                error: `Cash drawer is open for ${drawerDateString}. You forgot to close yesterday's drawer. Please close it first.` 
              }, 400);
            }
          } else {
            console.log('✅ [RETURN] Drawer validation - SKIPPED (no cash payments)');
          }
        }
      } else {
        console.log('🔍 [RETURN] Drawer validation - SKIPPED (no methodIds found)');
      }
    } else {
      console.log('🔍 [RETURN] Drawer validation - SKIPPED (no payments or not array)');
    }

    // Also check if surplus refund method is cash (when no cash payments but cash refund is requested)
    if (!openDrawer && surplusHandling && surplusHandling.type === 'refund' && surplusHandling.refundMethodId) {
      const { data: refundPmData, error: refundPmError } = await supabase
        .from("payments_methods")
        .select("id, payment_type")
        .eq("id", surplusHandling.refundMethodId)
        .single();

      if (!refundPmError && refundPmData && (refundPmData as any).payment_type === 'cash') {
        console.log('🔍 [RETURN] Drawer validation - cash refund detected, validating drawer');
        openDrawer = await getCurrentOpenDrawer(supabase);
        if (!openDrawer) {
          return c.json({ 
            error: "No cash drawer is open. Please open a cash drawer first." 
          }, 400);
        }

        const todayGMT3String = getGMT3DateString();
        const drawerDateString = new Date(openDrawer.business_date).toISOString().split('T')[0];
        if (drawerDateString !== todayGMT3String) {
          return c.json({ 
            error: `Cash drawer is open for ${drawerDateString}. You forgot to close yesterday's drawer. Please close it first.` 
          }, 400);
        }
      }
    }

    // Verify the rental item exists and is checked_out (include extra days for audit trail)
    const { data: rentalItem, error: riError } = await supabase
      .from("rental_items")
      .select("id, status, rental_id, extra_days, extra_days_amount, late_days, late_fee_amount")
      .eq("id", rentalItemId)
      .single();

    if (riError || !rentalItem) {
      return c.json({ error: `Rental item not found: ${riError?.message || 'Not found'}` }, 404);
    }

    if ((rentalItem as any).status !== "checked_out") {
      return c.json({ error: `Cannot return item with status '${(rentalItem as any).status}'. Expected 'checked_out'.` }, 400);
    }

    // If a late fee was provided, update the rental_item's late_days and late_fee_amount before reading balance
    if (lateFee && typeof lateFee === 'object') {
      const lateDaysVal = parseInt(lateFee.days) || 0;
      const lateFeeAmount = parseFloat(lateFee.amount) || 0;

      const { error: lateFeeUpdateError } = await supabase
        .from("rental_items")
        .update({
          late_days: lateDaysVal,
          late_fee_amount: lateFeeAmount,
          updated_by: getCurrentUserDisplay(c),
        })
        .eq("id", rentalItemId);

      if (lateFeeUpdateError) {
        console.log("Error updating rental_item late fee during return:", lateFeeUpdateError);
        return c.json({ error: `Failed to update late fee: ${lateFeeUpdateError.message}` }, 500);
      }
      console.log(`Updated rental_item ${rentalItemId} late_days=${lateDaysVal}, late_fee_amount=${lateFeeAmount}`);
    } else {
      // No late fee provided — clear any existing late fee on this item
      const { error: clearLateFeeError } = await supabase
        .from("rental_items")
        .update({
          late_days: 0,
          late_fee_amount: 0,
          updated_by: getCurrentUserDisplay(c),
        })
        .eq("id", rentalItemId);

      if (clearLateFeeError) {
        console.log("Error clearing rental_item late fee during return:", clearLateFeeError);
      }
    }

    // Note: Extra days are NOW stored in rental_items (extra_days, extra_days_amount) during checkout.
    // They were already included in the initial pricing and should NOT be added again during return.
    // The extraDays param from frontend is used for editing/override purposes only.

    // If extra days were edited (different from stored value), update the rental_item
    if (extraDays && typeof extraDays === 'object') {
      const newExtraDays = parseInt(extraDays.days) || 0;
      const newExtraDaysAmount = parseFloat(extraDays.amount) || 0;

      console.log(`🔧 UPDATING extra days for rental_item ${rentalItemId}: days=${newExtraDays}, amount=${newExtraDaysAmount}`);

      const { error: extraDaysUpdateError } = await supabase
        .from("rental_items")
        .update({
          extra_days: newExtraDays,
          extra_days_amount: newExtraDaysAmount,
          updated_by: getCurrentUserDisplay(c),
        })
        .eq("id", rentalItemId);

      if (extraDaysUpdateError) {
        console.log("❌ Error updating rental_item extra days during return:", extraDaysUpdateError);
        return c.json({ error: `Failed to update extra days: ${extraDaysUpdateError.message}` }, 500);
      }
      console.log(`✅ Updated rental_item ${rentalItemId} extra_days=${newExtraDays}, extra_days_amount=${newExtraDaysAmount}`);

      // Audit log for extra days change
      const oldExtraDaysCount = (rentalItem as any).extra_days || 0;
      const oldExtraDaysAmt = parseFloat((rentalItem as any).extra_days_amount) || 0;
      const extraDaysEventNotes = newExtraDays === 0
        ? `Extra days charge removed at return. Was: ${oldExtraDaysCount} days ($${oldExtraDaysAmt})`
        : `Extra days changed at return. Was: ${oldExtraDaysCount} days ($${oldExtraDaysAmt}), Now: ${newExtraDays} days ($${newExtraDaysAmount})`;

      const { error: extraDaysEventError } = await supabase
        .from("rental_events")
        .insert({
          rental_item_id: rentalItemId,
          event_type: "extra_days_changed",
          event_time: new Date().toISOString(),
          actor: "system",
          notes: extraDaysEventNotes,
          created_by: getCurrentUserDisplay(c),
        });

      if (extraDaysEventError) {
        console.log("⚠️ Error creating rental_event for extra days change:", extraDaysEventError);
      }

      // Recalculate discount_amount for the current item only after extra days change
      const { data: currentItemForDiscount } = await supabase
        .from("rental_items")
        .select("unit_price, extra_days_amount, discount_amount")
        .eq("id", rentalItemId)
        .single();

      if (currentItemForDiscount) {
        const oldDiscount = parseFloat((currentItemForDiscount as any).discount_amount) || 0;
        if (oldDiscount > 0) {
          const oldSubtotal = parseFloat((currentItemForDiscount as any).unit_price) || 0;
          const newSubtotal = oldSubtotal + (extraDays.amount || 0);
          const effectivePct = oldSubtotal > 0 ? (oldDiscount / oldSubtotal) : 0;
          const newDiscountAmount = Math.round(newSubtotal * effectivePct);

          await supabase
            .from("rental_items")
            .update({
              discount_amount: newDiscountAmount,
              updated_by: getCurrentUserDisplay(c),
            })
            .eq("id", rentalItemId);
          console.log(`Recalculated discount_amount for item ${rentalItemId} after extra days change: ${newDiscountAmount}`);
        }
      }
    }

    // If a discount was provided, update only the current item's discount
    if (discount && typeof discount === 'object') {
      const { data: currentItemData } = await supabase
        .from("rental_items")
        .select("unit_price, extra_days_amount")
        .eq("id", rentalItemId)
        .single();

      let discountPercent = 0;
      let discountNotes: string | null = null;

      if (discount.value > 0 && currentItemData) {
        const itemSubtotal = (parseFloat((currentItemData as any).unit_price) || 0) + (parseFloat((currentItemData as any).extra_days_amount) || 0);

        if (discount.type === 'percentage') {
          discountPercent = discount.value;
          discountNotes = `Discount: ${discount.value}% applied at return`;
        } else if (discount.type === 'fixed') {
          discountPercent = itemSubtotal > 0 ? (discount.value / itemSubtotal) * 100 : 0;
          discountNotes = `Discount: $${discount.value} (${discountPercent.toFixed(2)}% equivalent) applied at return`;
        }

        if (discount.reason) {
          discountNotes += ` - Reason: ${discount.reason}`;
        }

        const itemDiscountAmount = Math.round(itemSubtotal * (discountPercent / 100));

        const { error: updateItemError } = await supabase
          .from("rental_items")
          .update({
            discount_amount: itemDiscountAmount,
            updated_by: getCurrentUserDisplay(c),
          })
          .eq("id", rentalItemId);

        if (updateItemError) {
          console.log(`Error updating discount_amount for item ${rentalItemId}:`, updateItemError);
          return c.json({ error: `Failed to update item discount: ${updateItemError.message}` }, 500);
        }
        console.log(`Updated discount_amount for item ${rentalItemId} during return: ${itemDiscountAmount}`);
      } else if (discount.value === 0) {
        // Discount removed — clear it for this item
        await supabase
          .from("rental_items")
          .update({ discount_amount: 0, updated_by: getCurrentUserDisplay(c) })
          .eq("id", rentalItemId);
        console.log(`Cleared discount for item ${rentalItemId} during return`);
      }
    }

    // Compute balance directly from rental_items + payments (avoids stale v_rental_totals view)
    console.log(`📊 Computing balance directly from rental_items + payments for rental ${rentalId}...`);

    const { data: allItemsForBalance, error: itemsBalErr } = await supabase
      .from("rental_items")
      .select("id, unit_price, extra_days_amount, discount_amount, late_fee_amount, deposit_amount")
      .eq("rental_id", rentalId);

    if (itemsBalErr) {
      console.log("❌ Error fetching rental items for balance calc:", itemsBalErr);
      return c.json({ error: `Failed to validate balance: ${itemsBalErr.message}` }, 500);
    }

    const { data: allPaymentsForBalance, error: paymentsBalErr } = await supabase
      .from("payments")
      .select("amount, rental_item_id")
      .eq("rental_id", rentalId);

    if (paymentsBalErr) {
      console.log("❌ Error fetching payments for balance calc:", paymentsBalErr);
      return c.json({ error: `Failed to validate balance: ${paymentsBalErr.message}` }, 500);
    }

    let computedGrandTotal = 0;
    for (const it of (allItemsForBalance || [])) {
      const unitPrice = parseFloat((it as any).unit_price) || 0;
      const extraDaysAmt = parseFloat((it as any).extra_days_amount) || 0;
      const discountAmt = parseFloat((it as any).discount_amount) || 0;
      const lateFeeAmt = parseFloat((it as any).late_fee_amount) || 0;
      const depositAmt = parseFloat((it as any).deposit_amount) || 0;
      computedGrandTotal += unitPrice + extraDaysAmt + lateFeeAmt + depositAmt - discountAmt;
    }
    const existingPaymentsTotal = (allPaymentsForBalance || []).reduce(
      (sum: number, p: any) => sum + (parseFloat(p.amount) || 0),
      0
    );
    const orderBalanceDue = Math.max(0, computedGrandTotal - existingPaymentsTotal);

    console.log(
      `📊 Computed (order-level): grandTotal=${computedGrandTotal}, existingPayments=${existingPaymentsTotal}, balanceDue=${orderBalanceDue}`
    );

    // New coverage coming from this return request
    const paymentsTotal = (payments || []).reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0
    );
    const creditAmount = parseFloat(creditApplied) || 0;
    const totalCoverage = paymentsTotal + creditAmount;

    // ── Per-item balance validation for the returning item ──
    const currentItemForBalance = (allItemsForBalance || []).find(
      (it: any) => it.id === rentalItemId
    );

    if (!currentItemForBalance) {
      console.log(
        `❌ Could not find rental_item ${rentalItemId} in itemsForBalance when validating return balance.`
      );
      return c.json(
        { error: "Failed to validate item balance for return. Please try again." },
        500
      );
    }

    const itemUnitPrice = parseFloat((currentItemForBalance as any).unit_price) || 0;
    const itemExtraDaysAmt =
      parseFloat((currentItemForBalance as any).extra_days_amount) || 0;
    const itemDiscountAmt =
      parseFloat((currentItemForBalance as any).discount_amount) || 0;
    const itemLateFeeAmt =
      parseFloat((currentItemForBalance as any).late_fee_amount) || 0;

    const itemGrandTotal =
      itemUnitPrice + itemExtraDaysAmt + itemLateFeeAmt - itemDiscountAmt;

    // Query actual per-item payments from the payments table (stored during checkout)
    const { data: thisItemPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("rental_item_id", rentalItemId);

    const existingItemPayments = (thisItemPayments || []).reduce(
      (sum: number, p: any) => sum + (parseFloat(p.amount) || 0),
      0
    );

    const itemBalanceBefore = Math.max(0, itemGrandTotal - existingItemPayments);
    const totalNewCoverageForItem = totalCoverage;

    console.log(
      `📊 [RETURN] Item-level balance: itemGrandTotal=${itemGrandTotal}, existingItemPayments=${existingItemPayments}, balanceBefore=${itemBalanceBefore}, newPayments=${paymentsTotal}, credit=${creditAmount}, totalNewCoverageForItem=${totalNewCoverageForItem}`
    );

    // If there is an outstanding balance for this item, require sufficient coverage
    if (itemBalanceBefore > 0.01) {
      if (totalNewCoverageForItem < 0.01) {
        return c.json(
          {
            error: `Balance of ${itemBalanceBefore} is due for this item. Payment information is required.`,
          },
          400
        );
      }

      if (totalNewCoverageForItem < itemBalanceBefore - 0.01) {
        return c.json(
          {
            error: `Payment total (${paymentsTotal})${
              creditAmount !== 0 ? ` + credit (${creditAmount})` : ""
            } is below the balance due for this item (${itemBalanceBefore}).`,
          },
          400
        );
      }
    }

    // Never allow overpayment for this item
    if (totalNewCoverageForItem > itemBalanceBefore + 0.01) {
      return c.json(
        {
          error: `Payment total (${paymentsTotal})${
            creditAmount !== 0 ? ` + credit (${creditAmount})` : ""
          } exceeds the balance due for this item (${itemBalanceBefore}). Overpayment is not allowed.`,
        },
        400
      );
    }

    // Order-level: if total coverage exceeds grand total (surplus), require surplusHandling so it can be applied as credit/refund
    if (existingPaymentsTotal + totalCoverage > computedGrandTotal + 0.01) {
      const surplusAmount = Math.round(existingPaymentsTotal + totalCoverage - computedGrandTotal);
      if (!surplusHandling || typeof surplusHandling !== "object" || !surplusHandling.type || surplusHandling.amount == null) {
        return c.json(
          {
            error:
              "Payment + credit exceeds order grand total. Choose how to handle the surplus (store credit or refund) and try again.",
          },
          400
        );
      }
      // Allow return to proceed; surplus will be handled in Step 5 below
      console.log(`📊 [RETURN] Surplus detected: ${surplusAmount}. Will apply as ${surplusHandling.type}.`);
    }

    const nowUTC = new Date();

    // Get customer and item info for drawer transaction descriptions
    const { data: customerInfo } = await supabase
      .from("customers")
      .select("first_name, last_name")
      .eq("customer_id", customerId)
      .single();

    const { data: itemInfo } = await supabase
      .from("rental_items")
      .select("inventory_items(name(name), sku)")
      .eq("id", rentalItemId)
      .single();

    const customerName = customerInfo ? `${customerInfo.first_name} ${customerInfo.last_name}` : "Unknown";
    const itemName = itemInfo?.inventory_items?.name?.name || "Unknown Item";

    // Step 1: Create payment records for the balance (or debt settlement payments)
    const paymentIds: string[] = [];
    const hasDebtSettlement = creditAmount < -0.01;
    if ((itemBalanceBefore > 0.01 || hasDebtSettlement) && payments && payments.length > 0) {
      for (const payment of payments) {
        const { data: paymentRecord, error: paymentError } = await supabase
          .from("payments")
          .insert({
            rental_id: rentalId,
            rental_item_id: rentalItemId,
            payment_method_id: payment.methodId,
            amount: payment.amount,
            currency: "ARS",
            paid_at: nowUTC.toISOString(),
            reference: "return-payment",
            created_by: getCurrentUserDisplay(c),
          })
          .select("id")
          .single();

        if (paymentError || !paymentRecord) {
          console.log("Error creating return payment:", paymentError);
          return c.json({ error: `Failed to create payment: ${paymentError?.message}` }, 500);
        }
        paymentIds.push((paymentRecord as any).id);

        // Create drawer transaction for this return payment (only if drawer is open)
        if (openDrawer) {
          const transactionDesc = `${customerName} | Return - ${itemName}`;

          const { error: drawerTxnError } = await supabase
            .from("drawer_transactions")
            .insert({
              drawer_txn_id: crypto.randomUUID(),
              drawer_id: openDrawer.drawer_id,
              payment_id: (paymentRecord as any).id,
              txn_type: "return_checkout",
              method: payment.methodName,
              amount: payment.amount,
              description: transactionDesc,
              reference: rentalId,
              created_by: getCurrentUserDisplay(c),
            });

          if (drawerTxnError) {
            console.log("Error creating drawer transaction for return payment:", drawerTxnError.message || JSON.stringify(drawerTxnError));
            // Non-critical error, don't rollback
          }
        }
      }
    }

    // Step 1b: If credit/debt was applied, create a "Store Credit" payment record and update customer balance
    // Positive creditAmount = store credit applied (reduces balance, positive payment record)
    // Negative creditAmount = debt settlement (increases balance, negative payment record offsets overpayment)
    if (Math.abs(creditAmount) > 0.01 && customerId) {
      // Look up the "Store Credit" payment method
      const { data: storeCreditMethod, error: scMethodError } = await supabase
        .from("payments_methods")
        .select("id, payment_method")
        .ilike("payment_method", "Store Credit")
        .single();

      if (scMethodError || !storeCreditMethod) {
        console.log("Error finding Store Credit payment method:", scMethodError);
        return c.json({ error: "Store Credit payment method not found. Please create it in payment methods." }, 500);
      }

      // Create the Store Credit payment record
      // For positive credit: positive amount (covers part of rental)
      // For debt settlement: negative amount (offsets the overpayment from debt-inclusive payments)
      const { data: creditPaymentRecord, error: creditPaymentError } = await supabase
        .from("payments")
        .insert({
          rental_id: rentalId,
          rental_item_id: rentalItemId,
          payment_method_id: (storeCreditMethod as any).id,
          amount: creditAmount,
          currency: "ARS",
          paid_at: nowUTC.toISOString(),
          reference: creditAmount > 0 ? "store-credit-applied" : "debt-settlement",
          created_by: getCurrentUserDisplay(c),
        })
        .select("id")
        .single();

      if (creditPaymentError || !creditPaymentRecord) {
        console.log("Error creating store credit payment:", creditPaymentError);
        return c.json({ error: `Failed to create store credit payment: ${creditPaymentError?.message}` }, 500);
      }
      paymentIds.push((creditPaymentRecord as any).id);

      // Deduct from customer's credit_balance
      const { data: customerData, error: custFetchError } = await supabase
        .from("customers")
        .select("credit_balance")
        .eq("customer_id", customerId)
        .single();

      if (custFetchError || !customerData) {
        console.log("Error fetching customer for credit/debt adjustment:", custFetchError);
        // Continue even if this fails — the payment record is already created
      } else {
        const currentBalance = parseFloat((customerData as any).credit_balance) || 0;
        // For credit: currentBalance - positive = reduces credit
        // For debt: currentBalance - negative = settles debt (e.g. -19000 - (-19000) = 0)
        const newBalance = currentBalance - creditAmount;
        
        const { error: custUpdateError } = await supabase
          .from("customers")
          .update({
            credit_balance: newBalance,
            updated_at: nowUTC.toISOString(),
          })
          .eq("customer_id", customerId);

        if (custUpdateError) {
          console.log("Error updating customer credit balance during return:", custUpdateError);
        } else {
          const action = creditAmount > 0 ? 'credit applied' : 'debt settled';
          console.log(`Updated customer ${customerId} credit_balance: ${currentBalance} -> ${newBalance} (${action}: ${creditAmount})`);

          // Insert ledger entry for audit trail
          const { error: ledgerError } = await supabase
            .from("store_credit_ledger")
            .insert({
              customer_id: customerId,
              rental_id: rentalId,
              rental_item_id: rentalItemId,
              amount: -creditAmount,
              balance_after: newBalance,
              entry_type: creditAmount > 0 ? "credit_applied" : "debt_settled",
              notes: `Return checkout: ${action} (${Math.abs(creditAmount)})`,
              created_by: getCurrentUserDisplay(c),
            });
          if (ledgerError) {
            console.log("⚠️ [LEDGER] Error inserting store_credit_ledger entry:", ledgerError.message);
          }
        }
      }
    }

    // Step 2: Mark rental_item as returned
    const { error: updateItemError } = await supabase
      .from("rental_items")
      .update({
        status: "returned",
        returned_at: nowUTC.toISOString(),
        updated_by: getCurrentUserDisplay(c),
      })
      .eq("id", rentalItemId);

    if (updateItemError) {
      console.log("Error updating rental_item status to returned:", updateItemError);
      return c.json({ error: `Failed to update rental item: ${updateItemError.message}` }, 500);
    }

    // Step 3: Update inventory location to config_return_location
    const returnLocationValue = await kv.get("config_return_location");
    if (returnLocationValue) {
      let locationId = returnLocationValue as string;

      // Check if it's a UUID (location ID) or a name
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(locationId)) {
        // It's a name, look up the ID
        const { data: loc, error: locError } = await supabase
          .from("location")
          .select("id")
          .ilike("location", locationId)
          .single();

        if (locError || !loc) {
          console.log(`Warning: config_return_location '${locationId}' not found in location table:`, locError);
        } else {
          locationId = (loc as any).id;
        }
      }

      if (uuidRegex.test(locationId)) {
        const { error: locUpdateError } = await supabase
          .from("inventory_items")
          .update({
            location_id: locationId,
            updated_by: getCurrentUserDisplay(c),
            updated_at: nowUTC.toISOString(),
          })
          .eq("id", itemId);

        if (locUpdateError) {
          console.log("Error updating inventory location on return:", locUpdateError);
        } else {
          console.log(`✅ Updated inventory item ${itemId} location to ${locationId}`);
        }
      }
    } else {
      console.log("⚠️ config_return_location not configured, skipping location update");
    }

    // Step 4: Check if all rental items are returned → close the rental
    const { data: remainingItems, error: remainingError } = await supabase
      .from("rental_items")
      .select("id, status")
      .eq("rental_id", rentalId)
      .in("status", ["checked_out", "reserved"]);

    if (!remainingError && (!remainingItems || remainingItems.length === 0)) {
      const { error: closeError } = await supabase
        .from("rentals")
        .update({
          status: "closed",
          updated_by: getCurrentUserDisplay(c),
        })
        .eq("id", rentalId);

      if (closeError) {
        console.log("Error closing rental:", closeError);
      } else {
        console.log(`✅ Rental ${rentalId} closed (all items returned)`);
      }
    }

    // Step 5: Handle surplus (overpayment) if present
    let surplusAmount = 0;
    let surplusAction = '';
    if (surplusHandling && typeof surplusHandling === 'object') {
      const serverGrandTotal = computedGrandTotal;
      const serverPaymentsTotal = existingPaymentsTotal;
      const serverSurplus = Math.max(0, serverPaymentsTotal - serverGrandTotal);
      // Use rounded surplus from frontend if provided, but cap to server-calculated surplus
      surplusAmount = Math.min(
        parseFloat(surplusHandling.amount) || 0,
        Math.round(serverSurplus)
      );

      if (surplusAmount > 0 && customerId) {
        if (surplusHandling.type === 'refund') {
          // Create a negative payment record to represent the refund
          const refundMethodId = surplusHandling.refundMethodId;
          const refundMethodName = (surplusHandling.refundMethodName || 'refund').toLowerCase();

          if (refundMethodId) {
            const { data: refundRecord, error: refundError } = await supabase
              .from("payments")
              .insert({
                rental_id: rentalId,
                rental_item_id: rentalItemId,
                payment_method_id: refundMethodId,
                method: refundMethodName,
                amount: -surplusAmount,
                currency: "ARS",
                paid_at: nowUTC.toISOString(),
                reference: "surplus-refund-return",
                created_by: getCurrentUserDisplay(c),
              })
              .select("id")
              .single();

            if (refundError || !refundRecord) {
              console.log("Error creating surplus refund payment:", refundError);
            } else {
              paymentIds.push((refundRecord as any).id);
              surplusAction = 'refund';
              console.log(`Created surplus refund payment of -${surplusAmount} for rental ${rentalId}`);

              // Create drawer transaction for refund (cash OUT)
              if (openDrawer) {
                const refundDesc = `Refund: ${customerName} - ${itemName} - $${Math.round(surplusAmount)} (${refundMethodName})`;

                const { error: refundDrawerTxnError } = await supabase
                  .from("drawer_transactions")
                  .insert({
                    drawer_txn_id: crypto.randomUUID(),
                    drawer_id: openDrawer.drawer_id,
                  payment_id: (refundRecord as any).id,
                  txn_type: "out",
                  method: refundMethodName,
                  amount: surplusAmount, // Positive amount, but txn_type is "out"
                  description: refundDesc,
                  reference: rentalId,
                  created_by: getCurrentUserDisplay(c),
                });

                if (refundDrawerTxnError) {
                  console.log("Error creating drawer transaction for refund:", refundDrawerTxnError.message || JSON.stringify(refundDrawerTxnError));
                }
              }
            }
          } else {
            console.log("Surplus refund requested but no refundMethodId provided");
          }
        } else if (surplusHandling.type === 'credit') {
          // Store credit: add surplus to customer credit_balance AND create offsetting negative payment
          // (Mirrors the refund branch which already inserts a negative "surplus-refund" payment.
          //  Without this offset, payments_total stays inflated and later flows detect surplus again.)

          // A) Idempotency: skip if offset already exists (e.g. network retry)
          const { data: existingSurplusCredit } = await supabase
            .from("payments")
            .select("id")
            .eq("rental_id", rentalId)
            .eq("reference", "surplus-to-store-credit-return")
            .limit(1)
            .maybeSingle();

          if (existingSurplusCredit) {
            console.log(`⚠️ [SURPLUS] Store-credit offset already exists for rental ${rentalId}. Skipping (idempotent).`);
            surplusAction = 'credit';
          } else {
            // B) Look up Store Credit payment method
            const { data: scMethod, error: scErr } = await supabase
              .from("payments_methods")
              .select("id")
              .ilike("payment_method", "Store Credit")
              .single();

            if (scErr || !scMethod) {
              console.log("Error finding Store Credit payment method for surplus offset during return:", scErr);
            } else {
              // C) Insert negative offset payment so payments_total reflects the credit deduction
              const { data: offsetRec, error: offsetErr } = await supabase
                .from("payments")
                .insert({
                  rental_id: rentalId,
                  rental_item_id: rentalItemId,
                  payment_method_id: (scMethod as any).id,
                  method: "store credit",
                  amount: -surplusAmount,
                  currency: "ARS",
                  paid_at: nowUTC.toISOString(),
                  reference: "surplus-to-store-credit-return",
                  created_by: getCurrentUserDisplay(c),
                })
                .select("id")
                .single();

              if (offsetErr || !offsetRec) {
                console.log("Error creating surplus store-credit offset payment during return:", offsetErr);
              } else {
                paymentIds.push((offsetRec as any).id);
                console.log(`✅ [SURPLUS] Created store-credit offset payment of -${surplusAmount} for rental ${rentalId}`);

                // D) Only update credit_balance AFTER offset payment succeeded (prevents orphan credit)
                const { data: custData, error: custFetchError } = await supabase
                  .from("customers")
                  .select("credit_balance")
                  .eq("customer_id", customerId)
                  .single();

                if (!custFetchError && custData) {
                  const currentBalance = parseFloat((custData as any).credit_balance) || 0;
                  const newBalance = currentBalance + surplusAmount;

                  const { error: custUpdateError } = await supabase
                    .from("customers")
                    .update({
                      credit_balance: newBalance,
                      updated_at: nowUTC.toISOString(),
                    })
                    .eq("customer_id", customerId);

                  if (custUpdateError) {
                    console.log("Error adding surplus to customer credit balance during return:", custUpdateError);
                  } else {
                    surplusAction = 'credit';
                    console.log(`✅ [SURPLUS] Return: +${surplusAmount} credit to customer ${customerId}. Was: ${currentBalance}, Now: ${newBalance}`);

                    // Insert ledger entry for surplus-to-credit
                    const { error: surplusLedgerErr } = await supabase
                      .from("store_credit_ledger")
                      .insert({
                        customer_id: customerId,
                        rental_id: rentalId,
                        rental_item_id: rentalItemId,
                        amount: surplusAmount,
                        balance_after: newBalance,
                        entry_type: "surplus_to_credit",
                        notes: `Return surplus: ${surplusAmount} added as store credit`,
                        created_by: getCurrentUserDisplay(c),
                      });
                    if (surplusLedgerErr) {
                      console.log("⚠️ [LEDGER] Error inserting surplus ledger entry:", surplusLedgerErr.message);
                    }
                  }
                } else {
                  console.log("Could not fetch customer for surplus credit during return:", custFetchError);
                }
              }
            }
          }
        }
      }
    }

    console.log(`Return completed. RentalItem: ${rentalItemId}, Payments: ${paymentIds.length}, SurplusAmount: ${surplusAmount}, SurplusAction: ${surplusAction}`);

    return c.json({
      success: true,
      rentalItemId,
      rentalId,
      paymentIds,
      surplusAmount,
      surplusAction,
    });

  } catch (error: any) {
    console.log("Unexpected error during return:", error);
    return c.json({ error: `Unexpected error during return: ${error?.message || String(error)}` }, 500);
  }
});

// POST - Reschedule a reservation's dates
app.post("/make-server-918f1e54/rental-items/:id/reschedule", async (c) => {
  try {
    const rentalItemId = c.req.param("id");
    const body = await c.req.json();
    const { newStartDate, newEndDate } = body;

    if (!rentalItemId || !newStartDate || !newEndDate) {
      return c.json({ error: "rentalItemId, newStartDate, and newEndDate are required" }, 400);
    }

    // Validate dates are not weekends/holidays
    const startValidation = await validateDateNotWeekendOrHoliday(newStartDate, 'start');
    if (!startValidation.valid) {
      return c.json({ 
        error: startValidation.error,
        errorType: "invalid_date"
      }, 400);
    }
    
    const endValidation = await validateDateNotWeekendOrHoliday(newEndDate, 'end');
    if (!endValidation.valid) {
      return c.json({ 
        error: endValidation.error,
        errorType: "invalid_date"
      }, 400);
    }

    console.log(`Rescheduling rental_item ${rentalItemId}: ${newStartDate} to ${newEndDate}`);

    // 1. Fetch current rental item
    const { data: rentalItem, error: riError } = await supabase
      .from("rental_items")
      .select(`
        id, rental_id, item_id, start_date, end_date, unit_price, status,
        inventory_items (
          id, sku, curr_price,
          name:name_id ( name )
        )
      `)
      .eq("id", rentalItemId)
      .single();

    if (riError || !rentalItem) {
      console.log("Error fetching rental item for reschedule:", riError);
      return c.json({ error: "Rental item not found: " + (riError?.message || "Not found") }, 404);
    }

    const item = rentalItem as any;

    if (item.status !== "reserved") {
      return c.json({ error: `Cannot reschedule item with status '${item.status}'. Only 'reserved' items can be rescheduled.` }, 400);
    }

    // 2. Validate dates are in the future (GMT-3)
    const now = new Date();
    const buenosAires = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    buenosAires.setHours(0, 0, 0, 0);
    const todayStr = buenosAires.toISOString().split('T')[0];
    const isOverdue = item.start_date < todayStr;

    if (newStartDate <= todayStr) {
      return c.json({ error: "New start date must be in the future" }, 400);
    }

    if (newEndDate <= newStartDate) {
      return c.json({ error: "New end date must be after start date" }, 400);
    }

    // 3. Check availability for the new dates (exclude current booking)
    const { data: conflicts, error: conflictError } = await supabase
      .from("v_availability_calendar")
      .select("day, status, rental_item_id")
      .eq("item_id", item.item_id)
      .gte("day", newStartDate)
      .lte("day", newEndDate)
      .in("status", ["reserved", "checked_out"])
      .neq("rental_item_id", rentalItemId);

    if (conflictError) {
      console.log("Error checking availability for reschedule:", conflictError);
      return c.json({ error: "Failed to check availability: " + conflictError.message }, 500);
    }

    if (conflicts && conflicts.length > 0) {
      return c.json({
        error: "This item is already booked for some of the selected dates. Please choose different dates or check the calendar for availability.",
        errorType: "booking_conflict",
        conflictDates: conflicts.map((cd: any) => cd.day),
      }, 409);
    }

    // 4. Recalculate price if needed
    const oldStartDate = item.start_date;
    const oldEndDate = item.end_date;
    const oldUnitPrice = parseFloat(item.unit_price) || 0;
    const oldExtraDays = parseInt(item.extra_days) || 0;
    const oldExtraDaysAmount = parseFloat(item.extra_days_amount) || 0;

    // Fetch config for pricing
    const configRentalDaysRaw = await kv.get("config_rental_days");
    const configExtraDaysPriceRaw = await kv.get("config_extra_days_price");
    const rentalDays = parseInt(configRentalDaysRaw as string) || 2;
    const extraDaysPricePct = parseFloat(configExtraDaysPriceRaw as string) || 75;

    // Fetch holidays for accurate extra days calculation
    const { data: holidaysData } = await supabase
      .from("holidays")
      .select("date, name, type")
      .order("date", { ascending: true });
    const holidays = holidaysData || [];

    const currPrice = parseFloat(item.inventory_items?.curr_price) || oldUnitPrice;
    const pricePerDay = currPrice / rentalDays;
    const extraDayRate = pricePerDay * (extraDaysPricePct / 100);

    // Calculate extra days for new period using shared helper
    const startD = new Date(newStartDate);
    const endD = new Date(newEndDate);
    const extraDaysCount = calculateExtraDays(startD, endD, rentalDays, holidays);
    const extraDaysAmountBase = extraDaysCount > 0 ? Math.round(extraDaysCount * extraDayRate) : 0;

    // Overdue reschedule fee: apply the configured cancellation fee as an extra charge
    // Only applies when the reservation is overdue (past its start date in GMT-3).
    let overdueRescheduleFeeAmount = 0;
    if (isOverdue) {
      const cancelFeePctRaw = await kv.get("config_cancelation_fee");
      const cancellationFeePercent = parseFloat(cancelFeePctRaw as string || "25");

      const { data: rentalForDiscount, error: rentalForDiscountError } = await supabase
        .from("rentals")
        .select("discount_percent")
        .eq("id", item.rental_id)
        .single();

      if (rentalForDiscountError) {
        console.log("Error fetching rental discount for overdue reschedule fee:", rentalForDiscountError);
        return c.json({ error: `Failed to fetch rental data: ${rentalForDiscountError.message}` }, 500);
      }

      const discountPercent = parseFloat((rentalForDiscount as any)?.discount_percent) || 0;
      const itemOrderTotal = oldUnitPrice * (1 - discountPercent / 100);
      overdueRescheduleFeeAmount = Math.round(itemOrderTotal * (cancellationFeePercent / 100));
    }

    const extraDaysAmount = extraDaysAmountBase + overdueRescheduleFeeAmount;

    // 5. Update rental_items with separated price components (matching swap logic)
    const { error: updateError } = await supabase
      .from("rental_items")
      .update({
        start_date: newStartDate,
        end_date: newEndDate,
        unit_price: currPrice, // Store ONLY base price (without extra days)
        extra_days: extraDaysCount,
        extra_days_amount: extraDaysAmount,
        updated_by: getCurrentUserDisplay(c),
      })
      .eq("id", rentalItemId);

    if (updateError) {
      console.log("Error updating rental_item dates:", updateError);
      return c.json({ error: "Failed to update dates: " + updateError.message }, 500);
    }

    // Calculate total prices for audit
    const oldTotalPrice = oldUnitPrice + oldExtraDaysAmount;
    const newTotalPrice = currPrice + extraDaysAmount;

    // 6. Create audit record
    const itemName = item.inventory_items?.name?.name || "Unknown";
    const itemSku = item.inventory_items?.sku || "";
    const feeNote = overdueRescheduleFeeAmount > 0 ? ` Includes overdue reschedule fee: ${overdueRescheduleFeeAmount}.` : "";
    const notesText = `Rescheduled ${itemSku} ${itemName}. Old: ${oldStartDate} to ${oldEndDate} (${oldExtraDays} extra days), New: ${newStartDate} to ${newEndDate} (${extraDaysCount} extra days). Price: ${oldTotalPrice} -> ${newTotalPrice}.${feeNote}`;

    const { error: eventError } = await supabase
      .from("rental_events")
      .insert({
        rental_item_id: rentalItemId,
        event_type: "rescheduled",
        event_time: new Date().toISOString(),
        actor: "system",
        notes: notesText,
        created_by: getCurrentUserDisplay(c),
      });

    if (eventError) {
      console.log("Error creating rental_event for reschedule:", eventError);
    }

    console.log(`Reschedule completed. RentalItem: ${rentalItemId}, Old: ${oldStartDate}-${oldEndDate}, New: ${newStartDate}-${newEndDate}`);

    return c.json({
      success: true,
      rentalItemId,
      oldStartDate,
      oldEndDate,
      newStartDate,
      newEndDate,
      oldUnitPrice: oldTotalPrice,
      newUnitPrice: newTotalPrice,
      priceDifference: newTotalPrice - oldTotalPrice,
      isOverdue,
      overdueRescheduleFeeAmount,
    });
  } catch (error: any) {
    console.log("Error rescheduling reservation:", error);
    return c.json({ error: `Failed to reschedule: ${error?.message || String(error)}` }, 500);
  }
});
// GET - Items available for specific dates (for swap modal)
app.get("/make-server-918f1e54/available-items-for-dates", async (c) => {
  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const excludeItemId = c.req.query("excludeItemId");

    if (!startDate || !endDate) {
      return c.json({ error: "startDate and endDate query params are required" }, 400);
    }

    console.log(`Finding items available from ${startDate} to ${endDate}, excluding item ${excludeItemId}`);

    // 1. Get all active inventory items
    const { data: allItems, error: itemsError } = await supabase
      .from("inventory_items")
      .select(`
        id, sku, description, curr_price, status,
        category:category_id ( id, category, default_image ),
        subcategory:subcategory_id ( id, subcategory ),
        brand:brand_id ( id, brand ),
        size:size_id ( id, size ),
        name:name_id ( id, name ),
        location:location_id ( location, badge_class, availability_status ),
        inventory_item_colors ( color:color_id ( color ) )
      `)
      .eq("status", "On")
      .or("is_for_sale.is.null,is_for_sale.eq.false");

    if (itemsError) {
      console.log("Error fetching inventory items for swap:", itemsError);
      return c.json({ error: "Failed to fetch items: " + itemsError.message }, 500);
    }

    // 2. Get all bookings (reserved or checked_out) in the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from("v_availability_calendar")
      .select("item_id, day, status")
      .gte("day", startDate)
      .lte("day", endDate)
      .in("status", ["reserved", "checked_out"]);

    if (bookingsError) {
      console.log("Error fetching bookings for swap:", bookingsError);
      return c.json({ error: "Failed to check bookings: " + bookingsError.message }, 500);
    }

    // 3. Build set of booked item IDs
    const bookedItemIds = new Set((bookings || []).map((b: any) => b.item_id));

    // 4. Filter to available items and transform
    const supabaseUrlEnv = Deno.env.get("SUPABASE_URL");
    const bucketName = "photos";

    const availableItems = await Promise.all(
      (allItems || [])
        .filter((itm: any) => {
          if (excludeItemId && itm.id === excludeItemId) return false;
          if (bookedItemIds.has(itm.id)) return false;
          return true;
        })
        .map(async (itm: any) => {
          let imageUrl = "";
          const { data: files } = await supabase.storage
            .from(bucketName)
            .list("", { search: itm.id });

          if (files && files.length > 0) {
            const { data: signedUrlData } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(files[0].name, 31536000);
            if (signedUrlData) {
              imageUrl = signedUrlData.signedUrl;
            }
          } else if (itm.category?.default_image) {
            imageUrl = `${supabaseUrlEnv}/storage/v1/object/public/photos/${itm.category.default_image}`;
          }

          const colors = itm.inventory_item_colors?.map((ic: any) => ic.color?.color).filter(Boolean) || [];

          return {
            id: itm.id,
            name: itm.name?.name || itm.sku || "Unnamed",
            sku: itm.sku,
            description: itm.description || "",
            size: itm.size?.size || "",
            colors,
            pricePerDay: parseFloat(itm.curr_price) || 0,
            imageUrl,
            category: itm.category?.category || "",
            type: itm.subcategory?.subcategory || "",
            brand: itm.brand?.brand || "",
            available: true,
            status: itm.location?.location || "",
            statusBadgeClass: itm.location?.badge_class || "text-bg-light",
            availabilityStatus: itm.location?.availability_status || "",
          };
        })
    );

    console.log(`Found ${availableItems.length} available items for dates ${startDate}-${endDate}`);
    return c.json({ items: availableItems });
  } catch (error: any) {
    console.log("Error fetching available items for dates:", error);
    return c.json({ error: `Unexpected error: ${error?.message || String(error)}` }, 500);
  }
});
// POST - Swap item on a reservation (payment deferred to rental checkout)
app.post("/make-server-918f1e54/rental-items/:id/swap", async (c) => {
  try {
    const rentalItemId = c.req.param("id");
    const body = await c.req.json();
    const { newItemId } = body;

    if (!rentalItemId || !newItemId) {
      return c.json({ error: "rentalItemId and newItemId are required" }, 400);
    }

    console.log(`Swapping item on rental_item ${rentalItemId} to new item ${newItemId}`);

    // 1. Fetch current rental item
    const { data: rentalItem, error: riError } = await supabase
      .from("rental_items")
      .select(`
        id, rental_id, item_id, start_date, end_date, unit_price, extra_days, extra_days_amount, status,
        inventory_items (
          id, sku, curr_price,
          name:name_id ( name ),
          size:size_id ( size )
        ),
        rentals (
          id, customer_id
        )
      `)
      .eq("id", rentalItemId)
      .single();

    if (riError || !rentalItem) {
      console.log("Error fetching rental item for swap:", riError);
      return c.json({ error: "Rental item not found: " + (riError?.message || "Not found") }, 404);
    }

    const swapItem = rentalItem as any;

    if (swapItem.status !== "reserved") {
      return c.json({ error: `Cannot swap item with status '${swapItem.status}'. Only 'reserved' items can be swapped.` }, 400);
    }

    if (swapItem.item_id === newItemId) {
      return c.json({ error: "Cannot swap to the same item" }, 400);
    }

    // 2. Check availability of new item for the reservation dates
    const { data: swapConflicts, error: swapConflictError } = await supabase
      .from("v_availability_calendar")
      .select("day, status")
      .eq("item_id", newItemId)
      .gte("day", swapItem.start_date)
      .lte("day", swapItem.end_date)
      .in("status", ["reserved", "checked_out"]);

    if (swapConflictError) {
      console.log("Error checking new item availability for swap:", swapConflictError);
      return c.json({ error: "Failed to check availability: " + swapConflictError.message }, 500);
    }

    if (swapConflicts && swapConflicts.length > 0) {
      return c.json({ 
        error: "The selected item is already booked for these dates. Please choose a different item.",
        errorType: "booking_conflict"
      }, 409);
    }

    // 3. Fetch new item details
    const { data: newSwapItem, error: newSwapItemError } = await supabase
      .from("inventory_items")
      .select(`
        id, sku, curr_price,
        name:name_id ( name ),
        size:size_id ( size )
      `)
      .eq("id", newItemId)
      .single();

    if (newSwapItemError || !newSwapItem) {
      console.log("Error fetching new item:", newSwapItemError);
      return c.json({ error: "New item not found: " + (newSwapItemError?.message || "Not found") }, 404);
    }

    const newSwapItemData = newSwapItem as any;

    // 4. Calculate prices
    const swapRentalDaysRaw = await kv.get("config_rental_days");
    const swapExtraDaysPriceRaw = await kv.get("config_extra_days_price");
    const swapRentalDays = parseInt(swapRentalDaysRaw as string) || 2;
    const swapExtraDaysPricePct = parseFloat(swapExtraDaysPriceRaw as string) || 75;

    // Fetch holidays for accurate extra days calculation
    const { data: swapHolidaysData } = await supabase
      .from("holidays")
      .select("date, name, type")
      .order("date", { ascending: true });
    const swapHolidays = swapHolidaysData || [];

    const swapOldUnitPrice = parseFloat(swapItem.unit_price) || 0;
    const swapNewCurrPrice = parseFloat(newSwapItemData.curr_price) || 0;
    const swapNewPricePerDay = swapNewCurrPrice / swapRentalDays;
    const swapNewExtraDayRate = swapNewPricePerDay * (swapExtraDaysPricePct / 100);

    // Calculate extra days using shared helper (matches RentalDialog logic)
    const swapStartD = new Date(swapItem.start_date);
    const swapEndD = new Date(swapItem.end_date);
    const swapExtraDays = calculateExtraDays(swapStartD, swapEndD, swapRentalDays, swapHolidays);

    // Calculate total price for new item (base + extra days)
    const swapExtraDaysAmount = swapExtraDays > 0 ? Math.round(swapExtraDays * swapNewExtraDayRate) : 0;
    const swapNewTotalPrice = swapNewCurrPrice + swapExtraDaysAmount;

    // Calculate total price for old item (base + extra days from DB)
    // Note: swapOldUnitPrice is the base price, need to add any existing extra days amount
    const swapOldExtraDaysAmount = parseFloat(swapItem.extra_days_amount) || 0;
    const swapOldTotalPrice = swapOldUnitPrice + swapOldExtraDaysAmount;

    // 5. Handle credit - RECALCULATE from original reservation price, not incremental
    // CRITICAL: For reservations, credit is based on PAYMENT AMOUNTS, not full item prices
    // The customer only paid the reservation down payment (e.g., 25%), not the full price
    const swapCustomerId = swapItem.rentals?.customer_id;

    // Fetch reservation down payment percentage
    const swapResDpRaw = await kv.get("config_reservation_down_payment");
    const swapReservationDownPaymentPct = parseFloat(swapResDpRaw as string) || 25;

    let creditAdded = 0;
    let originalReservationPrice = swapOldTotalPrice; // Default to current price if no previous swaps
    let previousSwapCredit = 0;

    // Check if there were previous swaps to find the original reservation price
    const { data: swapEvents } = await supabase
      .from("rental_events")
      .select("notes, created_at")
      .eq("rental_item_id", rentalItemId)
      .eq("event_type", "item_swapped")
      .order("created_at", { ascending: true });

    console.log(`\n🔄 SWAP CREDIT DEBUG for rental_item ${rentalItemId}:`);
    console.log(`   Status: ${swapItem.status} (reservation)`);
    console.log(`   Reservation down payment: ${swapReservationDownPaymentPct}%`);
    console.log(`   Current item price (before swap): $${swapOldTotalPrice}`);
    console.log(`   New item price (after swap): $${swapNewTotalPrice}`);
    console.log(`   Number of previous swaps: ${swapEvents?.length || 0}`);

    if (swapEvents && swapEvents.length > 0) {
      // This is NOT the first swap - parse original price from first swap event
      const firstSwap = swapEvents[0];
      console.log(`   First swap event notes: ${firstSwap.notes}`);
      const match = (firstSwap.notes as string)?.match(/Original price: \$?([\d,]+)/);
      if (match) {
        originalReservationPrice = parseFloat(match[1].replace(/,/g, ''));
        console.log(`   ✅ Found original reservation price: $${originalReservationPrice}`);
      } else {
        console.log(`   ⚠️ Could not parse original price, using: $${originalReservationPrice}`);
      }

      // Calculate how much credit was already applied in previous swaps
      // CRITICAL FIX: For reservations, credit only exists if: Amount Paid > Old Item Total Price
      const originalPaymentAmount = originalReservationPrice * (swapReservationDownPaymentPct / 100);
      previousSwapCredit = Math.max(0, originalPaymentAmount - swapOldTotalPrice);
      console.log(`   Previous swap credit: max(0, ($${originalReservationPrice} * ${swapReservationDownPaymentPct}%) - $${swapOldTotalPrice} [OLD TOTAL PRICE]) = $${previousSwapCredit}`);
    } else {
      // This is the first swap - current old price IS the original reservation price
      console.log(`   ✅ First swap - Original price: $${originalReservationPrice}`);
    }

    // Calculate total credit that SHOULD exist for RESERVATIONS
    // CRITICAL FIX: For reservations, credit should only exist if amount paid > NEW ITEM TOTAL PRICE
    // The overpayment from down payment goes toward the remaining balance, NOT credit!
    // Credit only exists when: Amount Paid > New Item Total Price
    const originalPaymentAmount = originalReservationPrice * (swapReservationDownPaymentPct / 100);
    const totalCreditShouldBe = Math.max(0, originalPaymentAmount - swapNewTotalPrice);
    
    // Credit to add/remove = difference between what should be and what already exists
    const creditAdjustment = totalCreditShouldBe - previousSwapCredit;

    console.log(`   Total credit SHOULD be: max(0, ($${originalReservationPrice} * ${swapReservationDownPaymentPct}%) - $${swapNewTotalPrice} [NEW TOTAL PRICE]) = $${totalCreditShouldBe}`);
    console.log(`   Credit adjustment: $${totalCreditShouldBe} - $${previousSwapCredit} = $${creditAdjustment}`);

    // Credit adjustment is now DEFERRED to checkout (conversion or cancellation).
    // This prevents double-crediting when both swap and conversion/cancellation handle the same overpayment.
    // The calculated values are still logged and included in event notes for audit trail.
    if (creditAdjustment !== 0) {
      console.log(`ℹ️ [SWAP] Credit adjustment of ${creditAdjustment >= 0 ? '+' : ''}$${creditAdjustment} DEFERRED to checkout. Total swap credit would be: $${totalCreditShouldBe}`);
    }

    // 6. Update rental_items with new item
    // CRITICAL: Store unit_price as BASE price only (without extra days)
    // Store extra days separately in extra_days and extra_days_amount columns
    // This matches the schema and prevents double-counting in checkout dialogs
    const { error: swapUpdateError } = await supabase
      .from("rental_items")
      .update({
        item_id: newItemId,
        unit_price: swapNewCurrPrice,
        extra_days: swapExtraDays,
        extra_days_amount: swapExtraDaysAmount,
        alteration_notes: null,
        updated_by: getCurrentUserDisplay(c),
      })
      .eq("id", rentalItemId);

    if (swapUpdateError) {
      console.log("Error updating rental_item for swap:", swapUpdateError);
      return c.json({ error: "Failed to swap item: " + swapUpdateError.message }, 500);
    }

    // 7. Create audit record
    const swapOldName = swapItem.inventory_items?.name?.name || "Unknown";
    const swapOldSku = swapItem.inventory_items?.sku || "";
    const swapNewName = newSwapItemData.name?.name || "Unknown";
    const swapNewSku = newSwapItemData.sku || "";
    
    // Include original price in notes for future swap credit calculations
    // Mark credit as "(deferred to checkout)" so the conversion endpoint knows not to parse it as already-given credit
    const swapNotesText = `Old: ${swapOldSku} ${swapOldName} ($${swapOldTotalPrice}), New: ${swapNewSku} ${swapNewName} ($${swapNewTotalPrice}), Original price: $${originalReservationPrice}, Credit adjustment: $0 (deferred to checkout), Calculated swap credit: $${totalCreditShouldBe}`;

    const { error: swapEventError } = await supabase
      .from("rental_events")
      .insert({
        rental_item_id: rentalItemId,
        event_type: "item_swapped",
        event_time: new Date().toISOString(),
        actor: "system",
        notes: swapNotesText,
        created_by: getCurrentUserDisplay(c),
      });

    if (swapEventError) {
      console.log("Error creating rental_event for swap:", swapEventError);
    }

    console.log(`Swap completed. RentalItem: ${rentalItemId}, Old: ${swapOldSku} ($${swapOldTotalPrice}), New: ${swapNewSku} ($${swapNewTotalPrice}), Credit deferred to checkout (calculated: ${creditAdjustment >= 0 ? '+' : ''}$${creditAdjustment})`);

    return c.json({
      success: true,
      rentalItemId,
      oldItemId: swapItem.item_id,
      newItemId,
      oldUnitPrice: swapOldTotalPrice,
      newUnitPrice: swapNewTotalPrice,
      priceDifference: swapNewTotalPrice - swapOldTotalPrice,
      creditAdjustment: 0, // Credit is now deferred to checkout (conversion or cancellation)
      totalSwapCredit: 0, // Deferred — will be handled at checkout time
      originalReservationPrice,
    });
  } catch (error: any) {
    console.log("Error swapping item:", error);
    return c.json({ error: `Failed to swap item: ${error?.message || String(error)}` }, 500);
  }
});
}
