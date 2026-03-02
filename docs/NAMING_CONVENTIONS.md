# Naming Conventions

This document outlines the naming conventions used throughout the Rhent codebase to ensure consistency and maintainability.

## File Naming

### Components (`.tsx` files)
- **Format**: PascalCase
- **Pattern**: `ComponentName.tsx`
- **Examples**:
  - `DressCard.tsx`
  - `AppHeader.tsx`
  - `CheckoutDialog.tsx`
  - `RescheduleReservationDialog.tsx`

### Hooks (`.ts` files)
- **Format**: camelCase with `use` prefix
- **Pattern**: `useHookName.ts`
- **Examples**:
  - `useCheckout.ts`
  - `useCatalog.ts`
  - `useDressDialog.ts`
  - `useCustomerDialog.ts`

### Utilities (`.ts` or `.tsx` files)
- **Format**: camelCase with descriptive suffix
- **Pattern**: `utilityNameUtils.ts` or `utilityName.ts`
- **Examples**:
  - `dateUtils.tsx`
  - `formatPrice.ts`
  - `currency.ts` (in `shared/format/`)

### Types (`.ts` files)
- **Format**: camelCase or descriptive name
- **Pattern**: `types.ts` or `domainTypes.ts`
- **Examples**:
  - `types/index.ts` (main types)
  - `types/api.ts` (API response types)

### Test Files
- **Format**: Same as source file with `.test.ts` suffix
- **Pattern**: `ComponentName.test.ts` or `useHookName.test.ts`
- **Examples**:
  - `useDressDialog.test.ts`
  - `useCustomerDialog.test.ts`
  - `useReturnDialog.test.ts`

### Feature Folders
- **Format**: camelCase, plural for collections
- **Pattern**: `featureName/`
- **Examples**:
  - `features/catalog/`
  - `features/customers/`
  - `features/rentals/`
  - `features/reservations/`
  - `features/checkout/`

## Component Naming

### React Components
- **Format**: PascalCase
- **Pattern**: Descriptive, noun-based names
- **Examples**:
  - `DressCard` (not `Card` or `DressCardComponent`)
  - `AppHeader` (not `Header` or `AppHeaderComponent`)
  - `CheckoutDialog` (not `Checkout` or `Dialog`)

### Component Files
- **Format**: Same as component name
- **Pattern**: One component per file, default export
- **Examples**:
  ```typescript
  // DressCard.tsx
  export function DressCard() { ... }
  
  // AppHeader.tsx
  export function AppHeader() { ... }
  ```

## Hook Naming

### Custom Hooks
- **Format**: camelCase, must start with `use`
- **Pattern**: `use` + Feature/Entity + Action/Purpose
- **Examples**:
  - `useCheckout` - checkout flow logic
  - `useCatalog` - catalog management
  - `useDressDialog` - dress dialog state
  - `useCustomerDialog` - customer dialog state
  - `useReservationActions` - reservation actions

### Hook Files
- **Format**: Same as hook name
- **Pattern**: One hook per file, named export
- **Examples**:
  ```typescript
  // useCheckout.ts
  export function useCheckout(options: UseCheckoutOptions) { ... }
  ```

## Variable Naming

### React State
- **Format**: camelCase
- **Pattern**: Descriptive, boolean states use `is`/`has`/`show` prefix
- **Examples**:
  - `const [cartItems, setCartItems] = useState<CartItem[]>([]);`
  - `const [showDialog, setShowDialog] = useState(false);`
  - `const [isLoading, setIsLoading] = useState(false);`

### Functions/Handlers
- **Format**: camelCase
- **Pattern**: Verb-based, descriptive
- **Examples**:
  - `handleRent`, `handleReserve`, `handleBuy`
  - `loadCustomers`, `addCustomer`, `updateCustomer`
  - `onPaymentComplete`, `onDressAdded`

### Constants
- **Format**: UPPER_SNAKE_CASE for true constants, camelCase for config
- **Pattern**: Descriptive, uppercase for immutable values
- **Examples**:
  - `const DEFAULT_CONFIG = { ... };`
  - `const MAX_RETRIES = 3;`
  - `const formatCurrency = formatCurrencyARS;` (function reference)

## Type/Interface Naming

### Interfaces
- **Format**: PascalCase
- **Pattern**: Descriptive, often includes `Props`, `Options`, or domain name
- **Examples**:
  - `DressCardProps`
  - `UseCheckoutOptions`
  - `ApiCustomerResponse`
  - `RentalConfiguration`

### Types
- **Format**: PascalCase
- **Pattern**: Descriptive domain types
- **Examples**:
  - `Dress`, `Customer`, `Rental`, `Reservation`
  - `CartItem`, `PaymentMethod`

## Folder Structure

### Feature-Based Organization
```
src/
├── features/
│   ├── catalog/
│   │   ├── CatalogTab.tsx
│   │   ├── useCatalog.ts
│   │   ├── useDressDialog.ts
│   │   └── __tests__/
│   ├── customers/
│   │   ├── CustomersTab.tsx
│   │   ├── useCustomers.ts
│   │   └── useCustomerDialog.ts
│   └── ...
├── components/
│   ├── ui/          # Reusable UI components
│   ├── DressCard.tsx
│   ├── AppHeader.tsx
│   └── ...
├── shared/
│   ├── api/         # API client
│   ├── hooks/       # Shared hooks
│   └── format/      # Formatting utilities
└── types/           # Type definitions
```

## ID and Data Attributes

### HTML IDs (`id` attribute)
- **Format**: kebab-case
- **Pattern**: Semantic, descriptive
- **Usage**: For accessibility (form labels), landmarks, main sections
- **Examples**:
  - `id="main-header"`
  - `id="catalog-search"`
  - `id="cart-button"`
  - `id="edit-mode"`

### Data Test IDs (`data-testid` attribute)
- **Format**: kebab-case
- **Pattern**: Descriptive, includes element type
- **Usage**: For testing, debugging, and precise element targeting
- **Examples**:
  - `data-testid="app-header"`
  - `data-testid="catalog-search-input"`
  - `data-testid="cart-button"`
  - `data-testid="dress-rent-button-{id}"` (dynamic IDs)

## Best Practices

### ✅ Do:
- Use descriptive, self-documenting names
- Follow consistent patterns within the same feature
- Use PascalCase for components and types
- Use camelCase for functions, variables, and hooks
- Include the entity/domain in component names when needed for clarity
- Use `id` for accessibility and landmarks
- Use `data-testid` for testable/debuggable elements

### ❌ Don't:
- Use abbreviations unless widely understood (e.g., `API`, `ID`)
- Include version numbers in filenames (e.g., `Component-100-888.tsx`)
- Use generic names like `Component`, `Utils`, `Helpers`
- Mix naming conventions within the same file
- Use auto-generated file names from design tools in production code
- Create duplicate components with similar names (e.g., `RescheduleDialog` vs `RescheduleReservationDialog`)

## Examples

### Good Component Names
```typescript
// ✅ Clear and descriptive
export function RescheduleReservationDialog() { ... }
export function ReturnCheckoutDialog() { ... }
export function AddDressDialog() { ... }

// ❌ Too generic or unclear
export function Dialog() { ... }
export function RescheduleDialog() { ... } // Unclear what it reschedules
```

### Good Hook Names
```typescript
// ✅ Clear purpose
export function useCheckout() { ... }
export function useDressDialog() { ... }
export function useReservationActions() { ... }

// ❌ Unclear or too generic
export function useDialog() { ... }
export function useActions() { ... }
```

### Good File Names
```
✅ CatalogTab.tsx
✅ useCatalog.ts
✅ dateUtils.tsx
✅ types/api.ts

❌ catalog.tsx (unclear if component or utility)
❌ utils.ts (too generic)
❌ DressRentalApp.tsx (auto-generated, unclear purpose)
```

## Migration Notes

If you encounter files that don't follow these conventions:
1. Check if the file is actively used
2. If unused, consider deletion
3. If used, plan a refactoring to rename following conventions
4. Update all imports when renaming files
