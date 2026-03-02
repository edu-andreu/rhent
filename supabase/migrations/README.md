# Supabase migrations

Apply in filename order (oldest first). Each file has a `-- name: short_name` line for quick reference.

## Migration list

| Order | File | Short name | Purpose |
|-------|------|------------|---------|
| 1 | `20250217000001_add_rls_policies_deny_anon_direct.sql` | **rls_deny_anon_direct** | RLS policies on all tables to deny anon direct access (app uses service role via Edge Functions). |
| 2 | `20250217000002_fix_function_search_path_security.sql` | **function_search_path_security** | Set explicit `search_path` on functions to prevent search_path manipulation. |
| 3 | `20250217000003_move_extensions_from_public_schema.sql` | **extensions_move_from_public** | Move `btree_gist` and `unaccent` to `extensions` schema. |
| 4 | `20250217000004_add_performance_indexes.sql` | **performance_indexes** | Indexes for availability, inventory, customer and related queries. |
| 5 | `20250217000005_fix_payment_method_denormalization.sql` | **payment_method_denormalization** | Require `payment_method_id` on `payments` and sync `method` from `payments_methods`. |
| 6 | `20250217000006_standardize_status_fields.sql` | **standardize_status_fields** | Standardize status fields to lowercase values. |
| 7 | `20250218000001_drop_unused_functions.sql` | **drop_unused_functions** | Remove unused/duplicate functions (e.g. replaced by util_*, deprecated helpers). |

## Naming convention for new migrations

Use this pattern so names stay consistent and sortable:

- **Filename:** `YYYYMMDDHHMMSS_short_snake_case_name.sql`
  - Example: `20250219120000_add_my_feature.sql`
- **First line in file:** `-- name: short_snake_case_name`
  - Same as the filename suffix (no timestamp). Example: `-- name: add_my_feature`
- **Short name:** lowercase, snake_case, verb or noun (e.g. `add_*`, `fix_*`, `drop_*`, `*_indexes`, `*_denormalization`).

Do **not** rename or remove existing migration files after they have been applied; Supabase tracks them by filename.

## How to apply

**CLI (recommended):**
```bash
supabase db push
```

**Dashboard:** SQL Editor → paste and run each file in order (1–7).

**MCP:** Use the `apply_migration` tool with the migration SQL.

## Verification

After applying, run your app and Edge Functions; check Supabase logs for errors. For RLS and function search_path checks, see the verification queries in the first three migration files’ comments if needed.
