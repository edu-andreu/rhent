import { useState, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import { getFunction, postFunction, ApiError } from "../../../shared/api/client";
import { getDrawerErrorMessage } from "../../../shared/utils/drawerError";
import { ERROR_MESSAGES } from "../../../shared/constants/errors";
import { DRAWER_STATUS } from "../../../shared/constants/status";
import { formatCurrencyARS } from "../../../shared/format/currency";
import { useHolidays } from "../../../shared/hooks/useHolidays";
import { useConfiguration } from "../../../shared/hooks/useConfiguration";
import { usePaymentAllocations, useDiscountManager, useExtraDaysCalculation, calculateCheckout } from "../../../shared/hooks/checkout";
import type { DBPaymentMethod, PaymentAllocation, ReservationDetails } from "../types";

interface UseReservationCheckoutProps {
  open: boolean;
  rentalItemId: string | null;
  drawerError?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function useReservationCheckout({
  open,
  rentalItemId,
  drawerError,
  onConfirm,
  onClose,
}: UseReservationCheckoutProps) {
  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<DBPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [customerCreditBalance, setCustomerCreditBalance] = useState<number>(0);
  const [creditApplied, setCreditApplied] = useState<number>(0);

  const [drawerStatus, setDrawerStatus] = useState<'open' | 'closed' | 'loading'>('loading');
  const [drawerBusinessDate, setDrawerBusinessDate] = useState<string | null>(null);
  const [showDrawerAlert, setShowDrawerAlert] = useState(false);
  const [drawerAlertMessage, setDrawerAlertMessage] = useState<string>('');

  const [surplusHandling, setSurplusHandling] = useState<'refund' | 'credit'>('credit');
  const [refundMethodId, setRefundMethodId] = useState<string>('');

  const { holidays } = useHolidays(open);
  const { config } = useConfiguration(open);
  const configRentalDays = config.rentalDays;
  const formatCurrency = formatCurrencyARS;

  // Shared discount manager
  const discount = useDiscountManager();

  // Shared extra days calculation
  const extraDays = useExtraDaysCalculation({
    startDateStr: details?.item.startDate,
    endDateStr: details?.item.endDate,
    configRentalDays,
    holidays,
    extraDaysInfo: details?.extraDaysInfo || null,
  });

  // Fetch data on open
  useEffect(() => {
    if (!open || !rentalItemId) return;
    const fetchReservationDetails = async () => {
      setLoading(true);
      setDetails(null);
      setDrawerStatus('loading');
      try {
        const [detailsData, methodsData, drawerData] = await Promise.all([
          getFunction<ReservationDetails>(`reservations/checkout-details/${rentalItemId}`),
          getFunction<{ paymentMethods?: DBPaymentMethod[] }>("payment-methods").catch(() => ({ paymentMethods: [] })),
          getFunction<{ drawer?: { status: string; businessDate?: string } }>("drawer/current").catch(() => ({ drawer: null })),
        ]);
        setDetails(detailsData);
        setPaymentMethods(
          (methodsData.paymentMethods || []).filter((m: DBPaymentMethod) => m.payment_user_enabled !== 0)
        );
        if (drawerData?.drawer?.status === DRAWER_STATUS.OPEN) {
          setDrawerStatus('open');
          setDrawerBusinessDate(drawerData.drawer.businessDate ?? null);
        } else {
          setDrawerStatus('closed');
          setDrawerBusinessDate(null);
        }
      } catch (error) {
        console.error("Error fetching reservation checkout data:", error);
        toast.error("Failed to load reservation details");
        setDrawerStatus('closed');
      } finally {
        setLoading(false);
      }
    };
    fetchReservationDetails();
  }, [open, rentalItemId]);

  useEffect(() => {
    if (drawerError) {
      setDrawerAlertMessage(drawerError);
      setShowDrawerAlert(true);
    }
  }, [drawerError]);

  // Initialize from server when details load
  useEffect(() => {
    if (details?.financials) {
      discount.initializeFromServer(details.financials.discountPercent);
    }
    extraDays.initializeFromServer(details?.extraDaysInfo || null);
  }, [details]);

  // Fetch customer credit
  useEffect(() => {
    const fetchCustomerCredit = async () => {
      if (!details?.customer?.id) return;
      try {
        const data = await getFunction<{ customer?: { credit_balance?: string } }>(`customers/${details.customer.id}`);
        const creditBalance = parseFloat(data.customer?.credit_balance || '0');
        setCustomerCreditBalance(creditBalance);
        if (details) {
          const balDue = details.financials.balanceDue;
          if (creditBalance > 0 && balDue > 0) {
            setCreditApplied(Math.min(creditBalance, balDue));
          } else if (creditBalance < 0) {
            setCreditApplied(creditBalance);
          }
        }
      } catch (error) {
        console.error('Error fetching customer credit:', error);
      }
    };
    fetchCustomerCredit();
  }, [details]);

  // Financial calculations via shared engine
  const itemBasePrice = extraDays.basePrice;
  const orderPaymentsTotal = details?.financials.paymentsTotal || 0;
  const thisItemPaymentsTotal = details?.financials.thisItemPaymentsTotal ?? 0;
  const otherItemsTotal = details?.financials.otherItemsTotal || 0;
  const isMultiItemOrder = (details?.financials.itemCount || 1) > 1;
  const initialDiscountPercent = details?.financials.discountPercent || 0;
  const rentDownPct = details?.config.rentDownPaymentPct || 50;
  const calcResult = calculateCheckout({
    items: [{
      id: details?.rentalItemId || '',
      basePrice: itemBasePrice,
      extraDays: extraDays.extraDaysCount,
      extraDayRate: extraDays.extraDayRate,
      extraDaysAmount: extraDays.extraDaysAmount,
      lateDays: 0,
      lateDayRate: 0,
      lateFeeAmount: 0,
    }],
    discount: discount.discountValue > 0 ? { type: discount.discountType, value: discount.discountValue, reason: discount.discountReason } : null,
    creditApplied,
    alreadyPaid: thisItemPaymentsTotal,
  });

  const itemSubtotal = calcResult.subtotal;
  const discountAmount = calcResult.discountAmount;
  const itemTotal = calcResult.totalAfterDiscount;
  const orderGrandTotal = itemTotal + otherItemsTotal;
  const balanceDueBeforeCredit = Math.max(0, orderGrandTotal - orderPaymentsTotal);
  const balanceDue = Math.max(0, balanceDueBeforeCredit - creditApplied);
  const hasBalance = balanceDue > 0.01;
  const surplus = Math.max(0, orderPaymentsTotal - orderGrandTotal);
  const hasSurplus = surplus > 0.01;
  const minimumRequired = Math.min(Math.round(balanceDue * rentDownPct / 100), balanceDue);

  // Shared payment allocations
  const payments = usePaymentAllocations({ balanceDue, minimumRequired });

  const canConfirm = hasBalance
    ? payments.allocatedTotal >= minimumRequired - 0.01 && payments.allocatedTotal <= balanceDue + 0.01 && payments.paymentAllocations.length > 0
    : hasSurplus && surplusHandling === 'refund'
      ? !!refundMethodId
      : true;

  // Reset payment allocations when financial values change
  useEffect(() => {
    if (extraDays.extraDaysInitialized && payments.paymentAllocations.length > 0) {
      payments.resetAllocations();
    }
  }, [discount.discountValue, discount.discountType, extraDays.extraDaysOverride]);

  const handleConfirm = async () => {
    if (!details) return;
    const hasCashPayment = payments.paymentAllocations.some(allocation => {
      const method = paymentMethods.find(m => m.id === allocation.methodId);
      return method?.payment_type === 'cash';
    });
    const hasCashRefund = hasSurplus && surplusHandling === 'refund' && refundMethodId &&
      paymentMethods.find(m => m.id === refundMethodId)?.payment_type === 'cash';
    if ((hasCashPayment || hasCashRefund) && drawerStatus !== 'open') {
      setDrawerAlertMessage('You must open a cash drawer before processing any checkout. Please go to the Cash Drawer tab and open a drawer for today.');
      setShowDrawerAlert(true);
      return;
    }
    if (hasBalance && payments.paymentAllocations.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }
    if (hasBalance && payments.allocatedTotal > balanceDue + 0.01) {
      toast.error(`Payment amount (${formatCurrency(payments.allocatedTotal)}) exceeds balance due (${formatCurrency(balanceDue)}). Overpayment is not allowed.`);
      return;
    }
    if (hasBalance && payments.allocatedTotal < minimumRequired - 0.01) {
      toast.error(`Minimum upfront payment of ${formatCurrency(minimumRequired)} (${rentDownPct}%) is required. Please add ${formatCurrency(minimumRequired - payments.allocatedTotal)}.`);
      return;
    }
    if (discount.discountValue < 0) {
      toast.error('Discount cannot be negative');
      return;
    }
    if (discount.discountType === 'percentage' && discount.discountValue > 100) {
      toast.error('Discount percentage cannot exceed 100%');
      return;
    }
    setProcessing(true);
    try {
      const paymentsList = hasBalance
        ? payments.paymentAllocations.filter(a => a.amount > 0).map(alloc => {
            const method = paymentMethods.find(m => m.id === alloc.methodId);
            return { methodId: alloc.methodId, methodName: method?.payment_method || '', amount: alloc.amount };
          })
        : [];
      await postFunction("reservations/convert-to-rental", {
        rentalItemId: details.rentalItemId,
        rentalId: details.rentalId,
        itemId: details.itemId,
        payments: paymentsList,
        creditApplied,
        discount: discount.discountValue > 0 ? {
          type: discount.discountType,
          value: discount.discountValue,
          reason: discount.discountReason || undefined,
        } : undefined,
        extraDays: extraDays.extraDaysCount !== extraDays.originalExtraDaysCount ? {
          days: extraDays.extraDaysCount,
          amount: extraDays.extraDaysAmount,
        } : undefined,
        surplusHandling: hasSurplus ? {
          type: surplusHandling,
          amount: surplus,
          refundMethodId: surplusHandling === 'refund' ? refundMethodId : undefined,
          refundMethodName: surplusHandling === 'refund' ? paymentMethods.find(m => m.id === refundMethodId)?.payment_method : undefined,
        } : undefined,
      });
      if (hasSurplus) {
        const action = surplusHandling === 'credit' ? `${formatCurrency(surplus)} overpayment absorbed` : `${formatCurrency(surplus)} refund issued`;
        toast.success(`Reservation converted to rental. ${action}.`);
      } else {
        toast.success("Reservation converted to rental successfully!");
      }
      onConfirm();
      handleClose();
    } catch (error) {
      console.error("Error converting reservation to rental:", error);
      const drawerErrorMsg = getDrawerErrorMessage(error);
      if (drawerErrorMsg) {
        setDrawerAlertMessage(drawerErrorMsg);
        setShowDrawerAlert(true);
      } else {
        const data = error instanceof ApiError ? error.data : undefined;
        const dataObj = data && typeof data === "object" && "error" in data ? (data as { error?: string; errorType?: string }) : undefined;
        if (dataObj?.errorType === "booking_conflict") {
          toast.error(dataObj.error ?? ERROR_MESSAGES.BOOKING_CONFLICT, { duration: 5000 });
        } else {
          const errorMessage = error instanceof ApiError && dataObj?.error ? dataObj.error : error instanceof Error ? error.message : String(error);
          toast.error(errorMessage || "Failed to convert reservation to rental");
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      payments.resetAllocations();
      setDetails(null);
      discount.resetDiscount();
      extraDays.resetExtraDays();
      setCustomerCreditBalance(0);
      setCreditApplied(0);
      setSurplusHandling('credit');
      setRefundMethodId('');
      onClose();
    }
  };

  return {
    details,
    paymentMethods,
    loading,
    processing,
    formatCurrency,
    showDiscountSection: discount.showDiscountSection,
    setShowDiscountSection: discount.setShowDiscountSection,
    discountType: discount.discountType,
    setDiscountType: discount.setDiscountType,
    discountValue: discount.discountValue,
    discountReason: discount.discountReason,
    tempDiscountValue: discount.tempDiscountValue,
    setTempDiscountValue: discount.setTempDiscountValue,
    tempDiscountReason: discount.tempDiscountReason,
    setTempDiscountReason: discount.setTempDiscountReason,
    itemSubtotal,
    initialDiscountPercent,
    handleEditDiscount: discount.handleEditDiscount,
    handleRemoveDiscount: discount.handleRemoveDiscount,
    handleApplyDiscount: discount.handleApplyDiscount,
    handleCancelDiscount: discount.handleCancelDiscount,
    discountAmount,
    showExtraDaysSection: extraDays.showExtraDaysSection,
    setShowExtraDaysSection: extraDays.setShowExtraDaysSection,
    extraDaysOverride: extraDays.extraDaysOverride,
    setExtraDaysOverride: extraDays.setExtraDaysOverride,
    tempExtraDaysValue: extraDays.tempExtraDaysValue,
    setTempExtraDaysValue: extraDays.setTempExtraDaysValue,
    extraDaysInitialized: extraDays.extraDaysInitialized,
    applicableExtraDays: extraDays.applicableExtraDays,
    originalExtraDaysCount: extraDays.originalExtraDaysCount,
    extraDaysCount: extraDays.extraDaysCount,
    extraDaysAmount: extraDays.extraDaysAmount,
    extraDayRate: extraDays.extraDayRate,
    creditApplied,
    customerCreditBalance,
    itemBasePrice,
    itemTotal,
    alreadyPaid: orderPaymentsTotal,
    thisItemPaymentsTotal,
    otherItemsTotal,
    orderGrandTotal,
    isMultiItemOrder,
    balanceDue,
    hasBalance,
    surplus,
    hasSurplus,
    surplusHandling,
    setSurplusHandling,
    refundMethodId,
    setRefundMethodId,
    rentDownPct,
    minimumRequired,
    allocatedTotal: payments.allocatedTotal,
    remainingAmount: payments.remainingAmount,
    togglePaymentMethod: payments.togglePaymentMethod,
    updatePaymentAmount: payments.updatePaymentAmount,
    isMethodSelected: payments.isMethodSelected,
    getMethodAmount: payments.getMethodAmount,
    canConfirm,
    drawerStatus,
    drawerBusinessDate,
    showDrawerAlert,
    setShowDrawerAlert,
    drawerAlertMessage,
    orderItems: details?.orderItems || [],
    currentRentalItemId: details?.rentalItemId || '',
    handleConfirm,
    handleClose,
  };
}
