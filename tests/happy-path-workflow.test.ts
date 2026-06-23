import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../apps/cli/src/index";

describe("happy path local fixture workflow", () => {
  it("runs from Source capture to lint without high-severity lint issues", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-happy-path-"));
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
    const review = await expectCommand(["request-review", draft.id, "--workspace", workspace], options);
    await expectCommand(
      ["approve-review", review.id, "Approved for completion.", "--workspace", workspace],
      options,
    );
    await expectCommand(["complete-task", task.id, draft.id, "--workspace", workspace], options);
    await expectCommand(["propose-learning", task.id, "--workspace", workspace], options);
    const lintReport = await expectCommand(["lint", "--workspace", workspace], options);

    expect(lintReport.issues.filter((issue: { severity: string }) => issue.severity === "high")).toEqual([]);

    const log = await readFile(join(workspace, "log.md"), "utf8");
    for (const command of [
      "CaptureSource",
      "ExtractTaskCandidates",
      "ConfirmTask",
      "BuildContextPacket",
      "GenerateArtifactDraft",
      "RequestReview",
      "ApproveReview",
      "CompleteTask",
      "ProposeKnowledgeUpdate",
      "LintWorkspace",
    ]) {
      expect(log).toContain(`- command: ${command}`);
    }
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
