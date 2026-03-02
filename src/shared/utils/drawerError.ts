/**
 * Utility functions for detecting and handling drawer-related errors
 */

/**
 * Error patterns for drawer-related errors
 */
export const DRAWER_ERROR_PATTERNS = [
  'cash drawer',
  'Cash drawer',
  'drawer is open for',
] as const;

/**
 * Checks if an error is related to cash drawer operations.
 * 
 * @param error - Error string or Error object
 * @returns true if the error is drawer-related
 */
export function isDrawerError(error: string | Error): boolean {
  const message = typeof error === 'string' ? error : error.message;
  return DRAWER_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Extracts drawer error message from an error object.
 * Handles both ApiError and regular Error objects.
 * 
 * @param error - Error object (ApiError, Error, or unknown)
 * @returns The error message string, or undefined if not a drawer error
 */
export function getDrawerErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
    message = error.error;
  } else {
    message = String(error);
  }
  
  return isDrawerError(message) ? message : undefined;
}
