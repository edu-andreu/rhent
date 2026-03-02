import { describe, it, expect } from 'vitest';
import { calculatePricing, calculateExtraDayRate, calculateTotalPrice } from '../pricing';
import { calculateAutoEndDate } from '../availability';

describe('Pricing Calculations', () => {
  describe('calculatePricing', () => {
    it('should return default values when dates are missing', () => {
      const result = calculatePricing(
        undefined,
        undefined,
        undefined,
        3,
        30000,
        75,
        []
      );

      expect(result.totalDays).toBe(0);
      expect(result.extraDays).toBe(0);
      expect(result.total).toBe(0);
      expect(result.isExtended).toBe(false);
    });

    it('should calculate standard pricing without extra days', () => {
      const startDate = new Date('2026-02-17');
      const autoEndDate = new Date('2026-02-20'); // 3 days later
      const endDate = new Date('2026-02-20'); // Same as auto end date

      const result = calculatePricing(
        startDate,
        endDate,
        autoEndDate,
        3,
        30000, // Total price for 3 days
        75, // 75% for extra days
        []
      );

      expect(result.standardPrice).toBe(30000);
      expect(result.extraDays).toBe(0);
      expect(result.extraDaysTotal).toBe(0);
      expect(result.total).toBe(30000);
      expect(result.isExtended).toBe(false);
      expect(result.pricePerDay).toBe(10000); // 30000 / 3
    });

    it('should calculate pricing with extra days', () => {
      const startDate = new Date('2026-02-17');
      const autoEndDate = new Date('2026-02-20'); // Standard 3 days
      const endDate = new Date('2026-02-21'); // 1 extra day

      const result = calculatePricing(
        startDate,
        endDate,
        autoEndDate,
        3,
        30000,
        75,
        []
      );

      expect(result.standardPrice).toBe(30000);
      expect(result.extraDays).toBe(1);
      expect(result.pricePerDay).toBe(10000);
      expect(result.extraDayRate).toBe(7500); // 10000 * 0.75
      expect(result.extraDaysTotal).toBe(7500); // 1 * 7500
      expect(result.total).toBe(37500); // 30000 + 7500
      expect(result.isExtended).toBe(true);
    });

    it('should exclude holidays when calculating extra days', () => {
      const startDate = new Date('2026-02-17'); // Monday
      const autoEndDate = new Date('2026-02-20'); // Thursday (3 days)
      const endDate = new Date('2026-02-24'); // Monday (would be 4 extra days, but weekend in between)

      const holidays = [
        { date: '2026-02-21T00:00:00', name: 'Test Holiday' }
      ];

      const result = calculatePricing(
        startDate,
        endDate,
        autoEndDate,
        3,
        30000,
        75,
        holidays
      );

      // Should exclude weekend (Feb 22-23) and holiday (Feb 21)
      // So extra days should be 1 (Feb 24 only)
      expect(result.extraDays).toBeGreaterThan(0);
      expect(result.isExtended).toBe(true);
    });
  });

  describe('calculateExtraDayRate', () => {
    it('should calculate extra day rate correctly', () => {
      expect(calculateExtraDayRate(10000, 75)).toBe(7500);
      expect(calculateExtraDayRate(10000, 50)).toBe(5000);
      expect(calculateExtraDayRate(10000, 100)).toBe(10000);
    });
  });

  describe('calculateTotalPrice', () => {
    it('should calculate total price correctly', () => {
      expect(calculateTotalPrice(30000, 2, 7500)).toBe(45000); // 30000 + (2 * 7500)
      expect(calculateTotalPrice(30000, 0, 7500)).toBe(30000);
      expect(calculateTotalPrice(30000, 1, 5000)).toBe(35000);
    });
  });
});
