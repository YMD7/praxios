import { relations, sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// Tasks
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: [
      'new',
      'triaging',
      'ready',
      'in_progress',
      'waiting',
      'needs_approval',
      'completed',
      'archived',
    ],
  })
    .notNull()
    .default('new'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'urgent'],
  }).default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  triggerId: text('trigger_id').references(() => triggers.id),
  completionCriteria: text('completion_criteria'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  trigger: one(triggers, {
    fields: [tasks.triggerId],
    references: [triggers.id],
  }),
  contextItems: many(contextItems),
  proposals: many(proposals),
  actions: many(actions),
  knowledgeLinks: many(knowledgeLinks),
}));

// Triggers
export const triggers = sqliteTable('triggers', {
  id: text('id').primaryKey(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  summary: text('summary').notNull(),
  detectedAt: integer('detected_at', { mode: 'timestamp' }).notNull(),
  confidence: integer('confidence').notNull().default(0),
});

export const triggersRelations = relations(triggers, ({ one }) => ({
  task: one(tasks),
}));

// Context Items
export const contextItems = sqliteTable('context_items', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }),
  relevanceScore: integer('relevance_score').default(0),
  evidence: text('evidence', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
});

export const contextItemsRelations = relations(contextItems, ({ one }) => ({
  task: one(tasks, {
    fields: [contextItems.taskId],
    references: [tasks.id],
  }),
}));

// Sources
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  sourceType: text('source_type').notNull(),
  sourceTitle: text('source_title'),
  sourceUrl: text('source_url'),
  sourceRefId: text('source_ref_id'),
  provider: text('provider', {
    enum: ['manual', 'slack', 'email', 'calendar', 'github', 'drive'],
  }).notNull(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }),
  capturedAt: integer('captured_at', { mode: 'timestamp' }).notNull(),
  hash: text('hash').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  contentPreview: text('content_preview'),
  storagePath: text('storage_path').notNull(),
});

export const sourcesRelations = relations(sources, ({ many }) => ({
  proposals: many(proposals),
}));

// Source Definitions
export const sourceDefinitions = sqliteTable('source_definitions', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull().unique(),
  displayName: text('display_name').notNull(),
  provider: text('provider', {
    enum: ['manual', 'slack', 'email', 'calendar', 'github', 'drive'],
  }).notNull(),
  owner: text('owner'),
  extractConfig: text('extract_config', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  normalizeConfig: text('normalize_config', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  routeHints: text('route_hints', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  allowedProposalKinds: text('allowed_proposal_kinds', { mode: 'json' }).$type<string[]>().default([]),
  defaults: text('defaults', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Proposals
export const proposals = sqliteTable('proposals', {
  id: text('id').primaryKey(),
  proposalType: text('proposal_type', {
    enum: ['task_proposal', 'wiki_update_proposal', 'message_proposal'],
  }).notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'revised', 'applied'],
  })
    .notNull()
    .default('pending'),
  sourceIds: text('source_ids', { mode: 'json' }).$type<string[]>().default([]),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  destination: text('destination', {
    enum: ['task', 'wiki', 'message', 'reference'],
  }).notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  evidence: text('evidence', { mode: 'json' }).$type<Record<string, unknown>[]>().default([]),
  rationale: text('rationale'),
  createdBy: text('created_by', { enum: ['user', 'ai'] })
    .notNull()
    .default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewerId: text('reviewer_id'),
  reviewComment: text('review_comment'),
  appliedAt: integer('applied_at', { mode: 'timestamp' }),
});

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  task: one(tasks, {
    fields: [proposals.taskId],
    references: [tasks.id],
  }),
  approvals: many(approvals),
  actions: many(actions),
}));

// Proposal Definitions
export const proposalDefinitions = sqliteTable('proposal_definitions', {
  id: text('id').primaryKey(),
  proposalKind: text('proposal_kind', {
    enum: ['task_proposal', 'wiki_update_proposal', 'message_proposal'],
  })
    .notNull()
    .unique(),
  displayName: text('display_name').notNull(),
  schema: text('schema', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  evidencePolicy: text('evidence_policy', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  approvalPolicy: text('approval_policy', {
    enum: ['auto', 'manual', 'conditional'],
  })
    .notNull()
    .default('manual'),
  applyPolicy: text('apply_policy', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  targets: text('targets', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Actions
export const actions = sqliteTable('actions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: text('status', {
    enum: ['pending', 'executing', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  proposal: text('proposal', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  target: text('target', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  requiresApproval: integer('requires_approval', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdBy: text('created_by', { enum: ['user', 'ai', 'system'] })
    .notNull()
    .default('system'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  executedAt: integer('executed_at', { mode: 'timestamp' }),
});

export const actionsRelations = relations(actions, ({ one, many }) => ({
  task: one(tasks, {
    fields: [actions.taskId],
    references: [tasks.id],
  }),
  approvals: many(approvals),
}));

// Approvals
export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  actionId: text('action_id')
    .notNull()
    .references(() => actions.id, { onDelete: 'cascade' }),
  proposalId: text('proposal_id').references(() => proposals.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'revised'],
  })
    .notNull()
    .default('pending'),
  reviewerId: text('reviewer_id'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  comment: text('comment'),
});

export const approvalsRelations = relations(approvals, ({ one }) => ({
  action: one(actions, {
    fields: [approvals.actionId],
    references: [actions.id],
  }),
  proposal: one(proposals, {
    fields: [approvals.proposalId],
    references: [proposals.id],
  }),
}));

// Wiki Pages
export const wikiPages = sqliteTable('wiki_pages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const wikiPagesRelations = relations(wikiPages, ({ many }) => ({
  outgoingLinks: many(wikiLinks, { relationName: 'fromPage' }),
  incomingLinks: many(wikiLinks, { relationName: 'toPage' }),
  knowledgeLinks: many(knowledgeLinks),
}));

// Wiki Links
export const wikiLinks = sqliteTable('wiki_links', {
  id: text('id').primaryKey(),
  fromPageId: text('from_page_id').notNull(),
  toPageId: text('to_page_id').notNull(),
  anchorText: text('anchor_text'),
  status: text('status', {
    enum: ['resolved', 'unresolved', 'ambiguous'],
  })
    .notNull()
    .default('unresolved'),
  sourceId: text('source_id'),
  confidence: integer('confidence').notNull().default(100),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const wikiLinksRelations = relations(wikiLinks, ({ one }) => ({
  fromPage: one(wikiPages, {
    fields: [wikiLinks.fromPageId],
    references: [wikiPages.id],
    relationName: 'fromPage',
  }),
  toPage: one(wikiPages, {
    fields: [wikiLinks.toPageId],
    references: [wikiPages.id],
    relationName: 'toPage',
  }),
}));

// Knowledge Links
export const knowledgeLinks = sqliteTable('knowledge_links', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  wikiPageId: text('wiki_page_id')
    .notNull()
    .references(() => wikiPages.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull().default('reference'),
  evidence: text('evidence', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
});

export const knowledgeLinksRelations = relations(knowledgeLinks, ({ one }) => ({
  task: one(tasks, {
    fields: [knowledgeLinks.taskId],
    references: [tasks.id],
  }),
  wikiPage: one(wikiPages, {
    fields: [knowledgeLinks.wikiPageId],
    references: [wikiPages.id],
  }),
}));
