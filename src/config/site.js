import siteSettings from '../content/site/settings.json';

export const siteConfig = siteSettings;

export function getSiteUrl({ isGitHubActions = false } = {}) {
  return isGitHubActions ? siteConfig.urls.githubPages : siteConfig.urls.primary;
}
