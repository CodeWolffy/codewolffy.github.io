
import { pruneContent } from '../src/utils/content-sync.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check for --dry-run flag
const dryRun = process.argv.includes('--dry-run');

pruneContent(rootDir, dryRun).catch(console.error);
