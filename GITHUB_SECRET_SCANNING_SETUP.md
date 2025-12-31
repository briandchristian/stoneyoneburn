# GitHub Secret Scanning Setup (Current Method - 2025)

## Current GitHub Approach

GitHub no longer uses "allowlists" for secret scanning. Instead, they use:
1. **Configuration file** (`.github/secret_scanning.yml`) to exclude paths
2. **Filters/Alerts** in the Security tab to mark false positives
3. **Push protection URLs** to allow specific secrets during push

## Method 1: Exclude Files via Configuration (Recommended)

This is the **permanent solution** that prevents test files from being scanned:

### Steps:

1. **The configuration file is already created:**
   - File: `.github/secret_scanning.yml`
   - This excludes all `*.test.ts` files from secret scanning

2. **Commit and push the configuration:**
   ```bash
   git add .github/secret_scanning.yml
   git commit -m "config: Exclude test files from secret scanning"
   git push origin main
   ```

3. **If push is still blocked**, you may need to allow the existing secrets first (see Method 2)

## Method 2: Mark Alerts as False Positives

For secrets already detected in your repository:

1. **Go to Security Tab:**
   ```
   https://github.com/briandchristian/stoneyoneburn/security
   ```

2. **Navigate to Secret Scanning:**
   - Click "Secret scanning" in the left sidebar
   - Or go to: `https://github.com/briandchristian/stoneyoneburn/security/secret-scanning`

3. **View Alerts:**
   - You'll see alerts for detected secrets
   - Look for alerts related to `src/config/stripe-config.test.ts`

4. **Mark as False Positive:**
   - Click on each alert
   - Click "Dismiss" or "Mark as false positive"
   - Select reason: "Used in tests"
   - Add comment: "Test file with fake Stripe API keys for validation testing"

5. **Apply Filters (if available):**
   - Use filters to bulk-dismiss test file alerts
   - Filter by path: `**/*.test.ts`
   - Mark all matching alerts as false positives

## Method 3: Allow via Push Error URL

When pushing and getting blocked:

1. **Use the URL provided in the error message:**
   ```
   https://github.com/briandchristian/stoneyoneburn/security/secret-scanning/unblock-secret/[ID]
   ```

2. **On the page:**
   - Review the detected secret
   - Click "Allow secret" or "Mark as false positive"
   - Add reason: "Test file with fake API keys"

3. **Repeat for each blocked commit:**
   - The error shows multiple commits (`9f6e7e7`, `68acec7`)
   - You may need to allow each one separately

4. **After allowing, push again:**
   ```bash
   git push origin main
   ```

## Complete Setup Process

### Step 1: Allow Existing Secrets (One-time)
1. Go to: `https://github.com/briandchristian/stoneyoneburn/security/secret-scanning`
2. Mark all test file alerts as false positives
3. Or use push error URLs to allow each secret

### Step 2: Exclude Test Files (Permanent)
1. The `.github/secret_scanning.yml` file is already created
2. Commit and push it:
   ```bash
   git add .github/secret_scanning.yml
   git commit -m "config: Exclude test files from secret scanning"
   git push origin main
   ```

### Step 3: Verify
1. Push should succeed after allowing existing secrets
2. Future commits won't trigger alerts for test files
3. Check CI/CD pipeline: `https://github.com/briandchristian/stoneyoneburn/actions`

## What the Configuration File Does

The `.github/secret_scanning.yml` file tells GitHub to:
- Ignore all `*.test.ts` files
- Ignore all `*.spec.ts` files  
- Ignore the specific Stripe test file
- Ignore test directories

This prevents future false positives from test files.

## Troubleshooting

**If push still fails after allowing secrets:**
- Wait 1-2 minutes for GitHub to process the changes
- Make sure you've allowed ALL secrets shown in the error
- Check that `.github/secret_scanning.yml` is committed

**If you can't find the Security tab:**
- Make sure you have admin access to the repository
- Try: `https://github.com/briandchristian/stoneyoneburn/security`

**If filters don't work:**
- Use the push error URL method instead
- Or manually mark each alert as false positive

## Notes

- The configuration file only affects **future** scans
- Existing alerts must be dismissed manually
- Push protection may still block until existing secrets are allowed
- The configuration applies to all branches

