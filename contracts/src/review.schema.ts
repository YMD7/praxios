import { z } from "zod";

import { IsoDateTimeSchema, NonEmptyStringSchema } from "./common.schema.js";
import { ArtifactRefSchema, ReviewIdSchema, TaskRefSchema } from "./ids.schema.js";

export const ReviewStatusSchema = z.enum([
  "requested",
  "approved",
  "rejected",
  "changes_requested",
  "canceled",
]);
export const ReviewDecisionSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "changes_requested",
]);

export const ReviewFrontmatterSchema = z.object({
  id: ReviewIdSchema,
  type: z.literal("review"),
  title: NonEmptyStringSchema,
  status: ReviewStatusSchema,
  created: IsoDateTimeSchema,
  updated: IsoDateTimeSchema,
  target_ref: z.union([TaskRefSchema, ArtifactRefSchema]),
  requested_by: NonEmptyStringSchema,
  decision: ReviewDecisionSchema,
  rationale: NonEmptyStringSchema,
  approval_scope: z.array(NonEmptyStringSchema).default([]),
});

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ReviewFrontmatter = z.infer<typeof ReviewFrontmatterSchema>;
