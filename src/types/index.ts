export interface Dress {
  id: string;
  name: string;
  sku?: string;
  description: string;
  size: string;
  colors: string[];
  pricePerDay: number;
  imageUrl: string;
  category: string;
  type?: string; // Type of dress (e.g., "Formal", "Casual", "Evening")
  brand?: string; // Brand name
  available: boolean;
  status?: string; // Location/status name (e.g., "Showroom", "Lavanderia")
  locationId?: string; // UUID of the location record
  statusBadgeClass?: string; // Bootstrap badge class from location.badge_class
  availabilityStatus?: string; // Availability status from location.availability_status
  rentalCount?: number; // Number of times this item has been rented (for popularity sorting)
  // Sale fields
  isForSale?: boolean;
  salePrice?: number | null;
  stockQuantity?: number;
  isStockTracked?: boolean;
  lowStockThreshold?: number;
  categoryType?: 'product' | 'service'; // Derived: 'service' if category is Extras, else 'product'
}

export interface Rental {
  id: string;
  dressId: string;
  dressName: string;
  dressImage: string;
  startDate: Date;
  endDate: Date;
  totalCost: number;
  status: 'active' | 'returned';
  rentalId?: string;
  customerId?: string;
  customerName?: string;
  sku?: string;
  category?: string;
  type?: string;
  brand?: string;
  size?: string;
  colors?: string[];
  description?: string;
  pricePerDay?: number;
  alteration_notes?: string; // Notes about alterations or adjustments needed for fit
}

export interface Reservation {
  id: string;
  dressId: string;
  dressName: string;
  dressImage: string;
  dressSize: string;
  dressColors: string[];
  dressPricePerDay: number;
  reservationDate: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  rentalId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  customerName?: string;
  sku?: string;
  category?: string;
  type?: string;
  brand?: string;
  description?: string;
  alteration_notes?: string; // Notes about alterations or adjustments needed for fit
  isOverdue?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'paypal';
  cardLast4?: string;
  cardBrand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
  holderName: string;
}

export interface Transaction {
  id: string;
  type: 'rental' | 'reservation' | 'refund' | 'late_fee' | 'sale';
  relatedId: string; // rental or reservation ID
  itemName: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethodId: string;
  paymentMethod: string; // Display name like "Visa •••• 4242"
  date: Date;
  description: string;
  category?: string;
  inventoryItemId?: string;
  itemImage?: string;
  lateDays?: number;
  lateFeeAmount?: number;
  discountAmount?: number;
  discountPercent?: number;
  extraDays?: number;
  extraDaysAmount?: number;
}

export interface CartItem {
  id: string;
  type: 'rental' | 'reservation' | 'sale';
  dress: Dress;
  startDate?: Date;
  endDate?: Date;
  reservationDate?: Date;
  amount: number;
  days?: number;
  extraDays?: number; // Number of extra days beyond standard rental period
  standardPrice?: number; // Base rental price
  extraDaysTotal?: number; // Total charge for extra days
  alterationNotes?: string; // Notes about alterations/adjustments needed
}

export interface CashTransaction {
  id: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  category: string;
  /** Name from drawer_transaction_categories (supplier) for display in Supplier column. */
  categoryName?: string;
  date: Date;
  /** Payment method label (e.g. "Efectivo", "Ualá") for display in Expenses/Money tabs. */
  paymentMethod?: string;
  /** When present, indicates origin: 'drawer' = drawer_transactions, 'expense' = expenses table. Used for delete. */
  source?: 'drawer' | 'expense';
}

export interface Customer {
  id: string;
  name: string;
  surname: string;
  cellPhone: string;
  email: string;
  comments: string;
  createdAt: Date;
  status?: string;
  creditBalance?: number;
}