// ESLint configuration.
// Besides normal code-quality rules, this file ENFORCES THE FOUR LAYERS:
//   api  ->  services  ->  data  ->  (PostgreSQL)
//   models can be imported by every layer, but imports nothing from them.
// If a file imports something its layer is not allowed to use, `npm run lint` fails.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Builds a "no-restricted-imports" rule for one layer. */
function layerRule({ forbiddenFolders, forbiddenPackages, message }) {
  return {
    'no-restricted-imports': [
      'error',
      {
        paths: forbiddenPackages.map((name) => ({ name, message })),
        patterns: forbiddenFolders.length
          ? [{ regex: `(^|/)(${forbiddenFolders.join('|')})(/|$)`, message }]
          : [],
      },
    ],
  };
}

export default defineConfig(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Layer 1: API. Talks HTTP and calls services. Never touches the database.
  {
    files: ['src/api/**/*.ts'],
    rules: layerRule({
      // "senders" = the code that talks to Resend. Endpoints may only ENQUEUE emails.
      forbiddenFolders: ['data', 'senders'],
      forbiddenPackages: ['pg', 'resend'],
      message: 'API layer: call a service (never the data layer, the database or an email sender directly).',
    }),
  },

  // Layer 2: Services. Business logic. Knows nothing about HTTP.
  {
    files: ['src/services/**/*.ts'],
    rules: layerRule({
      forbiddenFolders: ['api'],
      forbiddenPackages: ['express', 'pg'],
      message: 'Services layer: no HTTP (express, api) and no direct pg access - use a repository.',
    }),
  },

  // Layer 3: Data. The only place with SQL.
  {
    files: ['src/data/**/*.ts'],
    rules: layerRule({
      forbiddenFolders: ['api', 'services'],
      forbiddenPackages: ['express'],
      message: 'Data layer: may only use models and config.',
    }),
  },

  // Layer 4: Models. Pure data shapes.
  {
    files: ['src/models/**/*.ts'],
    rules: layerRule({
      forbiddenFolders: ['api', 'services', 'data', 'config'],
      forbiddenPackages: ['express', 'pg'],
      message: 'Models layer: only data shapes, no imports from other layers.',
    }),
  },

  // Worker entry point: calls services, never repositories or the API.
  {
    files: ['src/worker.ts'],
    rules: layerRule({
      forbiddenFolders: ['api', 'repositories'],
      forbiddenPackages: ['express', 'pg'],
      message: 'Worker: call services, not repositories or the API.',
    }),
  },

  // Seed script: an entry point too. It calls services, never SQL directly.
  {
    files: ['seeds/**/*.ts'],
    rules: layerRule({
      forbiddenFolders: ['api', 'repositories'],
      forbiddenPackages: ['express', 'pg'],
      message: 'Seeds: call the seed service, not repositories or SQL.',
    }),
  },
);
