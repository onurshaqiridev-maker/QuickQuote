/**
 * Entry point 3 (optional): API server AND email worker in ONE process.   npm run start:all
 * Useful on hosting plans that do not offer a separate background worker.
 * They still only communicate through the email_jobs table.
 */
import { startHttpServer } from './api/http-server';
import { runUntilShutdown } from './lifecycle';
import { startEmailWorker } from './services/email/email-worker.service';

runUntilShutdown([startHttpServer(), startEmailWorker()]);
