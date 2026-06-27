import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("New"),
  priority: text("priority").notNull().default("Medium"),
  dueDate: text("due_date"),
  triggerId: text("trigger_id"),
  completionCriteria: text("completion_criteria").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceTitle: text("source_title").notNull(),
  sourceUrl: text("source_url"),
  sourceRefId: text("source_ref_id"),
  provider: text("provider").notNull().default("manual"),
  occurredAt: text("occurred_at"),
  capturedAt: text("captured_at").notNull(),
  hash: text("hash").notNull(),
  sourcePath: text("source_path").notNull(),
  metadata: text("metadata").notNull().default("{}")
});

export const contextItems = sqliteTable("context_items", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  occurredAt: text("occurred_at"),
  relevanceScore: real("relevance_score").notNull().default(0.5),
  evidence: text("evidence").notNull().default("{}")
});

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  proposalType: text("proposal_type").notNull(),
  status: text("status").notNull().default("Pending"),
  sourceIds: text("source_ids").notNull().default("[]"),
  taskId: text("task_id"),
  destination: text("destination").notNull().default("{}"),
  payload: text("payload").notNull().default("{}"),
  evidence: text("evidence").notNull().default("{}"),
  rationale: text("rationale").notNull().default(""),
  createdBy: text("created_by").notNull().default("mock-ai-worker"),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewerId: text("reviewer_id"),
  reviewComment: text("review_comment"),
  appliedAt: text("applied_at")
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id").notNull(),
  status: text("status").notNull().default("Pending"),
  reviewerId: text("reviewer_id"),
  reviewedAt: text("reviewed_at"),
  comment: text("comment")
});

export const wikiPages = sqliteTable("wiki_pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  tags: text("tags").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const wikiLinks = sqliteTable("wiki_links", {
  id: text("id").primaryKey(),
  fromPageId: text("from_page_id").notNull(),
  toPageId: text("to_page_id").notNull(),
  anchorText: text("anchor_text"),
  status: text("status").notNull(),
  sourceId: text("source_id"),
  confidence: real("confidence").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const knowledgeLinks = sqliteTable("knowledge_links", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  wikiPageId: text("wiki_page_id").notNull(),
  relationType: text("relation_type").notNull().default("related"),
  evidence: text("evidence").notNull().default("{}")
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull()
});

