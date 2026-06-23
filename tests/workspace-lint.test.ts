import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { lintWorkspace } from "../packages/application/src/index";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  MarkdownArtifactRepository,
  MarkdownEventLog,
  MarkdownReviewRepository,
  MarkdownSourceRepository,
  MarkdownTaskRepository,
  MarkdownWorkspaceReader,
  initializePlainFileWorkspace,
  stringifyMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import type {
  ArtifactRecord,
  CommandContext,
  ReviewRecord,
  SourceRecord,
  TaskRecord,
} from "../packages/ports/src/index";

describe("workspace lint", () => {
  it("returns no high-severity issues for a valid local workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-lint-valid-"));
    await initializePlainFileWorkspace(workspace);

    await new MarkdownSourceRepository(workspace).writeSource(createSource());
    await new MarkdownTaskRepository(workspace).writeTask(createTask("completed"));
    await new MarkdownArtifactRepository(workspace).writeArtifact(createArtifact());
    await new MarkdownReviewRepository(workspace).writeReview(createApprovedReview());

    const report = await lintWorkspace(
      {
        snapshot: await new MarkdownWorkspaceReader(workspace).readWorkspace(),
        context: createLintContext(),
      },
      {
        clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
        eventLog: new MarkdownEventLog(workspace),
        idGenerator: new DeterministicIdGenerator(),
      },
    );

    expect(report.issues.filter((issue) => issue.severity === "high")).toEqual([]);

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: LintWorkspace");
    expect(log).toContain("- target: workspace");
    expect(log).toContain("- result: succeeded");
    expect(log).toContain("Workspace lint completed without high-severity issues.");
  });

  it("reports broken frontmatter, refs, approvals, and Artifact-as-Source misuse", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-lint-invalid-"));
    await initializePlainFileWorkspace(workspace);

    await writeFile(
      join(workspace, "sources", "duplicate-a.md"),
      stringifyMarkdownFrontmatter({
        frontmatter: createSource().frontmatter,
        body: createSource().body,
      }),
    );
    await writeFile(
      join(workspace, "sources", "duplicate-b.md"),
      stringifyMarkdownFrontmatter({
        frontmatter: createSource().frontmatter,
        body: createSource().body,
      }),
    );
    await writeFile(
      join(workspace, "tasks", "completed-without-approval.md"),
      stringifyMarkdownFrontmatter({
        frontmatter: createTask("completed").frontmatter,
        body: createTask("completed").body,
      }),
    );
    await writeFile(
      join(workspace, "tasks", "invalid-status.md"),
      [
        "---",
        "id: task_0002",
        "type: task",
        "title: Invalid status task",
        "status: finished",
        "created: 2026-06-23T00:00:00.000Z",
        "updated: 2026-06-23T00:00:00.000Z",
        "trigger_refs: []",
        "source_refs:",
        "  - artifact_0001",
        "knowledge_refs: []",
        "done_criteria:",
        "  - Review lint output.",
        "review_required: false",
        "---",
        "# Invalid status task",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(join(workspace, "reviews", "missing-frontmatter.md"), "# Review\n", "utf8");

    const report = await lintWorkspace(
      {
        snapshot: await new MarkdownWorkspaceReader(workspace).readWorkspace(),
        context: createLintContext(),
      },
      {
        clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
        eventLog: new MarkdownEventLog(workspace),
        idGenerator: new DeterministicIdGenerator(),
      },
    );

    expect(issueCodes(report.issues)).toEqual(
      expect.arrayContaining([
        "artifact_as_source",
        "completion_without_approval",
        "duplicate_id",
        "invalid_frontmatter",
        "invalid_status",
        "missing_frontmatter",
        "missing_reference",
      ]),
    );
    expect(report.issues.every((issue) => issue.message.length > 0)).toBe(true);
    expect(report.issues.every((issue) => issue.target.length > 0)).toBe(true);

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: LintWorkspace");
    expect(log).toContain("- result: failed");
    expect(log).toContain("Workspace lint found high-severity issues.");
  });
});

function createSource(): SourceRecord {
  return {
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
  };
}

function createTask(status: "active" | "completed"): TaskRecord {
  return {
    frontmatter: {
      id: "task_0001",
      type: "task",
      title: "Draft the customer-facing support handoff checklist",
      status,
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      trigger_refs: ["artifact_0001"],
      source_refs: ["src_0001"],
      knowledge_refs: [],
      done_criteria: ["Checklist draft is reviewed."],
      review_required: true,
    },
    body: "# Draft the customer-facing support handoff checklist\n",
  };
}

function createArtifact(): ArtifactRecord {
  return {
    frontmatter: {
      id: "artifact_0001",
      type: "artifact",
      artifact_kind: "artifact_draft",
      title: "Support handoff checklist draft",
      status: "draft",
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      task_ref: "task_0001",
      source_refs: ["src_0001"],
      generated_by: "deterministic-agent",
      review_required: true,
    },
    body: "# Support handoff checklist draft\n",
  };
}

function createApprovedReview(): ReviewRecord {
  return {
    frontmatter: {
      id: "review_0001",
      type: "review",
      title: "Review support handoff checklist draft",
      status: "approved",
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      target_ref: "artifact_0001",
      requested_by: "user",
      decision: "approved",
      rationale: "Approved for completion.",
      approval_scope: ["artifact_review", "task_completion"],
    },
    body: "# Review support handoff checklist draft\n",
  };
}

function createLintContext(): CommandContext {
  return {
    actor_id: "user",
    command: "LintWorkspace",
    target: "workspace",
    allowed_source_refs: [],
    allowed_knowledge_refs: [],
    allowed_tools: [],
    approval_refs: [],
  };
}

function issueCodes(issues: readonly { readonly code: string }[]): string[] {
  return [...new Set(issues.map((issue) => issue.code))].sort();
}
