import { desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { PraxiosDatabase } from "./db/client.js";
import {
  auditEvents,
  contextItems,
  proposals,
  sources,
  tasks,
  wikiLinks,
  wikiPages,
  type AuditEventRow,
  type ContextItemRow,
  type ProposalRow,
  type SourceRow,
  type TaskRow,
  type WikiLinkRow,
  type WikiPageRow
} from "./db/schema.js";
import { parseJsonArray, parseJsonObject, stringifyJson } from "./json.js";
import type {
  AuditEvent,
  ContextItem,
  CreateTaskInput,
  JsonObject,
  Proposal,
  ProposalStatus,
  ProposalType,
  Source,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
  WikiLink,
  WikiPage
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    dueDate: row.dueDate,
    triggerId: row.triggerId,
    completionCriteria: row.completionCriteria,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapSource(row: SourceRow): Source {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    sourceRefId: row.sourceRefId,
    provider: row.provider,
    sourcePath: row.sourcePath,
    occurredAt: row.occurredAt,
    capturedAt: row.capturedAt,
    processedAt: row.processedAt,
    hash: row.hash,
    metadata: parseJsonObject(row.metadata)
  };
}

function mapContextItem(row: ContextItemRow): ContextItem {
  return {
    id: row.id,
    taskId: row.taskId,
    sourceId: row.sourceId,
    title: row.title,
    summary: row.summary,
    occurredAt: row.occurredAt,
    relevanceScore: row.relevanceScore,
    evidence: parseJsonObject(row.evidence)
  };
}

function mapProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    proposalType: row.proposalType as ProposalType,
    status: row.status as ProposalStatus,
    sourceIds: parseJsonArray(row.sourceIds),
    taskId: row.taskId,
    destination: parseJsonObject(row.destination),
    payload: parseJsonObject(row.payload),
    evidence: parseJsonObject(row.evidence),
    rationale: row.rationale,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    reviewerId: row.reviewerId,
    reviewComment: row.reviewComment,
    appliedAt: row.appliedAt
  };
}

function mapWikiPage(row: WikiPageRow): WikiPage {
  return {
    id: row.id,
    pageId: row.pageId,
    title: row.title,
    body: row.body,
    tags: parseJsonArray(row.tags),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapWikiLink(row: WikiLinkRow): WikiLink {
  return {
    id: row.id,
    fromPageId: row.fromPageId,
    toPageId: row.toPageId,
    anchorText: row.anchorText,
    status: row.status as "resolved" | "unresolved",
    sourceId: row.sourceId,
    confidence: row.confidence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    actor: row.actor,
    eventType: row.eventType,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    payload: parseJsonObject(row.payload),
    createdAt: row.createdAt
  };
}

export interface CreateSourceRecord {
  id: string;
  sourceType: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceRefId: string | null;
  provider: string | null;
  sourcePath: string;
  occurredAt: string | null;
  capturedAt: string;
  hash: string;
  metadata: JsonObject;
}

export interface CreateProposalRecord {
  proposalType: ProposalType;
  sourceIds: string[];
  taskId: string | null;
  destination: JsonObject;
  payload: JsonObject;
  evidence: JsonObject;
  rationale: string;
  createdBy: string;
}

export interface CreateContextRecord {
  taskId: string;
  sourceId: string;
  title: string;
  summary: string;
  occurredAt: string | null;
  relevanceScore: number;
  evidence: JsonObject;
}

export interface UpsertWikiPageRecord {
  pageId: string;
  title: string;
  body: string;
  tags: string[];
}

export class PraxiosRepository {
  constructor(private readonly db: PraxiosDatabase) {}

  listTasks(): Task[] {
    return this.db.select().from(tasks).orderBy(desc(tasks.updatedAt)).all().map(mapTask);
  }

  getTask(id: string): Task | null {
    const row = this.db.select().from(tasks).where(eq(tasks.id, id)).get();
    return row ? mapTask(row) : null;
  }

  createTask(input: CreateTaskInput): Task {
    const timestamp = nowIso();
    const id = randomUUID();

    this.db
      .insert(tasks)
      .values({
        id,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        triggerId: input.triggerId ?? null,
        completionCriteria: input.completionCriteria,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .run();

    return this.getRequiredTask(id);
  }

  updateTask(id: string, input: UpdateTaskInput): Task {
    const changes: Partial<typeof tasks.$inferInsert> = {
      updatedAt: nowIso()
    };

    if (input.title !== undefined) changes.title = input.title;
    if (input.description !== undefined) changes.description = input.description;
    if (input.status !== undefined) changes.status = input.status;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.dueDate !== undefined) changes.dueDate = input.dueDate;
    if (input.triggerId !== undefined) changes.triggerId = input.triggerId;
    if (input.completionCriteria !== undefined) {
      changes.completionCriteria = input.completionCriteria;
    }

    this.db.update(tasks).set(changes).where(eq(tasks.id, id)).run();
    return this.getRequiredTask(id);
  }

  listSources(): Source[] {
    return this.db.select().from(sources).orderBy(desc(sources.capturedAt)).all().map(mapSource);
  }

  listPendingSources(limit = 25): Source[] {
    return this.db
      .select()
      .from(sources)
      .where(isNull(sources.processedAt))
      .orderBy(desc(sources.capturedAt))
      .limit(limit)
      .all()
      .map(mapSource);
  }

  getSource(id: string): Source | null {
    const row = this.db.select().from(sources).where(eq(sources.id, id)).get();
    return row ? mapSource(row) : null;
  }

  createSource(input: CreateSourceRecord): Source {
    this.db
      .insert(sources)
      .values({
        ...input,
        processedAt: null,
        metadata: stringifyJson(input.metadata)
      })
      .run();

    return this.getRequiredSource(input.id);
  }

  markSourceProcessed(id: string): void {
    this.db
      .update(sources)
      .set({ processedAt: nowIso() })
      .where(eq(sources.id, id))
      .run();
  }

  listContextItems(taskId: string): ContextItem[] {
    return this.db
      .select()
      .from(contextItems)
      .where(eq(contextItems.taskId, taskId))
      .all()
      .map(mapContextItem);
  }

  createContextItem(input: CreateContextRecord): ContextItem {
    const id = randomUUID();

    this.db
      .insert(contextItems)
      .values({
        id,
        ...input,
        evidence: stringifyJson(input.evidence)
      })
      .run();

    const row = this.db
      .select()
      .from(contextItems)
      .where(eq(contextItems.id, id))
      .get();

    if (!row) {
      throw new Error(`Context item was not created: ${id}`);
    }

    return mapContextItem(row);
  }

  listProposals(options: { status?: ProposalStatus; taskId?: string } = {}): Proposal[] {
    const rows = this.db
      .select()
      .from(proposals)
      .orderBy(desc(proposals.createdAt))
      .all()
      .map(mapProposal);

    return rows.filter((proposal) => {
      if (options.status && proposal.status !== options.status) {
        return false;
      }
      if (options.taskId && proposal.taskId !== options.taskId) {
        return false;
      }
      return true;
    });
  }

  getProposal(id: string): Proposal | null {
    const row = this.db.select().from(proposals).where(eq(proposals.id, id)).get();
    return row ? mapProposal(row) : null;
  }

  createProposal(input: CreateProposalRecord): Proposal {
    const id = randomUUID();
    const timestamp = nowIso();

    this.db
      .insert(proposals)
      .values({
        id,
        proposalType: input.proposalType,
        status: "pending",
        sourceIds: stringifyJson(input.sourceIds),
        taskId: input.taskId,
        destination: stringifyJson(input.destination),
        payload: stringifyJson(input.payload),
        evidence: stringifyJson(input.evidence),
        rationale: input.rationale,
        createdBy: input.createdBy,
        createdAt: timestamp,
        reviewedAt: null,
        reviewerId: null,
        reviewComment: null,
        appliedAt: null
      })
      .run();

    return this.getRequiredProposal(id);
  }

  markProposalApplied(
    id: string,
    reviewerId: string,
    reviewComment: string | null,
    appliedTaskId?: string
  ): Proposal {
    const timestamp = nowIso();
    const changes: Partial<typeof proposals.$inferInsert> = {
      status: "applied",
      reviewedAt: timestamp,
      reviewerId,
      reviewComment,
      appliedAt: timestamp
    };

    if (appliedTaskId !== undefined) {
      changes.taskId = appliedTaskId;
    }

    this.db.update(proposals).set(changes).where(eq(proposals.id, id)).run();
    return this.getRequiredProposal(id);
  }

  rejectProposal(id: string, reviewerId: string, reviewComment: string | null): Proposal {
    this.db
      .update(proposals)
      .set({
        status: "rejected",
        reviewedAt: nowIso(),
        reviewerId,
        reviewComment
      })
      .where(eq(proposals.id, id))
      .run();

    return this.getRequiredProposal(id);
  }

  listWikiPages(): WikiPage[] {
    return this.db
      .select()
      .from(wikiPages)
      .orderBy(desc(wikiPages.updatedAt))
      .all()
      .map(mapWikiPage);
  }

  getWikiPage(pageId: string): WikiPage | null {
    const row = this.db
      .select()
      .from(wikiPages)
      .where(eq(wikiPages.pageId, pageId))
      .get();

    return row ? mapWikiPage(row) : null;
  }

  upsertWikiPage(input: UpsertWikiPageRecord): WikiPage {
    const existing = this.getWikiPage(input.pageId);
    const timestamp = nowIso();

    if (existing) {
      this.db
        .update(wikiPages)
        .set({
          title: input.title,
          body: input.body,
          tags: stringifyJson(input.tags),
          updatedAt: timestamp
        })
        .where(eq(wikiPages.pageId, input.pageId))
        .run();
    } else {
      this.db
        .insert(wikiPages)
        .values({
          id: randomUUID(),
          pageId: input.pageId,
          title: input.title,
          body: input.body,
          tags: stringifyJson(input.tags),
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .run();
    }

    return this.getRequiredWikiPage(input.pageId);
  }

  listWikiLinks(pageId: string): { outgoing: WikiLink[]; backlinks: WikiLink[] } {
    const outgoing = this.db
      .select()
      .from(wikiLinks)
      .where(eq(wikiLinks.fromPageId, pageId))
      .all()
      .map(mapWikiLink);
    const backlinks = this.db
      .select()
      .from(wikiLinks)
      .where(eq(wikiLinks.toPageId, pageId))
      .all()
      .map(mapWikiLink);

    return { outgoing, backlinks };
  }

  replaceWikiLinks(
    fromPageId: string,
    links: Array<{ toPageId: string; anchorText: string; status: "resolved" | "unresolved" }>,
    sourceId: string | null
  ): void {
    const timestamp = nowIso();

    this.db.delete(wikiLinks).where(eq(wikiLinks.fromPageId, fromPageId)).run();

    for (const link of links) {
      this.db
        .insert(wikiLinks)
        .values({
          id: randomUUID(),
          fromPageId,
          toPageId: link.toPageId,
          anchorText: link.anchorText,
          status: link.status,
          sourceId,
          confidence: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .run();
    }
  }

  resolveWikiLinksToPage(pageId: string): void {
    this.db
      .update(wikiLinks)
      .set({
        status: "resolved",
        updatedAt: nowIso()
      })
      .where(eq(wikiLinks.toPageId, pageId))
      .run();
  }

  createAuditEvent(input: {
    actor: string;
    eventType: string;
    subjectType: string;
    subjectId: string;
    payload: JsonObject;
  }): AuditEvent {
    const id = randomUUID();

    this.db
      .insert(auditEvents)
      .values({
        id,
        actor: input.actor,
        eventType: input.eventType,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        payload: stringifyJson(input.payload),
        createdAt: nowIso()
      })
      .run();

    const row = this.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.id, id))
      .get();

    if (!row) {
      throw new Error(`Audit event was not created: ${id}`);
    }

    return mapAuditEvent(row);
  }

  listAuditEvents(): AuditEvent[] {
    return this.db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt))
      .limit(100)
      .all()
      .map(mapAuditEvent);
  }

  private getRequiredTask(id: string): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return task;
  }

  private getRequiredSource(id: string): Source {
    const source = this.getSource(id);
    if (!source) {
      throw new Error(`Source not found: ${id}`);
    }
    return source;
  }

  private getRequiredProposal(id: string): Proposal {
    const proposal = this.getProposal(id);
    if (!proposal) {
      throw new Error(`Proposal not found: ${id}`);
    }
    return proposal;
  }

  private getRequiredWikiPage(pageId: string): WikiPage {
    const page = this.getWikiPage(pageId);
    if (!page) {
      throw new Error(`Wiki page not found: ${pageId}`);
    }
    return page;
  }
}
