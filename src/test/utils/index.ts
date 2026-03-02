/**
 * Test utilities index file.
 * Re-export all test utilities for convenient importing.
 *
 * @example
 * ```ts
 * import { renderWithProviders, mockApiClient, createMockDress } from '../test/utils';
 * ```
 */

export { renderWithProviders } from "./renderWithProviders";
export { mockApiClient, setupMockApiClient } from "./mockApiClient";
export {
  mockDate,
  createTestDate,
  waitFor,
  createDelayedFunction,
  createMockToast,
  createMockHolidays,
  createMockConfig,
  createMockPaymentMethod,
  createMockCustomer,
  createMockDress,
} from "./testHelpers";
