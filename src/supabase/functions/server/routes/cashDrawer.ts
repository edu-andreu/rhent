import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";
import { getCurrentOpenDrawer } from "../helpers/validation.ts";
import { getGMT3DateString } from "../helpers/calculations.ts";

export function registerCashDrawerRoutes(app: Hono, supabase: SupabaseClient) {

// POST /drawer/open - Open a new cash drawer
app.post("/make-server-918f1e54/drawer/open", async (c) => {
  try {
    const body = await c.req.json();
    const { openingCash, location = "Main Counter" } = body;

    if (openingCash === undefined || openingCash === null) {
      return c.json({ error: "Opening cash amount is required" }, 400);
    }

    const openingCashNum = parseFloat(openingCash);
    if (isNaN(openingCashNum) || openingCashNum < 0) {
      return c.json({ error: "Opening cash must be a valid positive number" }, 400);
    }

    // Get today's date in GMT-3
    const businessDate = getGMT3DateString();

    // Check if drawer already open for today
    const { data: existingDrawer } = await supabase
      .from("daily_drawers")
      .select("drawer_id, business_date, status")
      .eq("business_date", businessDate)
      .eq("status", "open")
      .single();

    if (existingDrawer) {
      return c.json({ 
        error: `Cash drawer is already open for ${businessDate}` 
      }, 400);
    }

    // Get last closed drawer for validation (could be from any previous day)
    const { data: lastClosedDrawers } = await supabase
      .from("daily_drawers")
      .select("counted_cash, expected_cash, status, business_date, closed_at")
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(1);

    const lastClosedDrawer = lastClosedDrawers?.[0];

    let warning = null;
    if (lastClosedDrawer && lastClosedDrawer.counted_cash !== null) {
      const previousCounted = Math.round(parseFloat(lastClosedDrawer.counted_cash));
      const currentOpening = Math.round(openingCashNum);
      
      if (previousCounted !== currentOpening) {
        const datePart = lastClosedDrawer.business_date === businessDate 
          ? "previous drawer's" 
          : `${lastClosedDrawer.business_date}'s`;
        warning = `Opening cash ($${currentOpening.toLocaleString()}) doesn't match ${datePart} counted cash ($${previousCounted.toLocaleString()})`;
      }
    }

    // Generate UUID for drawer_id
    const drawerId = crypto.randomUUID();

    const currentUser = getCurrentUserDisplay(c);

    // Create new drawer
    const { data: newDrawer, error: insertError } = await supabase
      .from("daily_drawers")
      .insert({
        drawer_id: drawerId,
        business_date: businessDate,
        location: location,
        opened_by: currentUser,
        opened_at: new Date().toISOString(),
        opening_cash: openingCashNum,
        status: "open",
      })
      .select("*")
      .single();

    if (insertError) {
      console.log("Error creating drawer:", insertError);
      return c.json({ error: `Failed to open drawer: ${insertError.message}` }, 500);
    }

    console.log(`✅ Cash drawer opened: ${newDrawer.drawer_id}, Date: ${businessDate}, Opening: $${Math.round(openingCashNum)}`);

    return c.json({ 
      drawer: newDrawer,
      warning 
    }, 201);
  } catch (error: any) {
    console.log("Error opening drawer:", error);
    return c.json({ error: `Failed to open drawer: ${error.message}` }, 500);
  }
});

// POST /drawer/close - Close the current cash drawer
app.post("/make-server-918f1e54/drawer/close", async (c) => {
  try {
    const body = await c.req.json();
    const { countedCash, notes = "" } = body;
    const closedBy = getCurrentUserDisplay(c);

    if (countedCash === undefined || countedCash === null) {
      return c.json({ error: "Counted cash amount is required" }, 400);
    }

    const countedCashNum = parseFloat(countedCash);
    if (isNaN(countedCashNum) || countedCashNum < 0) {
      return c.json({ error: "Counted cash must be a valid positive number" }, 400);
    }

    // Get current open drawer
    const openDrawer = await getCurrentOpenDrawer(supabase);
    if (!openDrawer) {
      return c.json({ error: "No open cash drawer found" }, 400);
    }

    // Calculate expected cash from drawer transactions (only cash payment_type)
    const { data: transactions, error: txnError } = await supabase
      .from("drawer_transactions")
      .select(`
        drawer_txn_id,
        txn_type,
        amount,
        payment_id,
        payments (
          payment_method_id
        )
      `)
      .eq("drawer_id", openDrawer.drawer_id);

    if (txnError) {
      console.log("Error fetching drawer transactions:", txnError);
      return c.json({ error: `Failed to fetch transactions: ${txnError.message}` }, 500);
    }

    // Get payment method IDs that are cash type
    const { data: cashMethods, error: methodError } = await supabase
      .from("payments_methods")
      .select("id")
      .eq("payment_type", "cash")
      .eq("status", "On");

    if (methodError) {
      console.log("Error fetching cash payment methods:", methodError);
      return c.json({ error: `Failed to fetch payment methods: ${methodError.message}` }, 500);
    }

    const cashMethodIds = new Set(cashMethods?.map(m => m.id) || []);

    // Calculate expected cash
    let cashIn = 0;
    let cashOut = 0;

    for (const txn of transactions || []) {
      const amount = parseFloat(txn.amount) || 0;
      
      // Check if this transaction is cash (either no payment_id or payment_id has cash method)
      const isCash = !txn.payment_id || 
        (txn.payments && cashMethodIds.has(txn.payments.payment_method_id));

      if (isCash) {
        // Money coming in: checkout, return_checkout, reservation_checkout, cash_in
        if (['checkout', 'return_checkout', 'reservation_checkout', 'cash_in', 'in'].includes(txn.txn_type)) {
          cashIn += amount;
        } 
        // Money going out: cancellation, cash_out, out (stored as negative, so use absolute value)
        else if (['cancellation', 'cash_out', 'out'].includes(txn.txn_type)) {
          cashOut += Math.abs(amount);
        }
      }
    }

    const openingCash = parseFloat(openDrawer.opening_cash) || 0;
    const expectedCash = openingCash + cashIn - cashOut;
    const difference = countedCashNum - expectedCash;

    // Check variance threshold
    const varianceThreshold = 5000; // $5,000
    let varianceWarning = null;
    if (Math.abs(difference) > varianceThreshold) {
      varianceWarning = `Large variance detected: $${Math.round(Math.abs(difference))} ${difference > 0 ? 'over' : 'short'}`;
    }

    // Update drawer
    const { data: closedDrawer, error: updateError } = await supabase
      .from("daily_drawers")
      .update({
        counted_cash: countedCashNum,
        expected_cash: expectedCash,
        difference: difference,
        closed_by: closedBy,
        closed_at: new Date().toISOString(),
        status: "closed",
        notes: notes || null,
      })
      .eq("drawer_id", openDrawer.drawer_id)
      .select("*")
      .single();

    if (updateError) {
      console.log("Error closing drawer:", updateError);
      return c.json({ error: `Failed to close drawer: ${updateError.message}` }, 500);
    }

    console.log(`✅ Cash drawer closed: ${closedDrawer.drawer_id}, Counted: $${Math.round(countedCashNum)}, Expected: $${Math.round(expectedCash)}, Diff: $${Math.round(difference)}`);

    return c.json({ 
      drawer: closedDrawer,
      summary: {
        openingCash: Math.round(openingCash),
        cashIn: Math.round(cashIn),
        cashOut: Math.round(cashOut),
        expectedCash: Math.round(expectedCash),
        countedCash: Math.round(countedCashNum),
        difference: Math.round(difference),
      },
      varianceWarning 
    });
  } catch (error: any) {
    console.log("Error closing drawer:", error);
    return c.json({ error: `Failed to close drawer: ${error.message}` }, 500);
  }
});

// GET /drawer/debug - Debug endpoint to check drawer transactions
app.get("/make-server-918f1e54/drawer/debug", async (c) => {
  try {
    // Get all drawer transactions
    const { data: allTransactions, error: txnError } = await supabase
      .from("drawer_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get all open drawers
    const { data: openDrawers, error: drawerError } = await supabase
      .from("daily_drawers")
      .select("*")
      .eq("status", "open");

    // Get recent payments
    const { data: recentPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return c.json({
      allTransactions,
      txnError,
      openDrawers,
      drawerError,
      recentPayments,
      paymentsError,
    });
  } catch (error: any) {
    console.log("Debug endpoint error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /drawer/current - Get current open drawer with transactions
app.get("/make-server-918f1e54/drawer/current", async (c) => {
  try {
    // Get current open drawer
    const openDrawer = await getCurrentOpenDrawer(supabase);
    
    if (!openDrawer) {
      return c.json({ 
        drawer: null,
        transactions: [],
        summary: null 
      });
    }

    // Get all drawer transactions with payment details and category
    const { data: transactions, error: txnError } = await supabase
      .from("drawer_transactions")
      .select(`
        drawer_txn_id,
        txn_type,
        method,
        amount,
        description,
        reference,
        created_at,
        created_by,
        payment_id,
        category_id,
        cash_out_type,
        employee_name,
        shift_start,
        shift_end,
        hours_worked,
        hourly_rate,
        drawer_transaction_categories (
          name
        ),
        payments (
          payment_method_id,
          rental_id,
          rentals (
            customer_id,
            rental_items (
              is_sale,
              checked_out_at,
              inventory_items (
                name:name!inner (
                  name
                )
              )
            ),
            customers (
              first_name,
              last_name
            )
          )
        )
      `)
      .eq("drawer_id", openDrawer.drawer_id)
      .order("created_at", { ascending: false });

    if (txnError) {
      console.log("Error fetching drawer transactions:", txnError);
      return c.json({ error: `Failed to fetch transactions: ${txnError.message}` }, 500);
    }

    // Get payment method IDs that are cash type
    const { data: cashMethods, error: methodError } = await supabase
      .from("payments_methods")
      .select("id, payment_method")
      .eq("payment_type", "cash")
      .eq("status", "On");

    if (methodError) {
      console.log("Error fetching cash payment methods:", methodError);
      return c.json({ error: `Failed to fetch payment methods: ${methodError.message}` }, 500);
    }

    const cashMethodIds = new Set(cashMethods?.map(m => m.id) || []);

    // Calculate cash totals (only cash payment_type)
    let cashIn = 0;
    let cashOut = 0;

    for (const txn of transactions || []) {
      const amount = parseFloat(txn.amount) || 0;
      
      // Check if this transaction is cash
      const isCash = !txn.payment_id || 
        (txn.payments && cashMethodIds.has(txn.payments.payment_method_id));

      if (isCash) {
        // Money coming in: checkout, return_checkout, reservation_checkout, cash_in
        if (['checkout', 'return_checkout', 'reservation_checkout', 'cash_in', 'in'].includes(txn.txn_type)) {
          cashIn += amount;
        } 
        // Money going out: cancellation, cash_out, out (stored as negative, so use absolute value)
        else if (['cancellation', 'cash_out', 'out'].includes(txn.txn_type)) {
          cashOut += Math.abs(amount);
        }
      }
    }

    const openingCash = parseFloat(openDrawer.opening_cash) || 0;
    const expectedBalance = openingCash + cashIn - cashOut;

    // Map transactions for frontend
    const mappedTransactions = (transactions || []).map(txn => {
      const isCash = !txn.payment_id || 
        (txn.payments && cashMethodIds.has(txn.payments.payment_method_id));
      
      let customerName = null;
      let dressNames: string[] = [];
      
      if (txn.payments?.rentals?.customers) {
        const cust = txn.payments.rentals.customers;
        customerName = `${cust.first_name} ${cust.last_name}`;
      }
      
      // Extract dress names from rental_items through inventory_items
      if (txn.payments?.rentals?.rental_items) {
        dressNames = txn.payments.rentals.rental_items
          .map((item: any) => item.inventory_items?.name?.name)
          .filter(Boolean);
      }
      
      // Build notes from stored description (new format: "CustomerName | Rent - X ; Sold - Y")
      // Falls back to computing from rental_items for old transactions without pipe separator
      let notes = null;
      const storedDesc = txn.description || '';
      const pipeIndex = storedDesc.indexOf(' | ');
      let descriptionFallback = storedDesc; // For description field if customerName not resolvable

      if (['checkout', 'reservation_checkout', 'return_checkout'].includes(txn.txn_type)) {
        if (pipeIndex >= 0) {
          // New format: notes stored after pipe separator
          notes = storedDesc.substring(pipeIndex + 3);
          descriptionFallback = storedDesc.substring(0, pipeIndex);
        } else {
          // Fallback for old transactions: compute from current rental_items state
          // Use checked_out_at vs txn.created_at to determine if item was reserved at checkout time
          const txnTime = new Date(txn.created_at).getTime();
          if (txn.txn_type === 'checkout') {
            const rentalItems = txn.payments?.rentals?.rental_items || [];
            notes = rentalItems
              .map((item: any) => {
                const name = item.inventory_items?.name?.name;
                if (!name) return null;
                if (item.is_sale) return `Sold - ${name}`;
                // If checked_out_at is null or > 60s after the txn, item was reserved at checkout
                const coAt = item.checked_out_at ? new Date(item.checked_out_at).getTime() : null;
                const wasReservedAtCheckout = !coAt || Math.abs(coAt - txnTime) > 60000;
                return wasReservedAtCheckout ? `Reserve - ${name}` : `Rent - ${name}`;
              })
              .filter(Boolean)
              .join(' ; ');
          } else if (txn.txn_type === 'reservation_checkout') {
            const dashIndex = storedDesc.indexOf(' - ');
            const itemNameFromDesc = dashIndex >= 0 ? storedDesc.substring(dashIndex + 3) : '';
            notes = itemNameFromDesc ? `Rent - ${itemNameFromDesc}` : dressNames.map(name => `Rent - ${name}`).join(' ; ');
          } else if (txn.txn_type === 'return_checkout') {
            notes = dressNames.map(name => `Return - ${name}`).join(' ; ');
          }
        }
      } else {
        // For manual transactions (cash_in, cash_out, etc.), use the description
        notes = txn.description;
      }

      return {
        transactionId: txn.drawer_txn_id,
        transactionType: txn.txn_type,
        paymentMethod: txn.method,
        amount: Math.round(parseFloat(txn.amount) || 0),
        notes: notes || '-',
        description: customerName || descriptionFallback,
        referenceId: txn.reference,
        referenceType: txn.payment_id ? 'Rental' : 'Manual',
        customerName,
        isCash,
        createdAt: txn.created_at,
        categoryId: txn.category_id || null,
        categoryName: (txn as any).drawer_transaction_categories?.name || null,
        cashOutType: txn.cash_out_type || null,
        employeeName: txn.employee_name || null,
        shiftStart: txn.shift_start || null,
        shiftEnd: txn.shift_end || null,
        hoursWorked: txn.hours_worked ? parseFloat(txn.hours_worked) : null,
        hourlyRate: txn.hourly_rate ? parseFloat(txn.hourly_rate) : null,
      };
    });

    return c.json({ 
      drawer: {
        drawerId: openDrawer.drawer_id,
        businessDate: openDrawer.business_date,
        location: openDrawer.location,
        openedBy: openDrawer.opened_by,
        openedAt: openDrawer.opened_at,
        openingCash: Math.round(openingCash),
        status: openDrawer.status,
      },
      transactions: mappedTransactions,
      summary: {
        openingCash: Math.round(openingCash),
        totalCashIn: Math.round(cashIn),
        totalCashOut: Math.round(cashOut),
        expectedBalance: Math.round(expectedBalance),
      }
    });
  } catch (error: any) {
    console.log("Error fetching current drawer:", error);
    return c.json({ error: `Failed to fetch current drawer: ${error.message}` }, 500);
  }
});

// GET /drawer/history - Get closed drawers history
app.get("/make-server-918f1e54/drawer/history", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "30");
    const offset = parseInt(c.req.query("offset") || "0");

    const { data: drawers, error: drawerError } = await supabase
      .from("daily_drawers")
      .select("*")
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (drawerError) {
      console.log("Error fetching drawer history:", drawerError);
      return c.json({ error: `Failed to fetch drawer history: ${drawerError.message}` }, 500);
    }

    // Map drawers and calculate opening cash mismatch
    const mappedDrawers = (drawers || []).map((d, index) => {
      const openingCash = Math.round(parseFloat(d.opening_cash) || 0);
      
      // Find the previous drawer (the one closed before this one opened)
      // Since we're ordered by closed_at descending, we need to look forward in the array
      let openingMismatch = null;
      
      if (index < (drawers.length - 1)) {
        // The next item in the array is the previously closed drawer
        const previousDrawer = drawers[index + 1];
        const previousCountedCash = Math.round(parseFloat(previousDrawer.counted_cash) || 0);
        
        if (previousCountedCash !== openingCash) {
          openingMismatch = openingCash - previousCountedCash;
        }
      }

      return {
        drawerId: d.drawer_id,
        businessDate: d.business_date,
        location: d.location,
        openedBy: d.opened_by,
        openedAt: d.opened_at,
        closedBy: d.closed_by,
        closedAt: d.closed_at,
        openingCash: openingCash,
        countedCash: Math.round(parseFloat(d.counted_cash) || 0),
        expectedCash: Math.round(parseFloat(d.expected_cash) || 0),
        difference: Math.round(parseFloat(d.difference) || 0),
        openingMismatch: openingMismatch,
        notes: d.notes,
      };
    });

    return c.json({ drawers: mappedDrawers });
  } catch (error: any) {
    console.log("Error fetching drawer history:", error);
    return c.json({ error: `Failed to fetch drawer history: ${error.message}` }, 500);
  }
});

// GET /drawer/:id/detail - Get full detail for a specific drawer (transactions + summary)
app.get("/make-server-918f1e54/drawer/:id/detail", async (c) => {
  try {
    const drawerId = c.req.param("id");

    // Fetch the drawer
    const { data: drawer, error: drawerError } = await supabase
      .from("daily_drawers")
      .select("*")
      .eq("drawer_id", drawerId)
      .single();

    if (drawerError || !drawer) {
      console.log("Error fetching drawer detail:", drawerError);
      return c.json({ error: "Drawer not found" }, 404);
    }

    // Fetch transactions with payment details and category
    const { data: transactions, error: txnError } = await supabase
      .from("drawer_transactions")
      .select(`
        drawer_txn_id,
        txn_type,
        method,
        amount,
        description,
        reference,
        created_at,
        created_by,
        payment_id,
        category_id,
        cash_out_type,
        employee_name,
        shift_start,
        shift_end,
        hours_worked,
        hourly_rate,
        drawer_transaction_categories (
          name
        ),
        payments (
          payment_method_id,
          rental_id,
          rentals (
            customer_id,
            rental_items (
              is_sale,
              checked_out_at,
              inventory_items (
                name:name!inner (
                  name
                )
              )
            ),
            customers (
              first_name,
              last_name
            )
          )
        )
      `)
      .eq("drawer_id", drawerId)
      .order("created_at", { ascending: true });

    if (txnError) {
      console.log("Error fetching drawer detail transactions:", txnError);
      return c.json({ error: `Failed to fetch transactions: ${txnError.message}` }, 500);
    }

    // Get cash payment method IDs
    const { data: cashMethods } = await supabase
      .from("payments_methods")
      .select("id, payment_method")
      .eq("payment_type", "cash")
      .eq("status", "On");

    const cashMethodIds = new Set(cashMethods?.map(m => m.id) || []);

    let cashIn = 0;
    let cashOut = 0;

    const mappedTransactions = (transactions || []).map(txn => {
      const amount = parseFloat(txn.amount) || 0;
      const isCash = !txn.payment_id ||
        (txn.payments && cashMethodIds.has(txn.payments.payment_method_id));

      if (isCash) {
        if (['checkout', 'return_checkout', 'reservation_checkout', 'cash_in', 'in'].includes(txn.txn_type)) {
          cashIn += amount;
        } else if (['cancellation', 'cash_out', 'out'].includes(txn.txn_type)) {
          cashOut += Math.abs(amount);
        }
      }

      let customerName = null;
      let dressNames: string[] = [];

      if (txn.payments?.rentals?.customers) {
        const cust = txn.payments.rentals.customers;
        customerName = `${cust.first_name} ${cust.last_name}`;
      }

      if (txn.payments?.rentals?.rental_items) {
        dressNames = txn.payments.rentals.rental_items
          .map((item: any) => item.inventory_items?.name?.name)
          .filter(Boolean);
      }

      // Build notes from stored description (new format: "CustomerName | Rent - X ; Sold - Y")
      // Falls back to computing from rental_items for old transactions without pipe separator
      let notes = null;
      const storedDesc = txn.description || '';
      const pipeIndex = storedDesc.indexOf(' | ');
      let descriptionFallback = storedDesc;

      if (['checkout', 'reservation_checkout', 'return_checkout'].includes(txn.txn_type)) {
        if (pipeIndex >= 0) {
          notes = storedDesc.substring(pipeIndex + 3);
          descriptionFallback = storedDesc.substring(0, pipeIndex);
        } else {
          // Fallback for old transactions
          // Use checked_out_at vs txn.created_at to determine if item was reserved at checkout time
          const txnTime = new Date(txn.created_at).getTime();
          if (txn.txn_type === 'checkout') {
            const rentalItems = txn.payments?.rentals?.rental_items || [];
            notes = rentalItems
              .map((item: any) => {
                const name = item.inventory_items?.name?.name;
                if (!name) return null;
                if (item.is_sale) return `Sold - ${name}`;
                // If checked_out_at is null or > 60s after the txn, item was reserved at checkout
                const coAt = item.checked_out_at ? new Date(item.checked_out_at).getTime() : null;
                const wasReservedAtCheckout = !coAt || Math.abs(coAt - txnTime) > 60000;
                return wasReservedAtCheckout ? `Reserve - ${name}` : `Rent - ${name}`;
              })
              .filter(Boolean)
              .join(' ; ');
          } else if (txn.txn_type === 'reservation_checkout') {
            const dashIndex = storedDesc.indexOf(' - ');
            const itemNameFromDesc = dashIndex >= 0 ? storedDesc.substring(dashIndex + 3) : '';
            notes = itemNameFromDesc ? `Rent - ${itemNameFromDesc}` : dressNames.map(name => `Rent - ${name}`).join(' ; ');
          } else if (txn.txn_type === 'return_checkout') {
            notes = dressNames.map(name => `Return - ${name}`).join(' ; ');
          }
        }
      } else {
        notes = txn.description;
      }

      return {
        transactionId: txn.drawer_txn_id,
        transactionType: txn.txn_type,
        paymentMethod: txn.method,
        amount: Math.round(parseFloat(txn.amount) || 0),
        notes: notes || '-',
        description: customerName || descriptionFallback,
        referenceId: txn.reference,
        referenceType: txn.payment_id ? 'Rental' : 'Manual',
        customerName,
        isCash,
        createdAt: txn.created_at,
        categoryId: txn.category_id || null,
        categoryName: (txn as any).drawer_transaction_categories?.name || null,
        cashOutType: txn.cash_out_type || null,
        employeeName: txn.employee_name || null,
        shiftStart: txn.shift_start || null,
        shiftEnd: txn.shift_end || null,
        hoursWorked: txn.hours_worked ? parseFloat(txn.hours_worked) : null,
        hourlyRate: txn.hourly_rate ? parseFloat(txn.hourly_rate) : null,
      };
    });

    const openingCash = Math.round(parseFloat(drawer.opening_cash) || 0);

    return c.json({
      transactions: mappedTransactions,
      summary: {
        openingCash,
        totalCashIn: Math.round(cashIn),
        totalCashOut: Math.round(cashOut),
        expectedBalance: Math.round(openingCash + cashIn - cashOut),
        countedCash: drawer.counted_cash !== null ? Math.round(parseFloat(drawer.counted_cash) || 0) : null,
        difference: drawer.difference !== null ? Math.round(parseFloat(drawer.difference) || 0) : null,
      },
    });
  } catch (error: any) {
    console.log("Error fetching drawer detail:", error);
    return c.json({ error: `Failed to fetch drawer detail: ${error.message}` }, 500);
  }
});

// GET /drawer/categories - Get transaction categories filtered by direction
app.get("/make-server-918f1e54/drawer/categories", async (c) => {
  try {
    const direction = c.req.query("direction");

    let query = supabase
      .from("drawer_transaction_categories")
      .select("id, name, direction, category")
      .eq("is_active", true)
      .order("name");

    if (direction === "in" || direction === "out") {
      query = query.eq("direction", direction);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Error fetching transaction categories:", error);
      return c.json({ error: `Failed to fetch categories: ${error.message}` }, 500);
    }

    return c.json({ categories: data || [] });
  } catch (error: any) {
    console.log("Error fetching transaction categories:", error);
    return c.json({ error: `Failed to fetch categories: ${error.message}` }, 500);
  }
});

// POST /drawer/categories - Create a new transaction category
app.post("/make-server-918f1e54/drawer/categories", async (c) => {
  try {
    const body = await c.req.json();
    const { name, direction, category: categoryBody } = body;

    if (!name || name.trim() === "") {
      return c.json({ error: "Category name is required" }, 400);
    }

    if (direction !== "in" && direction !== "out") {
      return c.json({ error: "Direction must be 'in' or 'out'" }, 400);
    }

    const categoryValue =
      categoryBody && String(categoryBody).trim() !== ""
        ? String(categoryBody).trim()
        : name.trim();

    const { data: category, error } = await supabase
      .from("drawer_transaction_categories")
      .insert({ name: name.trim(), direction, category: categoryValue })
      .select("id, name, direction, category")
      .single();

    if (error) {
      if (error.code === "23505") {
        return c.json({ error: `Category "${name.trim()}" already exists for ${direction}` }, 409);
      }
      console.log("Error creating transaction category:", error);
      return c.json({ error: `Failed to create category: ${error.message}` }, 500);
    }

    console.log(`✅ Transaction category created: "${category.name}" (${category.direction})`);

    return c.json({ category }, 201);
  } catch (error: any) {
    console.log("Error creating transaction category:", error);
    return c.json({ error: `Failed to create category: ${error.message}` }, 500);
  }
});

// PUT /drawer/categories/:id - Update a transaction category (supplier)
app.put("/make-server-918f1e54/drawer/categories/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Category id is required" }, 400);
    }
    const body = await c.req.json();
    const { name, category: categoryBody, direction } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return c.json({ error: "Name must be a non-empty string" }, 400);
      }
      updates.name = name.trim();
    }
    if (categoryBody !== undefined) {
      updates.category =
        typeof categoryBody === "string" && categoryBody.trim() !== ""
          ? categoryBody.trim()
          : "";
    }
    if (direction !== undefined) {
      if (direction !== "in" && direction !== "out") {
        return c.json({ error: "Direction must be 'in' or 'out'" }, 400);
      }
      updates.direction = direction;
    }
    if (Object.keys(updates).length === 0) {
      return c.json({ error: "At least one of name, category, or direction is required" }, 400);
    }

    const { data: category, error } = await supabase
      .from("drawer_transaction_categories")
      .update(updates)
      .eq("id", id)
      .select("id, name, direction, category")
      .single();

    if (error) {
      if (error.code === "23505") {
        return c.json(
          { error: `A supplier with this name already exists for ${updates.direction || "this direction"}` },
          409,
        );
      }
      console.log("Error updating transaction category:", error);
      return c.json({ error: `Failed to update category: ${error.message}` }, 500);
    }
    if (!category) {
      return c.json({ error: "Category not found" }, 404);
    }
    return c.json({ category }, 200);
  } catch (error: any) {
    console.log("Error in drawer/categories PUT:", error);
    return c.json({ error: `Failed to update category: ${error.message}` }, 500);
  }
});

// DELETE /drawer/categories/:id - Delete a transaction category (supplier) if not in use
app.delete("/make-server-918f1e54/drawer/categories/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Category id is required" }, 400);
    }

    const { data: drawerRefs } = await supabase
      .from("drawer_transactions")
      .select("drawer_txn_id")
      .eq("category_id", id)
      .limit(1);
    const { data: expenseRefs } = await supabase
      .from("expenses")
      .select("id")
      .eq("category_id", id)
      .limit(1);

    if ((drawerRefs && drawerRefs.length > 0) || (expenseRefs && expenseRefs.length > 0)) {
      return c.json(
        {
          error:
            "Cannot delete: this supplier is used by transactions or expenses. Remove or reassign those first.",
        },
        409,
      );
    }

    const { error: deleteError } = await supabase
      .from("drawer_transaction_categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.log("Error deleting transaction category:", deleteError);
      return c.json({ error: `Failed to delete category: ${deleteError.message}` }, 500);
    }
    return c.json({ deleted: true }, 200);
  } catch (error: any) {
    console.log("Error in drawer/categories DELETE:", error);
    return c.json({ error: `Failed to delete category: ${error.message}` }, 500);
  }
});

// POST /drawer/transaction - Add manual cash in/out transaction
app.post("/make-server-918f1e54/drawer/transaction", async (c) => {
  try {
    const body = await c.req.json();
    const { amount, category, notes, category_id, cash_out_type, employee_name, shift_start, shift_end, payroll_schedule, hours_worked: body_hours_worked } = body;
    const currentUser = getCurrentUserDisplay(c);

    // Get current open drawer
    const openDrawer = await getCurrentOpenDrawer(supabase);
    if (!openDrawer) {
      return c.json({ error: "No open cash drawer found. Please open a drawer first." }, 400);
    }

    // Look up category to check if it's "Otro" (description required)
    let categoryName: string | null = null;
    if (category_id) {
      const { data: cat } = await supabase
        .from("drawer_transaction_categories")
        .select("name")
        .eq("id", category_id)
        .single();
      categoryName = cat?.name || null;
    }

    // Payroll transaction: compute amount from shift times or manual hours and hourly wage
    if (cash_out_type === "payroll") {
      if (!employee_name || employee_name.trim() === "") {
        return c.json({ error: "Employee name is required for payroll" }, 400);
      }

      const schedule = payroll_schedule || "daily";
      let hoursWorked: number;
      let startISO: string | null = null;
      let endISO: string | null = null;

      if (schedule === "weekly") {
        if (body_hours_worked === undefined || body_hours_worked === null) {
          return c.json({ error: "Hours worked is required for weekly payroll" }, 400);
        }
        const h = parseFloat(body_hours_worked);
        if (isNaN(h) || h <= 0) {
          return c.json({ error: "Hours worked must be a positive number" }, 400);
        }
        if ((h * 2) % 1 !== 0) {
          return c.json({ error: "Hours must be in 0.5 increments (e.g. 8, 8.5, 37.5)" }, 400);
        }
        hoursWorked = h;
      } else {
        if (!shift_start || !shift_end) {
          return c.json({ error: "Shift start and end times are required for daily payroll" }, 400);
        }
        const start = new Date(shift_start);
        const end = new Date(shift_end);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return c.json({ error: "Invalid shift start or end time" }, 400);
        }
        let diffMs = end.getTime() - start.getTime();
        if (diffMs <= 0) diffMs += 24 * 60 * 60 * 1000;
        if (diffMs > 12 * 60 * 60 * 1000) {
          return c.json({ error: "Shift duration cannot exceed 12 hours" }, 400);
        }
        hoursWorked = Math.round((diffMs / 3600000) * 100) / 100;
        startISO = start.toISOString();
        endISO = end.toISOString();
      }

      // Fetch hourly rate from configuration
      const { data: wageKv } = await supabase
        .from("kv_store_918f1e54")
        .select("value")
        .eq("key", "config_storeAssistant_wageByHour")
        .single();

      const hourlyRate = parseFloat(wageKv?.value || "5000");
      const payrollAmount = -(hoursWorked * hourlyRate);

      const descParts = [`Payroll: ${employee_name.trim()}`];
      if (schedule === "weekly") descParts.push("Weekly");
      if (notes && notes.trim()) descParts.push(notes.trim());

      const { data: transaction, error: txnError } = await supabase
        .from("drawer_transactions")
        .insert({
          drawer_txn_id: crypto.randomUUID(),
          drawer_id: openDrawer.drawer_id,
          payment_id: null,
          txn_type: "cash_out",
          method: "Cash",
          amount: payrollAmount,
          description: descParts.join(" - "),
          reference: null,
          created_by: currentUser,
          category_id: null,
          cash_out_type: "payroll",
          employee_name: employee_name.trim(),
          shift_start: startISO,
          shift_end: endISO,
          hours_worked: hoursWorked,
          hourly_rate: hourlyRate,
        })
        .select()
        .single();

      if (txnError) {
        console.log("Error creating payroll transaction:", txnError);
        return c.json({ error: `Failed to create transaction: ${txnError.message}` }, 500);
      }

      console.log(`✅ Payroll transaction created (${schedule}): ${employee_name.trim()} ${hoursWorked}h × $${hourlyRate} = $${Math.abs(payrollAmount)}`);
      return c.json({ transaction }, 201);
    }

    // Move Money transaction (cash out to vault; no vault logic yet)
    if (cash_out_type === "move_money") {
      if (amount === undefined || amount === null) {
        return c.json({ error: "Amount is required for move money" }, 400);
      }
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return c.json({ error: "Amount must be a positive number" }, 400);
      }
      const moveAmount = -amountNum;
      const desc = notes?.trim() ? `Move money: ${notes.trim()}` : "Move money";

      const { data: transaction, error: txnError } = await supabase
        .from("drawer_transactions")
        .insert({
          drawer_txn_id: crypto.randomUUID(),
          drawer_id: openDrawer.drawer_id,
          payment_id: null,
          txn_type: "cash_out",
          method: "Cash",
          amount: moveAmount,
          description: desc,
          reference: null,
          created_by: currentUser,
          category_id: null,
          cash_out_type: "move_money",
        })
        .select()
        .single();

      if (txnError) {
        console.log("Error creating move money transaction:", txnError);
        return c.json({ error: `Failed to create transaction: ${txnError.message}` }, 500);
      }
      console.log(`✅ Move money transaction created: $${amountNum}`);
      return c.json({ transaction }, 201);
    }

    // Expense / Cash-in transaction
    if (amount === undefined || amount === null) {
      return c.json({ error: "Amount is required" }, 400);
    }

    const isOtro = categoryName?.toLowerCase() === "otro";
    if (isOtro && (!notes || notes.trim() === "")) {
      return c.json({ error: "Description is required when category is 'Otro'" }, 400);
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return c.json({ error: "Amount must be a valid number" }, 400);
    }

    const { data: transaction, error: txnError } = await supabase
      .from("drawer_transactions")
      .insert({
        drawer_txn_id: crypto.randomUUID(),
        drawer_id: openDrawer.drawer_id,
        payment_id: null,
        txn_type: amountNum > 0 ? "cash_in" : "cash_out",
        method: "Cash",
        amount: amountNum,
        description: notes?.trim() || null,
        reference: null,
        created_by: currentUser,
        category_id: category_id || null,
        cash_out_type: amountNum < 0 ? (cash_out_type || "expense") : null,
      })
      .select()
      .single();

    if (txnError) {
      console.log("Error creating manual cash transaction:", txnError);
      return c.json({ error: `Failed to create transaction: ${txnError.message}` }, 500);
    }

    console.log(`✅ Manual cash transaction created: ${amountNum > 0 ? 'IN' : 'OUT'} $${Math.abs(amountNum)}`);

    return c.json({ transaction }, 201);
  } catch (error: any) {
    console.log("Error adding cash transaction:", error);
    return c.json({ error: `Failed to add transaction: ${error.message}` }, 500);
  }
});

// GET /drawer/audit - Get audit log for a drawer (from drawer_audit_log table)
// Note: audit entries are created automatically by DB triggers on daily_drawers and drawer_transactions
app.get("/make-server-918f1e54/drawer/audit", async (c) => {
  try {
    const drawerId = c.req.query("drawerId");
    if (!drawerId) {
      return c.json({ error: "drawerId query param is required" }, 400);
    }

    const { data, error } = await supabase
      .from("drawer_audit_log")
      .select("audit_id, drawer_id, txn_id, action, old_values, new_values, performed_by, created_at")
      .eq("drawer_id", drawerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Error fetching drawer audit log from table:", error);
      return c.json({ error: `Failed to fetch audit log: ${error.message}` }, 500);
    }

    return c.json({ auditLog: data || [] });
  } catch (error: any) {
    console.log("Error fetching drawer audit log:", error);
    return c.json({ error: `Failed to fetch audit log: ${error.message}` }, 500);
  }
});

// PUT /drawer/opening-cash - Edit opening cash of the current open drawer
app.put("/make-server-918f1e54/drawer/opening-cash", async (c) => {
  try {
    const body = await c.req.json();
    const { openingCash } = body;

    if (openingCash === undefined || openingCash === null) {
      return c.json({ error: "Opening cash amount is required" }, 400);
    }

    const openingCashNum = parseFloat(openingCash);
    if (isNaN(openingCashNum) || openingCashNum < 0) {
      return c.json({ error: "Opening cash must be a valid non-negative number" }, 400);
    }

    // Get current open drawer
    const openDrawer = await getCurrentOpenDrawer(supabase);
    if (!openDrawer) {
      return c.json({ error: "No open cash drawer found." }, 400);
    }

    const oldAmount = parseFloat(openDrawer.opening_cash) || 0;

    // Update opening cash
    const { data: updatedDrawer, error: updateError } = await supabase
      .from("daily_drawers")
      .update({ opening_cash: openingCashNum })
      .eq("drawer_id", openDrawer.drawer_id)
      .select("*")
      .single();

    if (updateError) {
      console.log("Error updating opening cash:", updateError);
      return c.json({ error: `Failed to update opening cash: ${updateError.message}` }, 500);
    }

    // Audit log is handled automatically by DB trigger on daily_drawers UPDATE

    console.log(`✅ Opening cash updated for drawer ${openDrawer.drawer_id}: $${Math.round(oldAmount)} → $${Math.round(openingCashNum)}`);

    return c.json({ drawer: updatedDrawer });
  } catch (error: any) {
    console.log("Error updating opening cash:", error);
    return c.json({ error: `Failed to update opening cash: ${error.message}` }, 500);
  }
});

// PUT /drawer/transaction/:id - Edit a manual cash_in or cash_out transaction
app.put("/make-server-918f1e54/drawer/transaction/:id", async (c) => {
  try {
    const transactionId = c.req.param("id");
    const body = await c.req.json();
    const { amount, notes, category_id, cash_out_type, employee_name, shift_start, shift_end, payroll_schedule, hours_worked: body_hours_worked } = body;

    // Get current open drawer
    const openDrawer = await getCurrentOpenDrawer(supabase);
    if (!openDrawer) {
      return c.json({ error: "No open cash drawer found." }, 400);
    }

    // Fetch the transaction to verify it's editable (manual cash_in/cash_out only)
    const { data: existingTxn, error: fetchError } = await supabase
      .from("drawer_transactions")
      .select("*")
      .eq("drawer_txn_id", transactionId)
      .eq("drawer_id", openDrawer.drawer_id)
      .single();

    if (fetchError || !existingTxn) {
      console.log("Error fetching transaction for edit:", fetchError);
      return c.json({ error: "Transaction not found in current drawer" }, 404);
    }

    if (!['cash_in', 'cash_out', 'in', 'out'].includes(existingTxn.txn_type)) {
      return c.json({ error: "Only manual cash in/out transactions can be edited" }, 403);
    }

    if (existingTxn.payment_id) {
      return c.json({ error: "System-generated transactions cannot be edited" }, 403);
    }

    // Look up category to check if description is required
    let categoryName: string | null = null;
    const effectiveCategoryId = category_id !== undefined ? category_id : existingTxn.category_id;
    if (effectiveCategoryId) {
      const { data: cat } = await supabase
        .from("drawer_transaction_categories")
        .select("name")
        .eq("id", effectiveCategoryId)
        .single();
      categoryName = cat?.name || null;
    }

    const isOtro = categoryName?.toLowerCase() === "otro";
    if (isOtro && (!notes || notes.trim() === "")) {
      return c.json({ error: "Description is required when category is 'Otro'" }, 400);
    }

    const effectiveCashOutType = cash_out_type !== undefined ? cash_out_type : existingTxn.cash_out_type;

    // Handle move_money edit (amount + notes only)
    if (effectiveCashOutType === "move_money" || existingTxn.cash_out_type === "move_money") {
      if (amount === undefined || amount === null) {
        return c.json({ error: "Amount is required" }, 400);
      }
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return c.json({ error: "Amount must be a positive number" }, 400);
      }
      const moveAmount = -amountNum;
      const desc = notes?.trim() ? `Move money: ${notes.trim()}` : "Move money";

      const { data: updatedTxn, error: updateError } = await supabase
        .from("drawer_transactions")
        .update({
          amount: moveAmount,
          txn_type: "cash_out",
          description: desc,
          cash_out_type: "move_money",
          category_id: null,
          employee_name: null,
          shift_start: null,
          shift_end: null,
          hours_worked: null,
          hourly_rate: null,
        })
        .eq("drawer_txn_id", transactionId)
        .select("*")
        .single();

      if (updateError) {
        console.log("Error updating move money transaction:", updateError);
        return c.json({ error: `Failed to update transaction: ${updateError.message}` }, 500);
      }
      return c.json({ transaction: updatedTxn });
    }

    // Handle payroll edit
    if (effectiveCashOutType === "payroll") {
      const effectiveEmployee = employee_name !== undefined ? employee_name : existingTxn.employee_name;
      if (!effectiveEmployee || effectiveEmployee.trim() === "") {
        return c.json({ error: "Employee name is required for payroll" }, 400);
      }

      const schedule = payroll_schedule || (existingTxn.shift_start ? "daily" : "weekly");
      let hoursWorked: number;
      let startISO: string | null = null;
      let endISO: string | null = null;

      if (schedule === "weekly") {
        const h = body_hours_worked !== undefined ? parseFloat(body_hours_worked) : (existingTxn.hours_worked ? parseFloat(existingTxn.hours_worked) : NaN);
        if (isNaN(h) || h <= 0) {
          return c.json({ error: "Hours worked must be a positive number" }, 400);
        }
        if ((h * 2) % 1 !== 0) {
          return c.json({ error: "Hours must be in 0.5 increments (e.g. 8, 8.5, 37.5)" }, 400);
        }
        hoursWorked = h;
      } else {
        const effectiveStart = shift_start || existingTxn.shift_start;
        const effectiveEnd = shift_end || existingTxn.shift_end;
        if (!effectiveStart || !effectiveEnd) {
          return c.json({ error: "Shift start and end times are required for daily payroll" }, 400);
        }
        const start = new Date(effectiveStart);
        const end = new Date(effectiveEnd);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return c.json({ error: "Invalid shift start or end time" }, 400);
        }
        let diffMs = end.getTime() - start.getTime();
        if (diffMs <= 0) diffMs += 24 * 60 * 60 * 1000;
        if (diffMs > 12 * 60 * 60 * 1000) {
          return c.json({ error: "Shift duration cannot exceed 12 hours" }, 400);
        }
        hoursWorked = Math.round((diffMs / 3600000) * 100) / 100;
        startISO = start.toISOString();
        endISO = end.toISOString();
      }

      const { data: wageKv } = await supabase
        .from("kv_store_918f1e54")
        .select("value")
        .eq("key", "config_storeAssistant_wageByHour")
        .single();

      const hourlyRate = parseFloat(wageKv?.value || "5000");
      const payrollAmount = -(hoursWorked * hourlyRate);

      const descParts = [`Payroll: ${effectiveEmployee.trim()}`];
      if (schedule === "weekly") descParts.push("Weekly");
      if (notes && notes.trim()) descParts.push(notes.trim());

      const { data: updatedTxn, error: updateError } = await supabase
        .from("drawer_transactions")
        .update({
          amount: payrollAmount,
          txn_type: "cash_out",
          description: descParts.join(" - "),
          cash_out_type: "payroll",
          employee_name: effectiveEmployee.trim(),
          shift_start: startISO,
          shift_end: endISO,
          hours_worked: hoursWorked,
          hourly_rate: hourlyRate,
          category_id: null,
        })
        .eq("drawer_txn_id", transactionId)
        .select("*")
        .single();

      if (updateError) {
        console.log("Error updating payroll transaction:", updateError);
        return c.json({ error: `Failed to update transaction: ${updateError.message}` }, 500);
      }

      console.log(`✅ Payroll transaction ${transactionId} updated (${schedule}): ${effectiveEmployee} ${hoursWorked}h`);
      return c.json({ transaction: updatedTxn });
    }

    // Expense / cash-in edit
    if (amount === undefined || amount === null) {
      return c.json({ error: "Amount is required" }, 400);
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return c.json({ error: "Amount must be a valid number" }, 400);
    }

    const oldAmount = parseFloat(existingTxn.amount) || 0;
    const newTxnType = amountNum >= 0 ? "cash_in" : "cash_out";

    const { data: updatedTxn, error: updateError } = await supabase
      .from("drawer_transactions")
      .update({
        amount: amountNum,
        txn_type: newTxnType,
        description: notes?.trim() || null,
        category_id: effectiveCategoryId || null,
        cash_out_type: amountNum < 0 ? (effectiveCashOutType || "expense") : null,
        employee_name: null,
        shift_start: null,
        shift_end: null,
        hours_worked: null,
        hourly_rate: null,
      })
      .eq("drawer_txn_id", transactionId)
      .select("*")
      .single();

    if (updateError) {
      console.log("Error updating drawer transaction:", updateError);
      return c.json({ error: `Failed to update transaction: ${updateError.message}` }, 500);
    }

    console.log(`✅ Drawer transaction ${transactionId} updated: amount $${Math.round(Math.abs(oldAmount))} → $${Math.round(Math.abs(amountNum))}, type: ${existingTxn.txn_type} → ${newTxnType}`);

    return c.json({ transaction: updatedTxn });
  } catch (error: any) {
    console.log("Error updating drawer transaction:", error);
    return c.json({ error: `Failed to update transaction: ${error.message}` }, 500);
  }
});

// DELETE /drawer/transaction/:id - Delete a manual cash_in or cash_out transaction
app.delete("/make-server-918f1e54/drawer/transaction/:id", async (c) => {
  try {
    const transactionId = c.req.param("id");

    // Get current open drawer
    const openDrawer = await getCurrentOpenDrawer(supabase);
    if (!openDrawer) {
      return c.json({ error: "No open cash drawer found." }, 400);
    }

    // Fetch the transaction to verify it's deletable
    const { data: existingTxn, error: fetchError } = await supabase
      .from("drawer_transactions")
      .select("*")
      .eq("drawer_txn_id", transactionId)
      .eq("drawer_id", openDrawer.drawer_id)
      .single();

    if (fetchError || !existingTxn) {
      console.log("Error fetching transaction for delete:", fetchError);
      return c.json({ error: "Transaction not found in current drawer" }, 404);
    }

    if (!['cash_in', 'cash_out', 'in', 'out'].includes(existingTxn.txn_type)) {
      return c.json({ error: "Only manual cash in/out transactions can be deleted" }, 403);
    }

    if (existingTxn.payment_id) {
      return c.json({ error: "System-generated transactions cannot be deleted" }, 403);
    }

    const deletedAmount = parseFloat(existingTxn.amount) || 0;

    const { error: deleteError } = await supabase
      .from("drawer_transactions")
      .delete()
      .eq("drawer_txn_id", transactionId);

    if (deleteError) {
      console.log("Error deleting drawer transaction:", deleteError);
      return c.json({ error: `Failed to delete transaction: ${deleteError.message}` }, 500);
    }

    // Audit log is handled automatically by DB trigger on drawer_transactions DELETE

    console.log(`✅ Drawer transaction ${transactionId} deleted: ${existingTxn.txn_type} $${Math.round(Math.abs(deletedAmount))} "${existingTxn.description}"`);

    return c.json({ success: true });
  } catch (error: any) {
    console.log("Error deleting drawer transaction:", error);
    return c.json({ error: `Failed to delete transaction: ${error.message}` }, 500);
  }
});
}
