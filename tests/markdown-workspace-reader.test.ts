import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MarkdownWorkspaceReader,
  initializePlainFileWorkspace,
  stringifyMarkdownFrontmatter,
} from "../packages/adapters/src/index";

describe("markdown workspace reader", () => {
  it("reads valid Markdown records from workspace directories", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-workspace-reader-"));
    await initializePlainFileWorkspace(workspace);

    await writeFile(
      join(workspace, "sources", "product-launch-sync.md"),
      stringifyMarkdownFrontmatter({
        frontmatter: {
          id: "src_0001",
          type: "source",
          title: "Product launch sync",
          status: "captured",
          created: "2026-06-23T00:00:00.000Z",
          updated: "2026-06-23T00:00:00.000Z",
          origin: "fixture:product-launch-sync",
          observed_at: "2026-06-23T00:00:00.000Z",
          content_hash: "sha256:product-launch-sync",
          sensitivity: "internal",
        },
        body: "# Product launch sync\n",
      }),
      "utf8",
    );

    const snapshot = await new MarkdownWorkspaceReader(workspace).readWorkspace();

    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.files[0]).toMatchObject({
      kind: "source",
      relativePath: "sources/product-launch-sync.md",
      frontmatter: {
        id: "src_0001",
        type: "source",
      },
      body: "# Product launch sync\n",
    });
    expect(snapshot.logContent).toBe("# Praxios Log\n\n");
  });

  it("reports invalid frontmatter without throwing", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-workspace-reader-"));
    await initializePlainFileWorkspace(workspace);

    await writeFile(
      join(workspace, "tasks", "bad-task.md"),
      ["---", "id: task_0001", "type: task", "status: finished", "---", "# Bad task", ""].join(
        "\n",
      ),
      "utf8",
    );

    const snapshot = await new MarkdownWorkspaceReader(workspace).readWorkspace();

    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.files[0]).toMatchObject({
      kind: "task",
      relativePath: "tasks/bad-task.md",
      rawFrontmatter: {
        id: "task_0001",
        type: "task",
        status: "finished",
      },
      validationError: "Markdown frontmatter failed validation.",
    });
    expect(snapshot.files[0]?.frontmatter).toBeUndefined();
  });
});
