interface ItemForAllocation {
  id: string;
  subtotal: number;
}

interface AllocationResult {
  rentalItemId: string;
  amount: number;
}

/**
 * Allocates a payment amount across rental items using a waterfall: fill each
 * item's subtotal in order until the payment is exhausted. Each item gets at
 * most its subtotal, so "already paid" per item reflects actual amount applied
 * to that item (clear per-item payment tracking for returns and reporting).
 *
 * The last item absorbs any rounding remainder so the sum of allocated amounts
 * always equals the original payment amount exactly.
 */
export function allocatePaymentToItems(
  paymentAmount: number,
  items: ItemForAllocation[],
): AllocationResult[] {
  if (items.length === 0) return [];

  if (items.length === 1) {
    const amount = Math.min(
      Math.round(paymentAmount * 100) / 100,
      Math.round(items[0].subtotal * 100) / 100
    );
    return [{ rentalItemId: items[0].id, amount }];
  }

  let remaining = Math.round(paymentAmount * 100) / 100;
  const results: AllocationResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemSubtotal = Math.round(item.subtotal * 100) / 100;

    if (i === items.length - 1) {
      // Last item gets the remainder so total allocated equals paymentAmount
      results.push({
        rentalItemId: item.id,
        amount: Math.round(remaining * 100) / 100,
      });
    } else {
      const amount = Math.min(remaining, itemSubtotal);
      const rounded = Math.round(amount * 100) / 100;
      remaining = Math.round((remaining - rounded) * 100) / 100;
      results.push({ rentalItemId: item.id, amount: rounded });
    }
  }

  return results;
}
