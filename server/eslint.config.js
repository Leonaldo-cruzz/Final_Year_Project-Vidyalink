export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      eqeqeq: 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
];
