-- name: extensions_move_from_public
-- Migration: Move extensions from public schema to extensions schema
-- Extensions should not be installed in the public schema for security best practices.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
--
-- This migration:
-- 1. Creates an 'extensions' schema if it doesn't exist
-- 2. Moves btree_gist and unaccent extensions to the extensions schema
-- 3. Updates search_path to include extensions schema

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move btree_gist extension to extensions schema
ALTER EXTENSION btree_gist SET SCHEMA extensions;

-- Move unaccent extension to extensions schema
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Update search_path for the database to include extensions schema
-- This ensures functions can still find extension functions
ALTER DATABASE current_database() SET search_path = public, extensions;

-- Note: After running this migration, you may need to update any functions
-- that reference these extensions to use fully qualified names (extensions.btree_gist, etc.)
-- or ensure the search_path includes 'extensions'.
