import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  WORKSPACE_DOMAIN_DIRECTORIES,
  initializePlainFileWorkspace,
} from "../packages/adapters/src/index";

describe("workspace initializer", () => {
  it("creates the v0 plain-file workspace layout", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-workspace-"));
    const result = await initializePlainFileWorkspace(workspace);

    for (const directory of WORKSPACE_DOMAIN_DIRECTORIES) {
      await expect(readdir(join(workspace, directory))).resolves.toEqual([]);
    }

    await expect(readFile(join(workspace, "log.md"), "utf8")).resolves.toBe("# Praxios Log\n\n");
    await expect(readFile(join(workspace, "praxios.md"), "utf8")).resolves.toContain(
      "Canonical user data lives in `sources/`, `knowledge/`, `tasks/`, `artifacts/`,",
    );
    await expect(readFile(join(workspace, ".praxios", "config.yaml"), "utf8")).resolves.toContain(
      "workspace_version: 0",
    );
    await expect(readdir(join(workspace, ".praxios"))).resolves.toEqual(["config.yaml"]);
    expect(result.created).toEqual([
      "sources",
      "knowledge",
      "tasks",
      "artifacts",
      "reviews",
      ".praxios",
      "log.md",
      "praxios.md",
      ".praxios/config.yaml",
    ]);
  });

  it("does not overwrite existing canonical files when run again", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-workspace-"));
    await initializePlainFileWorkspace(workspace);
    await writeFile(join(workspace, "log.md"), "# Custom Log\n\n", "utf8");
    await writeFile(join(workspace, "sources", "existing.md"), "# Existing Source\n", "utf8");

    const result = await initializePlainFileWorkspace(workspace);

    await expect(readFile(join(workspace, "log.md"), "utf8")).resolves.toBe("# Custom Log\n\n");
    await expect(readFile(join(workspace, "sources", "existing.md"), "utf8")).resolves.toBe(
      "# Existing Source\n",
    );
    await expect(readdir(join(workspace, ".praxios"))).resolves.toEqual(["config.yaml"]);
    expect(result.preserved).toEqual([
      "sources",
      "knowledge",
      "tasks",
      "artifacts",
      "reviews",
      ".praxios",
      "log.md",
      "praxios.md",
      ".praxios/config.yaml",
    ]);
  });
});
