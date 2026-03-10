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

interface RevenueTransactionsResponse {
  transactions: Array<Omit<Transaction, "date"> & { date: string }>;
}

interface DashboardCashTransactionsResponse {
  cashTransactions: Array<Omit<CashTransaction, "date"> & { date: string }>;
  vaultTransfers: Array<Omit<VaultTransfer, "date"> & { date: string }>;
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
  transactions: unknown[];
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
          getFunction<DashboardCashTransactionsResponse>(
            `dashboard/cash-transactions?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
            authInit
          ),
        ]);

        if (results[0].status === "fulfilled") {
          const drawerData = results[0].value;
          setOpeningBalance(drawerData.summary?.openingCash ?? drawerData.drawer?.openingCash ?? 0);
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

        if (results[4].status === "fulfilled") {
          const data = results[4].value;
          const cashTxns: CashTransaction[] = (data.cashTransactions || []).map((t) => ({
            ...t,
            date: new Date(t.date),
          }));
          const vaults: VaultTransfer[] = (data.vaultTransfers || []).map((vt) => ({
            ...vt,
            date: new Date(vt.date),
          }));
          setCashTransactions(cashTxns);
          setVaultTransfers(vaults);
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
