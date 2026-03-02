import { describe, it, expect } from "vitest";
import {
  formatDateDisplay,
  formatDateObject,
  formatDateShort,
  formatDateFull,
  formatDateShortWithWeekday,
  formatDateRange,
  formatDateObjectShort,
  formatDateObjectFull,
} from "../date";

describe("format/date", () => {
  const testDateStr = "2026-02-17";
  const testDate = new Date(2026, 1, 17); // Feb 17, 2026

  describe("formatDateDisplay", () => {
    it("should format YYYY-MM-DD string with default locale", () => {
      const result = formatDateDisplay(testDateStr);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      // es-AR typically formats as DD/MM/YYYY
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it("should return empty string for empty input", () => {
      expect(formatDateDisplay("")).toBe("");
    });

    it("should accept custom locale", () => {
      const result = formatDateDisplay(testDateStr, "en-US");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should accept custom options", () => {
      const result = formatDateDisplay(testDateStr, "es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    });
  });

  describe("formatDateObject", () => {
    it("should format Date object", () => {
      const result = formatDateObject(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should return empty string for falsy date", () => {
      expect(formatDateObject(null as unknown as Date)).toBe("");
    });
  });

  describe("formatDateShort", () => {
    it("should format without year", () => {
      const result = formatDateShort(testDateStr);
      expect(result).toBeTruthy();
      expect(result).toMatch(/\d{1,2}\/\d{1,2}/);
    });
  });

  describe("formatDateFull", () => {
    it("should format with weekday and long month", () => {
      const result = formatDateFull(testDateStr);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe("formatDateShortWithWeekday", () => {
    it("should return string without comma", () => {
      const result = formatDateShortWithWeekday(testDateStr);
      expect(result).toBeTruthy();
      expect(result).not.toContain(",");
    });
  });

  describe("formatDateRange", () => {
    it("should format start and end date as range", () => {
      const result = formatDateRange("2026-02-15", "2026-02-18");
      expect(result).toContain(" - ");
      const [start, end] = result.split(" - ");
      expect(start).toBeTruthy();
      expect(end).toBeTruthy();
    });
  });

  describe("formatDateObjectShort", () => {
    it("should format Date object without year", () => {
      const result = formatDateObjectShort(testDate);
      expect(result).toBeTruthy();
      expect(result).toMatch(/\d{1,2}\/\d{1,2}/);
    });
  });

  describe("formatDateObjectFull", () => {
    it("should format Date object with full format", () => {
      const result = formatDateObjectFull(testDate);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(10);
    });
  });
});
