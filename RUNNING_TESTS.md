# Running Tests Manually

This guide covers all the ways to run tests manually in this project.

## Quick Reference

### Backend Tests Only
```bash
npm test
```

### Frontend Tests Only
```bash
npm run test:storefront
```

### All Tests (Backend + Frontend)
```bash
npm run test:all
```

### Watch Mode (Auto-rerun on file changes)
```bash
npm run test:watch          # Backend only
cd storefront && npm test -- --watch  # Frontend only
```

### With Coverage Reports
```bash
npm run test:coverage       # Backend only
cd storefront && npm run test:coverage  # Frontend only
```

### With Logging (Local Troubleshooting)
```bash
npm run test:log            # All tests with logs
npm run test:log:backend    # Backend only with logs
npm run test:log:frontend   # Frontend only with logs
```

---

## Detailed Commands

### Backend Tests

The backend tests are located in `src/` and `tests/` directories.

#### Run All Backend Tests
```bash
npm test
```

#### Run Tests in Watch Mode
Automatically reruns tests when files change:
```bash
npm run test:watch
```

#### Run Tests with Coverage Report
Generates coverage reports in the `coverage/` directory:
```bash
npm run test:coverage
```

View the HTML coverage report:
```bash
# Open coverage/index.html in your browser
```

#### Run a Specific Test File
```bash
npm test -- database-connection.test.ts
```

#### Run Tests Matching a Pattern
```bash
npm test -- --testNamePattern="database"
```

#### Run Tests in a Specific Directory
```bash
npm test -- src/config
```

#### Run Tests with Verbose Output
```bash
npm test -- --verbose
```

#### Run Tests in a Specific File with Verbose Output
```bash
npm test -- database-connection.test.ts --verbose
```

---

### Frontend Tests

The frontend tests are located in `storefront/` directory.

#### Run All Frontend Tests
```bash
npm run test:storefront
```

Or navigate to the storefront directory:
```bash
cd storefront
npm test
```

#### Run Tests in Watch Mode
```bash
cd storefront
npm test -- --watch
```

#### Run Tests with Coverage Report
```bash
cd storefront
npm run test:coverage
```

#### Run a Specific Test File
```bash
cd storefront
npm test -- CartPage.test.tsx
```

#### Run Tests Matching a Pattern
```bash
cd storefront
npm test -- --testNamePattern="cart"
```

---

### Running All Tests Together

#### Run Backend and Frontend Tests in Parallel
```bash
npm run test:all
```

This uses `concurrently` to run both test suites simultaneously. The process will fail if either suite fails.

---

### Test Logging (Local Troubleshooting Only)

**⚠️ Note:** These commands are for local troubleshooting only. They are NOT used in CI/CD pipelines.

#### Run All Tests with Logging
Saves test output to rotating log files (keeps last 5 runs):
```bash
npm run test:log
```

#### Run Backend Tests with Logging
```bash
npm run test:log:backend
```

#### Run Frontend Tests with Logging
```bash
npm run test:log:frontend
```

#### View Test Logs
Logs are saved in the `test-logs/` directory:
- `test-run-1.log` - Most recent run
- `test-run-2.log` - Second most recent
- `test-run-3.log` - Third most recent
- `test-run-4.log` - Fourth most recent
- `test-run-5.log` - Fifth most recent (oldest kept)

View the most recent log:
```bash
# On Windows
type test-logs\test-run-1.log

# On Linux/Mac
cat test-logs/test-run-1.log
```

For more details, see `scripts/README.md`.

---

## Test Statistics

### Current Test Count
- **Backend Tests:** 87 test cases across 6 test files
- **Frontend Tests:** 113 test cases across 8 test files
- **Total:** 200 test cases across 14 test files

### Test Files

**Backend:**
- `src/config/database-connection.test.ts`
- `src/config/env-validation.test.ts`
- `src/config/migration-rollback.test.ts`
- `src/config/security.test.ts`
- `src/config/stripe-config.test.ts`
- `src/plugins/order-management.test.ts`

**Frontend:**
- `storefront/app/cart/__tests__/CartPage.test.tsx`
- `storefront/app/checkout/__tests__/CheckoutPage.test.tsx`
- `storefront/app/collections/__tests__/CollectionsPage.test.tsx`
- `storefront/app/collections/[slug]/__tests__/CollectionDetailPage.test.tsx`
- `storefront/app/orders/__tests__/OrderHistoryPage.test.tsx`
- `storefront/app/orders/[code]/__tests__/OrderDetailPage.test.tsx`
- `storefront/app/products/[slug]/__tests__/ProductDetailPage.test.tsx`
- `storefront/components/__tests__/AddressForm.test.tsx`

---

## Coverage Requirements

### Backend Coverage Thresholds
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### Frontend Coverage Thresholds
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Tests will fail if coverage falls below these thresholds when running with `--coverage`.

---

## Common Use Cases

### Before Committing Code
```bash
# Run all tests to ensure nothing is broken
npm run test:all

# Or with coverage to check coverage
npm run test:coverage
cd storefront && npm run test:coverage
```

### During Development (Watch Mode)
```bash
# Terminal 1: Backend tests in watch mode
npm run test:watch

# Terminal 2: Frontend tests in watch mode
cd storefront && npm test -- --watch
```

### Debugging a Failing Test
```bash
# Run specific test file with verbose output
npm test -- database-connection.test.ts --verbose

# Or with logging for detailed output
npm run test:log:backend
# Then check test-logs/test-run-1.log
```

### Checking Coverage
```bash
# Backend coverage
npm run test:coverage
# Open coverage/index.html

# Frontend coverage
cd storefront && npm run test:coverage
# Open storefront/coverage/index.html
```

### Running Tests for a Specific Feature
```bash
# Example: Run all database-related tests
npm test -- --testNamePattern="database"

# Example: Run all cart-related frontend tests
cd storefront
npm test -- --testNamePattern="cart"
```

---

## Troubleshooting

### Tests Are Failing

1. **Check the error message** - Jest provides detailed error messages
2. **Run with verbose output:**
   ```bash
   npm test -- --verbose
   ```
3. **Run with logging** to capture full output:
   ```bash
   npm run test:log
   # Check test-logs/test-run-1.log
   ```
4. **Run a specific test file** to isolate the issue:
   ```bash
   npm test -- failing-test.test.ts
   ```

### Tests Are Slow

1. **Run tests in parallel** (default behavior)
2. **Use watch mode** during development to only run changed tests
3. **Run specific test files** instead of the full suite during development

### Coverage Is Low

1. **Check which files have low coverage:**
   ```bash
   npm run test:coverage
   # Open coverage/index.html
   ```
2. **Focus on files with low coverage** and add tests
3. **Check the coverage threshold** - tests will fail if below threshold

### Frontend Tests Not Running

1. **Ensure you're in the storefront directory:**
   ```bash
   cd storefront
   npm test
   ```
2. **Or use the npm script from root:**
   ```bash
   npm run test:storefront
   ```
3. **Check that dependencies are installed:**
   ```bash
   cd storefront
   npm install
   ```

### Log Files Not Being Created

1. **Ensure the script has write permissions**
2. **Check that `test-logs/` directory exists** (created automatically)
3. **Verify TypeScript can compile the script:**
   ```bash
   npx tsc --noEmit scripts/test-with-logs.ts
   ```

---

## CI/CD vs Local Testing

### CI/CD Pipeline
The CI/CD pipeline uses:
```bash
npm run ci
```

This runs:
- Type checking
- Linting
- Format checking
- All tests (without logging)

**Note:** Test logging scripts are NOT used in CI/CD - they are for local troubleshooting only.

### Local Development
For local development, use any of the commands above. The logging scripts (`test:log*`) are specifically designed for local troubleshooting and should not be used in automated pipelines.

---

## Additional Resources

- **Test Strategy:** See `TESTING_STRATEGY.md` for testing philosophy and guidelines
- **CI/CD Setup:** See `CI_CD_PLAN.md` for CI/CD pipeline details
- **Test Logging:** See `scripts/README.md` for detailed logging documentation

---

## Quick Command Cheat Sheet

```bash
# Basic Tests
npm test                          # Backend tests
npm run test:storefront           # Frontend tests
npm run test:all                  # All tests

# Watch Mode
npm run test:watch                # Backend watch
cd storefront && npm test -- --watch  # Frontend watch

# Coverage
npm run test:coverage             # Backend coverage
cd storefront && npm run test:coverage  # Frontend coverage

# Logging (Local Only)
npm run test:log                  # All tests with logs
npm run test:log:backend          # Backend with logs
npm run test:log:frontend         # Frontend with logs

# Specific Tests
npm test -- <filename>            # Run specific file
npm test -- --testNamePattern="pattern"  # Run matching tests
npm test -- --verbose              # Verbose output
```
