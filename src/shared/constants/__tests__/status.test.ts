import { describe, it, expect } from "vitest";
import {
  RENTAL_STATUS,
  RENTAL_ITEM_STATUS,
  RESERVATION_STATUS,
  CUSTOMER_STATUS,
  ITEM_STATUS,
  DRAWER_STATUS,
} from "../status";

describe("constants/status", () => {
  describe("RENTAL_STATUS", () => {
    it("should have expected values", () => {
      expect(RENTAL_STATUS.OPEN).toBe("open");
      expect(RENTAL_STATUS.CLOSED).toBe("closed");
      expect(RENTAL_STATUS.CANCELLED).toBe("cancelled");
    });
  });

  describe("RENTAL_ITEM_STATUS", () => {
    it("should have expected values", () => {
      expect(RENTAL_ITEM_STATUS.RESERVED).toBe("reserved");
      expect(RENTAL_ITEM_STATUS.CHECKED_OUT).toBe("checked_out");
      expect(RENTAL_ITEM_STATUS.RETURNED).toBe("returned");
      expect(RENTAL_ITEM_STATUS.CANCELLED).toBe("cancelled");
      expect(RENTAL_ITEM_STATUS.NO_SHOW).toBe("no_show");
      expect(RENTAL_ITEM_STATUS.LOST).toBe("lost");
      expect(RENTAL_ITEM_STATUS.DAMAGED).toBe("damaged");
      expect(RENTAL_ITEM_STATUS.COMPLETED).toBe("completed");
    });
  });

  describe("RESERVATION_STATUS", () => {
    it("should have expected values", () => {
      expect(RESERVATION_STATUS.PENDING).toBe("pending");
      expect(RESERVATION_STATUS.CONFIRMED).toBe("confirmed");
      expect(RESERVATION_STATUS.CANCELLED).toBe("cancelled");
    });
  });

  describe("CUSTOMER_STATUS", () => {
    it("should have expected values", () => {
      expect(CUSTOMER_STATUS.ACTIVE).toBe("active");
      expect(CUSTOMER_STATUS.INACTIVE).toBe("inactive");
    });
  });

  describe("ITEM_STATUS", () => {
    it("should have expected values", () => {
      expect(ITEM_STATUS.ON).toBe("On");
      expect(ITEM_STATUS.OFF).toBe("Off");
    });
  });

  describe("DRAWER_STATUS", () => {
    it("should have expected values", () => {
      expect(DRAWER_STATUS.OPEN).toBe("open");
      expect(DRAWER_STATUS.CLOSED).toBe("closed");
    });
  });
});
