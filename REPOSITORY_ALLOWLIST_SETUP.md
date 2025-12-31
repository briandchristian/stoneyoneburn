# Repository-Level Allowlist Setup

## Problem
GitHub is blocking pushes because it detects secrets in multiple commits. A per-secret allowlist might not cover all instances.

## Solution: Repository-Level Pattern Allowlist

Set up a pattern-based allowlist that covers all test files:

### Steps:

1. **Go to Repository Settings:**
   ```
   https://github.com/briandchristian/stoneyoneburn/settings/security
   ```

2. **Navigate to Secret Scanning:**
   - In the left sidebar, click "Secret scanning"
   - Or go directly to:
   ```
   https://github.com/briandchristian/stoneyoneburn/settings/security_analysis
   ```

3. **Add Allowlist Pattern:**
   - Scroll to "Secret scanning allowlist" section
   - Click "New allowlist" or "Add pattern"
   - Add one of these patterns:

   **Option A (Specific file):**
   ```
   src/config/stripe-config.test.ts
   ```

   **Option B (All test files - Recommended):**
   ```
   **/*.test.ts
   ```

   **Option C (All test files with alternative extensions):**
   ```
   **/*.{test,spec}.ts
   ```

4. **Save the Pattern:**
   - Add a description: "Test files contain fake API keys for validation testing"
   - Click "Create" or "Save"

5. **Try Pushing Again:**
   ```bash
   git push origin main
   ```

## Alternative: Allow via Push Error URL (Multiple Times)

If you can't access repository settings, you may need to allow each commit separately:

1. **Check the push error** - it shows commits: `9f6e7e7` and `68acec7`
2. **Use the provided URL** to allow each secret instance
3. **GitHub may provide separate URLs** for each commit - allow all of them
4. **Try pushing again** after allowing all instances

## Verification

After setting up the allowlist:

1. **Push should succeed:**
   ```bash
   git push origin main
   ```

2. **Check CI/CD Pipeline:**
   - Go to: https://github.com/briandchristian/stoneyoneburn/actions
   - You should see the CI pipeline running automatically

3. **Verify Allowlist:**
   - Go to: https://github.com/briandchristian/stoneyoneburn/settings/security_analysis
   - Check that your pattern appears in the allowlist

## Why Repository-Level is Better

- ✅ Covers all commits (past and future)
- ✅ No need to allow each secret individually
- ✅ Prevents future issues with other test files
- ✅ One-time setup

## Troubleshooting

**If push still fails:**
- Wait 1-2 minutes for allowlist to propagate
- Make sure pattern matches exactly (case-sensitive)
- Try using wildcard pattern: `**/stripe-config.test.ts`
- Check that you have admin access to the repository

**If you don't have admin access:**
- Ask repository owner to set up the allowlist
- Or continue using push error URLs (less convenient)

