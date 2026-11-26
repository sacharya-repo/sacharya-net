import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    readingTime: z.string(),
    tags: z.array(z.string()),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ base: './src/content/case-studies', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()),
    order: z.number(),
    role: z.string(),
    domain: z.string(),
    metrics: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    ),
  }),
});

export const collections = {
  writing,
  'case-studies': caseStudies,
};
