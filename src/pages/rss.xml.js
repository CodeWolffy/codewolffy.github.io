import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
    const posts = await getCollection('blog', ({ data }) => {
        return import.meta.env.PROD ? data.draft !== true : true;
    });
    return rss({
        title: '狼码纪',
        description: '探索技术、编程与设计的边界',
        site: context.site,
        items: posts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.pubDate,
            description: post.data.description,
            link: `/blog/${post.slug}/`,
        })),
        customData: `<language>zh-cn</language>`,
        stylesheet: '/rss-style.xsl',
    });
}
