/**
 * Environment Variable Validation Tests
 *
 * Tests for validating required environment variables and security configurations.
 * Following TDD: These tests should fail initially, then we implement the validation.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  validateEnvironmentVariables,
  getRequiredEnvVars,
  validateCriticalEnvVars,
  CRITICAL_ENV_VARS,
} from './env-validation';

describe('Environment Variable Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    it('should throw error when required variables are missing', () => {
      // Arrange: Clear all environment variables
      (process.env as { SUPERADMIN_USERNAME?: string }).SUPERADMIN_USERNAME = undefined;
      (process.env as { SUPERADMIN_PASSWORD?: string }).SUPERADMIN_PASSWORD = undefined;
      (process.env as { COOKIE_SECRET?: string }).COOKIE_SECRET = undefined;

      // Act & Assert
      expect(() => validateEnvironmentVariables()).toThrow();
    });

    it('should pass when all required variables are present', () => {
      // Arrange: Set all required variables
      process.env.SUPERADMIN_USERNAME = 'admin';
      process.env.SUPERADMIN_PASSWORD = 'secure-password';
      process.env.COOKIE_SECRET =
        'a-very-long-cookie-secret-key-that-meets-minimum-length-requirement';

      // Act & Assert
      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should validate cookie secret is strong enough', () => {
      // Arrange: Set weak cookie secret
      process.env.SUPERADMIN_USERNAME = 'admin';
      process.env.SUPERADMIN_PASSWORD = 'secure-password';
      process.env.COOKIE_SECRET = 'weak'; // Too short

      // Act & Assert
      expect(() => validateEnvironmentVariables()).toThrow(/cookie secret/i);
    });

    it('should validate password is strong enough in production', () => {
      // Arrange: Set weak password in production
      process.env.APP_ENV = 'production';
      process.env.SUPERADMIN_USERNAME = 'admin';
      process.env.SUPERADMIN_PASSWORD = '123'; // Too weak
      process.env.COOKIE_SECRET = 'a-very-long-and-secure-cookie-secret-key';

      // Act & Assert
      expect(() => validateEnvironmentVariables()).toThrow(/password/i);
    });

    it('should allow weak passwords in development mode', () => {
      // Arrange: Set weak password in development
      process.env.APP_ENV = 'dev';
      process.env.SUPERADMIN_USERNAME = 'admin';
      process.env.SUPERADMIN_PASSWORD = '123';
      process.env.COOKIE_SECRET = 'dev-secret-that-is-long-enough-to-pass-validation-check';

      // Act & Assert
      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should validate database connection variables in production', () => {
      // Arrange: Missing database variables in production
      process.env.APP_ENV = 'production';
      process.env.SUPERADMIN_USERNAME = 'admin';
      process.env.SUPERADMIN_PASSWORD = 'secure-password-123';
      process.env.COOKIE_SECRET = 'a-very-long-and-secure-cookie-secret-key';
      (process.env as { DB_HOST?: string }).DB_HOST = undefined;
      (process.env as { DB_PORT?: string }).DB_PORT = undefined;
      (process.env as { DB_USERNAME?: string }).DB_USERNAME = undefined;
      (process.env as { DB_PASSWORD?: string }).DB_PASSWORD = undefined;
      (process.env as { DB_DATABASE?: string }).DB_DATABASE = undefined;

      // Act & Assert
      // The error message contains variable names like "DB_HOST", "DB_PORT", etc.
      // It does not contain the word "database", so we match on "DB_" or "environment"
      expect(() => validateEnvironmentVariables()).toThrow(/DB_|environment/i);
    });
  });

  describe('validateCriticalEnvVars', () => {
    it('should throw error when critical variables are missing', () => {
      // Arrange: Clear critical environment variables
      (process.env as { SUPERADMIN_USERNAME?: string }).SUPERADMIN_USERNAME = undefined;
      (process.env as { SUPERADMIN_PASSWORD?: string }).SUPERADMIN_PASSWORD = undefined;
      (process.env as { COOKIE_SECRET?: string }).COOKIE_SECRET = undefined;

      // Act & Assert
      expect(() => validateCriticalEnvVars()).toThrow(/critical/i);
    });

    it('should pass when all critical variables are present', () => {
      // Arrange: Set all critical variables
      process.env.SUPERADMIN_USERNAME = 'admin';
      process.env.SUPERADMIN_PASSWORD = 'password';
      process.env.COOKIE_SECRET = 'secret';

      // Act & Assert
      expect(() => validateCriticalEnvVars()).not.toThrow();
    });

    it('should always require critical variables regardless of environment', () => {
      // Arrange: Test in both dev and production
      const environments = ['dev', 'production'];

      for (const env of environments) {
        process.env.APP_ENV = env;
        (process.env as { SUPERADMIN_USERNAME?: string }).SUPERADMIN_USERNAME = undefined;
        (process.env as { SUPERADMIN_PASSWORD?: string }).SUPERADMIN_PASSWORD = undefined;
        (process.env as { COOKIE_SECRET?: string }).COOKIE_SECRET = undefined;

        // Act & Assert: Should throw in both environments
        expect(() => validateCriticalEnvVars()).toThrow(/critical/i);
      }
    });
  });

  describe('getRequiredEnvVars', () => {
    it('should return list of required environment variables', () => {
      // Act
      const required = getRequiredEnvVars();

      // Assert
      expect(required).toContain('SUPERADMIN_USERNAME');
      expect(required).toContain('SUPERADMIN_PASSWORD');
      expect(required).toContain('COOKIE_SECRET');
      expect(Array.isArray(required)).toBe(true);
    });

    it('should return different variables for production vs development', () => {
      // Act
      const devVars = getRequiredEnvVars('dev');
      const prodVars = getRequiredEnvVars('production');

      // Assert
      expect(prodVars.length).toBeGreaterThanOrEqual(devVars.length);
      expect(prodVars).toContain('DB_HOST');
    });

    it('should always include critical variables', () => {
      // Act
      const devVars = getRequiredEnvVars('dev');
      const prodVars = getRequiredEnvVars('production');

      // Assert: Critical vars should be in both
      for (const criticalVar of CRITICAL_ENV_VARS) {
        expect(devVars).toContain(criticalVar);
        expect(prodVars).toContain(criticalVar);
      }
    });
  });
});
