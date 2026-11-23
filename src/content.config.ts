import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// content/post/<Category>/<slug>.md -> id "<category>/<slug>" -> /post/<category>/<slug>/
const post = defineCollection({
  loader: glob({
    base: './content/post',
    pattern: '*/[a-z0-9]*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, '').toLowerCase(),
  }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    author: z.string().optional(),
    description: z.string().min(1),
    categories: z.array(z.string()).length(1),
    tags: z.array(z.string()).min(3),
    aliases: z.array(z.string()).default([]),
    comments: z.boolean().default(true),
  }),
});

// content/post/<Category>/_index.md -> id "<category>"
const section = defineCollection({
  loader: glob({
    base: './content/post',
    pattern: '*/_index.md',
    generateId: ({ entry }) => entry.split('/')[0].toLowerCase(),
  }),
  schema: z.object({ title: z.string(), description: z.string().optional() }),
});

// content/about.md -> "about", content/posts/_index.md -> "posts"
const page = defineCollection({
  loader: glob({
    base: './content',
    pattern: ['about.md', 'posts/_index.md'],
    generateId: ({ entry }) => entry.split('/')[0].replace(/\.md$/, ''),
  }),
  schema: z.object({ title: z.string(), description: z.string().optional() }),
});

export const collections = { post, section, page };
