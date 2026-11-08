// ESLint rules for the CRM source.
// The app is ES modules: every name must be imported or be a known browser/global name.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['dist/**', 'index.html', 'node_modules/**', 'test-results/**', 'prototype-lead-forms.html'] },
  {
    files: ['src/**/*.js'],
    ignores: ['src/boot-loader.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // ASSETS is added by the build; USER/SSO are set on window by data/state.js and sign-in;
      // ZXing, msal and google come from the third-party scripts loaded on demand.
      globals: {
        ...globals.browser,
        ASSETS: 'readonly',
        USER: 'readonly',
        SSO: 'readonly',
        ZXing: 'readonly',
        msal: 'readonly',
        google: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-cond-assign': ['error', 'except-parens'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-control-regex': 'off', // SAFE.text strips control characters on purpose
    },
  },
  {
    files: ['src/boot-loader.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  // Layers: imports only point down (core/config -> data -> domain -> ui/integrations/print -> features -> start).
  ...[
    [
      ['src/core/**', 'src/config/**'],
      ['data', 'domain', 'ui', 'integrations', 'print', 'features', 'start'],
    ],
    [['src/data/**'], ['domain', 'ui', 'integrations', 'print', 'features', 'start']],
    [['src/domain/**'], ['ui', 'integrations', 'print', 'features', 'start']],
  ].map(([files, above]) => ({
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: above.map((d) => ({
            group: ['**/' + d + '/**'],
            message: 'This layer may not import from src/' + d + ' (see CLAUDE.md, code layout).',
          })),
        },
      ],
    },
  })),
  {
    files: ['tests/unit/**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
];
