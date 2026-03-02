import { useState, useCallback } from "react";

interface UseDiscountManagerOptions {
  initialDiscountPercent?: number;
  onDiscountChange?: () => void;
}

export function useDiscountManager(options: UseDiscountManagerOptions = {}) {
  const { initialDiscountPercent = 0, onDiscountChange } = options;

  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [tempDiscountValue, setTempDiscountValue] = useState<string>('');
  const [tempDiscountReason, setTempDiscountReason] = useState<string>('');

  const calculateDiscountAmount = useCallback(
    (baseAmount: number) => {
      if (discountType === 'percentage') {
        return Math.round(baseAmount * discountValue / 100);
      }
      return Math.min(discountValue, baseAmount);
    },
    [discountType, discountValue]
  );

  const handleRemoveDiscount = useCallback(() => {
    setDiscountValue(0);
    setDiscountReason('');
    setTempDiscountValue('');
    setTempDiscountReason('');
    setShowDiscountSection(false);
    onDiscountChange?.();
  }, [onDiscountChange]);

  const handleApplyDiscount = useCallback(() => {
    const value = parseFloat(tempDiscountValue) || 0;
    const roundedValue = discountType === 'fixed' ? Math.round(value) : value;
    setDiscountValue(roundedValue);
    setDiscountReason(tempDiscountReason);
    if (roundedValue > 0) {
      setShowDiscountSection(false);
    }
    onDiscountChange?.();
  }, [tempDiscountValue, tempDiscountReason, discountType, onDiscountChange]);

  const handleCancelDiscount = useCallback(() => {
    setTempDiscountValue('');
    setTempDiscountReason('');
    setShowDiscountSection(false);
  }, []);

  const handleEditDiscount = useCallback(() => {
    setTempDiscountValue(discountValue.toString());
    setTempDiscountReason(discountReason);
    setShowDiscountSection(true);
    setDiscountValue(0);
  }, [discountValue, discountReason]);

  const initializeFromServer = useCallback((percent: number) => {
    if (percent > 0) {
      setDiscountType('percentage');
      setDiscountValue(percent);
    } else {
      setDiscountValue(0);
    }
    setDiscountReason('');
  }, []);

  const resetDiscount = useCallback(() => {
    setShowDiscountSection(false);
    setDiscountValue(0);
    setDiscountReason('');
    setTempDiscountValue('');
    setTempDiscountReason('');
  }, []);

  return {
    showDiscountSection,
    setShowDiscountSection,
    discountType,
    setDiscountType,
    discountValue,
    discountReason,
    tempDiscountValue,
    setTempDiscountValue,
    tempDiscountReason,
    setTempDiscountReason,
    initialDiscountPercent,
    calculateDiscountAmount,
    handleRemoveDiscount,
    handleApplyDiscount,
    handleCancelDiscount,
    handleEditDiscount,
    initializeFromServer,
    resetDiscount,
  };
}
