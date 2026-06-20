import rss from '@astrojs/rss';
import { getPublicBlogPostsSorted } from '@/utils/posts';
import { getBlogPostPath } from '@/utils/content-paths';
import { getSiteSettings } from '@/utils/site-settings';

export async function GET(context) {
  const [sortedPosts, settings] = await Promise.all([
    getPublicBlogPostsSorted(),
    getSiteSettings(),
  ]);

  const lastBuildDate = sortedPosts.length
    ? sortedPosts[0].data.updatedDate || sortedPosts[0].data.pubDate
    : new Date();

  return rss({
    title: settings.rss.title,
    description: settings.rss.description,
    site: context.site,
    items: sortedPosts.map((post) => {
      const categories = [post.data.category, ...(post.data.tags || [])].filter(Boolean);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: getBlogPostPath(post),
        customData: [
          `<author>${settings.author.name}</author>`,
          ...categories.map((category) => `<category>${category}</category>`),
        ].join(''),
      };
    }),
    customData: [
      `<language>${settings.rss.language}</language>`,
      `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`,
    ].join(''),
    stylesheet: settings.rss.stylesheet,
  });
}
