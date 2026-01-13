/**
 * Test Database Connection Script
 * 
 * Quick script to test PostgreSQL database connection
 */

import pg from 'pg';
const { Client } = pg;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 6543),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vendure',
};

console.log('Testing database connection...');
console.log(`Connecting to: ${config.host}:${config.port}/${config.database} as ${config.user}`);

const client = new Client(config);

try {
  await client.connect();
  console.log('✓ Database connection successful!');
  
  const result = await client.query('SELECT version()');
  console.log(`✓ PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
  
  // Check if database exists and is accessible
  const dbCheck = await client.query('SELECT current_database()');
  console.log(`✓ Connected to database: ${dbCheck.rows[0].current_database}`);
  
  console.log('\n✅ Database connection test passed!');
} catch (error) {
  console.error('\n✗ Database connection failed:');
  console.error(`  Error: ${error.message}`);
  console.error(`  Config: ${config.host}:${config.port}/${config.database}`);
  process.exitCode = 1;
} finally {
  // Always close the connection, even if an error occurred
  // This prevents resource leaks and ensures clean script exit
  try {
    if (client) {
      await client.end();
    }
  } catch (closeError) {
    // Ignore errors when closing - connection might already be closed or failed to connect
    // Expected errors: "Connection terminated", "Client has already been closed", "not connected"
    // These are safe to ignore as they indicate the connection is already closed
    const ignorePatterns = [
      'Connection terminated',
      'not connected',
      'already been closed',
      'Client was closed',
    ];
    const shouldIgnore = ignorePatterns.some((pattern) =>
      closeError.message.includes(pattern)
    );
    
    if (!shouldIgnore) {
      console.error(`  Warning: Error closing connection: ${closeError.message}`);
    }
  }
  
  // Exit with the appropriate code (0 for success, 1 for failure)
  process.exit(process.exitCode || 0);
}