import { calculateExtraDays, calculateAutoEndDate } from "./availability";
import { countBusinessDays } from "../utils/dateUtils";
import { Holiday } from "../utils/dateUtils";

export interface PricingCalculation {
  totalDays: number;
  standardDays: number;
  extraDays: number;
  pricePerDay: number;
  standardPrice: number;
  extraDayRate: number;
  extraDaysTotal: number;
  total: number;
  isExtended: boolean;
}

/**
 * Calculate pricing for a rental/reservation
 * 
 * Note: The pricing model works as follows:
 * - `totalRentalPrice` is the TOTAL price for the standard rental period (e.g., 3 days)
 * - `pricePerDay` is calculated as `totalRentalPrice / standardRentalDays` to get the per-day rate
 * - `standardPrice` equals `totalRentalPrice` (fixed price for standard period)
 * - Extra days are charged at a percentage of the per-day rate
 * 
 * @param startDate - The start date
 * @param endDate - The end date (actual return date, may be after auto-calculated end)
 * @param autoCalculatedEndDate - The automatically calculated end date based on standard rental days
 * @param standardRentalDays - The standard rental period in days (from config)
 * @param totalRentalPrice - The total price for the standard rental period (dress.pricePerDay)
 * @param extraDayPricePercent - The percentage of daily price charged for extra days (e.g., 75 for 75%)
 * @param holidays - Array of holidays to exclude from day count
 * @returns Pricing calculation object with all pricing details
 */
export function calculatePricing(
  startDate: Date | undefined,
  endDate: Date | undefined,
  autoCalculatedEndDate: Date | undefined,
  standardRentalDays: number,
  totalRentalPrice: number,
  extraDayPricePercent: number,
  holidays: Holiday[] = []
): PricingCalculation {
  // Default values if dates are missing
  if (!startDate || !endDate || endDate <= startDate || !autoCalculatedEndDate) {
    return {
      totalDays: 0,
      standardDays: standardRentalDays,
      extraDays: 0,
      pricePerDay: 0,
      standardPrice: 0,
      extraDayRate: 0,
      extraDaysTotal: 0,
      total: 0,
      isExtended: false,
    };
  }

  // Price per day for standard rental (used to calculate extra day rate)
  const pricePerDay = totalRentalPrice / standardRentalDays;
  
  // Calculate actual days from start to selected end
  const actualDaysCount = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  // Extra days = difference between selected end date and auto-calculated end date
  // Only if user selected a date AFTER the auto-calculated date
  // Count only business days (exclude weekends and holidays)
  const extraDays = endDate > autoCalculatedEndDate 
    ? countBusinessDays(autoCalculatedEndDate, endDate, holidays)
    : 0;
  
  const isExtended = extraDays > 0;
  
  // Standard rental price (always based on totalRentalPrice, not actual days)
  const standardPrice = totalRentalPrice;
  
  // Extra day rate (percentage of standard day price)
  const extraDayRate = pricePerDay * (extraDayPricePercent / 100);
  
  // Extra days total
  const extraDaysTotal = extraDays * extraDayRate;
  
  // Total
  const total = standardPrice + extraDaysTotal;

  return {
    totalDays: actualDaysCount,
    standardDays: standardRentalDays,
    extraDays,
    pricePerDay,
    standardPrice,
    extraDayRate,
    extraDaysTotal,
    total,
    isExtended,
  };
}

/**
 * Calculate the extra day rate based on price per day and percentage
 * 
 * @param pricePerDay - The base price per day
 * @param extraDayPricePercent - The percentage of daily price charged for extra days (e.g., 75 for 75%)
 * @returns The extra day rate
 */
export function calculateExtraDayRate(pricePerDay: number, extraDayPricePercent: number): number {
  return (pricePerDay * extraDayPricePercent) / 100;
}

/**
 * Calculate total price including extra days
 * 
 * @param standardPrice - The standard rental price (usually equals pricePerDay)
 * @param extraDays - Number of extra days
 * @param extraDayRate - Rate per extra day
 * @returns Total price
 */
export function calculateTotalPrice(
  standardPrice: number,
  extraDays: number,
  extraDayRate: number
): number {
  return standardPrice + (extraDays * extraDayRate);
}
