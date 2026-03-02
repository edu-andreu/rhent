-- name: function_search_path_security
-- Migration: Fix function search_path security vulnerability
-- Sets explicit search_path for all database functions to prevent SQL injection attacks
-- via search_path manipulation.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- This migration sets search_path = '' (empty) or 'public' for all functions that currently
-- have a mutable search_path. An empty search_path requires fully qualified names.
-- Using 'public' is safer if functions reference tables without schema qualification.

-- Public schema functions
ALTER FUNCTION public.normalize_display_spanish_advanced SET search_path = '';
ALTER FUNCTION public.normalize_and_titlecase SET search_path = '';
ALTER FUNCTION public.normalize_text_standard SET search_path = '';
ALTER FUNCTION public.name_set_updated_cols SET search_path = '';
ALTER FUNCTION public.size_normalize_status SET search_path = '';
ALTER FUNCTION public.color_set_created_cols SET search_path = '';
ALTER FUNCTION public.normalize_search SET search_path = '';
ALTER FUNCTION public.name_set_created_cols SET search_path = '';
ALTER FUNCTION public.collapse_whitespace SET search_path = '';
ALTER FUNCTION public.notify_standardize_category SET search_path = '';
ALTER FUNCTION public.inventory_items_build_full_sku SET search_path = '';
ALTER FUNCTION public.to_lowercase SET search_path = '';
ALTER FUNCTION public.trigger_normalize_generic SET search_path = '';
ALTER FUNCTION public.size_set_updated_cols SET search_path = '';
ALTER FUNCTION public.inventory_items_build_sku_base SET search_path = '';
ALTER FUNCTION public.color_normalize_status SET search_path = '';
ALTER FUNCTION public.remove_accents SET search_path = '';
ALTER FUNCTION public.name_normalize_status SET search_path = '';
ALTER FUNCTION public.trigger_set_updated_at SET search_path = '';
ALTER FUNCTION public.subcategory_set_updated_cols SET search_path = '';
ALTER FUNCTION public.util_set_text_case SET search_path = '';
ALTER FUNCTION public.normalize_display_spanish SET search_path = '';
ALTER FUNCTION public.normalize_remove_accents_titlecase_fix_conjunctions SET search_path = '';
ALTER FUNCTION public.lowercase_spanish_particles SET search_path = '';
ALTER FUNCTION public.lowercase_conjunctions SET search_path = '';
ALTER FUNCTION public.trigger_normalize_payment_method SET search_path = '';
ALTER FUNCTION public.trigger_normalize_category SET search_path = '';
ALTER FUNCTION public.status_set_updated_cols SET search_path = '';
ALTER FUNCTION public.inventory_items_autosku_trg SET search_path = '';
ALTER FUNCTION public.status_set_created_cols SET search_path = '';
ALTER FUNCTION public.location_set_default_badge_class SET search_path = '';
ALTER FUNCTION public.inventory_items_next_sku_for_base SET search_path = '';
ALTER FUNCTION public.util_set_updated_cols SET search_path = '';
ALTER FUNCTION public.normalize_remove_accents_and_titlecase SET search_path = '';
ALTER FUNCTION public.util_normalize_status_on_off SET search_path = '';
ALTER FUNCTION public.inventory_items_sku_name_component SET search_path = '';
ALTER FUNCTION public.inventory_items_track_price_change SET search_path = '';
ALTER FUNCTION public.trim_text SET search_path = '';
ALTER FUNCTION public.normalize_text SET search_path = '';
ALTER FUNCTION public.unaccent_imm SET search_path = '';
ALTER FUNCTION public.fn_audit_opening_cash_edit SET search_path = '';
ALTER FUNCTION public.fn_audit_drawer_txn_delete SET search_path = '';
ALTER FUNCTION public.location_set_default_item_status SET search_path = '';
ALTER FUNCTION public.subcategory_set_created_cols SET search_path = '';
ALTER FUNCTION public.color_set_updated_cols SET search_path = '';
ALTER FUNCTION public.set_payment_type_and_enable_user SET search_path = '';
ALTER FUNCTION public.size_set_created_cols SET search_path = '';
ALTER FUNCTION public.category_normalize_keep_specials_trigger SET search_path = '';
ALTER FUNCTION public.status_normalize_flag SET search_path = '';
ALTER FUNCTION public.category_set_updated_cols SET search_path = '';
ALTER FUNCTION public.check_sale_availability SET search_path = '';
ALTER FUNCTION public.current_user_email SET search_path = '';
ALTER FUNCTION public.subcategory_normalize_status SET search_path = '';
ALTER FUNCTION public.fn_audit_drawer_txn_edit SET search_path = '';
ALTER FUNCTION public.location_sync_status_by_name SET search_path = '';
ALTER FUNCTION public.capitalize_words SET search_path = '';
ALTER FUNCTION public.util_set_created_cols SET search_path = '';
ALTER FUNCTION public.category_set_created_cols SET search_path = '';
ALTER FUNCTION public.reduce_stock_on_sale SET search_path = '';

-- stg schema functions
ALTER FUNCTION stg.gen_customer_id SET search_path = '';
ALTER FUNCTION stg.gen_item_id SET search_path = '';

-- Note: If any functions fail with "function does not exist", they may have been
-- renamed or removed. Check the error and remove those lines from this migration.
-- 
-- To verify functions were updated, run:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
--   AND proconfig IS NULL OR 'search_path' = ANY(proconfig);
