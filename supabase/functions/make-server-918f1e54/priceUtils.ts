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
