/**
 * Proposal パイプライン: Ingest -> Extract -> Route -> Proposal -> Apply。
 *
 * - analyzeSource: Source を解析して Proposal を生成（status=pending）。
 * - applyProposal: 承認済み Proposal を適用（タスク生成など）。
 *
 * ANTHROPIC_API_KEY が無い環境では、ヒューリスティック抽出にフォールバックする
 * （オフラインでも循環を検証できるようにするため）。
 */

import {
  taskProposalPayloadSchema,
  wikiUpdateProposalPayloadSchema,
  type Proposal,
  type Repositories,
} from "@praxios/core";
import { readSourceContent } from "@praxios/db";
import { extractProposals, type AiProposal } from "./ai";

function nowIso(): string {
  return new Date().toISOString();
}

const useAi = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

/** API キーが無い場合の簡易抽出: 先頭行をタスク名にした 1 件を作る。 */
function heuristicProposals(
  sourceTitle: string | null,
  content: string,
): AiProposal[] {
  const firstLine = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  const title = (sourceTitle ?? (firstLine.slice(0, 60) || "新規タスク")).trim();
  return [
    {
      kind: "task_proposal",
      rationale: "ヒューリスティック抽出（ANTHROPIC_API_KEY 未設定）",
      title,
      body: content,
      completionCriteria: "",
      priority: "medium",
      tags: [],
    },
  ];
}

/** Source を解析して Proposal を生成する。 */
export async function analyzeSource(
  repos: Repositories,
  sourceId: string,
): Promise<Proposal[]> {
  const source = await repos.sources.get(sourceId);
  if (!source) throw new Error(`source not found: ${sourceId}`);

  const content = readSourceContent(source.sourcePath);

  let aiProposals: AiProposal[];
  if (useAi()) {
    const existingTasks = (await repos.tasks.list()).map((t) => ({
      id: t.id,
      title: t.title,
    }));
    aiProposals = await extractProposals({
      sourceTitle: source.sourceTitle,
      sourceType: source.sourceType,
      content,
      existingTasks,
    });
  } else {
    aiProposals = heuristicProposals(source.sourceTitle, content);
  }

  const createdBy = useAi() ? "ai" : "heuristic";
  const created: Proposal[] = [];

  for (const p of aiProposals) {
    const payload =
      p.kind === "task_proposal"
        ? taskProposalPayloadSchema.parse({
            title: p.title,
            description: p.body,
            completionCriteria: p.completionCriteria || null,
            priority: p.priority,
          })
        : wikiUpdateProposalPayloadSchema.parse({
            pageId: null,
            title: p.title,
            body: p.body,
            tags: p.tags,
            proposedLinks: [],
          });

    const proposal = await repos.proposals.create({
      proposalKind: p.kind,
      status: "pending",
      sourceIds: [sourceId],
      taskId: null,
      destination: null,
      payload,
      rationale: p.rationale,
      createdBy,
    });
    created.push(proposal);
  }

  return created;
}

/** まだ Proposal が紐づいていない Source を解析する（Worker 用）。 */
export async function analyzePendingSources(
  repos: Repositories,
): Promise<number> {
  const proposals = await repos.proposals.list();
  const covered = new Set(proposals.flatMap((p) => p.sourceIds));
  const sources = await repos.sources.list();
  let count = 0;
  for (const s of sources) {
    if (!covered.has(s.id)) {
      const created = await analyzeSource(repos, s.id);
      count += created.length;
    }
  }
  return count;
}

export interface ApplyResult {
  taskId?: string;
  wikiPageId?: string;
}

/** 承認済み Proposal を適用する。 */
export async function applyProposal(
  repos: Repositories,
  proposalId: string,
): Promise<ApplyResult> {
  const p = await repos.proposals.get(proposalId);
  if (!p) throw new Error(`proposal not found: ${proposalId}`);
  if (p.status !== "approved") {
    throw new Error(`proposal is not approved: ${p.status}`);
  }

  if (p.proposalKind === "task_proposal") {
    const payload = taskProposalPayloadSchema.parse(p.payload);
    const task = await repos.tasks.create({
      title: payload.title,
      description: payload.description,
      status: "new",
      priority: payload.priority,
      dueDate: null,
      completionCriteria: payload.completionCriteria,
      triggerId: null,
    });

    // 根拠 Source を ContextItem としてタスクに紐づける。
    for (const sid of p.sourceIds) {
      const src = await repos.sources.get(sid);
      await repos.context.create({
        taskId: task.id,
        sourceId: sid,
        sourceType: src?.sourceType ?? "unknown",
        title: src?.sourceTitle ?? null,
        summary: p.rationale,
        occurredAt: src?.occurredAt ?? null,
        relevanceScore: null,
        evidence: null,
      });
    }

    await repos.proposals.update(proposalId, {
      status: "applied",
      appliedAt: nowIso(),
      destination: task.id,
    });
    return { taskId: task.id };
  }

  // wiki_update_proposal の適用は Phase 4（applyWikiProposal）で実装する。
  throw new Error(`apply not implemented for kind: ${p.proposalKind}`);
}
