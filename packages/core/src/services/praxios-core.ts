import type Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRuntimeConfig, type RuntimeConfig, type RuntimeConfigInput } from "../config.js";
import { openDatabase, type PraxiosDatabase } from "../db/client.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { parseProposalPayload } from "../proposals/definitions.js";
import {
  DeterministicProposalGenerator,
  type ProposalGenerator
} from "../proposals/generator.js";
import { PraxiosRepository } from "../repository.js";
import {
  createTaskSchema,
  ingestSourceSchema,
  updateTaskSchema,
  upsertWikiPageSchema,
  type CreateTaskInput,
  type IngestSourceInput,
  type JsonObject,
  type JsonValue,
  type Proposal,
  type Source,
  type UpdateTaskInput,
  type UpsertWikiPageInput
} from "../types.js";
import { extractWikiLinks } from "../wiki-links.js";

export interface IngestSourceResult {
  source: Source;
  proposals: Proposal[];
}

export interface ProcessPendingSourcesResult {
  processedSourceCount: number;
  proposalCount: number;
}

export interface PraxiosCoreOptions extends RuntimeConfigInput {
  proposalGenerator?: ProposalGenerator;
}

export class PraxiosCore {
  readonly config: RuntimeConfig;
  readonly db: PraxiosDatabase;
  readonly repo: PraxiosRepository;
  private readonly sqlite: Database.Database;
  private readonly proposalGenerator: ProposalGenerator;

  constructor(input: PraxiosCoreOptions = {}) {
    this.config = createRuntimeConfig(input);
    const opened = openDatabase(this.config);

    this.sqlite = opened.sqlite;
    this.db = opened.db;
    this.repo = new PraxiosRepository(this.db);
    this.proposalGenerator = input.proposalGenerator ?? new DeterministicProposalGenerator();
  }

  close(): void {
    this.sqlite.close();
  }

  listTasks() {
    return this.repo.listTasks();
  }

  getTask(id: string) {
    return this.repo.getTask(id);
  }

  getProposal(id: string) {
    return this.repo.getProposal(id);
  }

  createTask(input: CreateTaskInput) {
    const parsed = createTaskSchema.parse(input);
    const task = this.repo.createTask(parsed);

    this.repo.createAuditEvent({
      actor: "local-user",
      eventType: "task.created",
      subjectType: "task",
      subjectId: task.id,
      payload: { title: task.title }
    });

    return task;
  }

  updateTask(id: string, input: UpdateTaskInput) {
    const parsed = updateTaskSchema.parse(input);
    const task = this.repo.updateTask(id, parsed);

    this.repo.createAuditEvent({
      actor: "local-user",
      eventType: "task.updated",
      subjectType: "task",
      subjectId: task.id,
      payload: toJsonObject(parsed)
    });

    return task;
  }

  listContextItems(taskId: string) {
    return this.repo.listContextItems(taskId);
  }

  listSources() {
    return this.repo.listSources();
  }

  getSource(id: string) {
    return this.repo.getSource(id);
  }

  readSourceContent(id: string): string {
    const source = this.repo.getSource(id);
    if (!source) {
      throw new NotFoundError(`Source not found: ${id}`);
    }

    return fs.readFileSync(source.sourcePath, "utf8");
  }

  ingestSource(rawInput: IngestSourceInput): IngestSourceResult {
    const input = ingestSourceSchema.parse(rawInput);
    const id = randomUUID();
    const capturedAt = new Date().toISOString();
    const sourceDir = path.join(this.config.sourceDir, id);
    const sourcePath = path.join(sourceDir, "raw.txt");
    const metadata = toJsonObject({
      ...input.metadata,
      taskId: input.taskId ?? null
    });
    const hash = createHash("sha256").update(input.content).digest("hex");

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(sourcePath, input.content, "utf8");

    const source = this.repo.createSource({
      id,
      sourceType: input.sourceType,
      sourceTitle: input.sourceTitle,
      sourceUrl: input.sourceUrl ?? null,
      sourceRefId: input.sourceRefId ?? null,
      provider: input.provider ?? null,
      sourcePath,
      occurredAt: input.occurredAt ?? null,
      capturedAt,
      hash,
      metadata
    });

    this.repo.createAuditEvent({
      actor: "local-user",
      eventType: "source.ingested",
      subjectType: "source",
      subjectId: source.id,
      payload: {
        sourceType: source.sourceType,
        sourceTitle: source.sourceTitle,
        hash: source.hash
      }
    });

    const proposals = input.processNow ? this.generateProposalsForSource(source.id) : [];

    return { source: this.repo.getSource(source.id) ?? source, proposals };
  }

  processPendingSources(limit = 25): ProcessPendingSourcesResult {
    const pendingSources = this.repo.listPendingSources(limit);
    let proposalCount = 0;

    for (const source of pendingSources) {
      proposalCount += this.generateProposalsForSource(source.id).length;
    }

    return {
      processedSourceCount: pendingSources.length,
      proposalCount
    };
  }

  generateProposalsForSource(sourceId: string): Proposal[] {
    const source = this.repo.getSource(sourceId);
    if (!source) {
      throw new NotFoundError(`Source not found: ${sourceId}`);
    }

    if (source.processedAt) {
      return [];
    }

    const content = this.readSourceContent(source.id);
    const proposals = this.proposalGenerator
      .generate({ source, content })
      .map((proposal) => this.repo.createProposal(proposal));

    this.repo.markSourceProcessed(source.id);

    return proposals;
  }

  listProposals(options: { status?: "pending" | "applied" | "rejected"; taskId?: string } = {}) {
    return this.repo.listProposals(options);
  }

  applyProposal(id: string, reviewerId = "local-user", reviewComment: string | null = null) {
    return this.runInTransaction(() =>
      this.applyProposalWithinTransaction(id, reviewerId, reviewComment)
    );
  }

  private applyProposalWithinTransaction(
    id: string,
    reviewerId: string,
    reviewComment: string | null
  ) {
    const proposal = this.repo.getProposal(id);
    if (!proposal) {
      throw new NotFoundError(`Proposal not found: ${id}`);
    }
    if (proposal.status !== "pending") {
      throw new ConflictError(`Proposal is not pending: ${id}`, "proposal_not_pending");
    }

    let subjectType = "proposal";
    let subjectId = proposal.id;
    let appliedTaskId: string | undefined;

    if (proposal.proposalType === "task_create") {
      const payload = parseProposalPayload("task_create", proposal.payload);
      const task = this.repo.createTask({
        title: payload.title,
        description: payload.description,
        status: "New",
        priority: payload.priority,
        dueDate: payload.dueDate ?? null,
        triggerId: proposal.sourceIds[0] ?? null,
        completionCriteria: payload.completionCriteria
      });

      subjectType = "task";
      subjectId = task.id;
      appliedTaskId = task.id;
    }

    if (proposal.proposalType === "task_context") {
      if (!proposal.taskId) {
        throw new ConflictError(
          `Task context proposal has no taskId: ${proposal.id}`,
          "proposal_missing_task"
        );
      }

      const payload = parseProposalPayload("task_context", proposal.payload);
      this.repo.createContextItem({
        taskId: proposal.taskId,
        sourceId: proposal.sourceIds[0] ?? "",
        title: payload.title,
        summary: payload.summary,
        occurredAt: payload.occurredAt ?? null,
        relevanceScore: payload.relevanceScore,
        evidence: proposal.evidence
      });

      subjectType = "task";
      subjectId = proposal.taskId;
    }

    if (proposal.proposalType === "wiki_update") {
      const payload = parseProposalPayload("wiki_update", proposal.payload);
      const page = this.upsertWikiPage({
        pageId: payload.pageId,
        title: payload.title,
        body: payload.body,
        tags: payload.tags
      }, proposal.sourceIds[0] ?? null);

      subjectType = "wiki_page";
      subjectId = page.pageId;
    }

    const applied = this.repo.markProposalApplied(id, reviewerId, reviewComment, appliedTaskId);

    this.repo.createAuditEvent({
      actor: reviewerId,
      eventType: "proposal.applied",
      subjectType,
      subjectId,
      payload: {
        proposalId: proposal.id,
        proposalType: proposal.proposalType
      }
    });

    return applied;
  }

  rejectProposal(id: string, reviewerId = "local-user", reviewComment: string | null = null) {
    return this.runInTransaction(() => {
      const proposal = this.repo.getProposal(id);
      if (!proposal) {
        throw new NotFoundError(`Proposal not found: ${id}`);
      }
      if (proposal.status !== "pending") {
        throw new ConflictError(`Proposal is not pending: ${id}`, "proposal_not_pending");
      }

      const rejected = this.repo.rejectProposal(id, reviewerId, reviewComment);

      this.repo.createAuditEvent({
        actor: reviewerId,
        eventType: "proposal.rejected",
        subjectType: "proposal",
        subjectId: id,
        payload: {
          proposalType: proposal.proposalType
        }
      });

      return rejected;
    });
  }

  listWikiPages() {
    return this.repo.listWikiPages();
  }

  getWikiPage(pageId: string) {
    return this.repo.getWikiPage(pageId);
  }

  upsertWikiPage(rawInput: UpsertWikiPageInput, sourceId: string | null = null) {
    const input = upsertWikiPageSchema.parse(rawInput);
    const page = this.repo.upsertWikiPage(input);
    this.syncWikiLinks(page.pageId, page.body, sourceId);
    this.repo.resolveWikiLinksToPage(page.pageId);

    this.repo.createAuditEvent({
      actor: "local-user",
      eventType: "wiki_page.upserted",
      subjectType: "wiki_page",
      subjectId: page.pageId,
      payload: {
        title: page.title,
        sourceId
      }
    });

    return page;
  }

  listWikiLinks(pageId: string) {
    return this.repo.listWikiLinks(pageId);
  }

  listAuditEvents() {
    return this.repo.listAuditEvents();
  }

  private syncWikiLinks(pageId: string, body: string, sourceId: string | null): void {
    const links = extractWikiLinks(body).map((link) => ({
      toPageId: link.pageId,
      anchorText: link.anchorText,
      status: this.repo.getWikiPage(link.pageId) ? "resolved" as const : "unresolved" as const
    }));

    this.repo.replaceWikiLinks(pageId, links, sourceId);
  }

  private runInTransaction<T>(callback: () => T): T {
    return this.sqlite.transaction(callback)();
  }
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  const serialized = JSON.stringify(value);
  const parsed = JSON.parse(serialized) as JsonValue;

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as JsonObject;
  }

  return {};
}
