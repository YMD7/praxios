import type Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRuntimeConfig, type RuntimeConfig, type RuntimeConfigInput } from "../config.js";
import { openDatabase, type PraxiosDatabase } from "../db/client.js";
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
import { createPageIdFromTitle, extractWikiLinks } from "../wiki-links.js";

export interface IngestSourceResult {
  source: Source;
  proposals: Proposal[];
}

export interface ProcessPendingSourcesResult {
  processedSourceCount: number;
  proposalCount: number;
}

export class PraxiosCore {
  readonly config: RuntimeConfig;
  readonly db: PraxiosDatabase;
  readonly repo: PraxiosRepository;
  private readonly sqlite: Database.Database;

  constructor(input: RuntimeConfigInput = {}) {
    this.config = createRuntimeConfig(input);
    const opened = openDatabase(this.config);

    this.sqlite = opened.sqlite;
    this.db = opened.db;
    this.repo = new PraxiosRepository(this.db);
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
      throw new Error(`Source not found: ${id}`);
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
      throw new Error(`Source not found: ${sourceId}`);
    }

    if (source.processedAt) {
      return [];
    }

    const content = this.readSourceContent(source.id);
    const summary = summarizeText(content);
    const excerpt = content.slice(0, 600);
    const taskId = getMetadataString(source.metadata, "taskId");
    const proposals: Proposal[] = [];

    if (taskId) {
      proposals.push(
        this.repo.createProposal({
          proposalType: "task_context",
          sourceIds: [source.id],
          taskId,
          destination: { kind: "task", taskId },
          payload: {
            title: source.sourceTitle,
            summary,
            occurredAt: source.occurredAt,
            relevanceScore: 0.82
          },
          evidence: { sourceId: source.id, excerpt },
          rationale: "既存タスクに関連する Source として取り込まれたため、Context 追加を提案する。",
          createdBy: "ai-worker"
        })
      );
    } else {
      proposals.push(
        this.repo.createProposal({
          proposalType: "task_create",
          sourceIds: [source.id],
          taskId: null,
          destination: { kind: "task" },
          payload: {
            title: source.sourceTitle,
            description: summary,
            priority: "Normal",
            completionCriteria: "Source の内容を確認し、完了条件を確定する。"
          },
          evidence: { sourceId: source.id, excerpt },
          rationale: "未紐づけの Source から作業トリガーを検出したため、Task 作成を提案する。",
          createdBy: "ai-worker"
        })
      );
    }

    const pageId = createPageIdFromTitle(source.sourceTitle) || `source-${source.id.slice(0, 8)}`;

    proposals.push(
      this.repo.createProposal({
        proposalType: "wiki_update",
        sourceIds: [source.id],
        taskId,
        destination: { kind: "wiki", pageId },
        payload: {
          pageId,
          title: source.sourceTitle,
          body: `# ${source.sourceTitle}\n\n${summary}\n\n## Evidence\n\nSource: ${source.id}`,
          tags: ["source", source.sourceType]
        },
        evidence: { sourceId: source.id, excerpt },
        rationale: "Source から再利用可能な業務知識を抽出し、Wiki 更新を提案する。",
        createdBy: "ai-worker"
      })
    );

    this.repo.markSourceProcessed(source.id);

    return proposals;
  }

  listProposals(options: { status?: "pending" | "applied" | "rejected"; taskId?: string } = {}) {
    return this.repo.listProposals(options);
  }

  applyProposal(id: string, reviewerId = "local-user", reviewComment: string | null = null) {
    const proposal = this.repo.getProposal(id);
    if (!proposal) {
      throw new Error(`Proposal not found: ${id}`);
    }
    if (proposal.status !== "pending") {
      throw new Error(`Proposal is not pending: ${id}`);
    }

    let subjectType = "proposal";
    let subjectId = proposal.id;
    let appliedTaskId: string | undefined;

    if (proposal.proposalType === "task_create") {
      const task = this.repo.createTask({
        title: getPayloadString(proposal.payload, "title", "Untitled task"),
        description: getPayloadString(proposal.payload, "description", ""),
        status: "New",
        priority: getPayloadPriority(proposal.payload),
        dueDate: null,
        triggerId: proposal.sourceIds[0] ?? null,
        completionCriteria: getPayloadString(
          proposal.payload,
          "completionCriteria",
          "完了条件を確定する。"
        )
      });

      subjectType = "task";
      subjectId = task.id;
      appliedTaskId = task.id;
    }

    if (proposal.proposalType === "task_context") {
      if (!proposal.taskId) {
        throw new Error(`Task context proposal has no taskId: ${proposal.id}`);
      }

      this.repo.createContextItem({
        taskId: proposal.taskId,
        sourceId: proposal.sourceIds[0] ?? "",
        title: getPayloadString(proposal.payload, "title", "Context"),
        summary: getPayloadString(proposal.payload, "summary", ""),
        occurredAt: getPayloadNullableString(proposal.payload, "occurredAt"),
        relevanceScore: getPayloadNumber(proposal.payload, "relevanceScore", 0.7),
        evidence: proposal.evidence
      });

      subjectType = "task";
      subjectId = proposal.taskId;
    }

    if (proposal.proposalType === "wiki_update") {
      const page = this.upsertWikiPage({
        pageId: getPayloadString(proposal.payload, "pageId", `proposal-${proposal.id}`),
        title: getPayloadString(proposal.payload, "title", "Untitled page"),
        body: getPayloadString(proposal.payload, "body", ""),
        tags: getPayloadStringArray(proposal.payload, "tags")
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
    const rejected = this.repo.rejectProposal(id, reviewerId, reviewComment);

    this.repo.createAuditEvent({
      actor: reviewerId,
      eventType: "proposal.rejected",
      subjectType: "proposal",
      subjectId: id,
      payload: {
        proposalType: rejected.proposalType
      }
    });

    return rejected;
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
}

function summarizeText(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 500) {
    return normalized;
  }
  return `${normalized.slice(0, 500)}...`;
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  const serialized = JSON.stringify(value);
  const parsed = JSON.parse(serialized) as JsonValue;

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as JsonObject;
  }

  return {};
}

function getMetadataString(metadata: JsonObject, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getPayloadString(payload: JsonObject, key: string, fallback: string): string {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getPayloadNullableString(payload: JsonObject, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getPayloadNumber(payload: JsonObject, key: string, fallback: number): number {
  const value = payload[key];
  return typeof value === "number" ? value : fallback;
}

function getPayloadPriority(payload: JsonObject): "Low" | "Normal" | "High" | "Urgent" {
  const value = payload.priority;
  if (value === "Low" || value === "High" || value === "Urgent") {
    return value;
  }
  return "Normal";
}

function getPayloadStringArray(payload: JsonObject, key: string): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}
