import { describe, it, expect } from "vitest";
import {
  DRAWER_ERROR_PATTERNS,
  isDrawerError,
  getDrawerErrorMessage,
} from "../drawerError";

describe("drawerError", () => {
  describe("DRAWER_ERROR_PATTERNS", () => {
    it("should export expected patterns", () => {
      expect(DRAWER_ERROR_PATTERNS).toContain("cash drawer");
      expect(DRAWER_ERROR_PATTERNS).toContain("Cash drawer");
      expect(DRAWER_ERROR_PATTERNS).toContain("drawer is open for");
      expect(DRAWER_ERROR_PATTERNS).toHaveLength(3);
    });
  });

  describe("isDrawerError", () => {
    it("should return true for string containing 'cash drawer'", () => {
      expect(isDrawerError("Please open the cash drawer first")).toBe(true);
      expect(isDrawerError("CASH DRAWER must be open")).toBe(true);
    });

    it("should return true for string containing 'Cash drawer'", () => {
      expect(isDrawerError("Cash drawer is required")).toBe(true);
    });

    it("should return true for string containing 'drawer is open for'", () => {
      expect(isDrawerError("The drawer is open for another session")).toBe(true);
    });

    it("should return true for Error with drawer message", () => {
      expect(isDrawerError(new Error("Please open the cash drawer"))).toBe(true);
    });

    it("should return false for non-drawer string", () => {
      expect(isDrawerError("Network error")).toBe(false);
      expect(isDrawerError("Failed to fetch")).toBe(false);
      expect(isDrawerError("")).toBe(false);
    });

    it("should return false for Error with non-drawer message", () => {
      expect(isDrawerError(new Error("Something went wrong"))).toBe(false);
    });

    it("should be case-insensitive for pattern matching", () => {
      expect(isDrawerError("CASH DRAWER required")).toBe(true);
      expect(isDrawerError("DRAWER IS OPEN FOR today")).toBe(true);
    });
  });

  describe("getDrawerErrorMessage", () => {
    it("should return undefined for null/undefined", () => {
      expect(getDrawerErrorMessage(null)).toBeUndefined();
      expect(getDrawerErrorMessage(undefined)).toBeUndefined();
    });

    it("should return message when Error is drawer-related", () => {
      const err = new Error("Please open the cash drawer");
      expect(getDrawerErrorMessage(err)).toBe("Please open the cash drawer");
    });

    it("should return undefined when Error is not drawer-related", () => {
      const err = new Error("Network timeout");
      expect(getDrawerErrorMessage(err)).toBeUndefined();
    });

    it("should handle string input (drawer error)", () => {
      expect(getDrawerErrorMessage("Cash drawer must be open")).toBe(
        "Cash drawer must be open"
      );
    });

    it("should handle string input (non-drawer)", () => {
      expect(getDrawerErrorMessage("Generic error")).toBeUndefined();
    });

    it("should handle object with error property (drawer error)", () => {
      expect(
        getDrawerErrorMessage({ error: "The drawer is open for another date" })
      ).toBe("The drawer is open for another date");
    });

    it("should handle object with error property (non-drawer)", () => {
      expect(getDrawerErrorMessage({ error: "Validation failed" })).toBeUndefined();
    });

    it("should handle other object types by stringifying", () => {
      // Number/other - String(123) = "123", not a drawer error
      expect(getDrawerErrorMessage(123)).toBeUndefined();
    });
  });
});
