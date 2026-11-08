import { fetchMusicAsset } from './music-assets.mjs';

const privateEnvKeys = [
  'KEYSTATIC_GITHUB_CLIENT_ID',
  'KEYSTATIC_GITHUB_CLIENT_SECRET',
  'KEYSTATIC_SECRET',
];
const keystaticEnvKeys = [...privateEnvKeys, 'PUBLIC_KEYSTATIC_GITHUB_APP_SLUG'];

export function createPagesWorker(astroWorker) {
  return {
    async fetch(request, env, context) {
      const { pathname } = new URL(request.url);
      // Pages excludes this directory in production; also guard pages dev's asset fallback.
      if (pathname === '/_worker.js' || pathname.startsWith('/_worker.js/')) {
        return new Response('Not found', { status: 404 });
      }
      globalThis.process ??= {};
      globalThis.process.env ??= {};
      for (const key of keystaticEnvKeys) {
        if (typeof env?.[key] === 'string') globalThis.process.env[key] = env[key];
      }

      if (pathname.startsWith('/music/') && ['GET', 'HEAD'].includes(request.method)) {
        return fetchMusicAsset(request, env);
      }
      if (pathname.startsWith('/keystatic') || pathname.startsWith('/api/keystatic')) {
        const missing = privateEnvKeys.filter((key) => !globalThis.process.env[key]);
        if (missing.length) {
          console.warn(
            `[cloudflare-pages] Missing Keystatic environment variables: ${missing.join(', ')}`
          );
        }
      }
      return astroWorker.fetch(request, env, context);
    },
  };
}
