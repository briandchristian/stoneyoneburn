/**
 * Environment Variable Validation
 *
 * Validates required environment variables and enforces security requirements
 * for production environments.
 */

export interface ValidationError {
  variable: string;
  message: string;
}

const MIN_COOKIE_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH_PRODUCTION = 12;

/**
 * Critical environment variables that are always required, regardless of environment
 * These are needed for the application to function at all (authentication, security)
 */
export const CRITICAL_ENV_VARS = ['SUPERADMIN_USERNAME', 'SUPERADMIN_PASSWORD', 'COOKIE_SECRET'];

/**
 * Non-critical environment variables that can have defaults in development
 */
export const NON_CRITICAL_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
];

/**
 * Get list of required environment variables based on environment
 */
export function getRequiredEnvVars(env?: string): string[] {
  const appEnv = env || process.env.APP_ENV || 'dev';

  if (appEnv === 'production') {
    return [...CRITICAL_ENV_VARS, ...NON_CRITICAL_ENV_VARS];
  }

  // In development, only critical vars are required
  // Non-critical vars can have defaults
  return CRITICAL_ENV_VARS;
}

/**
 * Validate critical environment variables (always required, regardless of environment)
 * @throws Error if any critical variable is missing
 */
export function validateCriticalEnvVars(): void {
  const errors: ValidationError[] = [];

  for (const varName of CRITICAL_ENV_VARS) {
    if (!process.env[varName]) {
      errors.push({
        variable: varName,
        message: `Critical environment variable ${varName} is not set. This is required for the application to function.`,
      });
    }
  }

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `  - ${e.variable}: ${e.message}`).join('\n');
    throw new Error(`Critical environment variable validation failed:\n${errorMessages}`);
  }
}

/**
 * Validate that all required environment variables are present and meet security requirements
 * @throws Error if validation fails
 */
export function validateEnvironmentVariables(): void {
  const errors: ValidationError[] = [];
  const appEnv = process.env.APP_ENV || 'dev';
  const isProduction = appEnv === 'production';

  // Always validate critical variables first (they're required in all environments)
  validateCriticalEnvVars();

  // Check non-critical variables (only required in production)
  if (isProduction) {
    for (const varName of NON_CRITICAL_ENV_VARS) {
      if (!process.env[varName]) {
        errors.push({
          variable: varName,
          message: `Required environment variable ${varName} is not set`,
        });
      }
    }
  }

  // Validate cookie secret strength
  const cookieSecret = process.env.COOKIE_SECRET;
  if (cookieSecret && cookieSecret.length < MIN_COOKIE_SECRET_LENGTH) {
    errors.push({
      variable: 'COOKIE_SECRET',
      message: `Cookie secret must be at least ${MIN_COOKIE_SECRET_LENGTH} characters long`,
    });
  }

  // Validate password strength in production
  if (isProduction) {
    const password = process.env.SUPERADMIN_PASSWORD;
    if (password && password.length < MIN_PASSWORD_LENGTH_PRODUCTION) {
      errors.push({
        variable: 'SUPERADMIN_PASSWORD',
        message: `Password must be at least ${MIN_PASSWORD_LENGTH_PRODUCTION} characters long in production`,
      });
    }
  }

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `  - ${e.variable}: ${e.message}`).join('\n');
    throw new Error(`Environment variable validation failed:\n${errorMessages}`);
  }
}
