import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string(),
      tags: z.array(z.string()),
      description: z.string().optional(),
      summary: z.string().optional(),
      pubDate: z.coerce.date().optional(),
      date: z.coerce.date().optional(),
      readingTime: z.string().optional(),
      readTime: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      externalUrl: z.string().url().optional(),
      canonicalUrl: z.string().url().optional(),
    })
    .refine((data) => Boolean(data.description ?? data.summary), {
      message: 'Writing entries require description or summary.',
    })
    .refine((data) => Boolean(data.pubDate ?? data.date), {
      message: 'Writing entries require pubDate or date.',
    })
    .refine((data) => Boolean(data.readingTime ?? data.readTime), {
      message: 'Writing entries require readingTime or readTime.',
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