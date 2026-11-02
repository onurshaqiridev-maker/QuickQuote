/**
 * Serves the built website (frontend/dist) from the API server, so the website and the API share
 * one address. That keeps the login cookie working and needs no CORS. Used in production only.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';

/** Paths that belong to the server itself, never to the website. */
const SERVER_PATHS = /^\/(api|uploads|health)(\/|$)/;

export function serveWebsite(app: Express, distDir: string): void {
  const root = path.resolve(distDir);
  const indexFile = path.join(root, 'index.html');
  if (!existsSync(indexFile)) {
    throw new Error(`FRONTEND_DIST_DIR: "${indexFile}" does not exist. Build the website first: cd frontend && npm run build`);
  }

  // Built files have a content hash in their name ("index-CAazn6ot.js"), so browsers may keep them for a year.
  app.use('/assets', express.static(path.join(root, 'assets'), { index: false, immutable: true, maxAge: '1y' }));
  // Other files (favicon.svg ...). index.html is NOT served here: the fallback below does that.
  app.use(express.static(root, { index: false, maxAge: '1h' }));

  // Every other page address (/explore, /businesses/bella-hair-studio, /admin ...) gets index.html;
  // the website's router then shows the right page. "no-cache" makes browsers check for a new version.
  app.get(/.*/, (req, res, next) => {
    if (SERVER_PATHS.test(req.path)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}
