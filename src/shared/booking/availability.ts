import { Holiday, formatDateLocal, countBusinessDays, isWeekend, isHoliday } from "../utils/dateUtils";

/**
 * Calculate the automatic end date for a rental/reservation
 * Formula: end date = start date + rental days
 * If the end date falls on a weekend or holiday, it's pushed to the next business day
 * 
 * @param startDate - The start date
 * @param rentalDays - Number of rental days (standard period)
 * @param holidays - Array of holidays to check against
 * @returns Object with the calculated end date and holidays found in the period
 */
export function calculateAutoEndDate(
  startDate: Date,
  rentalDays: number,
  holidays: Holiday[]
): { endDate: Date; holidaysInPeriod: Holiday[] } {
  // Formula: return date = start date + rental_days
  let returnDate = new Date(startDate);
  returnDate.setHours(0, 0, 0, 0);
  
  // Add rental days
  returnDate.setDate(returnDate.getDate() + rentalDays);
  
  const holidaysFound: Holiday[] = [];

  // If the return date falls on a weekend or holiday, push it to the next working day
  let adjusted = true;
  while (adjusted) {
    adjusted = false;
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = returnDate.getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if return date is a holiday
    const returnDateStr = formatDateLocal(returnDate);
    const isHolidayDay = holidays.some(h => {
      const holidayDateStr = h.date.split('T')[0];
      return holidayDateStr === returnDateStr;
    });

    if (isWeekendDay || isHolidayDay) {
      if (isHolidayDay) {
        // Track this holiday
        const holiday = holidays.find(h => {
          const holidayDateStr = h.date.split('T')[0];
          return holidayDateStr === returnDateStr;
        });
        if (holiday && !holidaysFound.find(h => h.date === holiday.date)) {
          holidaysFound.push(holiday);
        }
      }
      // Push return date forward by 1 day
      returnDate.setDate(returnDate.getDate() + 1);
      adjusted = true; // Continue checking
    }
  }

  return { endDate: returnDate, holidaysInPeriod: holidaysFound };
}

/**
 * Calculate the number of extra days beyond the standard rental period
 * 
 * @param startDate - The start date
 * @param endDate - The end date (actual return date)
 * @param standardRentalDays - The standard rental period in days
 * @param holidays - Array of holidays to exclude from count
 * @returns Number of extra days (0 if end date is within standard period)
 */
export function calculateExtraDays(
  startDate: Date,
  endDate: Date,
  standardRentalDays: number,
  holidays: Holiday[]
): number {
  if (!startDate || !endDate || endDate <= startDate) {
    return 0;
  }

  // Count total business days in the period
  const totalBusinessDays = countBusinessDays(startDate, endDate, holidays);
  
  // Extra days = total business days - standard rental days
  const extraDays = totalBusinessDays - standardRentalDays;
  
  // Return 0 if negative (shouldn't happen, but safety check)
  return Math.max(0, extraDays);
}

import { checkDateRangeConflictWithBuffers } from "../utils/dateUtils";
import { BufferPeriod } from "../utils/dateUtils";

/**
 * Validate that a date range doesn't conflict with reserved periods and buffers
 * This is a wrapper around the existing checkDateRangeConflictWithBuffers utility
 * 
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param reservedPeriods - Array of reserved periods from server
 * @param bufferPeriods - Array of buffer periods (prep/wash lock days)
 * @param excludeRentalId - Optional rental ID to exclude from conflict check
 * @param excludeReservationId - Optional reservation ID to exclude from conflict check
 * @returns Object with conflict status and details
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  reservedPeriods: Array<{ start_date: string; end_date: string; rental_id?: string; reservation_id?: string }>,
  bufferPeriods: BufferPeriod[],
  excludeRentalId?: string,
  excludeReservationId?: string
): { hasConflict: boolean; conflictDetails?: string } {
  const conflict = checkDateRangeConflictWithBuffers(
    formatDateLocal(startDate),
    formatDateLocal(endDate),
    reservedPeriods,
    bufferPeriods,
    excludeRentalId,
    excludeReservationId
  );

  return {
    hasConflict: conflict.hasConflict,
    conflictDetails: conflict.conflictDetails,
  };
}
