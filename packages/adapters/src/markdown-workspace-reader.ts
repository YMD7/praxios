import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse } from "yaml";

import {
  ArtifactFrontmatterSchema,
  ReviewFrontmatterSchema,
  SourceFrontmatterSchema,
  TaskFrontmatterSchema,
} from "../../../contracts/src/index.js";
import type {
  WorkspaceFile,
  WorkspaceReader,
  WorkspaceRecordKind,
  WorkspaceSnapshot,
} from "../../ports/src/index.js";
import type { ValidationSchema } from "./markdown-frontmatter.js";

const WORKSPACE_RECORD_DIRECTORIES: ReadonlyArray<{
  readonly directory: string;
  readonly kind: WorkspaceRecordKind;
  readonly schema: ValidationSchema<unknown>;
}> = [
  { directory: "sources", kind: "source", schema: SourceFrontmatterSchema },
  { directory: "tasks", kind: "task", schema: TaskFrontmatterSchema },
  { directory: "artifacts", kind: "artifact", schema: ArtifactFrontmatterSchema },
  { directory: "reviews", kind: "review", schema: ReviewFrontmatterSchema },
];

export class MarkdownWorkspaceReader implements WorkspaceReader {
  constructor(private readonly workspacePath: string) {}

  async readWorkspace(): Promise<WorkspaceSnapshot> {
    const files = await Promise.all(
      WORKSPACE_RECORD_DIRECTORIES.map((entry) => this.readDirectory(entry)),
    );

    return {
      files: files.flat(),
      logContent: await this.readOptionalFile("log.md"),
    };
  }

  private async readDirectory(input: {
    readonly directory: string;
    readonly kind: WorkspaceRecordKind;
    readonly schema: ValidationSchema<unknown>;
  }): Promise<WorkspaceFile[]> {
    const directoryPath = join(this.workspacePath, input.directory);
    const fileNames = await readdir(directoryPath);
    const markdownFileNames = fileNames.filter((fileName) => fileName.endsWith(".md"));

    return Promise.all(
      markdownFileNames.map(async (fileName) => {
        const relativePath = `${input.directory}/${fileName}`;
        const content = await readFile(join(this.workspacePath, relativePath), "utf8");
        return parseWorkspaceFile({
          body: content,
          kind: input.kind,
          relativePath,
          schema: input.schema,
        });
      }),
    );
  }

  private async readOptionalFile(relativePath: string): Promise<string | undefined> {
    try {
      return await readFile(join(this.workspacePath, relativePath), "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return undefined;
      }

      throw error;
    }
  }
}

function parseWorkspaceFile(input: {
  readonly body: string;
  readonly kind: WorkspaceRecordKind;
  readonly relativePath: string;
  readonly schema: ValidationSchema<unknown>;
}): WorkspaceFile {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u.exec(input.body);
  if (!match) {
    return {
      kind: input.kind,
      relativePath: input.relativePath,
      validationError: "Markdown frontmatter block is missing or malformed.",
    };
  }

  let rawFrontmatter: unknown;
  try {
    rawFrontmatter = parse(match[1]) as unknown;
  } catch (error) {
    return {
      kind: input.kind,
      relativePath: input.relativePath,
      validationError: "Markdown frontmatter YAML failed parsing.",
    };
  }

  const parsed = input.schema.safeParse(rawFrontmatter);
  if (!parsed.success) {
    return {
      kind: input.kind,
      relativePath: input.relativePath,
      rawFrontmatter,
      body: match[2],
      validationError: "Markdown frontmatter failed validation.",
    };
  }

  return {
    kind: input.kind,
    relativePath: input.relativePath,
    rawFrontmatter,
    frontmatter: parsed.data as WorkspaceFile["frontmatter"],
    body: match[2],
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
