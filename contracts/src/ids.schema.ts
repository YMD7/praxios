import { z } from "zod";

const idPattern = (prefix: string) => new RegExp(`^${prefix}[0-9A-HJKMNP-TV-Z]{26}$|^${prefix}[0-9]{4}$`, "u");

export const IdPrefixSchema = z.enum([
  "src_",
  "know_",
  "task_",
  "artifact_",
  "review_",
  "event_",
]);

export const SourceIdSchema = z.string().regex(idPattern("src_"));
export const KnowledgeIdSchema = z.string().regex(idPattern("know_"));
export const TaskIdSchema = z.string().regex(idPattern("task_"));
export const ArtifactIdSchema = z.string().regex(idPattern("artifact_"));
export const ReviewIdSchema = z.string().regex(idPattern("review_"));
export const EventIdSchema = z.string().regex(idPattern("event_"));

export const SourceRefSchema = SourceIdSchema;
export const KnowledgeRefSchema = KnowledgeIdSchema;
export const TaskRefSchema = TaskIdSchema;
export const ArtifactRefSchema = ArtifactIdSchema;
export const ReviewRefSchema = ReviewIdSchema;
export const EventRefSchema = EventIdSchema;

export type IdPrefix = z.infer<typeof IdPrefixSchema>;
export type SourceId = z.infer<typeof SourceIdSchema>;
export type KnowledgeId = z.infer<typeof KnowledgeIdSchema>;
export type TaskId = z.infer<typeof TaskIdSchema>;
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;
export type ReviewId = z.infer<typeof ReviewIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
