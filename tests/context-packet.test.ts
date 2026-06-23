import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildContextPacket,
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
} from "../packages/adapters/src/index";
import type { CommandContext, SourceRecord, TaskRecord } from "../packages/ports/src/index";

describe("context packet workflow", () => {
  it("updates a Task Context Packet section using only scoped sources", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-context-packet-"));
    await initializePlainFileWorkspace(workspace);

    const idGenerator = new DeterministicIdGenerator();
    const clock = new DeterministicClock(new Date("2026-06-23T00:00:00.000Z"));
    const eventLog = new MarkdownEventLog(workspace);
    const sourceRepository = new MarkdownSourceRepository(workspace);
    const taskRepository = new MarkdownTaskRepository(workspace);

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
        taskRepository,
      },
    );

    const unrelatedSource: SourceRecord = {
      frontmatter: {
        id: "src_9999",
        type: "source",
        title: "Unrelated source",
        status: "captured",
        created: "2026-06-23T00:00:00.000Z",
        updated: "2026-06-23T00:00:00.000Z",
        origin: "fixture:meeting-transcript",
        observed_at: "2026-06-23T00:00:00.000Z",
        content_hash: "sha256:unrelated",
        sensitivity: "restricted",
      },
      body: "# Unrelated\n",
    };
    const contextPacketContext: CommandContext = {
      actor_id: "user",
      command: "BuildContextPacket",
      target: task.frontmatter.id,
      task_ref: task.frontmatter.id,
      allowed_source_refs: [sourceCapture.source.frontmatter.id],
      allowed_knowledge_refs: [],
      allowed_tools: ["deterministic-agent"],
      approval_refs: [],
    };
    const updatedTask = await buildContextPacket(
      {
        task,
        availableSources: [sourceCapture.source, unrelatedSource],
        context: contextPacketContext,
      },
      {
        clock,
        eventLog,
        idGenerator,
        taskRepository,
      },
    );

    expect(updatedTask.body).toContain("## Context Packet");
    expect(updatedTask.body).toContain("- built_at: 2026-06-23T00:00:00.000Z");
    expect(updatedTask.body).toContain("  - src_0001");
    expect(updatedTask.body).not.toContain("src_9999");
    expect(updatedTask.body).toContain("- sensitivity: internal");
    expect(updatedTask.body).toContain("### Risks");
    expect(updatedTask.body).toContain(
      "Launch communication should not proceed before support handoff review.",
    );

    const taskFile = await readFile(
      join(workspace, "tasks", "draft-the-customer-facing-support-handoff-checklist.md"),
      "utf8",
    );
    expect(taskFile).toContain("## Context Packet");
    expect(taskFile).toContain("  - src_0001");
    expect(taskFile).not.toContain("src_9999");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: BuildContextPacket");
    expect(log).toContain("- target: task_0005");
    expect(log).toContain("- task_ref: task_0005");
    expect(log).toContain(
      "Built task-scoped ContextPacket section from allowed Source and Knowledge refs.",
    );
  });

  it("rejects ContextPacket when Task knowledge refs are outside command scope", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-context-packet-"));
    await initializePlainFileWorkspace(workspace);
    const taskRepository = new MarkdownTaskRepository(workspace);
    const task = await taskRepository.writeTask(createTaskWithKnowledgeRef());

    await expect(
      buildContextPacket(
        {
          task,
          availableSources: [],
          context: {
            actor_id: "user",
            command: "BuildContextPacket",
            target: task.frontmatter.id,
            task_ref: task.frontmatter.id,
            allowed_source_refs: [],
            allowed_knowledge_refs: [],
            allowed_tools: ["deterministic-agent"],
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
      code: "missing_reference",
      target: task.frontmatter.id,
    });

    await expect(readFile(join(workspace, "log.md"), "utf8")).resolves.not.toContain(
      "BuildContextPacket",
    );
  });
});

function createTaskWithKnowledgeRef(): TaskRecord {
  return {
    frontmatter: {
      id: "task_0001",
      type: "task",
      title: "Task with scoped Knowledge requirement",
      status: "active",
      created: "2026-06-23T00:00:00.000Z",
      updated: "2026-06-23T00:00:00.000Z",
      trigger_refs: ["artifact_0001"],
      source_refs: [],
      knowledge_refs: ["know_0001"],
      done_criteria: ["Context packet is built only with allowed Knowledge."],
      review_required: true,
    },
    body: "# Task with scoped Knowledge requirement\n",
  };
}
