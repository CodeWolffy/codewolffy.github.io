import type { CollectionEntry } from 'astro:content';

type BlogPostEntry = Pick<CollectionEntry<'blog'>, 'id'>;
type SeriesEntry = Pick<CollectionEntry<'series'>, 'id'>;

export function getContentPathSegment(id: string): string {
  const normalizedId = id.replace(/\/index$/, '');
  return normalizedId.split('/').map(encodeURIComponent).join('/');
}

export function getBlogPostSlug(post: BlogPostEntry): string {
  return getContentPathSegment(post.id);
}

export function getBlogPostPath(post: BlogPostEntry): string {
  return `/blog/${getBlogPostSlug(post)}/`;
}

export function getTaxonomySlug(id: string): string {
  return getContentPathSegment(id);
}

export function getCategoryPath(id: string): string {
  return `/categories/${getTaxonomySlug(id)}/`;
}

export function getTagPath(id: string): string {
  return `/tags/${getTaxonomySlug(id)}/`;
}

export function getSeriesSlug(series: SeriesEntry | string): string {
  return getContentPathSegment(typeof series === 'string' ? series : series.id);
}

export function getSeriesPath(series: SeriesEntry | string): string {
  return `/series/${getSeriesSlug(series)}/`;
}
