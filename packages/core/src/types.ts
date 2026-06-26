/**
 * Praxios のドメイン型定義。
 *
 * 保存層（SQLite/Drizzle）に依存しない純粋な型として定義する。
 * DB 実装はこの型を満たす形でマッピングする。
 */

// ---- 列挙値 -------------------------------------------------------------

/** タスク状態（architecture.md: Task Layer）。 */
export const TASK_STATUSES = [
  "new",
  "triaging",
  "ready",
  "in_progress",
  "waiting",
  "needs_approval",
  "completed",
  "archived",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Proposal 種別（architecture.md: Proposal Layer）。 */
export const PROPOSAL_KINDS = [
  "task_proposal",
  "wiki_update_proposal",
  "message_proposal",
] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

/** Proposal の状態。MVP では Approval をこの status に畳む。 */
export const PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "applied",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** WikiLink の解決状態。 */
export const WIKI_LINK_STATUSES = ["resolved", "unresolved"] as const;
export type WikiLinkStatus = (typeof WIKI_LINK_STATUSES)[number];

// ---- エンティティ -------------------------------------------------------

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  triggerId: string | null;
  completionCriteria: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  sourceType: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceRefId: string | null;
  provider: string | null;
  /** 生データ本体のファイルパス（正本はファイル保存）。 */
  sourcePath: string;
  /** 本体内容のハッシュ（変更検知用）。 */
  hash: string;
  occurredAt: string | null;
  capturedAt: string;
  /** 任意の正規化メタ情報。 */
  metadata: Record<string, unknown> | null;
}

export interface ContextItem {
  id: string;
  taskId: string;
  sourceId: string | null;
  sourceType: string;
  title: string | null;
  summary: string | null;
  occurredAt: string | null;
  relevanceScore: number | null;
  evidence: string | null;
  createdAt: string;
}

export interface Proposal {
  id: string;
  proposalKind: ProposalKind;
  status: ProposalStatus;
  /** 根拠とした Source 群（Evidence）。 */
  sourceIds: string[];
  /** 紐づく既存タスク（更新提案の場合）。 */
  taskId: string | null;
  /** 適用先（例: wiki page id、task id、channel）。 */
  destination: string | null;
  /** 提案本体。proposalKind ごとにスキーマが変わる。 */
  payload: Record<string, unknown>;
  /** 提案理由。 */
  rationale: string | null;
  createdBy: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  reviewComment: string | null;
  appliedAt: string | null;
}

export interface WikiPage {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiLink {
  id: string;
  fromPageId: string;
  toPageId: string;
  anchorText: string | null;
  status: WikiLinkStatus;
  sourceId: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}
