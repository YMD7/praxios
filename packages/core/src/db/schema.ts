import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    dueDate: text("due_date"),
    triggerId: text("trigger_id"),
    completionCriteria: text("completion_criteria").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [index("tasks_status_idx").on(table.status)]
);

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    sourceType: text("source_type").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceUrl: text("source_url"),
    sourceRefId: text("source_ref_id"),
    provider: text("provider"),
    sourcePath: text("source_path").notNull(),
    occurredAt: text("occurred_at"),
    capturedAt: text("captured_at").notNull(),
    processedAt: text("processed_at"),
    hash: text("hash").notNull(),
    metadata: text("metadata").notNull()
  },
  (table) => [
    index("sources_type_idx").on(table.sourceType),
    index("sources_processed_idx").on(table.processedAt)
  ]
);

export const contextItems = sqliteTable(
  "context_items",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    occurredAt: text("occurred_at"),
    relevanceScore: real("relevance_score").notNull(),
    evidence: text("evidence").notNull()
  },
  (table) => [
    index("context_items_task_idx").on(table.taskId),
    index("context_items_source_idx").on(table.sourceId)
  ]
);

export const proposals = sqliteTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    proposalType: text("proposal_type").notNull(),
    status: text("status").notNull(),
    sourceIds: text("source_ids").notNull(),
    taskId: text("task_id"),
    destination: text("destination").notNull(),
    payload: text("payload").notNull(),
    evidence: text("evidence").notNull(),
    rationale: text("rationale").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    reviewedAt: text("reviewed_at"),
    reviewerId: text("reviewer_id"),
    reviewComment: text("review_comment"),
    appliedAt: text("applied_at")
  },
  (table) => [
    index("proposals_status_idx").on(table.status),
    index("proposals_task_idx").on(table.taskId)
  ]
);

export const wikiPages = sqliteTable(
  "wiki_pages",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    tags: text("tags").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [uniqueIndex("wiki_pages_page_id_idx").on(table.pageId)]
);

export const wikiLinks = sqliteTable(
  "wiki_links",
  {
    id: text("id").primaryKey(),
    fromPageId: text("from_page_id").notNull(),
    toPageId: text("to_page_id").notNull(),
    anchorText: text("anchor_text").notNull(),
    status: text("status").notNull(),
    sourceId: text("source_id"),
    confidence: real("confidence").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("wiki_links_from_idx").on(table.fromPageId),
    index("wiki_links_to_idx").on(table.toPageId)
  ]
);

export const knowledgeLinks = sqliteTable(
  "knowledge_links",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    wikiPageId: text("wiki_page_id").notNull(),
    relationType: text("relation_type").notNull(),
    evidence: text("evidence").notNull()
  },
  (table) => [
    index("knowledge_links_task_idx").on(table.taskId),
    index("knowledge_links_page_idx").on(table.wikiPageId)
  ]
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actor: text("actor").notNull(),
    eventType: text("event_type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("audit_events_subject_idx").on(table.subjectType, table.subjectId),
    index("audit_events_created_idx").on(table.createdAt)
  ]
);

export type TaskRow = typeof tasks.$inferSelect;
export type SourceRow = typeof sources.$inferSelect;
export type ContextItemRow = typeof contextItems.$inferSelect;
export type ProposalRow = typeof proposals.$inferSelect;
export type WikiPageRow = typeof wikiPages.$inferSelect;
export type WikiLinkRow = typeof wikiLinks.$inferSelect;
export type AuditEventRow = typeof auditEvents.$inferSelect;
