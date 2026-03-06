import { supabaseConfig, buildFunctionUrl, supabase } from "../config/env";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Custom error class for API errors.
 * Extends the standard Error class with HTTP status code and response data.
 * 
 * @example
 * ```ts
 * try {
 *   await getFunction("some-endpoint");
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API error: ${error.status} - ${error.message}`);
 *     console.error(error.data);
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code */
  status: number;
  /** Response data from the API */
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Parses the response body based on content type.
 * Handles JSON and text responses.
 * 
 * @param response - Fetch Response object
 * @returns Parsed response body (object, string, or null)
 */
const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
};

/**
 * Makes a request to a Supabase Edge Function.
 * Automatically adds authorization headers and handles JSON serialization.
 * 
 * @param path - Function path (e.g., "payment-methods" or "drawer/current")
 * @param init - Fetch RequestInit options (method, headers, body, etc.)
 * @returns Promise resolving to the response data
 * @throws {ApiError} If the request fails
 * 
 * @example
 * ```ts
 * const data = await functionRequest<PaymentMethod[]>("payment-methods", {
 *   method: "GET"
 * });
 * ```
 */
export const functionRequest = async <T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers || {});

  if (!headers.has("Authorization")) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? supabaseConfig.publicAnonKey;
    headers.set("Authorization", `Bearer ${token}`);
  }

  const bodyIsPlainObject =
    init.body &&
    typeof init.body === "object" &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof URLSearchParams) &&
    !(init.body instanceof Blob) &&
    !(init.body instanceof ArrayBuffer);

  if (bodyIsPlainObject && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildFunctionUrl(path), {
    ...init,
    headers,
    body:
      bodyIsPlainObject && init.body
        ? JSON.stringify(init.body as JsonValue)
        : init.body,
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      (data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error?: unknown }).error === "string" &&
        (data as { error: string }).error) ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
};

/**
 * GET request to a Supabase Edge Function.
 * 
 * @param path - Function path
 * @param init - Additional fetch options
 * @returns Promise resolving to the response data
 */
export const getFunction = <T = unknown>(path: string, init: RequestInit = {}) =>
  functionRequest<T>(path, { ...init, method: "GET" });

/**
 * POST request to a Supabase Edge Function.
 * 
 * @param path - Function path
 * @param body - Request body (will be JSON stringified)
 * @param init - Additional fetch options
 * @returns Promise resolving to the response data
 */
export const postFunction = <T = unknown>(
  path: string,
  body?: unknown,
  init: RequestInit = {},
) => functionRequest<T>(path, { ...init, method: "POST", body: body as BodyInit | null | undefined });

/**
 * PUT request to a Supabase Edge Function.
 * 
 * @param path - Function path
 * @param body - Request body (will be JSON stringified)
 * @param init - Additional fetch options
 * @returns Promise resolving to the response data
 */
export const putFunction = <T = unknown>(
  path: string,
  body?: unknown,
  init: RequestInit = {},
) => functionRequest<T>(path, { ...init, method: "PUT", body: body as BodyInit | null | undefined });

/**
 * DELETE request to a Supabase Edge Function.
 * 
 * @param path - Function path
 * @param init - Additional fetch options
 * @returns Promise resolving to the response data
 */
export const deleteFunction = <T = unknown>(path: string, init: RequestInit = {}) =>
  functionRequest<T>(path, { ...init, method: "DELETE" });

/**
 * Extracts an error message from an unknown error object.
 * Handles Error instances, ApiError instances, and other error types.
 * 
 * @param error - Error object of unknown type
 * @param fallback - Fallback message if error message cannot be extracted
 * @returns Error message string
 * 
 * @example
 * ```ts
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   const message = getErrorMessage(error, "Something went wrong");
 *   toast.error(message);
 * }
 * ```
 */
export const getErrorMessage = (error: unknown, fallback = "Request failed"): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
