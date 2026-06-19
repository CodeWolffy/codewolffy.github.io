import { syncContent } from '../src/utils/content-sync.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const checkOnly = process.argv.includes('--check');

syncContent(rootDir, { check: checkOnly }).catch((error) => {
  console.error('[ContentSync] Failed:', error);
  process.exitCode = 1;
});
