import { toast } from "sonner";
import { useState, useEffect, useMemo, useCallback } from "react";
import { CartItem, Customer } from "../../types";
import { getFunction } from "../../shared/api/client";
import { formatCurrencyARS } from "../../shared/format/currency";
import { DRAWER_STATUS } from "../../shared/constants/status";
import { useConfiguration } from "../../shared/hooks/useConfiguration";
import { calculateCheckout, type CheckoutLineItem } from "../../shared/hooks/checkout";

export interface DBPaymentMethod {
  id: string;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  payment_user_enabled: number | null;
  payment_type: string;
}

export interface PaymentAllocation {
  methodId: string;
  amount: number;
}

export interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payments: Array<{ methodId: string; methodName: string; amount: number }>, discount?: { type: 'percentage' | 'fixed'; value: number; reason?: string }, customerId?: string, updatedCartItems?: CartItem[]) => void;
  cartItems: CartItem[];
  customers: Customer[];
  onAddNewCustomer: () => void;
  drawerError?: string | null;
  onClearDrawerError?: () => void;
}

function getItemExtraDayRate(item: CartItem, configRentalDays: number, extraDaysPricePct: number): number {
  const basePrice = item.standardPrice !== undefined ? item.standardPrice : item.amount;
  if (basePrice <= 0 || configRentalDays <= 0) return 0;
  const standardDayPrice = basePrice / configRentalDays;
  return standardDayPrice * (extraDaysPricePct / 100);
}

export function useCheckoutDialog({
  open,
  onClose,
  onConfirm,
  cartItems,
  customers,
  onAddNewCustomer,
  drawerError,
  onClearDrawerError,
}: CheckoutDialogProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<DBPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [tempDiscountValue, setTempDiscountValue] = useState<string>('');
  const [tempDiscountReason, setTempDiscountReason] = useState<string>('');
  const { config, loading: configLoading } = useConfiguration(open);
  const rentDownPaymentPct = config.rentDownPct || 50;
  const reservationDownPaymentPct = config.reservationDownPct || 25;
  const configRentalDays = config.rentalDays || 3;
  const extraDaysPricePct = config.extraDaysPrice || 75;
  const configLoaded = !configLoading;
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Per-item extra days overrides (keyed by cartItem.id)
  const [itemExtraDaysOverrides, setItemExtraDaysOverrides] = useState<Record<string, number>>({});
  const [editingExtraDaysItemId, setEditingExtraDaysItemId] = useState<string | null>(null);
  const [tempExtraDaysValue, setTempExtraDaysValue] = useState<string>('');

  const [drawerStatus, setDrawerStatus] = useState<'open' | 'closed' | 'loading'>('loading');
  const [drawerBusinessDate, setDrawerBusinessDate] = useState<string | null>(null);
  const [showDrawerAlert, setShowDrawerAlert] = useState(false);
  const [drawerAlertMessage, setDrawerAlertMessage] = useState<string>('');

  // --- Build per-item line items and run calculation engine ---

  const lineItems: CheckoutLineItem[] = useMemo(() => cartItems.map(item => {
    const basePrice = item.standardPrice !== undefined ? item.standardPrice : item.amount;
    const originalExtraDays = item.extraDays || 0;
    const override = itemExtraDaysOverrides[item.id];
    const extraDays = override !== undefined ? override : originalExtraDays;
    const isSale = item.type === 'sale';
    const extraDayRate = isSale ? 0 : getItemExtraDayRate(item, configRentalDays, extraDaysPricePct);
    return {
      id: item.id,
      basePrice,
      extraDays: isSale ? 0 : extraDays,
      extraDayRate,
      extraDaysAmount: isSale ? 0 : Math.round(extraDays * extraDayRate),
      lateDays: 0,
      lateDayRate: 0,
      lateFeeAmount: 0,
    };
  }), [cartItems, itemExtraDaysOverrides, configRentalDays, extraDaysPricePct]);

  const calcResult = useMemo(() => calculateCheckout({
    items: lineItems,
    discount: discountValue > 0 ? { type: discountType, value: discountValue, reason: discountReason } : null,
    creditApplied: 0,
    alreadyPaid: 0,
  }), [lineItems, discountType, discountValue, discountReason]);

  // --- Derived values from calcResult ---

  const subtotalWithoutExtras = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.basePrice, 0),
    [lineItems],
  );

  const subtotal = calcResult.subtotal;
  const discountAmount = calcResult.discountAmount;
  const total = calcResult.totalAfterDiscount;

  // Per-type subtotals (from calc result items, matched back to cart item type)
  const typeSubtotals = useMemo(() => {
    let rental = 0, reservation = 0, sale = 0;
    calcResult.items.forEach((resultItem, i) => {
      const cartItem = cartItems[i];
      if (cartItem.type === 'rental') rental += resultItem.itemTotal;
      else if (cartItem.type === 'reservation') reservation += resultItem.itemTotal;
      else if (cartItem.type === 'sale') sale += resultItem.itemTotal;
    });
    return { rental, reservation, sale };
  }, [calcResult.items, cartItems]);

  const rentalSubtotal = typeSubtotals.rental;
  const reservationSubtotal = typeSubtotals.reservation;
  const saleSubtotal = typeSubtotals.sale;

  const hasRentals = rentalSubtotal > 0;
  const hasReservations = reservationSubtotal > 0;
  const hasSales = saleSubtotal > 0;

  const rentalMinimum = Math.round(rentalSubtotal * rentDownPaymentPct / 100);
  const reservationMinimum = Math.round(reservationSubtotal * reservationDownPaymentPct / 100);
  const saleMinimum = Math.round(saleSubtotal);
  const minimumRequired = rentalMinimum + reservationMinimum + saleMinimum;

  const effectiveDownPaymentPctLabel = useMemo(() => {
    if (hasSales) return null;
    if (hasRentals && !hasReservations) return `${rentDownPaymentPct}%`;
    if (!hasRentals && hasReservations) return `${reservationDownPaymentPct}%`;
    return null;
  }, [hasSales, hasRentals, hasReservations, rentDownPaymentPct, reservationDownPaymentPct]);

  const customerCreditBalance = selectedCustomer?.creditBalance || 0;

  const formatCurrency = formatCurrencyARS;

  const allocatedTotal = paymentAllocations.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = total - allocatedTotal;

  // --- Effects ---

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!open) return;

      setLoading(true);
      setDrawerStatus('loading');
      try {
        const [methodsData, drawerData] = await Promise.all([
          getFunction<{ paymentMethods?: DBPaymentMethod[] }>("payment-methods"),
          getFunction<{ drawer?: { status: string; businessDate?: string } }>("drawer/current").catch(() => ({ drawer: null })),
        ]);

        setPaymentMethods(
          (methodsData.paymentMethods || []).filter(
            (m: DBPaymentMethod) => m.payment_user_enabled !== 0
          )
        );

        if (drawerData?.drawer?.status === DRAWER_STATUS.OPEN) {
          setDrawerStatus('open');
          setDrawerBusinessDate(drawerData.drawer.businessDate ?? null);
        } else {
          setDrawerStatus('closed');
          setDrawerBusinessDate(null);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        toast.error('Failed to load payment methods');
        setDrawerStatus('closed');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [open]);

  useEffect(() => {
    if (drawerError) {
      setDrawerAlertMessage(drawerError);
      setShowDrawerAlert(true);
    }
  }, [drawerError]);

  // --- Per-item extra days handlers ---

  const handleEditItemExtraDays = useCallback((itemId: string) => {
    const cartItem = cartItems.find(i => i.id === itemId);
    const originalDays = cartItem?.extraDays || 0;
    const currentOverride = itemExtraDaysOverrides[itemId];
    setTempExtraDaysValue((currentOverride !== undefined ? currentOverride : originalDays).toString());
    setEditingExtraDaysItemId(itemId);
  }, [cartItems, itemExtraDaysOverrides]);

  const handleApplyItemExtraDays = useCallback(() => {
    if (!editingExtraDaysItemId) return;
    const cartItem = cartItems.find(i => i.id === editingExtraDaysItemId);
    const maxDays = cartItem?.extraDays || 0;
    const days = parseInt(tempExtraDaysValue) || 0;
    setItemExtraDaysOverrides(prev => ({
      ...prev,
      [editingExtraDaysItemId]: Math.min(Math.max(0, days), maxDays),
    }));
    setEditingExtraDaysItemId(null);
    setTempExtraDaysValue('');
  }, [editingExtraDaysItemId, tempExtraDaysValue, cartItems]);

  const handleRemoveItemExtraDays = useCallback((itemId: string) => {
    setItemExtraDaysOverrides(prev => ({ ...prev, [itemId]: 0 }));
    setEditingExtraDaysItemId(null);
    setTempExtraDaysValue('');
  }, []);

  const handleCancelItemExtraDays = useCallback(() => {
    setEditingExtraDaysItemId(null);
    setTempExtraDaysValue('');
  }, []);

  // --- Handlers ---

  const handleConfirm = useCallback(async () => {
    const hasCashPayment = paymentAllocations.some(allocation => {
      const method = paymentMethods.find(m => m.id === allocation.methodId);
      return method?.payment_type === 'cash';
    });

    if (hasCashPayment && drawerStatus !== 'open') {
      setDrawerAlertMessage('You must open a cash drawer before processing any checkout. Please go to the Cash Drawer tab and open a drawer for today.');
      setShowDrawerAlert(true);
      return;
    }

    if (!selectedCustomer) {
      toast.error('Please select a customer to continue');
      return;
    }

    const currentAllocatedTotal = paymentAllocations.reduce((sum, p) => sum + p.amount, 0);

    if (currentAllocatedTotal > total + 0.01) {
      toast.error(`Payment amount (${formatCurrency(currentAllocatedTotal)}) exceeds order total (${formatCurrency(total)}). Please adjust payment amounts.`);
      return;
    }

    if (currentAllocatedTotal < minimumRequired - 0.01) {
      toast.error(`Minimum down payment of ${formatCurrency(minimumRequired)}${effectiveDownPaymentPctLabel ? ` (${effectiveDownPaymentPctLabel})` : ''} is required. Please add ${formatCurrency(minimumRequired - currentAllocatedTotal)}.`);
      return;
    }

    if (paymentAllocations.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    if (discountValue < 0) {
      toast.error('Discount cannot be negative');
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      toast.error('Discount percentage cannot exceed 100%');
      return;
    }

    const payments = paymentAllocations.map(alloc => {
      const method = paymentMethods.find(m => m.id === alloc.methodId);
      return {
        methodId: alloc.methodId,
        methodName: method?.payment_method || '',
        amount: alloc.amount,
      };
    });

    setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);

    const discount = discountValue > 0 ? {
      type: discountType,
      value: discountValue,
      reason: discountReason || undefined,
    } : undefined;

    const updatedCart: CartItem[] = cartItems.map((item, i) => {
      const resultItem = calcResult.items[i];
      return {
        ...item,
        amount: resultItem.itemSubtotal,
        extraDays: resultItem.extraDays,
        extraDaysTotal: resultItem.extraDaysAmount,
        standardPrice: resultItem.basePrice,
      };
    });

    onConfirm(payments, discount, selectedCustomer.id, updatedCart);
    setPaymentAllocations([]);
    setDiscountValue(0);
    setDiscountReason('');
    setItemExtraDaysOverrides({});
    setSelectedCustomer(null);
  }, [paymentAllocations, paymentMethods, drawerStatus, selectedCustomer, total, minimumRequired, effectiveDownPaymentPctLabel, discountValue, discountType, discountReason, calcResult.items, cartItems, onConfirm, formatCurrency]);

  const handleClose = useCallback(() => {
    if (!processing) {
      setPaymentAllocations([]);
      setShowDiscountSection(false);
      setDiscountValue(0);
      setDiscountReason('');
      setTempDiscountValue('');
      setTempDiscountReason('');
      setItemExtraDaysOverrides({});
      setEditingExtraDaysItemId(null);
      setTempExtraDaysValue('');
      setSelectedCustomer(null);
      setCustomerSearchOpen(false);
      onClose();
    }
  }, [processing, onClose]);

  const handleRemoveDiscount = useCallback(() => {
    setDiscountValue(0);
    setDiscountReason('');
    setTempDiscountValue('');
    setTempDiscountReason('');
    setShowDiscountSection(false);
  }, []);

  const handleApplyDiscount = useCallback(() => {
    const value = parseFloat(tempDiscountValue) || 0;
    const roundedValue = discountType === 'fixed' ? Math.round(value) : value;
    setDiscountValue(roundedValue);
    setDiscountReason(tempDiscountReason);
    if (roundedValue > 0) {
      setShowDiscountSection(false);
    }
  }, [tempDiscountValue, tempDiscountReason, discountType]);

  const handleCancelDiscount = useCallback(() => {
    setTempDiscountValue('');
    setTempDiscountReason('');
    setShowDiscountSection(false);
  }, []);

  const togglePaymentMethod = useCallback((methodId: string) => {
    setPaymentAllocations(prev => {
      const exists = prev.find(p => p.methodId === methodId);
      if (exists) {
        return prev.filter(p => p.methodId !== methodId);
      } else {
        const currentTotal = prev.reduce((sum, p) => sum + p.amount, 0);
        const targetAmount = currentTotal < minimumRequired
          ? Math.max(0, minimumRequired - currentTotal)
          : Math.max(0, total - currentTotal);
        return [...prev, { methodId, amount: targetAmount }];
      }
    });
  }, [minimumRequired, total]);

  const updatePaymentAmount = useCallback((methodId: string, amount: number) => {
    setPaymentAllocations(prev =>
      prev.map(p => p.methodId === methodId ? { ...p, amount: Math.max(0, amount) } : p)
    );
  }, []);

  const isMethodSelected = useCallback((methodId: string) => {
    return paymentAllocations.some(p => p.methodId === methodId);
  }, [paymentAllocations]);

  const getMethodAmount = useCallback((methodId: string) => {
    return paymentAllocations.find(p => p.methodId === methodId)?.amount || 0;
  }, [paymentAllocations]);

  return {
    // State
    selectedCustomer,
    setSelectedCustomer,
    customerSearchOpen,
    setCustomerSearchOpen,
    customerSearchQuery,
    setCustomerSearchQuery,
    paymentAllocations,
    processing,
    paymentMethods,
    loading,
    showDiscountSection,
    setShowDiscountSection,
    discountType,
    setDiscountType,
    discountValue,
    tempDiscountValue,
    setTempDiscountValue,
    discountReason,
    tempDiscountReason,
    setTempDiscountReason,
    showDrawerAlert,
    setShowDrawerAlert,
    drawerAlertMessage,
    configLoaded,

    // Per-item extra days
    itemExtraDaysOverrides,
    editingExtraDaysItemId,
    tempExtraDaysValue,
    setTempExtraDaysValue,
    handleEditItemExtraDays,
    handleApplyItemExtraDays,
    handleRemoveItemExtraDays,
    handleCancelItemExtraDays,

    // Computed
    calcResult,
    lineItems,
    subtotalWithoutExtras,
    subtotal,
    discountAmount,
    total,
    rentalSubtotal,
    reservationSubtotal,
    saleSubtotal,
    hasRentals,
    hasReservations,
    hasSales,
    rentDownPaymentPct,
    reservationDownPaymentPct,
    rentalMinimum,
    reservationMinimum,
    saleMinimum,
    minimumRequired,
    effectiveDownPaymentPctLabel,
    customerCreditBalance,
    allocatedTotal,
    remainingAmount,
    formatCurrency,
    configRentalDays,
    extraDaysPricePct,

    // Handlers
    handleConfirm,
    handleClose,
    handleRemoveDiscount,
    handleApplyDiscount,
    handleCancelDiscount,
    togglePaymentMethod,
    updatePaymentAmount,
    isMethodSelected,
    getMethodAmount,

    // Props pass-through
    customers,
    cartItems,
    onAddNewCustomer,
    onClearDrawerError,
  };
}

export type UseCheckoutDialogReturn = ReturnType<typeof useCheckoutDialog>;
