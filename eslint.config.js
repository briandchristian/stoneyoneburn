// ESLint v8 flat config format
module.exports = [
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    ignores: ['src/gql/**', 'src/plugins/test-auto-verify-plugin.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      ...require('@typescript-eslint/eslint-plugin').configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // Allow console in entry points
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['dist', 'node_modules', 'coverage', '*.js', '!jest.config.js', '*.d.ts'],
  },
];

