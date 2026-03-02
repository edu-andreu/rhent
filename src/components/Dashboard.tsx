import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dress, Rental, Reservation, Transaction, CashTransaction } from '../types';
import { DashboardDateFilter } from './dashboard/DashboardDateFilter';
import { DashboardKPICards } from './dashboard/DashboardKPICards';
import { RevenueChart } from './dashboard/RevenueChart';
import { RentalStatusChart } from './dashboard/RentalStatusChart';
import { InventoryUsageChart } from './dashboard/InventoryUsageChart';
import { useDashboardMetrics } from './dashboard/useDashboardMetrics';

interface DashboardProps {
  dresses: Dress[];
  rentals: Rental[];
  reservations: Reservation[];
  transactions: Transaction[];
  cashTransactions: CashTransaction[];
  openingBalance: number;
}

export function Dashboard({
  dresses,
  rentals,
  reservations,
  transactions,
  cashTransactions,
  openingBalance,
}: DashboardProps) {
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

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
    dresses, rentals, reservations, transactions, cashTransactions, openingBalance, dateRange,
  );

  return (
    <div className="space-y-6">
      <DashboardDateFilter
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        onCustomDateFromChange={setCustomDateFrom}
        onCustomDateToChange={setCustomDateTo}
      />

      <DashboardKPICards
        totalRevenue={metrics.totalRevenue}
        todayRevenue={metrics.todayRevenue}
        thisMonthRevenue={metrics.thisMonthRevenue}
        revenueGrowth={metrics.revenueGrowth}
        activeRentals={metrics.activeRentals}
        overdueRentals={metrics.overdueRentals}
        upcomingReservations={metrics.upcomingReservations}
      />

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueChart
            revenueTrend={metrics.revenueTrend}
            currentCashBalance={metrics.currentCashBalance}
            openingBalance={openingBalance}
            avgRentalValue={metrics.avgRentalValue}
            totalRentals={metrics.totalRentals}
          />
        </TabsContent>

        <TabsContent value="category">
          <RentalStatusChart
            categoryData={metrics.categoryData}
            popularDresses={metrics.popularDresses}
          />
        </TabsContent>

        <TabsContent value="cashflow">
          <InventoryUsageChart
            cashIn={metrics.cashIn}
            cashOut={metrics.cashOut}
            netCashFlow={metrics.netCashFlow}
            currentCashBalance={metrics.currentCashBalance}
            cashInCategories={metrics.cashInCategories}
            cashOutCategories={metrics.cashOutCategories}
            cashFlowTrend={metrics.cashFlowTrend}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
