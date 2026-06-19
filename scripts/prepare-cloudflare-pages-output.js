import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const distDir = resolve(process.cwd(), 'dist');
const clientDir = join(distDir, 'client');
const serverEntry = join(distDir, 'server', 'entry.mjs');
const pagesWorkerEntry = join(distDir, '_worker.js');
const assetsIgnorePath = join(distDir, '.assetsignore');

const patchKeystaticApiEnvAccess = () => {
  const chunksDir = join(distDir, 'server', 'chunks');

  if (!existsSync(chunksDir)) return;

  for (const entry of readdirSync(chunksDir)) {
    if (!entry.startsWith('keystatic-api_') || !entry.endsWith('.mjs')) continue;

    const target = join(chunksDir, entry);
    const source = readFileSync(target, 'utf8');
    const patched = source.replace(
      /const envVarsForCf = .*?;\n {4}const handler = makeGenericAPIRouteHandler\(/s,
      'const envVarsForCf = globalThis.process?.env;\n    const handler = makeGenericAPIRouteHandler('
    );

    if (patched === source) {
      console.warn(
        `[cloudflare-pages] Keystatic env compatibility patch was not applied to ${entry}.`
      );
      continue;
    }

    writeFileSync(target, patched);
    console.log(`[cloudflare-pages] Patched Keystatic env access in ${entry}.`);
  }
};

if (!existsSync(clientDir)) {
  console.log('[cloudflare-pages] No dist/client directory found; skipping root asset sync.');
  process.exit(0);
}

for (const entry of readdirSync(clientDir)) {
  const source = join(clientDir, entry);
  const target = join(distDir, entry);

  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, force: true });
}

if (!existsSync(serverEntry)) {
  console.log('[cloudflare-pages] No dist/server/entry.mjs found; skipping worker entry.');
  process.exit(0);
}

patchKeystaticApiEnvAccess();

writeFileSync(
  pagesWorkerEntry,
  `import worker from './server/entry.mjs';\n\nconst syncProcessEnv = (env) => {\n  globalThis.process ??= {};\n  globalThis.process.env ??= {};\n\n  for (const key of ['KEYSTATIC_GITHUB_CLIENT_ID', 'KEYSTATIC_GITHUB_CLIENT_SECRET', 'KEYSTATIC_SECRET']) {\n    if (typeof env?.[key] === 'string') {\n      globalThis.process.env[key] = env[key];\n    }\n  }\n};\n\nexport default {\n  fetch(request, env, context) {\n    syncProcessEnv(env);\n    return worker.fetch(request, env, context);\n  },\n};\n`
);

writeFileSync(
  assetsIgnorePath,
  ['server/', 'client/', 'wrangler.json', '.dev.vars', ''].join('\n')
);

console.log('[cloudflare-pages] Synced dist/client assets to dist root.');
console.log('[cloudflare-pages] Generated Pages advanced mode worker entry.');
