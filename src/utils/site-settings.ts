import { getEntry } from 'astro:content';
import { siteConfig } from '@/config/site';
import type { CollectionEntry } from 'astro:content';

export type SiteSettings = CollectionEntry<'site'>['data'];

/**
 * 从内容集合读取站点设置；若不存在则回退到同一份 JSON 配置。
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await getEntry('site', 'settings');
  if (settings) {
    return settings.data;
  }

  return siteConfig;
}
