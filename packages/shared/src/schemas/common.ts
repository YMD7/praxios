import { z } from 'zod';

export const idSchema = z.string().min(1).max(64);

export const timestampSchema = z.string().datetime();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  });

export type Id = z.infer<typeof idSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
