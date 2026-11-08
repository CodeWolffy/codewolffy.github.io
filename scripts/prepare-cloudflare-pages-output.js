import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot } from './lib/commands.mjs';

export function prepareCloudflarePagesOutput(root = projectRoot) {
  const distDir = resolve(root, 'dist');
  const rawBuild = resolve(root, '.astro/cloudflare-build');
  const clientDir = join(rawBuild, 'client');
  const serverDir = join(rawBuild, 'server');
  if (!existsSync(clientDir) || !existsSync(join(serverDir, 'entry.mjs'))) {
    throw new Error(
      'Cloudflare build is incomplete: expected .astro/cloudflare-build/client and server/entry.mjs.'
    );
  }

  const reserved = new Set([
    'server',
    'client',
    '_worker.js',
    'wrangler.toml',
    '.build-target.json',
  ]);
  // The adapter emits this Workers-only metadata file into client output.
  const entries = readdirSync(clientDir).filter((entry) => entry !== '.assetsignore');
  for (const entry of entries) {
    if (reserved.has(entry)) throw new Error(`Public asset conflicts with Pages output: ${entry}`);
  }
  if (relative(resolve(root), distDir) !== 'dist')
    throw new Error('Invalid Pages output directory.');
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  for (const entry of entries) {
    cpSync(join(clientDir, entry), join(distDir, entry), { recursive: true, force: true });
  }

  // Keep the adapter's Workers configuration intact. Pages has its own configuration.
  const originalConfig = readFileSync(join(root, 'wrangler.toml'), 'utf8');
  if (!/^pages_build_output_dir\s*=.*$/m.test(originalConfig)) {
    throw new Error('wrangler.toml must define pages_build_output_dir.');
  }
  const pagesConfigPath = join(root, '.astro', 'pages-wrangler.toml');
  writeFileSync(
    pagesConfigPath,
    originalConfig.replace(/^pages_build_output_dir\s*=.*$/m, 'pages_build_output_dir = "../dist"')
  );
  const redirectPath = join(root, '.wrangler', 'deploy', 'config.json');
  mkdirSync(dirname(redirectPath), { recursive: true });
  writeFileSync(
    redirectPath,
    `${JSON.stringify({ configPath: relative(dirname(redirectPath), pagesConfigPath), auxiliaryWorkers: [] }, null, 2)}\n`
  );

  // Pages excludes this reserved directory from static assets. .assetsignore is Workers-only.
  const workerDir = join(distDir, '_worker.js');
  mkdirSync(workerDir, { recursive: true });
  cpSync(serverDir, join(workerDir, 'server'), { recursive: true });
  for (const module of ['pages-worker.mjs', 'music-assets.mjs']) {
    cpSync(join(projectRoot, 'scripts', 'lib', module), join(workerDir, module));
  }
  writeFileSync(
    join(workerDir, 'index.js'),
    [
      "import astroWorker from './server/entry.mjs';",
      "import { createPagesWorker } from './pages-worker.mjs';",
      'export default createPagesWorker(astroWorker);',
      '',
    ].join('\n')
  );
  writeFileSync(
    join(distDir, '_routes.json'),
    `${JSON.stringify(
      {
        version: 1,
        include: [
          '/music/*',
          '/keystatic',
          '/keystatic/*',
          '/api/keystatic/*',
          '/_worker.js',
          '/_worker.js/*',
        ],
        exclude: [],
      },
      null,
      2
    )}\n`
  );
  console.log('[cloudflare-pages] Prepared static assets, Pages configuration and worker routes.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareCloudflarePagesOutput();
}
