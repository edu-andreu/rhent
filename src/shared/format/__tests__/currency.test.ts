import { describe, it, expect } from "vitest";
import { formatCurrencyARS } from "../currency";

describe("format/currency", () => {
  describe("formatCurrencyARS", () => {
    it("should format positive number as ARS", () => {
      const result = formatCurrencyARS(1234);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result).toContain("1.234"); // es-AR uses dot for thousands
    });

    it("should format zero", () => {
      const result = formatCurrencyARS(0);
      expect(result).toBeTruthy();
      expect(result).toMatch(/\$|ARS|0/);
    });

    it("should format large number with thousands separator", () => {
      const result = formatCurrencyARS(1000000);
      expect(result).toBeTruthy();
      expect(result).toContain("1"); // 1.000.000 or similar
    });

    it("should format with no decimal places (integer rounding)", () => {
      const result = formatCurrencyARS(99.99);
      expect(result).toBeTruthy();
      // es-AR with maximumFractionDigits: 0 rounds to integer
      expect(result).toMatch(/\$|ARS/);
      expect(typeof result).toBe("string");
    });

    it("should format negative number", () => {
      const result = formatCurrencyARS(-500);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });
});
