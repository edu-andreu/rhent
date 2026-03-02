/**
 * Status constants for consistent status values across the application
 */

export const RENTAL_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export const RENTAL_ITEM_STATUS = {
  RESERVED: 'reserved',
  CHECKED_OUT: 'checked_out',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  LOST: 'lost',
  DAMAGED: 'damaged',
  COMPLETED: 'completed',
} as const;

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;

export const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const ITEM_STATUS = {
  ON: 'On',
  OFF: 'Off',
} as const;

export const DRAWER_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
} as const;

export type RentalStatus = typeof RENTAL_STATUS[keyof typeof RENTAL_STATUS];
export type RentalItemStatus = typeof RENTAL_ITEM_STATUS[keyof typeof RENTAL_ITEM_STATUS];
export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS];
export type CustomerStatus = typeof CUSTOMER_STATUS[keyof typeof CUSTOMER_STATUS];
export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS];
export type DrawerStatus = typeof DRAWER_STATUS[keyof typeof DRAWER_STATUS];
