/**
 * Server Entrypoint
 * 
 * Supports both development (via tsx and live Vite middlewares)
 * and production (delegates to the pre-bundled dist/server.cjs).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundledServer = path.resolve(__dirname, 'dist', 'server.js');

const isDev = process.argv.includes('--dev') || process.env.npm_lifecycle_event === 'dev';

if (!isDev && fs.existsSync(bundledServer)) {
  // Production runtime: execute pre-bundled ES module server
  // @ts-ignore - dynamically generated after production build
  await import('./dist/server.js');
} else {
  // Development runtime: execute unbundled server with Vite dev middleware
  await import('./server/server-app.ts');
}
