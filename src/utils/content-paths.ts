import type { CollectionEntry } from 'astro:content';

type BlogPostEntry = Pick<CollectionEntry<'blog'>, 'id'>;

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
