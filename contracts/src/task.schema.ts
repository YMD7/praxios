import { z } from "zod";

import { IsoDateTimeSchema, NonEmptyStringSchema } from "./common.schema.js";
import {
  ArtifactRefSchema,
  KnowledgeRefSchema,
  SourceRefSchema,
  TaskIdSchema,
} from "./ids.schema.js";

export const TaskStatusSchema = z.enum(["active", "blocked", "completed", "canceled"]);

export const TaskFrontmatterSchema = z.object({
  id: TaskIdSchema,
  type: z.literal("task"),
  title: NonEmptyStringSchema,
  status: TaskStatusSchema,
  created: IsoDateTimeSchema,
  updated: IsoDateTimeSchema,
  trigger_refs: z.array(ArtifactRefSchema),
  source_refs: z.array(SourceRefSchema),
  knowledge_refs: z.array(KnowledgeRefSchema),
  done_criteria: z.array(NonEmptyStringSchema).min(1),
  review_required: z.boolean(),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskFrontmatter = z.infer<typeof TaskFrontmatterSchema>;
