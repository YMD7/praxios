import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

export const approvalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'revised',
]);

export const actionStatusSchema = z.enum([
  'pending',
  'executing',
  'completed',
  'failed',
]);

export const actionSchema = z.object({
  id: idSchema,
  taskId: idSchema.nullable(),
  type: z.string().min(1).max(100),
  status: actionStatusSchema,
  proposal: z.record(z.unknown()).default({}),
  target: z.record(z.unknown()).default({}),
  requiresApproval: z.boolean().default(true),
  createdBy: z.enum(['user', 'ai', 'system']).default('system'),
  createdAt: timestampSchema,
  executedAt: timestampSchema.nullable(),
});

export const approvalSchema = z.object({
  id: idSchema,
  actionId: idSchema,
  proposalId: idSchema.nullable(),
  status: approvalStatusSchema,
  reviewerId: z.string().max(200).nullable(),
  reviewedAt: timestampSchema.nullable(),
  comment: z.string().max(5000).nullable(),
});

export const createApprovalSchema = approvalSchema.omit({
  id: true,
  reviewedAt: true,
});

export const reviewActionSchema = z.object({
  status: z.enum(['approved', 'rejected', 'revised']),
  comment: z.string().max(5000).optional(),
});

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ActionStatus = z.infer<typeof actionStatusSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type CreateApproval = z.infer<typeof createApprovalSchema>;
export type ReviewAction = z.infer<typeof reviewActionSchema>;
