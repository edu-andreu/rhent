const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats a number as Argentine Peso (ARS) currency.
 * Uses es-AR locale formatting with no decimal places.
 * 
 * @param amount - The numeric amount to format
 * @returns Formatted currency string (e.g., "$1.234" for 1234)
 */
export const formatCurrencyARS = (amount: number): string => arsFormatter.format(amount);
