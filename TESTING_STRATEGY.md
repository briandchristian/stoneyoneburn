# Testing Strategy for Sensitive Data

## Problem
GitHub's secret scanning flags any string matching API key patterns (e.g., `sk_live_...`, `pk_live_...`) as potential secrets, even in test files with clearly fake values.

## Best Long-Term Strategy

### Option 1: GitHub Secret Scanning Allowlist (Recommended)
**Best for:** Quick resolution, minimal code changes

**Steps:**
1. Visit the GitHub allowlist URL when prompted during push
2. Mark test files as "false positives" 
3. GitHub will remember this for future commits

**Pros:**
- ✅ No code changes required
- ✅ One-time setup per repository
- ✅ Maintains test readability
- ✅ Works for all test files automatically

**Cons:**
- ⚠️ Requires repository admin access
- ⚠️ Needs to be done once per repository

**Implementation:**
- When GitHub blocks a push, use the provided URL to allow the secret
- GitHub will create a repository-level allowlist entry

---

### Option 2: Refactor Tests to Use Mocks (Most Maintainable)
**Best for:** Long-term maintainability, avoiding GitHub scanning entirely

**Approach:**
- Mock the validation function instead of using real-looking keys
- Test validation logic separately from key format

**Pros:**
- ✅ No GitHub scanning issues
- ✅ Tests are more focused (test behavior, not format)
- ✅ Faster test execution
- ✅ No need for allowlist management

**Cons:**
- ⚠️ Requires refactoring existing tests
- ⚠️ Slightly more complex test setup

**Example:**
```typescript
// Instead of testing with real-looking keys:
it('should validate Stripe config', () => {
  const config = { secretKey: 'sk_test_...', ... };
  expect(() => validateStripeConfig(config)).not.toThrow();
});

// Use mocks:
it('should validate Stripe config', () => {
  jest.spyOn(stripeConfig, 'validateStripeConfig');
  const config = { secretKey: 'test', publishableKey: 'test' };
  // Mock validation to return success
  expect(validateStripeConfig(config)).toBe(true);
});
```

---

### Option 3: Use Clearly Non-Matching Patterns
**Best for:** Keeping current test structure, avoiding allowlist

**Approach:**
- Use keys that pass validation but don't match GitHub's patterns
- Example: Use `sk_test_FAKE_` prefix with clearly fake content

**Pros:**
- ✅ Minimal code changes
- ✅ Tests remain readable
- ✅ No GitHub allowlist needed

**Cons:**
- ⚠️ GitHub patterns may change/expand
- ⚠️ Still might trigger scanning if patterns evolve

---

### Option 4: Environment Variables in CI/CD
**Best for:** CI/CD environments only

**Approach:**
- Store test keys as GitHub Secrets
- Use them in CI/CD workflows only
- Keep test files without keys

**Pros:**
- ✅ No keys in repository
- ✅ Secure for CI/CD

**Cons:**
- ⚠️ Doesn't solve local development
- ⚠️ More complex setup
- ⚠️ Doesn't help with git history

---

## Recommended Approach

**For this project, use Option 1 (GitHub Allowlist) + Option 2 (Gradual Refactoring):**

1. **Immediate:** Use GitHub's allowlist feature to unblock current push
   - Visit: https://github.com/briandchristian/stoneyoneburn/security/secret-scanning
   - Add test files to allowlist

2. **Short-term:** Keep current test structure with clearly fake keys
   - Keys already marked with "NOTAREALKEY" prefix
   - Document in test files that these are fake

3. **Long-term:** Gradually refactor to use mocks where appropriate
   - When touching test files, consider refactoring to mocks
   - Focus on testing behavior, not key format validation

---

## Documentation

All test files using fake API keys should include:
```typescript
/**
 * NOTE: These are fake test keys that match Stripe's format for validation testing.
 * They are NOT real Stripe API keys and will not work with Stripe's API.
 * GitHub secret scanning may flag these - they are allowlisted as false positives.
 */
```

---

## Future Considerations

- Monitor GitHub's secret scanning patterns for changes
- Consider using test fixtures/factories for key generation
- Document allowlist entries in repository documentation
- Review allowlist periodically to ensure it's still needed

