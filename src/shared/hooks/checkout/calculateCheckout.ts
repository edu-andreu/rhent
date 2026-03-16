export interface CheckoutLineItem {
  id: string;
  basePrice: number;
  extraDays: number;
  extraDayRate: number;
  extraDaysAmount: number;
  cancellationFeeAmount?: number;
  lateDays: number;
  lateDayRate: number;
  lateFeeAmount: number;
}

export interface CheckoutDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
}

export interface CheckoutCalculationInput {
  items: CheckoutLineItem[];
  discount: CheckoutDiscount | null;
  creditApplied: number;
  alreadyPaid: number;
}

export interface CheckoutLineItemResult extends CheckoutLineItem {
  itemSubtotal: number;
  discountAmount: number;
  itemTotal: number;
}

export interface CheckoutCalculationResult {
  items: CheckoutLineItemResult[];
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  creditApplied: number;
  grandTotal: number;
  alreadyPaid: number;
  balanceDue: number;
  surplus: number;
}

export function calculateCheckout(input: CheckoutCalculationInput): CheckoutCalculationResult {
  const { items, discount, creditApplied, alreadyPaid } = input;

  const enrichedItems = items.map(item => {
    const cancellationFeeAmount = item.cancellationFeeAmount || 0;
    return {
      ...item,
      cancellationFeeAmount,
      itemSubtotal: item.basePrice + item.extraDaysAmount + cancellationFeeAmount + item.lateFeeAmount,
    };
  });

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.itemSubtotal, 0);

  let discountAmount = 0;
  if (discount && discount.value > 0 && subtotal > 0) {
    discountAmount = discount.type === 'percentage'
      ? Math.round(subtotal * discount.value / 100)
      : Math.min(discount.value, subtotal);
  }

  let distributedDiscount = 0;
  const itemsWithDiscount: CheckoutLineItemResult[] = enrichedItems.map((item, index) => {
    let itemDiscount = 0;
    if (subtotal > 0 && discountAmount > 0) {
      if (index === enrichedItems.length - 1) {
        itemDiscount = discountAmount - distributedDiscount;
      } else {
        itemDiscount = Math.round(discountAmount * (item.itemSubtotal / subtotal));
        distributedDiscount += itemDiscount;
      }
    }
    return {
      ...item,
      discountAmount: itemDiscount,
      itemTotal: Math.max(0, item.itemSubtotal - itemDiscount),
    };
  });

  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const grandTotal = Math.max(0, totalAfterDiscount - creditApplied);
  const balanceDue = Math.max(0, grandTotal - alreadyPaid);
  const surplus = Math.max(0, alreadyPaid - grandTotal);

  return {
    items: itemsWithDiscount,
    subtotal,
    discountAmount,
    totalAfterDiscount,
    creditApplied,
    grandTotal,
    alreadyPaid,
    balanceDue,
    surplus,
  };
}
