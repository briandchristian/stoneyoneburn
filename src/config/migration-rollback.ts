/**
 * Migration Rollback Utilities
 *
 * Provides utilities for testing and validating database migration rollbacks.
 * Note: These utilities check rollback capability but do not actually perform rollbacks
 * to avoid data loss during testing.
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Client } from 'pg';
import { DatabaseConfig } from './database-connection';

export interface MigrationStatus {
  executedMigrations: string[];
  pendingMigrations: string[];
  lastExecutedMigration?: string;
  totalExecuted: number;
  totalPending: number;
}

/**
 * Convert migration filename to TypeORM migration name format
 * 
 * TypeORM migration naming convention:
 * - Filename: {timestamp}-{Name}.ts (e.g., "1735430400000-AddUniqueSkuConstraint.ts")
 * - Migration name (stored in DB): {Name}{timestamp} (e.g., "AddUniqueSkuConstraint1735430400000")
 * 
 * @param filename Migration filename (with or without extension)
 * @returns Migration name as stored in TypeORM's migrations table
 */
export function filenameToMigrationName(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(ts|js)$/, '');
  
  // Match pattern: {timestamp}-{Name}
  // TypeORM migration files follow this pattern: timestamp-ClassName
  const match = nameWithoutExt.match(/^(\d+)-(.+)$/);
  
  if (match) {
    const [, timestamp, name] = match;
    // Convert to TypeORM format: {Name}{timestamp}
    return `${name}${timestamp}`;
  }
  
  // If pattern doesn't match, return as-is (might be a different naming convention)
  return nameWithoutExt;
}

export interface RollbackTestResult {
  success: boolean;
  canRollback: boolean;
  executedMigrationsCount: number;
  migrationFilesCount: number;
  error?: MigrationRollbackError;
  status?: MigrationStatus;
}

/**
 * Custom error class for migration rollback errors
 */
export class MigrationRollbackError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MigrationRollbackError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MigrationRollbackError);
    }
  }
}

/**
 * Get list of migration files from migrations directory
 */
export async function getMigrationFiles(migrationsDir: string): Promise<string[]> {
  try {
    if (!existsSync(migrationsDir)) {
      return [];
    }

    const files = await readdir(migrationsDir);
    
    // Filter for TypeScript and JavaScript migration files
    // Exclude .gitkeep and other non-migration files
    const migrationFiles = files.filter((file) => {
      const isMigrationFile = /\.(ts|js)$/.test(file);
      const isNotKeepFile = !file.includes('.gitkeep') && !file.includes('.keep');
      return isMigrationFile && isNotKeepFile;
    });

    return migrationFiles.sort(); // Sort for consistent ordering
  } catch (error) {
    // Check for ENOENT error code (directory doesn't exist)
    // Node.js file system errors have the error code in the 'code' property
    const errnoError = error as NodeJS.ErrnoException;
    if (errnoError.code === 'ENOENT') {
      // Directory doesn't exist - return empty array
      return [];
    }
    throw new MigrationRollbackError(
      `Failed to read migrations directory: ${migrationsDir}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validate migration file names and format
 * @throws Error if migration files are invalid
 */
export function validateMigrationFiles(files: string[]): void {
  for (const file of files) {
    // Check file extension
    if (!/\.(ts|js)$/.test(file)) {
      throw new Error(
        `Invalid migration file format: ${file}. Migration files must have .ts or .js extension.`
      );
    }

    // Check for suspicious file names (basic validation)
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      throw new Error(
        `Invalid migration file name: ${file}. File names should not contain path separators.`
      );
    }
  }
}

/**
 * Get migration status from database
 * Queries TypeORM's migrations table to see which migrations have been executed
 */
export async function getMigrationStatus(
  dbConfig: DatabaseConfig
): Promise<MigrationStatus> {
  let client: Client | null = null;

  try {
    client = new Client({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      connectionTimeoutMillis: 5000,
    });

    await client.connect();

    // Check if migrations table exists (TypeORM creates this automatically)
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    const migrationsTableExists = tableCheck.rows[0]?.exists === true;

    if (!migrationsTableExists) {
      // No migrations table means no migrations have been run
      return {
        executedMigrations: [],
        pendingMigrations: [],
        totalExecuted: 0,
        totalPending: 0,
      };
    }

    // Get executed migrations from TypeORM's migrations table
    const result = await client.query(`
      SELECT name, timestamp 
      FROM migrations 
      ORDER BY timestamp DESC;
    `);

    const executedMigrations = result.rows.map((row) => row.name);

    return {
      executedMigrations,
      pendingMigrations: [], // Will be determined by comparing with files
      lastExecutedMigration: executedMigrations[0] || undefined,
      totalExecuted: executedMigrations.length,
      totalPending: 0, // Will be calculated when comparing with files
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';

    throw new MigrationRollbackError(
      `Failed to get migration status: ${errorMessage}`,
      error instanceof Error ? error : undefined
    );
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Test migration rollback capability
 * This function checks if rollbacks are possible without actually performing them
 */
export async function testMigrationRollback(
  dbConfig: DatabaseConfig,
  migrationsDir: string
): Promise<RollbackTestResult> {
  try {
    // Get migration files
    const migrationFiles = await getMigrationFiles(migrationsDir);
    
    // Validate migration files
    validateMigrationFiles(migrationFiles);

    // Get migration status from database
    const status = await getMigrationStatus(dbConfig);

    // Determine if rollback is possible
    // Rollback is possible if there are executed migrations
    const canRollback = status.executedMigrations.length > 0;

    // Calculate pending migrations (files that haven't been executed)
    // Convert filenames to TypeORM migration names for comparison
    // TypeORM stores migration names as {Name}{timestamp}, not {timestamp}-{Name}
    const pendingMigrations = migrationFiles.filter((file) => {
      const migrationName = filenameToMigrationName(file);
      return !status.executedMigrations.includes(migrationName);
    });

    return {
      success: true,
      canRollback,
      executedMigrationsCount: status.executedMigrations.length,
      migrationFilesCount: migrationFiles.length,
      status: {
        ...status,
        pendingMigrations,
        totalPending: pendingMigrations.length,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      canRollback: false,
      executedMigrationsCount: 0,
      migrationFilesCount: 0,
      error: new MigrationRollbackError(
        `Migration rollback test failed: ${errorMessage}`,
        error instanceof Error ? error : undefined
      ),
    };
  }
}
