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

const blog = defineCollection({
  loader: contentLoader('blog'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    coverImage: z.string().optional(),
    category: z
      .union([
        z.string(),
        z.object({
          discriminant: z.string(),
          value: z.any(),
        }),
      ])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && 'value' in val) return val.value;
        return undefined;
      }),
    tags: z
      .array(
        z.union([
          z.string(),
          z.object({
            discriminant: z.string(),
            value: z.any(),
          }),
        ])
      )
      .default([])
      .transform((tags) => {
        return tags
          .map((t) => {
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object' && 'value' in t) return t.value;
            return null;
          })
          .filter((t): t is string => typeof t === 'string');
      }),
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

export const collections = { blog, pages, friendsPage, friends, projects, categories, tags };
