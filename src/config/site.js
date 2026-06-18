export const siteConfig = {
  name: '狼码纪',
  description: '狼码纪 - 分享技术与创意的博客',
  author: {
    name: '狼码纪',
  },
  urls: {
    primary: 'https://codewolffy.pages.dev',
    githubPages: 'https://codewolffy.github.io',
  },
  og: {
    defaultImage: '/default-share.jpg',
    locale: 'zh_CN',
  },
  rss: {
    title: '狼码纪',
    description: '探索技术、编程与设计的边界',
    language: 'zh-cn',
    stylesheet: '/rss-style.xsl',
  },
  verification: {
    google: [
      'BY-N1ILCYoVzYJ1psC5ldCUPU5IxbG6wuKnRw03LIj0',
      '7XGmhuDPS4PTDQdHg6OchrT8wvbkdplfPqlSxX7gZ_I',
    ],
  },
  analytics: {
    busuanzi: {
      enabled: true,
      origin: '//busuanzi.ibruce.info',
      scriptId: 'busuanzi_script',
      scriptSrc: '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js',
      pagePvContainerId: 'busuanzi_container_page_pv',
      pagePvValueId: 'busuanzi_value_page_pv',
      timeoutMs: 5000,
    },
  },
  comments: {
    giscus: {
      id: 'comments',
      repo: 'CodeWolffy/codewolffy.github.io',
      repoId: 'R_kgDOQ9k4Jg',
      category: 'Announcements',
      categoryId: 'DIC_kwDOQ9k4Js4C1Mb7',
      mapping: 'pathname',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom',
      lang: 'zh-CN',
      loading: 'eager',
    },
  },
  links: {
    github: 'https://github.com/CodeWolffy',
    rss: '/rss.xml',
    keystaticPosts: 'https://codewolffy.pages.dev/keystatic/branch/main/collection/posts/item',
  },
  navigation: [
    { label: '首页', href: '/' },
    { label: '归档', href: '/archives' },
    { label: '分类/标签', href: '/categories' },
    { label: '项目', href: '/projects' },
    { label: '友链', href: '/friends' },
    { label: '关于', href: '/about' },
  ],
  socials: [
    { label: 'Bilibili', href: 'https://b23.tv/CWW8udk' },
    { label: 'Douyin', href: 'https://v.douyin.com/npIXkasyEdE' },
    { label: 'Instagram', href: 'https://www.instagram.com/codewolffy' },
    { label: 'GitHub', href: 'https://github.com/CodeWolffy' },
    { label: 'Juejin', href: 'https://juejin.cn/user/407261374331431' },
    { label: 'RSS', href: '/rss.xml' },
  ],
};

export function getSiteUrl({ isGitHubActions = false } = {}) {
  return isGitHubActions ? siteConfig.urls.githubPages : siteConfig.urls.primary;
}
