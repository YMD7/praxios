/**
 * Registry and Rules（architecture.md）。
 *
 * Source 種別・Proposal 種別・ルールを宣言データとして管理する。
 * MVP ではコード内の既定セットをシードする。将来は DB 駆動に拡張する。
 */

import { z } from "zod";
import type { ProposalKind } from "./types";

/** 承認ポリシー。MVP は「全提案を承認対象」を既定にする。 */
export type ApprovalPolicy = "always" | "never";

export interface SourceDefinition {
  kind: string;
  displayName: string;
  provider: string | null;
  /** この Source から生成を許す Proposal 種別。 */
  allowedProposalKinds: ProposalKind[];
}

export interface ProposalDefinition {
  proposalKind: ProposalKind;
  displayName: string;
  /** payload の検証スキーマ。 */
  schema: z.ZodTypeAny;
  approvalPolicy: ApprovalPolicy;
}

// ---- Proposal payload スキーマ ------------------------------------------

export const taskProposalPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  completionCriteria: z.string().nullable().default(null),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});
export type TaskProposalPayload = z.infer<typeof taskProposalPayloadSchema>;

export const wikiUpdateProposalPayloadSchema = z.object({
  pageId: z.string().nullable().default(null),
  title: z.string().min(1),
  body: z.string(),
  tags: z.array(z.string()).default([]),
  /** AI が推定した内部リンク候補（[[PageId]] のターゲット）。 */
  proposedLinks: z
    .array(z.object({ toPageId: z.string(), anchorText: z.string().nullable().default(null) }))
    .default([]),
});
export type WikiUpdateProposalPayload = z.infer<
  typeof wikiUpdateProposalPayloadSchema
>;

// ---- 既定の Registry シード ---------------------------------------------

export const DEFAULT_SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    kind: "manual_text",
    displayName: "手動テキスト取り込み",
    provider: null,
    allowedProposalKinds: ["task_proposal", "wiki_update_proposal"],
  },
  {
    kind: "slack_message",
    displayName: "Slack メッセージ",
    provider: "slack",
    allowedProposalKinds: ["task_proposal", "wiki_update_proposal"],
  },
];

export const DEFAULT_PROPOSAL_DEFINITIONS: ProposalDefinition[] = [
  {
    proposalKind: "task_proposal",
    displayName: "タスク提案",
    schema: taskProposalPayloadSchema,
    approvalPolicy: "always",
  },
  {
    proposalKind: "wiki_update_proposal",
    displayName: "Wiki 更新提案",
    schema: wikiUpdateProposalPayloadSchema,
    approvalPolicy: "always",
  },
];

/** Proposal 種別に対応する payload スキーマを返す（未定義なら null）。 */
export function payloadSchemaForKind(
  kind: ProposalKind,
): z.ZodTypeAny | null {
  return (
    DEFAULT_PROPOSAL_DEFINITIONS.find((d) => d.proposalKind === kind)?.schema ??
    null
  );
}
