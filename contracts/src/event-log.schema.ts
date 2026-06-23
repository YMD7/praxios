import { z } from "zod";

import { IsoDateTimeSchema, NonEmptyStringSchema } from "./common.schema.js";
import {
  EventIdSchema,
  KnowledgeRefSchema,
  ReviewRefSchema,
  SourceRefSchema,
  TaskRefSchema,
} from "./ids.schema.js";

export const EventResultSchema = z.enum(["succeeded", "failed", "blocked"]);

export const EventLogEntrySchema = z.object({
  event_id: EventIdSchema,
  occurred_at: IsoDateTimeSchema,
  actor_id: NonEmptyStringSchema,
  agent_id: NonEmptyStringSchema.optional(),
  command: NonEmptyStringSchema,
  target: NonEmptyStringSchema,
  task_ref: TaskRefSchema.optional(),
  allowed_source_refs: z.array(SourceRefSchema).default([]),
  allowed_knowledge_refs: z.array(KnowledgeRefSchema).default([]),
  allowed_tools: z.array(NonEmptyStringSchema).default([]),
  approval_refs: z.array(ReviewRefSchema).default([]),
  previous_status: NonEmptyStringSchema.optional(),
  new_status: NonEmptyStringSchema.optional(),
  result: EventResultSchema,
  rationale: NonEmptyStringSchema,
  refs: z.array(NonEmptyStringSchema).default([]),
});

export type EventResult = z.infer<typeof EventResultSchema>;
export type EventLogEntry = z.infer<typeof EventLogEntrySchema>;
