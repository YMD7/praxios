import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

export const wikiLinkStatusSchema = z.enum([
  'resolved',
  'unresolved',
  'ambiguous',
]);

export const wikiPageSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(500),
  body: z.string().max(100000).default(''),
  tags: z.array(z.string().max(50)).default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const wikiLinkSchema = z.object({
  id: idSchema,
  fromPageId: idSchema,
  toPageId: idSchema,
  anchorText: z.string().max(500).nullable(),
  status: wikiLinkStatusSchema,
  sourceId: idSchema.nullable(),
  confidence: z.number().min(0).max(1).default(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createWikiPageSchema = wikiPageSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tags: z.array(z.string().max(50)).optional(),
  });

export const updateWikiPageSchema = createWikiPageSchema.partial();

export const proposedLinkSchema = z.object({
  pageId: idSchema,
  anchorText: z.string().max(500).nullable(),
  confidence: z.number().min(0).max(1).default(1),
});

export type WikiLinkStatus = z.infer<typeof wikiLinkStatusSchema>;
export type WikiPage = z.infer<typeof wikiPageSchema>;
export type WikiLink = z.infer<typeof wikiLinkSchema>;
export type CreateWikiPage = z.infer<typeof createWikiPageSchema>;
export type UpdateWikiPage = z.infer<typeof updateWikiPageSchema>;
export type ProposedLink = z.infer<typeof proposedLinkSchema>;
