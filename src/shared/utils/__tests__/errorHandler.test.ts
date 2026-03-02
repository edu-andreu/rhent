import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleApiError, handleApiErrorWithDefault, handleComponentError } from "../errorHandler";

const mockToastError = vi.fn();
vi.mock("sonner@2.0.3", () => ({
  toast: { error: (msg: string) => mockToastError(msg) },
}));

const mockGetErrorMessage = vi.fn();
vi.mock("../../api/client", () => ({
  getErrorMessage: (err: unknown) => mockGetErrorMessage(err),
}));

vi.mock("../drawerError", () => ({
  getDrawerErrorMessage: (err: unknown) => {
    const msg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
    return /cash drawer|drawer is open for/i.test(msg) ? msg : undefined;
  },
}));

describe("errorHandler", () => {
  beforeEach(() => {
    mockToastError.mockClear();
    mockGetErrorMessage.mockReturnValue("Request failed");
  });

  describe("handleApiError", () => {
    it("should toast CONNECTION_FAILED when error string includes FETCH_FAILED", () => {
      handleApiError("Failed to fetch", "dresses");
      expect(mockToastError).toHaveBeenCalledWith(
        "Unable to connect to server. Please check if the Supabase Edge Function is deployed."
      );
      expect(mockGetErrorMessage).not.toHaveBeenCalled();
    });

    it("should toast generic message with getErrorMessage for other errors", () => {
      const err = new Error("Not found");
      mockGetErrorMessage.mockReturnValue("Not found");
      handleApiError(err, "customers");
      expect(mockToastError).toHaveBeenCalledWith("Failed to load customers: Not found");
      expect(mockGetErrorMessage).toHaveBeenCalledWith(err);
    });

    it("should use fallbackMessage when provided", () => {
      mockGetErrorMessage.mockReturnValue("Server error");
      handleApiError(new Error("x"), "items", "Could not load items");
      expect(mockToastError).toHaveBeenCalledWith("Could not load items: Server error");
    });
  });

  describe("handleApiErrorWithDefault", () => {
    it("should call handleApiError and return default value", () => {
      const defaultValue = { list: [] };
      const result = handleApiErrorWithDefault(new Error("x"), "dresses", defaultValue);
      expect(mockToastError).toHaveBeenCalled();
      expect(result).toBe(defaultValue);
    });
  });

  describe("handleComponentError", () => {
    it("should call onDrawerError and not toast when error is drawer error", () => {
      const onDrawerError = vi.fn();
      const err = new Error("Please open the cash drawer");
      const result = handleComponentError(err, "checkout", onDrawerError);
      expect(onDrawerError).toHaveBeenCalledWith("Please open the cash drawer");
      expect(mockToastError).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should call handleApiError when error is not drawer error", () => {
      const onDrawerError = vi.fn();
      handleComponentError(new Error("Network error"), "dresses", onDrawerError);
      expect(onDrawerError).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith("Failed to load dresses: Request failed");
    });

    it("should not call onDrawerError when undefined and drawer error", () => {
      handleComponentError(new Error("Cash drawer required"), "checkout");
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });
});
