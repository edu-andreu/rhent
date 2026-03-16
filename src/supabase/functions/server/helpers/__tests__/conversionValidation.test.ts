import {
  validateConversionPayments,
  type ConversionValidationParams,
} from "../conversionValidation.ts";

const BASE_PARAMS: ConversionValidationParams = {
  grandTotal: 100000,
  existingPayments: 25000,
  newPaymentsTotal: 25000,
  creditApplied: 0,
  itemGrandTotal: 100000,
  existingItemPayments: 25000,
  isSaleItem: false,
  rentDownPct: 50,
  surplusHandling: null,
};

function validate(overrides: Partial<ConversionValidationParams>) {
  return validateConversionPayments({ ...BASE_PARAMS, ...overrides });
}

describe("validateConversionPayments", () => {
  describe("normal conversion", () => {
    it("accepts when payment meets minimum and does not overpay", () => {
      const result = validate({
        newPaymentsTotal: 25000,
      });
      expect(result.valid).toBe(true);
    });

    it("accepts when paying exact balance due", () => {
      const result = validate({
        newPaymentsTotal: 75000,
      });
      expect(result.valid).toBe(true);
    });

    it("accepts when paying exactly the minimum required", () => {
      // 50% of 100000 = 50000 minimum, already paid 25000, need 25000 more
      const result = validate({
        newPaymentsTotal: 25000,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("swap to cheaper item (the surplus bug)", () => {
    it("accepts when surplus handling is provided", () => {
      // Item swapped from 100k to 15k; customer already paid 25k
      const result = validate({
        grandTotal: 15000,
        existingPayments: 25000,
        newPaymentsTotal: 0,
        itemGrandTotal: 15000,
        existingItemPayments: 25000,
        surplusHandling: { type: "credit", amount: 10000 },
      });
      expect(result.valid).toBe(true);
    });

    it("accepts refund surplus handling too", () => {
      const result = validate({
        grandTotal: 15000,
        existingPayments: 25000,
        newPaymentsTotal: 0,
        itemGrandTotal: 15000,
        existingItemPayments: 25000,
        surplusHandling: { type: "refund", amount: 10000 },
      });
      expect(result.valid).toBe(true);
    });

    it("ignores order-level surplus when validating per-item payment only", () => {
      const result = validate({
        grandTotal: 15000,
        existingPayments: 25000,
        newPaymentsTotal: 0,
        itemGrandTotal: 15000,
        existingItemPayments: 25000,
        surplusHandling: null,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("per-item overpayment", () => {
    it("rejects when new payment exceeds item balance due", () => {
      // Balance due = max(0, 100000 - 25000 - 0) = 75000
      const result = validate({
        newPaymentsTotal: 75001,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("exceeds the balance due for this item");
      }
    });

    it("accepts at exactly the balance due (within tolerance)", () => {
      const result = validate({
        newPaymentsTotal: 75000,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects when item already fully paid and new payment is added", () => {
      const result = validate({
        existingItemPayments: 100000,
        newPaymentsTotal: 1,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("exceeds the balance due");
      }
    });
  });

  describe("underpayment (below minimum)", () => {
    it("rejects when payment is below minimum required", () => {
      // 50% of 100000 = 50000 minimum, already paid 25000, need 25000 more
      const result = validate({
        newPaymentsTotal: 24000,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("below the minimum required");
        expect(result.error).toContain("50%");
      }
    });

    it("accepts when payment is just at the minimum (within tolerance)", () => {
      const result = validate({
        newPaymentsTotal: 24999.995,
      });
      expect(result.valid).toBe(true);
    });

    it("accepts when existing payments already satisfy the minimum", () => {
      // Already paid 50000 which meets 50% minimum; additional 0 is fine
      const result = validate({
        existingItemPayments: 50000,
        newPaymentsTotal: 0,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("sale item (100% upfront)", () => {
    it("requires full payment for sale items", () => {
      // 100% of 10000 = 10000 minimum, already paid 0
      const result = validate({
        grandTotal: 10000,
        existingPayments: 0,
        itemGrandTotal: 10000,
        existingItemPayments: 0,
        isSaleItem: true,
        newPaymentsTotal: 5000,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("100%");
      }
    });

    it("accepts full payment for sale item", () => {
      const result = validate({
        grandTotal: 10000,
        existingPayments: 0,
        itemGrandTotal: 10000,
        existingItemPayments: 0,
        isSaleItem: true,
        newPaymentsTotal: 10000,
      });
      expect(result.valid).toBe(true);
    });

    it("accepts when sale item is already fully paid", () => {
      const result = validate({
        grandTotal: 10000,
        existingPayments: 10000,
        itemGrandTotal: 10000,
        existingItemPayments: 10000,
        isSaleItem: true,
        newPaymentsTotal: 0,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("credit applied", () => {
    it("credit reduces the balance due", () => {
      // Balance = 100000 - 25000 - 10000 = 65000
      const result = validate({
        creditApplied: 10000,
        newPaymentsTotal: 65000,
      });
      expect(result.valid).toBe(true);
    });

    it("credit reduces the additional minimum required", () => {
      // Minimum = 50000, already paid 25000, credit 10000 → need 15000 more
      const result = validate({
        creditApplied: 10000,
        newPaymentsTotal: 15000,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects when payment + credit exceeds item balance", () => {
      // Balance = 100000 - 25000 - 50000 = 25000; paying 26000 → over
      const result = validate({
        creditApplied: 50000,
        newPaymentsTotal: 26000,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("exceeds the balance due");
      }
    });

    it("credit alone can satisfy the minimum", () => {
      // Minimum = 50000, already paid 25000, credit 25000 → additional = 0
      const result = validate({
        creditApplied: 25000,
        newPaymentsTotal: 0,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles zero amounts everywhere", () => {
      const result = validate({
        grandTotal: 0,
        existingPayments: 0,
        newPaymentsTotal: 0,
        creditApplied: 0,
        itemGrandTotal: 0,
        existingItemPayments: 0,
      });
      expect(result.valid).toBe(true);
    });

    it("tolerates rounding within 0.01", () => {
      // Balance = 75000, paying 75000.005 — within tolerance
      const result = validate({
        newPaymentsTotal: 75000.005,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects overpayment just beyond tolerance", () => {
      // Balance = 75000, paying 75000.02 — beyond 0.01 tolerance
      const result = validate({
        newPaymentsTotal: 75000.02,
      });
      expect(result.valid).toBe(false);
    });

    it("returns computed values on success", () => {
      const result = validate({
        newPaymentsTotal: 25000,
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.itemBalanceDue).toBe(75000);
        expect(result.additionalMinimum).toBe(25000);
        expect(result.itemDownPct).toBe(50);
      }
    });
  });
});
