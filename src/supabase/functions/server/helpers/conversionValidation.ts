export interface ConversionValidationParams {
  grandTotal: number;
  existingPayments: number;
  newPaymentsTotal: number;
  creditApplied: number;
  itemGrandTotal: number;
  existingItemPayments: number;
  isSaleItem: boolean;
  rentDownPct: number;
  surplusHandling?: { type: string; amount: number } | null;
}

export type ConversionValidationResult =
  | { valid: true; itemBalanceDue: number; additionalMinimum: number; itemDownPct: number }
  | { valid: false; error: string; itemDownPct?: number };

export function validateConversionPayments(
  params: ConversionValidationParams,
): ConversionValidationResult {
  const {
    newPaymentsTotal,
    creditApplied,
    itemGrandTotal,
    existingItemPayments,
    isSaleItem,
    rentDownPct,
    surplusHandling,
  } = params;

  const itemBalanceDue = Math.max(
    0,
    itemGrandTotal - existingItemPayments - creditApplied,
  );

  const itemDownPct = isSaleItem ? 100 : rentDownPct;
  const itemMinimumRequired = Math.round((itemGrandTotal * itemDownPct) / 100);
  const additionalMinimum = Math.max(
    0,
    itemMinimumRequired - existingItemPayments - creditApplied,
  );

  if (newPaymentsTotal > itemBalanceDue + 0.01) {
    return {
      valid: false,
      error:
        "Payment exceeds the balance due for this item. Overpayment is not allowed.",
      itemDownPct,
    };
  }

  if (newPaymentsTotal < additionalMinimum - 0.01) {
    return {
      valid: false,
      error:
        `Payment is below the minimum required for this item. Rental requires ${itemDownPct}% upfront.`,
      itemDownPct,
    };
  }

  return { valid: true, itemBalanceDue, additionalMinimum, itemDownPct };
}
