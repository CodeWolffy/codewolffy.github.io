import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const distDir = resolve(process.cwd(), 'dist');
const clientDir = join(distDir, 'client');
const serverEntry = join(distDir, 'server', 'entry.mjs');
const pagesWorkerEntry = join(distDir, '_worker.js');
const assetsIgnorePath = join(distDir, '.assetsignore');
const routesPath = join(distDir, '_routes.json');
const privateKeystaticEnvKeys = [
  'KEYSTATIC_GITHUB_CLIENT_ID',
  'KEYSTATIC_GITHUB_CLIENT_SECRET',
  'KEYSTATIC_SECRET',
];
const publicKeystaticEnvKeys = ['PUBLIC_KEYSTATIC_GITHUB_APP_SLUG'];
const keystaticEnvKeys = [...privateKeystaticEnvKeys, ...publicKeystaticEnvKeys];
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
  `import worker from './server/entry.mjs';\n\nconst keystaticEnvKeys = ${JSON.stringify(keystaticEnvKeys)};\nconst requiredKeystaticEnvKeys = ${JSON.stringify(privateKeystaticEnvKeys)};\n\nconst syncProcessEnv = (env) => {\n  globalThis.process ??= {};\n  globalThis.process.env ??= {};\n\n  for (const key of keystaticEnvKeys) {\n    if (typeof env?.[key] === 'string') {\n      globalThis.process.env[key] = env[key];\n    }\n  }\n};\n\nconst warnMissingKeystaticEnv = () => {\n  const missing = requiredKeystaticEnvKeys.filter((key) => !globalThis.process?.env?.[key]);\n  if (missing.length > 0) {\n    console.warn(\`[cloudflare-pages] Missing Keystatic environment variables: \${missing.join(', ')}\`);\n  }\n};\n\nconst parseRangeHeader = (rangeHeader, size) => {\n  const match = /^bytes=(\\d*)-(\\d*)$/.exec(rangeHeader || '');\n  if (!match || size <= 0) return null;\n\n  const startText = match[1];\n  const endText = match[2];\n  if (!startText && !endText) return null;\n\n  if (!startText) {\n    const suffixLength = Number.parseInt(endText, 10);\n    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;\n    return {\n      start: Math.max(0, size - suffixLength),\n      end: size - 1,\n    };\n  }\n\n  const start = Number.parseInt(startText, 10);\n  const end = endText ? Number.parseInt(endText, 10) : size - 1;\n  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {\n    return null;\n  }\n\n  return {\n    start,\n    end: Math.min(end, size - 1),\n  };\n};\n\nconst fetchMusicAsset = async (request, env) => {\n  const assetHeaders = new Headers(request.headers);\n  assetHeaders.delete('range');\n\n  const assetResponse = await env.ASSETS.fetch(\n    new Request(request.url, {\n      method: 'GET',\n      headers: assetHeaders,\n    })\n  );\n\n  if (!assetResponse.ok || request.method === 'GET' && !request.headers.has('range')) {\n    const headers = new Headers(assetResponse.headers);\n    headers.set('Accept-Ranges', 'bytes');\n    return new Response(request.method === 'HEAD' ? null : assetResponse.body, {\n      status: assetResponse.status,\n      statusText: assetResponse.statusText,\n      headers,\n    });\n  }\n\n  const bytes = await assetResponse.arrayBuffer();\n  const size = bytes.byteLength;\n  const headers = new Headers(assetResponse.headers);\n  headers.set('Accept-Ranges', 'bytes');\n\n  if (request.method === 'HEAD') {\n    headers.set('Content-Length', String(size));\n    return new Response(null, { status: assetResponse.status, headers });\n  }\n\n  const range = parseRangeHeader(request.headers.get('range'), size);\n  if (!range) {\n    headers.set('Content-Range', \`bytes */\${size}\`);\n    return new Response(null, { status: 416, headers });\n  }\n\n  const chunk = bytes.slice(range.start, range.end + 1);\n  headers.set('Content-Length', String(chunk.byteLength));\n  headers.set('Content-Range', \`bytes \${range.start}-\${range.end}/\${size}\`);\n\n  return new Response(chunk, {\n    status: 206,\n    headers,\n  });\n};\n\nexport default {\n  async fetch(request, env, context) {\n    syncProcessEnv(env);\n\n    const url = new URL(request.url);\n    if (url.pathname.startsWith('/music/') && ['GET', 'HEAD'].includes(request.method)) {\n      return fetchMusicAsset(request, env);\n    }\n\n    if (url.pathname.startsWith('/keystatic') || url.pathname.startsWith('/api/keystatic')) {\n      warnMissingKeystaticEnv();\n    }\n\n    return worker.fetch(request, env, context);\n  },\n};\n`
);

writeFileSync(
  assetsIgnorePath,
  ['server/', 'client/', 'wrangler.json', '.dev.vars', ''].join('\n')
);

writeFileSync(
  routesPath,
  `${JSON.stringify(
    {
      version: 1,
      include: ['/*'],
    },
    null,
    2
  )}\n`
);

console.log('[cloudflare-pages] Synced dist/client assets to dist root.');
console.log('[cloudflare-pages] Generated Pages advanced mode worker entry.');
console.log('[cloudflare-pages] Generated Pages function routes for all paths.');
