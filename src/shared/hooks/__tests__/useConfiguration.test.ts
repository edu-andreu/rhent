import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfiguration, clearConfigurationCache } from "../useConfiguration";

const mockGetFunction = vi.fn();
const mockToastWarning = vi.fn();
vi.mock("../../api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
}));
vi.mock("sonner@2.0.3", () => ({
  toast: { warning: (msg: string) => mockToastWarning(msg) },
}));

describe("useConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfigurationCache();
  });

  it("should start with loading true and default config", () => {
    mockGetFunction.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useConfiguration(true));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(false);
    expect(result.current.config.rentalDays).toBe(3);
    expect(result.current.config.extraDaysPrice).toBe(75);
  });

  it("should set loading false and not fetch when enabled is false", async () => {
    const { result } = renderHook(() => useConfiguration(false));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockGetFunction).not.toHaveBeenCalled();
    expect(result.current.config.rentalDays).toBe(3);
  });

  it("should set config on successful fetch", async () => {
    mockGetFunction.mockResolvedValue({
      config: {
        rentalDays: 5,
        extraDaysPrice: 100,
        rentDownPct: 40,
        reservationDownPct: 25,
        blockPrevDays: 3,
        blockNextDays: 2,
      },
    });

    const { result } = renderHook(() => useConfiguration(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe(false);
    expect(result.current.config.rentalDays).toBe(5);
    expect(result.current.config.extraDaysPrice).toBe(100);
    expect(result.current.config.blockPrevDays).toBe(3);
    expect(mockGetFunction).toHaveBeenCalledWith("get-configuration");
  });

  it("should use default config when fetch fails (inner catch returns defaults)", async () => {
    mockGetFunction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useConfiguration(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.config.rentalDays).toBe(3);
    expect(result.current.config.extraDaysPrice).toBe(75);
  });

  it("should fallback to defaults for invalid server values", async () => {
    mockGetFunction.mockResolvedValue({
      config: {
        rentalDays: "invalid",
        extraDaysPrice: -1,
      },
    });

    const { result } = renderHook(() => useConfiguration(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.config.rentalDays).toBe(3);
    expect(result.current.config.extraDaysPrice).toBe(75);
  });

  it("should use cache on second mount", async () => {
    mockGetFunction.mockResolvedValue({
      config: { rentalDays: 7, extraDaysPrice: 50 },
    });

    const { result: result1 } = renderHook(() => useConfiguration(true));
    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
    });

    mockGetFunction.mockClear();
    const { result: result2 } = renderHook(() => useConfiguration(true));
    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(result2.current.config.rentalDays).toBe(7);
    expect(mockGetFunction).not.toHaveBeenCalled();
  });
});
