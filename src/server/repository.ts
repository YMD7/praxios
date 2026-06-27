import { and, desc, eq } from "drizzle-orm";
import { db } from "./db/client";
import {
  approvals,
  auditEvents,
  contextItems,
  knowledgeLinks,
  proposals,
  sources,
  tasks,
  wikiLinks,
  wikiPages
} from "./db/schema";

export type JsonRecord = Record<string, unknown>;

export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const pack = (value: unknown) => JSON.stringify(value ?? {});
export const unpack = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const repository = {
  listTasks() {
    return db.select().from(tasks).orderBy(desc(tasks.updatedAt)).all();
  },

  getTask(taskId: string) {
    return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  },

  createTask(input: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    completionCriteria?: string;
  }) {
    const createdAt = now();
    const record = {
      id: id(),
      title: input.title,
      description: input.description ?? "",
      status: "New",
      priority: input.priority ?? "Medium",
      dueDate: input.dueDate ?? null,
      triggerId: null,
      completionCriteria: input.completionCriteria ?? "",
      createdAt,
      updatedAt: createdAt
    };
    db.insert(tasks).values(record).run();
    return record;
  },

  updateTask(taskId: string, patch: Partial<typeof tasks.$inferInsert>) {
    db.update(tasks)
      .set({ ...patch, updatedAt: now() })
      .where(eq(tasks.id, taskId))
      .run();
    return this.getTask(taskId);
  },

  listTaskContext(taskId: string) {
    return db
      .select()
      .from(contextItems)
      .where(eq(contextItems.taskId, taskId))
      .all();
  },

  createContext(input: {
    taskId: string;
    sourceType: string;
    sourceId: string;
    title: string;
    summary: string;
    occurredAt?: string | null;
    relevanceScore?: number;
    evidence?: JsonRecord;
  }) {
    const record = {
      id: id(),
      taskId: input.taskId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      summary: input.summary,
      occurredAt: input.occurredAt ?? null,
      relevanceScore: input.relevanceScore ?? 0.7,
      evidence: pack(input.evidence ?? {})
    };
    db.insert(contextItems).values(record).run();
    return record;
  },

  listSources() {
    return db.select().from(sources).orderBy(desc(sources.capturedAt)).all();
  },

  getSource(sourceId: string) {
    return db.select().from(sources).where(eq(sources.id, sourceId)).get();
  },

  createSource(input: typeof sources.$inferInsert) {
    db.insert(sources).values(input).run();
    return input;
  },

  listTaskProposals(taskId: string) {
    return db
      .select()
      .from(proposals)
      .where(eq(proposals.taskId, taskId))
      .orderBy(desc(proposals.createdAt))
      .all();
  },

  listProposals() {
    return db.select().from(proposals).orderBy(desc(proposals.createdAt)).all();
  },

  getProposal(proposalId: string) {
    return db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .get();
  },

  createProposal(input: {
    proposalType: string;
    sourceIds: string[];
    taskId?: string | null;
    destination: JsonRecord;
    payload: JsonRecord;
    evidence: JsonRecord;
    rationale: string;
  }) {
    const createdAt = now();
    const proposal = {
      id: id(),
      proposalType: input.proposalType,
      status: "Pending",
      sourceIds: pack(input.sourceIds),
      taskId: input.taskId ?? null,
      destination: pack(input.destination),
      payload: pack(input.payload),
      evidence: pack(input.evidence),
      rationale: input.rationale,
      createdBy: "mock-ai-worker",
      createdAt,
      reviewedAt: null,
      reviewerId: null,
      reviewComment: null,
      appliedAt: null
    };
    db.insert(proposals).values(proposal).run();

    const approval = {
      id: id(),
      proposalId: proposal.id,
      status: "Pending",
      reviewerId: null,
      reviewedAt: null,
      comment: null
    };
    db.insert(approvals).values(approval).run();

    return { proposal, approval };
  },

  updateProposal(proposalId: string, patch: Partial<typeof proposals.$inferInsert>) {
    db.update(proposals).set(patch).where(eq(proposals.id, proposalId)).run();
    return this.getProposal(proposalId);
  },

  listApprovals() {
    return db
      .select()
      .from(approvals)
      .orderBy(desc(approvals.reviewedAt))
      .all();
  },

  listPendingApprovals() {
    return db
      .select()
      .from(approvals)
      .where(eq(approvals.status, "Pending"))
      .all();
  },

  getApproval(approvalId: string) {
    return db.select().from(approvals).where(eq(approvals.id, approvalId)).get();
  },

  updateApproval(
    approvalId: string,
    patch: Partial<typeof approvals.$inferInsert>
  ) {
    db.update(approvals).set(patch).where(eq(approvals.id, approvalId)).run();
    return this.getApproval(approvalId);
  },

  listWikiPages() {
    return db.select().from(wikiPages).orderBy(desc(wikiPages.updatedAt)).all();
  },

  getWikiPage(pageId: string) {
    return db
      .select()
      .from(wikiPages)
      .where(eq(wikiPages.id, pageId))
      .get();
  },

  upsertWikiPage(input: {
    id: string;
    title: string;
    body: string;
    tags?: string[];
  }) {
    const existing = this.getWikiPage(input.id);
    const updatedAt = now();

    if (existing) {
      db.update(wikiPages)
        .set({
          title: input.title,
          body: input.body,
          tags: pack(input.tags ?? unpack(existing.tags, [])),
          updatedAt
        })
        .where(eq(wikiPages.id, input.id))
        .run();
      return this.getWikiPage(input.id);
    }

    const record = {
      id: input.id,
      title: input.title,
      body: input.body,
      tags: pack(input.tags ?? []),
      createdAt: updatedAt,
      updatedAt
    };
    db.insert(wikiPages).values(record).run();
    return record;
  },

  listWikiLinks(pageId: string) {
    return db
      .select()
      .from(wikiLinks)
      .where(eq(wikiLinks.fromPageId, pageId))
      .all();
  },

  replaceWikiLinks(
    pageId: string,
    links: Array<{ toPageId: string; anchorText?: string; status: string }>
  ) {
    db.delete(wikiLinks).where(eq(wikiLinks.fromPageId, pageId)).run();
    const timestamp = now();
    for (const link of links) {
      db.insert(wikiLinks)
        .values({
          id: id(),
          fromPageId: pageId,
          toPageId: link.toPageId,
          anchorText: link.anchorText ?? null,
          status: link.status,
          sourceId: null,
          confidence: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .run();
    }
  },

  listKnowledgeForTask(taskId: string) {
    return db
      .select()
      .from(knowledgeLinks)
      .where(eq(knowledgeLinks.taskId, taskId))
      .all();
  },

  ensureKnowledgeLink(taskId: string, wikiPageId: string, evidence: JsonRecord) {
    const existing = db
      .select()
      .from(knowledgeLinks)
      .where(
        and(
          eq(knowledgeLinks.taskId, taskId),
          eq(knowledgeLinks.wikiPageId, wikiPageId)
        )
      )
      .get();
    if (existing) return existing;

    const record = {
      id: id(),
      taskId,
      wikiPageId,
      relationType: "related",
      evidence: pack(evidence)
    };
    db.insert(knowledgeLinks).values(record).run();
    return record;
  },

  createAuditEvent(input: {
    eventType: string;
    entityType: string;
    entityId: string;
    payload: JsonRecord;
  }) {
    const record = {
      id: id(),
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: pack(input.payload),
      createdAt: now()
    };
    db.insert(auditEvents).values(record).run();
    return record;
  }
};

