// @ts-check
import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
    ui: {
        brand: { name: '我的博客后台' },
        navigation: {
            '博客管理': ['posts'],
            '页面管理': ['about', 'friendsPage', 'projects'],
            '友链管理': ['friends'],
        },
    },
    storage: process.env.NODE_ENV === 'production'
        ? {
            kind: 'github',
            repo: 'CodeWolffy/codewolffy.github.io',
        }
        : {
            kind: 'local',
        },
    singletons: {
        about: singleton({
            label: '🙋 关于我',
            path: 'src/content/pages/about',
            format: { contentField: 'content' },
            schema: {
                title: fields.text({ label: '页面标题', defaultValue: '关于我' }),
                subtitle: fields.text({ label: '页面副标题', defaultValue: '软件工程师 & 技术爱好者' }),
                description: fields.text({ label: '页面描述', multiline: true }),
                avatar: fields.image({
                    label: '头像',
                    directory: 'public/images/pages',
                    publicPath: '/images/pages/',
                    validation: { isRequired: false }
                }),
                skills: fields.array(
                    fields.text({ label: '技能' }),
                    {
                        label: '技术栈',
                        itemLabel: props => props.value || '技能',
                        description: '点击 "添加" 按钮增加新的技能'
                    }
                ),
                socialLinks: fields.array(
                    fields.object({
                        name: fields.text({ label: '名称' }),
                        url: fields.text({ label: '链接' }),
                        icon: fields.select({
                            label: '图标类型',
                            options: [
                                { label: 'GitHub', value: 'github' },
                                { label: '邮箱', value: 'mail' },
                                { label: 'QQ', value: 'qq' },
                                { label: '微信', value: 'wechat' },
                                { label: 'Twitter/X', value: 'twitter' },
                                { label: 'Instagram', value: 'instagram' },
                                { label: 'Bilibili', value: 'bilibili' },
                                { label: 'YouTube', value: 'youtube' },
                                { label: 'Telegram', value: 'telegram' },
                                { label: 'Discord', value: 'discord' },
                                { label: 'LinkedIn', value: 'linkedin' },
                                { label: '微博', value: 'weibo' },
                                { label: '知乎', value: 'zhihu' },
                                { label: '抖音/TikTok', value: 'tiktok' },
                                { label: '小红书', value: 'xiaohongshu' },
                                { label: '掘金', value: 'juejin' },
                                { label: '电话', value: 'phone' },
                                { label: '网站', value: 'globe' },
                                { label: '其他', value: 'link' },
                            ],
                            defaultValue: 'link'
                        }),
                    }),
                    {
                        label: '联系方式',
                        itemLabel: props => props.fields.name.value || '联系方式',
                        description: '添加社交联系方式'
                    }
                ),
                content: fields.mdx({
                    label: '详细介绍',
                    options: {
                        image: {
                            directory: 'public/images/pages',
                            publicPath: '/images/pages/'
                        }
                    }
                }),
            },
        }),
        friendsPage: singleton({
            label: '🔗 友链页面设置',
            path: 'src/content/pages/friends',
            format: { data: 'json' },
            schema: {
                title: fields.text({ label: '页面标题', defaultValue: '友情链接' }),
                description: fields.text({ label: '页面描述', defaultValue: '优质资源与友站推荐' }),
                applyTitle: fields.text({ label: '申请友链标题', defaultValue: '申请友链' }),
                applyDescription: fields.text({
                    label: '申请友链说明',
                    multiline: true,
                    defaultValue: '如果您想交换友链，请通过以下方式联系我，并提供您的站点名称、描述和头像。'
                }),
                contactMethods: fields.array(
                    fields.object({
                        name: fields.text({ label: '名称' }),
                        url: fields.text({ label: '链接' }),
                        icon: fields.select({
                            label: '图标类型',
                            options: [
                                { label: 'GitHub', value: 'github' },
                                { label: '邮箱', value: 'mail' },
                                { label: 'QQ', value: 'qq' },
                                { label: '微信', value: 'wechat' },
                                { label: 'Twitter/X', value: 'twitter' },
                                { label: 'Instagram', value: 'instagram' },
                                { label: 'Bilibili', value: 'bilibili' },
                                { label: 'YouTube', value: 'youtube' },
                                { label: 'Telegram', value: 'telegram' },
                                { label: 'Discord', value: 'discord' },
                                { label: 'LinkedIn', value: 'linkedin' },
                                { label: '微博', value: 'weibo' },
                                { label: '知乎', value: 'zhihu' },
                                { label: '抖音/TikTok', value: 'tiktok' },
                                { label: '小红书', value: 'xiaohongshu' },
                                { label: '掘金', value: 'juejin' },
                                { label: '电话', value: 'phone' },
                                { label: '网站', value: 'globe' },
                                { label: '其他', value: 'link' },
                            ],
                            defaultValue: 'link'
                        }),
                    }),
                    {
                        label: '联系方式',
                        itemLabel: props => props.fields.name.value || '联系方式',
                        description: '添加申请友链的联系方式'
                    }
                ),
            },
        }),
    },
    collections: {
        categories: collection({
            label: '🏷️ 分类管理',
            slugField: 'name',
            path: 'src/content/categories/*',
            format: { data: 'json' },
            schema: {
                name: fields.slug({ name: { label: '分类名称' } }),
            },
        }),
        tags: collection({
            label: '🔖 标签管理',
            slugField: 'name',
            path: 'src/content/tags/*',
            format: { data: 'json' },
            schema: {
                name: fields.slug({ name: { label: '标签名称' } }),
            },
        }),
        posts: collection({
            label: '✍️ 博客文章',
            slugField: 'title',
            columns: ['title', 'pubDate', 'category', 'draft'],
            path: 'src/content/blog/*',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({
                    name: { label: '文章标题' },
                    slug: {
                        label: '文章链接 (Slug)',
                        description: '这是文章的唯一网址标识。建议使用英文（例如：my-first-post），以便分享。',
                    }
                }),
                description: fields.text({
                    label: '摘要描述',
                    multiline: true,
                    description: '这句话会显示在文章列表页，也会作为 SEO 的描述。'
                }),
                pubDate: fields.date({
                    label: '发布日期',
                    defaultValue: { kind: 'today' }
                }),
                updatedDate: fields.date({
                    label: '更新日期',
                    description: '修改文章后，如需显示“最近修改时间”，请手动更新此日期。'
                }),
                coverImage: fields.image({
                    label: '封面图片 (上传)',
                    directory: 'public/images/posts',
                    publicPath: '/images/posts/',
                    validation: { isRequired: false },
                    description: '优先显示上传的图片'
                }),
                heroImage: fields.text({
                    label: '封面图片 (网络链接)',
                    description: '如果未上传图片，将显示此链接'
                }),
                draft: fields.checkbox({
                    label: '草稿状态',
                    description: '勾选后，文章将不会在生产环境中显示',
                    defaultValue: false,
                }),
                category: fields.relationship({
                    label: '分类',
                    collection: 'categories',
                }),
                tags: fields.array(
                    fields.relationship({
                        label: '标签',
                        collection: 'tags',
                    }),
                    {
                        label: '标签列表',
                        itemLabel: props => props.value || '选择标签',
                        description: '点击 "添加" 按钮增加多个标签'
                    }
                ),
                content: fields.mdx({
                    label: '正文内容',
                    options: {
                        image: {
                            directory: 'public/images/posts',
                            publicPath: '/images/posts/'
                        }
                    }
                }),
            },
        }),
        friends: collection({
            label: '🔗 友情链接',
            slugField: 'name',
            columns: ['name', 'url', 'description'],
            path: 'src/content/friends/*',
            format: { data: 'json' },
            schema: {
                name: fields.slug({
                    name: { label: '网站名称' },
                    slug: {
                        label: '文件名 (Slug)',
                        description: '友链的唯一标识，用于文件命名',
                    }
                }),
                description: fields.text({ label: '网站描述' }),
                avatar: fields.image({
                    label: '网站图标 (上传)',
                    directory: 'public/images/friends',
                    publicPath: '/images/friends/',
                    validation: { isRequired: false }
                }),
                avatarUrl: fields.text({
                    label: '网站图标 (网络链接)',
                    description: '如果未上传图片，将显示此链接'
                }),
                url: fields.text({ label: '网站地址' }),
            },
        }),
        projects: collection({
            label: '💼 项目展示',
            slugField: 'title',
            columns: ['title', 'priority', 'github'],
            path: 'src/content/projects/*',
            format: { data: 'json' },
            schema: {
                title: fields.slug({
                    name: { label: '项目名称' },
                    slug: {
                        label: '文件名 (Slug)',
                        description: '项目的唯一标识，用于文件命名',
                    }
                }),
                description: fields.text({ label: '项目描述', multiline: true }),
                coverImage: fields.image({
                    label: '封面图片 (上传)',
                    directory: 'public/images/projects',
                    publicPath: '/images/projects/',
                    validation: { isRequired: false },
                    description: '优先显示上传的图片'
                }),
                image: fields.text({
                    label: '封面图片 (网络链接)',
                    description: '如果未上传图片，将显示此链接'
                }),
                tags: fields.array(
                    fields.text({ label: '标签' }),
                    {
                        label: '技术栈标签',
                        itemLabel: props => props.value || '标签',
                        description: '添加项目使用的技术栈'
                    }
                ),
                github: fields.text({ label: 'GitHub 链接' }),
                demo: fields.text({ label: '演示链接（可选）' }),
                priority: fields.number({ label: '排序优先级', defaultValue: 0 }),
            },
        }),
    },
});
