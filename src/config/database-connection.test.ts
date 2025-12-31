/**
 * Database Connection Tests
 *
 * Tests for database connection functionality.
 * Following TDD: These tests should fail initially, then we implement the connection utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  testDatabaseConnection,
  getDatabaseConfig,
  validateDatabaseConfig,
  DatabaseConnectionError,
} from './database-connection';

describe('Database Connection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getDatabaseConfig', () => {
    it('should return database configuration from environment variables', () => {
      process.env.DB_HOST = 'test-host';
      process.env.DB_PORT = '5432';
      process.env.DB_USERNAME = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';
      process.env.DB_DATABASE = 'test-db';

      const config = getDatabaseConfig();

      expect(config.host).toBe('test-host');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('test-user');
      expect(config.password).toBe('test-pass');
      expect(config.database).toBe('test-db');
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_USERNAME;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_DATABASE;

      const config = getDatabaseConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(6543);
      expect(config.username).toBe('postgres');
      expect(config.password).toBe('postgres');
      expect(config.database).toBe('vendure');
    });

    it('should parse port as number', () => {
      process.env.DB_PORT = '5432';
      const config = getDatabaseConfig();
      expect(typeof config.port).toBe('number');
      expect(config.port).toBe(5432);
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should pass validation with valid configuration', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'vendure',
      };

      expect(() => validateDatabaseConfig(config)).not.toThrow();
    });

    it('should throw error if host is missing', () => {
      const config = {
        host: '',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'vendure',
      };

      expect(() => validateDatabaseConfig(config)).toThrow(/host/i);
    });

    it('should throw error if port is invalid', () => {
      const config = {
        host: 'localhost',
        port: 0,
        username: 'postgres',
        password: 'password',
        database: 'vendure',
      };

      expect(() => validateDatabaseConfig(config)).toThrow(/port/i);
    });

    it('should throw error if username is missing', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        username: '',
        password: 'password',
        database: 'vendure',
      };

      expect(() => validateDatabaseConfig(config)).toThrow(/username/i);
    });

    it('should throw error if password is missing', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '',
        database: 'vendure',
      };

      expect(() => validateDatabaseConfig(config)).toThrow(/password/i);
    });

    it('should throw error if database name is missing', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: '',
      };

      expect(() => validateDatabaseConfig(config)).toThrow(/database/i);
    });
  });

  describe('testDatabaseConnection', () => {
    it('should successfully connect to a valid database', async () => {
      // Use test database configuration
      // Use 'postgres' database which always exists in PostgreSQL
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: +(process.env.DB_PORT || 6543),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'postgres', // Use 'postgres' which always exists
      };

      const result = await testDatabaseConnection(config);

      if (!result.success && result.error) {
        // Log the actual error for debugging
        console.error('Connection failed:', result.error.message);
        console.error('Config used:', config);
      }

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.connectionTime).toBeDefined();
      expect(result.connectionTime).toBeGreaterThan(0);
    }, 15000); // 15 second timeout for database connection

    it('should fail to connect with invalid host', async () => {
      const config = {
        host: 'invalid-host-that-does-not-exist',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'vendure',
      };

      const result = await testDatabaseConnection(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(DatabaseConnectionError);
    }, 10000);

    it('should fail to connect with invalid port', async () => {
      const config = {
        host: 'localhost',
        port: 99999, // Invalid port
        username: 'postgres',
        password: 'postgres',
        database: 'vendure',
      };

      const result = await testDatabaseConnection(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should fail to connect with invalid credentials', async () => {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: +(process.env.DB_PORT || 6543),
        username: 'invalid-user',
        password: 'invalid-password',
        database: process.env.DB_DATABASE || 'vendure',
      };

      const result = await testDatabaseConnection(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(DatabaseConnectionError);
    }, 10000);

    it('should fail to connect to non-existent database', async () => {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: +(process.env.DB_PORT || 6543),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'non_existent_database_12345',
      };

      const result = await testDatabaseConnection(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should include connection details in error message', async () => {
      const config = {
        host: 'invalid-host',
        port: 5432,
        username: 'test-user',
        password: 'test-pass',
        database: 'test-db',
      };

      const result = await testDatabaseConnection(config);

      expect(result.success).toBe(false);
      if (result.error) {
        expect(result.error.message).toContain('invalid-host');
        expect(result.error.message).toContain('5432');
      }
    }, 10000);
  });
});
