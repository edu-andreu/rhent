import { useMemo } from 'react';
import { Dress, Rental, Reservation, Transaction, CashTransaction } from '../../types';
import { RESERVATION_STATUS } from '../../shared/constants/status';

interface DateRange {
  from: Date;
  to: Date;
}

export function useDashboardMetrics(
  dresses: Dress[],
  rentals: Rental[],
  reservations: Reservation[],
  transactions: Transaction[],
  cashTransactions: CashTransaction[],
  openingBalance: number,
  dateRange: DateRange | null,
) {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const isInDateRange = (date: Date) => {
      if (!dateRange) return true;
      return date >= dateRange.from && date <= dateRange.to;
    };

    const filteredTransactions = dateRange
      ? transactions.filter(t => isInDateRange(new Date(t.date)))
      : transactions;

    const filteredCashTransactions = dateRange
      ? cashTransactions.filter(t => isInDateRange(new Date(t.date)))
      : cashTransactions;

    const filteredRentals = dateRange
      ? rentals.filter(r => isInDateRange(new Date(r.startDate)))
      : rentals;

    const filteredReservations = dateRange
      ? reservations.filter(r => isInDateRange(new Date(r.createdAt)))
      : reservations;

    const activeRentals = filteredRentals.filter(r => r.status === 'active');
    const totalRentals = filteredRentals.length;

    const upcomingReservations = filteredReservations.filter(
      r => r.status === RESERVATION_STATUS.CONFIRMED && r.reservationDate >= today
    );

    const totalRevenue = filteredTransactions.reduce((sum, t) =>
      t.status === 'completed' ? sum + t.amount : sum, 0
    );

    const todayRevenue = filteredTransactions
      .filter(t => new Date(t.date) >= today && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisMonthRevenue = filteredTransactions
      .filter(t => new Date(t.date) >= thisMonth && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthRevenue = filteredTransactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate >= lastMonth && tDate <= lastMonthEnd && t.status === 'completed';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueGrowth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    const cashIn = filteredCashTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashOut = filteredCashTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.amount, 0);
    const currentCashBalance = openingBalance + cashIn - cashOut;

    const rentalTransactions = filteredTransactions.filter(t => t.type === 'rental' && t.status === 'completed');
    const avgRentalValue = rentalTransactions.length > 0
      ? rentalTransactions.reduce((sum, t) => sum + t.amount, 0) / rentalTransactions.length
      : 0;

    const dressRentalCounts = filteredRentals.reduce((acc, rental) => {
      acc[rental.dressId] = (acc[rental.dressId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularDresses = Object.entries(dressRentalCounts)
      .map(([dressId, count]) => {
        const dress = dresses.find(d => d.id === dressId);
        return { dressId, count, name: dress?.name || 'Unknown' };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const revenueByCategory = filteredTransactions
      .filter(t => t.type === 'rental' && t.status === 'completed')
      .reduce((acc, t) => {
        const rental = filteredRentals.find(r => r.id === t.relatedId);
        if (rental) {
          const dress = dresses.find(d => d.id === rental.dressId);
          if (dress) {
            acc[dress.category] = (acc[dress.category] || 0) + t.amount;
          }
        }
        return acc;
      }, {} as Record<string, number>);

    const categoryData = Object.entries(revenueByCategory).map(([category, revenue]) => ({
      category,
      revenue,
    }));

    const revenueTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const dayRevenue = filteredTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate >= dayStart && tDate < dayEnd && t.status === 'completed';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
      };
    });

    const overdueRentals = activeRentals.filter(r => new Date(r.endDate) < today);

    const cashInByCategory = filteredCashTransactions
      .filter(t => t.type === 'in')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const cashOutByCategory = filteredCashTransactions
      .filter(t => t.type === 'out')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const cashInCategories = Object.entries(cashInByCategory).map(([category, amount]) => ({ category, amount }));
    const cashOutCategories = Object.entries(cashOutByCategory).map(([category, amount]) => ({ category, amount }));

    const cashFlowTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const dayCashIn = filteredCashTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate >= dayStart && tDate < dayEnd && t.type === 'in';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      const dayCashOut = filteredCashTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate >= dayStart && tDate < dayEnd && t.type === 'out';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cashIn: dayCashIn,
        cashOut: dayCashOut,
        netFlow: dayCashIn - dayCashOut,
      };
    });

    const netCashFlow = cashIn - cashOut;

    return {
      activeRentals: activeRentals.length,
      totalRentals,
      upcomingReservations: upcomingReservations.length,
      totalRevenue,
      todayRevenue,
      thisMonthRevenue,
      revenueGrowth,
      currentCashBalance,
      avgRentalValue,
      popularDresses,
      categoryData,
      revenueTrend,
      overdueRentals: overdueRentals.length,
      cashIn,
      cashOut,
      netCashFlow,
      cashInCategories,
      cashOutCategories,
      cashFlowTrend,
    };
  }, [dresses, rentals, reservations, transactions, cashTransactions, openingBalance, dateRange]);
}
