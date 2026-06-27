import { readSourceContent } from "./sourceStore";
import { normalizePageId } from "./wikiLinks";
import { repository, unpack } from "../repository";

function summarize(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
}

export function generateMockProposals(sourceId: string, taskId?: string) {
  const source = repository.getSource(sourceId);
  if (!source) {
    throw new Error("Source not found");
  }

  const content = readSourceContent(source.sourcePath);
  const summary = summarize(content);
  const metadata = unpack<Record<string, unknown>>(source.metadata, {});
  const targetTaskId =
    taskId ?? (typeof metadata.taskId === "string" ? metadata.taskId : undefined);
  const created = [];

  if (targetTaskId) {
    created.push(
      repository.createProposal({
        proposalType: "context_attach",
        sourceIds: [source.id],
        taskId: targetTaskId,
        destination: { kind: "task_context", taskId: targetTaskId },
        payload: {
          taskId: targetTaskId,
          sourceId: source.id,
          sourceType: source.sourceType,
          title: source.sourceTitle,
          summary,
          occurredAt: source.occurredAt,
          relevanceScore: 0.82
        },
        evidence: { sourceId: source.id, hash: source.hash },
        rationale: "Source本文からタスク文脈として保持すべき情報を抽出しました。"
      })
    );

    created.push(
      repository.createProposal({
        proposalType: "task_update",
        sourceIds: [source.id],
        taskId: targetTaskId,
        destination: { kind: "task", taskId: targetTaskId },
        payload: {
          descriptionAppend: `\n\nSource「${source.sourceTitle}」要約: ${summary}`,
          completionCriteria: "関連Sourceを確認し、必要なWiki更新を承認する"
        },
        evidence: { sourceId: source.id, hash: source.hash },
        rationale: "Sourceの要約をタスク本文と完了条件に反映する提案です。"
      })
    );
  }

  const pageId = normalizePageId(source.sourceTitle || `source-${source.id}`);
  created.push(
    repository.createProposal({
      proposalType: "wiki_update",
      sourceIds: [source.id],
      taskId: targetTaskId,
      destination: { kind: "wiki", pageId },
      payload: {
        pageId,
        title: source.sourceTitle,
        body: `# ${source.sourceTitle}\n\n${summary}\n\n関連Source: ${source.id}`,
        tags: ["source-derived"],
        taskId: targetTaskId
      },
      evidence: { sourceId: source.id, hash: source.hash },
      rationale: "Sourceから再利用可能な業務知識をWiki候補として作成しました。"
    })
  );

  return created;
}

