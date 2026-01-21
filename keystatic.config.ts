// @ts-check
import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
    ui: {
        brand: { name: '我的博客后台' },
        navigation: {
            '博客管理': ['posts'],
            '页面管理': ['about', 'friends', 'projects'],
        },
    },
    storage: import.meta.env.PROD
        ? {
            kind: 'github',
            repo: 'CodeWolffy/codewolffy.github.io',
            // @ts-ignore
            clientId: 'Ov23liwH4UMYRee0g5mV',
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
                        icon: fields.text({ label: '图标 (Emoji)', defaultValue: '🔗' }),
                    }),
                    {
                        label: '社交链接',
                        itemLabel: props => props.fields.name.value
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
    },
    collections: {
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
                updatedDate: fields.date({ label: '更新日期' }),
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
                category: fields.text({ label: '分类 (Category)' }),
                tags: fields.array(
                    fields.text({ label: '标签' }),
                    {
                        label: '标签列表 (Tags)',
                        itemLabel: props => props.value || '标签',
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
