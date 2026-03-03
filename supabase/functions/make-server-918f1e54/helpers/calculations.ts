export interface Holiday {
  date: string;
  name: string;
  type?: string;
}

/**
 * Calculate the auto-calculated end date for a rental period.
 * Accounts for weekends and holidays by pushing the return date forward.
 */
export function calculateAutoEndDate(startDate: Date, rentalDays: number, holidays: Holiday[]): Date {
  let returnDate = new Date(startDate);
  returnDate.setHours(0, 0, 0, 0);

  returnDate.setDate(returnDate.getDate() + rentalDays);

  let adjusted = true;
  while (adjusted) {
    adjusted = false;
    const dayOfWeek = returnDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const returnDateStr = returnDate.toISOString().split('T')[0];
    const isHoliday = holidays.some(h => {
      const holidayDateStr = h.date.split('T')[0];
      return holidayDateStr === returnDateStr;
    });
    if (isWeekend || isHoliday) {
      returnDate.setDate(returnDate.getDate() + 1);
      adjusted = true;
    }
  }

  return returnDate;
}

/**
 * Count business days between two dates (fromDate EXCLUSIVE, toDate INCLUSIVE).
 * Excludes weekends and holidays.
 */
export function countBusinessDays(fromDate: Date, toDate: Date, holidays: Holiday[]): number {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(0, 0, 0, 0);

  if (to <= from) return 0;

  let count = 0;
  const current = new Date(from);
  current.setDate(current.getDate() + 1);

  while (current <= to) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = current.toISOString().split('T')[0];
    const isHoliday = holidays.some(h => h.date.split('T')[0] === dateStr);

    if (!isWeekend && !isHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calculate extra days for a given rental period.
 * Extra days = business days between auto-calculated end date and actual end date.
 */
export function calculateExtraDays(startDate: Date, endDate: Date, rentalDays: number, holidays: Holiday[]): number {
  const autoEndDate = calculateAutoEndDate(startDate, rentalDays, holidays);
  if (endDate > autoEndDate) {
    return countBusinessDays(autoEndDate, endDate, holidays);
  }
  return 0;
}

/**
 * Fetch holidays from the external API.
 * Returns empty array on failure (non-blocking).
 */
export async function fetchHolidaysFromAPI(): Promise<Holiday[]> {
  try {
    const response = await fetch(
      'https://www.i-pyxis.com/api/holidays?token=30d7d6c2eaafe598c553aa6b44f26c07'
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => {
      const fecha = item.Fecha || item.fecha;
      if (!fecha) return null;
      const parts = fecha.split('/');
      if (parts.length !== 3) return null;
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return { date: `${year}-${month}-${day}`, name: `Holiday ${fecha}` };
    }).filter((h: any) => h !== null) as Holiday[];
  } catch {
    return [];
  }
}

/** Get current date string in GMT-3 (Argentina timezone) */
export function getGMT3DateString(): string {
  const nowUTC = new Date();
  const nowGMT3 = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
  const todayGMT3Date = new Date(nowGMT3.getFullYear(), nowGMT3.getMonth(), nowGMT3.getDate());
  return todayGMT3Date.toISOString().split('T')[0];
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
