/**
 * Drizzle スキーマ（SQLite）。
 *
 * 構造化メタ（Task/Proposal/Wiki メタ等）を保持する。Source の正本は
 * ファイル保存し、ここには正規化情報・ハッシュ・参照のみを持つ。
 */

import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  ProposalKind,
  ProposalStatus,
  TaskPriority,
  TaskStatus,
  WikiLinkStatus,
} from "@praxios/core";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").$type<TaskStatus>().notNull().default("new"),
  priority: text("priority").$type<TaskPriority>().notNull().default("medium"),
  dueDate: text("due_date"),
  triggerId: text("trigger_id"),
  completionCriteria: text("completion_criteria"),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceTitle: text("source_title"),
  sourceUrl: text("source_url"),
  sourceRefId: text("source_ref_id"),
  provider: text("provider"),
  sourcePath: text("source_path").notNull(),
  hash: text("hash").notNull(),
  occurredAt: text("occurred_at"),
  capturedAt: text("captured_at").notNull().default(now),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
});

export const contextItems = sqliteTable("context_items", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  sourceId: text("source_id").references(() => sources.id),
  sourceType: text("source_type").notNull(),
  title: text("title"),
  summary: text("summary"),
  occurredAt: text("occurred_at"),
  relevanceScore: real("relevance_score"),
  evidence: text("evidence"),
  createdAt: text("created_at").notNull().default(now),
});

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  proposalKind: text("proposal_kind").$type<ProposalKind>().notNull(),
  status: text("status").$type<ProposalStatus>().notNull().default("pending"),
  sourceIds: text("source_ids", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  taskId: text("task_id").references(() => tasks.id),
  destination: text("destination"),
  payload: text("payload", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  rationale: text("rationale"),
  createdBy: text("created_by").notNull().default("ai"),
  createdAt: text("created_at").notNull().default(now),
  reviewedAt: text("reviewed_at"),
  reviewerId: text("reviewer_id"),
  reviewComment: text("review_comment"),
  appliedAt: text("applied_at"),
});

export const wikiPages = sqliteTable("wiki_pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  tags: text("tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

export const wikiLinks = sqliteTable("wiki_links", {
  id: text("id").primaryKey(),
  fromPageId: text("from_page_id").notNull(),
  toPageId: text("to_page_id").notNull(),
  anchorText: text("anchor_text"),
  status: text("status").$type<WikiLinkStatus>().notNull(),
  sourceId: text("source_id"),
  confidence: real("confidence"),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

// ---- Registry（宣言レイヤー） -------------------------------------------

export const sourceDefinitions = sqliteTable("source_definitions", {
  kind: text("kind").primaryKey(),
  displayName: text("display_name").notNull(),
  provider: text("provider"),
  allowedProposalKinds: text("allowed_proposal_kinds", { mode: "json" })
    .$type<ProposalKind[]>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

export const proposalDefinitions = sqliteTable("proposal_definitions", {
  proposalKind: text("proposal_kind").primaryKey(),
  displayName: text("display_name").notNull(),
  approvalPolicy: text("approval_policy").notNull().default("always"),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});
