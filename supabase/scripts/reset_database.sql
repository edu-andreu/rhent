-- ============================================================================
-- Rhent Database - Complete Reset Query (UPDATED)
-- ============================================================================
-- This script resets all transactional data to zero while preserving:
-- - Catalog tables (category, subcategory, brand, name, color, size, location)
-- - Configuration (kv_store_918f1e54)
-- - Payment methods (payments_methods)
-- - Customer records (only resets credit_balance to 0)
-- - Inventory items (only resets location and stock)
-- ============================================================================
-- ⚠️ WARNING: This will DELETE all rental, payment, drawer, and audit data!
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Remove Drawer System Data
-- ============================================================================

-- 1.1) Remove drawer audit log (existing entries)
DELETE FROM public.drawer_audit_log;

-- 1.2) Remove drawer transactions (triggers will create new audit entries for manual txns)
DELETE FROM public.drawer_transactions;

-- 1.3) Remove audit entries created by triggers in step 1.2
DELETE FROM public.drawer_audit_log;

-- 1.4) Remove daily drawer records
DELETE FROM public.daily_drawers;

-- ============================================================================
-- STEP 2: Remove Rental System Data (in dependency order)
-- ============================================================================

-- 2.1) Remove rental events (depends on rental_items)
DELETE FROM public.rental_events;

-- 2.2) Remove reminder items (depends on rental_items)
DELETE FROM public.reminder_items;

-- 2.3) Remove store credit ledger (depends on rental_items, rentals, customers)
DELETE FROM public.store_credit_ledger;

-- 2.4) Remove payments (depends on rental_items, rentals, payments_methods)
DELETE FROM public.payments;

-- 2.5) Remove rental_items (depends on rentals, inventory_items)
DELETE FROM public.rental_items;

-- 2.6) Remove rentals (depends on customers)
DELETE FROM public.rentals;

-- ============================================================================
-- STEP 3: Remove General Audit Log (audit_log)
-- ============================================================================
-- Clear the centralized audit_log table. Run after other deletes so any
-- trigger-written audit rows from steps 1–2 are removed as well.

DELETE FROM public.audit_log;

-- ============================================================================
-- STEP 4: Reset Customer Data
-- ============================================================================

-- 4.1) Reset customer credit balances to 0
UPDATE public.customers
SET credit_balance = 0
WHERE credit_balance IS DISTINCT FROM 0;

-- ============================================================================
-- STEP 5: Reset Inventory Items
-- ============================================================================

-- 5.1) Reset inventory items to default location
-- Default location ID: '2d1cd314-22b1-4616-b576-123f26299317'
UPDATE public.inventory_items
SET location_id = '2d1cd314-22b1-4616-b576-123f26299317'
WHERE location_id IS DISTINCT FROM '2d1cd314-22b1-4616-b576-123f26299317';

-- 5.2) Reset stock quantity for sale items to 1
UPDATE public.inventory_items
SET stock_quantity = 1
WHERE is_for_sale = TRUE
  AND stock_quantity IS DISTINCT FROM 1;

-- ============================================================================
-- VERIFICATION QUERIES (Uncomment to verify after commit)
-- ============================================================================

-- SELECT 'drawer_audit_log' as table_name, COUNT(*) as row_count FROM public.drawer_audit_log
-- UNION ALL
-- SELECT 'drawer_transactions', COUNT(*) FROM public.drawer_transactions
-- UNION ALL
-- SELECT 'daily_drawers', COUNT(*) FROM public.daily_drawers
-- UNION ALL
-- SELECT 'rental_events', COUNT(*) FROM public.rental_events
-- UNION ALL
-- SELECT 'reminder_items', COUNT(*) FROM public.reminder_items
-- UNION ALL
-- SELECT 'store_credit_ledger', COUNT(*) FROM public.store_credit_ledger
-- UNION ALL
-- SELECT 'payments', COUNT(*) FROM public.payments
-- UNION ALL
-- SELECT 'rental_items', COUNT(*) FROM public.rental_items
-- UNION ALL
-- SELECT 'rentals', COUNT(*) FROM public.rentals
-- UNION ALL
-- SELECT 'audit_log', COUNT(*) FROM public.audit_log
-- UNION ALL
-- SELECT 'customers_with_credit', COUNT(*) FROM public.customers WHERE credit_balance != 0
-- UNION ALL
-- SELECT 'items_not_at_default_location', COUNT(*) FROM public.inventory_items
--   WHERE location_id != '2d1cd314-22b1-4616-b576-123f26299317';

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Deletes: drawer_audit_log, drawer_transactions, daily_drawers,
--   rental_events, reminder_items, store_credit_ledger, payments,
--   rental_items, rentals, audit_log.
-- Resets: customer credit_balance to 0; inventory location and stock.
-- Preserves: catalog, kv_store, payment methods, customer rows.
-- ============================================================================
