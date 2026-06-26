import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

export const sourceProviderSchema = z.enum([
  'manual',
  'slack',
  'email',
  'calendar',
  'github',
  'drive',
]);

export const sourceDefinitionSchema = z.object({
  id: idSchema,
  kind: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  provider: sourceProviderSchema,
  owner: z.string().max(200).nullable(),
  extractConfig: z.record(z.unknown()).default({}),
  normalizeConfig: z.record(z.unknown()).default({}),
  routeHints: z.record(z.unknown()).default({}),
  allowedProposalKinds: z.array(z.string()).default([]),
  defaults: z.record(z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const sourceSchema = z.object({
  id: idSchema,
  sourceType: z.string().min(1).max(100),
  sourceTitle: z.string().max(500).nullable(),
  sourceUrl: z.string().url().max(2000).nullable(),
  sourceRefId: z.string().max(500).nullable(),
  provider: sourceProviderSchema,
  occurredAt: timestampSchema.nullable(),
  capturedAt: timestampSchema,
  hash: z.string().length(64),
  metadata: z.record(z.unknown()).default({}),
  contentPreview: z.string().max(2000).nullable(),
});

export const createSourceSchema = sourceSchema
  .omit({
    id: true,
    capturedAt: true,
    hash: true,
    contentPreview: true,
  })
  .extend({
    sourceTitle: z.string().max(500).nullable().optional(),
    sourceUrl: z.string().url().max(2000).nullable().optional(),
    sourceRefId: z.string().max(500).nullable().optional(),
    occurredAt: z.string().datetime().nullable().optional(),
    content: z.string().max(100000).default(''),
  });

export const sourceContentSchema = z.object({
  sourceId: idSchema,
  content: z.string(),
});

export type SourceProvider = z.infer<typeof sourceProviderSchema>;
export type SourceDefinition = z.infer<typeof sourceDefinitionSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type CreateSource = z.infer<typeof createSourceSchema>;
export type SourceContent = z.infer<typeof sourceContentSchema>;
