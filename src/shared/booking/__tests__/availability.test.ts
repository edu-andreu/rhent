import { describe, it, expect } from 'vitest';
import { calculateAutoEndDate, calculateExtraDays, validateDateRange } from '../availability';
import { Holiday } from '../../utils/dateUtils';

describe('Availability Calculations', () => {
  describe('calculateAutoEndDate', () => {
    it('should calculate end date by adding rental days', () => {
      // Use local date to avoid timezone shifts (ISO string parses as UTC)
      const startDate = new Date(2026, 1, 17); // Monday Feb 17
      const rentalDays = 3;
      const holidays: Holiday[] = [];

      const { endDate } = calculateAutoEndDate(startDate, rentalDays, holidays);

      // Should be 3 days later (Thursday Feb 20)
      expect(endDate.getDate()).toBe(20);
      expect(endDate.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should skip weekends when calculating end date', () => {
      const startDate = new Date(2026, 1, 14); // Friday Feb 14
      const rentalDays = 3;
      const holidays: Holiday[] = [];

      const { endDate } = calculateAutoEndDate(startDate, rentalDays, holidays);

      // Should skip weekend (Feb 15-16) and land on Wednesday (Feb 19)
      expect(endDate.getDay()).not.toBe(0); // Not Sunday
      expect(endDate.getDay()).not.toBe(6); // Not Saturday
    });

    it('should skip holidays when calculating end date', () => {
      const startDate = new Date(2026, 1, 17); // Tuesday Feb 17
      const rentalDays = 3;
      const holidays: Holiday[] = [
        { date: '2026-02-20T00:00:00', name: 'Test Holiday' }
      ];

      const { endDate, holidaysInPeriod } = calculateAutoEndDate(startDate, rentalDays, holidays);

      // start+3 = Feb 20 (Fri, holiday) → push to Feb 21 (Sat) → Feb 22 (Sun) → Feb 23 (Mon)
      expect(endDate.getDate()).toBe(23);
      expect(holidaysInPeriod.length).toBe(1);
      expect(holidaysInPeriod[0].name).toBe('Test Holiday');
    });

    it('should handle multiple consecutive holidays', () => {
      const startDate = new Date(2026, 1, 17); // Monday Feb 17
      const rentalDays = 3;
      const holidays: Holiday[] = [
        { date: '2026-02-20T00:00:00', name: 'Holiday 1' },
        { date: '2026-02-21T00:00:00', name: 'Holiday 2' }
      ];

      const { endDate, holidaysInPeriod } = calculateAutoEndDate(startDate, rentalDays, holidays);

      // Should skip both holidays (Feb 20 & 21), land on Feb 22 or later
      expect(endDate.getDate()).toBeGreaterThan(21);
      expect(holidaysInPeriod.length).toBe(2);
    });
  });

  describe('calculateExtraDays', () => {
    it('should return 0 when end date is within standard period', () => {
      const startDate = new Date(2026, 1, 17);
      const endDate = new Date(2026, 1, 19);
      const standardDays = 3;
      const holidays: Holiday[] = [];

      const extraDays = calculateExtraDays(startDate, endDate, standardDays, holidays);

      expect(extraDays).toBe(0);
    });

    it('should calculate extra days correctly', () => {
      const startDate = new Date(2026, 1, 17); // Tuesday
      const endDate = new Date(2026, 1, 23); // Monday (countBusinessDays: days after start through end; 18,19,20,23 = 4 business days)
      const standardDays = 3;
      const holidays: Holiday[] = [];

      const extraDays = calculateExtraDays(startDate, endDate, standardDays, holidays);

      // 4 business days - 3 standard = 1 extra
      expect(extraDays).toBe(1);
    });

    it('should exclude weekends when calculating extra days', () => {
      const startDate = new Date(2026, 1, 17); // Monday
      const endDate = new Date(2026, 1, 24); // Next Monday
      const standardDays = 3;
      const holidays: Holiday[] = [];

      const extraDays = calculateExtraDays(startDate, endDate, standardDays, holidays);

      // Should exclude weekend days
      expect(extraDays).toBeGreaterThan(0);
      expect(extraDays).toBeLessThan(7); // Less than calendar days
    });
  });
});
