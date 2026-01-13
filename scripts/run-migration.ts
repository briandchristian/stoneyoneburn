/**
 * Migration Runner Script
 *
 * Runs Vendure migrations programmatically without interactive prompts.
 * This bypasses TTY initialization issues in PowerShell.
 */

import { runMigrations } from '@vendure/core';
import { config } from '../src/vendure-config';

runMigrations(config)
  .then(() => {
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration error:', err.message);
    console.error(err);
    process.exit(1);
  });
