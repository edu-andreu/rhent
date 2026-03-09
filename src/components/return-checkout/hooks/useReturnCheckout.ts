import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getFunction, postFunction, ApiError } from "../../../shared/api/client";
import { getDrawerErrorMessage } from "../../../shared/utils/drawerError";
import { ERROR_MESSAGES } from "../../../shared/constants/errors";
import { countBusinessDays } from "../../../shared/utils/dateUtils";
import { DRAWER_STATUS } from "../../../shared/constants/status";
import { useHolidays } from "../../../shared/hooks/useHolidays";
import { useConfiguration } from "../../../shared/hooks/useConfiguration";
import { calculateAutoEndDate } from "../../../shared/booking/availability";
import { formatCurrencyARS } from "../../../shared/format/currency";
import { usePaymentAllocations, useDiscountManager, useExtraDaysCalculation, calculateCheckout } from "../../../shared/hooks/checkout";

export interface DBPaymentMethod {
  id: string;
  payment_method: string;
  status: string;
  payment_user_enabled: number | null;
  payment_type: string;
}

export interface PaymentAllocation {
  methodId: string;
  amount: number;
}

export interface LateFeeConfig {
  lateDaysPricePct: number;
  configRentalDays: number;
  standardDayPrice: number;
  lateDayRate: number;
  suggestedLateDays: number;
  suggestedLateFee: number;
  existingLateDays: number;
  existingLateFee: number;
}

export interface ExtraDaysInfo {
  extraDaysCount: number;
  extraDaysAmount: number;
  extraDaysPricePct: number;
  rentalPeriodDays: number;
  basePrice: number;
}

export interface ReturnDetails {
  rentalItemId: string;
  rentalId: string;
  itemId: string;
  item: {
    name: string;
    sku: string;
    category: string;
    subcategory: string;
    brand: string;
    size: string;
    colors: string[];
    description: string;
    imageUrl: string;
    unitPrice: number;
    startDate: string;
    endDate: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  financials: {
    rentalSubtotal: number;
    extraDaysTotal: number;
    discountAmount: number;
    lateFeesTotal: number;
    depositsTotal: number;
    grandTotal: number;
    paymentsTotal: number;
    balanceDue: number;
    itemCount: number;
    discountPercent: number;
  };
  itemFinancials: {
    subtotal: number;
    extraDaysAmount: number;
    lateFee: number;
    discountAmount: number;
    grandTotal: number;
    paymentsTotal: number;
    balanceDue: number;
  };
  lateFeeConfig: LateFeeConfig;
  extraDaysInfo: ExtraDaysInfo;
  orderItems: Array<{
    id: string;
    itemId: string;
    name: string;
    sku: string;
    size: string;
    unitPrice: number;
    extraDays: number;
    extraDaysAmount: number;
    discountAmount: number;
    status: string;
    startDate: string;
    endDate: string;
    lateDays: number;
    lateFee: number;
    deposit: number;
  }>;
}

interface UseReturnCheckoutProps {
  open: boolean;
  rentalItemId: string | null;
  drawerError?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function useReturnCheckout({
  open,
  rentalItemId,
  drawerError,
  onConfirm,
  onClose,
}: UseReturnCheckoutProps) {
  const [returnDetails, setReturnDetails] = useState<ReturnDetails | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<DBPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Late fee state
  const [lateFeeApplied, setLateFeeApplied] = useState(false);
  const [lateFeeDays, setLateFeeDays] = useState<number>(0);
  const [showLateFeeSection, setShowLateFeeSection] = useState(false);
  const [tempLateFeeDays, setTempLateFeeDays] = useState<string>('');
  const [lateFeeInitialized, setLateFeeInitialized] = useState(false);
  const [showLateFeeConfirm, setShowLateFeeConfirm] = useState(false);

  // Credit state
  const [showCreditSection, setShowCreditSection] = useState(false);
  const [creditApplied, setCreditApplied] = useState<number>(0);
  const [tempCreditAmount, setTempCreditAmount] = useState<string>('');

  // Drawer state
  const [drawerStatus, setDrawerStatus] = useState<'open' | 'closed' | 'loading'>('loading');
  const [drawerBusinessDate, setDrawerBusinessDate] = useState<string | null>(null);
  const [customerCreditBalance, setCustomerCreditBalance] = useState<number>(0);
  const [showDrawerAlert, setShowDrawerAlert] = useState(false);
  const [drawerAlertMessage, setDrawerAlertMessage] = useState<string>('');

  // Surplus state
  const [surplusHandling, setSurplusHandling] = useState<'refund' | 'credit'>('credit');
  const [refundMethodId, setRefundMethodId] = useState<string>('');

  const [applicableLateDays, setApplicableLateDays] = useState<number>(0);

  const { holidays } = useHolidays(open);
  const { config } = useConfiguration(open);
  const configRentalDays = config.rentalDays;

  // Shared discount manager
  const discount = useDiscountManager({
    onDiscountChange: () => {},
  });

  // Shared extra days calculation
  const extraDays = useExtraDaysCalculation({
    startDateStr: returnDetails?.item.startDate,
    endDateStr: returnDetails?.item.endDate,
    configRentalDays,
    holidays,
    extraDaysInfo: returnDetails?.extraDaysInfo || null,
  });

  // Late fee calculations
  const lateDayRate = returnDetails?.lateFeeConfig?.lateDayRate || 0;
  const lateDaysPricePct = returnDetails?.lateFeeConfig?.lateDaysPricePct || 75;
  const currentItemLateFee = lateFeeApplied ? lateFeeDays * lateDayRate : 0;

  const serverItemDiscountAmount = returnDetails?.itemFinancials?.discountAmount || 0;

  // Use calculation engine for the current item
  const currentItemBasePrice = extraDays.basePrice;
  const calcResult = calculateCheckout({
    items: [{
      id: returnDetails?.rentalItemId || '',
      basePrice: currentItemBasePrice,
      extraDays: extraDays.extraDaysCount,
      extraDayRate: extraDays.extraDayRate,
      extraDaysAmount: extraDays.extraDaysAmount,
      lateDays: lateFeeApplied ? lateFeeDays : 0,
      lateDayRate,
      lateFeeAmount: currentItemLateFee,
    }],
    discount: discount.discountValue > 0
      ? { type: discount.discountType, value: discount.discountValue, reason: discount.discountReason }
      : null,
    creditApplied: 0,
    alreadyPaid: 0,
  });

  const discountAmount = calcResult.discountAmount;

  // Item-level payments from the server (per-item attribution)
  const paymentsTotal = returnDetails?.itemFinancials?.paymentsTotal || 0;

  // Item-level grand total: only this item's contribution
  const subtotal = currentItemBasePrice;
  const totalExtraDays = extraDays.extraDaysAmount;
  const lateFeesTotal = currentItemLateFee;

  const grandTotalBeforeCredit = Math.max(0, subtotal + totalExtraDays + lateFeesTotal - discountAmount);
  const balanceDueBeforeCredit = Math.max(0, grandTotalBeforeCredit - paymentsTotal);
  const grandTotal = Math.max(0, grandTotalBeforeCredit - creditApplied);
  const balanceDue = Math.max(0, grandTotal - paymentsTotal);
  const hasBalance = balanceDue > 0.01;

  const surplus = Math.max(0, paymentsTotal - grandTotalBeforeCredit);
  const hasSurplus = surplus > 0.01;

  // Shared payment allocations
  const payments = usePaymentAllocations({ balanceDue });

  const canConfirm = hasBalance
    ? Math.abs(payments.allocatedTotal - balanceDue) <= 0.01 && payments.paymentAllocations.length > 0
    : hasSurplus && surplusHandling === 'refund'
      ? !!refundMethodId
      : true;

  // Fetch return details and payment methods
  useEffect(() => {
    if (!open || !rentalItemId) return;
    const fetchReturnDetails = async () => {
      setLoading(true);
      setReturnDetails(null);
      payments.resetAllocations();
      setDrawerStatus('loading');

      try {
        const [details, methodsData, drawerData] = await Promise.all([
          getFunction<ReturnDetails>(`rentals/return-details/${rentalItemId}`),
          getFunction<{ paymentMethods?: DBPaymentMethod[] }>("payment-methods"),
          getFunction<{ drawer?: { status: string; businessDate: string } }>("drawer/current").catch(() => ({ drawer: null })),
        ]);

        setReturnDetails(details);
        discount.initializeFromItemAmount(details.itemFinancials?.discountAmount || 0);
        extraDays.initializeFromServer(details.extraDaysInfo);

        // Initialize late fee
        const cfg = details.lateFeeConfig;
        if (cfg && cfg.suggestedLateDays > 0) {
          setLateFeeApplied(true);
          setLateFeeDays(cfg.suggestedLateDays);
        } else if (cfg && cfg.existingLateDays > 0) {
          setLateFeeApplied(true);
          setLateFeeDays(cfg.existingLateDays);
        } else {
          setLateFeeApplied(false);
          setLateFeeDays(0);
        }
        setLateFeeInitialized(true);

        if (methodsData.paymentMethods) {
          setPaymentMethods(
            methodsData.paymentMethods.filter((m: DBPaymentMethod) => m.payment_user_enabled !== 0)
          );
        }

        if (drawerData.drawer && drawerData.drawer.status === DRAWER_STATUS.OPEN) {
          setDrawerStatus('open');
          setDrawerBusinessDate(drawerData.drawer.businessDate);
        } else {
          setDrawerStatus('closed');
          setDrawerBusinessDate(null);
        }
      } catch (error) {
        console.error("Error fetching return data:", error);
        toast.error("Failed to load return details");
        setDrawerStatus('closed');
      } finally {
        setLoading(false);
      }
    };

    fetchReturnDetails();
  }, [open, rentalItemId]);

  // Handle drawer errors from parent
  useEffect(() => {
    if (drawerError) {
      setDrawerAlertMessage(drawerError);
      setShowDrawerAlert(true);
    }
  }, [drawerError]);

  // Fetch customer credit balance
  useEffect(() => {
    const fetchCustomerCredit = async () => {
      if (!returnDetails?.customer?.id) return;
      try {
        const data = await getFunction<{ customer?: { credit_balance?: string } }>(`customers/${returnDetails.customer.id}`);
        const creditBalance = parseFloat(data.customer?.credit_balance || '0');
        setCustomerCreditBalance(creditBalance);

        if (creditBalance > 0 && balanceDueBeforeCredit > 0) {
          setCreditApplied(Math.min(creditBalance, balanceDueBeforeCredit));
        } else if (creditBalance < 0) {
          setCreditApplied(creditBalance);
        }
      } catch (error) {
        console.error('Error fetching customer credit:', error);
      }
    };
    fetchCustomerCredit();
  }, [returnDetails]);

  // Calculate applicable late days
  useEffect(() => {
    if (!returnDetails || !returnDetails.item.startDate || !returnDetails.item.endDate) {
      setApplicableLateDays(0);
      return;
    }
    const [endYear, endMonth, endDay] = returnDetails.item.endDate.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    endDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const buenosAiresDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    buenosAiresDate.setHours(0, 0, 0, 0);

    const applicableLate = buenosAiresDate > endDate
      ? countBusinessDays(endDate, buenosAiresDate, holidays)
      : 0;
    setApplicableLateDays(applicableLate);
  }, [returnDetails, holidays]);

  // Reset payment allocations when financial values change
  useEffect(() => {
    if ((lateFeeInitialized || extraDays.extraDaysInitialized) && payments.paymentAllocations.length > 0) {
      payments.resetAllocations();
    }
  }, [discount.discountValue, discount.discountType, lateFeeApplied, lateFeeDays, creditApplied, extraDays.extraDaysOverride]);

  // Auto-clamp credit
  useEffect(() => {
    if (creditApplied > 0 && customerCreditBalance > 0) {
      const maxApplicable = Math.min(Math.abs(customerCreditBalance), balanceDueBeforeCredit);
      if (maxApplicable !== creditApplied) {
        setCreditApplied(Math.max(0, maxApplicable));
      }
    }
  }, [balanceDueBeforeCredit, customerCreditBalance, creditApplied]);

  // Late fee handlers
  const handleRemoveLateFee = () => {
    setLateFeeApplied(false);
    setLateFeeDays(0);
    setShowLateFeeSection(false);
    setTempLateFeeDays('');
  };

  const handleApplyLateFee = () => {
    const days = parseInt(tempLateFeeDays) || 0;
    if (days > 0) {
      setLateFeeApplied(true);
      setLateFeeDays(Math.min(days, applicableLateDays));
      setShowLateFeeSection(false);
    }
  };

  const handleCancelLateFee = () => {
    setTempLateFeeDays('');
    setShowLateFeeSection(false);
    if (lateFeeDays > 0) setLateFeeApplied(true);
  };

  const handleEditLateFee = () => {
    setTempLateFeeDays(lateFeeDays.toString());
    setShowLateFeeSection(true);
    setLateFeeApplied(false);
  };

  // Credit handlers
  const handleApplyCredit = () => {
    const value = parseFloat(tempCreditAmount) || 0;
    setCreditApplied(customerCreditBalance < 0 ? -value : value);
    setShowCreditSection(false);
  };

  const handleCancelCredit = () => {
    setTempCreditAmount('');
    setShowCreditSection(false);
    if (customerCreditBalance < 0 && creditApplied === 0) setCreditApplied(customerCreditBalance);
  };

  const handleRemoveCredit = () => {
    setCreditApplied(0);
    setTempCreditAmount('');
    setShowCreditSection(false);
  };

  // Main confirm handler
  const handleConfirm = async () => {
    if (!returnDetails) return;

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

    if (discount.discountValue < 0) {
      toast.error('Discount cannot be negative');
      return;
    }
    if (discount.discountType === 'percentage' && discount.discountValue > 100) {
      toast.error('Discount percentage cannot exceed 100%');
      return;
    }
    if (hasBalance && payments.paymentAllocations.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }
    if (hasBalance && payments.allocatedTotal > balanceDue + 0.01) {
      toast.error(`Payment amount (${formatCurrencyARS(payments.allocatedTotal)}) exceeds balance due (${formatCurrencyARS(balanceDue)}). Please adjust payment amounts.`);
      return;
    }

    setProcessing(true);
    try {
      const paymentsList = hasBalance
        ? payments.paymentAllocations.map(alloc => {
            const method = paymentMethods.find(m => m.id === alloc.methodId);
            return { methodId: alloc.methodId, methodName: method?.payment_method || '', amount: alloc.amount };
          })
        : [];

      const discountChanged = discountAmount !== serverItemDiscountAmount;
      const discountPayload = (discount.discountValue > 0 || discountChanged) ? {
        type: discount.discountType,
        value: discount.discountValue,
        reason: discount.discountReason || undefined,
      } : undefined;

      const lateFee = lateFeeApplied && lateFeeDays > 0 ? { days: lateFeeDays, amount: currentItemLateFee } : undefined;

      const serverExtraDays = returnDetails?.extraDaysInfo?.extraDaysCount || 0;
      const extraDaysChanged = extraDays.extraDaysCount !== serverExtraDays;
      const extraDaysPayload = extraDaysChanged ? { days: extraDays.extraDaysCount, amount: extraDays.extraDaysAmount } : undefined;

      await postFunction("rentals/return", {
        rentalItemId: returnDetails.rentalItemId,
        rentalId: returnDetails.rentalId,
        itemId: returnDetails.itemId,
        payments: paymentsList,
        discount: discountPayload,
        lateFee,
        extraDays: extraDaysPayload,
        creditApplied: creditApplied !== 0 ? creditApplied : undefined,
        customerId: returnDetails.customer?.id || undefined,
        surplusHandling: hasSurplus ? {
          type: surplusHandling,
          amount: surplus,
          refundMethodId: surplusHandling === 'refund' ? refundMethodId : undefined,
          refundMethodName: surplusHandling === 'refund'
            ? paymentMethods.find(m => m.id === refundMethodId)?.payment_method
            : undefined,
        } : undefined,
      });

      if (hasSurplus) {
        const action = surplusHandling === 'credit'
          ? `${formatCurrencyARS(surplus)} added as store credit`
          : `${formatCurrencyARS(surplus)} refund issued`;
        toast.success(`Item returned. ${action}.`);
      } else {
        toast.success("Item returned successfully!");
      }
      onConfirm();
      handleClose();
    } catch (error) {
      console.error("Error processing return:", error);
      const drawerErrorMsg = getDrawerErrorMessage(error);
      if (drawerErrorMsg) {
        setDrawerAlertMessage(drawerErrorMsg);
        setShowDrawerAlert(true);
      } else {
        const errorMessage = error instanceof ApiError && error.data && typeof error.data === 'object' && 'error' in error.data
          ? (error.data as { error?: string }).error
          : error instanceof Error ? error.message : String(error);
        toast.error(errorMessage || ERROR_MESSAGES.FAILED_TO_PROCESS_RETURN);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      payments.resetAllocations();
      setReturnDetails(null);
      discount.resetDiscount();
      extraDays.resetExtraDays();
      setLateFeeApplied(false);
      setLateFeeDays(0);
      setShowLateFeeSection(false);
      setTempLateFeeDays('');
      setLateFeeInitialized(false);
      setShowLateFeeConfirm(false);
      setCreditApplied(0);
      setShowCreditSection(false);
      setTempCreditAmount('');
      setCustomerCreditBalance(0);
      setSurplusHandling('credit');
      setRefundMethodId('');
      onClose();
    }
  };

  return {
    returnDetails,
    paymentMethods,
    loading,
    processing,

    // Discount (from shared hook)
    showDiscountSection: discount.showDiscountSection,
    discountType: discount.discountType,
    discountValue: discount.discountValue,
    discountReason: discount.discountReason,
    tempDiscountValue: discount.tempDiscountValue,
    tempDiscountReason: discount.tempDiscountReason,
    discountInitialized: true,
    setShowDiscountSection: discount.setShowDiscountSection,
    setDiscountType: discount.setDiscountType,
    setTempDiscountValue: discount.setTempDiscountValue,
    setTempDiscountReason: discount.setTempDiscountReason,
    handleRemoveDiscount: discount.handleRemoveDiscount,
    handleApplyDiscount: discount.handleApplyDiscount,
    handleCancelDiscount: discount.handleCancelDiscount,
    handleEditDiscount: discount.handleEditDiscount,

    // Extra days (from shared hook)
    showExtraDaysSection: extraDays.showExtraDaysSection,
    extraDaysOverride: extraDays.extraDaysOverride,
    tempExtraDaysValue: extraDays.tempExtraDaysValue,
    extraDaysInitialized: extraDays.extraDaysInitialized,
    applicableExtraDays: extraDays.applicableExtraDays,
    originalExtraDaysCount: extraDays.originalExtraDaysCount,
    extraDaysCount: extraDays.extraDaysCount,
    extraDaysAmount: extraDays.extraDaysAmount,
    extraDayRate: extraDays.extraDayRate,
    setShowExtraDaysSection: extraDays.setShowExtraDaysSection,
    setExtraDaysOverride: extraDays.setExtraDaysOverride,
    setTempExtraDaysValue: extraDays.setTempExtraDaysValue,

    // Late fee
    lateFeeApplied,
    lateFeeDays,
    showLateFeeSection,
    tempLateFeeDays,
    lateFeeInitialized,
    showLateFeeConfirm,
    applicableLateDays,
    lateDayRate,
    lateDaysPricePct,
    currentItemLateFee,
    setShowLateFeeSection,
    setTempLateFeeDays,
    setShowLateFeeConfirm,
    handleRemoveLateFee,
    handleApplyLateFee,
    handleCancelLateFee,
    handleEditLateFee,

    // Credit
    showCreditSection,
    creditApplied,
    tempCreditAmount,
    customerCreditBalance,
    setShowCreditSection,
    setTempCreditAmount,
    handleApplyCredit,
    handleCancelCredit,
    handleRemoveCredit,

    // Payment (from shared hook)
    paymentAllocations: payments.paymentAllocations,
    allocatedTotal: payments.allocatedTotal,
    remainingAmount: payments.remainingAmount,
    togglePaymentMethod: payments.togglePaymentMethod,
    updatePaymentAmount: payments.updatePaymentAmount,
    isMethodSelected: payments.isMethodSelected,
    getMethodAmount: payments.getMethodAmount,

    // Drawer
    drawerStatus,
    drawerBusinessDate,
    showDrawerAlert,
    drawerAlertMessage,
    setShowDrawerAlert,

    // Surplus
    surplusHandling,
    refundMethodId,
    hasSurplus,
    surplus,
    setSurplusHandling,
    setRefundMethodId,

    // Calculated values (item-specific for display)
    subtotal,
    totalExtraDays,
    lateFeesTotal,
    discountAmount,
    grandTotalBeforeCredit,
    paymentsTotal,
    balanceDueBeforeCredit,
    grandTotal,
    balanceDue,
    hasBalance,
    setCreditApplied,
    serverDiscountPercent: serverItemDiscountAmount,
    serverExtraDays: returnDetails?.extraDaysInfo?.extraDaysCount || 0,

    handleConfirm,
    handleClose,
    canConfirm,
  };
}
