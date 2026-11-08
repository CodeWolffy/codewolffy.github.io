import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDeployTarget } from '../src/config/deploy-target.mjs';
import { packageBinary, projectRoot, runNode } from './lib/commands.mjs';

const target = getDeployTarget(process.argv[2] || process.env.DEPLOY_TARGET);
const buildEnv = { ...process.env, DEPLOY_TARGET: target };
console.log(`[build] Target: ${target}`);
const markerPath = resolve(projectRoot, '.astro/build-target.json');
rmSync(markerPath, { force: true });

runNode(['--import', 'tsx', 'scripts/prepare-content.mjs'], buildEnv);
for (const script of [
  'check-series-integrity.mjs',
  'check-mdx-component-regression.mjs',
  'check-mermaid-regression.mjs',
  'check-asset-budgets.mjs',
]) {
  runNode([`scripts/${script}`], buildEnv);
}
runNode([packageBinary('astro'), 'build'], buildEnv);
if (target === 'cloudflare') {
  runNode(['scripts/prepare-cloudflare-pages-output.js'], buildEnv);
}
runNode(['scripts/prune-legacy-image-masters.mjs'], buildEnv);
runNode(['scripts/run-pagefind.js'], buildEnv);
runNode(['scripts/check-build-budgets.mjs'], buildEnv);
writeFileSync(markerPath, `${JSON.stringify({ target })}\n`);
