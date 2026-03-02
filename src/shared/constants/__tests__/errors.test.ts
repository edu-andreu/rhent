import { describe, it, expect } from "vitest";
import { ERROR_PATTERNS, ERROR_MESSAGES } from "../errors";

describe("constants/errors", () => {
  describe("ERROR_PATTERNS", () => {
    it("should have FETCH_FAILED pattern", () => {
      expect(ERROR_PATTERNS.FETCH_FAILED).toBe("Failed to fetch");
    });

    it("should have DRAWER_ERROR regex", () => {
      expect(ERROR_PATTERNS.DRAWER_ERROR).toBeInstanceOf(RegExp);
      expect("cash drawer error".match(ERROR_PATTERNS.DRAWER_ERROR)).toBeTruthy();
      expect("Cash drawer required".match(ERROR_PATTERNS.DRAWER_ERROR)).toBeTruthy();
      expect("drawer is open for today".match(ERROR_PATTERNS.DRAWER_ERROR)).toBeTruthy();
      expect("other error".match(ERROR_PATTERNS.DRAWER_ERROR)).toBeFalsy();
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("should have CONNECTION_FAILED", () => {
      expect(ERROR_MESSAGES.CONNECTION_FAILED).toContain("Unable to connect");
    });

    it("should have REQUEST_FAILED", () => {
      expect(ERROR_MESSAGES.REQUEST_FAILED).toBe("Request failed");
    });

    it("should have CHECKOUT_FAILED", () => {
      expect(ERROR_MESSAGES.CHECKOUT_FAILED).toContain("Checkout failed");
    });

    it("should have CUSTOMER_REQUIRED", () => {
      expect(ERROR_MESSAGES.CUSTOMER_REQUIRED).toContain("Customer");
    });

    it("should have FAILED_TO_PROCESS_RETURN", () => {
      expect(ERROR_MESSAGES.FAILED_TO_PROCESS_RETURN).toContain("return");
    });

    it("should have BOOKING_CONFLICT", () => {
      expect(ERROR_MESSAGES.BOOKING_CONFLICT).toContain("already booked");
    });
  });
});
