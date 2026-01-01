/**
 * Test Runner with Log Rotation
 * 
 * This script runs tests and saves output to rotating log files.
 * Keeps the last 5 test runs for troubleshooting purposes.
 * 
 * LOCAL USE ONLY - Not for CI/CD
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const LOG_DIR = path.join(process.cwd(), 'test-logs');
const MAX_LOGS = 5;

interface TestRun {
  name: string;
  command: string;
  logFile: string;
}

/**
 * Rotates log files, keeping only the last MAX_LOGS runs
 */
async function rotateLogs(): Promise<void> {
  try {
    // Ensure log directory exists
    await fs.mkdir(LOG_DIR, { recursive: true });

    // Get existing log files
    const files = await fs.readdir(LOG_DIR);
    const logFiles = files
      .filter((f) => f.startsWith('test-run-') && f.endsWith('.log'))
      .sort((a, b) => {
        // Extract numbers from filenames (test-run-1.log -> 1)
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

    // Shift existing logs down (5 -> 6, 4 -> 5, etc.)
    for (let i = logFiles.length - 1; i >= 0; i--) {
      const oldNum = parseInt(logFiles[i].match(/\d+/)?.[0] || '0', 10);
      const newNum = oldNum + 1;
      const oldPath = path.join(LOG_DIR, logFiles[i]);
      const newPath = path.join(LOG_DIR, `test-run-${newNum}.log`);

      // If we're at max, delete the oldest
      if (newNum > MAX_LOGS) {
        await fs.unlink(oldPath).catch(() => {
          // Ignore errors if file doesn't exist
        });
      } else {
        await fs.rename(oldPath, newPath).catch(() => {
          // Ignore errors if file doesn't exist
        });
      }
    }
  } catch (error) {
    console.error('Error rotating logs:', error);
  }
}

/**
 * Runs a test command and captures output
 */
async function runTest(testRun: TestRun): Promise<{ success: boolean; output: string }> {
  const startTime = new Date().toISOString();
  console.log(`\n[${startTime}] Running: ${testRun.name}`);
  console.log(`Command: ${testRun.command}`);

  try {
    const { stdout, stderr } = await execAsync(testRun.command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    const output = `=== ${testRun.name} ===
Started: ${startTime}
Command: ${testRun.command}
${'='.repeat(60)}

STDOUT:
${stdout}

${stderr ? `STDERR:\n${stderr}\n` : ''}
${'='.repeat(60)}
Completed: ${new Date().toISOString()}
Exit Code: 0
${'='.repeat(60)}\n\n`;

    return { success: true, output };
  } catch (error: any) {
    const output = `=== ${testRun.name} ===
Started: ${startTime}
Command: ${testRun.command}
${'='.repeat(60)}

ERROR:
${error.message}

STDOUT:
${error.stdout || '(none)'}

STDERR:
${error.stderr || '(none)'}

${'='.repeat(60)}
Completed: ${new Date().toISOString()}
Exit Code: ${error.code || 1}
${'='.repeat(60)}\n\n`;

    return { success: false, output };
  }
}

/**
 * Main function to run all tests with logging
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all'; // 'all', 'backend', 'frontend'

  console.log('='.repeat(60));
  console.log('Test Runner with Log Rotation (Local Use Only)');
  console.log('='.repeat(60));

  // Rotate existing logs
  await rotateLogs();

  // Determine which tests to run
  const testRuns: TestRun[] = [];

  if (testType === 'all' || testType === 'backend') {
    testRuns.push({
      name: 'Backend Tests',
      command: 'npm test',
      logFile: path.join(LOG_DIR, 'test-run-1.log'),
    });
  }

  if (testType === 'all' || testType === 'frontend') {
    testRuns.push({
      name: 'Frontend Tests',
      command: 'cd storefront && npm test',
      logFile: path.join(LOG_DIR, 'test-run-1.log'),
    });
  }

  if (testRuns.length === 0) {
    console.error('Invalid test type. Use: all, backend, or frontend');
    process.exit(1);
  }

  // Run tests and collect output
  const allOutput: string[] = [];
  const runStartTime = new Date().toISOString();

  allOutput.push(`TEST RUN SESSION
${'='.repeat(60)}
Started: ${runStartTime}
Test Type: ${testType}
${'='.repeat(60)}\n\n`);

  let allSuccess = true;

  for (const testRun of testRuns) {
    const result = await runTest(testRun);
    allOutput.push(result.output);
    if (!result.success) {
      allSuccess = false;
    }
  }

  const runEndTime = new Date().toISOString();
  allOutput.push(`\n${'='.repeat(60)}
SESSION SUMMARY
${'='.repeat(60)}
Started: ${runStartTime}
Completed: ${runEndTime}
Overall Status: ${allSuccess ? 'PASSED' : 'FAILED'}
${'='.repeat(60)}`);

  // Write to log file
  const logContent = allOutput.join('\n');
  const logPath = path.join(LOG_DIR, 'test-run-1.log');
  await fs.writeFile(logPath, logContent, 'utf-8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test run complete. Log saved to: ${logPath}`);
  console.log(`Log directory: ${LOG_DIR}`);
  console.log(`Keeping last ${MAX_LOGS} test runs`);
  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(allSuccess ? 0 : 1);
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
