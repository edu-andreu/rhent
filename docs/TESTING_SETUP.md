# Testing Infrastructure Setup - Phase 1 Complete ✅

## Overview

Phase 1 of the testing infrastructure has been completed. This document describes what was set up and how to use it.

---

## ✅ What Was Created

### 1. Test Utilities (`src/test/utils/`)

#### `renderWithProviders.tsx`
- Wraps components with `AppStateProvider` and `Toaster`
- Use instead of default `render` from `@testing-library/react`
- Ensures components have access to app context and toast notifications

#### `mockApiClient.ts`
- Mock implementations for `getFunction`, `postFunction`, `putFunction`, `deleteFunction`
- Helper methods for common error scenarios (404, 400, 500)
- Easy reset/clear functionality for test isolation

#### `testHelpers.ts`
- Date mocking utilities (`mockDate`, `createTestDate`)
- Async testing helpers (`waitFor`, `createDelayedFunction`)
- Mock data factories (`createMockDress`, `createMockCustomer`, `createMockConfig`, etc.)
- Toast mocking utilities

#### `index.ts`
- Convenient re-exports of all utilities

### 2. Coverage Configuration

**File:** `vite.config.ts`

- **Provider:** `v8` (fast, accurate coverage)
- **Reporters:** text, json, html, lcov
- **Exclusions:** node_modules, test files, config files, build outputs
- **Thresholds:**
  - Lines: 60%
  - Functions: 60%
  - Branches: 50%
  - Statements: 60%

### 3. Test Scripts

**File:** `package.json`

- `npm test` - Run tests once
- `npm run test:watch` - Watch mode for development
- `npm run test:ui` - Interactive UI mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:ci` - CI-friendly mode with verbose output

### 4. Dependencies

**Added:**
- `@vitest/coverage-v8` - Coverage provider

**Already Installed:**
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - DOM matchers
- `jsdom` - DOM environment for tests

---

## 📖 Usage Examples

### Example 1: Testing a Component

```ts
import { renderWithProviders, mockApiClient } from '../test/utils';
import { MyComponent } from './MyComponent';

test('renders component', () => {
  mockApiClient.getFunction.mockResolvedValue({ data: 'test' });
  
  const { getByText } = renderWithProviders(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});
```

### Example 2: Testing a Hook

```ts
import { renderHook } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { useMyHook } from './useMyHook';

test('hook returns expected value', () => {
  const wrapper = ({ children }) => renderWithProviders(children);
  const { result } = renderHook(() => useMyHook(), { wrapper });
  
  expect(result.current.value).toBe('expected');
});
```

### Example 3: Testing API Error Handling

```ts
import { mockApiClient, createMockDress } from '../test/utils';
import { ApiError } from '../../shared/api/client';

test('handles API error', async () => {
  mockApiClient.getFunction.mockRejectedValue(
    new ApiError('Not found', 404)
  );
  
  // ... test error handling logic
  expect(mockApiClient.getFunction).toHaveBeenCalled();
});
```

### Example 4: Using Mock Data

```ts
import { createMockDress, createMockCustomer, createMockConfig } from '../test/utils';

test('processes dress data', () => {
  const dress = createMockDress({ name: 'Custom Dress', pricePerDay: 20000 });
  const customer = createMockCustomer({ name: 'John Doe' });
  const config = createMockConfig({ rentalDays: 5 });
  
  // ... test logic using mock data
});
```

---

## 🚀 Next Steps (Phase 2-7)

### Phase 2: Unit Tests for Utilities (4-6 hours)
- Test error handling utilities (`errorHandler.ts`, `drawerError.ts`)
- Test date utilities (`dateUtils.ts`, `format/date.ts`)
- Test format utilities (`format/currency.ts`)
- Test constants (`constants/errors.ts`, `constants/status.ts`)

### Phase 3: Hook Tests (6-8 hours)
- Test shared hooks (`useHolidays`, `useConfiguration`, `useDebounce`, etc.)
- Test component hooks (`useReservationCheckout`, `useAddDressForm`, `useReturnCheckout`)

### Phase 4: API Client Tests (3-4 hours)
- Test `getFunction`, `postFunction`, `putFunction`, `deleteFunction`
- Test `ApiError` class
- Test error handling and authorization

### Phase 5: Component Tests (8-10 hours)
- Test section components
- Test main dialog components (integration tests)

### Phase 6: Integration Tests (6-8 hours)
- Test dialog workflows
- Test form validation

### Phase 7: E2E Tests (12-16 hours - Future)
- Setup Playwright/Cypress
- Test critical user flows

---

## 📊 Coverage Goals

**Current:** ~5-10% (only availability, pricing, and a few hooks tested)

**Target (after Phase 1-5):**
- Utilities: 80%+
- Hooks: 70%+
- API Client: 80%+
- Components: 60%+
- **Overall: 65%+**

---

## 📝 Notes

- All test utilities are typed with TypeScript
- Utilities follow the same patterns as existing tests
- Coverage thresholds are set conservatively (60%) and can be increased as coverage improves
- The test setup file (`src/test/setup.ts`) already includes cleanup and jest-dom matchers

---

## 🔗 Related Documentation

- [Test Utilities README](../src/test/README.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
