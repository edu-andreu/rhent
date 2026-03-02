/**
 * Error-related constants for consistent error handling
 */

/**
 * Error message patterns for detecting specific error types
 */
export const ERROR_PATTERNS = {
  FETCH_FAILED: 'Failed to fetch',
  DRAWER_ERROR: /cash drawer|Cash drawer|drawer is open for/i,
} as const;

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: "Unable to connect to server. Please check if the Supabase Edge Function is deployed.",
  REQUEST_FAILED: "Request failed",
  CHECKOUT_FAILED: "Checkout failed. Please try again.",
  CUSTOMER_REQUIRED: "Customer is required",
  FAILED_TO_PROCESS_RETURN: "Failed to process return",
  BOOKING_CONFLICT: "This item is already booked for some of the selected dates. Please choose different dates.",
} as const;
