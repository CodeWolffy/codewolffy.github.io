export const deployTargets = ['cloudflare', 'github'];

export function getDeployTarget(value) {
  const target = value || 'cloudflare';
  if (!deployTargets.includes(target)) {
    throw new Error(`Unknown DEPLOY_TARGET "${target}". Expected cloudflare or github.`);
  }
  return target;
}
