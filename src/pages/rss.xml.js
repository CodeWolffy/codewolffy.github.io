import rss from '@astrojs/rss';
import { getPublicBlogPostsSorted } from '@/utils/posts';
import { getBlogPostPath } from '@/utils/content-paths';
import { siteConfig } from '@/config/site';

export async function GET(context) {
  const sortedPosts = await getPublicBlogPostsSorted();

  return rss({
    title: siteConfig.rss.title,
    description: siteConfig.rss.description,
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: getBlogPostPath(post),
      // 添加作者信息
      customData: `<author>${siteConfig.author.name}</author>`,
    })),
    customData: `<language>${siteConfig.rss.language}</language>`,
    stylesheet: siteConfig.rss.stylesheet,
  });
}
