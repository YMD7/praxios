import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TaskFrontmatterSchema } from "../contracts/src/index";
import {
  captureFixtureSource,
  confirmTask,
  extractTaskCandidates,
} from "../packages/application/src/index";
import {
  DeterministicAgentAdapter,
  DeterministicClock,
  DeterministicIdGenerator,
  FileFixtureLoader,
  MarkdownArtifactRepository,
  MarkdownEventLog,
  MarkdownSourceRepository,
  MarkdownTaskRepository,
  initializePlainFileWorkspace,
  parseMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import type { ArtifactRecord, CommandContext } from "../packages/ports/src/index";

describe("task confirmation workflow", () => {
  it("confirms a candidate-set Artifact local key into a distinct Task", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-task-confirmation-"));
    await initializePlainFileWorkspace(workspace);

    const idGenerator = new DeterministicIdGenerator();
    const clock = new DeterministicClock(new Date("2026-06-23T00:00:00.000Z"));
    const eventLog = new MarkdownEventLog(workspace);
    const sourceRepository = new MarkdownSourceRepository(workspace);

    const captureContext: CommandContext = {
      actor_id: "user",
      command: "CaptureSource",
      target: "fixture:product-launch-sync",
      allowed_source_refs: [],
      allowed_knowledge_refs: [],
      allowed_tools: [],
      approval_refs: [],
    };
    const sourceCapture = await captureFixtureSource(
      {
        fixtureName: "product-launch-sync",
        context: captureContext,
      },
      {
        clock,
        eventLog,
        fixtureLoader: new FileFixtureLoader(process.cwd()),
        idGenerator,
        sourceRepository,
      },
    );

    const extractionContext: CommandContext = {
      actor_id: "user",
      agent_id: "deterministic-agent",
      command: "ExtractTaskCandidates",
      target: sourceCapture.source.frontmatter.id,
      allowed_source_refs: [sourceCapture.source.frontmatter.id],
      allowed_knowledge_refs: [],
      allowed_tools: ["deterministic-agent"],
      approval_refs: [],
    };
    const candidateSetArtifact = await extractTaskCandidates(
      {
        fixtureName: "product-launch-sync",
        source: sourceCapture.source,
        context: extractionContext,
      },
      {
        agentGateway: new DeterministicAgentAdapter(process.cwd()),
        artifactRepository: new MarkdownArtifactRepository(workspace),
        clock,
        eventLog,
        idGenerator,
      },
    );

    const confirmationContext: CommandContext = {
      actor_id: "user",
      command: "ConfirmTask",
      target: `${candidateSetArtifact.frontmatter.id}#candidate-1`,
      allowed_source_refs: [sourceCapture.source.frontmatter.id],
      allowed_knowledge_refs: [],
      allowed_tools: [],
      approval_refs: [],
    };
    const task = await confirmTask(
      {
        candidateSetArtifact,
        candidateKey: "candidate-1",
        context: confirmationContext,
      },
      {
        clock,
        eventLog,
        idGenerator,
        taskRepository: new MarkdownTaskRepository(workspace),
      },
    );

    expect(task.frontmatter).toMatchObject({
      id: "task_0005",
      type: "task",
      title: "Draft the customer-facing support handoff checklist",
      status: "active",
      trigger_refs: ["artifact_0003"],
      source_refs: ["src_0001"],
      knowledge_refs: [],
      review_required: true,
    });
    expect(task.frontmatter.id).not.toBe("candidate-1");
    expect(task.frontmatter.done_criteria).toEqual([
      "Checklist draft includes the support escalation path.",
      "Checklist draft identifies who watches the first-hour incident channel.",
      "Checklist draft is sent to Maya and Leo for review.",
    ]);

    const taskFileNames = await readdir(join(workspace, "tasks"));
    expect(taskFileNames).toEqual([
      "draft-the-customer-facing-support-handoff-checklist.md",
    ]);

    const taskFile = await readFile(
      join(workspace, "tasks", "draft-the-customer-facing-support-handoff-checklist.md"),
      "utf8",
    );
    const taskDocument = parseMarkdownFrontmatter(taskFile, TaskFrontmatterSchema);

    expect(taskDocument.frontmatter.id).toBe("task_0005");
    expect(taskDocument.body).toContain(
      "Confirmed from candidate set Artifact `artifact_0003` using local key `candidate-1`.",
    );
    expect(taskDocument.body).toContain("## Context Packet");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: ConfirmTask");
    expect(log).toContain("- target: task_0005");
    expect(log).toContain("- task_ref: task_0005");
    expect(log).toContain("- new_status: active");
    expect(log).toContain("Confirmed candidate-1 from task candidate set Artifact.");
  });

  it("rejects candidate Source refs outside Artifact and command scope before creating a Task", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-task-confirmation-"));
    await initializePlainFileWorkspace(workspace);
    const taskRepository = new MarkdownTaskRepository(workspace);
    const candidateSetArtifact = createCandidateSetArtifactWithUnrelatedSourceRef();

    await expect(
      confirmTask(
        {
          candidateSetArtifact,
          candidateKey: "candidate-1",
          context: {
            actor_id: "user",
            command: "ConfirmTask",
            target: "artifact_0001#candidate-1",
            allowed_source_refs: ["src_0001"],
            allowed_knowledge_refs: [],
            allowed_tools: [],
            approval_refs: [],
          },
        },
        {
          clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
          eventLog: new MarkdownEventLog(workspace),
          idGenerator: new DeterministicIdGenerator(),
          taskRepository,
        },
      ),
    ).rejects.toMatchObject({
      code: "invalid_agent_output",
      target: "artifact_0001",
    });

    await expect(readdir(join(workspace, "tasks"))).resolves.toEqual([]);
    await expect(readFile(join(workspace, "log.md"), "utf8")).resolves.not.toContain(
      "ConfirmTask",
    );
  });
});

function createCandidateSetArtifactWithUnrelatedSourceRef(): ArtifactRecord {
  return {
    frontmatter: {
      id: "artifact_0001",
      type: "artifact",
      artifact_kind: "task_candidate_set",
      title: "Task candidates",
      status: "draft",
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      source_refs: ["src_0001"],
      generated_by: "deterministic-agent",
      review_required: false,
    },
    body: [
      "# Task Candidates",
      "",
      "## Task Candidates",
      "",
      "### candidate-1",
      "",
      "- title: Mixed source task",
      "- status: proposed",
      "- confidence: medium",
      "- uncertainty: None.",
      "- source_refs:",
      "  - src_0001",
      "  - src_9999",
      "- proposed_done_criteria:",
      "  - Do scoped work.",
      "- extraction_rationale: Tampered candidate body includes unrelated source.",
      "",
    ].join("\n"),
  };
}
