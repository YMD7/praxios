import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../apps/cli/src/index";

describe("praxios CLI", () => {
  it("initializes and lints a workspace through CLI entrypoints", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-cli-"));

    const initResult = await runCli(["init", "--workspace", workspace], {
      cwd: process.cwd(),
    });
    expect(initResult).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(initResult.stdout)).toMatchObject({
      created: expect.arrayContaining(["sources", "tasks", "log.md"]),
    });

    const lintResult = await runCli(["lint", "--workspace", workspace], {
      cwd: process.cwd(),
    });
    expect(lintResult).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(lintResult.stdout)).toEqual({ issues: [] });

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: LintWorkspace");
    expect(log).toContain("- result: succeeded");
  });

  it("returns actionable non-zero errors", async () => {
    const result = await runCli([], { cwd: process.cwd() });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("usage_error: Command is required.");
  });
});
