# GitHub Secret Scanning Allowlist Setup

## Quick Setup Guide

GitHub's secret scanning is blocking pushes because test files contain fake Stripe API keys that match the pattern. We need to add these to the allowlist.

## Method 1: Via Push Error URL (Easiest)

1. **When you push and get blocked**, GitHub provides a URL like:
   ```
   https://github.com/briandchristian/stoneyoneburn/security/secret-scanning/unblock-secret/[ID]
   ```

2. **Click the URL** or copy it to your browser

3. **On the allowlist page:**
   - Review the detected secret (it will show the test file and line)
   - Click "Allow secret" or "Mark as false positive"
   - Add a reason: "Test file with fake API keys for validation testing"

4. **After allowing**, try pushing again:
   ```bash
   git push origin main
   ```

## Method 2: Via Repository Settings (Permanent)

1. **Go to your repository:**
   ```
   https://github.com/briandchristian/stoneyoneburn
   ```

2. **Navigate to Settings:**
   - Click "Settings" tab (top right, requires admin access)
   - Go to "Security" → "Secret scanning" (left sidebar)

3. **Add Allowlist Entry:**
   - Click "Allowlist" or "Add pattern"
   - Add pattern: `src/config/stripe-config.test.ts`
   - Or add pattern: `**/*.test.ts` (to allow all test files)
   - Reason: "Test files contain fake API keys for validation testing"

4. **Save and push again**

## Method 3: Via GitHub Web Interface (Current Blocked Push)

If you have a current blocked push:

1. **Check the push error message** - it contains a URL like:
   ```
   https://github.com/briandchristian/stoneyoneburn/security/secret-scanning/unblock-secret/[ID]
   ```

2. **Open that URL in your browser**

3. **Review the secret:**
   - File: `src/config/stripe-config.test.ts`
   - Lines: Usually around line 76 and 171 (the `sk_live_...` keys)

4. **Click "Allow secret"** or "Mark as false positive"

5. **Add comment:** "Test file with fake Stripe API keys for validation testing. These are NOT real keys."

6. **Confirm** and try pushing again

## Files That Need Allowlisting

- `src/config/stripe-config.test.ts` - Contains fake Stripe test keys

## Verification

After setting up the allowlist:

1. Try pushing:
   ```bash
   git push origin main
   ```

2. If successful, the CI/CD pipeline will run automatically

3. Check the Actions tab to see the pipeline status:
   ```
   https://github.com/briandchristian/stoneyoneburn/actions
   ```

## Troubleshooting

**If you don't have admin access:**
- Ask a repository admin to set up the allowlist
- Or use the push error URL method (works for any contributor)

**If the allowlist doesn't work:**
- Make sure you're allowing the correct file path
- Check that the pattern matches exactly (case-sensitive)
- Try using a wildcard pattern: `**/stripe-config.test.ts`

**If you want to allow all test files:**
- Use pattern: `**/*.test.ts`
- Or: `**/*.spec.ts`
- This prevents future issues with other test files

## Notes

- The allowlist is repository-specific
- Once set up, it applies to all future commits
- You may need to allow multiple secrets if they're detected in different commits
- The allowlist doesn't affect git history - old commits may still show warnings

