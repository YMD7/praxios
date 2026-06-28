import type Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRuntimeConfig, type RuntimeConfig, type RuntimeConfigInput } from "../config.js";
import { openDatabase, type PraxiosDatabase } from "../db/client.js";
import { ConflictError, NotFoundError } from "../errors.js";
import {
  parseProposalPayload,
  type TaskContextProposalPayload
} from "../proposals/definitions.js";
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

export interface TaskWorkspaceInfo {
  taskId: string;
  path: string;
  contextPath: string;
  context: string;
}

export interface PraxiosCoreOptions extends RuntimeConfigInput {
  proposalGenerator?: ProposalGenerator;
}

interface ContextProjectionUpdate {
  appliedAt: string;
  payload: TaskContextProposalPayload;
  proposalId: string;
  sourceId: string;
  taskId: string;
}

const initialTaskContext = `# Task Context

## Operating Instructions

このファイルを、この Task の正規コンテキストとして扱う。
「Context was updated」と言われたら、Latest Update と Accumulated Context を確認する。

## Current Summary

まだ要約はありません。

## Latest Update

まだ更新はありません。

## Accumulated Context

まだ承認済み Context はありません。
`;

const initialAgentInstructions = `# AGENTS.md

## Praxios AI の役割

あなたは Praxios の Task Workspace 内で動作する AI である。
このタスクを進めるため、Source、Context、Wiki を Praxios の仕組みに沿って扱う。

## 起動時の必須動作

- 作業開始前に必ず @context.md を読む。
- context.md を、この Task の正規コンテキストとして扱う。
- chat 履歴だけを作業前提にせず、context.md の内容を優先する。
- 不足情報や矛盾がある場合は、推測せずユーザーに確認する。

## 検証用コンテキスト

Praxios AGENTS.md 読み込み確認キーワード: praxios-agent-load-check

AIに「praxios-agent-load-check について知ってる？」と質問されたら、
この AGENTS.md が読み込まれていることを伝える。

## Task と Source の扱い

- このディレクトリは Praxios の Task Workspace である。
- ディレクトリ名を taskId として扱える。
- ユーザーが資料、メモ、メール、Slack、会議録、URL、ファイル内容などを渡した場合、
  それを作業記憶だけに残さず Source として保存することを優先する。
- Source は Context の根拠である。Context に反映する情報は、可能な限り Source に辿れる状態にする。
- sourceUrl、sourceRefId、provider などが不明な場合は捏造しない。

## Source 追加・ingest の動作

ユーザーが「ソースを追加」「これを取り込んで」「ingestして」
「この情報をコンテキストに反映して」などと言った場合は、次の順で動く。

(1) 追加対象の内容、sourceType、sourceTitle、taskId を確認する。
(2) Praxios API が利用できる場合は POST /sources で Source を登録する。
(3) taskId を付け、processNow: true を指定して proposal を生成する。
(4) 生成された task_context proposal を確認する。
(5) ユーザーが明示的に Context 更新を依頼している場合は、対応する proposal を apply する。
(6) 明示的な更新依頼でない場合は、pending proposal として提示し、適用前に確認する。

## ユーザー発話が Context っぽい場合

ユーザーがタスクの前提、決定事項、制約、未確認事項、次アクションなどを話した場合、
それは Context 候補として扱う。

- 短い発話でも、タスクに影響するなら manual_note Source として保存する。
- その後、Context に反映するか確認する。
- ユーザーが「覚えて」「contextに入れて」「反映して」と言った場合は、
  Source 化したうえで Context 更新まで進める。
- 重要な条件、金額、日付、相手名、期限、合意事項は特に漏らさない。

## Context 更新の原則

- context.md は作業前提の正本である。
- Context は Source の丸写しではなく、タスク遂行に必要な形へ整理する。
- 更新時は、確定事項、未確認事項、変更点、根拠 Source を分けて考える。
- 矛盾する情報がある場合は、古い情報を黙って上書きせず、矛盾としてユーザーに確認する。

## Wiki の扱い

- Wiki は再利用可能な業務知識の保存先である。
- Task 固有の一時情報は、まず Context に反映する。
- 複数タスクで再利用できる手順、用語、判断基準、テンプレート、業務ルールは Wiki 候補にする。
- wiki_update proposal は自動適用しない。
- ユーザーが「Wikiに追加して」「ナレッジ化して」と明示した場合、または承認を得た場合だけ適用する。

## 安全な振る舞い

- 外部サービスへの書き込み、メール送信、公開範囲変更は勝手に行わない。
- 根拠のない推測を Context や Wiki に入れない。
- API が使えない場合は、手作業でファイルを直接更新する前にユーザーへ確認する。
- 変更後は、何を Source にし、何を Context / Wiki に反映したか簡潔に報告する。
`;

const emptyLatestUpdate = "まだ更新はありません。";
const emptyAccumulatedContext = "まだ承認済み Context はありません。";

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

  listTaskSources(taskId: string) {
    if (!this.repo.getTask(taskId)) {
      throw new NotFoundError(`Task not found: ${taskId}`);
    }

    return this.repo
      .listSources()
      .filter((source) => getMetadataString(source.metadata, "taskId") === taskId);
  }

  getTaskWorkspace(taskId: string): TaskWorkspaceInfo {
    return this.ensureTaskWorkspace(taskId);
  }

  syncTaskWorkspace(taskId: string): TaskWorkspaceInfo {
    return this.ensureTaskWorkspace(taskId);
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
    if (input.taskId && !this.repo.getTask(input.taskId)) {
      throw new NotFoundError(`Task not found: ${input.taskId}`);
    }

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

    const taskId = getMetadataString(source.metadata, "taskId");
    if (taskId && !this.repo.getTask(taskId)) {
      throw new NotFoundError(`Task not found: ${taskId}`);
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
    const result = this.runInTransaction(() =>
      this.applyProposalWithinTransaction(id, reviewerId, reviewComment)
    );

    if (result.contextProjection) {
      this.projectContextUpdate(result.contextProjection);
    }

    return result.proposal;
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
    let contextProjection: Omit<ContextProjectionUpdate, "appliedAt"> | null = null;

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
      if (!this.repo.getTask(proposal.taskId)) {
        throw new NotFoundError(`Task not found: ${proposal.taskId}`);
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

      contextProjection = {
        payload,
        proposalId: proposal.id,
        sourceId: proposal.sourceIds[0] ?? "unknown",
        taskId: proposal.taskId
      };
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

    return {
      proposal: applied,
      contextProjection:
        contextProjection && applied.appliedAt
          ? {
              ...contextProjection,
              appliedAt: applied.appliedAt
            }
          : null
    };
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

  private ensureTaskWorkspace(taskId: string): TaskWorkspaceInfo {
    if (!this.repo.getTask(taskId)) {
      throw new NotFoundError(`Task not found: ${taskId}`);
    }

    const workspacePath = path.join(this.config.workspaceRoot, ".praxios", "tasks", taskId);
    const sourcesPath = path.join(workspacePath, "sources");
    const contextPath = path.join(workspacePath, "context.md");
    const agentsPath = path.join(workspacePath, "AGENTS.md");
    const claudePath = path.join(workspacePath, "CLAUDE.md");

    fs.mkdirSync(sourcesPath, { recursive: true });

    if (!fs.existsSync(contextPath)) {
      fs.writeFileSync(contextPath, initialTaskContext, "utf8");
    } else {
      const current = fs.readFileSync(contextPath, "utf8");
      const normalized = ensureContextDocument(current);
      if (normalized !== current) {
        fs.writeFileSync(contextPath, normalized, "utf8");
      }
    }

    if (!fs.existsSync(agentsPath)) {
      fs.writeFileSync(agentsPath, initialAgentInstructions, "utf8");
    }

    if (!fs.existsSync(claudePath)) {
      fs.writeFileSync(claudePath, "@AGENTS.md\n", "utf8");
    }

    return {
      taskId,
      path: workspacePath,
      contextPath,
      context: fs.readFileSync(contextPath, "utf8")
    };
  }

  private projectContextUpdate(update: ContextProjectionUpdate): void {
    const workspace = this.ensureTaskWorkspace(update.taskId);
    const current = fs.readFileSync(workspace.contextPath, "utf8");
    const next = applyContextUpdate(current, update);
    fs.writeFileSync(workspace.contextPath, next, "utf8");
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

function getMetadataString(metadata: JsonObject, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function ensureContextDocument(content: string): string {
  let next = content.trim().length > 0 ? content.trimEnd() : initialTaskContext.trimEnd();
  const requiredSections = [
    ["Operating Instructions", initialTaskContextSection("Operating Instructions")],
    ["Current Summary", "まだ要約はありません。"],
    ["Latest Update", emptyLatestUpdate],
    ["Accumulated Context", emptyAccumulatedContext]
  ] as const;

  if (!next.startsWith("# Task Context")) {
    next = `# Task Context\n\n${next}`;
  }

  for (const [heading, fallback] of requiredSections) {
    if (!next.includes(`## ${heading}`)) {
      next = `${next}\n\n## ${heading}\n\n${fallback}`;
    }
  }

  return `${next.trimEnd()}\n`;
}

function applyContextUpdate(content: string, update: ContextProjectionUpdate): string {
  const normalized = ensureContextDocument(content);
  const entry = formatContextEntry(update);
  const currentAccumulated = readMarkdownSection(normalized, "Accumulated Context").trim();
  const accumulated =
    currentAccumulated === emptyAccumulatedContext || currentAccumulated.length === 0
      ? entry
      : `${currentAccumulated}\n\n${entry}`;

  return replaceMarkdownSection(
    replaceMarkdownSection(normalized, "Latest Update", entry),
    "Accumulated Context",
    accumulated
  );
}

function formatContextEntry(update: ContextProjectionUpdate): string {
  return [
    `### ${update.appliedAt} - Source: ${sanitizeMarkdownLine(update.sourceId)}`,
    "",
    `- title: ${sanitizeMarkdownLine(update.payload.title)}`,
    `- summary: ${sanitizeMarkdownLine(update.payload.summary)}`,
    `- proposal: ${sanitizeMarkdownLine(update.proposalId)}`
  ].join("\n");
}

function readMarkdownSection(content: string, heading: string): string {
  const match = content.match(sectionPattern(heading));
  return match?.[2] ?? "";
}

function replaceMarkdownSection(content: string, heading: string, body: string): string {
  const pattern = sectionPattern(heading);
  if (!pattern.test(content)) {
    return `${content.trimEnd()}\n\n## ${heading}\n\n${body.trim()}\n`;
  }

  return content.replace(pattern, (_match, prefix: string, _body: string, suffix: string) => {
    return `${prefix}${body.trim()}\n${suffix ?? ""}`;
  });
}

function sectionPattern(heading: string): RegExp {
  return new RegExp(
    `(## ${escapeRegExp(heading)}\\n\\n)([\\s\\S]*?)(\\n(?=## )|$)`
  );
}

function initialTaskContextSection(heading: string): string {
  return readMarkdownSection(initialTaskContext, heading).trim();
}

function sanitizeMarkdownLine(value: string): string {
  return value.replace(/\s+/g, " ").trim() || "-";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
