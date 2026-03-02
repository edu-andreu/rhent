/**
 * Utility functions for date handling across the app
 */

export interface Holiday {
  date: string;
  name: string;
  type?: string;
}

export interface ReservedPeriod {
  startDate: Date;
  endDate: Date;
}

export interface BufferPeriod {
  startDate: Date;
  endDate: Date;
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 * @param date - The date to check
 * @returns true if the date is Saturday (6) or Sunday (0)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Format a date as YYYY-MM-DD without timezone conversion
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (YYYY-MM-DD) WITHOUT timezone conversion
 * This prevents the common bug where "2026-02-27" becomes Feb 26 in GMT-3
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseDateLocal(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Split the date string and parse components
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create date in local timezone (month is 0-indexed)
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  return date;
}

/**
 * Check if a date is a holiday
 * @param date - The date to check
 * @param holidays - Array of holidays
 * @returns true if the date is a holiday
 */
export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateStr = formatDateLocal(date);
  return holidays.some(holiday => holiday.date === dateStr);
}

/**
 * Count the number of business days between two dates.
 * Business days exclude weekends (Saturday/Sunday) and holidays.
 * The fromDate is EXCLUSIVE and the toDate is INCLUSIVE.
 *
 * Example: fromDate = Fri Feb 20, toDate = Tue Feb 24
 *   Feb 21 (Sat) - skip, Feb 22 (Sun) - skip, Feb 23 (Mon) - count, Feb 24 (Tue) - count
 *   Result: 2
 *
 * @param fromDate - The starting date (exclusive)
 * @param toDate - The ending date (inclusive)
 * @param holidays - Array of holidays to exclude
 * @returns Number of business days between the two dates
 */
export function countBusinessDays(fromDate: Date, toDate: Date, holidays: Holiday[]): number {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(0, 0, 0, 0);

  if (to <= from) return 0;

  let count = 0;
  const current = new Date(from);
  current.setDate(current.getDate() + 1); // Start from the day AFTER fromDate

  while (current <= to) {
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get the current date in GMT-3 timezone
 * @returns Date object representing today in GMT-3
 */
export function getCurrentDateGMT3(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const gmt3 = new Date(utc + (3600000 * -3));
  gmt3.setHours(0, 0, 0, 0);
  return gmt3;
}

/**
 * Check if a date falls within any reserved period
 * @param date - The date to check
 * @param reservedPeriods - Array of reserved periods with start and end dates
 * @returns true if the date falls within any reserved period (inclusive)
 */
export function isDateReserved(date: Date, reservedPeriods: ReservedPeriod[]): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return reservedPeriods.some(period => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Date is reserved if it falls within the range [start, end] inclusive
    return checkDate >= start && checkDate <= end;
  });
}

/**
 * Check if a date falls within any buffer period
 * @param date - The date to check
 * @param bufferPeriods - Array of buffer periods with start and end dates
 * @returns true if the date falls within any buffer period (inclusive)
 */
export function isDateInBuffer(date: Date, bufferPeriods: BufferPeriod[]): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return bufferPeriods.some(period => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Date is in buffer if it falls within the range [start, end] inclusive
    return checkDate >= start && checkDate <= end;
  });
}

/**
 * Centralized date validation function for all date pickers
 * This ensures consistent validation across the entire app
 *
 * @param date - The date to validate
 * @param options - Validation options
 * @returns true if the date should be DISABLED, false if it should be ENABLED
 */
export function shouldDisableDate(
  date: Date,
  options: {
    minDate?: Date;
    maxDate?: Date;
    holidays?: Holiday[];
    reservedPeriods?: ReservedPeriod[];
    bufferPeriods?: BufferPeriod[];
    excludeWeekends?: boolean;
  }
): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (options.minDate) {
    const minDate = new Date(options.minDate);
    minDate.setHours(0, 0, 0, 0);
    if (checkDate < minDate) return true;
  }

  if (options.maxDate) {
    const maxDate = new Date(options.maxDate);
    maxDate.setHours(0, 0, 0, 0);
    if (checkDate > maxDate) return true;
  }

  if (options.excludeWeekends !== false) {
    if (isWeekend(checkDate)) return true;
  }

  if (options.holidays && options.holidays.length > 0) {
    if (isHoliday(checkDate, options.holidays)) return true;
  }

  if (options.reservedPeriods && options.reservedPeriods.length > 0) {
    if (isDateReserved(checkDate, options.reservedPeriods)) return true;
  }

  if (options.bufferPeriods && options.bufferPeriods.length > 0) {
    if (isDateInBuffer(checkDate, options.bufferPeriods)) return true;
  }

  return false;
}

/**
 * Get the next available business day (skips weekends and holidays)
 * @param startDate - The date to start from (defaults to today)
 * @param holidays - Array of holidays to check against
 * @returns The next available business day
 */
export function getNextAvailableWeekday(startDate?: Date, holidays: Holiday[] = []): Date {
  const date = startDate ? new Date(startDate) : getCurrentDateGMT3();
  date.setHours(0, 0, 0, 0);

  while (isWeekend(date) || isHoliday(date, holidays)) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/**
 * Check if a date range conflicts with any reserved periods
 * This is the CENTRAL validation function used across all booking flows
 *
 * @param startDate - Start date of the range to check (string in YYYY-MM-DD format)
 * @param endDate - End date of the range to check (string in YYYY-MM-DD format)
 * @param reservedPeriods - Array of reserved periods from the server (with start_date and end_date strings)
 * @param excludeRentalId - Optional rental ID to exclude from conflict check (for rescheduling)
 * @param excludeReservationId - Optional reservation ID to exclude from conflict check (for rescheduling)
 * @returns Object with conflict status and details
 */
export function checkDateRangeConflict(
  startDate: string,
  endDate: string,
  reservedPeriods: Array<{
    start_date: string;
    end_date: string;
    rental_id?: string;
    reservation_id?: string;
  }>,
  options?: {
    excludeRentalId?: string;
    excludeReservationId?: string;
  }
): { hasConflict: boolean; conflictingPeriod?: any } {
  const periodsToCheck = reservedPeriods.filter(period => {
    if (options?.excludeRentalId && period.rental_id === options.excludeRentalId) {
      return false;
    }
    if (options?.excludeReservationId && period.reservation_id === options.excludeReservationId) {
      return false;
    }
    return true;
  });

  for (const period of periodsToCheck) {
    const periodStart = period.start_date;
    const periodEnd = period.end_date;

    if (startDate <= periodEnd && endDate >= periodStart) {
      return {
        hasConflict: true,
        conflictingPeriod: period
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Compute buffer periods (prev/post lock days) from reserved periods.
 * Buffer days represent preparation time before and wash/fix time after a rental.
 *
 * - Previous buffer: N days BEFORE the start_date
 * - Posterior buffer: N days AFTER the effective_end_date (accounts for late returns)
 * - Buffer periods exclude days that overlap with the reserved period itself
 *
 * @param serverPeriods - Array of server period objects with start_date, effective_end_date
 * @param blockPrevDays - Number of days to block before the start date
 * @param blockNextDays - Number of days to block after the effective end date
 * @param excludeRentalItemId - Optional rental_item_id to exclude (for rescheduling)
 * @returns Object with bufferPeriods (for shouldDisableDate) and bufferDates (for calendar styling)
 */
export function computeBufferPeriodsFromServer(
  serverPeriods: Array<{
    start_date: string;
    effective_end_date?: string;
    end_date: string;
    rental_item_id?: string;
  }>,
  blockPrevDays: number,
  blockNextDays: number,
  excludeRentalItemId?: string
): { bufferPeriods: BufferPeriod[]; bufferDates: Date[] } {
  const bufferPeriods: BufferPeriod[] = [];
  const bufferDatesSet = new Set<number>();
  const bufferDates: Date[] = [];

  const reservedTimestamps = new Set<number>();
  for (const p of serverPeriods) {
    if (excludeRentalItemId && p.rental_item_id === excludeRentalItemId) continue;
    const [sy, sm, sd] = p.start_date.split('-').map(Number);
    const effectiveEnd = p.effective_end_date || p.end_date;
    const [ey, em, ed] = effectiveEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ey, em - 1, ed);
    end.setHours(0, 0, 0, 0);
    const current = new Date(start);
    while (current <= end) {
      reservedTimestamps.add(current.getTime());
      current.setDate(current.getDate() + 1);
    }
  }

  for (const period of serverPeriods) {
    if (excludeRentalItemId && period.rental_item_id === excludeRentalItemId) continue;

    const [sy, sm, sd] = period.start_date.split('-').map(Number);
    const effectiveEnd = period.effective_end_date || period.end_date;
    const [ey, em, ed] = effectiveEnd.split('-').map(Number);
    const periodStart = new Date(sy, sm - 1, sd);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(ey, em - 1, ed);
    periodEnd.setHours(0, 0, 0, 0);

    if (blockPrevDays > 0) {
      const prevEnd = new Date(periodStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(periodStart);
      prevStart.setDate(prevStart.getDate() - blockPrevDays);

      if (prevStart <= prevEnd) {
        bufferPeriods.push({ startDate: new Date(prevStart), endDate: new Date(prevEnd) });
        const cur = new Date(prevStart);
        while (cur <= prevEnd) {
          const t = cur.getTime();
          if (!reservedTimestamps.has(t) && !bufferDatesSet.has(t)) {
            bufferDatesSet.add(t);
            bufferDates.push(new Date(cur));
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }

    if (blockNextDays > 0) {
      const postStart = new Date(periodEnd);
      postStart.setDate(postStart.getDate() + 1);
      const postEnd = new Date(periodEnd);
      postEnd.setDate(postEnd.getDate() + blockNextDays);

      if (postStart <= postEnd) {
        bufferPeriods.push({ startDate: new Date(postStart), endDate: new Date(postEnd) });
        const cur = new Date(postStart);
        while (cur <= postEnd) {
          const t = cur.getTime();
          if (!reservedTimestamps.has(t) && !bufferDatesSet.has(t)) {
            bufferDatesSet.add(t);
            bufferDates.push(new Date(cur));
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
  }

  bufferDates.sort((a, b) => a.getTime() - b.getTime());
  return { bufferPeriods, bufferDates };
}

/**
 * Check if a date range conflicts with any reserved periods INCLUDING buffer zones.
 * This extends checkDateRangeConflict to also check buffer (prev/post lock) days.
 *
 * @param startDate - Start date of the range to check (YYYY-MM-DD)
 * @param endDate - End date of the range to check (YYYY-MM-DD)
 * @param reservedPeriods - Array of reserved periods from the server
 * @param blockPrevDays - Number of previous lock days
 * @param blockNextDays - Number of posterior lock days
 * @param options - Exclude options
 * @returns Object with conflict status and details
 */
export function checkDateRangeConflictWithBuffers(
  startDate: string,
  endDate: string,
  reservedPeriods: Array<{
    start_date: string;
    end_date: string;
    effective_end_date?: string;
    rental_id?: string;
    rental_item_id?: string;
    reservation_id?: string;
  }>,
  blockPrevDays: number,
  blockNextDays: number,
  options?: {
    excludeRentalId?: string;
    excludeReservationId?: string;
    excludeRentalItemId?: string;
  }
): { hasConflict: boolean; conflictingPeriod?: any; isBufferConflict?: boolean } {
  const periodsToCheck = reservedPeriods.filter(period => {
    if (options?.excludeRentalId && period.rental_id === options.excludeRentalId) return false;
    if (options?.excludeReservationId && period.reservation_id === options.excludeReservationId) return false;
    if (options?.excludeRentalItemId && period.rental_item_id === options.excludeRentalItemId) return false;
    return true;
  });

  for (const period of periodsToCheck) {
    const effectiveEnd = period.effective_end_date || period.end_date;

    const pStart = parseDateLocal(period.start_date);
    const pEnd = parseDateLocal(effectiveEnd);
    const bufferedStart = new Date(pStart);
    bufferedStart.setDate(bufferedStart.getDate() - blockPrevDays);
    const bufferedEnd = new Date(pEnd);
    bufferedEnd.setDate(bufferedEnd.getDate() + blockNextDays);

    const bufferedStartStr = formatDateLocal(bufferedStart);
    const bufferedEndStr = formatDateLocal(bufferedEnd);

    if (startDate <= bufferedEndStr && endDate >= bufferedStartStr) {
      const isDirectConflict = startDate <= effectiveEnd && endDate >= period.start_date;
      return {
        hasConflict: true,
        conflictingPeriod: period,
        isBufferConflict: !isDirectConflict,
      };
    }
  }

  return { hasConflict: false };
}
