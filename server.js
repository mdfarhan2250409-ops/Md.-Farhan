/**
 * Production Server Entrypoint Wrapper
 * 
 * Supports hosting environments where the start command defaults to:
 *   node server.js
 * 
 * In production (after running "npm run build"), this immediately executes
 * the bundled CommonJS backend located at dist/server.cjs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundledServerPath = path.resolve(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(bundledServerPath)) {
  // Execute bundled production backend
  await import(pathToFileURL(bundledServerPath).href);
} else {
  console.log('[OTL Server] dist/server.cjs not found. Starting in development mode via tsx...');
  try {
    const { spawn } = await import('child_process');
    const child = spawn('npx', ['tsx', 'server.ts'], {
      stdio: 'inherit',
      shell: true,
      env: process.env
    });
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('[OTL Server] Please compile the production build first: npm run build');
    process.exit(1);
  }
}
