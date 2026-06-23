import type {
  ArtifactFrontmatter,
  ReviewFrontmatter,
  SourceFrontmatter,
  TaskFrontmatter,
} from "../../../contracts/src/index.js";

export type WorkspaceRecordKind = "source" | "task" | "artifact" | "review";

export type WorkspaceFrontmatter =
  | SourceFrontmatter
  | TaskFrontmatter
  | ArtifactFrontmatter
  | ReviewFrontmatter;

export interface WorkspaceMarkdownFile {
  readonly kind: WorkspaceRecordKind;
  readonly relativePath: string;
  readonly rawFrontmatter?: unknown;
  readonly frontmatter?: WorkspaceFrontmatter;
  readonly body?: string;
  readonly validationError?: string;
}

export type WorkspaceFile = WorkspaceMarkdownFile;

export interface WorkspaceSnapshot {
  readonly files: readonly WorkspaceFile[];
  readonly logContent?: string;
}

export interface WorkspaceReader {
  readWorkspace(): Promise<WorkspaceSnapshot>;
}
