import { getEntry } from 'astro:content';
import { siteConfig } from '@/config/site';
import type { CollectionEntry } from 'astro:content';

export type SiteSettings = CollectionEntry<'site'>['data'];

/**
 * 从内容集合读取站点设置；若不存在则回退到 src/config/site.js 的硬编码配置。
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await getEntry('site', 'settings');
  if (settings) {
    return settings.data;
  }

  return {
    name: siteConfig.name,
    description: siteConfig.description,
    author: siteConfig.author,
    urls: siteConfig.urls,
    og: siteConfig.og,
    rss: siteConfig.rss,
    verification: siteConfig.verification,
    analytics: siteConfig.analytics,
    comments: siteConfig.comments,
    socials: siteConfig.socials,
    navigation: siteConfig.navigation,
    links: siteConfig.links,
  };
}
