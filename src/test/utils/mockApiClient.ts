import { vi } from "vitest";
import { ApiError } from "../../shared/api/client";

/**
 * Mock implementation of the API client functions.
 * Use this to mock API calls in tests.
 *
 * @example
 * ```ts
 * import { mockApiClient } from '../test/utils/mockApiClient';
 *
 * beforeEach(() => {
 *   mockApiClient.reset();
 * });
 *
 * test('handles API success', async () => {
 *   mockApiClient.getFunction.mockResolvedValue({ data: 'success' });
 *   // ... test code
 * });
 *
 * test('handles API error', async () => {
 *   mockApiClient.getFunction.mockRejectedValue(
 *     new ApiError('Not found', 404)
 *   );
 *   // ... test code
 * });
 * ```
 */

export const mockApiClient = {
  /**
   * Mock for getFunction
   */
  getFunction: vi.fn(),

  /**
   * Mock for postFunction
   */
  postFunction: vi.fn(),

  /**
   * Mock for putFunction
   */
  putFunction: vi.fn(),

  /**
   * Mock for deleteFunction
   */
  deleteFunction: vi.fn(),

  /**
   * Mock for getErrorMessage
   */
  getErrorMessage: vi.fn((error: unknown, fallback = "Request failed") => {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return fallback;
  }),

  /**
   * Reset all mocks
   */
  reset: () => {
    mockApiClient.getFunction.mockReset();
    mockApiClient.postFunction.mockReset();
    mockApiClient.putFunction.mockReset();
    mockApiClient.deleteFunction.mockReset();
    mockApiClient.getErrorMessage.mockReset();
  },

  /**
   * Clear all mocks and reset call history
   */
  clear: () => {
    mockApiClient.getFunction.mockClear();
    mockApiClient.postFunction.mockClear();
    mockApiClient.putFunction.mockClear();
    mockApiClient.deleteFunction.mockClear();
    mockApiClient.getErrorMessage.mockClear();
  },

  /**
   * Helper to create a successful API response
   */
  success: <T>(data: T) => Promise.resolve(data),

  /**
   * Helper to create an API error response
   */
  error: (message: string, status: number = 500, data?: unknown) =>
    Promise.reject(new ApiError(message, status, data)),

  /**
   * Helper to create a 404 Not Found error
   */
  notFound: (message: string = "Not found") =>
    Promise.reject(new ApiError(message, 404)),

  /**
   * Helper to create a 400 Bad Request error
   */
  badRequest: (message: string = "Bad request", data?: unknown) =>
    Promise.reject(new ApiError(message, 400, data)),

  /**
   * Helper to create a 500 Internal Server Error
   */
  serverError: (message: string = "Internal server error") =>
    Promise.reject(new ApiError(message, 500)),
};

/**
 * Setup function to mock the API client module.
 * Call this in your test setup or beforeEach.
 *
 * @example
 * ```ts
 * import { setupMockApiClient } from '../test/utils/mockApiClient';
 *
 * beforeEach(() => {
 *   setupMockApiClient();
 * });
 * ```
 */
export function setupMockApiClient() {
  vi.mock("../../shared/api/client", async () => {
    const actual = await vi.importActual("../../shared/api/client");
    return {
      ...actual,
      getFunction: mockApiClient.getFunction,
      postFunction: mockApiClient.postFunction,
      putFunction: mockApiClient.putFunction,
      deleteFunction: mockApiClient.deleteFunction,
      getErrorMessage: mockApiClient.getErrorMessage,
      ApiError: ApiError,
    };
  });
}
