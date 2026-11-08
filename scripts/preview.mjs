import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { getDeployTarget } from '../src/config/deploy-target.mjs';
import { packageBinary, projectRoot } from './lib/commands.mjs';

const metadataPath = resolve(projectRoot, '.astro/build-target.json');
if (!existsSync(metadataPath)) {
  throw new Error(
    'No completed build found. Run npm run build:cloudflare or npm run build:github.'
  );
}
const { target: storedTarget } = JSON.parse(readFileSync(metadataPath, 'utf8'));
const target = getDeployTarget(storedTarget);
let host = '127.0.0.1';
let port = '4321';
const options = process.argv.slice(2);
for (let index = 0; index < options.length; index += 1) {
  const option = options[index];
  if (!['--host', '--port'].includes(option) || !options[index + 1]) {
    throw new Error('Preview supports --host <address> and --port <number>.');
  }
  if (option === '--host') host = options[++index];
  else port = options[++index];
}
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error(`Invalid preview port: ${port}`);
}

const args =
  target === 'cloudflare'
    ? [packageBinary('wrangler'), 'pages', 'dev', 'dist', '--ip', host, '--port', port]
    : [packageBinary('astro'), 'preview', '--host', host, '--port', port];
const child = spawn(process.execPath, args, {
  cwd: projectRoot,
  env: { ...process.env, DEPLOY_TARGET: target },
  stdio: 'inherit',
  shell: false,
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
