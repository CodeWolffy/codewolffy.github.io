import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type SeriesEntry = CollectionEntry<'series'>;
export type TaxonomyCount = { id: string; name: string; count: number };
export type SeriesSummary = {
  series: SeriesEntry;
  posts: BlogPost[];
  postCount: number;
  latestPost?: BlogPost;
  latestUpdate?: Date;
};

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

export function getPostActivityDate(post: BlogPost) {
  return post.data.updatedDate ?? post.data.pubDate;
}

export function hasManagedSeriesPosts(series: SeriesEntry) {
  return (series.data.posts?.length ?? 0) > 0;
}

export function getSeriesPosts(posts: BlogPost[], series: SeriesEntry) {
  const postsById = new Map(posts.map((post) => [post.id, post]));
  return (series.data.posts ?? [])
    .map((postId) => postsById.get(postId))
    .filter((post): post is BlogPost => post !== undefined);
}

export function getSeriesPostNumber(series: SeriesEntry, post: BlogPost) {
  const managedIndex = series.data.posts?.indexOf(post.id) ?? -1;
  return managedIndex >= 0 ? managedIndex + 1 : undefined;
}

export function getPostSeries(seriesEntries: SeriesEntry[], post: BlogPost) {
  return seriesEntries.find((series) => series.data.posts?.includes(post.id));
}

export function createSeriesSummaries(seriesEntries: SeriesEntry[], posts: BlogPost[]) {
  return seriesEntries
    .map((series): SeriesSummary => {
      const seriesPosts = getSeriesPosts(posts, series);
      const latestPost = [...seriesPosts].sort(
        (a, b) => getPostActivityDate(b).valueOf() - getPostActivityDate(a).valueOf()
      )[0];

      return {
        series,
        posts: seriesPosts,
        postCount: seriesPosts.length,
        latestPost,
        latestUpdate: latestPost ? getPostActivityDate(latestPost) : undefined,
      };
    })
    .sort((a, b) => {
      const priorityDifference = b.series.data.priority - a.series.data.priority;
      if (priorityDifference) return priorityDifference;

      const latestDifference = (b.latestUpdate?.valueOf() ?? 0) - (a.latestUpdate?.valueOf() ?? 0);
      if (latestDifference) return latestDifference;

      return a.series.data.name.localeCompare(b.series.data.name, 'zh-CN');
    });
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
