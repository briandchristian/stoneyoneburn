module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/index-worker.ts',
    // Exclude configuration files (hard to test in isolation)
    '!src/vendure-config.ts',
    // Exclude generated GraphQL files
    '!src/gql/**',
    // Exclude migration files (tested via integration tests)
    '!src/migrations/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Exclude external directories to avoid module naming collisions
  modulePathIgnorePatterns: [
    '<rootDir>/.vscode',
    '<rootDir>/.cursor',
    '<rootDir>/HelloMyARWorld',
    '<rootDir>/My project',
    '<rootDir>/anaconda3',
    '<rootDir>/.venv',
    '<rootDir>/AppData',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/.vscode',
    '<rootDir>/.cursor',
    '<rootDir>/HelloMyARWorld',
    '<rootDir>/My project',
    '<rootDir>/anaconda3',
    '<rootDir>/.venv',
    '<rootDir>/AppData',
  ],
};

