-- name: drop_unused_functions
-- Migration: Drop unused and duplicate functions
-- Removes 28 functions that are not referenced by any trigger or active function.
-- See docs/analysis from Claude: old table-specific triggers replaced by util_*,
-- alternative normalize implementations, deprecated payment helpers, unused notify.
--
-- KEEP: check_sale_availability (used by app via .rpc in server/index.tsx)

-- Old/Deprecated Category Functions (3)
DROP FUNCTION IF EXISTS public.category_normalize_keep_specials_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.category_set_created_cols() CASCADE;
DROP FUNCTION IF EXISTS public.category_set_updated_cols() CASCADE;

-- Old/Deprecated Color Functions (3)
DROP FUNCTION IF EXISTS public.color_normalize_status() CASCADE;
DROP FUNCTION IF EXISTS public.color_set_created_cols() CASCADE;
DROP FUNCTION IF EXISTS public.color_set_updated_cols() CASCADE;

-- Old/Deprecated Name Functions (3)
DROP FUNCTION IF EXISTS public.name_normalize_status() CASCADE;
DROP FUNCTION IF EXISTS public.name_set_created_cols() CASCADE;
DROP FUNCTION IF EXISTS public.name_set_updated_cols() CASCADE;

-- Old/Deprecated Size Functions (3)
DROP FUNCTION IF EXISTS public.size_normalize_status() CASCADE;
DROP FUNCTION IF EXISTS public.size_set_created_cols() CASCADE;
DROP FUNCTION IF EXISTS public.size_set_updated_cols() CASCADE;

-- Old/Deprecated Subcategory Functions (3)
DROP FUNCTION IF EXISTS public.subcategory_normalize_status() CASCADE;
DROP FUNCTION IF EXISTS public.subcategory_set_created_cols() CASCADE;
DROP FUNCTION IF EXISTS public.subcategory_set_updated_cols() CASCADE;

-- Old/Deprecated Status Functions (3)
DROP FUNCTION IF EXISTS public.status_normalize_flag() CASCADE;
DROP FUNCTION IF EXISTS public.status_set_created_cols() CASCADE;
DROP FUNCTION IF EXISTS public.status_set_updated_cols() CASCADE;

-- Old/Deprecated Payment Functions (2)
DROP FUNCTION IF EXISTS public.set_payment_type_and_enable_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_payment_type_from_search() CASCADE;

-- Unused Normalize Functions - Alternative Implementations (7)
DROP FUNCTION IF EXISTS public.normalize_and_titlecase(text) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_display_spanish_advanced(text) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_remove_accents_and_titlecase(text) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_remove_accents_titlecase_fix_conjunctions(text) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_text(text) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_text_standard(text) CASCADE;
DROP FUNCTION IF EXISTS public.lowercase_spanish_particles(text) CASCADE;

-- Unused Notification Functions (1)
DROP FUNCTION IF EXISTS public.notify_standardize_category() CASCADE;
