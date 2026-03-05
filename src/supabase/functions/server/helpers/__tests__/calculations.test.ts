import {
  calculateAutoEndDate,
  countBusinessDays,
  calculateExtraDays,
  getGMT3DateString,
  isWeekend,
  type Holiday,
} from "../calculations.ts";

function d(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

const NO_HOLIDAYS: Holiday[] = [];

describe("isWeekend", () => {
  it("returns true for Saturday", () => {
    expect(isWeekend(d("2026-03-07"))).toBe(true);
  });

  it("returns true for Sunday", () => {
    expect(isWeekend(d("2026-03-08"))).toBe(true);
  });

  it("returns false for weekdays", () => {
    expect(isWeekend(d("2026-03-04"))).toBe(false); // Wednesday
    expect(isWeekend(d("2026-03-06"))).toBe(false); // Friday
    expect(isWeekend(d("2026-03-09"))).toBe(false); // Monday
  });
});

describe("calculateAutoEndDate", () => {
  it("adds rental days and returns the date if it lands on a weekday", () => {
    // Wed Mar 4 + 3 days = Sat Mar 7 → push to Mon Mar 9
    const result = calculateAutoEndDate(d("2026-03-04"), 3, NO_HOLIDAYS);
    expect(result.toISOString().split("T")[0]).toBe("2026-03-09");
  });

  it("does not push when end date is a weekday", () => {
    // Mon Mar 2 + 2 days = Wed Mar 4
    const result = calculateAutoEndDate(d("2026-03-02"), 2, NO_HOLIDAYS);
    expect(result.toISOString().split("T")[0]).toBe("2026-03-04");
  });

  it("skips holidays", () => {
    const holidays: Holiday[] = [{ date: "2026-03-09", name: "Holiday" }];
    // Wed Mar 4 + 3 = Sat Mar 7 → Sun Mar 8 → Mon Mar 9 (holiday) → Tue Mar 10
    const result = calculateAutoEndDate(d("2026-03-04"), 3, holidays);
    expect(result.toISOString().split("T")[0]).toBe("2026-03-10");
  });

  it("skips consecutive holidays and weekends", () => {
    const holidays: Holiday[] = [
      { date: "2026-03-09", name: "H1" },
      { date: "2026-03-10", name: "H2" },
    ];
    // Wed Mar 4 + 3 = Sat Mar 7 → Sun 8 → Mon 9 (H) → Tue 10 (H) → Wed 11
    const result = calculateAutoEndDate(d("2026-03-04"), 3, holidays);
    expect(result.toISOString().split("T")[0]).toBe("2026-03-11");
  });

  it("handles 0 rental days", () => {
    const result = calculateAutoEndDate(d("2026-03-04"), 0, NO_HOLIDAYS);
    expect(result.toISOString().split("T")[0]).toBe("2026-03-04");
  });
});

describe("countBusinessDays", () => {
  it("counts weekdays between two dates (from exclusive, to inclusive)", () => {
    // Thu Mar 5 to Mon Mar 9: Fri 6 + Mon 9 = 2
    expect(countBusinessDays(d("2026-03-05"), d("2026-03-09"), NO_HOLIDAYS)).toBe(2);
  });

  it("returns 0 when toDate <= fromDate", () => {
    expect(countBusinessDays(d("2026-03-09"), d("2026-03-05"), NO_HOLIDAYS)).toBe(0);
    expect(countBusinessDays(d("2026-03-05"), d("2026-03-05"), NO_HOLIDAYS)).toBe(0);
  });

  it("excludes holidays", () => {
    const holidays: Holiday[] = [{ date: "2026-03-06", name: "Holiday" }];
    // Thu Mar 5 to Mon Mar 9: Fri 6 (holiday) + Mon 9 = 1
    expect(countBusinessDays(d("2026-03-05"), d("2026-03-09"), holidays)).toBe(1);
  });

  it("excludes weekends", () => {
    // Fri Mar 6 to Mon Mar 9: Sat 7 (weekend) + Sun 8 (weekend) + Mon 9 = 1
    expect(countBusinessDays(d("2026-03-06"), d("2026-03-09"), NO_HOLIDAYS)).toBe(1);
  });
});

describe("calculateExtraDays", () => {
  it("returns 0 when actual end date equals auto end date", () => {
    // Auto end for Wed Mar 4 + 2 days = Fri Mar 6
    expect(calculateExtraDays(d("2026-03-04"), d("2026-03-06"), 2, NO_HOLIDAYS)).toBe(0);
  });

  it("returns 0 when actual end date is before auto end date", () => {
    expect(calculateExtraDays(d("2026-03-04"), d("2026-03-05"), 2, NO_HOLIDAYS)).toBe(0);
  });

  it("counts business days beyond the auto end date", () => {
    // Auto end: Wed Mar 4 + 2 = Fri Mar 6
    // Actual end: Mon Mar 9
    // Extra = business days from Fri 6 to Mon 9 = Mon 9 = 1
    expect(calculateExtraDays(d("2026-03-04"), d("2026-03-09"), 2, NO_HOLIDAYS)).toBe(1);
  });
});

describe("getGMT3DateString", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = getGMT3DateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
