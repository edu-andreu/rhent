interface ItemForAllocation {
  id: string;
  subtotal: number;
}

interface AllocationResult {
  rentalItemId: string;
  amount: number;
}

/**
 * Splits a payment amount proportionally across rental items based on each
 * item's subtotal relative to the order total.
 *
 * The last item absorbs any rounding remainder so the sum of allocated
 * amounts always equals the original payment amount exactly.
 */
export function allocatePaymentToItems(
  paymentAmount: number,
  items: ItemForAllocation[],
): AllocationResult[] {
  if (items.length === 0) return [];

  if (items.length === 1) {
    return [{ rentalItemId: items[0].id, amount: paymentAmount }];
  }

  const orderTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  if (orderTotal <= 0) {
    const equalShare = Math.round((paymentAmount / items.length) * 100) / 100;
    const results: AllocationResult[] = items.map((item, i) => ({
      rentalItemId: item.id,
      amount: i < items.length - 1 ? equalShare : paymentAmount - equalShare * (items.length - 1),
    }));
    return results;
  }

  let allocated = 0;
  const results: AllocationResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i === items.length - 1) {
      results.push({
        rentalItemId: item.id,
        amount: Math.round((paymentAmount - allocated) * 100) / 100,
      });
    } else {
      const itemAmount = Math.round((paymentAmount * (item.subtotal / orderTotal)) * 100) / 100;
      allocated += itemAmount;
      results.push({ rentalItemId: item.id, amount: itemAmount });
    }
  }

  return results;
}
