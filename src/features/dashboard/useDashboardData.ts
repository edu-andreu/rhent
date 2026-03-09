import { useState, useEffect } from "react";
import { getFunction } from "../../shared/api/client";
import { supabase, supabaseConfig } from "../../shared/config/env";
import type { Transaction, CashTransaction } from "../../types";

export interface DashboardPaymentMethod {
  id: string;
  payment_method: string;
  status: string;
  payment_type: string;
}

export interface DashboardOwner {
  id: string;
  full_name: string | null;
  role: string;
}

export interface VaultTransfer {
  id: string;
  fromDrawer: string;
  amount: number;
  date: Date;
  transferredBy: string;
}

interface DrawerTransactionRaw {
  transactionId: string;
  transactionType: string;
  amount: number;
  createdAt: string;
  referenceId: string;
  referenceType: string;
  paymentMethod: string;
  notes?: string;
  description?: string;
  categoryName?: string | null;
  cashOutType?: string | null;
}

interface RevenueTransactionsResponse {
  transactions: Array<Omit<Transaction, "date"> & { date: string }>;
}

interface DrawerCurrentResponse {
  drawer: {
    drawerId: string;
    openingCash: number;
    status: string;
  } | null;
  summary: {
    openingCash: number;
    totalCashIn: number;
    totalCashOut: number;
    expectedBalance: number;
  } | null;
  transactions: DrawerTransactionRaw[];
}

function mapDrawerTransactions(
  raw: DrawerTransactionRaw[],
): { transactions: Transaction[]; cashTransactions: CashTransaction[]; vaultTransfers: VaultTransfer[] } {
  const transactions: Transaction[] = [];
  const cashTransactions: CashTransaction[] = [];
  const vaultTransfers: VaultTransfer[] = [];

  for (const t of raw) {
    const date = new Date(t.createdAt);

    if (t.cashOutType === "move_money") {
      vaultTransfers.push({
        id: t.transactionId,
        fromDrawer: "Showroom Principal",
        amount: Math.abs(t.amount),
        date,
        transferredBy: t.description || "Admin",
      });
      continue;
    }

    const isCheckoutType = ["checkout", "return_checkout", "reservation_checkout"].includes(t.transactionType);
    if (isCheckoutType) {
      const txType = t.transactionType === "checkout"
        ? "rental"
        : t.transactionType === "reservation_checkout"
          ? "reservation"
          : "rental";

      transactions.push({
        id: t.transactionId,
        type: txType as Transaction["type"],
        relatedId: t.referenceId,
        itemName: t.description || "",
        amount: Math.abs(t.amount),
        status: "completed",
        paymentMethodId: "",
        paymentMethod: t.paymentMethod || "Efectivo",
        date,
        description: t.description || "",
      });
    }

    if (t.transactionType === "cancellation") {
      transactions.push({
        id: t.transactionId,
        type: "refund",
        relatedId: t.referenceId,
        itemName: t.description || "",
        amount: Math.abs(t.amount),
        status: "completed",
        paymentMethodId: "",
        paymentMethod: t.paymentMethod || "Efectivo",
        date,
        description: t.description || "",
      });
    }

    const isCashInOut = ["cash_in", "cash_out", "in", "out"].includes(t.transactionType);
    if (isCashInOut) {
      const direction = ["cash_out", "out"].includes(t.transactionType) ? "out" : "in";
      cashTransactions.push({
        id: t.transactionId,
        type: direction,
        amount: Math.abs(t.amount),
        description: t.description || t.notes || "",
        category: t.categoryName || "Other",
        date,
      });
    }

    if (t.transactionType === "cancellation") {
      cashTransactions.push({
        id: `${t.transactionId}-cash`,
        type: "out",
        amount: Math.abs(t.amount),
        description: t.description || "Cancellation refund",
        category: "Cancellation",
        date,
      });
    }
  }

  return { transactions, cashTransactions, vaultTransfers };
}

export interface DashboardData {
  transactions: Transaction[];
  cashTransactions: CashTransaction[];
  openingBalance: number;
  paymentMethods: DashboardPaymentMethod[];
  owners: DashboardOwner[];
  vaultTransfers: VaultTransfer[];
  loading: boolean;
}

export function useDashboardData(): DashboardData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<DashboardPaymentMethod[]>([]);
  const [owners, setOwners] = useState<DashboardOwner[]>([]);
  const [vaultTransfers, setVaultTransfers] = useState<VaultTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const to = new Date();
        const from = new Date(to);
        from.setFullYear(from.getFullYear() - 1);
        const fromISO = from.toISOString();
        const toISO = to.toISOString();

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? supabaseConfig.publicAnonKey;
        const authInit: RequestInit = { headers: { Authorization: `Bearer ${token}` } };

        const results = await Promise.allSettled([
          getFunction<DrawerCurrentResponse>("drawer/current", authInit),
          getFunction<{ paymentMethods: DashboardPaymentMethod[] }>("payment-methods", authInit),
          getFunction<{ users: DashboardOwner[] }>("users", authInit),
          getFunction<RevenueTransactionsResponse>(
            `dashboard/revenue-transactions?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
            authInit
          ),
        ]);

        if (results[0].status === "fulfilled") {
          const drawerData = results[0].value;
          setOpeningBalance(drawerData.summary?.openingCash ?? drawerData.drawer?.openingCash ?? 0);
          const mapped = mapDrawerTransactions(drawerData.transactions || []);
          setCashTransactions(mapped.cashTransactions);
          setVaultTransfers(mapped.vaultTransfers);
        }

        if (results[1].status === "fulfilled") {
          setPaymentMethods(results[1].value.paymentMethods || []);
        }

        if (results[2].status === "fulfilled") {
          const allUsers = results[2].value.users || [];
          setOwners(allUsers.filter((u) => u.role === "owner"));
        }

        if (results[3].status === "fulfilled") {
          const revenue = results[3].value;
          const txns: Transaction[] = (revenue.transactions || []).map((t) => ({
            ...t,
            date: new Date(t.date),
          }));
          setTransactions(txns);
        }
      } catch {
        // Graceful degradation - dashboard works with empty data
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return {
    transactions,
    cashTransactions,
    openingBalance,
    paymentMethods,
    owners,
    vaultTransfers,
    loading,
  };
}
