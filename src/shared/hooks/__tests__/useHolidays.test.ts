import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHolidays, clearHolidaysCache } from "../useHolidays";

const mockGetFunction = vi.fn();
const mockToastError = vi.fn();
vi.mock("../../api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
}));
vi.mock("sonner@2.0.3", () => ({
  toast: { error: (msg: string) => mockToastError(msg) },
}));

describe("useHolidays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearHolidaysCache();
  });

  it("should start with loading true and empty holidays", () => {
    mockGetFunction.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useHolidays(true));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(false);
    expect(result.current.holidays).toEqual([]);
  });

  it("should set loading false and not fetch when enabled is false", async () => {
    const { result } = renderHook(() => useHolidays(false));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockGetFunction).not.toHaveBeenCalled();
    expect(result.current.holidays).toEqual([]);
  });

  it("should set holidays on successful fetch", async () => {
    const mockHolidays = [
      { date: "2026-01-01T00:00:00", name: "New Year" },
      { date: "2026-02-20T00:00:00", name: "Holiday" },
    ];
    mockGetFunction.mockResolvedValue({ holidays: mockHolidays });

    const { result } = renderHook(() => useHolidays(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe(false);
    expect(result.current.holidays).toEqual(mockHolidays);
    expect(mockGetFunction).toHaveBeenCalledWith("holidays");
  });

  it("should set error and empty holidays on fetch failure", async () => {
    mockGetFunction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useHolidays(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe(true);
    expect(result.current.holidays).toEqual([]);
    expect(mockToastError).toHaveBeenCalled();
  });

  it("should return empty array when server returns no holidays key", async () => {
    mockGetFunction.mockResolvedValue({});

    const { result } = renderHook(() => useHolidays(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.holidays).toEqual([]);
  });

  it("should use cache on second mount", async () => {
    const mockHolidays = [{ date: "2026-01-01T00:00:00", name: "New Year" }];
    mockGetFunction.mockResolvedValue({ holidays: mockHolidays });

    const { result: result1 } = renderHook(() => useHolidays(true));
    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
    });

    mockGetFunction.mockClear();
    const { result: result2 } = renderHook(() => useHolidays(true));
    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(result2.current.holidays).toEqual(mockHolidays);
    expect(mockGetFunction).not.toHaveBeenCalled();
  });
});
