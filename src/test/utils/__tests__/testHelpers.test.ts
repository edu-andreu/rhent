import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createTestDate,
  mockDate,
  waitFor,
  createMockDress,
  createMockCustomer,
  createMockConfig,
  createMockHolidays,
  createMockPaymentMethod,
} from "../testHelpers";

describe("testHelpers", () => {
  describe("createTestDate", () => {
    it("should create a date from YYYY-MM-DD string", () => {
      const date = createTestDate("2026-02-17");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(1); // February (0-indexed)
      expect(date.getDate()).toBe(17);
    });

    it("should set time to midnight", () => {
      const date = createTestDate("2026-02-17");
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });
  });

  describe("mockDate", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should mock the global Date object", () => {
      const restoreDate = mockDate("2026-02-17T10:00:00Z");
      const now = new Date();
      expect(now.getFullYear()).toBe(2026);
      expect(now.getMonth()).toBe(1);
      expect(now.getDate()).toBe(17);
      restoreDate();
    });
  });

  describe("waitFor", () => {
    it("should wait for specified milliseconds", async () => {
      const start = Date.now();
      await waitFor(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some margin
    });
  });

  describe("createMockDress", () => {
    it("should create a dress with default values", () => {
      const dress = createMockDress();
      expect(dress.id).toBe("dress-1");
      expect(dress.name).toBe("Test Dress");
      expect(dress.pricePerDay).toBe(10000);
      expect(dress.available).toBe(true);
    });

    it("should allow overriding default values", () => {
      const dress = createMockDress({
        name: "Custom Dress",
        pricePerDay: 20000,
      });
      expect(dress.name).toBe("Custom Dress");
      expect(dress.pricePerDay).toBe(20000);
      expect(dress.id).toBe("dress-1"); // Still uses default
    });
  });

  describe("createMockCustomer", () => {
    it("should create a customer with default values", () => {
      const customer = createMockCustomer();
      expect(customer.id).toBe("customer-1");
      expect(customer.name).toBe("Test Customer");
      expect(customer.email).toBe("test@example.com");
    });

    it("should allow overriding default values", () => {
      const customer = createMockCustomer({
        name: "John Doe",
        phone: "555-1234",
      });
      expect(customer.name).toBe("John Doe");
      expect(customer.phone).toBe("555-1234");
    });
  });

  describe("createMockConfig", () => {
    it("should create config with default values", () => {
      const config = createMockConfig();
      expect(config.rentalDays).toBe(3);
      expect(config.extraDaysPrice).toBe(30000);
      expect(config.rentDownPct).toBe(50);
    });

    it("should allow overriding default values", () => {
      const config = createMockConfig({
        rentalDays: 5,
        extraDaysPrice: 20000,
      });
      expect(config.rentalDays).toBe(5);
      expect(config.extraDaysPrice).toBe(20000);
      expect(config.rentDownPct).toBe(50); // Still uses default
    });
  });

  describe("createMockHolidays", () => {
    it("should create holidays array with proper format", () => {
      const holidays = createMockHolidays([
        { date: "2026-02-20", name: "Test Holiday" },
      ]);
      expect(holidays).toHaveLength(1);
      expect(holidays[0].date).toBe("2026-02-20T00:00:00");
      expect(holidays[0].name).toBe("Test Holiday");
    });
  });

  describe("createMockPaymentMethod", () => {
    it("should create payment method with default values", () => {
      const method = createMockPaymentMethod();
      expect(method.id).toBe("pm-1");
      expect(method.payment_method).toBe("Cash");
      expect(method.payment_type).toBe("cash");
      expect(method.payment_user_enabled).toBe(1);
    });

    it("should allow overriding default values", () => {
      const method = createMockPaymentMethod({
        payment_method: "Credit Card",
        payment_type: "card",
      });
      expect(method.payment_method).toBe("Credit Card");
      expect(method.payment_type).toBe("card");
    });
  });
});
