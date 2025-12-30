/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';

// Set default database connection for tests
// Use 'postgres' database which always exists in PostgreSQL
if (!process.env.DB_HOST) process.env.DB_HOST = 'localhost';
if (!process.env.DB_PORT) process.env.DB_PORT = '6543';
if (!process.env.DB_USERNAME) process.env.DB_USERNAME = 'postgres';
if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'postgres';
if (!process.env.DB_DATABASE) process.env.DB_DATABASE = 'postgres'; // Use 'postgres' which always exists

// Set critical authentication and security variables required by validateEnvironmentVariables()
// These are required even in test environment to prevent module initialization failures
// when tests import vendure-config or modules that depend on it
if (!process.env.SUPERADMIN_USERNAME) {
  process.env.SUPERADMIN_USERNAME = 'test-admin';
}
if (!process.env.SUPERADMIN_PASSWORD) {
  process.env.SUPERADMIN_PASSWORD = 'test-password-123';
}
if (!process.env.COOKIE_SECRET) {
  // Generate a test cookie secret that meets minimum length requirement (32 characters)
  process.env.COOKIE_SECRET = 'test-cookie-secret-key-min-32-chars-long';
}
