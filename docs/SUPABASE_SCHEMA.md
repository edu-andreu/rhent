# Supabase schema quick reference

Compact reference for agents and developers. Column details and RLS: see `supabase/migrations/`.

**Schema:** `public` · **RLS:** enabled on all tables

---

## Tables

| Table | Purpose |
|-------|--------|
| `customers` | Customer records, credit_balance, status |
| `category` | Item categories (display + search normalization) |
| `subcategory` | Subcategories |
| `color` | Colors |
| `size` | Sizes |
| `brand` | Brands |
| `name` | Item names |
| `location` | Item status/location (On/Off, badge_class) |
| `inventory_items` | Main inventory (rental/sale, SKU, price, stock) |
| `inventory_item_colors` | Item ↔ color many-to-many |
| `rentals` | Rental header (customer_id, status, discount) |
| `rental_items` | Line items (reserved/checked_out/returned, dates, prices) |
| `rental_events` | Event log per rental_item |
| `payments` | Payments (rental_id, payment_method_id, method denormalized) |
| `payments_methods` | Payment method lookup |
| `daily_drawers` | Cash drawer sessions |
| `drawer_transactions` | Drawer transactions |
| `drawer_audit_log` | Drawer edit audit |
| `reminder_items` | Return reminders |
| `kv_store_918f1e54` | App config key-value store |

---

## Functions (public)

| Function | Arguments | Returns |
|----------|-----------|--------|
| `capitalize_words` | input text | text |
| `check_sale_availability` | p_item_id uuid | TABLE(available, reason, current_stock) |
| `collapse_whitespace` | input text | text |
| `current_user_email` | — | text |
| `inventory_items_build_full_sku` | _category_id, _subcategory_id, _color_id, _size_id, _name_id uuid | text |
| `inventory_items_build_sku_base` | _category_id, _subcategory_id, _color_id, _size_id, _name_id uuid | text |
| `inventory_items_next_sku_for_base` | _base text | text |
| `inventory_items_sku_name_component` | _name text | text |
| `lowercase_conjunctions` | input text | text |
| `normalize_display_spanish` | input text | text |
| `normalize_search` | input text | text |
| `remove_accents` | input text | text |
| `to_lowercase` | input text | text |
| `trim_text` | input text | text |
| `unaccent_imm` | t text | text |

**Trigger functions (used by triggers below):**  
`fn_audit_drawer_txn_delete`, `fn_audit_drawer_txn_edit`, `fn_audit_opening_cash_edit`, `inventory_items_autosku_trg`, `inventory_items_track_price_change`, `location_set_default_badge_class`, `location_set_default_item_status`, `location_sync_status_by_name`, `reduce_stock_on_sale`, `sync_payment_method_from_id`, `trigger_normalize_category`, `trigger_normalize_generic`, `trigger_normalize_payment_method`, `trigger_set_updated_at`, `util_normalize_status_on_off`, `util_set_created_cols`, `util_set_text_case`, `util_set_updated_cols`

---

## Triggers (by table)

| Table | Trigger | Timing | Event |
|-------|---------|--------|-------|
| **brand** | normalize_brand_generic_trigger | BEFORE | INSERT, UPDATE |
| | trg_brand_created, trg_brand_status_i/u, trg_brand_titlecase, trg_brand_updated | BEFORE | INSERT/UPDATE |
| **category** | normalize_category_trigger | BEFORE | INSERT, UPDATE |
| | set_updated_at_trigger | BEFORE | UPDATE |
| **color** | normalize_color_generic_trigger | BEFORE | INSERT, UPDATE |
| | trg_color_created, trg_color_status_i/u, trg_color_titlecase, trg_color_updated | BEFORE | INSERT/UPDATE |
| **daily_drawers** | trg_audit_opening_cash | AFTER | UPDATE |
| **drawer_transactions** | trg_audit_drawer_txn_delete | AFTER | DELETE |
| | trg_audit_drawer_txn_edit | AFTER | UPDATE |
| **inventory_items** | trg_inventory_items_autosku | BEFORE | INSERT, UPDATE |
| | trg_inventory_items_created, trg_inventory_items_desc_lower, trg_inventory_items_loc_title | BEFORE | INSERT/UPDATE |
| | trg_inventory_items_status_i/u, trg_inventory_items_track_price, trg_inventory_items_updated | BEFORE | INSERT/UPDATE |
| **location** | trg_location_set_default_badge_class, trg_location_set_default_item_status | BEFORE | INSERT |
| | trg_location_sync_status_by_name | BEFORE | INSERT, UPDATE |
| | trg_status_created, trg_status_flag_i/u, trg_status_titlecase, trg_status_updated | BEFORE | INSERT/UPDATE |
| **name** | normalize_name_generic_trigger | BEFORE | INSERT, UPDATE |
| | trg_name_created, trg_name_status_i/u, trg_name_titlecase, trg_name_updated | BEFORE | INSERT/UPDATE |
| **payments** | trg_payments_method_title, trg_sync_payment_method | BEFORE | INSERT, UPDATE |
| **payments_methods** | normalize_payment_method_trigger | BEFORE | INSERT, UPDATE |
| **rental_items** | trg_reduce_stock_on_sale | AFTER | INSERT |
| | trg_rental_items_created, trg_rental_items_return_cond_title, trg_rental_items_updated | BEFORE | INSERT/UPDATE |
| **rentals** | trg_rentals_channel_title, trg_rentals_created, trg_rentals_updated | BEFORE | INSERT/UPDATE |
| **size** | trg_size_created, trg_size_status_i/u, trg_size_upcase, trg_size_updated | BEFORE | INSERT/UPDATE |
| **subcategory** | normalize_subcategory_generic_trigger | BEFORE | INSERT, UPDATE |
| | trg_subcategory_created, trg_subcategory_status_i/u, trg_subcategory_titlecase, trg_subcategory_updated | BEFORE | INSERT/UPDATE |

---

## Views (summary)

- `v_active_reservations` — Reserved items with customer and payment info
- `v_availability_calendar` — Daily availability per item
- `v_customer_history` — Rental history per customer
- `v_item_rental_stats` — Item revenue (proportional)
- `v_low_stock_products` — Items at or below low_stock_threshold
- `v_overdue_items` — Checked-out items past end_date

For column lists and RLS policies, see the migration files in `supabase/migrations/`.
