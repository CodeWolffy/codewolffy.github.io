export function getCanonicalUrl(path: string | URL, primarySiteUrl: string | URL): URL {
  const primary = new URL(primarySiteUrl);
  const requested = new URL(path, primary);
  primary.pathname = requested.pathname;
  primary.search = '';
  primary.hash = '';
  return primary;
}

/** Keep JSON valid while preventing HTML from treating content as a closing script tag. */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError('Structured metadata must be JSON serializable.');
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return replacements[character];
  });
}

export const isIndexableTag = (postCount: number): boolean => postCount >= 2;

export function createRobotsTxt(primarySiteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /keystatic/',
    'Disallow: /api/keystatic/',
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', primarySiteUrl).href}`,
    '',
  ].join('\n');
}

export type ContentDates = { pubDate: Date; updatedDate?: Date };

export function hasValidContentDates(dates: ContentDates): boolean {
  return !dates.updatedDate || dates.updatedDate.valueOf() >= dates.pubDate.valueOf();
}

export function getLatestContentDate(posts: { data: ContentDates }[], fallback = new Date()): Date {
  if (posts.length === 0) return fallback;
  return new Date(
    Math.max(
      ...posts.flatMap(({ data }) => [
        data.pubDate.valueOf(),
        data.updatedDate?.valueOf() ?? data.pubDate.valueOf(),
      ])
    )
  );
}

export function getTaxonomyDescription(name: string, titles: string[]): string {
  const examples = titles
    .slice(0, 3)
    .map((title) => `《${title}》`)
    .join('、');
  return `${name}主题下的 ${titles.length} 篇技术文章${examples ? `，包括${examples}` : ''}。按发布时间浏览，查找相关原理、实践与问题排查记录。`;
}
