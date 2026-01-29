// @ts-check
import { config, fields, collection, singleton } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

export default config({
    ui: {
        brand: {
            name: '狼码纪博客后台',
            mark: () => (
                <>
                    <img src="/favicon.png" height={24} alt="Logo" />
                    <style>{`
                        /* 强制表格样式在编辑器中更易读 */
                        div[contenteditable] table {
                            width: 100% !important;
                            table-layout: auto !important;
                            border-collapse: collapse !important;
                            margin: 1em 0 !important;
                        }
                        div[contenteditable] td, 
                        div[contenteditable] th {
                            border: 1px solid #e2e8f0 !important;
                            padding: 8px 12px !important;
                            min-width: 50px;
                        }
                        div[contenteditable] th {
                            background-color: #f8fafc !important;
                            font-weight: bold !important;
                        }
                        /* 增加编辑器内容区的宽度限制，以便显示宽表格 */
                        div[data-keystatic-scroll-area] > div > div {
                            max-width: 900px !important;
                        }
                        /* 放大 GitHub 登录按钮 */
                        a[href*="/api/keystatic/github/login"] {
                            transform: scale(3);
                            transform-origin: center;
                            margin: 60px !important;
                        }
                    `}</style>
                </>
            )
        },
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
            columns: ['title', 'pubDate', 'draft'],
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
                category: fields.conditional(
                    fields.select({
                        label: '分类模式',
                        options: [
                            { label: '选择现有分类', value: 'existing' },
                            { label: '输入新分类', value: 'custom' },
                        ],
                        defaultValue: 'existing',
                    }),
                    {
                        existing: fields.relationship({
                            label: '选择分类',
                            collection: 'categories',
                        }),
                        custom: fields.text({
                            label: '输入分类名称',
                            description: '输入一个新的分类名称',
                        }),
                    }
                ),
                tags: fields.array(
                    fields.conditional(
                        fields.select({
                            label: '标签模式',
                            options: [
                                { label: '选择现有标签', value: 'existing' },
                                { label: '输入新标签', value: 'custom' },
                            ],
                            defaultValue: 'existing',
                        }),
                        {
                            existing: fields.relationship({
                                label: '选择标签',
                                collection: 'tags',
                            }),
                            custom: fields.text({
                                label: '输入标签名称',
                            }),
                        }
                    ),
                    {
                        label: '标签列表',
                        itemLabel: props => {
                            const val = props.value as any;
                            // Helper to extract label for the list item
                            if (val?.value) return val.value;
                            if (val?.discriminant === 'existing') return '选择标签';
                            if (val?.discriminant === 'custom') return '输入标签';
                            return '标签';
                        },
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
                    },
                    components: {
                        iframe: block({
                            label: '嵌入视频 (iframe)',
                            schema: {
                                src: fields.text({
                                    label: '视频地址 (Source URL)',
                                    description: '请输入 iframe 代码中 src 引号内的内容。如果您复制了整个 <iframe> 代码，请看下方的“智能提示”。'
                                }),
                                title: fields.text({ label: '标题 (Title)', description: '视频的简短描述，用于辅助功能' }),
                            },
                            ContentView: (props) => {
                                const rawSrc = props.value.src || '';
                                const title = props.value.title;

                                // 提取 URL 的逻辑
                                let src = rawSrc;
                                let warning = null;
                                let extractedUrl: string | null = null;

                                if (rawSrc.trim().startsWith('<iframe')) {
                                    const match = rawSrc.match(/src=["'](.*?)["']/);
                                    if (match && match[1]) {
                                        src = match[1];
                                        extractedUrl = match[1];
                                        warning = (
                                            <div style={{ marginTop: '8px', padding: '12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', color: '#92400e', fontSize: '13px' }}>
                                                <strong>⚠️ 检测到完整 iframe 代码</strong>
                                                <p style={{ margin: '4px 0' }}>请只保留 <code style={{ background: '#fef3c7', padding: '2px 4px', borderRadius: '4px' }}>src</code> 属性中的链接。</p>
                                                <div style={{ marginTop: '8px', padding: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', wordBreak: 'break-all', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>建议修改为：</div>
                                                    <div style={{ fontWeight: '500', color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>{extractedUrl}</div>
                                                    <button
                                                        type="button"
                                                        style={{
                                                            alignSelf: 'flex-start',
                                                            padding: '4px 12px',
                                                            background: '#2563eb',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            marginTop: '4px'
                                                        }}
                                                        onClick={() => {
                                                            if (extractedUrl) {
                                                                navigator.clipboard.writeText(extractedUrl);
                                                                alert('已复制链接！建议删除上方内容后粘贴。');
                                                            }
                                                        }}
                                                    >
                                                        📋 复制链接
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                }

                                // 处理预览用的 URL (尝试禁用自动播放)
                                const getPreviewSrc = (url: string) => {
                                    if (!url) return '';
                                    try {
                                        // 简单处理 Bilibili 和常见视频网站
                                        let previewUrl = url;
                                        if (url.includes('bilibili.com')) {
                                            // 确保包含 &autoplay=0
                                            if (!previewUrl.includes('autoplay=0')) {
                                                const separator = previewUrl.includes('?') ? '&' : '?';
                                                previewUrl = `${previewUrl}${separator}autoplay=0`;
                                            }
                                        }
                                        return previewUrl;
                                    } catch (e) {
                                        return url;
                                    }
                                };

                                const previewSrc = getPreviewSrc(src);

                                return (
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>🎥 视频嵌入预览</span>
                                            {extractedUrl && <span style={{ color: '#f59e0b' }}>⚠️ 格式需修正</span>}
                                        </div>

                                        {/* 预览区域 */}
                                        {src ? (
                                            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
                                                <iframe
                                                    src={previewSrc}
                                                    title={title}
                                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; presentation"
                                                    allowFullScreen
                                                    sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-presentation allow-modals"
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', zIndex: 0, opacity: warning ? 0.5 : 1, pointerEvents: 'none' }}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                                <div style={{ marginBottom: '8px', fontSize: '24px' }}>📺</div>
                                                请在右侧输入视频地址
                                            </div>
                                        )}

                                        {/* 警告信息 */}
                                        {warning && (
                                            <div style={{ padding: '0 12px 12px 12px' }}>
                                                {warning}
                                            </div>
                                        )}

                                        {title && (
                                            <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0', fontSize: '13px', textAlign: 'center', color: '#475569', background: '#fff' }}>
                                                {title}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        }),
                        Callout: block({
                            label: '提示框 (Callout)',
                            schema: {
                                type: fields.select({
                                    label: '类型',
                                    options: [
                                        { label: 'ℹ️ 信息 (Info)', value: 'info' },
                                        { label: '💡 提示 (Tip)', value: 'tip' },
                                        { label: '⚠️ 警告 (Warning)', value: 'warning' },
                                        { label: '🔥 危险 (Danger)', value: 'danger' },
                                    ],
                                    defaultValue: 'info'
                                }),
                                title: fields.text({ label: '标题 (可选)' }),
                                content: fields.child({
                                    kind: 'block',
                                    placeholder: '请输入提示内容...',
                                    formatting: {
                                        inlineMarks: 'inherit',
                                        softBreaks: 'inherit',
                                        listTypes: 'inherit',
                                    },
                                    links: 'inherit',
                                }),
                            },
                            ContentView: (props: any) => {
                                const typeMap: Record<string, { color: string; border: string; icon: string }> = {
                                    info: { color: '#eff6ff', border: '#bfdbfe', icon: 'ℹ️' },
                                    tip: { color: '#ecfdf5', border: '#a7f3d0', icon: '💡' },
                                    warning: { color: '#fffbeb', border: '#fde68a', icon: '⚠️' },
                                    danger: { color: '#fef2f2', border: '#fecaca', icon: '🔥' }
                                };
                                const style = typeMap[props.value.type || 'info'];
                                return (
                                    <div style={{ padding: '16px', background: style.color, border: `1px solid ${style.border}`, borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px', fontWeight: 'bold', marginBottom: '4px' }}>
                                            <span>{style.icon}</span>
                                            <span>{props.value.title}</span>
                                        </div>
                                        <div style={{ color: '#374151' }}>{props.children}</div>
                                        <style>{`
                                    /* Fix Keystatic Slash Menu Z-Index */
                                    div[role="listbox"],
                                    div[data-reach-menu-popover],
                                    [id^="headlessui-portal-root"] {
                                        z-index: 99999 !important;
                                    }
                                `}</style>
                                    </div>
                                );
                            }
                        }),
                        Mermaid: block({
                            label: '📊 Mermaid 图表',
                            schema: {
                                code: fields.object({
                                    value: fields.text({
                                        label: '图表代码',
                                        multiline: true,
                                        description: '输入 Mermaid 语法。常用类型：flowchart（流程图）、sequenceDiagram（时序图）、pie（饼图）、gantt（甘特图）'
                                    }),
                                }),
                            },
                            ContentView: (props) => {
                                const chart = props.value.code?.value || '';

                                // 简单的语法提示
                                const getChartType = (code: string) => {
                                    if (code.startsWith('flowchart') || code.startsWith('graph')) return '流程图';
                                    if (code.startsWith('sequenceDiagram')) return '时序图';
                                    if (code.startsWith('pie')) return '饼图';
                                    if (code.startsWith('gantt')) return '甘特图';
                                    if (code.startsWith('classDiagram')) return '类图';
                                    if (code.startsWith('erDiagram')) return 'ER图';
                                    if (code.startsWith('stateDiagram')) return '状态图';
                                    return '图表';
                                };

                                return (
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>📊 Mermaid {chart ? getChartType(chart.trim()) : '图表'}</span>
                                            {chart && <span style={{ color: '#22c55e' }}>✓ 已输入</span>}
                                        </div>

                                        {chart ? (
                                            <div style={{ padding: '16px', background: '#fff' }}>
                                                <pre style={{
                                                    margin: 0,
                                                    padding: '12px',
                                                    background: '#f1f5f9',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontFamily: 'ui-monospace, monospace',
                                                    overflow: 'auto',
                                                    maxHeight: '200px',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {chart}
                                                </pre>
                                                <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                                                    ⓘ 图表将在文章页面渲染显示
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                                <div style={{ marginBottom: '8px', fontSize: '24px' }}>📊</div>
                                                <div style={{ marginBottom: '12px' }}>请在上方“图表代码”中输入 Mermaid 代码</div>
                                                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                                    示例：flowchart TD; A--&gt;B;
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        }),
                    }, // Close components
                }), // Close fields.mdx
            }, // Close schema
        }), // Close posts collection
        friends: collection({
            label: '🔗 友情链接',
            slugField: 'name',
            columns: ['name', 'priority', 'url', 'description'],
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
                priority: fields.number({
                    label: '排序优先级',
                    defaultValue: 0,
                    description: '数字越大越靠前显示'
                }),
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
    }, // Close collections
});
