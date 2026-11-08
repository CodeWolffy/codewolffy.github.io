import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function packageBinary(packageName, commandName = packageName) {
  const packageDir = resolve(projectRoot, 'node_modules', packageName);
  const metadata = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
  const binary = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin?.[commandName];
  if (!binary) throw new Error(`No ${commandName} executable in ${packageName}.`);
  return resolve(packageDir, binary);
}

export function runNode(args, env = process.env) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
