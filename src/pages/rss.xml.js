import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '@/config/site';

export async function GET(context) {
    const posts = await getCollection('blog', ({ data }) => {
        return import.meta.env.PROD ? data.draft !== true : true;
    });

    // 按发布日期降序排序（最新的在前）
    const sortedPosts = posts.sort((a, b) =>
        b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );

    return rss({
        title: siteConfig.rss.title,
        description: siteConfig.rss.description,
        site: context.site,
        items: sortedPosts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.pubDate,
            description: post.data.description,
            link: `/blog/${post.slug}/`,
            // 添加作者信息
            customData: `<author>${siteConfig.author.name}</author>`,
        })),
        customData: `<language>${siteConfig.rss.language}</language>`,
        stylesheet: siteConfig.rss.stylesheet,
    });
}

