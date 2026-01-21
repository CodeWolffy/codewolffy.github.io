# 狼码纪

一个基于 Astro 构建的现代个人技术博客。

🌐 **在线访问**: [https://codewolffy.github.io](https://codewolffy.github.io)

## ✨ 特性

- ⚡ **极速性能** - 基于 Astro 5，静态站点生成
- 🎨 **深色/浅色主题** - 自动跟随系统或手动切换
- 🔍 **全文搜索** - 集成 Pagefind 搜索引擎
- 💬 **评论系统** - 基于 GitHub Discussions 的 Giscus
- 📑 **目录导航** - 自动生成文章目录
- 🏷️ **标签系统** - 文章分类管理
- 📱 **响应式设计** - 完美适配移动端

## 🛠️ 技术栈

- [Astro](https://astro.build/) - Web 框架
- [React](https://react.dev/) - UI 组件
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [MDX](https://mdxjs.com/) - 增强 Markdown

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📝 添加文章

在 `src/content/blog/` 目录下创建 `.mdx` 文件：

```mdx
---
title: "文章标题"
description: "文章描述"
pubDate: "2024-01-20"
heroImage: "封面图片URL"
tags: ["标签1", "标签2"]
---

文章内容...
```

## 📄 License

MIT
