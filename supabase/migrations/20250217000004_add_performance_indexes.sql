-- name: performance_indexes
-- Migration: Add performance indexes for common queries
-- These indexes will improve query performance for:
-- - Availability checks (rental_items date ranges)
-- - Inventory lookups (SKU searches)
-- - Customer queries
-- - Payment lookups
--
-- Reference: CODE_REVIEW.md section 4.5

-- ============================================
-- RENTAL_ITEMS INDEXES (Critical for availability queries)
-- ============================================

-- Composite index for date range queries (most common availability check)
-- This supports queries like: WHERE start_date <= ? AND end_date >= ?
CREATE INDEX IF NOT EXISTS idx_rental_items_dates 
  ON public.rental_items(start_date, end_date);

-- Index for status filtering (active rentals/reservations)
-- Partial index only includes active items (most common query)
CREATE INDEX IF NOT EXISTS idx_rental_items_status_active 
  ON public.rental_items(status) 
  WHERE status IN ('reserved', 'checked_out');

-- Index for rental_id lookups (when fetching all items for a rental)
CREATE INDEX IF NOT EXISTS idx_rental_items_rental_id 
  ON public.rental_items(rental_id);

-- Index for item_id lookups (availability checks for specific items)
CREATE INDEX IF NOT EXISTS idx_rental_items_item_id 
  ON public.rental_items(item_id);

-- ============================================
-- INVENTORY_ITEMS INDEXES (Critical for catalog queries)
-- ============================================

-- Index for SKU lookups (very common in catalog operations)
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku 
  ON public.inventory_items(sku) 
  WHERE sku IS NOT NULL;

-- Index for status filtering (active items only)
CREATE INDEX IF NOT EXISTS idx_inventory_items_status_active 
  ON public.inventory_items(status) 
  WHERE status = 'On';

-- Index for category lookups (filtering by category)
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id 
  ON public.inventory_items(category_id) 
  WHERE category_id IS NOT NULL;

-- Index for brand lookups (filtering by brand)
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_id 
  ON public.inventory_items(brand_id) 
  WHERE brand_id IS NOT NULL;

-- Index for location lookups (filtering by location/status)
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_id 
  ON public.inventory_items(location_id) 
  WHERE location_id IS NOT NULL;

-- ============================================
-- CUSTOMERS INDEXES
-- ============================================

-- Index for customer_id lookups (primary key, but explicit index helps with joins)
CREATE INDEX IF NOT EXISTS idx_customers_customer_id 
  ON public.customers(customer_id);

-- Index for status filtering (active customers)
CREATE INDEX IF NOT EXISTS idx_customers_status_active 
  ON public.customers(status) 
  WHERE status = 'active';

-- ============================================
-- PAYMENTS INDEXES
-- ============================================

-- Index for rental_id lookups (fetching payments for a rental)
CREATE INDEX IF NOT EXISTS idx_payments_rental_id 
  ON public.payments(rental_id);

-- Index for payment method lookups
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id 
  ON public.payments(payment_method_id) 
  WHERE payment_method_id IS NOT NULL;

-- Index for date-based queries (reports, history)
CREATE INDEX IF NOT EXISTS idx_payments_paid_at 
  ON public.payments(paid_at DESC);

-- ============================================
-- RENTALS INDEXES
-- ============================================

-- Index for customer_id lookups (fetching rentals for a customer)
CREATE INDEX IF NOT EXISTS idx_rentals_customer_id 
  ON public.rentals(customer_id);

-- Index for status filtering (active rentals)
CREATE INDEX IF NOT EXISTS idx_rentals_status_active 
  ON public.rentals(status) 
  WHERE status = 'open';

-- Index for date-based queries (recent rentals)
CREATE INDEX IF NOT EXISTS idx_rentals_created_at 
  ON public.rentals(created_at DESC);

-- ============================================
-- DAILY_DRAWERS INDEXES
-- ============================================

-- Index for business_date lookups (finding drawer for a date)
CREATE INDEX IF NOT EXISTS idx_daily_drawers_business_date 
  ON public.daily_drawers(business_date DESC);

-- Index for status filtering (open drawers)
CREATE INDEX IF NOT EXISTS idx_daily_drawers_status_open 
  ON public.daily_drawers(status) 
  WHERE status = 'open';

-- ============================================
-- DRAWER_TRANSACTIONS INDEXES
-- ============================================

-- Index for drawer_id lookups (fetching transactions for a drawer)
CREATE INDEX IF NOT EXISTS idx_drawer_transactions_drawer_id 
  ON public.drawer_transactions(drawer_id);

-- Index for date-based queries (transaction history)
CREATE INDEX IF NOT EXISTS idx_drawer_transactions_created_at 
  ON public.drawer_transactions(created_at DESC);

-- ============================================
-- NOTES
-- ============================================
-- 
-- Partial indexes (WHERE clauses) are used for:
-- - Status filters (only index active/on items)
-- - Non-null filters (only index items with values)
-- 
-- These are more efficient than full indexes when:
-- - Most queries filter by these conditions
-- - The filtered subset is smaller than the full table
-- 
-- DESC ordering on date indexes helps with:
-- - "Most recent" queries (common pattern)
-- - Time-series data retrieval
--
-- To verify indexes were created:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
