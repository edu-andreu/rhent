import { useMemo } from 'react';
import { Dress, Rental, Reservation, Transaction, CashTransaction } from '../../types';
import type { DashboardPaymentMethod, DashboardOwner, VaultTransfer, OwnerDistribution } from '../../features/dashboard/useDashboardData';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SalesCardMetric {
  value: number;
  change: number;
}

export interface CategoryDataItem {
  category: string;
  revenue: number;
}

export interface PopularDressItem {
  dressId: string;
  count: number;
  name: string;
  category: string;
  image: string;
}

export interface PaymentMethodDataItem {
  method: string;
  amount: number;
}

export interface RevenueByTypeItem {
  type: string;
  amount: number;
}

export interface ExpenseCategoryItem {
  category: string;
  amount: number;
}

export interface MethodBalance {
  id: string;
  method: string;
  type: string;
  isCash: boolean;
  income: number;
  expenses: number;
  vaultTransfers: number;
  balance: number;
}

export interface DashboardMetrics {
  // Sales tab
  salesCards: {
    revenue: SalesCardMetric;
    rentals: SalesCardMetric;
    avgRental: SalesCardMetric;
    activeRentals: SalesCardMetric;
  };
  itemsRented: number;
  itemsReserved: number;
  itemsSold: number;
  avgTicket: number;
  overdueRentals: number;
  categoryData: CategoryDataItem[];
  popularDresses: PopularDressItem[];
  paymentMethodData: PaymentMethodDataItem[];
  revenueByTypeData: RevenueByTypeItem[];
  totalLateFees: number;
  lateFeeCount: number;
  avgLateDays: number;
  rentalsWithExtraDays: number;
  totalExtraDays: number;
  avgExtraDays: number;
  totalExtraDaysRevenue: number;
  totalDiscounts: number;
  discountCount: number;
  avgDiscountPercent: number;
  refundCount: number;
  utilizationRate: number;
  totalDresses: number;
  availableDresses: number;
  itemsUsed: number;

  // Expenses tab
  cashOutTransactions: CashTransaction[];
  totalCashOut: number;
  expenseCategoryData: ExpenseCategoryItem[];
  topExpenseCategory: ExpenseCategoryItem | null;

  // Money tab
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  currentCashBalance: number;
  methodBalances: MethodBalance[];
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  filteredVaultTransfers: VaultTransfer[];
  totalVaultCash: number;
  filteredOwnerDistributions: OwnerDistribution[];
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export function useDashboardMetrics(
  dresses: Dress[],
  rentals: Rental[],
  reservations: Reservation[],
  transactions: Transaction[],
  cashTransactions: CashTransaction[],
  openingBalance: number,
  dateRange: DateRange | null,
  paymentMethods: DashboardPaymentMethod[],
  vaultTransfers: VaultTransfer[],
  ownerDistributions: OwnerDistribution[],
): DashboardMetrics {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
      ? reservations.filter(r => isInDateRange(new Date(r.reservationDate)))
      : reservations;

    const isStoreCredit = (method: string) => /store\s*credit/i.test((method || '').trim());

    // ── Sales Tab ── (exclude Store Credit so Sales / Total Income reflect only real money in)
    const completedTx = filteredTransactions.filter(
      t => t.status === 'completed' && !isStoreCredit(t.paymentMethod)
    );
    const totalRevenue = completedTx.reduce((sum, t) => sum + t.amount, 0);
    const activeRentals = filteredRentals.filter(r => r.status === 'active');

    // Count sales events: sold, rentals, and current reservations (each transaction counts as one item)
    const itemsRented = completedTx.filter(t => t.type === 'rental').length;
    const itemsReserved = completedTx.filter(t => t.type === 'reservation').length;
    const itemsSold = completedTx.filter(t => t.type === 'sale').length;
    const totalUniqueItems = itemsRented + itemsReserved + itemsSold;
    // avgTicket will be recalculated below after netRevenue is known
    let avgTicket = 0;

    const rentalTransactions = completedTx.filter(t => t.type === 'rental');
    const avgRentalValue = rentalTransactions.length > 0
      ? rentalTransactions.reduce((sum, t) => sum + t.amount, 0) / rentalTransactions.length
      : 0;

    // Revenue by payment method
    const revenueByPaymentMethod = completedTx.reduce((acc, t) => {
      const methodName = t.paymentMethod.replace(/\s*\(.*\)$/, '').trim() || 'Other';
      acc[methodName] = (acc[methodName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const paymentMethodData = Object.entries(revenueByPaymentMethod).map(([method, amount]) => ({
      method,
      amount,
    }));

    // Revenue by type
    const typeLabels: Record<string, string> = {
      rental: 'Rent',
      reservation: 'Reserve',
      late_fee: 'Late Fee',
      refund: 'Refund',
      sale: 'Sold',
    };
    const revenueByType = completedTx.filter(t => t.type !== 'refund').reduce((acc, t) => {
      const label = typeLabels[t.type] || t.type;
      acc[label] = (acc[label] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const revenueByTypeData = Object.entries(revenueByType).map(([type, amount]) => ({
      type,
      amount,
    }));

    // Previous period comparison
    let prevRevenue = 0;
    let prevRentals = 0;
    let prevAvg = 0;
    let prevActive = 0;
    if (dateRange) {
      const duration = dateRange.to.getTime() - dateRange.from.getTime();
      const prevFrom = new Date(dateRange.from.getTime() - duration);
      const prevTo = new Date(dateRange.from.getTime());
      const prevFilteredTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= prevFrom && d < prevTo;
      });
      const prevFilteredRentals = rentals.filter(r => {
        const d = new Date(r.startDate);
        return d >= prevFrom && d < prevTo;
      });
      prevRevenue = prevFilteredTx
        .filter(t => t.status === 'completed' && !isStoreCredit(t.paymentMethod))
        .reduce((s, t) => s + t.amount, 0);
      const prevCompleted = prevFilteredTx.filter(t => t.status === 'completed');
      prevRentals = prevCompleted.filter(t => ['rental', 'reservation', 'sale'].includes(t.type)).length;
      const prevRentalTx = prevFilteredTx.filter(t => t.type === 'rental' && t.status === 'completed');
      prevAvg = prevRentalTx.length > 0 ? prevRentalTx.reduce((s, t) => s + t.amount, 0) / prevRentalTx.length : 0;
      prevActive = prevFilteredRentals.filter(r => r.status === 'active').length;
    }

    // salesCards.revenue will be updated below with netRevenue (after discounts)
    let salesCards = {
      revenue: { value: totalRevenue, change: pctChange(totalRevenue, prevRevenue) },
      rentals: { value: totalUniqueItems, change: pctChange(totalUniqueItems, prevRentals) },
      avgRental: { value: avgRentalValue, change: pctChange(avgRentalValue, prevAvg) },
      activeRentals: { value: activeRentals.length, change: pctChange(activeRentals.length, prevActive) },
    };

    // Revenue by category (uses category from backend revenue-transactions endpoint)
    const revenueByCategory = completedTx
      .filter(t => t.category && t.category !== 'Other')
      .reduce((acc, t) => {
        const cat = t.category!;
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    const categoryData = Object.entries(revenueByCategory).map(([category, revenue]) => ({
      category,
      revenue,
    }));

    // Popular items — count how many times each item was selected (rental/reservation/sale only; exclude refunds)
    const itemUsageMap: Record<string, { count: number; name: string; category: string; image: string }> = {};
    const txForPopular = completedTx.filter(t => t.type !== 'refund');
    for (const t of txForPopular) {
      const itemId = t.inventoryItemId;
      if (!itemId) continue;
      if (!itemUsageMap[itemId]) {
        itemUsageMap[itemId] = { count: 0, name: t.itemName || 'Unknown', category: t.category || '', image: t.itemImage || '' };
      }
      itemUsageMap[itemId].count += 1;
    }
    // Add current reserved items not yet converted to rentals (each reservation counts as one selection)
    const currentReservations = filteredReservations.filter(r => r.status !== 'cancelled' && !r.rentalId);
    for (const r of currentReservations) {
      const itemId = r.dressId;
      if (!itemId) continue;
      if (!itemUsageMap[itemId]) {
        itemUsageMap[itemId] = { count: 0, name: r.dressName || 'Unknown', category: r.category || '', image: r.dressImage || '' };
      }
      itemUsageMap[itemId].count += 1;
    }
    const popularDresses = Object.entries(itemUsageMap)
      .map(([dressId, info]) => ({
        dressId,
        count: info.count,
        name: info.name,
        category: info.category,
        image: info.image,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Unique items used (for utilization): distinct inventory items that were rented, reserved, or sold
    const uniqueItemsUsed = Object.keys(itemUsageMap).length;

    // Overdue rentals
    const overdueRentals = activeRentals.filter(r => new Date(r.endDate) < today);

    // Deduplicate per-item metrics by inventoryItemId (multiple payments per item)
    type ItemMetric = { type: string; lateDays: number; lateFeeAmount: number; extraDays: number; extraDaysAmount: number; discountAmount: number; discountPercent: number };
    const uniqueItemMetrics = new Map<string, ItemMetric>();
    for (const t of completedTx) {
      const key = t.inventoryItemId || t.id;
      if (uniqueItemMetrics.has(key)) continue;
      uniqueItemMetrics.set(key, {
        type: t.type,
        lateDays: t.lateDays || 0,
        lateFeeAmount: t.lateFeeAmount || 0,
        extraDays: t.extraDays || 0,
        extraDaysAmount: t.extraDaysAmount || 0,
        discountAmount: t.discountAmount || 0,
        discountPercent: t.discountPercent || 0,
      });
    }
    const allItemMetrics = [...uniqueItemMetrics.values()];
    // Only items that have been checked out/completed/returned (not reserved)
    const appliedItemMetrics = allItemMetrics.filter(m => m.type !== 'reservation');

    // Late returns
    const lateItems = appliedItemMetrics.filter(m => m.lateDays > 0);
    const lateFeeCount = lateItems.length;
    const totalLateFees = lateItems.reduce((sum, m) => sum + m.lateFeeAmount, 0);
    const avgLateDays = lateFeeCount > 0
      ? lateItems.reduce((sum, m) => sum + m.lateDays, 0) / lateFeeCount
      : 0;

    // Extra days (only applied, not reserved)
    const extraDaysItems = appliedItemMetrics.filter(m => m.extraDays > 0);
    const rentalsWithExtraDays = extraDaysItems.length;
    const totalExtraDays = extraDaysItems.reduce((sum, m) => sum + m.extraDays, 0);
    const avgExtraDays = rentalsWithExtraDays > 0 ? totalExtraDays / rentalsWithExtraDays : 0;
    const totalExtraDaysRevenue = extraDaysItems.reduce((sum, m) => sum + m.extraDaysAmount, 0);

    // Discounts (only applied, not reserved)
    const discountItems = appliedItemMetrics.filter(m => m.discountAmount > 0);
    const discountCount = discountItems.length;
    const totalDiscounts = discountItems.reduce((sum, m) => sum + m.discountAmount, 0);
    const avgDiscountPercent = discountCount > 0
      ? discountItems.reduce((sum, m) => sum + m.discountPercent, 0) / discountCount
      : 0;

    // Refunds (already negative in payment amounts, so sum their absolute value for display)
    const refundTransactions = completedTx.filter(t => t.type === 'refund');

    // Net revenue: gross payments already include refunds (negative amounts),
    // but discounts are stored on rental_items, not in payments — subtract them
    const netRevenue = totalRevenue - totalDiscounts;
    salesCards = {
      ...salesCards,
      revenue: { value: netRevenue, change: pctChange(netRevenue, prevRevenue) },
    };
    avgTicket = totalUniqueItems > 0 ? netRevenue / totalUniqueItems : 0;

    // Utilization rate (based on unique inventory items used: rented, reserved, or sold)
    const availableDresses = dresses.filter(d => d.available).length;
    const itemsUsed = uniqueItemsUsed;
    const utilizationRate = dresses.length > 0 ? (itemsUsed / dresses.length) * 100 : 0;

    // ── Expenses Tab ──
    const cashOutTransactions = filteredCashTransactions.filter(t => t.type === 'out');
    const totalCashOut = cashOutTransactions.reduce((sum, t) => sum + t.amount, 0);
    const cashOutByCategory = cashOutTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const expenseCategoryData = Object.entries(cashOutByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const topExpenseCategory = expenseCategoryData[0] || null;

    // ── Cash Flow ──
    const cashIn = filteredCashTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = filteredCashTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
    const netCashFlow = cashIn - cashOut;
    const currentCashBalance = openingBalance + cashIn - cashOut;

    // ── Money Tab ──
    const filteredVaultTransfers = dateRange
      ? vaultTransfers.filter(vt => { const d = new Date(vt.date); return d >= dateRange.from && d <= dateRange.to; })
      : vaultTransfers;
    const totalVaultCash = filteredVaultTransfers.reduce((sum, vt) => sum + vt.amount, 0);

    const filteredOwnerDistributions = dateRange
      ? ownerDistributions.filter((od) => {
          const d = new Date(od.distribution_date);
          return d >= dateRange.from && d <= dateRange.to;
        })
      : ownerDistributions;

    const completedTxForMoney = (dateRange
      ? transactions.filter(t => { const d = new Date(t.date); return t.status === 'completed' && d >= dateRange.from && d <= dateRange.to; })
      : transactions.filter(t => t.status === 'completed')
    ).filter(t => !isStoreCredit(t.paymentMethod));
    const incomeByMethod: Record<string, number> = {};
    completedTxForMoney.forEach(t => {
      const methodName = t.paymentMethod.replace(/\s*\(.*\)$/, '').trim() || 'Other';
      incomeByMethod[methodName] = (incomeByMethod[methodName] || 0) + t.amount;
    });
    const expensesByMethod: Record<string, number> = cashOutTransactions.reduce((acc, t) => {
      const methodName = t.paymentMethod.replace(/\s*\(.*\)$/, '').trim() || 'Other';
      acc[methodName] = (acc[methodName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const activeMethods = paymentMethods.filter(
      pm => (pm.status === 'On' || pm.status === 'active') && pm.payment_user_enabled === 1
    );
    const methodBalances: MethodBalance[] = activeMethods.map(pm => {
      const income = incomeByMethod[pm.payment_method] || 0;
      const isCash = pm.payment_type === 'cash';
      const expenses = isCash
        ? (expensesByMethod[pm.payment_method] || expensesByMethod["Efectivo"] || 0)
        : (expensesByMethod[pm.payment_method] || 0);
      const balance = income - expenses;
      return {
        id: pm.id,
        method: pm.payment_method,
        type: pm.payment_type,
        isCash,
        income,
        expenses,
        vaultTransfers: isCash ? totalVaultCash : 0,
        balance,
      };
    });

    // Total Income matches Sales tab (net revenue after discounts)
    const totalIncome = netRevenue;
    // Total Expenses matches Expenses tab (all cash-out / expenses)
    const totalExpenses = totalCashOut;
    // Available Balance = Total Income − Total Expenses
    const totalBalance = totalIncome - totalExpenses;

    return {
      salesCards,
      itemsRented,
      itemsReserved,
      itemsSold,
      avgTicket,
      overdueRentals: overdueRentals.length,
      categoryData,
      popularDresses,
      paymentMethodData,
      revenueByTypeData,
      totalLateFees,
      lateFeeCount,
      avgLateDays,
      rentalsWithExtraDays,
      totalExtraDays,
      avgExtraDays,
      totalExtraDaysRevenue,
      totalDiscounts,
      discountCount,
      avgDiscountPercent,
      refundCount: refundTransactions.length,
      utilizationRate,
      totalDresses: dresses.length,
      availableDresses,
      itemsUsed,
      cashOutTransactions,
      totalCashOut,
      expenseCategoryData,
      topExpenseCategory,
      cashIn,
      cashOut,
      netCashFlow,
      currentCashBalance,
      methodBalances,
      totalIncome,
      totalExpenses,
      totalBalance,
      filteredVaultTransfers,
      totalVaultCash,
      filteredOwnerDistributions,
    };
  }, [dresses, rentals, reservations, transactions, cashTransactions, openingBalance, dateRange, paymentMethods, vaultTransfers, ownerDistributions]);
}
