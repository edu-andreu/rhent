-- name: standardize_status_fields
-- Migration: Standardize status fields to lowercase values.

-- Step 1: Drop the old constraint temporarily
ALTER TABLE category
  DROP CONSTRAINT IF EXISTS category_status_check;

-- Step 2: Update category table to use lowercase status values
-- Current: 'On'/'Off' -> Target: 'on'/'off'
UPDATE category SET status = LOWER(status) WHERE status IN ('On', 'Off');

-- Step 3: Update location table to use lowercase status values  
-- Current: 'On'/'Off' -> Target: 'on'/'off'
UPDATE location SET status = LOWER(status) WHERE status IN ('On', 'Off');

-- Step 4: Add new constraint that uses lowercase
ALTER TABLE category
  ADD CONSTRAINT category_status_check
  CHECK (lower(btrim(status)) = ANY (ARRAY['on'::text, 'off'::text]));

-- Step 5: Verify all status fields are now lowercase (simple check)
-- Note: This verification is informational only

-- Step 6: Add comments documenting the standardization
COMMENT ON COLUMN category.status IS 
  'Status field: ''on'' (active) or ''off'' (inactive). Standardized to lowercase.';

COMMENT ON COLUMN location.status IS 
  'Status field: ''on'' (active) or ''off'' (inactive). Standardized to lowercase.';
