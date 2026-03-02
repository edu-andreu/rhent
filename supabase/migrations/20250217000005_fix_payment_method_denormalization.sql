-- name: payment_method_denormalization
-- Migration: Require payment_method_id and sync method from payments_methods.

-- Step 1: Create a function to automatically sync method from payment_method_id
CREATE OR REPLACE FUNCTION sync_payment_method_from_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_method_id is set, sync method from payments_methods table
  IF NEW.payment_method_id IS NOT NULL THEN
    SELECT payment_method INTO NEW.method
    FROM payments_methods
    WHERE id = NEW.payment_method_id;
    
    -- If payment method not found, keep existing method or set to NULL
    IF NOT FOUND THEN
      -- If this is an UPDATE and method wasn't changed, keep old value
      IF TG_OP = 'UPDATE' AND OLD.method IS NOT NULL THEN
        NEW.method := OLD.method;
      ELSE
        NEW.method := NULL;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to sync method before INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_sync_payment_method ON payments;
CREATE TRIGGER trg_sync_payment_method
  BEFORE INSERT OR UPDATE OF payment_method_id ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_method_from_id();

-- Step 3: Backfill any missing payment_method_id values (shouldn't be any, but safety check)
-- First, try to match by method name
UPDATE payments p
SET payment_method_id = pm.id
FROM payments_methods pm
WHERE p.payment_method_id IS NULL
  AND LOWER(TRIM(p.method)) = LOWER(TRIM(pm.payment_method))
  AND p.id IN (
    SELECT id FROM payments 
    WHERE payment_method_id IS NULL 
    LIMIT 100
  );

-- Step 4: Make payment_method_id NOT NULL
-- First, ensure all payments have a payment_method_id
-- If any don't match, we'll need to handle them
DO $$
DECLARE
  payments_without_method_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO payments_without_method_id
  FROM payments
  WHERE payment_method_id IS NULL;
  
  IF payments_without_method_id > 0 THEN
    RAISE WARNING 'Found % payments without payment_method_id. These will need manual review.', payments_without_method_id;
    -- For now, we'll allow NULL but add a constraint
    -- In production, you should manually fix these records first
  END IF;
END $$;

-- Step 5: Add constraint to ensure payment_method_id is NOT NULL for new records
-- We'll do this in two steps: first add the constraint as DEFERRABLE INITIALLY DEFERRED
-- to allow existing NULL values, then make it strict

-- Add check constraint that payment_method_id must be set (allows existing NULLs during migration)
ALTER TABLE payments
  ADD CONSTRAINT payments_payment_method_id_required 
  CHECK (payment_method_id IS NOT NULL)
  NOT VALID;

-- Validate the constraint (will fail if there are NULL values)
ALTER TABLE payments VALIDATE CONSTRAINT payments_payment_method_id_required;

-- Step 6: Add comment explaining the denormalization strategy
COMMENT ON COLUMN payments.method IS 
  'Denormalized payment method name for display and backup. Automatically synced from payments_methods.payment_method via trigger.';

COMMENT ON COLUMN payments.payment_method_id IS 
  'Foreign key to payments_methods table. Required for referential integrity. The method field is automatically synced from this reference.';

-- Step 7: Create index on payment_method_id if it doesn't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id 
  ON payments(payment_method_id);
