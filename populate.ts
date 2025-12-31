import { bootstrap } from '@vendure/core';
import { populate } from '@vendure/core/cli';
import { config } from './src/vendure-config';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Safely read and parse a JSON file with error handling
 */
function loadJsonFile(filePath: string, fileDescription: string): any {
  try {
    if (!existsSync(filePath)) {
      throw new Error(
        `${fileDescription} not found at: ${filePath}\n` +
          'Please ensure @vendure/create is installed: npm install --save-dev @vendure/create'
      );
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse ${fileDescription} as JSON: ${filePath}\n` + `Error: ${error.message}`
      );
    }
    if (error instanceof Error && error.message.includes('not found')) {
      throw error; // Re-throw our custom "not found" error
    }
    throw new Error(
      `Failed to read ${fileDescription}: ${filePath}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Safely check if a file exists and return the path
 */
function verifyFileExists(filePath: string, fileDescription: string): string {
  if (!existsSync(filePath)) {
    throw new Error(
      `${fileDescription} not found at: ${filePath}\n` +
        'Please ensure @vendure/create is installed: npm install --save-dev @vendure/create'
    );
  }
  return filePath;
}

// Load initial data from @vendure/create package
// Resolve the path relative to node_modules
const initialDataPath = path.resolve(
  process.cwd(),
  'node_modules',
  '@vendure',
  'create',
  'assets',
  'initial-data.json'
);

// Load products CSV file path
const productsCsvPath = path.resolve(
  process.cwd(),
  'node_modules',
  '@vendure',
  'create',
  'assets',
  'products.csv'
);

// Wrap file loading and population in try-catch to provide helpful error messages
try {
  console.log('Starting database population...');
  console.log('Initial data path:', initialDataPath);
  console.log('Products CSV path:', productsCsvPath);

  // Load and parse initial data with error handling
  const initialData = loadJsonFile(initialDataPath, 'Initial data file');

  // Verify CSV file exists
  const verifiedCsvPath = verifyFileExists(productsCsvPath, 'Products CSV file');

  console.log('✅ Files verified successfully');

  // Only proceed with population if files are successfully loaded
  // This ensures variables are initialized before use
  populate(() => bootstrap(config), initialData, verifiedCsvPath)
    .then(async (app) => {
      console.log('Population completed successfully!');

      // Give the search index a moment to update
      // The DefaultSearchPlugin with bufferUpdates: false should index immediately,
      // but we'll wait a bit to ensure indexing completes
      console.log('Waiting for search index to update...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await app.close();
      console.log('Database population finished. You can now start the server with: npm run dev');

      // Explicitly exit the process to ensure clean termination
      // This prevents the script from hanging due to background connections or timers
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during population:');
      console.error(err);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Error loading required files:');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('\n💡 Troubleshooting:');
  console.error(
    '   1. Ensure @vendure/create is installed: npm install --save-dev @vendure/create'
  );
  console.error('   2. Run npm install to ensure all dependencies are installed');
  console.error('   3. Verify node_modules/@vendure/create/assets/ directory exists');
  process.exit(1);
}
