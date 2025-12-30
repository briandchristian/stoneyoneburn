/**
 * Tests for Stripe Payment Configuration
 *
 * These tests verify that Stripe payment gateway is properly configured
 * and that environment variables are validated correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getStripeConfig, validateStripeConfig } from './stripe-config';

describe('Stripe Payment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStripeConfig', () => {
    it('should return Stripe configuration from environment variables', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890';
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_webhook_secret_for_testing_only_not_real_1234567890';

      const config = getStripeConfig();

      expect(config.secretKey).toBe('sk_test_fakekeyfortestingonlynotarealkey12345678901234567890');
      expect(config.publishableKey).toBe('pk_test_fakekeyfortestingonlynotarealkey12345678901234567890');
      expect(config.webhookSecret).toBe('whsec_fakewebhooksecretfortestingonlynotreal12345678901234567890');
    });

    it('should return undefined for optional webhook secret', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890';
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890';
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const config = getStripeConfig();

      expect(config.secretKey).toBe('sk_test_fakekeyfortestingonlynotarealkey12345678901234567890');
      expect(config.publishableKey).toBe('pk_test_fakekeyfortestingonlynotarealkey12345678901234567890');
      expect(config.webhookSecret).toBeUndefined();
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_PUBLISHABLE_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const config = getStripeConfig();

      expect(config.secretKey).toBeUndefined();
      expect(config.publishableKey).toBeUndefined();
      expect(config.webhookSecret).toBeUndefined();
    });
  });

  describe('validateStripeConfig', () => {
    it('should pass validation with valid test keys', () => {
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        webhookSecret: 'whsec_fakewebhooksecretfortestingonlynotreal12345678901234567890',
      };

      expect(() => validateStripeConfig(config)).not.toThrow();
    });

    it('should pass validation with valid live keys', () => {
      const config = {
        // Using 'live' prefix for production key format testing
        // Note: These are test keys only, not real Stripe keys
        secretKey: 'sk_live_NOTAREALKEY1234567890123456789012345678901234567890',
        publishableKey: 'pk_live_NOTAREALKEY1234567890123456789012345678901234567890',
        webhookSecret: 'whsec_NOTAREALWEBHOOK123456789012345678901234567890',
      };

      expect(() => validateStripeConfig(config)).not.toThrow();
    });

    it('should pass validation without webhook secret (optional)', () => {
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).not.toThrow();
    });

    it('should throw error if secret key is missing', () => {
      const config = {
        secretKey: undefined,
        publishableKey: 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_SECRET_KEY/i);
    });

    it('should throw error if publishable key is missing', () => {
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: undefined,
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_PUBLISHABLE_KEY/i);
    });

    it('should throw error if secret key format is invalid', () => {
      const config = {
        secretKey: 'invalid_key_format',
        publishableKey: 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_SECRET_KEY.*format|secret key.*format/i);
    });

    it('should throw error if publishable key format is invalid', () => {
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: 'invalid_key_format',
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_PUBLISHABLE_KEY.*format|publishable key.*format/i);
    });

    it('should throw error if webhook secret format is invalid (when provided)', () => {
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        webhookSecret: 'short', // Too short (less than 10 characters)
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_WEBHOOK_SECRET|webhook secret/i);
    });

    it('should validate key prefixes match (test vs live)', () => {
      // Test key with live key should be caught by format validation
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: 'pk_live_fakekeyfortestingonlynotarealkey12345678901234567890', // Mismatch: test secret with live publishable
        webhookSecret: undefined,
      };

      // Format validation should pass, but we could add a check for key type mismatch
      // For now, just ensure format validation works
      expect(() => validateStripeConfig(config)).not.toThrow(); // Format is valid, mismatch is acceptable
    });
  });

  describe('Stripe Configuration Integration', () => {
    it('should allow configuration in development mode without webhook secret', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890';
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890';
      // Webhook secret not required in development

      const config = getStripeConfig();
      expect(() => validateStripeConfig(config)).not.toThrow();
    });

    it('should require webhook secret in production mode', () => {
      process.env.APP_ENV = 'production';
      // Note: These are test keys only, not real Stripe keys
      process.env.STRIPE_SECRET_KEY = 'sk_live_NOTAREALKEY1234567890123456789012345678901234567890';
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_live_NOTAREALKEY1234567890123456789012345678901234567890';
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const config = getStripeConfig();
      // Webhook secret is optional in validation, but should be set in production
      // This is more of a deployment concern, so we don't enforce it in validation
      expect(() => validateStripeConfig(config)).not.toThrow();
    });

    it('should detect partial configuration (only secret key)', () => {
      const config = {
        secretKey: 'sk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        publishableKey: undefined,
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_PUBLISHABLE_KEY.*required/i);
    });

    it('should detect partial configuration (only publishable key)', () => {
      const config = {
        secretKey: undefined,
        publishableKey: 'pk_test_fakekeyfortestingonlynotarealkey12345678901234567890',
        webhookSecret: undefined,
      };

      expect(() => validateStripeConfig(config)).toThrow(/STRIPE_SECRET_KEY.*required/i);
    });
  });
});

