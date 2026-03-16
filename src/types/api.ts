/**
 * API response types for backend endpoints
 * These types represent the raw data structure returned from the Supabase Edge Functions
 */

export interface ApiCustomer {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  comments?: string;
  created_at: string;
  status?: string;
  credit_balance?: string | number;
}

export interface ApiCustomerResponse {
  customers: ApiCustomer[];
}

export interface ApiRental {
  id: string;
  dressId: string;
  dressName: string;
  dressImage: string;
  startDate: string;
  endDate: string;
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
  alteration_notes?: string;
}

export interface ApiRentalResponse {
  rentals: ApiRental[];
}

export interface ApiReservation {
  id: string;
  dressId: string;
  dressName: string;
  dressImage: string;
  dressSize: string;
  dressColors: string[];
  dressPricePerDay: number;
  reservationDate: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  rentalId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  customerName?: string;
  sku?: string;
  category?: string;
  type?: string;
  brand?: string;
  description?: string;
  alteration_notes?: string;
  isOverdue?: boolean;
}

export interface ApiReservationResponse {
  reservations: ApiReservation[];
}

export interface ApiConfiguration {
  rentalDays?: string | number;
  extraDaysPrice?: string | number;
  rentDownPayment?: string | number;
  reservationDownPayment?: string | number;
  blockPrevDays?: string | number;
  blockNextDays?: string | number;
}

export interface ApiConfigurationResponse {
  config: ApiConfiguration;
}

export interface ApiReservedPeriod {
  start_date: string;
  end_date: string;
  effective_end_date?: string;
  rental_item_id?: string;
}

export interface ApiReservedDate {
  day: string;
  rental_item_id?: string;
}

export interface ApiPeriodsData {
  blockPrevDays?: number;
  blockNextDays?: number;
}

export interface ApiAvailabilityResponse {
  reservedDates: ApiReservedDate[];
}

export interface ApiReservedPeriodsResponse {
  reservedPeriods: ApiReservedPeriod[];
  blockPrevDays?: number;
  blockNextDays?: number;
}

// Generic API response types for dynamic endpoints
export interface ApiNameResponse {
  suggestedName?: string;
  isUnique?: boolean;
}

export interface ApiItemDataResponse {
  itemData?: {
    category_id?: string;
    subcategory_id?: string;
    brand_id?: string;
    price?: number;
    image_url?: string;
    description?: string;
  };
}

export interface ApiItemDetailsResponse {
  item: unknown; // ItemDetails type varies, using unknown for safety
}

export interface ApiListResponse<T = unknown> {
  [key: string]: T[] | unknown;
}

export interface ApiListItemResponse {
  id: string;
  [key: string]: unknown;
}
