/**
 * Security Configuration Tests
 *
 * Tests for production security configurations.
 * Following TDD: These tests should fail initially, then we implement the security config.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getSecurityConfig, isProductionMode, validateSecurityConfig } from './security';

describe('Security Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test to ensure test isolation
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  describe('isProductionMode', () => {
    it('should return true when APP_ENV is production', () => {
      process.env.APP_ENV = 'production';
      expect(isProductionMode()).toBe(true);
    });

    it('should return false when APP_ENV is dev', () => {
      process.env.APP_ENV = 'dev';
      expect(isProductionMode()).toBe(false);
    });

    it('should return false when APP_ENV is not set', () => {
      (process.env as { APP_ENV?: string }).APP_ENV = undefined;
      expect(isProductionMode()).toBe(false);
    });
  });

  describe('getSecurityConfig', () => {
    it('should disable debug modes in production', () => {
      process.env.APP_ENV = 'production';
      const config = getSecurityConfig();

      expect(config.apiOptions.adminApiDebug).toBeUndefined();
      expect(config.apiOptions.shopApiDebug).toBeUndefined();
    });

    it('should enable debug modes in development', () => {
      process.env.APP_ENV = 'dev';
      const config = getSecurityConfig();

      expect(config.apiOptions.adminApiDebug).toBe(true);
      expect(config.apiOptions.shopApiDebug).toBe(true);
    });

    it('should disable synchronize in production', () => {
      process.env.APP_ENV = 'production';
      const config = getSecurityConfig();

      expect(config.dbConnectionOptions.synchronize).toBe(false);
    });

    it('should enable synchronize in development', () => {
      process.env.APP_ENV = 'dev';
      const config = getSecurityConfig();

      expect(config.dbConnectionOptions.synchronize).toBe(true);
    });

    it('should disable detailed logging in production', () => {
      process.env.APP_ENV = 'production';
      const config = getSecurityConfig();

      expect(config.dbConnectionOptions.logging).toBe(false);
    });

    it('should enable logging in development', () => {
      process.env.APP_ENV = 'dev';
      const config = getSecurityConfig();

      expect(config.dbConnectionOptions.logging).toBe(true);
    });

    it('should set trustProxy correctly', () => {
      process.env.APP_ENV = 'production';
      const prodConfig = getSecurityConfig();
      expect(prodConfig.apiOptions.trustProxy).toBe(1);

      process.env.APP_ENV = 'dev';
      const devConfig = getSecurityConfig();
      expect(devConfig.apiOptions.trustProxy).toBe(false);
    });
  });

  describe('validateSecurityConfig', () => {
    it('should throw error if synchronize is true in production', () => {
      process.env.APP_ENV = 'production';
      const config = {
        dbConnectionOptions: {
          synchronize: true,
        },
      };

      expect(() =>
        validateSecurityConfig(config as unknown as Partial<import('@vendure/core').VendureConfig>)
      ).toThrow(/synchronize.*production/i);
    });

    it('should pass validation in development with synchronize true', () => {
      process.env.APP_ENV = 'dev';
      const config = {
        dbConnectionOptions: {
          synchronize: true,
        },
      };

      expect(() =>
        validateSecurityConfig(config as unknown as Partial<import('@vendure/core').VendureConfig>)
      ).not.toThrow();
    });

    it('should throw error if debug modes are enabled in production', () => {
      process.env.APP_ENV = 'production';
      const config = {
        apiOptions: {
          adminApiDebug: true,
          shopApiDebug: true,
        },
      };

      expect(() =>
        validateSecurityConfig(config as unknown as Partial<import('@vendure/core').VendureConfig>)
      ).toThrow(/debug.*production/i);
    });
  });
});
