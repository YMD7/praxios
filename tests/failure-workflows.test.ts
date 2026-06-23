import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../apps/cli/src/index";

describe("failure workflows", () => {
  it("does not create duplicate Sources for duplicate fixture imports", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-failure-"));
    const options = { cwd: process.cwd(), repositoryPath: process.cwd() };

    await expectCommand(["init", "--workspace", workspace], options);
    const first = await expectCommand(
      ["load-fixture", "product-launch-sync", "--workspace", workspace],
      options,
    );
    const second = await expectCommand(
      ["load-fixture", "product-launch-sync", "--workspace", workspace],
      options,
    );

    expect(second.id).toBe(first.id);
    await expect(readdir(join(workspace, "sources"))).resolves.toEqual([
      "product-launch-sync.md",
    ]);
  });

  it("rejects Task completion without matching approval", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-failure-"));
    const options = { cwd: process.cwd(), repositoryPath: process.cwd() };

    await expectCommand(["init", "--workspace", workspace], options);
    const source = await expectCommand(
      ["load-fixture", "product-launch-sync", "--workspace", workspace],
      options,
    );
    const candidateSet = await expectCommand(
      [
        "extract-task-candidates",
        source.id,
        "product-launch-sync",
        "--workspace",
        workspace,
      ],
      options,
    );
    const task = await expectCommand(
      ["confirm-task", candidateSet.id, "candidate-1", "--workspace", workspace],
      options,
    );
    await expectCommand(["build-context", task.id, "--workspace", workspace], options);
    const draft = await expectCommand(["draft-artifact", task.id, "--workspace", workspace], options);

    const result = await runCli(
      ["complete-task", task.id, draft.id, "--workspace", workspace],
      options,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("approval_required");
  });

  it("reports broken workspace files through CLI lint", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-failure-"));
    const options = { cwd: process.cwd(), repositoryPath: process.cwd() };

    await expectCommand(["init", "--workspace", workspace], options);
    await writeFile(join(workspace, "reviews", "missing-frontmatter.md"), "# Review\n", "utf8");
    await writeFile(
      join(workspace, "tasks", "invalid-prefix.md"),
      [
        "---",
        "id: src_0001",
        "type: source",
        "title: Invalid prefix",
        "status: finished",
        "created: 2026-06-23T00:00:00.000Z",
        "updated: 2026-06-23T00:00:00.000Z",
        "trigger_refs: []",
        "source_refs:",
        "  - artifact_0001",
        "knowledge_refs: []",
        "done_criteria:",
        "  - Inspect lint output.",
        "review_required: false",
        "---",
        "# Invalid prefix",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = await expectCommand(["lint", "--workspace", workspace], options);
    const codes = [...new Set(report.issues.map((issue: { code: string }) => issue.code))];

    expect(codes).toEqual(
      expect.arrayContaining([
        "artifact_as_source",
        "directory_type_mismatch",
        "invalid_id_prefix",
        "invalid_status",
        "missing_frontmatter",
      ]),
    );
  });
});

async function expectCommand(
  argv: readonly string[],
  options: { readonly cwd: string; readonly repositoryPath: string },
): Promise<Record<string, any>> {
  const result = await runCli(argv, options);

  expect(result.stderr).toBe("");
  expect(result.exitCode).toBe(0);

  return JSON.parse(result.stdout) as Record<string, any>;
}
