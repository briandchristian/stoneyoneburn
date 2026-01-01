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
