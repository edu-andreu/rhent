/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Format a date string (YYYY-MM-DD) to a localized display string
 * CRITICAL: Parses date in local timezone to avoid timezone conversion issues
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - Locale code (default: 'es-AR')
 * @param options - Intl.DateTimeFormatOptions (default: { day: '2-digit', month: '2-digit', year: 'numeric' })
 * @returns Formatted date string
 */
export function formatDateDisplay(
  dateStr: string,
  locale: string = 'es-AR',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  if (!dateStr) return '';
  
  // Parse date string in local timezone (prevents UTC conversion issues)
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString(locale, options);
}

/**
 * Format a Date object to a localized display string
 * 
 * @param date - Date object
 * @param locale - Locale code (default: 'es-AR')
 * @param options - Intl.DateTimeFormatOptions (default: { day: '2-digit', month: '2-digit', year: 'numeric' })
 * @returns Formatted date string
 */
export function formatDateObject(
  date: Date,
  locale: string = 'es-AR',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  if (!date) return '';
  return date.toLocaleDateString(locale, options);
}

/**
 * Format a date string to short format (DD/MM, no year)
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - Locale code (default: 'es-AR')
 * @returns Formatted date string (e.g., "15/02")
 */
export function formatDateShort(dateStr: string, locale: string = 'es-AR'): string {
  return formatDateDisplay(dateStr, locale, { day: '2-digit', month: '2-digit' });
}

/**
 * Format a date string to full format with weekday
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - Locale code (default: 'es-AR')
 * @returns Formatted date string (e.g., "lunes, 15 de febrero de 2026")
 */
export function formatDateFull(dateStr: string, locale: string = 'es-AR'): string {
  return formatDateDisplay(dateStr, locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date string to short format with weekday
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - Locale code (default: 'es-AR')
 * @returns Formatted date string (e.g., "lun, 15 feb")
 */
export function formatDateShortWithWeekday(dateStr: string, locale: string = 'es-AR'): string {
  const formatted = formatDateDisplay(dateStr, locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  return formatted.replace(',', '');
}

/**
 * Format a date range (start - end)
 * 
 * @param startDateStr - Start date string in YYYY-MM-DD format
 * @param endDateStr - End date string in YYYY-MM-DD format
 * @param locale - Locale code (default: 'es-AR')
 * @returns Formatted date range string (e.g., "15/02 - 18/02/2026")
 */
export function formatDateRange(
  startDateStr: string,
  endDateStr: string,
  locale: string = 'es-AR'
): string {
  const start = formatDateShort(startDateStr, locale);
  const end = formatDateDisplay(endDateStr, locale);
  return `${start} - ${end}`;
}

/**
 * Format a Date object to short format (DD/MM, no year)
 * 
 * @param date - Date object
 * @param locale - Locale code (default: 'es-AR')
 * @returns Formatted date string (e.g., "15/02")
 */
export function formatDateObjectShort(date: Date, locale: string = 'es-AR'): string {
  return formatDateObject(date, locale, { day: '2-digit', month: '2-digit' });
}

/**
 * Format a Date object to full format with weekday
 * 
 * @param date - Date object
 * @param locale - Locale code (default: 'es-AR')
 * @returns Formatted date string (e.g., "lunes, 15 de febrero de 2026")
 */
export function formatDateObjectFull(date: Date, locale: string = 'es-AR'): string {
  return formatDateObject(date, locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
