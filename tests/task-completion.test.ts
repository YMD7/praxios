import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ApplicationError, completeTask } from "../packages/application/src/index";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  MarkdownEventLog,
  MarkdownTaskRepository,
  initializePlainFileWorkspace,
} from "../packages/adapters/src/index";
import type { ArtifactRecord, CommandContext, ReviewRecord, TaskRecord } from "../packages/ports/src/index";

describe("task completion workflow", () => {
  it("blocks completion without a matching task_completion approval", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-task-completion-"));
    await initializePlainFileWorkspace(workspace);
    const dependencies = {
      clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
      eventLog: new MarkdownEventLog(workspace),
      idGenerator: new DeterministicIdGenerator(),
      taskRepository: new MarkdownTaskRepository(workspace),
    };
    const task = await dependencies.taskRepository.writeTask(createTask());
    const completionArtifact = createCompletionArtifact();
    const context = createCompletionContext(task.frontmatter.id);

    await expect(
      completeTask(
        {
          task,
          completionArtifact,
          context,
          reviews: [
            createReview({
              id: "review_0001",
              targetRef: "artifact_9999",
              approvalScope: ["task_completion"],
            }),
            createReview({
              id: "review_0002",
              targetRef: completionArtifact.frontmatter.id,
              approvalScope: ["artifact_review"],
            }),
          ],
        },
        dependencies,
      ),
    ).rejects.toMatchObject<ApplicationError>({
      code: "approval_required",
      target: task.frontmatter.id,
    });
  });

  it("completes a Task with approved Review targeting the completion Artifact", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-task-completion-"));
    await initializePlainFileWorkspace(workspace);
    const dependencies = {
      clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
      eventLog: new MarkdownEventLog(workspace),
      idGenerator: new DeterministicIdGenerator(),
      taskRepository: new MarkdownTaskRepository(workspace),
    };
    const task = await dependencies.taskRepository.writeTask(createTask());
    const completionArtifact = createCompletionArtifact();
    const context = createCompletionContext(task.frontmatter.id);
    const approvedReview = createReview({
      id: "review_0003",
      targetRef: completionArtifact.frontmatter.id,
      approvalScope: ["artifact_review", "task_completion"],
    });

    const completedTask = await completeTask(
      {
        task,
        completionArtifact,
        context,
        reviews: [approvedReview],
      },
      dependencies,
    );

    expect(completedTask.frontmatter.status).toBe("completed");
    expect(completedTask.body).toContain("## Result");
    expect(completedTask.body).toContain("- status: completed");

    const taskFile = await readFile(
      join(workspace, "tasks", "draft-the-customer-facing-support-handoff-checklist.md"),
      "utf8",
    );
    expect(taskFile).toContain("status: completed");
    expect(taskFile).toContain("- status: completed");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: CompleteTask");
    expect(log).toContain("- target: task_0001");
    expect(log).toContain("- task_ref: task_0001");
    expect(log).toContain("- approval_refs:");
    expect(log).toContain("  - review_0003");
    expect(log).toContain("- previous_status: active");
    expect(log).toContain("- new_status: completed");
    expect(log).toContain("Completed Task after matching task_completion approval.");
  });
});

function createTask(): TaskRecord {
  return {
    frontmatter: {
      id: "task_0001",
      type: "task",
      title: "Draft the customer-facing support handoff checklist",
      status: "active",
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      trigger_refs: ["artifact_0001"],
      source_refs: ["src_0001"],
      knowledge_refs: [],
      done_criteria: ["Checklist draft is reviewed."],
      review_required: true,
    },
    body: [
      "# Draft the customer-facing support handoff checklist",
      "",
      "## Intent",
      "",
      "Prepare the support handoff checklist.",
      "",
      "## Result",
      "",
      "_Not completed._",
      "",
    ].join("\n"),
  };
}

function createCompletionArtifact(): ArtifactRecord {
  return {
    frontmatter: {
      id: "artifact_0002",
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

function createReview(input: {
  readonly id: string;
  readonly targetRef: string;
  readonly approvalScope: readonly string[];
}): ReviewRecord {
  return {
    frontmatter: {
      id: input.id,
      type: "review",
      title: `Review ${input.targetRef}`,
      status: "approved",
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      target_ref: input.targetRef,
      requested_by: "user",
      decision: "approved",
      rationale: "Approved.",
      approval_scope: [...input.approvalScope],
    },
    body: "# Review\n",
  };
}

function createCompletionContext(taskRef: string): CommandContext {
  return {
    actor_id: "user",
    command: "CompleteTask",
    target: taskRef,
    task_ref: taskRef,
    allowed_source_refs: ["src_0001"],
    allowed_knowledge_refs: [],
    allowed_tools: [],
    approval_refs: [],
  };
}
