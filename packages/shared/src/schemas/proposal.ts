import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

export const proposalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'revised',
  'applied',
]);

export const proposalKindSchema = z.enum([
  'task_proposal',
  'wiki_update_proposal',
  'message_proposal',
]);

export const proposalDestinationSchema = z.enum([
  'task',
  'wiki',
  'message',
  'reference',
]);

export const proposalDefinitionSchema = z.object({
  id: idSchema,
  proposalKind: proposalKindSchema,
  displayName: z.string().min(1).max(200),
  schema: z.record(z.unknown()).default({}),
  evidencePolicy: z.record(z.unknown()).default({}),
  approvalPolicy: z.enum(['auto', 'manual', 'conditional']).default('manual'),
  applyPolicy: z.record(z.unknown()).default({}),
  targets: z.array(z.string()).default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const proposalSchema = z.object({
  id: idSchema,
  proposalType: proposalKindSchema,
  status: proposalStatusSchema,
  sourceIds: z.array(idSchema).default([]),
  taskId: idSchema.nullable(),
  destination: proposalDestinationSchema,
  payload: z.record(z.unknown()).default({}),
  evidence: z.array(z.record(z.unknown())).default([]),
  rationale: z.string().max(5000).nullable(),
  createdBy: z.enum(['user', 'ai']).default('user'),
  createdAt: timestampSchema,
  reviewedAt: timestampSchema.nullable(),
  reviewerId: z.string().max(200).nullable(),
  reviewComment: z.string().max(5000).nullable(),
  appliedAt: timestampSchema.nullable(),
});

export const createProposalSchema = proposalSchema
  .omit({
    id: true,
    status: true,
    createdAt: true,
    reviewedAt: true,
    reviewerId: true,
    reviewComment: true,
    appliedAt: true,
  })
  .extend({
    taskId: idSchema.nullable().optional(),
    rationale: z.string().max(5000).nullable().optional(),
  });

export const reviewProposalSchema = z.object({
  action: z.enum(['approve', 'reject', 'revise']),
  comment: z.string().max(5000).optional(),
});

export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type ProposalKind = z.infer<typeof proposalKindSchema>;
export type ProposalDestination = z.infer<typeof proposalDestinationSchema>;
export type ProposalDefinition = z.infer<typeof proposalDefinitionSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type CreateProposal = z.infer<typeof createProposalSchema>;
export type ReviewProposal = z.infer<typeof reviewProposalSchema>;
