import rss from '@astrojs/rss';
import { getPublicBlogPostsSorted } from '@/utils/posts';
import { getBlogPostPath } from '@/utils/content-paths';
import { getSiteSettings } from '@/utils/site-settings';
import { escapeXml, getLatestContentDate } from '@/utils/seo';

export async function GET() {
  const [sortedPosts, settings] = await Promise.all([
    getPublicBlogPostsSorted(),
    getSiteSettings(),
  ]);

  const lastBuildDate = getLatestContentDate(sortedPosts);

  return rss({
    title: settings.rss.title,
    description: settings.rss.description,
    site: settings.urls.primary,
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    items: sortedPosts.map((post) => {
      const categories = [post.data.category, ...(post.data.tags || [])].filter(Boolean);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: getBlogPostPath(post),
        customData: [
          `<dc:creator>${escapeXml(settings.author.name)}</dc:creator>`,
          ...categories.map((category) => `<category>${escapeXml(category)}</category>`),
        ].join(''),
      };
    }),
    customData: [
      `<language>${escapeXml(settings.rss.language)}</language>`,
      `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`,
    ].join(''),
    stylesheet: settings.rss.stylesheet,
  });
}
