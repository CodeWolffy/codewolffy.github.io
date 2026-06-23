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

const patchServerWranglerConfig = () => {
  const serverWranglerPath = join(distDir, 'server', 'wrangler.json');
  if (!existsSync(serverWranglerPath)) return;

  // dist/server/wrangler.json 是 Astro Cloudflare adapter 为 Workers 部署生成的配置，
  // 其中包含 Pages 项目保留的 ASSETS binding。Pages 部署只需要 _worker.js 和 _routes.json，
  // 保留该文件会导致 wrangler 尝试使用错误的 Workers 配置，从而引发部署内部错误。
  rmSync(serverWranglerPath, { force: true });
  console.log('[cloudflare-pages] Removed dist/server/wrangler.json to avoid Pages deploy conflict.');
};

patchServerWranglerConfig();

writeFileSync(
  pagesWorkerEntry,
  [
    `import worker from './server/entry.mjs';`,
    ``,
    `const keystaticEnvKeys = ${JSON.stringify(keystaticEnvKeys)};`,
    `const requiredKeystaticEnvKeys = ${JSON.stringify(privateKeystaticEnvKeys)};`,
    ``,
    `const syncProcessEnv = (env) => {`,
    `  globalThis.process ??= {};`,
    `  globalThis.process.env ??= {};`,
    ``,
    `  for (const key of keystaticEnvKeys) {`,
    `    if (typeof env?.[key] === 'string') {`,
    `      globalThis.process.env[key] = env[key];`,
    `    }`,
    `  }`,
    `};`,
    ``,
    `const warnMissingKeystaticEnv = () => {`,
    `  const missing = requiredKeystaticEnvKeys.filter((key) => !globalThis.process?.env?.[key]);`,
    `  if (missing.length > 0) {`,
    `    console.warn(\`[cloudflare-pages] Missing Keystatic environment variables: \${missing.join(', ')}\`);`,
    `  }`,
    `};`,
    ``,
    `const parseRangeHeader = (rangeHeader, size) => {`,
    `  const match = /^bytes=(\\d*)-(\\d*)$/.exec(rangeHeader || '');`,
    `  if (!match || size <= 0) return null;`,
    ``,
    `  const startText = match[1];`,
    `  const endText = match[2];`,
    `  if (!startText && !endText) return null;`,
    ``,
    `  if (!startText) {`,
    `    const suffixLength = Number.parseInt(endText, 10);`,
    `    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;`,
    `    return {`,
    `      start: Math.max(0, size - suffixLength),`,
    `      end: size - 1,`,
    `    };`,
    `  }`,
    ``,
    `  const start = Number.parseInt(startText, 10);`,
    `  const end = endText ? Number.parseInt(endText, 10) : size - 1;`,
    `  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {`,
    `    return null;`,
    `  }`,
    ``,
    `  return {`,
    `    start,`,
    `    end: Math.min(end, size - 1),`,
    `  };`,
    `};`,
    ``,
    `const fetchMusicAsset = async (request, env) => {`,
    `  // 优先透传 ASSETS 的原生 Range 支持；仅在 ASSETS 返回完整文件时手动切片。`,
    `  const assetResponse = await env.ASSETS.fetch(request);`,
    `  const isRangeRequest = request.headers.has('range');`,
    `  const isRangeResponse =`,
    `    assetResponse.status === 206 || assetResponse.headers.has('content-range');`,
    ``,
    `  if (!isRangeRequest || isRangeResponse || !assetResponse.ok) {`,
    `    const headers = new Headers(assetResponse.headers);`,
    `    headers.set('Accept-Ranges', 'bytes');`,
    `    return new Response(request.method === 'HEAD' ? null : assetResponse.body, {`,
    `      status: assetResponse.status,`,
    `      statusText: assetResponse.statusText,`,
    `      headers,`,
    `    });`,
    `  }`,
    ``,
    `  const bytes = await assetResponse.arrayBuffer();`,
    `  const size = bytes.byteLength;`,
    `  const headers = new Headers(assetResponse.headers);`,
    `  headers.set('Accept-Ranges', 'bytes');`,
    ``,
    `  if (request.method === 'HEAD') {`,
    `    headers.set('Content-Length', String(size));`,
    `    return new Response(null, { status: assetResponse.status, headers });`,
    `  }`,
    ``,
    `  const range = parseRangeHeader(request.headers.get('range'), size);`,
    `  if (!range) {`,
    `    headers.set('Content-Range', \`bytes */\${size}\`);`,
    `    return new Response(null, { status: 416, headers });`,
    `  }`,
    ``,
    `  const chunk = bytes.slice(range.start, range.end + 1);`,
    `  headers.set('Content-Length', String(chunk.byteLength));`,
    `  headers.set('Content-Range', \`bytes \${range.start}-\${range.end}/\${size}\`);`,
    ``,
    `  return new Response(chunk, {`,
    `    status: 206,`,
    `    headers,`,
    `  });`,
    `};`,
    ``,
    `export default {`,
    `  async fetch(request, env, context) {`,
    `    syncProcessEnv(env);`,
    ``,
    `    const url = new URL(request.url);`,
    `    if (url.pathname.startsWith('/music/') && ['GET', 'HEAD'].includes(request.method)) {`,
    `      return fetchMusicAsset(request, env);`,
    `    }`,
    ``,
    `    if (url.pathname.startsWith('/keystatic') || url.pathname.startsWith('/api/keystatic')) {`,
    `      warnMissingKeystaticEnv();`,
    `    }`,
    ``,
    `    return worker.fetch(request, env, context);`,
    `  },`,
    `};`,
    '',
  ].join('\n')
);

writeFileSync(
  assetsIgnorePath,
  ['server/', 'client/', 'wrangler.json', '_worker.js', '.dev.vars', ''].join('\n')
);

writeFileSync(
  routesPath,
  `${JSON.stringify(
    {
      version: 1,
      include: ['/keystatic/*', '/api/keystatic/*'],
      exclude: [],
    },
    null,
    2
  )}\n`
);

console.log('[cloudflare-pages] Synced dist/client assets to dist root.');
console.log('[cloudflare-pages] Generated Pages advanced mode worker entry.');
console.log('[cloudflare-pages] Generated Pages function routes for all paths.');
