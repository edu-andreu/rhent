import { useState, useEffect, useCallback } from "react";
import { countBusinessDays } from "../../utils/dateUtils";
import { Holiday } from "../../utils/dateUtils";
import { calculateAutoEndDate } from "../../booking/availability";

interface ExtraDaysInfo {
  extraDaysCount: number;
  extraDaysAmount: number;
  extraDaysPricePct?: number;
  basePrice: number;
  overdueRescheduleFeeAmount?: number;
}

interface UseExtraDaysCalculationOptions {
  startDateStr: string | undefined;
  endDateStr: string | undefined;
  configRentalDays: number;
  holidays: Holiday[];
  extraDaysInfo: ExtraDaysInfo | null;
}

export function useExtraDaysCalculation({
  startDateStr,
  endDateStr,
  configRentalDays,
  holidays,
  extraDaysInfo,
}: UseExtraDaysCalculationOptions) {
  const [showExtraDaysSection, setShowExtraDaysSection] = useState(false);
  const [extraDaysOverride, setExtraDaysOverride] = useState<number | null>(null);
  const [tempExtraDaysValue, setTempExtraDaysValue] = useState<string>('');
  const [extraDaysInitialized, setExtraDaysInitialized] = useState(false);
  const [applicableExtraDays, setApplicableExtraDays] = useState<number>(0);

  // Cancellation fee state (editable, initially from server)
  const [cancellationFeeOverride, setCancellationFeeOverride] = useState<number | null>(null);
  const [showCancellationFeeSection, setShowCancellationFeeSection] = useState(false);
  const [tempCancellationFeeValue, setTempCancellationFeeValue] = useState<string>('');

  const originalExtraDaysCount = extraDaysInfo?.extraDaysCount || 0;
  const originalExtraDaysAmount = extraDaysInfo?.extraDaysAmount || 0;
  const originalOverdueFeeAmount = extraDaysInfo?.overdueRescheduleFeeAmount || 0;
  const extraDaysPricePct = extraDaysInfo?.extraDaysPricePct || 75;
  const basePrice = extraDaysInfo?.basePrice || 0;
  const standardDayPrice = basePrice > 0 ? basePrice / configRentalDays : 0;
  const extraDayRate = standardDayPrice * (extraDaysPricePct / 100);

  const cancellationFeeAmount = cancellationFeeOverride !== null
    ? cancellationFeeOverride
    : originalOverdueFeeAmount;

  const extraDaysCount = extraDaysOverride !== null ? extraDaysOverride : originalExtraDaysCount;
  const extraDaysAmount = extraDaysOverride !== null && extraDaysOverride !== originalExtraDaysCount
    ? Math.round(extraDaysCount * extraDayRate)
    : originalExtraDaysAmount;

  // Calculate applicable extra days from date range
  useEffect(() => {
    if (!startDateStr || !endDateStr) {
      setApplicableExtraDays(0);
      return;
    }

    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    startDate.setHours(0, 0, 0, 0);

    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    endDate.setHours(0, 0, 0, 0);

    const { endDate: autoCalculatedEndDate } = calculateAutoEndDate(startDate, configRentalDays, holidays);
    const applicable = endDate > autoCalculatedEndDate
      ? countBusinessDays(autoCalculatedEndDate, endDate, holidays)
      : 0;

    setApplicableExtraDays(applicable);
  }, [startDateStr, endDateStr, configRentalDays, holidays]);

  const initializeFromServer = useCallback((info: ExtraDaysInfo | null) => {
    if (info && info.extraDaysCount > 0) {
      setExtraDaysOverride(info.extraDaysCount);
    } else {
      setExtraDaysOverride(null);
    }
    setExtraDaysInitialized(true);
  }, []);

  const resetExtraDays = useCallback(() => {
    setShowExtraDaysSection(false);
    setExtraDaysOverride(null);
    setTempExtraDaysValue('');
    setExtraDaysInitialized(false);
    setCancellationFeeOverride(null);
    setShowCancellationFeeSection(false);
    setTempCancellationFeeValue('');
  }, []);

  return {
    showExtraDaysSection,
    setShowExtraDaysSection,
    extraDaysOverride,
    setExtraDaysOverride,
    tempExtraDaysValue,
    setTempExtraDaysValue,
    extraDaysInitialized,
    applicableExtraDays,
    originalExtraDaysCount,
    extraDaysCount,
    extraDaysAmount,
    extraDayRate,
    extraDaysPricePct,
    basePrice,
    cancellationFeeAmount,
    originalCancellationFeeAmount: originalOverdueFeeAmount,
    cancellationFeeOverride,
    setCancellationFeeOverride,
    showCancellationFeeSection,
    setShowCancellationFeeSection,
    tempCancellationFeeValue,
    setTempCancellationFeeValue,
    initializeFromServer,
    resetExtraDays,
  };
}
