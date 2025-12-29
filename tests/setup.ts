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
