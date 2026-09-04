import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contentLoader = (collection: string) =>
  glob({
    base: `./src/content/${collection}`,
    pattern: '**/*.{md,mdx}',
  });

const stripFileExtension = (entry: string) => entry.replace(/\.[^.]+$/, '').replace(/\\/g, '/');

const dataLoader = (collection: string) =>
  glob({
    base: `./src/content/${collection}`,
    pattern: '**/*.json',
    generateId: ({ entry }) => stripFileExtension(entry),
  });

const categories = defineCollection({
  loader: dataLoader('categories'),
  schema: z.object({
    name: z.string(),
  }),
});

const tags = defineCollection({
  loader: dataLoader('tags'),
  schema: z.object({
    name: z.string(),
  }),
});

const series = defineCollection({
  loader: dataLoader('series'),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    coverImage: z
      .string()
      .nullable()
      .optional()
      .transform((value) => value || undefined),
    status: z.enum(['ongoing', 'completed']),
    priority: z.number().default(0),
    posts: z.array(z.string()).default([]),
  }),
});

const blog = defineCollection({
  loader: contentLoader('blog'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    coverImage: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: contentLoader('pages'),
  schema: z.object({
    title: z.string(),
    tagline: z.string().optional(),
    subtitle: z.string().optional(),
    name: z.string().optional(),
    avatar: z.string().optional(),
    skills: z.array(z.string()).default([]),
    socialLinks: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
          icon: z.string().optional(),
        })
      )
      .default([]),
  }),
});

const friendsPage = defineCollection({
  loader: dataLoader('friendsPage'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    applyTitle: z.string().optional(),
    applyDescription: z.string().optional(),
    contactMethods: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
          icon: z.string().optional(),
        })
      )
      .default([]),
  }),
});

const friends = defineCollection({
  loader: dataLoader('friends'),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    avatar: z.string().optional(),
    avatarUrl: z.string().optional(),
    url: z.string(),
    priority: z.number().default(0),
  }),
});

const projects = defineCollection({
  loader: dataLoader('projects'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    coverImage: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()),
    github: z.string(),
    demo: z.string().nullable().optional(),
    priority: z.number().default(0),
  }),
});

const music = defineCollection({
  loader: dataLoader('music'),
  schema: z.object({
    files: z.array(z.string()).default([]),
  }),
});

const site = defineCollection({
  loader: dataLoader('site'),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    author: z.object({
      name: z.string(),
    }),
    urls: z.object({
      primary: z.string(),
      githubPages: z.string(),
    }),
    og: z.object({
      defaultImage: z.string(),
      locale: z.string(),
    }),
    rss: z.object({
      title: z.string(),
      description: z.string(),
      language: z.string(),
      stylesheet: z.string(),
    }),
    verification: z.object({
      google: z.array(z.string()).default([]),
    }),
    analytics: z.object({
      busuanzi: z.object({
        enabled: z.boolean().default(true),
        origin: z.string(),
        scriptId: z.string(),
        scriptSrc: z.string(),
        pagePvContainerId: z.string(),
        pagePvValueId: z.string(),
        timeoutMs: z.number(),
      }),
    }),
    comments: z.object({
      giscus: z.object({
        enabled: z.boolean().default(true),
        id: z.string(),
        repo: z.string(),
        repoId: z.string(),
        category: z.string(),
        categoryId: z.string(),
        mapping: z.string(),
        reactionsEnabled: z.string(),
        emitMetadata: z.string(),
        inputPosition: z.string(),
        lang: z.string(),
        loading: z.string(),
      }),
    }),
    socials: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
        })
      )
      .default([]),
    navigation: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
        })
      )
      .default([]),
    links: z.object({
      github: z.string(),
      rss: z.string(),
      keystaticPosts: z.string(),
    }),
    ui: z.object({
      home: z.object({
        badge: z.string(),
        taglineFallback: z.string(),
        subtitleFallback: z.string(),
        readButton: z.string(),
        archivesButton: z.string(),
        latestTitle: z.string(),
        viewAllText: z.string(),
      }),
      archives: z.object({
        eyebrow: z.string(),
        title: z.string(),
        description: z.string(),
      }),
      series: z.object({
        eyebrow: z.string(),
        title: z.string(),
        description: z.string(),
      }),
      taxonomy: z.object({
        eyebrow: z.string(),
        title: z.string(),
        description: z.string(),
      }),
      tags: z.object({
        eyebrow: z.string(),
        title: z.string(),
        description: z.string(),
      }),
      projects: z.object({
        eyebrow: z.string(),
        title: z.string(),
        description: z.string(),
        moreTitle: z.string(),
        moreDescription: z.string(),
      }),
      copyright: z.object({
        licenseName: z.string(),
        licenseUrl: z.string(),
        noticePrefix: z.string(),
        noticeSuffix: z.string(),
      }),
      footer: z.object({
        rights: z.string(),
      }),
    }),
  }),
});

export const collections = {
  blog,
  pages,
  friendsPage,
  friends,
  projects,
  music,
  categories,
  tags,
  series,
  site,
};
