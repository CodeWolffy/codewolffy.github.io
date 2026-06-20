import rss from '@astrojs/rss';
import { getPublicBlogPostsSorted } from '@/utils/posts';
import { getBlogPostPath } from '@/utils/content-paths';
import { getSiteSettings } from '@/utils/site-settings';

export async function GET(context) {
  const [sortedPosts, settings] = await Promise.all([
    getPublicBlogPostsSorted(),
    getSiteSettings(),
  ]);

  return rss({
    title: settings.rss.title,
    description: settings.rss.description,
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: getBlogPostPath(post),
      // 添加作者信息
      customData: `<author>${settings.author.name}</author>`,
    })),
    customData: `<language>${settings.rss.language}</language>`,
    stylesheet: settings.rss.stylesheet,
  });
}
