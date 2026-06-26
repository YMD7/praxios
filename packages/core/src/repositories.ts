/**
 * ストレージ抽象（Repository インターフェース）。
 *
 * コアはこのインターフェースだけに依存し、SQLite/Drizzle 実装は
 * packages/db で注入する。将来 PostgreSQL へ移行する際もこの境界を保つ。
 */

import type {
  ContextItem,
  Proposal,
  ProposalStatus,
  Source,
  Task,
  WikiLink,
  WikiPage,
} from "./types";

/** 新規作成時に DB 側で採番・既定値を埋める項目を除いた入力型。 */
export type NewTask = Omit<Task, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<Task, "id">>;
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;

export type NewSource = Omit<Source, "id" | "capturedAt"> &
  Partial<Pick<Source, "id" | "capturedAt">>;

export type NewContextItem = Omit<ContextItem, "id" | "createdAt"> &
  Partial<Pick<ContextItem, "id">>;

export type NewProposal = Omit<
  Proposal,
  "id" | "createdAt" | "reviewedAt" | "reviewerId" | "reviewComment" | "appliedAt"
> &
  Partial<Pick<Proposal, "id">>;

export type NewWikiPage = Omit<WikiPage, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<WikiPage, "id">>;
export type WikiPagePatch = Partial<
  Omit<WikiPage, "id" | "createdAt" | "updatedAt">
>;

export interface TaskRepo {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task | null>;
  create(input: NewTask): Promise<Task>;
  update(id: string, patch: TaskPatch): Promise<Task | null>;
}

export interface SourceRepo {
  list(): Promise<Source[]>;
  get(id: string): Promise<Source | null>;
  create(input: NewSource): Promise<Source>;
}

export interface ContextRepo {
  listByTask(taskId: string): Promise<ContextItem[]>;
  create(input: NewContextItem): Promise<ContextItem>;
}

export interface ProposalRepo {
  list(filter?: { status?: ProposalStatus }): Promise<Proposal[]>;
  get(id: string): Promise<Proposal | null>;
  create(input: NewProposal): Promise<Proposal>;
  update(id: string, patch: Partial<Proposal>): Promise<Proposal | null>;
}

export interface WikiRepo {
  listPages(): Promise<WikiPage[]>;
  getPage(id: string): Promise<WikiPage | null>;
  createPage(input: NewWikiPage): Promise<WikiPage>;
  updatePage(id: string, patch: WikiPagePatch): Promise<WikiPage | null>;
  /** 当該ページを参照している WikiLink（backlinks）。 */
  backlinks(toPageId: string): Promise<WikiLink[]>;
  /** 当該ページからの参照（outgoing links）。 */
  outgoingLinks(fromPageId: string): Promise<WikiLink[]>;
  replaceLinks(fromPageId: string, links: Omit<WikiLink, "id" | "createdAt" | "updatedAt">[]): Promise<void>;
}

/** 全リポジトリの束。アプリ層はこれを 1 つ受け取る。 */
export interface Repositories {
  tasks: TaskRepo;
  sources: SourceRepo;
  context: ContextRepo;
  proposals: ProposalRepo;
  wiki: WikiRepo;
}
