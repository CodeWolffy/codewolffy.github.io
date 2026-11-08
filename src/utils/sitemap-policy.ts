import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { getCanonicalUrl, isIndexableTag } from './seo';

export async function createSitemapPolicy({
  contentDirectory,
  primarySiteUrl,
}: {
  contentDirectory: string;
  primarySiteUrl: string;
}) {
  const tagCounts = new Map<string, number>();
  async function collect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(file);
      } else if (/\.mdx?$/.test(entry.name)) {
        const source = await readFile(file, 'utf8');
        const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
        if (!match) continue;
        const data = parse(match[1]);
        if (data?.draft === true) continue;
        for (const tag of new Set<string>(Array.isArray(data?.tags) ? data.tags : [])) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    }
  }
  await collect(contentDirectory);

  return {
    canonicalize: (page: string) => getCanonicalUrl(page, primarySiteUrl).href,
    filter(page: string): boolean {
      const pathname = new URL(page, primarySiteUrl).pathname;
      if (/^\/(?:keystatic|api|search)(?:\/|$)/.test(pathname)) return false;
      if (/^\/404(?:\/|\.html|$)/.test(pathname)) return false;
      const tagMatch = /^\/tags\/(.+?)\/?$/.exec(pathname);
      if (tagMatch) {
        try {
          return isIndexableTag(tagCounts.get(decodeURIComponent(tagMatch[1])) ?? 0);
        } catch {
          return false;
        }
      }
      return true;
    },
  };
}
