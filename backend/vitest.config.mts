import { defineConfig } from 'vitest/config';

// Tests run against a separate database (quickquote_test) so they never touch dev data.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://quickquote:quickquote@localhost:5432/quickquote_test';

export default defineConfig({
  test: {
    globalSetup: ['tests/helpers/global-setup.ts'],
    // Tests share one database, so run test files one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      EMAIL_DRIVER: 'console',
      FRONTEND_URL: 'http://localhost:5173',
      ADMIN_NOTIFICATION_EMAIL: 'admin@quickquote.test',
      UPLOAD_DIR: '/tmp/quickquote-test-uploads',
    },
  },
});
