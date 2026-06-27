import { z } from "zod";

export const taskStatuses = [
  "New",
  "Triaging",
  "Ready",
  "In Progress",
  "Waiting",
  "Needs Approval",
  "Completed",
  "Archived"
] as const;

export const taskPriorities = ["Low", "Normal", "High", "Urgent"] as const;

export const proposalTypes = [
  "task_create",
  "task_context",
  "wiki_update"
] as const;

export const proposalStatuses = ["pending", "applied", "rejected"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type ProposalType = (typeof proposalTypes)[number];
export type ProposalStatus = (typeof proposalStatuses)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  triggerId: string | null;
  completionCriteria: string;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  sourceType: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceRefId: string | null;
  provider: string | null;
  sourcePath: string;
  occurredAt: string | null;
  capturedAt: string;
  processedAt: string | null;
  hash: string;
  metadata: JsonObject;
}

export interface ContextItem {
  id: string;
  taskId: string;
  sourceId: string;
  title: string;
  summary: string;
  occurredAt: string | null;
  relevanceScore: number;
  evidence: JsonObject;
}

export interface Proposal {
  id: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  sourceIds: string[];
  taskId: string | null;
  destination: JsonObject;
  payload: JsonObject;
  evidence: JsonObject;
  rationale: string;
  createdBy: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  reviewComment: string | null;
  appliedAt: string | null;
}

export interface WikiPage {
  id: string;
  pageId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiLink {
  id: string;
  fromPageId: string;
  toPageId: string;
  anchorText: string;
  status: "resolved" | "unresolved";
  sourceId: string | null;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  payload: JsonObject;
  createdAt: string;
}

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(taskStatuses).default("New"),
  priority: z.enum(taskPriorities).default("Normal"),
  dueDate: z.string().nullable().optional(),
  triggerId: z.string().nullable().optional(),
  completionCriteria: z.string().default("")
});

export const updateTaskSchema = createTaskSchema.partial();

export const ingestSourceSchema = z.object({
  sourceType: z.string().min(1).default("manual_note"),
  sourceTitle: z.string().min(1),
  content: z.string().min(1),
  sourceUrl: z.string().nullable().optional(),
  sourceRefId: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  occurredAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  taskId: z.string().nullable().optional(),
  processNow: z.boolean().default(true)
});

export const upsertWikiPageSchema = z.object({
  pageId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().default(""),
  tags: z.array(z.string()).default([])
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type IngestSourceInput = z.infer<typeof ingestSourceSchema>;
export type UpsertWikiPageInput = z.infer<typeof upsertWikiPageSchema>;
