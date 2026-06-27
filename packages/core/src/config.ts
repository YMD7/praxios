import fs from "node:fs";
import path from "node:path";

export interface RuntimeConfig {
  workspaceRoot: string;
  dataDir: string;
  dbPath: string;
  sourceDir: string;
}

export interface RuntimeConfigInput {
  workspaceRoot?: string;
  dataDir?: string;
  dbPath?: string;
  sourceDir?: string;
}

export function findWorkspaceRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function createRuntimeConfig(input: RuntimeConfigInput = {}): RuntimeConfig {
  const workspaceRoot =
    input.workspaceRoot ??
    process.env.PRAXIOS_WORKSPACE_ROOT ??
    findWorkspaceRoot();
  const dataDir =
    input.dataDir ?? process.env.PRAXIOS_DATA_DIR ?? path.join(workspaceRoot, "data");
  const dbPath =
    input.dbPath ?? process.env.PRAXIOS_DB_PATH ?? path.join(dataDir, "praxios.sqlite");
  const sourceDir =
    input.sourceDir ?? process.env.PRAXIOS_SOURCE_DIR ?? path.join(dataDir, "sources");

  return {
    workspaceRoot,
    dataDir,
    dbPath,
    sourceDir
  };
}
