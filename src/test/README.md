# Test Utilities

This directory contains test utilities and setup files for the Rhent application.

## Structure

```
src/test/
├── setup.ts                    # Global test setup
├── utils/
│   ├── index.ts               # Re-exports all utilities
│   ├── renderWithProviders.tsx # Component render helper with providers
│   ├── mockApiClient.ts       # API client mocking utilities
│   └── testHelpers.ts         # Common test helpers
└── README.md                   # This file
```

## Usage

### renderWithProviders

Use this instead of the default `render` from `@testing-library/react` to automatically wrap components with necessary providers (AppStateProvider, Toaster).

```ts
import { renderWithProviders } from '../test/utils';

test('my component', () => {
  const { getByText } = renderWithProviders(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});
```

### mockApiClient

Mock API calls in your tests:

```ts
import { mockApiClient } from '../test/utils';
import { ApiError } from '../../shared/api/client';

beforeEach(() => {
  mockApiClient.reset();
});

test('handles API success', async () => {
  mockApiClient.getFunction.mockResolvedValue({ data: 'success' });
  // ... test code that calls getFunction
  expect(mockApiClient.getFunction).toHaveBeenCalledWith('some-endpoint');
});

test('handles API error', async () => {
  mockApiClient.getFunction.mockRejectedValue(
    new ApiError('Not found', 404)
  );
  // ... test error handling
});
```

**Helper methods:**
- `mockApiClient.success(data)` - Create successful response
- `mockApiClient.error(message, status, data)` - Create error response
- `mockApiClient.notFound(message)` - Create 404 error
- `mockApiClient.badRequest(message, data)` - Create 400 error
- `mockApiClient.serverError(message)` - Create 500 error
- `mockApiClient.reset()` - Reset all mocks
- `mockApiClient.clear()` - Clear call history

### testHelpers

Common test helpers for dates, delays, and mock data:

```ts
import {
  createTestDate,
  mockDate,
  waitFor,
  createMockDress,
  createMockCustomer,
  createMockConfig,
  createMockHolidays,
} from '../test/utils';

// Create test dates
const testDate = createTestDate('2026-02-17');
expect(testDate.getDate()).toBe(17);

// Mock global Date
const restoreDate = mockDate('2026-02-17T10:00:00Z');
// ... test code
restoreDate(); // Restore original Date

// Wait for async operations
await waitFor(100); // Wait 100ms

// Create mock data
const dress = createMockDress({ name: 'Custom Dress', pricePerDay: 20000 });
const customer = createMockCustomer({ name: 'John Doe' });
const config = createMockConfig({ rentalDays: 5 });
const holidays = createMockHolidays([
  { date: '2026-02-20', name: 'Test Holiday' }
]);
```

## Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests for CI (with coverage and verbose output)
npm run test:ci
```

## Coverage

Coverage reports are generated in the `coverage/` directory:
- **HTML report**: `coverage/index.html` (open in browser)
- **LCOV report**: `coverage/lcov.info` (for CI/CD)
- **JSON report**: `coverage/coverage-final.json`

### Coverage Thresholds

Current thresholds (configured in `vite.config.ts`):
- Lines: 60%
- Functions: 60%
- Branches: 50%
- Statements: 60%

## Example Test

See `src/shared/booking/__tests__/availability.test.ts` for a complete example of how to write tests using these utilities.
