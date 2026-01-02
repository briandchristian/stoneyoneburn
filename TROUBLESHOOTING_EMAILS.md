# Troubleshooting Missing Test Emails

If you're not seeing test emails in `static/email/test-emails/`, here are the steps to diagnose and fix:

## Critical: Job Queue Worker Must Be Running

**Emails in Vendure are sent asynchronously via a Job Queue.** The worker process must be running to process email jobs.

### Check if Worker is Running

The development setup requires **TWO processes**:

1. **Server** (`npm run dev:server`) - Handles GraphQL requests
2. **Worker** (`npm run dev:worker`) - Processes background jobs (including emails)

### Verify Your Setup

1. **Check running processes:**
   - You should see both `dev:server` and `dev:worker` running
   - If you're using `npm run dev`, it should start both automatically

2. **If emails aren't appearing:**
   - Make sure both server and worker are running
   - Check server console for any errors
   - Check worker console for job processing logs

## Common Issues

### Issue 1: Worker Not Running

**Symptom:** Registration succeeds but no email is generated.

**Solution:**
```bash
# Make sure both processes are running
npm run dev

# Or run them separately:
npm run dev:server   # Terminal 1
npm run dev:worker   # Terminal 2
```

### Issue 2: Job Queue Not Processing

**Symptom:** Emails are queued but never processed.

**Solution:**
1. Check worker logs for errors
2. Restart the worker process
3. Verify JobQueue configuration in `vendure-config.ts`:
   ```typescript
   DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true })
   ```

### Issue 3: Wrong Output Directory

**Symptom:** Emails are being generated but saved to wrong location.

**Check:**
- Verify `outputPath` in `vendure-config.ts`:
  ```typescript
  outputPath: path.join(__dirname, '../static/email/test-emails')
  ```
- This resolves to: `static/email/test-emails/` (relative to project root)

### Issue 4: Permissions Issue

**Symptom:** Worker can't write to test-emails directory.

**Solution:**
1. Ensure `static/email/test-emails/` directory exists
2. Check write permissions on the directory
3. Create directory if missing:
   ```bash
   mkdir -p static/email/test-emails
   ```

### Issue 5: Emails Being Processed but Not Saved

**Symptom:** No errors, but files aren't appearing.

**Check:**
1. Verify `devMode: true` is set in EmailPlugin config
2. Check that you're in development mode (`APP_ENV=dev`)
3. Look for errors in worker console about file writing

## Testing Email Generation

1. **Register a new account** via the storefront
2. **Check worker console** - you should see job processing logs
3. **Wait a few seconds** - emails are processed asynchronously
4. **Check the directory:**
   ```bash
   ls static/email/test-emails/
   ```
5. **Use the helper script:**
   ```bash
   node scripts/show-latest-verification-url.js
   ```

## Viewing Emails via Mailbox

If the worker is running, you can also view emails via the mailbox route:

```
http://localhost:3000/mailbox
```

This shows all test emails in a web interface.

## Manual Verification

If emails still aren't appearing:

1. **Check server logs** for registration success
2. **Check worker logs** for job processing
3. **Check database** for queued jobs (if you have DB access)
4. **Restart both server and worker** processes

## Quick Diagnostic Steps

1. ✅ Verify worker is running: `ps aux | grep "index-worker"` (or check Task Manager on Windows)
2. ✅ Check directory exists: `ls static/email/test-emails/`
3. ✅ Register a new test account
4. ✅ Check worker console for job processing
5. ✅ Wait 2-3 seconds for async processing
6. ✅ List directory: `ls static/email/test-emails/`
7. ✅ Run helper: `node scripts/show-latest-verification-url.js`

## Still Not Working?

If emails still aren't appearing after checking all above:

1. **Check Vendure server console** for any email-related errors
2. **Check worker console** for job processing errors
3. **Verify EmailPlugin is properly configured** in `vendure-config.ts`
4. **Try restarting both server and worker**
5. **Check if `APP_ENV=dev`** is set (devMode requires this)
