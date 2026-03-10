-- Add category column to drawer_transaction_categories for Expenses-by-category breakdown.
-- The UI groups expenses by this column; name remains the unique label for selecting a category.

ALTER TABLE public.drawer_transaction_categories
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

-- Backfill: use name as category label for existing rows where category is empty
UPDATE public.drawer_transaction_categories
SET category = name
WHERE category = '' OR category IS NULL;
