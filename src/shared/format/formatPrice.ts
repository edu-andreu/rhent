/**
 * Shared utility functions for price calculations
 * Used by both frontend and backend to ensure consistency
 */

/**
 * Rounds a number to the nearest thousand
 * @param value - The number to round
 * @returns The rounded number
 *
 * @example
 * roundToNearestThousand(1234) // returns 1000
 * roundToNearestThousand(1567) // returns 2000
 * roundToNearestThousand(500) // returns 1000
 */
export function roundToNearestThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

/**
 * Formats a price by rounding to the nearest thousand and adding thousand separators
 * This function is for display purposes only - it returns a formatted string
 * @param price - The price to format (can be null)
 * @returns Formatted price string or "-" if null
 *
 * @example
 * formatPriceRounded(12345) // returns "12,000"
 * formatPriceRounded(null) // returns "-"
 */
export function formatPriceRounded(price: number | null): string {
  if (price === null || price === undefined) return "-";
  const rounded = roundToNearestThousand(price);
  return rounded.toLocaleString();
}
