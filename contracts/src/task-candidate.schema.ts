import { z } from "zod";

import { NonEmptyStringSchema } from "./common.schema.js";
import { KnowledgeRefSchema, SourceRefSchema, TaskRefSchema } from "./ids.schema.js";

export const TaskCandidateStatusSchema = z.enum(["proposed", "confirmed", "dismissed", "merged"]);

export const TaskCandidateSchema = z.object({
  key: NonEmptyStringSchema,
  status: TaskCandidateStatusSchema.default("proposed"),
  title: NonEmptyStringSchema,
  trigger: NonEmptyStringSchema.optional(),
  inferred_intent: NonEmptyStringSchema.optional(),
  proposed_done_criteria: z.array(NonEmptyStringSchema).min(1),
  source_refs: z.array(SourceRefSchema).min(1),
  knowledge_refs: z.array(KnowledgeRefSchema).default([]),
  confidence: z.enum(["low", "medium", "high"]),
  uncertainty: z.string().default(""),
  extraction_rationale: NonEmptyStringSchema,
  related_task_refs: z.array(TaskRefSchema).default([]),
});

export type TaskCandidateStatus = z.infer<typeof TaskCandidateStatusSchema>;
export type TaskCandidate = z.infer<typeof TaskCandidateSchema>;
