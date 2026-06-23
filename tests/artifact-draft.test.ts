import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ArtifactFrontmatterSchema } from "../contracts/src/index";
import {
  buildContextPacket,
  captureFixtureSource,
  confirmTask,
  extractTaskCandidates,
  generateArtifactDraft,
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
import type { CommandContext } from "../packages/ports/src/index";

describe("artifact draft workflow", () => {
  it("generates a task-bound Artifact draft from a ContextPacket", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-artifact-draft-"));
    await initializePlainFileWorkspace(workspace);

    const idGenerator = new DeterministicIdGenerator();
    const clock = new DeterministicClock(new Date("2026-06-23T00:00:00.000Z"));
    const eventLog = new MarkdownEventLog(workspace);
    const sourceRepository = new MarkdownSourceRepository(workspace);
    const artifactRepository = new MarkdownArtifactRepository(workspace);
    const taskRepository = new MarkdownTaskRepository(workspace);
    const agentGateway = new DeterministicAgentAdapter(process.cwd());

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
        agentGateway,
        artifactRepository,
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
    const taskWithContext = await buildContextPacket(
      {
        task,
        availableSources: [sourceCapture.source],
        context: contextPacketContext,
      },
      {
        clock,
        eventLog,
        idGenerator,
        taskRepository,
      },
    );

    const artifactContext: CommandContext = {
      actor_id: "user",
      agent_id: "deterministic-agent",
      command: "GenerateArtifactDraft",
      target: taskWithContext.frontmatter.id,
      task_ref: taskWithContext.frontmatter.id,
      allowed_source_refs: [sourceCapture.source.frontmatter.id],
      allowed_knowledge_refs: [],
      allowed_tools: ["deterministic-agent"],
      approval_refs: [],
    };
    const artifactDraft = await generateArtifactDraft(
      {
        task: taskWithContext,
        context: artifactContext,
      },
      {
        agentGateway,
        artifactRepository,
        clock,
        eventLog,
        idGenerator,
      },
    );

    expect(artifactDraft.frontmatter).toMatchObject({
      id: "artifact_0008",
      type: "artifact",
      artifact_kind: "artifact_draft",
      title: "Support handoff checklist draft",
      status: "draft",
      task_ref: "task_0005",
      source_refs: ["src_0001"],
      generated_by: "deterministic-agent",
      review_required: true,
    });
    expect(artifactDraft.body).toContain("## Draft Checklist");
    expect(artifactDraft.body).toContain("It is an Artifact draft, not Source evidence.");

    const artifactFileNames = await readdir(join(workspace, "artifacts"));
    expect(artifactFileNames).toContain("support-handoff-checklist-draft.md");

    const artifactFile = await readFile(
      join(workspace, "artifacts", "support-handoff-checklist-draft.md"),
      "utf8",
    );
    const artifactDocument = parseMarkdownFrontmatter(artifactFile, ArtifactFrontmatterSchema);

    expect(artifactDocument.frontmatter.task_ref).toBe("task_0005");
    expect(artifactDocument.frontmatter.source_refs).toEqual(["src_0001"]);
    expect(artifactDocument.body).toContain("## Evidence");
    expect(artifactDocument.body).toContain("Artifact draft, not Source evidence");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: GenerateArtifactDraft");
    expect(log).toContain("- target: artifact_0008");
    expect(log).toContain("- task_ref: task_0005");
    expect(log).toContain("- new_status: draft");
    expect(log).toContain("Generated deterministic Artifact draft from Task ContextPacket.");
  });
});
