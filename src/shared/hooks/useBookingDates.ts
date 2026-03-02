import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import { getFunction } from "../api/client";
import {
  Holiday,
  ReservedPeriod,
  BufferPeriod,
  isWeekend,
  isHoliday,
  formatDateLocal,
  checkDateRangeConflictWithBuffers,
  computeBufferPeriodsFromServer,
  getCurrentDateGMT3,
} from "../utils/dateUtils";
import {
  ApiAvailabilityResponse,
  ApiReservedDate,
  ApiReservedPeriod,
  ApiReservedPeriodsResponse,
} from "../../types/api";
import { calculateAutoEndDate } from "../booking/availability";

export interface ConflictAlert {
  open: boolean;
  title: string;
  description: string;
}

export interface UseBookingDatesOptions {
  itemId: string | null;
  open: boolean;
  holidays: Holiday[];
  rentalDays: number;
  excludeItemId?: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

export interface UseBookingDatesReturn {
  startDate: Date | undefined;
  endDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  setEndDate: (date: Date | undefined) => void;
  autoCalculatedEndDate: Date | undefined;
  holidaysInPeriod: Holiday[];
  reservedDates: Date[];
  reservedPeriods: ReservedPeriod[];
  bufferDates: Date[];
  bufferPeriods: BufferPeriod[];
  blockPrevDays: number;
  blockNextDays: number;
  serverReservedPeriods: ApiReservedPeriod[];
  loadingAvailability: boolean;
  conflictAlert: ConflictAlert;
  setConflictAlert: (alert: ConflictAlert) => void;
  dismissConflictAlert: () => void;
  validateDates: (options?: { excludeReservationId?: string }) => boolean;
  resetDates: () => void;
}

function mergeReservedDates(existing: Date[], newDates: Date[]): Date[] {
  const existingTimes = new Set(existing.map((d) => d.getTime()));
  const combined = [...existing];
  for (const d of newDates) {
    if (!existingTimes.has(d.getTime())) {
      combined.push(d);
    }
  }
  combined.sort((a, b) => a.getTime() - b.getTime());
  return combined;
}

function mergeReservedPeriods(
  existing: ReservedPeriod[],
  newPeriods: ReservedPeriod[]
): ReservedPeriod[] {
  const combined = [...existing];
  for (const newPeriod of newPeriods) {
    const alreadyCovered = existing.some(
      (e) =>
        e.startDate.getTime() === newPeriod.startDate.getTime() &&
        e.endDate.getTime() === newPeriod.endDate.getTime()
    );
    if (!alreadyCovered) combined.push(newPeriod);
  }
  return combined;
}

function parseServerPeriods(
  serverPeriods: ApiReservedPeriod[]
): ReservedPeriod[] {
  return serverPeriods.map((p) => {
    const [sy, sm, sd] = p.start_date.split("-").map(Number);
    const effectiveEnd = p.effective_end_date || p.end_date;
    const [ey, em, ed] = effectiveEnd.split("-").map(Number);
    const startD = new Date(sy, sm - 1, sd);
    startD.setHours(0, 0, 0, 0);
    const endD = new Date(ey, em - 1, ed);
    endD.setHours(0, 0, 0, 0);
    return { startDate: startD, endDate: endD };
  });
}

function expandPeriodsToIndividualDates(periods: ReservedPeriod[]): Date[] {
  const dates: Date[] = [];
  for (const p of periods) {
    const current = new Date(p.startDate);
    while (current <= p.endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  }
  return dates;
}

function datesToContinuousPeriods(dates: Date[]): ReservedPeriod[] {
  if (dates.length === 0) return [];
  const periods: ReservedPeriod[] = [];
  let periodStart = dates[0];
  let periodEnd = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const currentDate = dates[i];
    const prevDate = dates[i - 1];
    const diffDays = Math.round(
      (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      periodEnd = currentDate;
    } else {
      periods.push({ startDate: periodStart, endDate: periodEnd });
      periodStart = currentDate;
      periodEnd = currentDate;
    }
  }
  periods.push({ startDate: periodStart, endDate: periodEnd });
  return periods;
}

export function useBookingDates({
  itemId,
  open,
  holidays,
  rentalDays,
  excludeItemId,
  initialStartDate,
  initialEndDate,
}: UseBookingDatesOptions): UseBookingDatesReturn {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [autoCalculatedEndDate, setAutoCalculatedEndDate] = useState<
    Date | undefined
  >(undefined);
  const [holidaysInPeriod, setHolidaysInPeriod] = useState<Holiday[]>([]);
  const [reservedDates, setReservedDates] = useState<Date[]>([]);
  const [reservedPeriods, setReservedPeriods] = useState<ReservedPeriod[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bufferDates, setBufferDates] = useState<Date[]>([]);
  const [bufferPeriods, setBufferPeriods] = useState<BufferPeriod[]>([]);
  const [blockPrevDays, setBlockPrevDays] = useState<number>(4);
  const [blockNextDays, setBlockNextDays] = useState<number>(1);
  const [serverReservedPeriods, setServerReservedPeriods] = useState<
    ApiReservedPeriod[]
  >([]);
  const [conflictAlert, setConflictAlert] = useState<ConflictAlert>({
    open: false,
    title: "",
    description: "",
  });

  const resetDates = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setAutoCalculatedEndDate(undefined);
    setHolidaysInPeriod([]);
  }, []);

  const dismissConflictAlert = useCallback(() => {
    setConflictAlert((prev) => ({ ...prev, open: false }));
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setReservedDates([]);
      setReservedPeriods([]);
      setServerReservedPeriods([]);
    } else {
      resetDates();
      setReservedDates([]);
      setReservedPeriods([]);
      setServerReservedPeriods([]);
    }
  }, [open, initialStartDate, initialEndDate, resetDates]);

  // Fetch reserved dates/periods for this item
  useEffect(() => {
    if (!open || !itemId) return;

    const fetchReservedDates = async () => {
      try {
        setLoadingAvailability(true);

        const [data, periodsData] = await Promise.all([
          getFunction<ApiAvailabilityResponse>(
            `inventory-items/${itemId}/availability`
          ),
          getFunction<ApiReservedPeriodsResponse>(
            `inventory-items/${itemId}/reserved-periods`
          ).catch(() => null),
        ]);

        if (periodsData) {
          const serverPeriods = periodsData.reservedPeriods || [];
          setServerReservedPeriods(serverPeriods);

          const prevDays = periodsData.blockPrevDays ?? 4;
          const nextDays = periodsData.blockNextDays ?? 1;
          setBlockPrevDays(prevDays);
          setBlockNextDays(nextDays);

          const filteredPeriods = excludeItemId
            ? serverPeriods.filter(
                (p: ApiReservedPeriod) => p.rental_item_id !== excludeItemId
              )
            : serverPeriods;

          const periodsFromServer = parseServerPeriods(filteredPeriods);

          setReservedPeriods((prev) =>
            mergeReservedPeriods(periodsFromServer, prev)
          );

          const datesFromServer =
            expandPeriodsToIndividualDates(periodsFromServer);
          setReservedDates((prev) => mergeReservedDates(prev, datesFromServer));

          const { bufferPeriods: bPeriods, bufferDates: bDates } =
            computeBufferPeriodsFromServer(
              serverPeriods,
              prevDays,
              nextDays,
              excludeItemId
            );
          setBufferPeriods(bPeriods);
          setBufferDates(bDates);
        }

        const dates = (data.reservedDates || [])
          .filter(
            (item: ApiReservedDate) =>
              !excludeItemId || item.rental_item_id !== excludeItemId
          )
          .map((item: ApiReservedDate): Date => {
            const [year, month, day] = item.day.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            date.setHours(0, 0, 0, 0);
            return date;
          });

        dates.sort((a, b) => a.getTime() - b.getTime());
        const periods = datesToContinuousPeriods(dates);

        setReservedDates((prev) => mergeReservedDates(prev, dates));
        setReservedPeriods((prev) => mergeReservedPeriods(prev, periods));
      } catch (error) {
        console.error("Error fetching reserved dates:", error);
        setReservedDates([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchReservedDates();
  }, [open, itemId, excludeItemId]);

  // Auto-calculate end date when start date or rental days change
  useEffect(() => {
    if (!startDate || rentalDays <= 0) {
      setAutoCalculatedEndDate(undefined);
      setEndDate(undefined);
      setHolidaysInPeriod([]);
      return;
    }

    const { endDate: calculatedEndDate, holidaysInPeriod: foundHolidays } =
      calculateAutoEndDate(startDate, rentalDays, holidays);

    setAutoCalculatedEndDate(calculatedEndDate);
    setEndDate(calculatedEndDate);
    setHolidaysInPeriod(foundHolidays);
  }, [startDate, rentalDays, holidays]);

  const validateDates = useCallback(
    (options?: { excludeReservationId?: string }): boolean => {
      if (!startDate || !endDate) return false;

      if (isWeekend(startDate)) {
        toast.error(
          "Start date cannot be on a weekend. Please select a weekday."
        );
        return false;
      }
      if (isWeekend(endDate)) {
        toast.error(
          "Return date cannot be on a weekend. Please select a weekday."
        );
        return false;
      }
      if (isHoliday(startDate, holidays)) {
        toast.error(
          "Start date cannot be on a holiday. Please select a business day."
        );
        return false;
      }
      if (isHoliday(endDate, holidays)) {
        toast.error(
          "Return date cannot be on a holiday. Please select a business day."
        );
        return false;
      }

      const startDateStr = formatDateLocal(startDate);
      const endDateStr = formatDateLocal(endDate);
      const conflictCheck = checkDateRangeConflictWithBuffers(
        startDateStr,
        endDateStr,
        serverReservedPeriods,
        blockPrevDays,
        blockNextDays,
        options?.excludeReservationId
          ? { excludeReservationId: options.excludeReservationId }
          : undefined
      );

      if (conflictCheck.hasConflict) {
        const msg = conflictCheck.isBufferConflict
          ? "The selected date range falls within the preparation/wash buffer of an existing reservation. Please choose different dates."
          : "The selected date range overlaps with existing reservations. Please choose different dates.";
        setConflictAlert({ open: true, title: "Date Conflict", description: msg });
        return false;
      }

      return true;
    },
    [
      startDate,
      endDate,
      holidays,
      serverReservedPeriods,
      blockPrevDays,
      blockNextDays,
    ]
  );

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    autoCalculatedEndDate,
    holidaysInPeriod,
    reservedDates,
    reservedPeriods,
    bufferDates,
    bufferPeriods,
    blockPrevDays,
    blockNextDays,
    serverReservedPeriods,
    loadingAvailability,
    conflictAlert,
    setConflictAlert,
    dismissConflictAlert,
    validateDates,
    resetDates,
  };
}
