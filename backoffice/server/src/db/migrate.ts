import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await query(schema);
    console.log('[MIGRATE] Backoffice schema applied successfully');
  } catch (err: any) {
    // Tables may already exist
    if (err.code === '42P07' || err.code === '42710') {
      console.log('[MIGRATE] Schema already up to date');
    } else {
      console.error('[MIGRATE] Error:', err.message);
      throw err;
    }
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('migrate')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}
