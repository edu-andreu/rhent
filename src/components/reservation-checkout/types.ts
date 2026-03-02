/**
 * Types for reservation checkout (convert reservation to rental).
 */

export interface DBPaymentMethod {
  id: string;
  payment_method: string;
  status: string;
  payment_user_enabled: number | null;
  payment_type: string;
}

export interface PaymentAllocation {
  methodId: string;
  amount: number;
}

export interface ReservationDetails {
  rentalItemId: string;
  rentalId: string;
  itemId: string;
  item: {
    name: string;
    sku: string;
    category: string;
    subcategory: string;
    brand: string;
    size: string;
    colors: string[];
    description: string;
    imageUrl: string;
    unitPrice: number;
    startDate: string;
    endDate: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  financials: {
    rentalSubtotal: number;
    extraDaysTotal: number;
    discountAmount: number;
    depositsTotal: number;
    grandTotal: number;
    paymentsTotal: number;
    balanceDue: number;
    itemCount: number;
    discountPercent: number;
    otherItemsTotal: number;
    otherItemsMinimum: number;
  };
  config: {
    rentDownPaymentPct: number;
    reservationDownPaymentPct: number;
  };
  extraDaysInfo?: {
    extraDaysCount: number;
    extraDaysAmount: number;
    extraDaysPricePct: number;
    rentalPeriodDays: number;
    basePrice: number;
  };
  orderItems: Array<{
    id: string;
    itemId: string;
    name: string;
    sku: string;
    size: string;
    unitPrice: number;
    extraDays: number;
    extraDaysAmount: number;
    discountAmount: number;
    status: string;
    startDate: string;
    endDate: string;
    deposit: number;
  }>;
}
