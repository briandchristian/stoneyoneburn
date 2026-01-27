import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
import 'dotenv/config';
import path from 'path';
import { validateEnvironmentVariables } from './config/env-validation';
import { getSecurityConfig, isProductionMode, validateSecurityConfig } from './config/security';
import { getStripeConfig, validateStripeConfig } from './config/stripe-config';
import { MultiVendorPlugin } from './plugins/multi-vendor-plugin/multi-vendor.plugin';
import { processScheduledPayoutsTask } from './plugins/multi-vendor-plugin/scheduled-tasks/payout-scheduler.task';

// Get the project root directory
// process.cwd() returns the current working directory (project root when run from npm scripts)
// __dirname points to the directory of the current file (src/ when running with ts-node, dist/ when compiled)
// We use process.cwd() as the base, but fall back to __dirname/.. if needed
const PROJECT_ROOT = process.cwd() || path.resolve(__dirname, '..');
// import { TestAutoVerifyPlugin } from './plugins/test-auto-verify-plugin'; // Temporarily disabled - compilation errors

// Validate critical environment variables on startup
// Critical variables (authentication, security) are always required, even in development
// This ensures the application fails fast with a clear error message rather than
// starting with invalid configuration that will fail at runtime
try {
  validateEnvironmentVariables();
} catch (error) {
  console.error('Environment validation failed:', error);
  // Always throw for critical variables (authentication, security)
  // These are required for the application to function at all
  throw error;
}

const IS_DEV = !isProductionMode();
const serverPort = +process.env.PORT || 3000;
const securityConfig = getSecurityConfig();

// Get and validate Stripe configuration (optional in dev, required in production)
const stripeConfig = getStripeConfig();
// Validate if ANY Stripe key is provided (not just when both are present)
// This catches partial configurations early and prevents silent failures
if (stripeConfig.secretKey || stripeConfig.publishableKey) {
  try {
    validateStripeConfig(stripeConfig);
  } catch (error) {
    console.error('Stripe configuration validation failed:', error);
    // In production, Stripe should be configured correctly, so throw
    // In development, allow the app to start without Stripe (for testing other features)
    if (isProductionMode()) {
      throw error;
    } else {
      console.warn('⚠️  Stripe configuration is invalid. Payment processing will not work.');
    }
  }
}

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    // Debug modes are automatically disabled in production via security config
    ...securityConfig.apiOptions,
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
  },
  dbConnectionOptions: {
    type: 'postgres' as const, // Critical: string with quotes + as const for TypeScript
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 6543),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'vendure',
    // Security: synchronize is automatically disabled in production
    synchronize: securityConfig.dbConnectionOptions.synchronize,
    // Security: logging is automatically disabled in production
    logging: securityConfig.dbConnectionOptions.logging,
    // Use migrations in both dev and production
    // In dev mode, synchronize can be used for rapid development, but migrations
    // should still be available for schema changes that need to be tracked
    // Note: Using brace expansion format compatible with TypeORM's tinyglobby
    migrations: [
      // When running with ts-node (dev), migrations are in src/migrations
      // When running compiled code (prod), migrations are in dist/migrations
      path.join(__dirname, 'migrations/*.{ts,js}'),
    ],
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  // When adding or altering custom field definitions, the database will
  // need to be updated. See the "Migrations" section in README.md.
  customFields: {},
  schedulerOptions: {
    tasks: [processScheduledPayoutsTask],
  },
  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(PROJECT_ROOT, 'static/assets'),
      // For local dev, the correct value for assetUrlPrefix should
      // be guessed correctly, but for production it will usually need
      // to be set manually to match your production url.
      assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    // EmailPlugin configuration
    // In development: writes emails to files for testing (devMode: true)
    // In production: uses SMTP transport for actual email delivery
    IS_DEV
      ? EmailPlugin.init({
          devMode: true,
          outputPath: path.join(PROJECT_ROOT, 'static/email/test-emails'),
          route: 'mailbox',
          handlers: defaultEmailHandlers,
          templateLoader: new FileBasedTemplateLoader(
            path.join(PROJECT_ROOT, 'static/email/templates')
          ),
          globalTemplateVars: {
            fromAddress: process.env.EMAIL_FROM || '"StoneyOneBurn Dev" <noreply@localhost>',
            verifyEmailAddressUrl: process.env.STOREFRONT_URL || 'http://localhost:3001/verify',
            passwordResetUrl: process.env.STOREFRONT_URL || 'http://localhost:3001/password-reset',
            changeEmailAddressUrl:
              process.env.STOREFRONT_URL || 'http://localhost:3001/verify-email-address-change',
          },
        })
      : EmailPlugin.init({
          transport: {
            type: 'smtp',
            host: process.env.EMAIL_HOST || 'smtp.example.com',
            port: +(process.env.EMAIL_PORT || 587),
            secure: (process.env.EMAIL_PORT || '587') === '465', // true for 465, false for other ports
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          },
          handlers: defaultEmailHandlers,
          templateLoader: new FileBasedTemplateLoader(
            path.join(PROJECT_ROOT, 'static/email/templates')
          ),
          globalTemplateVars: {
            fromAddress: process.env.EMAIL_FROM || '"StoneyOneBurn" <noreply@stoneyoneburn.com>',
            verifyEmailAddressUrl: process.env.STOREFRONT_URL || 'https://stoneyoneburn.com/verify',
            passwordResetUrl:
              process.env.STOREFRONT_URL || 'https://stoneyoneburn.com/password-reset',
            changeEmailAddressUrl:
              process.env.STOREFRONT_URL || 'https://stoneyoneburn.com/verify-email-address-change',
          },
        }),
    // StripePlugin configuration
    // Only initialize if Stripe keys are configured
    // In development, Stripe is optional (can use dummyPaymentHandler for testing)
    // In production, Stripe should be configured for real payments
    ...(stripeConfig.secretKey && stripeConfig.publishableKey
      ? [
          StripePlugin.init({
            storeCustomersInStripe: true,
            // Webhook secret is optional but recommended for production
            // It will be set when creating the payment method in the admin UI
          }),
        ]
      : []),
    DashboardPlugin.init({
      route: 'dashboard',
      appDir: IS_DEV
        ? path.join(PROJECT_ROOT, 'dist/dashboard')
        : path.join(PROJECT_ROOT, 'dist/dashboard'),
    }),
    // Multi-Vendor Plugin - Phase 2
    MultiVendorPlugin,
    // Test Auto-Verify Plugin - Temporarily disabled due to compilation errors
    // Automatically verifies customer emails to allow integration tests to proceed
    // ...(process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test'
    //   ? [TestAutoVerifyPlugin]
    //   : []),
  ],
};

// Validate security configuration before exporting
// This will throw an error if production security requirements are not met
validateSecurityConfig(config);
