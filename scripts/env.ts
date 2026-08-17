/**
 * Load .env.local / .env into process.env for standalone tsx scripts.
 *
 * Next.js does this automatically for the app; plain scripts (render-art,
 * seed) do not get it for free, and adding a dotenv dependency for eleven
 * lines is not worth it. .env.local wins over .env; existing environment
 * variables win over both, so `KEY=x npx tsx script.ts` still overrides.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

for (const file of ['.env', '.env.local']) {
  const path = join(__dirname, '..', file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env) || file === '.env.local') {
      if (process.env[m[1]] === undefined || !process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}
