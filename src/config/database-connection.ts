/**
 * Database Connection Utilities
 *
 * Provides utilities for testing and validating database connections.
 */

import { Client } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: DatabaseConnectionError;
  connectionTime?: number;
}

/**
 * Custom error class for database connection errors
 */
export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly config: DatabaseConfig,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseConnectionError);
    }
  }
}

/**
 * Get database configuration from environment variables with defaults
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 6543),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'vendure',
  };
}

/**
 * Validate database configuration
 * @throws Error if configuration is invalid
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.host || config.host.trim() === '') {
    throw new Error('Database host is required');
  }

  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Database port must be between 1 and 65535');
  }

  if (!config.username || config.username.trim() === '') {
    throw new Error('Database username is required');
  }

  if (!config.password || config.password.trim() === '') {
    throw new Error('Database password is required');
  }

  if (!config.database || config.database.trim() === '') {
    throw new Error('Database name is required');
  }
}

/**
 * Test database connection
 * Attempts to connect to the database and returns the result
 */
export async function testDatabaseConnection(
  config: DatabaseConfig
): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  let client: Client | null = null;

  try {
    // Validate configuration first
    validateDatabaseConfig(config);

    // Create PostgreSQL client
    client = new Client({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: 5000, // 5 second timeout
    });

    // Attempt to connect
    await client.connect();

    // Test the connection with a simple query
    await client.query('SELECT 1');

    const connectionTime = Date.now() - startTime;

    return {
      success: true,
      connectionTime,
    };
  } catch (error) {
    const connectionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown database connection error';

    // Create a more descriptive error message
    const detailedMessage = `Failed to connect to database at ${config.host}:${config.port}/${config.database} as ${config.username}. Error: ${errorMessage}`;

    const dbError = new DatabaseConnectionError(
      detailedMessage,
      config,
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: dbError,
      connectionTime,
    };
  } finally {
    // Always close the connection if it was opened
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        // Ignore errors when closing - connection might already be closed
      }
    }
  }
}

