# Email Verification Limitation in devMode

## Overview

In development mode, the Vendure EmailPlugin may not write verification emails to files even when `outputPath` is configured. This is a known limitation that affects integration tests requiring email verification.

## Current Behavior

### What Works ✅
- Customer registration succeeds
- Emails are created and stored in-memory
- Mailbox UI is accessible at `http://localhost:3000/mailbox`
- Registration tests pass

### What Doesn't Work ❌
- Email files are not written to `static/email/test-emails/` in devMode
- Automated email verification in tests (no token available)
- Tests requiring authenticated customers fail

## Impact on Tests

### Passing Tests
- ✅ `should register a new customer account` - Registration succeeds, verification is skipped

### Skipped Tests (require authentication)
- ⏭️ `should login as customer and get session` - Requires verified customer
- ⏭️ `should register a customer as a seller` - Requires authenticated customer
- ⏭️ `should generate unique shop slug` - Requires authenticated customer
- ⏭️ `should reject duplicate shop name registration` - Requires authenticated customer
- ⏭️ `should query activeSeller for authenticated customer` - Requires authenticated customer
- ⏭️ `should update seller profile` - Requires authenticated customer
- ⏭️ `should validate shop name requirements` - Requires authenticated customer

### Working Tests (no authentication needed)
- ✅ `should reject registration without authentication` - Tests error handling
- ✅ `should return null for non-existent slug` - Public query
- ✅ `should reject registration if customer already has seller account` - Uses existing customer

## Manual Testing Workflow

To test email verification flows manually:

1. **Register a customer** via test or GraphQL:
   ```graphql
   mutation {
     registerCustomerAccount(input: {
       emailAddress: "test@example.com"
       password: "password123"
       firstName: "Test"
       lastName: "User"
     }) {
       ... on Success { success }
     }
   }
   ```

2. **Check the mailbox UI** at `http://localhost:3000/mailbox`
   - Find the verification email for your test customer
   - View the email content

3. **Extract the verification token** from the email:
   - Look for `verify?token=TOKEN` in the email body
   - Copy the token value

4. **Verify the customer** via Shop API:
   ```graphql
   mutation {
     verifyCustomerAccount(token: "YOUR_TOKEN_HERE") {
       ... on CurrentUser { id }
       ... on ErrorResult { errorCode message }
     }
   }
   ```

5. **Login** with the verified customer:
   ```graphql
   mutation {
     login(username: "test@example.com", password: "password123") {
       ... on CurrentUser { id identifier }
     }
   }
   ```

## Configuration

The EmailPlugin is configured in `src/vendure-config.ts`:

```typescript
IS_DEV
  ? EmailPlugin.init({
      devMode: true,
      outputPath: path.join(PROJECT_ROOT, 'static/email/test-emails'),
      route: 'mailbox',
      // ...
    })
```

The `outputPath` is correctly configured, but in devMode, emails may only be stored in-memory for the mailbox UI.

## Solutions

### Option 1: Manual Testing (Current Approach)
- Use mailbox UI for email verification
- Manual testing for authenticated flows
- Automated tests for non-authenticated flows

### Option 2: Production-like Email Configuration
- Configure SMTP transport even in dev
- Use a test email service (Mailtrap, etc.)
- Emails will be sent and can be accessed via the service

### Option 3: Test Helper Plugin
- Create a test plugin that auto-verifies customers
- Bypass email verification for test customers
- Enable full automated testing

## Notes

- This limitation only affects **integration tests** that require email verification
- **Unit tests** are unaffected (they mock dependencies)
- **Production** behavior is unaffected (uses SMTP transport)
- The mailbox UI provides a workaround for manual testing

## Related Files

- `src/plugins/multi-vendor-plugin/integration/seller-registration.integration.test.ts` - Test file with skipped tests
- `src/vendure-config.ts` - EmailPlugin configuration
- `static/email/test-emails/` - Email output directory (may be empty in devMode)
