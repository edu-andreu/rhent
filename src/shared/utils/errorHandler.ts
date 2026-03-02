import { toast } from "sonner@2.0.3";
import { getErrorMessage } from "../api/client";
import { ERROR_MESSAGES, ERROR_PATTERNS } from "../constants/errors";
import { getDrawerErrorMessage } from "./drawerError";

/**
 * Handles API errors consistently across the application.
 * Checks for connection failures and provides appropriate user feedback.
 * 
 * @param error - The error object from the API call
 * @param resourceName - Name of the resource being loaded (e.g., "dresses", "customers")
 * @param fallbackMessage - Optional custom fallback message
 */
export function handleApiError(error: unknown, resourceName: string, fallbackMessage?: string): void {
  console.error(`Error loading ${resourceName}:`, error);
  
  if (String(error).includes(ERROR_PATTERNS.FETCH_FAILED)) {
    toast.error(ERROR_MESSAGES.CONNECTION_FAILED);
  } else {
    const message = fallbackMessage || `Failed to load ${resourceName}`;
    toast.error(`${message}: ${getErrorMessage(error)}`);
  }
}

/**
 * Handles API errors and returns a default value.
 * Useful when you need to provide a fallback value on error.
 * 
 * @param error - The error object from the API call
 * @param resourceName - Name of the resource being loaded
 * @param defaultValue - Value to return on error
 * @returns The defaultValue
 */
export function handleApiErrorWithDefault<T>(error: unknown, resourceName: string, defaultValue: T): T {
  handleApiError(error, resourceName);
  return defaultValue;
}

/**
 * Standardized error handler for component operations.
 * Handles both API errors and drawer errors consistently.
 * 
 * @param error - The error object
 * @param resourceName - Name of the resource/operation
 * @param onDrawerError - Optional callback for drawer errors
 * @returns The error message if it's not a drawer error, undefined otherwise
 */
export function handleComponentError(
  error: unknown,
  resourceName: string,
  onDrawerError?: (message: string) => void
): string | undefined {
  const drawerErrorMsg = getDrawerErrorMessage(error);
  
  if (drawerErrorMsg) {
    if (onDrawerError) {
      onDrawerError(drawerErrorMsg);
    }
    return undefined;
  }
  
  handleApiError(error, resourceName);
  return undefined;
}
