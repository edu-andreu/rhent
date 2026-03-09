import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";
import * as kv from "../kv_store.ts";
import { getCurrentOpenDrawer } from "../helpers/validation.ts";
import { getGMT3DateString } from "../helpers/calculations.ts";
import { allocatePaymentToItems } from "../helpers/paymentAllocation.ts";

export function registerCheckoutRoutes(
  app: Hono,
  supabase: SupabaseClient,
  validateDateNotWeekendOrHoliday: (dateStr: string, dateType: 'start' | 'end') => Promise<{ valid: boolean; error?: string }>,
) {

  const supabaseUrl = Deno.env.get("SUPABASE_URL");

// POST checkout - Create rental with items and split payments
app.post("/make-server-918f1e54/checkout", async (c) => {
  try {
    const body = await c.req.json();
    const { cartItems, payments, discount, customerId, creditApplied: creditAppliedRaw } = body;
    const creditApplied = Math.round(parseFloat(creditAppliedRaw) || 0);

    // Validate input
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return c.json({ error: "Cart items are required" }, 400);
    }

    const paymentsList = Array.isArray(payments) ? payments : [];
    if (paymentsList.length === 0 && creditApplied < 0.01) {
      return c.json({ error: "Payment information or store credit is required" }, 400);
    }

    if (!customerId || typeof customerId !== "string" || customerId.trim() === "") {
      return c.json({ error: "Customer ID is required" }, 400);
    }

    const currentUser = getCurrentUserDisplay(c);

    // DRAWER VALIDATION - Only check if cash payment is being used
    let openDrawer: any = null;
    
    if (paymentsList.length > 0) {
      // Get payment method IDs from the payments array
      const paymentMethodIds = paymentsList.map((p: any) => p.methodId).filter(Boolean);
      console.log('🔍 [CHECKOUT] Drawer validation - paymentMethodIds:', paymentMethodIds);
      
      if (paymentMethodIds.length > 0) {
        // Fetch payment methods to check payment_type
        const { data: paymentMethodsData, error: pmError } = await supabase
          .from("payments_methods")
          .select("id, payment_type")
          .in("id", paymentMethodIds);

        console.log('🔍 [CHECKOUT] Drawer validation - paymentMethodsData:', paymentMethodsData);
        console.log('🔍 [CHECKOUT] Drawer validation - pmError:', pmError);

        if (!pmError && paymentMethodsData) {
          // Check if any payment method has payment_type = 'cash'
          const hasCashPayment = paymentMethodsData.some((pm: any) => pm.payment_type === 'cash');
          console.log('🔍 [CHECKOUT] Drawer validation - hasCashPayment:', hasCashPayment);

          if (hasCashPayment) {
            // Only validate drawer if cash is being used
            openDrawer = await getCurrentOpenDrawer(supabase);
            console.log('🔍 [CHECKOUT] Open drawer found:', openDrawer ? `ID: ${openDrawer.drawer_id}` : 'NONE');
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
            console.log('✅ [CHECKOUT] Drawer validation - SKIPPED (no cash payments)');
          }
        }
      } else {
        console.log('🔍 [CHECKOUT] Drawer validation - SKIPPED (no methodIds found)');
      }
    } else {
      console.log('🔍 [CHECKOUT] Drawer validation - SKIPPED (no payments or not array)');
    }

    // Calculate total amount from cart
    const cartTotal = cartItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const paymentsTotal = paymentsList.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Calculate expected total after discount
    let expectedTotal = cartTotal;
    if (discount && discount.value > 0) {
      const discountAmount = discount.type === 'percentage' 
        ? (cartTotal * discount.value / 100)
        : Math.min(discount.value, cartTotal);
      expectedTotal = Math.max(0, cartTotal - discountAmount);
    }
    const expectedTotalAfterCredit = Math.max(0, expectedTotal - creditApplied);

    // Fetch down payment configuration for minimum payment validation
    let rentDownPct = 50;
    let resDownPct = 25;
    
    try {
      const [rentDpRaw, resDpRaw] = await Promise.all([
        kv.get("config_rent_down_payment"),
        kv.get("config_reservation_down_payment")
      ]);
      console.log("🔍 Checkout: Reading down payment config from KV - rent:", rentDpRaw, "reservation:", resDpRaw);
      rentDownPct = parseFloat(rentDpRaw as string) || 50;
      resDownPct = parseFloat(resDpRaw as string) || 25;
      console.log("🔍 Checkout: Parsed down payment percentages - rent:", rentDownPct, "reservation:", resDownPct);

      // Safety: auto-correct if values are swapped (reservation must be < rent)
      if (resDownPct > rentDownPct) {
        console.log(`⚠️ Checkout: detected swapped down payment config (rent=${rentDownPct}%, res=${resDownPct}%). Auto-swapping for this request and fixing KV.`);
        const temp = rentDownPct;
        rentDownPct = resDownPct;
        resDownPct = temp;
        console.log(`🔄 Checkout: After swap - rent=${rentDownPct}%, res=${resDownPct}%`);
        // Also fix in KV for future requests
        await kv.mset(
          ["config_rent_down_payment", "config_reservation_down_payment"],
          [String(rentDownPct), String(resDownPct)]
        );
        console.log(`✅ Checkout: Swapped values saved back to KV`);
      } else {
        console.log(`✅ Checkout: Down payment config is correct (rent=${rentDownPct}%, res=${resDownPct}%)`);
      }
    } catch (kvError) {
      console.log("⚠️ KV error fetching down payment config, using defaults:", kvError);
      // Continue with default values
    }

    // Compute minimum required down payment per item type
    // Uses Math.round() to match frontend (CheckoutDialog) rounding — no decimals
    const rentalSubtotal = cartItems
      .filter((item: any) => item.type === 'rental')
      .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const reservationSubtotal = cartItems
      .filter((item: any) => item.type === 'reservation')
      .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    // Sales require 100% payment upfront
    const saleSubtotal = cartItems
      .filter((item: any) => item.type === 'sale')
      .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const discountRatio = cartTotal > 0 ? expectedTotal / cartTotal : 0;
    const rentalMinimum = Math.round(rentalSubtotal * rentDownPct / 100 * discountRatio);
    const reservationMinimum = Math.round(reservationSubtotal * resDownPct / 100 * discountRatio);
    const saleMinimum = Math.round(saleSubtotal * discountRatio); // 100% for sales
    const minimumRequired = rentalMinimum + reservationMinimum + saleMinimum;

    // Validate payment + credit: must not exceed total
    if (paymentsTotal + creditApplied > expectedTotal + 0.01) {
      return c.json({ 
        error: `Payment total (${paymentsTotal})${creditApplied > 0 ? ` + store credit (${creditApplied})` : ''} exceeds expected total (${expectedTotal}). Cart total: ${cartTotal}${discount ? `, Discount: ${discount.type === 'percentage' ? discount.value + '%' : '$' + discount.value}` : ''}` 
      }, 400);
    }

    // Validate payment + credit: must meet minimum down payment (minimum applies to amount due before credit)
    const totalCoverage = paymentsTotal + creditApplied;
    if (totalCoverage < minimumRequired - 0.01) {
      return c.json({ 
        error: `Payment total (${paymentsTotal})${creditApplied > 0 ? ` + store credit (${creditApplied})` : ''} is below the minimum down payment required (${minimumRequired}). Rentals: ${rentDownPct}%, Reservations: ${resDownPct}%` 
      }, 400);
    }

    // If store credit applied, verify customer has sufficient balance
    if (creditApplied > 0.01) {
      const { data: custRow, error: custErr } = await supabase
        .from("customers")
        .select("credit_balance")
        .eq("customer_id", customerId)
        .single();
      if (custErr || !custRow) {
        return c.json({ error: "Failed to verify customer store credit" }, 400);
      }
      const balance = parseFloat((custRow as any).credit_balance || "0");
      if (balance < creditApplied - 0.01) {
        return c.json({ error: `Customer store credit (${balance}) is less than amount to apply (${creditApplied})` }, 400);
      }
    }

    // Calculate discount percentage and notes
    let discountPercent = 0;
    let discountNotes = null;
    
    if (discount && discount.value > 0) {
      const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      
      if (discount.type === 'percentage') {
        discountPercent = discount.value;
        discountNotes = `Discount: ${discount.value}% applied`;
      } else if (discount.type === 'fixed') {
        // Convert fixed amount to percentage
        discountPercent = (discount.value / subtotal) * 100;
        discountNotes = `Discount: $${discount.value} (${discountPercent.toFixed(2)}% equivalent)`;
      }
      
      // Append reason if provided
      if (discount.reason) {
        discountNotes += ` - Reason: ${discount.reason}`;
      }
    }

    // Get current timestamp in GMT-3 (Argentina timezone)
    const nowUTC = new Date();
    const nowGMT3 = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
    const todayGMT3 = new Date(nowGMT3.getFullYear(), nowGMT3.getMonth(), nowGMT3.getDate());

    // Location ID for "Alquilado"
    const ALQUILADO_LOCATION_ID = "ca1c8acf-2c53-41bd-838a-35de029ac145";

    // Step 1: Create rental record
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .insert({
        customer_id: customerId,
        status: "open",
        channel: "POS",
        discount_percent: discountPercent,
        notes: discountNotes,
        created_by: currentUser,
      })
      .select("id")
      .single();

    if (rentalError || !rental) {
      console.log("Error creating rental:", rentalError);
      return c.json({ error: `Failed to create rental: ${rentalError?.message}` }, 500);
    }

    const rentalId = rental.id;
    const rentalItemIds: string[] = [];
    const rentalItemSubtotals: { id: string; subtotal: number }[] = [];
    const paymentIds: string[] = [];

    // Get customer name for drawer transaction descriptions
    const { data: customer } = await supabase
      .from("customers")
      .select("first_name, last_name")
      .eq("customer_id", customerId)
      .single();
    const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "Unknown Customer";

    // Step 2: Validate dates before processing (skip for sale items — they don't have rental periods)
    console.log(`Validating dates for ${cartItems.length} cart items...`);
    for (const item of cartItems) {
      if (item.type === 'sale') {
        console.log(`⏭️  Skipping date validation for sale item: ${item.dress?.sku || 'unknown'}`);
        continue;
      }
      // Validate start date is not weekend/holiday
      const startValidation = await validateDateNotWeekendOrHoliday(item.startDate, 'start');
      if (!startValidation.valid) {
        return c.json({ 
          error: startValidation.error,
          errorType: "invalid_date"
        }, 400);
      }
      
      // Validate end date is not weekend/holiday
      const endValidation = await validateDateNotWeekendOrHoliday(item.endDate, 'end');
      if (!endValidation.valid) {
        return c.json({ 
          error: endValidation.error,
          errorType: "invalid_date"
        }, 400);
      }
    }
    console.log('✅ Date validation passed');

    // Step 3: Create rental_items for each cart item
    console.log(`Processing ${cartItems.length} cart items. Today (GMT-3): ${todayGMT3.toISOString()}`);
    
    // Location IDs for sale items
    const VENDIDO_LOCATION_ID = "e8f3c5d1-4a2b-4c3d-9e1f-2b5a6c7d8e9f";

    // Collect per-item notes for drawer transaction (Rent/Reserve/Sold)
    const drawerItemNotes: string[] = [];

    for (const item of cartItems) {
      let status: string;
      let checkedOutAt: string | null = null;
      let shouldUpdateLocation = false;
      let isSale = false;

      console.log(`Processing item: ${item.dress.sku}, type: ${item.type}, startDate: ${item.startDate}`);

      // Determine status based on type and dates
      if (item.type === "sale") {
        // Sale item — immediately completed, no return expected
        status = "completed";
        checkedOutAt = null;
        isSale = true;
        // Only update location to "Vendido" for stock-tracked products (not services)
        shouldUpdateLocation = item.dress.isStockTracked === true;
        console.log(`🛒 Processing SALE: ${item.dress.sku}, price: ${item.amount}, stockTracked: ${item.dress.isStockTracked}`);
      } else if (item.type === "reservation") {
        // Explicit reservation
        status = "reserved";
        checkedOutAt = null;
        shouldUpdateLocation = false;
      } else if (item.type === "rental") {
        // Compare start date with today (GMT-3)
        const startDate = new Date(item.startDate);
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        console.log(`Rental item: startDate=${startDate.toISOString()}, startDateOnly=${startDateOnly.toISOString()}, todayGMT3=${todayGMT3.toISOString()}`);

        if (startDateOnly <= todayGMT3) {
          // Same day or past rental - item is being taken now
          status = "checked_out";
          checkedOutAt = nowUTC.toISOString();
          shouldUpdateLocation = true;
          console.log(`✅ Item will be CHECKED OUT and location updated to Alquilado`);
        } else {
          // Future rental - reserved for later pickup
          status = "reserved";
          checkedOutAt = null;
          shouldUpdateLocation = false;
          console.log(`📅 Item will be RESERVED for future date (no location update)`);
        }
      } else {
        console.log(`Unknown item type: ${item.type}`);
        return c.json({ error: `Unknown item type: ${item.type}` }, 400);
      }

      // Build per-item drawer note: Sold / Reserve / Rent
      if (isSale) {
        drawerItemNotes.push(`Sold - ${item.dress.name}`);
      } else if (status === 'reserved') {
        drawerItemNotes.push(`Reserve - ${item.dress.name}`);
      } else {
        drawerItemNotes.push(`Rent - ${item.dress.name}`);
      }

      // Calculate item-level pricing components
      const itemStandardPrice = item.standardPrice ?? item.amount; // Base price without extras
      const itemExtraDays = isSale ? 0 : (item.extraDays || 0);
      const itemExtraDaysAmount = isSale ? 0 : (item.extraDaysTotal || 0);
      
      // Calculate item-level discount (proportional from rental-level discount)
      // Discount applies to the item subtotal (base price + extra days)
      const itemSubtotal = itemStandardPrice + itemExtraDaysAmount;
      const itemDiscountAmount = discountPercent > 0 
        ? Math.round(itemSubtotal * (discountPercent / 100))
        : 0;

      // For sales, start_date = end_date = today (sale date)
      const saleDateStr = `${todayGMT3.getFullYear()}-${String(todayGMT3.getMonth() + 1).padStart(2, '0')}-${String(todayGMT3.getDate()).padStart(2, '0')}`;
      const itemStartDate = isSale ? saleDateStr : (item.startDate || item.reservationDate);
      const itemEndDate = isSale ? saleDateStr : (item.endDate || item.reservationDate);

      // Insert rental_item with separated price components
      const { data: rentalItem, error: rentalItemError } = await supabase
        .from("rental_items")
        .insert({
          rental_id: rentalId,
          item_id: item.dress.id,
          start_date: itemStartDate,
          end_date: itemEndDate,
          unit_price: itemStandardPrice, // Store ONLY the base price (without extra days) or sale price
          extra_days: itemExtraDays,
          extra_days_amount: itemExtraDaysAmount,
          discount_amount: itemDiscountAmount,
          deposit_amount: 0,
          status: status,
          checked_out_at: checkedOutAt,
          return_condition: null,
          late_days: 0,
          late_fee_amount: 0,
          alteration_notes: item.alterationNotes || null,
          is_sale: isSale,
          created_by: currentUser,
        })
        .select("id")
        .single();

      if (rentalItemError || !rentalItem) {
        console.log("Error creating rental_item:", rentalItemError);
        // Rollback: delete the rental record
        await supabase.from("rentals").delete().eq("id", rentalId);
        
        // Provide user-friendly error message for booking conflicts
        if (rentalItemError?.message?.includes("no_overlapping_bookings")) {
          return c.json({ 
            error: `This item is already booked for some of the selected dates. Please choose different dates or check the calendar for availability.`,
            errorType: "booking_conflict"
          }, 400);
        }

        // Catch insufficient stock errors from the reduce_stock_on_sale trigger
        if (rentalItemError?.message?.includes("Insufficient stock") || rentalItemError?.message?.includes("stock")) {
          return c.json({ 
            error: `One or more items are out of stock. Please remove them and try again.`,
            errorType: "out_of_stock",
            details: rentalItemError.message
          }, 400);
        }
        
        return c.json({ error: `Failed to create rental item: ${rentalItemError?.message}` }, 500);
      }

      rentalItemIds.push(rentalItem.id);

      // Upfront cap: the maximum this item should absorb during payment allocation.
      // Sales require 100%, reservations use resDownPct, rentals use rentDownPct.
      const itemAfterDiscount = itemSubtotal - itemDiscountAmount;
      const upfrontPct = isSale ? 100 : status === 'reserved' ? resDownPct : rentDownPct;
      const itemUpfrontCap = Math.round(itemAfterDiscount * upfrontPct / 100);
      rentalItemSubtotals.push({ id: rentalItem.id, subtotal: itemUpfrontCap });

      // Update inventory location if item is checked out or sold
      if (shouldUpdateLocation) {
        const targetLocationId = isSale ? VENDIDO_LOCATION_ID : ALQUILADO_LOCATION_ID;
        const targetLocationName = isSale ? "Vendido" : "Alquilado";
        console.log(`🔄 Updating location for item ${item.dress.sku} (ID: ${item.dress.id}) to ${targetLocationName} (${targetLocationId})`);
        
        const { data: updateData, error: updateError } = await supabase
          .from("inventory_items")
          .update({ 
            location_id: targetLocationId,
            updated_by: currentUser,
            updated_at: nowUTC.toISOString(),
          })
          .eq("id", item.dress.id)
          .select("id, sku, location_id");

        if (updateError) {
          console.log(`❌ ERROR: Failed to update location for item ${item.dress.id}:`, updateError);
          // Continue - don't fail the whole transaction for location update
        } else {
          console.log(`✅ Successfully updated location:`, updateData);
        }
      } else {
        console.log(`⏭️  Skipping location update for item ${item.dress.sku} (shouldUpdateLocation=false)`);
      }
    }

    // Step 3: Create payment records split across rental items (waterfall: each payment fills items in order)
    const remainingSubtotals = rentalItemSubtotals.map((s) => ({ id: s.id, subtotal: s.subtotal }));
    for (const payment of paymentsList) {
      const allocations = allocatePaymentToItems(payment.amount, remainingSubtotals);
      let firstPaymentId: string | null = null;

      for (const alloc of allocations) {
        const { data: paymentRecord, error: paymentError } = await supabase
          .from("payments")
          .insert({
            rental_id: rentalId,
            rental_item_id: alloc.rentalItemId,
            payment_method_id: payment.methodId,
            amount: alloc.amount,
            currency: "ARS",
            paid_at: nowUTC.toISOString(),
            reference: null,
            created_by: currentUser,
          })
          .select("id")
          .single();

        if (paymentError || !paymentRecord) {
          console.log("Error creating payment:", paymentError);
          await supabase.from("rentals").delete().eq("id", rentalId);
          return c.json({ error: `Failed to create payment record: ${paymentError?.message}` }, 500);
        }

        paymentIds.push(paymentRecord.id);
        if (!firstPaymentId) firstPaymentId = paymentRecord.id;
        // Waterfall: reduce remaining subtotal for this item so next payment doesn't over-allocate
        const rem = remainingSubtotals.find((r) => r.id === alloc.rentalItemId);
        if (rem) rem.subtotal = Math.round((rem.subtotal - alloc.amount) * 100) / 100;
      }

      // Create one drawer transaction per payment method (using the full amount)
      console.log(`💳 [CHECKOUT] Creating drawer transaction - openDrawer exists: ${!!openDrawer}, payment: ${payment.methodName}, amount: ${payment.amount}`);
      
      if (openDrawer && firstPaymentId) {
        const transactionDesc = `${customerName} | ${drawerItemNotes.join(' ; ')}`;

        const { data: drawerTxnData, error: drawerTxnError } = await supabase
          .from("drawer_transactions")
          .insert({
            drawer_txn_id: crypto.randomUUID(),
            drawer_id: openDrawer.drawer_id,
            payment_id: firstPaymentId,
            txn_type: "checkout",
            method: payment.methodName,
            amount: payment.amount,
            description: transactionDesc,
            reference: rentalId,
            created_by: currentUser,
          })
          .select();

        if (drawerTxnError) {
          console.log("❌ [CHECKOUT] Error creating drawer transaction:", drawerTxnError.message || JSON.stringify(drawerTxnError));
        } else {
          console.log(`✅ [CHECKOUT] Drawer transaction created - ID: ${drawerTxnData?.[0]?.drawer_txn_id}`);
        }
      } else if (!openDrawer) {
        console.log(`⚠️ [CHECKOUT] Skipping drawer transaction - no open drawer`);
      }
    }

    // Step 3b: If store credit was applied, create Store Credit payment and deduct from customer balance
    if (creditApplied > 0.01 && rentalItemIds.length > 0) {
      const { data: storeCreditMethod, error: scMethodError } = await supabase
        .from("payments_methods")
        .select("id, payment_method")
        .ilike("payment_method", "Store Credit")
        .single();

      if (scMethodError || !storeCreditMethod) {
        console.log("Error finding Store Credit payment method:", scMethodError);
        await supabase.from("rentals").delete().eq("id", rentalId);
        return c.json({ error: "Store Credit payment method not found. Please create it in payment methods." }, 500);
      }

      const firstRentalItemId = rentalItemIds[0];
      const { data: creditPaymentRecord, error: creditPaymentError } = await supabase
        .from("payments")
        .insert({
          rental_id: rentalId,
          rental_item_id: firstRentalItemId,
          payment_method_id: (storeCreditMethod as any).id,
          amount: creditApplied,
          currency: "ARS",
          paid_at: nowUTC.toISOString(),
          reference: "store-credit-applied",
          created_by: currentUser,
        })
        .select("id")
        .single();

      if (creditPaymentError || !creditPaymentRecord) {
        console.log("Error creating store credit payment:", creditPaymentError);
        await supabase.from("rentals").delete().eq("id", rentalId);
        return c.json({ error: `Failed to create store credit payment: ${creditPaymentError?.message}` }, 500);
      }
      paymentIds.push((creditPaymentRecord as any).id);

      const { data: custRow2, error: custUpdateErr } = await supabase
        .from("customers")
        .select("credit_balance")
        .eq("customer_id", customerId)
        .single();

      if (custUpdateErr || !custRow2) {
        console.log("Error fetching customer for credit deduction:", custUpdateErr);
      } else {
        const currentBalance = parseFloat((custRow2 as any).credit_balance || "0");
        const newBalance = currentBalance - creditApplied;
        const { error: updateErr } = await supabase
          .from("customers")
          .update({
            credit_balance: newBalance,
            updated_at: nowUTC.toISOString(),
          })
          .eq("customer_id", customerId);
        if (updateErr) {
          console.log("Error updating customer credit balance:", updateErr);
        } else {
          console.log(`Checkout: applied store credit ${creditApplied}; customer balance ${currentBalance} -> ${newBalance}`);
        }
      }
    }

    console.log(`Checkout completed successfully. Rental ID: ${rentalId}, Items: ${rentalItemIds.length}, Payments: ${paymentIds.length}`);

    return c.json({
      success: true,
      rentalId: rentalId,
      rentalItemIds: rentalItemIds,
      paymentIds: paymentIds,
    }, 201);

  } catch (error: any) {
    console.log("Unexpected error during checkout:", error);
    return c.json({ error: `Unexpected error during checkout: ${error?.message || String(error)}` }, 500);
  }
});
// GET sale items - fetch only items available for sale (products and services)
app.get("/make-server-918f1e54/sale-items", async (c) => {
  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        id,
        sku,
        description,
        is_for_sale,
        sale_price,
        stock_quantity,
        is_stock_tracked,
        low_stock_threshold,
        status,
        category:category_id (id, category, default_image),
        subcategory:subcategory_id (id, subcategory),
        brand:brand_id (id, brand),
        name:name_id (id, name),
        size:size_id (id, size),
        color:color_id (id, color),
        location:location_id (id, location, badge_class, availability_status),
        inventory_item_colors (
          color:color_id (color)
        )
      `)
      .eq("is_for_sale", true)
      .eq("status", "On")
      .order("stock_quantity", { ascending: true });

    if (error) {
      console.log("Error fetching sale items:", error);
      return c.json({ error: `Failed to fetch sale items: ${error.message}` }, 500);
    }

    // Filter out out-of-stock products (but keep services which have unlimited availability)
    const availableItems = (data || []).filter((item: any) => {
      if (item.is_stock_tracked) {
        return item.stock_quantity > 0; // Products must have stock
      }
      return true; // Services are always available
    });

    // Map to frontend format
    const items = await Promise.all(availableItems.map(async (item: any) => {
      // Image URL
      const bucketName = 'photos';
      let imageUrl = "";
      const { data: files } = await supabase.storage
        .from(bucketName)
        .list('', { search: item.id });
      if (files && files.length > 0) {
        const { data: signedUrlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(files[0].name, 31536000);
        if (signedUrlData) imageUrl = signedUrlData.signedUrl;
      } else if (item.category?.default_image && item.category.default_image.trim() !== "") {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${item.category.default_image}`;
      }

      const colors = item.inventory_item_colors && item.inventory_item_colors.length > 0
        ? item.inventory_item_colors.map((ic: any) => ic.color?.color).filter(Boolean)
        : [item.color?.color].filter(Boolean);

      return {
        id: item.id,
        name: item.name?.name || item.sku || "Unnamed Item",
        sku: item.sku,
        description: item.description || "",
        size: item.size?.size || "",
        colors: colors,
        imageUrl: imageUrl,
        category: item.category?.category || "",
        categoryType: item.category?.category?.toLowerCase() === 'extras' ? 'service' : 'product',
        type: item.subcategory?.subcategory || "",
        brand: item.brand?.brand || "",
        isForSale: true,
        salePrice: item.sale_price ? parseFloat(item.sale_price) : 0,
        stockQuantity: item.stock_quantity ?? 1,
        isStockTracked: item.is_stock_tracked || false,
        lowStockThreshold: item.low_stock_threshold ?? 5,
        status: item.location?.location || "",
        statusBadgeClass: item.location?.badge_class || "text-bg-light",
        availabilityStatus: item.location?.availability_status || "",
      };
    }));

    return c.json({ items });
  } catch (error: any) {
    console.log("Unexpected error fetching sale items:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// GET low stock alerts - products that need restocking
app.get("/make-server-918f1e54/low-stock-alerts", async (c) => {
  try {
    const { data, error } = await supabase
      .from("v_low_stock_products")
      .select("*")
      .order("stock_quantity", { ascending: true });

    if (error) {
      console.log("Error fetching low stock alerts:", error);
      return c.json({ error: `Failed to fetch low stock alerts: ${error.message}` }, 500);
    }

    return c.json({
      lowStockItems: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.log("Unexpected error fetching low stock alerts:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// GET sales history - view completed sales transactions
app.get("/make-server-918f1e54/sales-history", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");

    const { data, error } = await supabase
      .from("v_sales_summary")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.log("Error fetching sales history:", error);
      return c.json({ error: `Failed to fetch sales history: ${error.message}` }, 500);
    }

    return c.json({
      sales: data || [],
      count: data?.length || 0,
      offset,
      limit,
    });
  } catch (error: any) {
    console.log("Unexpected error fetching sales history:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// POST check availability - validate if an item can be sold before adding to cart
app.post("/make-server-918f1e54/check-availability", async (c) => {
  try {
    const body = await c.req.json();
    const { itemId } = body;

    if (!itemId) {
      return c.json({ error: "itemId is required" }, 400);
    }

    const { data, error } = await supabase
      .rpc("check_sale_availability", { p_item_id: itemId });

    if (error) {
      console.log("Error checking sale availability:", error);
      return c.json({ error: `Failed to check availability: ${error.message}` }, 500);
    }

    if (!data || data.length === 0) {
      return c.json({ error: "Item not found" }, 404);
    }

    const result = data[0];
    return c.json({
      available: result.available,
      reason: result.reason,
      currentStock: result.current_stock,
    });
  } catch (error: any) {
    console.log("Unexpected error checking availability:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
// POST restock - update stock quantity for a product
app.post("/make-server-918f1e54/restock", async (c) => {
  try {
    const body = await c.req.json();
    const { itemId, newQuantity } = body;

    if (!itemId || newQuantity === undefined) {
      return c.json({ error: "itemId and newQuantity are required" }, 400);
    }

    if (newQuantity < 0) {
      return c.json({ error: "newQuantity must be non-negative" }, 400);
    }

    // Verify item exists and is a product
    const { data: item, error: fetchError } = await supabase
      .from("inventory_items")
      .select("is_stock_tracked, stock_quantity, sku")
      .eq("id", itemId)
      .single();

    if (fetchError || !item) {
      return c.json({ error: "Item not found" }, 404);
    }

    if (!item.is_stock_tracked) {
      return c.json({ error: "Cannot restock services (they have unlimited availability)" }, 400);
    }

    const previousQuantity = item.stock_quantity;

    // Update stock
    const currentUser = getCurrentUserDisplay(c);
    const { data: updated, error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString(),
        updated_by: currentUser,
      })
      .eq("id", itemId)
      .select("id, sku, stock_quantity")
      .single();

    if (updateError) {
      console.log("Error updating stock:", updateError);
      return c.json({ error: `Failed to update stock: ${updateError.message}` }, 500);
    }

    console.log(`✅ Restocked ${item.sku}: ${previousQuantity} → ${newQuantity}`);

    return c.json({
      success: true,
      item: updated,
      message: `Stock updated from ${previousQuantity} to ${newQuantity}`,
    });
  } catch (error: any) {
    console.log("Unexpected error restocking:", error);
    return c.json({ error: `Unexpected error: ${error.message}` }, 500);
  }
});
}
