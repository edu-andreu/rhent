import * as kv from "./kv_store.ts";
import { getCurrentUserDisplay } from "./helpers/auth.ts";
import { validateConversionPayments } from "./helpers/conversionValidation.ts";

const ALQUILADO_LOCATION_ID = "ca1c8acf-2c53-41bd-838a-35de029ac145";

export function registerReservationConversionRoutes(
  app: any, 
  supabase: any, 
  getCurrentOpenDrawer: any, 
  getGMT3DateString: any,
  validateDateNotWeekendOrHoliday: any
) {

  // GET reservation checkout details
  app.get("/make-server-918f1e54/reservations/checkout-details/:rentalItemId", async (c) => {
    try {
      const rentalItemId = c.req.param("rentalItemId");

      const { data: rentalItem, error: riError } = await supabase
        .from("rental_items")
        .select(`
          id,
          rental_id,
          item_id,
          start_date,
          end_date,
          unit_price,
          status,
          extra_days,
          extra_days_amount,
          inventory_items (
            id, sku, curr_price, description,
            name:name_id ( name ),
            category:category_id ( category, default_image ),
            subcategory:subcategory_id ( subcategory ),
            brand:brand_id ( brand ),
            size:size_id ( size ),
            inventory_item_colors ( color:color_id ( color ) )
          ),
          rentals (
            id, customer_id, status, discount_percent, notes,
            customers ( customer_id, first_name, last_name, phone, email )
          )
        `)
        .eq("id", rentalItemId)
        .single();

      if (riError || !rentalItem) {
        console.log("Error fetching rental item for reservation checkout:", riError);
        return c.json({ error: "Rental item not found: " + (riError?.message || "Not found") }, 404);
      }

      const item = rentalItem as any;

      if (item.status !== "reserved") {
        return c.json({ error: "Item is not reserved. Current status: " + item.status }, 400);
      }

      const rentalId = item.rental_id;

      const { data: totals, error: totalsError } = await supabase
        .from("v_rental_totals")
        .select("*")
        .eq("rental_id", rentalId)
        .single();

      if (totalsError) {
        console.log("Error fetching rental totals for reservation checkout:", totalsError);
        return c.json({ error: "Failed to fetch rental totals: " + totalsError.message }, 500);
      }

      const { data: allItems, error: allItemsError } = await supabase
        .from("rental_items")
        .select(`
          id, item_id, unit_price, extra_days, extra_days_amount, discount_amount,
          status, start_date, end_date, deposit_amount, is_sale,
          inventory_items (
            id, sku,
            name:name_id ( name ),
            category:category_id ( category, default_image ),
            size:size_id ( size )
          )
        `)
        .eq("rental_id", rentalId);

      if (allItemsError) {
        console.log("Error fetching all rental items for reservation checkout:", allItemsError);
      }

      // Get image
      const bucketName = "photos";
      const sUrl = Deno.env.get("SUPABASE_URL");
      let imageUrl = "";
      const { data: files } = await supabase.storage
        .from(bucketName)
        .list("", { search: item.item_id });

      if (files && files.length > 0) {
        const { data: signedUrlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(files[0].name, 31536000);
        if (signedUrlData) {
          imageUrl = signedUrlData.signedUrl;
        }
      } else if (item.inventory_items?.category?.default_image) {
        imageUrl = sUrl + "/storage/v1/object/public/photos/" + item.inventory_items.category.default_image;
      }

      const customer = item.rentals?.customers;
      const colors = item.inventory_items?.inventory_item_colors
        ?.map((ic: any) => ic.color?.color)
        .filter(Boolean) || [];

      // Fetch config values
      const [rentDpRaw, resDpRaw, rentalDaysRaw, extraDaysPriceRaw] = await Promise.all([
        kv.get("config_rent_down_payment"),
        kv.get("config_reservation_down_payment"),
        kv.get("config_rental_days"),
        kv.get("config_extra_days_price"),
      ]);
      let rentDownPaymentPct = parseFloat(rentDpRaw as string) || 50;
      let reservationDownPaymentPct = parseFloat(resDpRaw as string) || 25;
      const configRentalDays = parseInt(rentalDaysRaw as string || "3", 10) || 3;
      const extraDaysPricePct = parseFloat(extraDaysPriceRaw as string || "75");

      // Safety: auto-correct if values are swapped (reservation must be < rent)
      if (reservationDownPaymentPct > rentDownPaymentPct) {
        console.log(`checkout-details: detected swapped down payment config (rent=${rentDownPaymentPct}%, res=${reservationDownPaymentPct}%). Auto-swapping.`);
        const temp = rentDownPaymentPct;
        rentDownPaymentPct = reservationDownPaymentPct;
        reservationDownPaymentPct = temp;
        await kv.mset(
          ["config_rent_down_payment", "config_reservation_down_payment"],
          [String(rentDownPaymentPct), String(reservationDownPaymentPct)]
        );
      }

      // Extra days info: Use stored values from the database
      // Note: unit_price stores ONLY the base price (without extra days)
      const basePrice = parseFloat(item.unit_price) || 0;
      const extraDaysCount = item.extra_days || 0;
      const extraDaysAmount = parseFloat(item.extra_days_amount) || 0;
      
      // Calculate day rates for the UI (in case user wants to edit)
      const startDate = new Date(item.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(item.end_date);
      endDate.setHours(0, 0, 0, 0);
      const rentalPeriodMs = endDate.getTime() - startDate.getTime();
      const rentalPeriodDays = Math.max(1, Math.round(rentalPeriodMs / (1000 * 60 * 60 * 24)) + 1);
      const standardDayPrice = basePrice / configRentalDays;
      const extraDayRate = standardDayPrice * (extraDaysPricePct / 100);

      // Calculate order context for multi-item orders
      // Instead of proportional allocation (which shows a fake "Already Paid"), we return
      // actual payments and let the frontend compute order-level balance/minimum.
      const totalPaymentsForOrder = parseFloat((totals as any)?.payments_total) || 0;
      const orderGrandTotal = parseFloat((totals as any)?.grand_total) || 0;

      // Per-item payment totals
      const { data: allItemPayments } = await supabase
        .from("payments")
        .select("rental_item_id, amount")
        .eq("rental_id", rentalId);
      const thisItemPaymentsTotal = (allItemPayments || [])
        .filter((p: any) => p.rental_item_id === rentalItemId)
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

      // Calculate "other items" totals so the frontend can compute order-level values
      // even when this item's extra days or discount are edited
      let otherItemsTotal = 0;
      let otherItemsMinimum = 0;

      if (allItems && Array.isArray(allItems) && allItems.length > 1) {
        for (const oi of allItems) {
          if ((oi as any).id === item.id) continue; // skip current item
          const oiBasePrice = parseFloat((oi as any).unit_price) || 0;
          const oiExtraDays = parseFloat((oi as any).extra_days_amount) || 0;
          const oiDiscount = parseFloat((oi as any).discount_amount) || 0;
          const oiTotal = oiBasePrice + oiExtraDays - oiDiscount;
          otherItemsTotal += oiTotal;

          // Sale items require 100%, others use status-based percentage
          const isSale = (oi as any).is_sale === true;
          const isRental = (oi as any).status === 'checked_out';
          const downPct = isSale ? 100 : (isRental ? rentDownPaymentPct : reservationDownPaymentPct);
          otherItemsMinimum += Math.round(oiTotal * downPct / 100);
        }

        console.log('💰 Order context for reservation item ' + item.id + ':', {
          totalPaymentsForOrder,
          orderGrandTotal,
          otherItemsTotal,
          otherItemsMinimum,
          itemCount: allItems.length,
        });
      }

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
          unitPrice: basePrice,
          startDate: item.start_date,
          endDate: item.end_date,
        },
        customer: customer
          ? {
              id: customer.customer_id,
              name: ((customer.first_name || "") + " " + (customer.last_name || "")).trim(),
              phone: customer.phone || "",
              email: customer.email || "",
            }
          : null,
        financials: {
          rentalSubtotal: parseFloat((totals as any)?.rental_subtotal) || 0,
          extraDaysTotal: parseFloat((totals as any)?.extra_days_total) || 0,
          discountAmount: parseFloat((totals as any)?.discount_amount) || 0,
          depositsTotal: parseFloat((totals as any)?.deposits_total) || 0,
          grandTotal: parseFloat((totals as any)?.grand_total) || 0,
          paymentsTotal: totalPaymentsForOrder,
          thisItemPaymentsTotal,
          balanceDue: parseFloat((totals as any)?.balance_due) || 0,
          itemCount: parseInt((totals as any)?.item_count) || 0,
          discountPercent: parseFloat((totals as any)?.discount_percent) || 0,
          otherItemsTotal,
          otherItemsMinimum,
        },
        config: {
          rentDownPaymentPct,
          reservationDownPaymentPct,
        },
        extraDaysInfo: {
          extraDaysCount,
          extraDaysAmount,
          extraDaysPricePct,
          rentalPeriodDays,
          basePrice,
        },
        orderItems: (allItems || []).map((oi: any) => {
          const oiPayments = (allItemPayments || []).filter((p: any) => p.rental_item_id === oi.id);
          const oiPaidTotal = oiPayments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
          return {
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
            isSale: oi.is_sale === true,
            startDate: oi.start_date,
            endDate: oi.end_date,
            deposit: parseFloat(oi.deposit_amount) || 0,
            paidTotal: oiPaidTotal,
          };
        }),
      });
    } catch (error: any) {
      console.log("Unexpected error fetching reservation checkout details:", error);
      return c.json({ error: "Unexpected error: " + (error?.message || String(error)) }, 500);
    }
  });

  // POST convert reservation to rental
  app.post("/make-server-918f1e54/reservations/convert-to-rental", async (c) => {
    try {
      const body = await c.req.json();
      const { rentalItemId, rentalId, itemId, payments, creditApplied, discount, extraDays, surplusHandling } = body;

      console.log('💰 [RESERVATION CHECKOUT] creditApplied received:', creditApplied);

      if (!rentalItemId || !rentalId || !itemId) {
        return c.json({ error: "rentalItemId, rentalId, and itemId are required" }, 400);
      }

      // DRAWER VALIDATION - Only check if cash payment is being used
      let openDrawer: any = null;
      
      if (payments && Array.isArray(payments) && payments.length > 0) {
        // Get payment method IDs from the payments array
        const paymentMethodIds = payments.map((p: any) => p.methodId).filter(Boolean);
        console.log('🔍 [RESERVATION] Drawer validation - paymentMethodIds:', paymentMethodIds);
        
        if (paymentMethodIds.length > 0) {
          // Fetch payment methods to check payment_type
          const { data: paymentMethodsData, error: pmError } = await supabase
            .from("payments_methods")
            .select("id, payment_type")
            .in("id", paymentMethodIds);

          console.log('🔍 [RESERVATION] Drawer validation - paymentMethodsData:', paymentMethodsData);
          console.log('🔍 [RESERVATION] Drawer validation - pmError:', pmError);

          if (!pmError && paymentMethodsData) {
            // Check if any payment method has payment_type = 'cash'
            const hasCashPayment = paymentMethodsData.some((pm: any) => pm.payment_type === 'cash');
            console.log('🔍 [RESERVATION] Drawer validation - hasCashPayment:', hasCashPayment);

            if (hasCashPayment) {
              // Only validate drawer if cash is being used
              openDrawer = await getCurrentOpenDrawer();
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
              console.log('✅ [RESERVATION] Drawer validation - SKIPPED (no cash payments)');
            }
          }
        } else {
          console.log('🔍 [RESERVATION] Drawer validation - SKIPPED (no methodIds found)');
        }
      } else {
        console.log('🔍 [RESERVATION] Drawer validation - SKIPPED (no payments or not array)');
      }

      // Also check if surplus refund method is cash (when no cash payments but cash refund is requested)
      if (!openDrawer && surplusHandling && surplusHandling.type === 'refund' && surplusHandling.refundMethodId) {
        const { data: refundPmData, error: refundPmError } = await supabase
          .from("payments_methods")
          .select("id, payment_type")
          .eq("id", surplusHandling.refundMethodId)
          .single();

        if (!refundPmError && refundPmData && (refundPmData as any).payment_type === 'cash') {
          console.log('🔍 [RESERVATION] Drawer validation - cash refund detected, validating drawer');
          openDrawer = await getCurrentOpenDrawer();
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

      const { data: rentalItem, error: riError } = await supabase
        .from("rental_items")
        .select("id, status, rental_id, unit_price")
        .eq("id", rentalItemId)
        .single();

      if (riError || !rentalItem) {
        return c.json({ error: "Rental item not found: " + (riError?.message || "Not found") }, 404);
      }

      if ((rentalItem as any).status !== "reserved") {
        return c.json({ error: "Cannot convert item with status '" + (rentalItem as any).status + "'. Expected 'reserved'." }, 400);
      }

      // Fetch the rental to get customer_id for potential overpayment credit
      const { data: rental, error: rentalError } = await supabase
        .from("rentals")
        .select("id, customer_id")
        .eq("id", rentalId)
        .single();

      if (rentalError) {
        console.log("Error fetching rental for reservation conversion:", rentalError);
        // Non-fatal — continue without customer reference for credit
      }

      const customerId = (rental as any)?.customer_id || null;

      // Handle Discount update if provided — per-item only
      if (discount) {
        const { data: currentItemData } = await supabase
          .from("rental_items")
          .select("unit_price, extra_days_amount")
          .eq("id", rentalItemId)
          .single();

        if (currentItemData) {
          const itemSubtotal = (parseFloat((currentItemData as any).unit_price) || 0) + (parseFloat((currentItemData as any).extra_days_amount) || 0);

          let itemDiscountAmount = 0;
          if (discount.type === 'percentage') {
            itemDiscountAmount = Math.round(itemSubtotal * (discount.value / 100));
          } else if (discount.type === 'fixed') {
            itemDiscountAmount = Math.min(Math.round(discount.value), itemSubtotal);
          }

          const { error: updateItemError } = await supabase
            .from("rental_items")
            .update({
              discount_amount: itemDiscountAmount,
              updated_by: getCurrentUserDisplay(c),
            })
            .eq("id", rentalItemId);

          if (updateItemError) {
            console.log(`Error updating discount_amount for item ${rentalItemId}:`, updateItemError);
          }
          console.log(`Updated discount_amount for item ${rentalItemId} during reservation conversion: ${itemDiscountAmount}`);
        }
      }

      // Handle Extra Days update if provided (store in database)
      if (extraDays && extraDays.days !== undefined) {
        const { error: updateExtraDaysError } = await supabase
          .from("rental_items")
          .update({
            extra_days: extraDays.days,
            extra_days_amount: extraDays.amount || 0,
            updated_by: getCurrentUserDisplay(c),
          })
          .eq("id", rentalItemId);

        if (updateExtraDaysError) {
          console.log("Error updating extra days during reservation conversion:", updateExtraDaysError);
          return c.json({ error: "Failed to update extra days: " + updateExtraDaysError.message }, 500);
        }
        console.log(`Updated extra days for rental item ${rentalItemId}: ${extraDays.days} days, amount: ${extraDays.amount}`);

        // Recalculate discount_amount for the current item only after extra days change
        const { data: currentItemForDiscount } = await supabase
          .from("rental_items")
          .select("unit_price, extra_days_amount, discount_amount")
          .eq("id", rentalItemId)
          .single();

        if (currentItemForDiscount) {
          const oldDiscount = parseFloat((currentItemForDiscount as any).discount_amount) || 0;
          if (oldDiscount > 0) {
            const oldSubtotal = (parseFloat((currentItemForDiscount as any).unit_price) || 0);
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

      // Fetch updated rental totals (now includes stored extra days)
      const { data: totals, error: totalsError } = await supabase
        .from("v_rental_totals")
        .select("grand_total, payments_total, balance_due")
        .eq("rental_id", rentalId)
        .single();

      if (totalsError) {
        console.log("Error fetching rental totals for reservation conversion:", totalsError);
        return c.json({ error: "Failed to validate balance: " + totalsError.message }, 500);
      }

      // Order-level totals (used only for light overpayment safety)
      const grandTotal = parseFloat((totals as any)?.grand_total) || 0;
      const existingPayments = parseFloat((totals as any)?.payments_total) || 0;
      const balanceDueRaw = parseFloat((totals as any)?.balance_due) || 0;
      // Clamp to 0: when existingPayments > grandTotal the view returns negative balance_due
      const balanceDue = Math.max(0, balanceDueRaw);
      const newPaymentsTotal = (payments || []).reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0
      );
      const creditAppliedAmount = parseFloat(creditApplied) || 0;

      // Fetch config: rent and reservation down payment percentages
      const [rentDpRaw, resDpRaw] = await Promise.all([
        kv.get("config_rent_down_payment"),
        kv.get("config_reservation_down_payment"),
      ]);
      let rentDownPct = parseFloat(rentDpRaw as string) || 50;
      let resDownPct = parseFloat(resDpRaw as string) || 25;
      // Safety: auto-correct if values are swapped
      if (resDownPct > rentDownPct) {
        const temp = rentDownPct;
        rentDownPct = resDownPct;
        resDownPct = temp;
      }

      // ── Per-item validation for converting reservation item ──
      // Fetch all items so we can locate the converting item and infer its type (sale vs rental)
      const { data: allOrderItems, error: allOrderItemsError } = await supabase
        .from("rental_items")
        .select("id, unit_price, extra_days_amount, discount_amount, status, is_sale")
        .eq("rental_id", rentalId);

      if (allOrderItemsError) {
        console.log("Error fetching rental items for minimum validation:", allOrderItemsError);
      }

      const currentItem = (allOrderItems || []).find(
        (oi: any) => oi.id === rentalItemId
      );

      if (!currentItem) {
        console.log(
          `❌ [CONVERT] Could not find rental_item ${rentalItemId} when validating per-item balance`
        );
        return c.json(
          { error: "Failed to validate item balance during reservation checkout." },
          500
        );
      }

      const itemUnitPrice = parseFloat((currentItem as any).unit_price) || 0;
      const itemExtraDaysAmt =
        parseFloat((currentItem as any).extra_days_amount) || 0;
      const itemDiscountAmt =
        parseFloat((currentItem as any).discount_amount) || 0;
      const itemGrandTotal = itemUnitPrice + itemExtraDaysAmt - itemDiscountAmt;

      // Existing payments for this specific item
      const { data: itemPayments, error: itemPaymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("rental_item_id", rentalItemId);

      if (itemPaymentsError) {
        console.log(
          "Error fetching item payments for reservation conversion:",
          itemPaymentsError
        );
        return c.json(
          { error: "Failed to validate item payments during reservation checkout." },
          500
        );
      }

      const existingItemPayments = (itemPayments || []).reduce(
        (sum: number, p: any) => sum + (parseFloat(p.amount) || 0),
        0
      );

      const isSaleItem = (currentItem as any).is_sale === true;

      const validationResult = validateConversionPayments({
        grandTotal,
        existingPayments,
        newPaymentsTotal,
        creditApplied: creditAppliedAmount,
        itemGrandTotal,
        existingItemPayments,
        isSaleItem,
        rentDownPct,
        surplusHandling,
      });

      console.log("💰 [CONVERT] Item-level validation:", {
        itemGrandTotal,
        existingItemPayments,
        creditAppliedAmount,
        itemBalanceDue: validationResult.valid ? validationResult.itemBalanceDue : null,
        additionalMinimum: validationResult.valid ? validationResult.additionalMinimum : null,
        newPaymentsTotal,
        valid: validationResult.valid,
      });

      if (!validationResult.valid) {
        return c.json({ error: validationResult.error }, 400);
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

      // Initialize paymentIds before Step 0 so it can be used by both credit record and regular payments
      const paymentIds: string[] = [];

      // Step 0: Handle credit/debit application if provided
      if (creditApplied !== undefined && creditApplied !== null && creditApplied !== 0 && customerId) {
        console.log(`💰 [CREDIT] Applying credit/debit for customer ${customerId}: ${creditApplied > 0 ? 'credit' : 'debit'} ${Math.abs(creditApplied)}`);
        
        // Step 0a: Create a "Store Credit" payment record to keep rental payments_total balanced
        // Positive credit → positive payment (covers part of rental using stored credit)
        // Negative credit (debit) → negative payment (offsets the extra payment that settles the debit)
        // This mirrors the same pattern used in the return flow (index.tsx Step 1b)
        const { data: storeCreditMethod, error: scMethodError } = await supabase
          .from("payments_methods")
          .select("id, payment_method")
          .ilike("payment_method", "Store Credit")
          .single();

        if (scMethodError || !storeCreditMethod) {
          console.log("Error finding Store Credit payment method for reservation conversion:", scMethodError);
          return c.json({ error: "Store Credit payment method not found. Please create it in payment methods." }, 500);
        }

        const { data: creditPaymentRecord, error: creditPaymentError } = await supabase
          .from("payments")
          .insert({
            rental_id: rentalId,
            rental_item_id: rentalItemId,
            payment_method_id: (storeCreditMethod as any).id,
            method: "store credit",
            amount: creditAppliedAmount,
            currency: "ARS",
            paid_at: nowUTC.toISOString(),
            reference: creditAppliedAmount > 0 ? "store-credit-applied" : "debt-settlement",
            created_by: getCurrentUserDisplay(c),
          })
          .select("id")
          .single();

        if (creditPaymentError || !creditPaymentRecord) {
          console.log("Error creating store credit payment for reservation conversion:", creditPaymentError);
          return c.json({ error: "Failed to create store credit payment: " + (creditPaymentError?.message || "unknown") }, 500);
        }
        paymentIds.push((creditPaymentRecord as any).id);
        console.log(`✅ [CREDIT] Created store credit payment record: ${creditAppliedAmount > 0 ? '+' : ''}${creditAppliedAmount} (${creditAppliedAmount > 0 ? 'store-credit-applied' : 'debt-settlement'})`);

        // Step 0b: Update customer credit balance
        // Fetch current customer credit balance
        const { data: custData, error: custError } = await supabase
          .from("customers")
          .select("credit_balance")
          .eq("customer_id", customerId)
          .single();

        if (custError) {
          console.log("Error fetching customer for credit application:", custError);
          return c.json({ error: "Failed to fetch customer credit balance: " + custError.message }, 500);
        }

        const currentCredit = parseFloat((custData as any).credit_balance) || 0;
        const newCredit = currentCredit - creditApplied; // Subtract because positive credit reduces balance

        // Update customer credit balance
        const { error: creditUpdateError } = await supabase
          .from("customers")
          .update({ credit_balance: newCredit })
          .eq("customer_id", customerId);

        if (creditUpdateError) {
          console.log("Error updating customer credit for reservation conversion:", creditUpdateError);
          return c.json({ error: "Failed to update customer credit: " + creditUpdateError.message }, 500);
        }

        console.log(`✅ [CREDIT] Customer credit updated: ${currentCredit} → ${newCredit} (applied ${creditApplied > 0 ? 'credit' : 'debit'}: ${Math.abs(creditApplied)})`);

        // Step 0c: Insert ledger entry for audit trail
        const { error: ledgerError } = await supabase
          .from("store_credit_ledger")
          .insert({
            customer_id: customerId,
            rental_id: rentalId,
            rental_item_id: rentalItemId,
            amount: -creditApplied,
            balance_after: newCredit,
            entry_type: creditApplied > 0 ? "credit_applied" : "debt_settled",
            notes: `Reservation checkout: ${creditApplied > 0 ? "credit applied" : "debt settled"} (${Math.abs(creditApplied)})`,
            created_by: getCurrentUserDisplay(c),
          });

        if (ledgerError) {
          console.log("⚠️ [LEDGER] Error inserting store_credit_ledger entry:", ledgerError.message);
        } else {
          console.log(`✅ [LEDGER] Recorded credit ledger entry: ${-creditApplied} → balance ${newCredit}`);
        }
      } else {
        console.log(`💰 [CREDIT] NOT applying credit. creditApplied=${creditApplied}, customerId=${customerId}`);
      }

      // Step 1: Create payment records
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          if (!payment.amount || payment.amount <= 0) continue;

          const { data: paymentRecord, error: paymentError } = await supabase
            .from("payments")
            .insert({
              rental_id: rentalId,
              rental_item_id: rentalItemId,
              payment_method_id: payment.methodId,
              amount: payment.amount,
              currency: "ARS",
              paid_at: nowUTC.toISOString(),
              reference: "reservation-to-rental",
              created_by: getCurrentUserDisplay(c),
            })
            .select("id")
            .single();

          if (paymentError || !paymentRecord) {
            console.log("Error creating payment for reservation conversion:", paymentError);
            return c.json({ error: "Failed to create payment: " + (paymentError?.message || "unknown") }, 500);
          }
          paymentIds.push((paymentRecord as any).id);

          // Create drawer transaction for this reservation conversion payment (only if drawer is open)
          if (openDrawer) {
            const transactionDesc = `${customerName} | Rent - ${itemName}`;

            const { error: drawerTxnError } = await supabase
              .from("drawer_transactions")
              .insert({
                drawer_txn_id: crypto.randomUUID(),
                drawer_id: openDrawer.drawer_id,
                payment_id: (paymentRecord as any).id,
                txn_type: "reservation_checkout",
                method: payment.methodName,
                amount: payment.amount,
                description: transactionDesc,
                reference: rentalId,
                created_by: getCurrentUserDisplay(c),
              });

            if (drawerTxnError) {
              console.log("Error creating drawer transaction for reservation conversion:", drawerTxnError.message || JSON.stringify(drawerTxnError));
              // Non-critical error, don't rollback
            }
          }
        }
      }

      // Step 2: Update rental_item status to checked_out
      const { error: updateItemError } = await supabase
        .from("rental_items")
        .update({
          status: "checked_out",
          checked_out_at: nowUTC.toISOString(),
          updated_by: getCurrentUserDisplay(c),
        })
        .eq("id", rentalItemId);

      if (updateItemError) {
        console.log("Error updating rental_item status to checked_out:", updateItemError);
        return c.json({ error: "Failed to update rental item: " + updateItemError.message }, 500);
      }

      // Step 3: Update inventory location to Alquilado
      const { error: locUpdateError } = await supabase
        .from("inventory_items")
        .update({
          location_id: ALQUILADO_LOCATION_ID,
          updated_by: getCurrentUserDisplay(c),
          updated_at: nowUTC.toISOString(),
        })
        .eq("id", itemId);

      if (locUpdateError) {
        console.log("Error updating inventory location during reservation conversion:", locUpdateError);
      } else {
        console.log("Updated inventory item " + itemId + " location to Alquilado");
      }

      // Step 4: Create audit record in rental_events
      const { error: eventError } = await supabase
        .from("rental_events")
        .insert({
          rental_item_id: rentalItemId,
          event_type: "checked_out",
          event_time: nowUTC.toISOString(),
          actor: "system",
          notes: "reservation to rental",
          created_by: getCurrentUserDisplay(c),
        });

      if (eventError) {
        console.log("Error creating rental_event for reservation conversion:", eventError);
      } else {
        console.log("Created rental_event checked_out for rental_item " + rentalItemId);
      }

      // Step 5: Handle overpayment/surplus
      // This can happen when item was swapped to a cheaper one after reservation fee was paid
      // NOTE: creditAppliedAmount must be included because:
      // - existingPayments was read from the view BEFORE the Store Credit offset payment was inserted (Step 0a)
      // - For debit (negative): the customer's extra payment settled the debit, not the rental — subtract it
      // - For credit (positive): the credit covered part of the rental — add it
      const totalPaidAfterConversion = existingPayments + newPaymentsTotal + creditAppliedAmount;
      const overpayment = totalPaidAfterConversion - grandTotal;
      let surplusAmount = 0;
      let surplusAction = '';

      // Step 5a: Detect any swap credit already given to this customer for this reservation.
      // During item swaps, the old code used to adjust customer credit_balance immediately.
      // At conversion we must deduct that pre-given amount so the customer isn't credited twice.
      let swapCreditAlreadyGiven = 0;
      if (overpayment > 0.01 && customerId) {
        const { data: swapEvts } = await supabase
          .from("rental_events")
          .select("notes")
          .eq("rental_item_id", rentalItemId)
          .eq("event_type", "item_swapped")
          .order("created_at", { ascending: false });

        if (swapEvts && swapEvts.length > 0) {
          for (const evt of swapEvts) {
            const notes = (evt as any).notes as string || '';
            // New swap format marks credit as deferred — skip these
            if (notes.includes('(deferred to checkout)')) continue;
            // Parse the cumulative "Total swap credit: $X" from the most recent OLD swap event
            const totalMatch = notes.match(/Total swap credit: \$(\d[\d,]*)/);
            if (totalMatch) {
              swapCreditAlreadyGiven = parseFloat(totalMatch[1].replace(/,/g, ''));
              break; // Most recent old swap has the accurate cumulative total
            }
          }
          if (swapCreditAlreadyGiven > 0) {
            console.log(`⚠️ [SURPLUS] Found $${swapCreditAlreadyGiven} swap credit already given for rental_item ${rentalItemId}. Will deduct from surplus credit.`);
          }
        }
      }

      if (overpayment > 0.01 && customerId) {
        // If frontend sends surplusHandling, use it; otherwise default to credit (backward compatible)
        if (surplusHandling && typeof surplusHandling === 'object') {
          // Use rounded surplus from frontend if provided, but cap to server-calculated surplus
          surplusAmount = Math.min(
            parseFloat(surplusHandling.amount) || 0,
            Math.round(overpayment)
          );

          if (surplusAmount > 0) {
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
                    reference: "surplus-refund-conversion",
                    created_by: getCurrentUserDisplay(c),
                  })
                  .select("id")
                  .single();

                if (refundError || !refundRecord) {
                  console.log("Error creating surplus refund payment during reservation conversion:", refundError);
                } else {
                  paymentIds.push((refundRecord as any).id);
                  surplusAction = 'refund';
                  console.log(`Created surplus refund payment of -${surplusAmount} for rental ${rentalId}`);

                  // Claw back any swap credit already given (prevents double-compensation)
                  if (swapCreditAlreadyGiven > 0) {
                    const clawback = Math.min(swapCreditAlreadyGiven, surplusAmount);
                    const { data: custDataRefund, error: custFetchErrRefund } = await supabase
                      .from("customers")
                      .select("credit_balance")
                      .eq("customer_id", customerId)
                      .single();

                    if (!custFetchErrRefund && custDataRefund) {
                      const curBal = parseFloat((custDataRefund as any).credit_balance) || 0;
                      const newBal = curBal - clawback;
                      const { error: clawbackErr } = await supabase
                        .from("customers")
                        .update({ credit_balance: newBal, updated_at: nowUTC.toISOString() })
                        .eq("customer_id", customerId);
                      if (clawbackErr) {
                        console.log("Error clawing back swap credit during refund:", clawbackErr);
                      } else {
                        console.log(`✅ [SURPLUS] Clawed back $${clawback} swap credit during refund. Customer balance: ${curBal} → ${newBal}`);
                      }
                    }
                  }

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
                        amount: surplusAmount,
                        description: refundDesc,
                        reference: rentalId,
                        created_by: getCurrentUserDisplay(c),
                      });

                    if (refundDrawerTxnError) {
                      console.log("Error creating drawer transaction for reservation surplus refund:", refundDrawerTxnError.message || JSON.stringify(refundDrawerTxnError));
                    }
                  }
                }
              } else {
                console.log("Surplus refund requested but no refundMethodId provided during reservation conversion");
              }
            } else {
              // Store credit: create offsetting negative payment to balance the rental books,
              // AND update the customer's credit_balance so the surplus is available for future use.
              // Two things happen:
              //   1) Negative payment → balances the rental ledger (payments_total == grand_total)
              //   2) credit_balance += net surplus → customer wallet gets the store credit

              // A) Idempotency: skip if offset already exists (e.g. network retry)
              const { data: existingSurplusCredit } = await supabase
                .from("payments")
                .select("id")
                .eq("rental_id", rentalId)
                .eq("reference", "surplus-to-store-credit-conversion")
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
                  console.log("Error finding Store Credit payment method for surplus offset during reservation conversion:", scErr);
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
                      reference: "surplus-to-store-credit-conversion",
                      created_by: getCurrentUserDisplay(c),
                    })
                    .select("id")
                    .single();

                  if (offsetErr || !offsetRec) {
                    console.log("Error creating surplus store-credit offset payment during reservation conversion:", offsetErr);
                  } else {
                    paymentIds.push((offsetRec as any).id);
                    surplusAction = 'credit';

                    // D) Update customer credit_balance with net surplus (surplus minus any old-style swap credit already given)
                    const netCreditToAdd = Math.max(0, surplusAmount - swapCreditAlreadyGiven);
                    if (netCreditToAdd > 0 && customerId) {
                      const { data: custDataCredit, error: custFetchErrCredit } = await supabase
                        .from("customers")
                        .select("credit_balance")
                        .eq("customer_id", customerId)
                        .single();

                      if (!custFetchErrCredit && custDataCredit) {
                        const curBal = parseFloat((custDataCredit as any).credit_balance) || 0;
                        const newBal = curBal + netCreditToAdd;
                        const { error: creditUpdateErr } = await supabase
                          .from("customers")
                          .update({ credit_balance: newBal, updated_at: nowUTC.toISOString() })
                          .eq("customer_id", customerId);
                        if (creditUpdateErr) {
                          console.log("Error updating customer credit_balance during store-credit surplus:", creditUpdateErr);
                        } else {
                          console.log(`✅ [SURPLUS] Customer credit_balance updated: ${curBal} → ${newBal} (added ${netCreditToAdd}, surplus=${surplusAmount}, swapCreditAlreadyGiven=${swapCreditAlreadyGiven})`);

                          // Insert ledger entry for surplus-to-credit
                          const { error: surplusLedgerErr } = await supabase
                            .from("store_credit_ledger")
                            .insert({
                              customer_id: customerId,
                              rental_id: rentalId,
                              rental_item_id: rentalItemId,
                              amount: netCreditToAdd,
                              balance_after: newBal,
                              entry_type: "surplus_to_credit",
                              notes: `Reservation conversion surplus: ${netCreditToAdd} added as store credit`,
                              created_by: getCurrentUserDisplay(c),
                            });
                          if (surplusLedgerErr) {
                            console.log("⚠️ [LEDGER] Error inserting surplus ledger entry:", surplusLedgerErr.message);
                          }
                        }
                      } else {
                        console.log("Error fetching customer for store-credit surplus update:", custFetchErrCredit);
                      }
                    } else if (swapCreditAlreadyGiven > 0) {
                      console.log(`✅ [SURPLUS] Net credit is 0 (surplus=${surplusAmount} fully covered by swapCreditAlreadyGiven=${swapCreditAlreadyGiven}). No credit_balance update needed.`);
                    }

                    console.log(`✅ [SURPLUS] Created store-credit offset payment of -${surplusAmount} for rental ${rentalId}.`);
                  }
                }
              }
            }
          }
        } else {
          // Backward compatible: no surplusHandling sent, default to credit
          // Same pattern as above: create offsetting negative payment + update credit_balance
          const creditAmount = Math.round(overpayment);
          if (creditAmount > 0) {
            // A) Idempotency check
            const { data: existingSurplusCreditLegacy } = await supabase
              .from("payments")
              .select("id")
              .eq("rental_id", rentalId)
              .eq("reference", "surplus-to-store-credit-conversion")
              .limit(1)
              .maybeSingle();

            if (existingSurplusCreditLegacy) {
              console.log(`⚠️ [SURPLUS-LEGACY] Store-credit offset already exists for rental ${rentalId}. Skipping (idempotent).`);
              surplusAmount = creditAmount;
              surplusAction = 'credit';
            } else {
              // B) Look up Store Credit payment method
              const { data: scMethodLegacy, error: scErrLegacy } = await supabase
                .from("payments_methods")
                .select("id")
                .ilike("payment_method", "Store Credit")
                .single();

              if (scErrLegacy || !scMethodLegacy) {
                console.log("Error finding Store Credit payment method for legacy surplus offset:", scErrLegacy);
              } else {
                // C) Insert negative offset payment
                const { data: offsetRecLegacy, error: offsetErrLegacy } = await supabase
                  .from("payments")
                  .insert({
                    rental_id: rentalId,
                    payment_method_id: (scMethodLegacy as any).id,
                    method: "store credit",
                    amount: -creditAmount,
                    currency: "ARS",
                    paid_at: nowUTC.toISOString(),
                    reference: "surplus-to-store-credit-conversion",
                    created_by: getCurrentUserDisplay(c),
                  })
                  .select("id")
                  .single();

                if (offsetErrLegacy || !offsetRecLegacy) {
                  console.log("Error creating legacy surplus store-credit offset payment:", offsetErrLegacy);
                } else {
                  paymentIds.push((offsetRecLegacy as any).id);
                  surplusAmount = creditAmount;
                  surplusAction = 'credit';

                  // D) Update customer credit_balance with net surplus (surplus minus any old-style swap credit already given)
                  const netCreditToAddLegacy = Math.max(0, creditAmount - swapCreditAlreadyGiven);
                  if (netCreditToAddLegacy > 0 && customerId) {
                    const { data: custDataCreditLegacy, error: custFetchErrCreditLegacy } = await supabase
                      .from("customers")
                      .select("credit_balance")
                      .eq("customer_id", customerId)
                      .single();

                    if (!custFetchErrCreditLegacy && custDataCreditLegacy) {
                      const curBal = parseFloat((custDataCreditLegacy as any).credit_balance) || 0;
                      const newBal = curBal + netCreditToAddLegacy;
                      const { error: creditUpdateErrLegacy } = await supabase
                        .from("customers")
                        .update({ credit_balance: newBal, updated_at: nowUTC.toISOString() })
                        .eq("customer_id", customerId);
                      if (creditUpdateErrLegacy) {
                        console.log("Error updating customer credit_balance during legacy store-credit surplus:", creditUpdateErrLegacy);
                      } else {
                        console.log(`✅ [SURPLUS-LEGACY] Customer credit_balance updated: ${curBal} → ${newBal} (added ${netCreditToAddLegacy}, surplus=${creditAmount}, swapCreditAlreadyGiven=${swapCreditAlreadyGiven})`);

                        // Insert ledger entry for legacy surplus-to-credit
                        const { error: legacySurplusLedgerErr } = await supabase
                          .from("store_credit_ledger")
                          .insert({
                            customer_id: customerId,
                            rental_id: rentalId,
                            rental_item_id: rentalItemId,
                            amount: netCreditToAddLegacy,
                            balance_after: newBal,
                            entry_type: "surplus_to_credit",
                            notes: `Legacy reservation conversion surplus: ${netCreditToAddLegacy} added as store credit`,
                            created_by: getCurrentUserDisplay(c),
                          });
                        if (legacySurplusLedgerErr) {
                          console.log("⚠️ [LEDGER] Error inserting legacy surplus ledger entry:", legacySurplusLedgerErr.message);
                        }
                      }
                    } else {
                      console.log("Error fetching customer for legacy store-credit surplus update:", custFetchErrCreditLegacy);
                    }
                  } else if (swapCreditAlreadyGiven > 0) {
                    console.log(`✅ [SURPLUS-LEGACY] Net credit is 0 (surplus=${creditAmount} fully covered by swapCreditAlreadyGiven=${swapCreditAlreadyGiven}). No credit_balance update needed.`);
                  }

                  console.log(`✅ [SURPLUS-LEGACY] Created store-credit offset payment of -${creditAmount} for rental ${rentalId}.`);
                }
              }
            }
          }
        }
      }

      console.log("Reservation conversion completed. RentalItem: " + rentalItemId + ", Payments: " + paymentIds.length + ", SurplusAmount: " + surplusAmount + ", SurplusAction: " + surplusAction);

      return c.json({
        success: true,
        rentalItemId,
        rentalId,
        paymentIds,
        creditAdded: surplusAction === 'credit' ? surplusAmount : 0,
        surplusAmount,
        surplusAction,
      });

    } catch (error: any) {
      console.log("Unexpected error during reservation conversion:", error);
      return c.json({ error: "Unexpected error: " + (error?.message || String(error)) }, 500);
    }
  });
}