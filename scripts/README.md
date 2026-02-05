# Test Logging Scripts

## Local-Only Test Logging

The `test-with-logs.ts` script provides test logging with automatic log rotation for local troubleshooting purposes.

**⚠️ IMPORTANT: This is for LOCAL USE ONLY and should NOT be used in CI/CD pipelines.**

## Features

- Automatically saves test output to log files
- Keeps the last 5 test runs (rotates automatically)
- Logs include timestamps, commands, stdout, stderr, and exit codes
- Supports running all tests, backend only, or frontend only

## Usage

### Run All Tests with Logging

```bash
npm run test:log
```

### Run Backend Tests Only with Logging

```bash
npm run test:log:backend
```

### Run Frontend Tests Only with Logging

```bash
npm run test:log:frontend
```

## Log Files

Logs are saved in the `test-logs/` directory:

- `test-run-1.log` - Most recent test run
- `test-run-2.log` - Second most recent
- `test-run-3.log` - Third most recent
- `test-run-4.log` - Fourth most recent
- `test-run-5.log` - Fifth most recent (oldest kept)

When a new test run completes, the logs automatically rotate:
- The oldest log (test-run-5.log) is deleted
- All other logs shift down (1→2, 2→3, 3→4, 4→5)
- The new run is saved as test-run-1.log

## Log Format

Each log file contains:
- Session start/end timestamps
- Test type (all, backend, or frontend)
- Individual test run details:
  - Test name
  - Command executed
  - Start/end times
  - Full stdout output
  - Full stderr output (if any)
  - Exit code
- Overall session summary with pass/fail status

## Notes

- The `test-logs/` directory is automatically created
- Log files are excluded from git (see `.gitignore`)
- This script is separate from the regular `npm test` command
- CI/CD pipelines should use `npm run ci` which does NOT use logging

---

## Backfill Seller Channels (Phase 5.4)

The `backfill-seller-channels.ts` script creates Vendure Channels for existing MarketplaceSellers that were registered before the channel-per-seller migration.

### Usage

```bash
npm run backfill-seller-channels
```

Or directly:

```bash
npx ts-node scripts/backfill-seller-channels.ts
```

### Prerequisites

- Database running
- Migration `1769523500000-AddChannelIdToMarketplaceSeller` applied

### What it does

For each MarketplaceSeller where `channelId` is null:

1. Creates a dedicated Vendure Channel (code: `seller-{id}`, token: `seller-{id}-token`)
2. Updates MarketplaceSeller.channelId
3. Assigns the seller's products to both the default channel and the new seller channel

---

## Email Verification Helper

The `show-latest-verification-url.js` script helps extract verification URLs from test emails in development.

### Usage

```bash
node scripts/show-latest-verification-url.js
```

This script:
- Finds the most recent verification email in `static/email/test-emails/`
- Extracts the verification token
- Displays a ready-to-use verification URL with the correct storefront port (3001)

### Example Output

```
📧 Latest Verification Email:
═══════════════════════════════════════════════════
To: user@example.com
Subject: Please verify your email address
Date: 1/2/2026, 12:02:34 AM

🔗 Verification URL:
═══════════════════════════════════════════════════
http://localhost:3001/verify?token=MjAyNi0wMS0wMlQwMDowMjozMy45NDBa_6DNNPG8UTYYZ241M

💡 Tip: Copy the URL above and paste it in your browser to verify the email address.
```