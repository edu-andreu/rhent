# Rhent documentation

Minimal set of docs for developers and AI agents working on the app.

| Document | Purpose |
|----------|---------|
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | What’s done and what’s left; testing phases (1–6) |
| [SUPABASE_SCHEMA.md](./SUPABASE_SCHEMA.md) | DB quick reference: tables, functions, triggers, views |
| [TESTING_SETUP.md](./TESTING_SETUP.md) | How to run tests, Vitest, coverage, test layout |
| [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) | Env vars, local and Supabase setup |
| [ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md) | A11y patterns when building or changing UI |

**Root:** [NAMING_CONVENTIONS.md](../NAMING_CONVENTIONS.md) — file and symbol naming.

**Supabase:** Schema details and migrations are in `supabase/migrations/`.

---

## Folder structure (src)

| Folder | Purpose |
|--------|---------|
| `src/components/` | UI components; dialogs, tabs, shared UI |
| `src/components/add-dress/` | Add/Edit dress flow (form, mode/sale selection, hook) |
| `src/components/reservation-checkout/` | Reservation → rental checkout (sections, hook) |
| `src/components/return-checkout/` | Return flow (sections, hook) |
| `src/components/settings/` | Settings tabs (lists, config, prices) |
| `src/components/ui/` | Shared UI primitives (form, switch, etc.) |
| `src/features/` | Feature tabs and hooks (catalog, customers, rentals, reservations, checkout, settings, cash) |
| `src/providers/` | App-wide state (AppStateProvider) |
| `src/shared/` | Shared API client, config, format, hooks, utils, booking logic |
| `src/test/` | Test setup and utils (renderWithProviders, mockApiClient, testHelpers) |
| `src/types/` | Shared TypeScript types |
| `src/utils/` | Legacy/utils (dateUtils, supabase info) |
| `src/supabase/functions/` | Edge function handlers (server) |
