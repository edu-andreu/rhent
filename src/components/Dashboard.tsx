import { useMemo, useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Dress, Rental, Reservation, Transaction, CashTransaction } from '../types';
import { DashboardDateFilter } from './dashboard/DashboardDateFilter';
import { SalesTab } from './dashboard/SalesTab';
import { ExpensesTab } from './dashboard/ExpensesTab';
import { MoneyTab } from './dashboard/MoneyTab';
import { useDashboardMetrics } from './dashboard/useDashboardMetrics';
import type { DashboardPaymentMethod, DashboardOwner, VaultTransfer } from '../features/dashboard/useDashboardData';
import { useAuth } from '../providers/AuthProvider';

const DASHBOARD_SUBTABS = [
  { value: 'sales' as const, permission: 'tab:dashboard:sales', label: 'Sales' },
  { value: 'expenses' as const, permission: 'tab:dashboard:expenses', label: 'Expenses' },
  { value: 'money' as const, permission: 'tab:dashboard:money', label: 'Money' },
] as const;

const FILTER_LABELS: Record<string, string> = {
  all: 'all time',
  today: 'today',
  yesterday: 'yesterday',
  last7days: 'last 7 days',
  last30days: 'last 30 days',
  thisMonth: 'this month',
  lastMonth: 'last month',
  custom: 'custom range',
};

interface DashboardProps {
  dresses: Dress[];
  rentals: Rental[];
  reservations: Reservation[];
  transactions: Transaction[];
  cashTransactions: CashTransaction[];
  openingBalance: number;
  paymentMethods: DashboardPaymentMethod[];
  owners: DashboardOwner[];
  vaultTransfers: VaultTransfer[];
}

export function Dashboard({
  dresses,
  rentals,
  reservations,
  transactions,
  cashTransactions,
  openingBalance,
  paymentMethods,
  owners,
  vaultTransfers,
}: DashboardProps) {
  const { permissions } = useAuth();
  const allowedSubTabs = useMemo(() => {
    const allowed = DASHBOARD_SUBTABS.filter((s) => permissions.includes(s.permission));
    return allowed.length > 0 ? allowed : DASHBOARD_SUBTABS;
  }, [permissions]);

  const [activeTab, setActiveTab] = useState<string>(allowedSubTabs[0].value);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const valid = allowedSubTabs.some((s) => s.value === activeTab);
    if (!valid) setActiveTab(allowedSubTabs[0].value);
  }, [allowedSubTabs, activeTab]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: today };
      }
      case 'last7days': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return { from: last7, to: new Date() };
      }
      case 'last30days': {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return { from: last30, to: new Date() };
      }
      case 'thisMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: firstDay, to: new Date() };
      }
      case 'lastMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: firstDay, to: lastDay };
      }
      case 'custom':
        if (customDateFrom && customDateTo) {
          return { from: customDateFrom, to: customDateTo };
        }
        return null;
      default:
        return null;
    }
  }, [dateFilter, customDateFrom, customDateTo]);

  const metrics = useDashboardMetrics(
    dresses, rentals, reservations, transactions, cashTransactions,
    openingBalance, dateRange, paymentMethods, vaultTransfers,
  );

  const filterLabel = FILTER_LABELS[dateFilter] || 'custom range';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            {allowedSubTabs.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DashboardDateFilter
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customDateFrom={customDateFrom}
          customDateTo={customDateTo}
          onCustomDateFromChange={setCustomDateFrom}
          onCustomDateToChange={setCustomDateTo}
        />
      </div>

      {allowedSubTabs.some((s) => s.value === 'sales') && activeTab === 'sales' && (
        <SalesTab metrics={metrics} filterLabel={filterLabel} dateFilter={dateFilter} />
      )}

      {allowedSubTabs.some((s) => s.value === 'expenses') && activeTab === 'expenses' && (
        <ExpensesTab metrics={metrics} filterLabel={filterLabel} />
      )}

      {allowedSubTabs.some((s) => s.value === 'money') && activeTab === 'money' && (
        <MoneyTab metrics={metrics} filterLabel={filterLabel} owners={owners} />
      )}
    </div>
  );
}
