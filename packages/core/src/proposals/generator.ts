import type { JsonObject, ProposalType, Source } from "../types.js";
import { createPageIdFromTitle } from "../wiki-links.js";
import {
  taskContextProposalPayloadSchema,
  taskCreateProposalPayloadSchema,
  wikiUpdateProposalPayloadSchema
} from "./definitions.js";

export interface GeneratedProposal {
  proposalType: ProposalType;
  sourceIds: string[];
  taskId: string | null;
  destination: JsonObject;
  payload: JsonObject;
  evidence: JsonObject;
  rationale: string;
  createdBy: string;
}

export interface ProposalGeneratorInput {
  source: Source;
  content: string;
}

export interface ProposalGenerator {
  generate(input: ProposalGeneratorInput): GeneratedProposal[];
}

export class DeterministicProposalGenerator implements ProposalGenerator {
  generate(input: ProposalGeneratorInput): GeneratedProposal[] {
    const { source, content } = input;
    const summary = summarizeText(content);
    const excerpt = content.slice(0, 600);
    const taskId = getMetadataString(source.metadata, "taskId");
    const proposals: GeneratedProposal[] = [];

    if (taskId) {
      const proposalType = "task_context" as const;
      const payload = taskContextProposalPayloadSchema.parse({
        title: source.sourceTitle,
        summary,
        occurredAt: source.occurredAt,
        relevanceScore: 0.82
      });

      proposals.push({
        proposalType,
        sourceIds: [source.id],
        taskId,
        destination: { kind: "task", taskId },
        payload: toJsonObject(payload),
        evidence: { sourceId: source.id, excerpt },
        rationale: "既存タスクに関連する Source として取り込まれたため、Context 追加を提案する。",
        createdBy: "deterministic-generator"
      });
    } else {
      const proposalType = "task_create" as const;
      const payload = taskCreateProposalPayloadSchema.parse({
        title: source.sourceTitle,
        description: summary,
        priority: "Normal",
        completionCriteria: "Source の内容を確認し、完了条件を確定する。"
      });

      proposals.push({
        proposalType,
        sourceIds: [source.id],
        taskId: null,
        destination: { kind: "task" },
        payload: toJsonObject(payload),
        evidence: { sourceId: source.id, excerpt },
        rationale: "未紐づけの Source から作業トリガーを検出したため、Task 作成を提案する。",
        createdBy: "deterministic-generator"
      });
    }

    const proposalType = "wiki_update" as const;
    const pageId = createPageIdFromTitle(source.sourceTitle) || `source-${source.id.slice(0, 8)}`;
    const payload = wikiUpdateProposalPayloadSchema.parse({
      pageId,
      title: source.sourceTitle,
      body: `# ${source.sourceTitle}\n\n${summary}\n\n## Evidence\n\nSource: ${source.id}`,
      tags: ["source", source.sourceType]
    });

    proposals.push({
      proposalType,
      sourceIds: [source.id],
      taskId,
      destination: { kind: "wiki", pageId },
      payload: toJsonObject(payload),
      evidence: { sourceId: source.id, excerpt },
      rationale: "Source から再利用可能な業務知識を抽出し、Wiki 更新を提案する。",
      createdBy: "deterministic-generator"
    });

    return proposals;
  }
}

function summarizeText(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 500) {
    return normalized;
  }
  return `${normalized.slice(0, 500)}...`;
}

function getMetadataString(metadata: JsonObject, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
