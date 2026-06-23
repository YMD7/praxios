import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const WORKSPACE_DOMAIN_DIRECTORIES = [
  "sources",
  "knowledge",
  "tasks",
  "artifacts",
  "reviews",
] as const;

export interface InitializeWorkspaceResult {
  readonly created: string[];
  readonly preserved: string[];
}

export async function initializePlainFileWorkspace(
  workspacePath: string,
): Promise<InitializeWorkspaceResult> {
  const result: InitializeWorkspaceResult = {
    created: [],
    preserved: [],
  };

  for (const directory of WORKSPACE_DOMAIN_DIRECTORIES) {
    await ensureDirectory(join(workspacePath, directory), directory, result);
  }

  await ensureDirectory(join(workspacePath, ".praxios"), ".praxios", result);
  await ensureFile(join(workspacePath, "log.md"), "log.md", initialLog(), result);
  await ensureFile(join(workspacePath, "praxios.md"), "praxios.md", initialGuide(), result);
  await ensureFile(
    join(workspacePath, ".praxios", "config.yaml"),
    ".praxios/config.yaml",
    initialConfig(),
    result,
  );

  return result;
}

async function ensureDirectory(
  absolutePath: string,
  relativePath: string,
  result: InitializeWorkspaceResult,
): Promise<void> {
  const exists = await pathExists(absolutePath);
  await mkdir(absolutePath, { recursive: true });

  if (exists) {
    result.preserved.push(relativePath);
  } else {
    result.created.push(relativePath);
  }
}

async function ensureFile(
  absolutePath: string,
  relativePath: string,
  content: string,
  result: InitializeWorkspaceResult,
): Promise<void> {
  try {
    await readFile(absolutePath, "utf8");
    result.preserved.push(relativePath);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeFile(absolutePath, content, { encoding: "utf8", flag: "wx" });
    result.created.push(relativePath);
  }
}

function initialLog(): string {
  return "# Praxios Log\n\n";
}

function initialGuide(): string {
  return [
    "# Praxios Workspace",
    "",
    "This folder stores Praxios plain-file workspace data.",
    "",
    "Canonical user data lives in `sources/`, `knowledge/`, `tasks/`, `artifacts/`,",
    "`reviews/`, and `log.md`. Runtime metadata lives in `.praxios/`.",
    "",
  ].join("\n");
}

function initialConfig(): string {
  return ["workspace_version: 0", "created_by: praxios", ""].join("\n");
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
