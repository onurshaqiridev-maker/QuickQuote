/**
 * Entry point 2: the background email worker.   npm run dev:worker  /  npm run start:worker
 * It has no HTTP endpoints: every few seconds it takes pending email jobs from the
 * database and sends them through Resend (or prints them, with EMAIL_DRIVER=console).
 */
import { runUntilShutdown } from './lifecycle';
import { startEmailWorker } from './services/email/email-worker.service';

runUntilShutdown([startEmailWorker()]);
