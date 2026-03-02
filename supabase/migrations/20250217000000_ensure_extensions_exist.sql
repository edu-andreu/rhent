-- name: ensure_extensions_exist
-- Migration: Ensure unaccent and btree_gist exist before moving them to extensions schema.
-- 20250217000003_move_extensions_from_public_schema expects these extensions in public;
-- they may not exist on fresh or restored databases.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS btree_gist;
