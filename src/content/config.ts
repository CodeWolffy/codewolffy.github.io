import { defineCollection, reference, z } from 'astro:content';

const categories = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
    }),
});

const tags = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
    }),
});

const blog = defineCollection({
    type: 'content',
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        coverImage: z.string().optional(),
        category: reference('categories').optional(),
        tags: z.array(reference('tags')).default([]),
        draft: z.boolean().default(false),
    }),
});

const pages = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        avatar: z.string().optional(),
        skills: z.array(z.string()).default([]),
        socialLinks: z.array(
            z.object({
                name: z.string(),
                url: z.string(),
                icon: z.string().optional(),
            })
        ).default([]),
        // Friends page specific fields
        applyTitle: z.string().optional(),
        applyDescription: z.string().optional(),
        contactMethods: z.array(
            z.object({
                name: z.string(),
                url: z.string(),
                icon: z.string().optional(),
            })
        ).optional(),
    }),
});

const friends = defineCollection({
    type: 'data',
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
    type: 'data',
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

export const collections = { blog, pages, friends, projects, categories, tags };
