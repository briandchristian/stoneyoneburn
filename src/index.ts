import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';
import { createServer } from 'net';

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Find the next available port starting from the given port
 */
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      if (i > 0) {
        console.log(`⚠️  Port ${startPort} is in use. Using port ${port} instead.`);
      }
      return port;
    }
  }
  throw new Error(`Could not find an available port starting from ${startPort} after ${maxAttempts} attempts`);
}

/**
 * Start the server with automatic port detection
 */
async function startServer() {
  try {
    await runMigrations(config);
    
    // Get the configured port (from env var or config default)
    const configuredPort = config.apiOptions.port || 3000;
    
    // Check if configured port is available
    const portAvailable = await isPortAvailable(configuredPort);
    let availablePort: number;
    
    if (portAvailable) {
      // Configured port is available - use it
      availablePort = configuredPort;
    } else {
      // Configured port is in use - find alternative starting from 3005
      console.log(`⚠️  Port ${configuredPort} is in use. Finding alternative port...`);
      availablePort = await findAvailablePort(3005, 20);
      // Update config and env var with the new port
      config.apiOptions.port = availablePort;
      process.env.PORT = availablePort.toString();
      console.log(`✓ Using port ${availablePort}`);
    }
    
    await bootstrap(config);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
