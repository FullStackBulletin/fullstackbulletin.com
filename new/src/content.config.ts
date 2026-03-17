import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const issueLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  featured: z.boolean(),
});

const issueBookSchema = z.object({
  title: z.string(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  amazonUs: z.string().nullable(),
  amazonUk: z.string().nullable(),
});

const issueQuoteSchema = z.object({
  text: z.string(),
  author: z.string().nullable(),
  authorTitle: z.string().nullable(),
  authorUrl: z.string().nullable(),
});

const additionalLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
});

const issues = defineCollection({
  loader: glob({ pattern: '**/metadata.json', base: '../raw_archives' }),
  schema: z.object({
    issueNumber: z.number(),
    title: z.string(),
    slug: z.string(),
    date: z.string(),
    templateType: z.string(),
    intro: z.string().nullable(),
    quote: issueQuoteSchema.nullable(),
    links: z.array(issueLinkSchema),
    book: issueBookSchema.nullable(),
    additionalLinks: z.array(additionalLinkSchema).nullable(),
    sponsor: z.any().nullable(),
  }),
});

export const collections = { issues };
