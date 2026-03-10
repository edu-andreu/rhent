import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";

/**
 * Dashboard routes use the payments table (and related data) for revenue metrics,
 * not drawer_transactions, so all payment methods (e.g. Ualá) and types (rental/sale/refund) are included.
 */
export function registerDashboardRoutes(app: Hono, supabase: SupabaseClient) {
  // GET /dashboard/revenue-transactions - Payments in date range for Sales tab (revenue by payment method, by type, itemsSold)
  app.get("/make-server-918f1e54/dashboard/revenue-transactions", async (c) => {
    try {
      const from = c.req.query("from");
      const to = c.req.query("to");
      if (!from || !to) {
        return c.json({ error: "Query params 'from' and 'to' (ISO date strings) are required" }, 400);
      }

      const { data: payments, error: payError } = await supabase
        .from("payments")
        .select("id, rental_id, rental_item_id, amount, paid_at, reference, method, payment_method_id")
        .gte("paid_at", from)
        .lte("paid_at", to)
        .order("paid_at", { ascending: false });

      if (payError) {
        console.log("Error fetching dashboard revenue payments:", payError);
        return c.json({ error: `Failed to fetch revenue transactions: ${payError.message}` }, 500);
      }

      const rentalItemIds = [...new Set((payments || []).map((p: any) => p.rental_item_id).filter(Boolean))];
      interface RentalItemInfo {
        isSale: boolean;
        itemStatus: string;
        inventoryItemId: string | null;
        lateDays: number;
        lateFeeAmount: number;
        discountAmount: number;
        extraDays: number;
        extraDaysAmount: number;
        unitPrice: number;
      }
      let itemInfoById: Record<string, RentalItemInfo> = {};
      if (rentalItemIds.length > 0) {
        const { data: items } = await supabase
          .from("rental_items")
          .select("id, is_sale, item_id, status, late_days, late_fee_amount, discount_amount, extra_days, extra_days_amount, unit_price")
          .in("id", rentalItemIds);
        itemInfoById = (items || []).reduce((acc: Record<string, RentalItemInfo>, row: any) => {
          acc[row.id] = {
            isSale: row.is_sale === true,
            itemStatus: row.status || "",
            inventoryItemId: row.item_id || null,
            lateDays: parseInt(row.late_days) || 0,
            lateFeeAmount: parseFloat(row.late_fee_amount) || 0,
            discountAmount: parseFloat(row.discount_amount) || 0,
            extraDays: parseInt(row.extra_days) || 0,
            extraDaysAmount: parseFloat(row.extra_days_amount) || 0,
            unitPrice: parseFloat(row.unit_price) || 0,
          };
          return acc;
        }, {});
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const inventoryItemIds = [...new Set(Object.values(itemInfoById).map(v => v.inventoryItemId).filter(Boolean))] as string[];
      interface InventoryItemInfo { category: string; name: string; image: string; }
      let inventoryInfoById: Record<string, InventoryItemInfo> = {};
      if (inventoryItemIds.length > 0) {
        const { data: invItems } = await supabase
          .from("inventory_items")
          .select("id, name:name_id(name), category:category_id(category, default_image)")
          .in("id", inventoryItemIds);
        inventoryInfoById = (invItems || []).reduce((acc: Record<string, InventoryItemInfo>, row: any) => {
          const defaultImage = row.category?.default_image?.trim();
          acc[row.id] = {
            category: row.category?.category || "Other",
            name: row.name?.name || "Unknown",
            image: defaultImage ? `${supabaseUrl}/storage/v1/object/public/photos/${defaultImage}` : "",
          };
          return acc;
        }, {});
      }

      const transactions = (payments || []).map((p: any) => {
        const amount = parseFloat(p.amount) || 0;
        const isRefund = amount < 0;
        const info = p.rental_item_id ? itemInfoById[p.rental_item_id] : null;
        const isSale = info?.isSale === true;
        const isReserved = info?.itemStatus === "reserved";
        const type = isRefund ? "refund" : isSale ? "sale" : isReserved ? "reservation" : "rental";
        const invInfo = info?.inventoryItemId ? inventoryInfoById[info.inventoryItemId] : null;
        return {
          id: p.id,
          type,
          relatedId: p.rental_id || "",
          itemName: invInfo?.name || "",
          inventoryItemId: info?.inventoryItemId || "",
          itemImage: invInfo?.image || "",
          amount: Math.abs(amount),
          status: "completed" as const,
          paymentMethodId: p.payment_method_id || "",
          paymentMethod: p.method || "Other",
          date: p.paid_at,
          description: p.reference || "",
          category: invInfo?.category || "Other",
          lateDays: info?.lateDays || 0,
          lateFeeAmount: info?.lateFeeAmount || 0,
          discountAmount: info?.discountAmount || 0,
          discountPercent: info ? (() => {
            const subtotal = info.unitPrice + info.extraDaysAmount;
            return subtotal > 0 ? Math.round((info.discountAmount / subtotal) * 100) : 0;
          })() : 0,
          extraDays: info?.extraDays || 0,
          extraDaysAmount: info?.extraDaysAmount || 0,
        };
      });

      return c.json({ transactions });
    } catch (error: any) {
      console.log("Error in dashboard/revenue-transactions:", error);
      return c.json({ error: `Failed to load revenue transactions: ${error.message}` }, 500);
    }
  });

  // GET /dashboard/cash-transactions - Cash in/out + vault transfers in date range for Expenses/Money tabs
  app.get("/make-server-918f1e54/dashboard/cash-transactions", async (c) => {
    try {
      const from = c.req.query("from");
      const to = c.req.query("to");
      if (!from || !to) {
        return c.json({ error: "Query params 'from' and 'to' (ISO date strings) are required" }, 400);
      }

      const { data: transactions, error: txnError } = await supabase
        .from("drawer_transactions")
        .select(`
          drawer_txn_id,
          txn_type,
          amount,
          description,
          created_at,
          category_id,
          cash_out_type,
          drawer_transaction_categories (
            name,
            category
          )
        `)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: true });

      if (txnError) {
        console.log("Error fetching dashboard cash transactions:", txnError);
        return c.json({ error: `Failed to fetch cash transactions: ${txnError.message}` }, 500);
      }

      const cashTransactions: Array<{
        id: string;
        type: "in" | "out";
        amount: number;
        description: string;
        category: string;
        date: string;
        paymentMethod?: string;
      }> = [];

      const vaultTransfers: Array<{
        id: string;
        fromDrawer: string;
        amount: number;
        date: string;
        transferredBy: string;
      }> = [];

      for (const txn of transactions || []) {
        const rawAmount = parseFloat((txn as any).amount) || 0;
        const amount = Math.round(rawAmount);
        const date = (txn as any).created_at as string;

        // Move money is treated as a vault transfer, not an expense
        if ((txn as any).cash_out_type === "move_money") {
          vaultTransfers.push({
            id: (txn as any).drawer_txn_id,
            fromDrawer: "Showroom Principal",
            amount: Math.abs(amount),
            date,
            transferredBy: (txn as any).description || "Admin",
          });
          continue;
        }

        const txnType = (txn as any).txn_type as string;
        const isCashFlowType = ["cash_in", "cash_out", "in", "out", "cancellation"].includes(txnType);
        if (!isCashFlowType) continue;

        const direction: "in" | "out" = ["cash_out", "out", "cancellation"].includes(txnType) ? "out" : "in";
        const cat = (txn as any).drawer_transaction_categories;
        let category: string;
        if ((txn as any).cash_out_type === "payroll") {
          category = "Payroll";
        } else if (cat) {
          const catCol = cat.category;
          category = (catCol && String(catCol).trim() !== "") ? String(catCol).trim() : (cat.name || "Other");
        } else {
          category = txnType === "cancellation" ? "Cancellation" : "Other";
        }

        cashTransactions.push({
          id: (txn as any).drawer_txn_id,
          type: direction,
          amount: Math.abs(amount),
          description: (txn as any).description || "",
          category,
          date,
          paymentMethod: "Efectivo",
        });
      }

      // Append manual expenses (non-cash and cash) from expenses table
      const { data: expensesRows, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          expense_date,
          description,
          drawer_transaction_categories (
            name,
            category
          ),
          payments_methods (
            payment_method
          )
        `)
        .gte("expense_date", from)
        .lte("expense_date", to)
        .order("expense_date", { ascending: true });

      if (!expensesError && expensesRows && expensesRows.length > 0) {
        for (const row of expensesRows) {
          const amount = Math.abs(Math.round(parseFloat((row as any).amount) || 0));
          const cat = (row as any).drawer_transaction_categories;
          const catCol = cat?.category;
          const category = (catCol && String(catCol).trim() !== "") ? String(catCol).trim() : (cat?.name || "Other");
          const paymentMethod = (row as any).payments_methods?.payment_method || "Other";
          cashTransactions.push({
            id: (row as any).id,
            type: "out",
            amount,
            description: (row as any).description || "",
            category,
            date: (row as any).expense_date,
            paymentMethod,
          });
        }
      }

      return c.json({ cashTransactions, vaultTransfers });
    } catch (error: any) {
      console.log("Error in dashboard/cash-transactions:", error);
      return c.json({ error: `Failed to load cash transactions: ${error.message}` }, 500);
    }
  });
}
