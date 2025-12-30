/**
 * Migration Rollback Tests
 *
 * Tests for database migration rollback functionality.
 * Following TDD: These tests should fail initially, then we implement the rollback utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getMigrationFiles,
  validateMigrationFiles,
  testMigrationRollback,
  getMigrationStatus,
  MigrationRollbackError,
  filenameToMigrationName,
} from './migration-rollback';
import { getDatabaseConfig } from './database-connection';
import path from 'path';
import { readdir, readFile } from 'fs/promises';

describe('Migration Rollback', () => {
  const originalEnv = process.env;
  const migrationsDir = path.join(process.cwd(), 'src', 'migrations');

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('filenameToMigrationName', () => {
    it('should convert TypeORM migration filename to migration name format', () => {
      // TypeORM format: {timestamp}-{Name}.ts -> {Name}{timestamp}
      expect(filenameToMigrationName('1735430400000-AddUniqueSkuConstraint.ts')).toBe(
        'AddUniqueSkuConstraint1735430400000'
      );
      expect(filenameToMigrationName('1234567890123-MyMigration.ts')).toBe(
        'MyMigration1234567890123'
      );
      expect(filenameToMigrationName('9999999999999-AnotherMigration.js')).toBe(
        'AnotherMigration9999999999999'
      );
    });

    it('should handle filenames without extension', () => {
      expect(filenameToMigrationName('1735430400000-AddUniqueSkuConstraint')).toBe(
        'AddUniqueSkuConstraint1735430400000'
      );
    });

    it('should return filename as-is if pattern does not match', () => {
      const nonStandardName = 'CustomMigrationName';
      expect(filenameToMigrationName(nonStandardName)).toBe(nonStandardName);
    });
  });

  describe('getMigrationFiles', () => {
    it('should return list of migration files from migrations directory', async () => {
      const files = await getMigrationFiles(migrationsDir);

      expect(Array.isArray(files)).toBe(true);
      // Should handle empty directory gracefully
      files.forEach((file) => {
        expect(typeof file).toBe('string');
        expect(file).toMatch(/\.(ts|js)$/);
      });
    });

    it('should return empty array if migrations directory does not exist', async () => {
      const files = await getMigrationFiles('/non-existent-directory');

      expect(files).toEqual([]);
    });

    it('should filter out non-migration files', async () => {
      const files = await getMigrationFiles(migrationsDir);

      // Should not include .gitkeep or other non-migration files
      const nonMigrationFiles = files.filter(
        (file) => !file.match(/\.(ts|js)$/) || file.includes('.gitkeep')
      );
      expect(nonMigrationFiles.length).toBe(0);
    });

    it('should throw MigrationRollbackError for non-ENOENT errors', async () => {
      // Mock readdir to throw a non-ENOENT error
      const fsPromises = require('fs/promises');
      const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES'; // Access denied error code
      jest.spyOn(fsPromises, 'readdir').mockImplementationOnce(() => Promise.reject(permissionError));

      await expect(getMigrationFiles(migrationsDir)).rejects.toThrow(
        MigrationRollbackError
      );

      // Restore original
      jest.restoreAllMocks();
    });

    it('should handle ENOENT error code correctly', async () => {
      // Mock readdir to throw an ENOENT error with proper error code
      const fsPromises = require('fs/promises');
      const enoentError = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      jest.spyOn(fsPromises, 'readdir').mockImplementationOnce(() => Promise.reject(enoentError));

      const files = await getMigrationFiles(migrationsDir);

      // Should return empty array for ENOENT errors
      expect(files).toEqual([]);

      // Restore original
      jest.restoreAllMocks();
    });

    it('should handle existsSync returning false', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

      const files = await getMigrationFiles(migrationsDir);

      expect(files).toEqual([]);

      // Restore original
      jest.restoreAllMocks();
    });
  });

  describe('validateMigrationFiles', () => {
    it('should pass validation for valid migration files', async () => {
      const files = await getMigrationFiles(migrationsDir);

      // If no migration files exist, validation should pass (empty is valid)
      if (files.length === 0) {
        expect(() => validateMigrationFiles(files)).not.toThrow();
      } else {
        // If files exist, they should be valid
        expect(() => validateMigrationFiles(files)).not.toThrow();
      }
    });

    it('should throw error for invalid migration file names', () => {
      const invalidFiles = ['invalid-file.txt', 'no-extension', 'migration'];

      expect(() => validateMigrationFiles(invalidFiles)).toThrow(/migration.*format/i);
    });

    it('should validate migration file naming convention', () => {
      // Valid migration file names (Vendure uses timestamp format)
      const validFiles = [
        '1234567890-AddCustomFields.ts',
        '1234567891-UpdateProductTable.js',
        'Migration1234567892.ts',
      ];

      expect(() => validateMigrationFiles(validFiles)).not.toThrow();
    });

    it('should throw error for files with path separators', () => {
      const invalidFiles = ['../malicious.ts', 'folder/file.ts', 'folder\\file.js'];

      invalidFiles.forEach((file) => {
        expect(() => validateMigrationFiles([file])).toThrow(/path separator/i);
      });
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration status from database', async () => {
      const dbConfig = getDatabaseConfig();
      // Use a test database that exists
      dbConfig.database = 'postgres';

      const status = await getMigrationStatus(dbConfig);

      expect(status).toBeDefined();
      expect(Array.isArray(status.executedMigrations)).toBe(true);
      expect(Array.isArray(status.pendingMigrations)).toBe(true);
    }, 10000);

    it('should handle database connection errors gracefully', async () => {
      const invalidConfig = {
        host: 'invalid-host',
        port: 5432,
        username: 'invalid',
        password: 'invalid',
        database: 'invalid',
      };

      await expect(getMigrationStatus(invalidConfig)).rejects.toThrow(
        MigrationRollbackError
      );
    }, 10000);

    it('should return empty status when migrations table does not exist', async () => {
      const dbConfig = getDatabaseConfig();
      dbConfig.database = 'postgres';

      const status = await getMigrationStatus(dbConfig);

      // Should return valid status object even if table doesn't exist
      expect(status).toBeDefined();
      expect(status.executedMigrations).toEqual([]);
      expect(status.totalExecuted).toBe(0);
    }, 10000);
  });

  describe('testMigrationRollback', () => {
    it('should successfully test rollback when no migrations exist', async () => {
      const dbConfig = getDatabaseConfig();
      dbConfig.database = 'postgres'; // Use existing database

      const result = await testMigrationRollback(dbConfig, migrationsDir);

      expect(result.success).toBe(true);
      expect(result.canRollback).toBe(false); // No migrations to rollback
      expect(result.error).toBeUndefined();
    }, 15000);

    it('should detect if rollback is possible', async () => {
      const dbConfig = getDatabaseConfig();
      dbConfig.database = 'postgres';

      const result = await testMigrationRollback(dbConfig, migrationsDir);

      expect(result.success).toBe(true);
      expect(typeof result.canRollback).toBe('boolean');
      expect(result.executedMigrationsCount).toBeDefined();
      expect(typeof result.executedMigrationsCount).toBe('number');
    }, 15000);

    it('should return error details if rollback test fails', async () => {
      const invalidConfig = {
        host: 'invalid-host',
        port: 5432,
        username: 'invalid',
        password: 'invalid',
        database: 'invalid',
      };

      const result = await testMigrationRollback(invalidConfig, migrationsDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(MigrationRollbackError);
    }, 10000);

    it('should validate migration files before testing rollback', async () => {
      const dbConfig = getDatabaseConfig();
      dbConfig.database = 'postgres';

      const result = await testMigrationRollback(dbConfig, migrationsDir);

      // Should validate files even if none exist
      expect(result.success).toBe(true);
      expect(result.migrationFilesCount).toBeDefined();
      expect(typeof result.migrationFilesCount).toBe('number');
    }, 15000);
  });

  describe('Migration Safety', () => {
    it('should verify migrations directory exists', async () => {
      const files = await getMigrationFiles(migrationsDir);

      // Should not throw error even if directory is empty
      expect(Array.isArray(files)).toBe(true);
    });

    it('should handle missing migrations gracefully', async () => {
      const dbConfig = getDatabaseConfig();
      dbConfig.database = 'postgres';

      const result = await testMigrationRollback(dbConfig, migrationsDir);

      // Should succeed even with no migrations
      expect(result.success).toBe(true);
    }, 15000);
  });
});
