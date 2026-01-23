import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
    const posts = await getCollection('blog', ({ data }) => {
        return import.meta.env.PROD ? data.draft !== true : true;
    });

    // 按发布日期降序排序（最新的在前）
    const sortedPosts = posts.sort((a, b) =>
        b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );

    return rss({
        title: '狼码纪',
        description: '探索技术、编程与设计的边界',
        site: context.site,
        items: sortedPosts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.pubDate,
            description: post.data.description,
            link: `/blog/${post.slug}/`,
            // 添加作者信息
            customData: `<author>狼码纪</author>`,
        })),
        customData: `<language>zh-cn</language>`,
        stylesheet: '/rss-style.xsl',
    });
}

