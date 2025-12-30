/**
 * Stripe Payment Gateway Configuration
 *
 * Provides utilities for retrieving and validating Stripe API keys
 * and webhook secrets from environment variables.
 */

export interface StripeConfig {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
}

/**
 * Stripe API key format validation
 * Secret keys: sk_test_... or sk_live_... (typically 51+ characters)
 * Publishable keys: pk_test_... or pk_live_... (typically 51+ characters)
 * Webhook secrets: whsec_... or any string (Stripe webhook secrets can vary in format)
 */
const STRIPE_SECRET_KEY_PATTERN = /^sk_(test|live)_[a-zA-Z0-9]{24,}$/;
const STRIPE_PUBLISHABLE_KEY_PATTERN = /^pk_(test|live)_[a-zA-Z0-9]{24,}$/;
// Webhook secrets can be any string - Stripe uses various formats
// We'll accept any non-empty string for webhook secrets
const STRIPE_WEBHOOK_SECRET_PATTERN = /^.{10,}$/;

/**
 * Get Stripe configuration from environment variables
 */
export function getStripeConfig(): StripeConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

/**
 * Validate Stripe configuration
 * @throws Error if configuration is invalid
 */
export function validateStripeConfig(config: StripeConfig): void {
  const errors: string[] = [];

  // Secret key is required
  if (!config.secretKey) {
    errors.push('STRIPE_SECRET_KEY is required');
  } else if (!STRIPE_SECRET_KEY_PATTERN.test(config.secretKey)) {
    errors.push(
      `STRIPE_SECRET_KEY has invalid format. Expected format: sk_test_... or sk_live_...`
    );
  }

  // Publishable key is required
  if (!config.publishableKey) {
    errors.push('STRIPE_PUBLISHABLE_KEY is required');
  } else if (!STRIPE_PUBLISHABLE_KEY_PATTERN.test(config.publishableKey)) {
    errors.push(
      `STRIPE_PUBLISHABLE_KEY has invalid format. Expected format: pk_test_... or pk_live_...`
    );
  }

  // Webhook secret is optional, but if provided, should be valid format (non-empty, at least 10 chars)
  if (config.webhookSecret && !STRIPE_WEBHOOK_SECRET_PATTERN.test(config.webhookSecret)) {
    errors.push(
      `STRIPE_WEBHOOK_SECRET has invalid format. Must be at least 10 characters long.`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Stripe configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}

