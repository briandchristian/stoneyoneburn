import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  VendureConfig,
} from '@vendure/core';
// EmailPlugin imports (commented out, will be enabled in Phase 1)
// import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { validateEnvironmentVariables } from './config/env-validation';
import { getSecurityConfig, isProductionMode, validateSecurityConfig } from './config/security';

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
    // In production, use migrations instead of synchronize
    ...(isProductionMode()
      ? {
          migrations: [path.join(__dirname, 'migrations/*.+(js|ts)')],
        }
      : {}),
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  // When adding or altering custom field definitions, the database will
  // need to be updated. See the "Migrations" section in README.md.
  customFields: {},
  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      // For local dev, the correct value for assetUrlPrefix should
      // be guessed correctly, but for production it will usually need
      // to be set manually to match your production url.
      assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    /*EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),*/
    DashboardPlugin.init({
      route: 'dashboard',
      appDir: IS_DEV
        ? path.join(__dirname, '../dist/dashboard')
        : path.join(__dirname, 'dashboard'),
    }),
  ],
};

// Validate security configuration before exporting
// This will throw an error if production security requirements are not met
validateSecurityConfig(config);
