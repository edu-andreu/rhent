import { vi } from "vitest";

/**
 * Common test helpers and utilities
 */

/**
 * Mock date to a specific value for testing using vi.useFakeTimers.
 * Returns a function to restore the original timers.
 *
 * @example
 * ```ts
 * const restoreDate = mockDate('2026-02-17T10:00:00Z');
 * // ... test code that uses Date
 * restoreDate();
 * ```
 */
export function mockDate(dateString: string): () => void {
  const mockDate = new Date(dateString);
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);

  return () => {
    vi.useRealTimers();
  };
}

/**
 * Create a mock Date object for a specific date string.
 * Useful for creating test dates without mocking the global Date.
 *
 * @example
 * ```ts
 * const testDate = createTestDate('2026-02-17');
 * expect(testDate.getDate()).toBe(17);
 * ```
 */
export function createTestDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Wait for a specified amount of time (useful for async testing).
 *
 * @example
 * ```ts
 * await waitFor(100); // Wait 100ms
 * ```
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock function that resolves after a delay.
 * Useful for testing loading states.
 *
 * @example
 * ```ts
 * const delayedFn = createDelayedFunction(() => 'result', 100);
 * const promise = delayedFn();
 * // ... assert loading state
 * const result = await promise;
 * ```
 */
export function createDelayedFunction<T>(
  fn: () => T,
  delayMs: number = 0
): () => Promise<T> {
  return async () => {
    await waitFor(delayMs);
    return fn();
  };
}

/**
 * Create a mock toast function for testing components that use toast.
 *
 * @example
 * ```ts
 * const mockToast = createMockToast();
 * // ... render component that calls toast.success()
 * expect(mockToast.success).toHaveBeenCalledWith('Success message');
 * ```
 */
export function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
}

/**
 * Helper to create mock holiday data for testing.
 *
 * @example
 * ```ts
 * const holidays = createMockHolidays([
 *   { date: '2026-02-20', name: 'Test Holiday' }
 * ]);
 * ```
 */
export function createMockHolidays(
  holidays: Array<{ date: string; name: string }>
) {
  return holidays.map((h) => ({
    date: `${h.date}T00:00:00`,
    name: h.name,
  }));
}

/**
 * Helper to create mock configuration data for testing.
 *
 * @example
 * ```ts
 * const config = createMockConfig({
 *   rentalDays: 5,
 *   extraDaysPrice: 20000
 * });
 * ```
 */
export function createMockConfig(overrides: Partial<{
  rentalDays: number;
  extraDaysPrice: number;
  rentDownPct: number;
  reservationDownPct: number;
}> = {}) {
  return {
    rentalDays: 3,
    extraDaysPrice: 30000,
    rentDownPct: 50,
    reservationDownPct: 30,
    ...overrides,
  };
}

/**
 * Helper to create mock payment method data.
 */
export function createMockPaymentMethod(overrides: Partial<{
  id: string;
  payment_method: string;
  payment_type: string;
  payment_user_enabled: number;
}> = {}) {
  return {
    id: "pm-1",
    payment_method: "Cash",
    payment_type: "cash",
    payment_user_enabled: 1,
    status: "active",
    ...overrides,
  };
}

/**
 * Helper to create mock customer data.
 */
export function createMockCustomer(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  phone: string;
}> = {}) {
  return {
    id: "customer-1",
    name: "Test Customer",
    email: "test@example.com",
    phone: "123-456-7890",
    ...overrides,
  };
}

/**
 * Helper to create mock dress/item data.
 */
export function createMockDress(overrides: Partial<{
  id: string;
  name: string;
  pricePerDay: number;
  size: string;
  colors: string[];
}> = {}) {
  return {
    id: "dress-1",
    name: "Test Dress",
    description: "A test dress",
    size: "M",
    colors: ["red", "blue"],
    pricePerDay: 10000,
    imageUrl: "https://example.com/dress.jpg",
    category: "Formal",
    available: true,
    ...overrides,
  };
}
