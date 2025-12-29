/**
 * Security Configuration Utilities
 *
 * Provides security-aware configuration based on environment.
 * Ensures production security best practices are enforced.
 */

import { VendureConfig } from '@vendure/core';

export interface SecurityConfig {
  apiOptions: {
    adminApiDebug?: boolean;
    shopApiDebug?: boolean;
    trustProxy: boolean | number;
  };
  dbConnectionOptions: {
    synchronize: boolean;
    logging: boolean;
  };
}

/**
 * Check if running in production mode
 */
export function isProductionMode(): boolean {
  return process.env.APP_ENV === 'production';
}

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const isProduction = isProductionMode();

  return {
    apiOptions: {
      ...(isProduction
        ? {}
        : {
            adminApiDebug: true,
            shopApiDebug: true,
          }),
      trustProxy: isProduction ? 1 : false,
    },
    dbConnectionOptions: {
      synchronize: !isProduction, // Never use synchronize in production
      logging: !isProduction, // Disable detailed logging in production
    },
  };
}

/**
 * Validate that a VendureConfig meets security requirements
 * @throws Error if security requirements are not met
 */
export function validateSecurityConfig(config: Partial<VendureConfig>): void {
  const isProduction = isProductionMode();

  if (isProduction) {
    // Check synchronize is disabled in production
    if (config.dbConnectionOptions?.synchronize === true) {
      throw new Error(
        'Security violation: synchronize must be false in production. ' +
          'Use migrations instead to prevent data loss.'
      );
    }

    // Check debug modes are disabled in production
    if (config.apiOptions?.adminApiDebug === true || config.apiOptions?.shopApiDebug === true) {
      throw new Error(
        'Security violation: API debug modes must be disabled in production ' +
          'to prevent information disclosure.'
      );
    }
  }
}
