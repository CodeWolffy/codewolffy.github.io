import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type TaxonomyCount = { id: string; name: string; count: number };

type TaxonomyEntry = { id: string; data: { name: string } };

export function shouldShowPost(data: BlogPost['data']) {
  return import.meta.env.PROD ? data.draft !== true : true;
}

export async function getPublicBlogPosts() {
  return getCollection('blog', ({ data }) => shouldShowPost(data));
}

export async function getPublicBlogPostsSorted() {
  const posts = await getPublicBlogPosts();
  return [...posts].sort(byNewestPost);
}

export function byNewestPost(a: BlogPost, b: BlogPost) {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}

export function createTaxonomyNameMap(entries: TaxonomyEntry[]) {
  return new Map(entries.map((entry) => [entry.id, entry.data.name]));
}

export function countPostCategories(posts: BlogPost[], categoryMap: Map<string, string>) {
  const categoryCounts: Record<string, TaxonomyCount> = {};

  posts.forEach((post) => {
    const categoryId = post.data.category;
    if (!categoryId) return;

    categoryCounts[categoryId] ??= {
      id: categoryId,
      name: categoryMap.get(categoryId) || categoryId,
      count: 0,
    };
    categoryCounts[categoryId].count++;
  });

  return Object.values(categoryCounts).sort((a, b) => b.count - a.count);
}

export function countPostTags(posts: BlogPost[], tagMap: Map<string, string>) {
  const tagCounts: Record<string, TaxonomyCount> = {};

  posts.forEach((post) => {
    post.data.tags?.forEach((tagId) => {
      tagCounts[tagId] ??= {
        id: tagId,
        name: tagMap.get(tagId) || tagId,
        count: 0,
      };
      tagCounts[tagId].count++;
    });
  });

  return Object.values(tagCounts).sort((a, b) => b.count - a.count);
}
