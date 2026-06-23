import { z } from "zod";

import { IsoDateTimeSchema, NonEmptyStringSchema } from "./common.schema.js";
import { ArtifactIdSchema, SourceRefSchema, TaskRefSchema } from "./ids.schema.js";

export const ArtifactStatusSchema = z.enum(["draft", "proposed", "approved", "rejected", "archived"]);
export const ArtifactKindSchema = z.enum([
  "task_candidate_set",
  "artifact_draft",
  "knowledge_update_proposal",
]);

const ArtifactBaseSchema = z.object({
  id: ArtifactIdSchema,
  type: z.literal("artifact"),
  artifact_kind: ArtifactKindSchema,
  title: NonEmptyStringSchema,
  status: ArtifactStatusSchema,
  created: IsoDateTimeSchema,
  updated: IsoDateTimeSchema,
  source_refs: z.array(SourceRefSchema).default([]),
  generated_by: NonEmptyStringSchema,
  review_required: z.boolean(),
});

const TaskCandidateSetArtifactSchema = ArtifactBaseSchema.extend({
  artifact_kind: z.literal("task_candidate_set"),
  task_ref: z.never().optional(),
});

const TaskBoundArtifactSchema = ArtifactBaseSchema.extend({
  artifact_kind: z.enum(["artifact_draft", "knowledge_update_proposal"]),
  task_ref: TaskRefSchema,
});

export const ArtifactFrontmatterSchema = z.discriminatedUnion("artifact_kind", [
  TaskCandidateSetArtifactSchema,
  TaskBoundArtifactSchema,
]);

export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;
export type ArtifactFrontmatter = z.infer<typeof ArtifactFrontmatterSchema>;
