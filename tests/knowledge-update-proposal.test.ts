import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ArtifactFrontmatterSchema } from "../contracts/src/index";
import {
  ApplicationError,
  proposeKnowledgeUpdate,
} from "../packages/application/src/index";
import {
  DeterministicAgentAdapter,
  DeterministicClock,
  DeterministicIdGenerator,
  MarkdownArtifactRepository,
  MarkdownEventLog,
  initializePlainFileWorkspace,
  parseMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import type { CommandContext, TaskRecord } from "../packages/ports/src/index";

describe("knowledge update proposal workflow", () => {
  it("rejects proposal creation from a Task that is not completed", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-learning-proposal-"));
    await initializePlainFileWorkspace(workspace);
    const activeTask = createTask("active");

    await expect(
      proposeKnowledgeUpdate(
        {
          task: activeTask,
          context: createProposalContext(activeTask.frontmatter.id),
        },
        {
          agentGateway: new DeterministicAgentAdapter(process.cwd()),
          artifactRepository: new MarkdownArtifactRepository(workspace),
          clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
          eventLog: new MarkdownEventLog(workspace),
          idGenerator: new DeterministicIdGenerator(),
        },
      ),
    ).rejects.toMatchObject<ApplicationError>({
      code: "invalid_transition",
      target: activeTask.frontmatter.id,
    });
  });

  it("stores a Knowledge update proposal Artifact without mutating active Knowledge", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-learning-proposal-"));
    await initializePlainFileWorkspace(workspace);
    const completedTask = createTask("completed");

    const proposal = await proposeKnowledgeUpdate(
      {
        task: completedTask,
        context: createProposalContext(completedTask.frontmatter.id),
      },
      {
        agentGateway: new DeterministicAgentAdapter(process.cwd()),
        artifactRepository: new MarkdownArtifactRepository(workspace),
        clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
        eventLog: new MarkdownEventLog(workspace),
        idGenerator: new DeterministicIdGenerator(),
      },
    );

    expect(proposal.frontmatter).toMatchObject({
      id: "artifact_0001",
      type: "artifact",
      artifact_kind: "knowledge_update_proposal",
      title: "Support launch checklist knowledge update",
      status: "proposed",
      task_ref: "task_0001",
      source_refs: ["src_0001"],
      generated_by: "deterministic-agent",
      review_required: true,
    });
    expect(proposal.body).toContain("## Proposed Change");
    expect(proposal.body).toContain("## Evidence");
    expect(proposal.body).toContain("- task_ref: task_0001");
    expect(proposal.body).toContain("- confidence: medium");
    expect(proposal.body).toContain("should be reviewed before promotion to Knowledge");

    const artifactFileNames = await readdir(join(workspace, "artifacts"));
    expect(artifactFileNames).toEqual(["support-launch-checklist-knowledge-update.md"]);

    const artifactFile = await readFile(
      join(workspace, "artifacts", "support-launch-checklist-knowledge-update.md"),
      "utf8",
    );
    const artifactDocument = parseMarkdownFrontmatter(
      artifactFile,
      ArtifactFrontmatterSchema,
    );
    expect(artifactDocument.frontmatter.artifact_kind).toBe("knowledge_update_proposal");
    expect(artifactDocument.frontmatter.task_ref).toBe("task_0001");
    expect(artifactDocument.frontmatter.source_refs).toEqual(["src_0001"]);

    const knowledgeFileNames = await readdir(join(workspace, "knowledge"));
    expect(knowledgeFileNames).toEqual([]);

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: ProposeKnowledgeUpdate");
    expect(log).toContain("- target: artifact_0001");
    expect(log).toContain("- task_ref: task_0001");
    expect(log).toContain("- new_status: proposed");
    expect(log).toContain(
      "Proposed Knowledge update from completed Task without mutating active Knowledge.",
    );
  });
});

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
    body: [
      "# Draft the customer-facing support handoff checklist",
      "",
      "## Intent",
      "",
      "Prepare the support handoff checklist.",
      "",
      "## Result",
      "",
      status === "completed" ? "- status: completed" : "_Not completed._",
      "",
    ].join("\n"),
  };
}

function createProposalContext(taskRef: string): CommandContext {
  return {
    actor_id: "user",
    agent_id: "deterministic-agent",
    command: "ProposeKnowledgeUpdate",
    target: taskRef,
    task_ref: taskRef,
    allowed_source_refs: ["src_0001"],
    allowed_knowledge_refs: [],
    allowed_tools: ["deterministic-agent"],
    approval_refs: [],
  };
}
