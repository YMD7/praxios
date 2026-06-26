import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

export const taskStatusSchema = z.enum([
  'new',
  'triaging',
  'ready',
  'in_progress',
  'waiting',
  'needs_approval',
  'completed',
  'archived',
]);

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const taskSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z.string().datetime().nullable(),
  triggerId: idSchema.nullable(),
  completionCriteria: z.string().max(5000).nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createTaskSchema = taskSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    description: z.string().max(10000).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    triggerId: idSchema.nullable().optional(),
    completionCriteria: z.string().max(5000).nullable().optional(),
  });

export const updateTaskSchema = createTaskSchema.partial();

export const taskFilterSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().optional(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
