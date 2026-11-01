/** Entry point 1: the API server.   npm run dev  /  npm run start */
import { startHttpServer } from './api/http-server';
import { runUntilShutdown } from './lifecycle';

runUntilShutdown([startHttpServer()]);
