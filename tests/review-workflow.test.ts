import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ReviewFrontmatterSchema } from "../contracts/src/index";
import {
  approveReview,
  buildContextPacket,
  captureFixtureSource,
  confirmTask,
  extractTaskCandidates,
  generateArtifactDraft,
  requestReviewForArtifact,
} from "../packages/application/src/index";
import {
  DeterministicAgentAdapter,
  DeterministicClock,
  DeterministicIdGenerator,
  FileFixtureLoader,
  MarkdownArtifactRepository,
  MarkdownEventLog,
  MarkdownReviewRepository,
  MarkdownSourceRepository,
  MarkdownTaskRepository,
  initializePlainFileWorkspace,
  parseMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import type { CommandContext } from "../packages/ports/src/index";

describe("review workflow", () => {
  it("requests and approves review for a generated Artifact draft", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-review-workflow-"));
    await initializePlainFileWorkspace(workspace);

    const idGenerator = new DeterministicIdGenerator();
    const clock = new DeterministicClock(new Date("2026-06-23T00:00:00.000Z"));
    const eventLog = new MarkdownEventLog(workspace);
    const sourceRepository = new MarkdownSourceRepository(workspace);
    const artifactRepository = new MarkdownArtifactRepository(workspace);
    const taskRepository = new MarkdownTaskRepository(workspace);
    const reviewRepository = new MarkdownReviewRepository(workspace);
    const agentGateway = new DeterministicAgentAdapter(process.cwd());

    const sourceCapture = await captureFixtureSource(
      {
        fixtureName: "product-launch-sync",
        context: {
          actor_id: "user",
          command: "CaptureSource",
          target: "fixture:product-launch-sync",
          allowed_source_refs: [],
          allowed_knowledge_refs: [],
          allowed_tools: [],
          approval_refs: [],
        },
      },
      {
        clock,
        eventLog,
        fixtureLoader: new FileFixtureLoader(process.cwd()),
        idGenerator,
        sourceRepository,
      },
    );

    const candidateSetArtifact = await extractTaskCandidates(
      {
        fixtureName: "product-launch-sync",
        source: sourceCapture.source,
        context: {
          actor_id: "user",
          agent_id: "deterministic-agent",
          command: "ExtractTaskCandidates",
          target: sourceCapture.source.frontmatter.id,
          allowed_source_refs: [sourceCapture.source.frontmatter.id],
          allowed_knowledge_refs: [],
          allowed_tools: ["deterministic-agent"],
          approval_refs: [],
        },
      },
      {
        agentGateway,
        artifactRepository,
        clock,
        eventLog,
        idGenerator,
      },
    );

    const task = await confirmTask(
      {
        candidateSetArtifact,
        candidateKey: "candidate-1",
        context: {
          actor_id: "user",
          command: "ConfirmTask",
          target: `${candidateSetArtifact.frontmatter.id}#candidate-1`,
          allowed_source_refs: [sourceCapture.source.frontmatter.id],
          allowed_knowledge_refs: [],
          allowed_tools: [],
          approval_refs: [],
        },
      },
      {
        clock,
        eventLog,
        idGenerator,
        taskRepository,
      },
    );

    const taskWithContext = await buildContextPacket(
      {
        task,
        availableSources: [sourceCapture.source],
        context: {
          actor_id: "user",
          command: "BuildContextPacket",
          target: task.frontmatter.id,
          task_ref: task.frontmatter.id,
          allowed_source_refs: [sourceCapture.source.frontmatter.id],
          allowed_knowledge_refs: [],
          allowed_tools: ["deterministic-agent"],
          approval_refs: [],
        },
      },
      {
        clock,
        eventLog,
        idGenerator,
        taskRepository,
      },
    );

    const artifactDraft = await generateArtifactDraft(
      {
        task: taskWithContext,
        context: {
          actor_id: "user",
          agent_id: "deterministic-agent",
          command: "GenerateArtifactDraft",
          target: taskWithContext.frontmatter.id,
          task_ref: taskWithContext.frontmatter.id,
          allowed_source_refs: [sourceCapture.source.frontmatter.id],
          allowed_knowledge_refs: [],
          allowed_tools: ["deterministic-agent"],
          approval_refs: [],
        },
      },
      {
        agentGateway,
        artifactRepository,
        clock,
        eventLog,
        idGenerator,
      },
    );

    const reviewContext: CommandContext = {
      actor_id: "user",
      command: "RequestReview",
      target: artifactDraft.frontmatter.id,
      task_ref: taskWithContext.frontmatter.id,
      allowed_source_refs: [sourceCapture.source.frontmatter.id],
      allowed_knowledge_refs: [],
      allowed_tools: [],
      approval_refs: [],
    };
    const requestedReview = await requestReviewForArtifact(
      {
        artifact: artifactDraft,
        context: reviewContext,
      },
      {
        clock,
        eventLog,
        idGenerator,
        reviewRepository,
      },
    );

    expect(requestedReview.frontmatter).toMatchObject({
      id: "review_0010",
      type: "review",
      status: "requested",
      target_ref: "artifact_0008",
      requested_by: "user",
      decision: "pending",
      approval_scope: ["artifact_review", "task_completion"],
    });

    const approvedReview = await approveReview(
      {
        review: requestedReview,
        rationale: "Draft is acceptable for task completion simulation.",
        context: {
          actor_id: "user",
          command: "ApproveReview",
          target: requestedReview.frontmatter.id,
          task_ref: taskWithContext.frontmatter.id,
          allowed_source_refs: [sourceCapture.source.frontmatter.id],
          allowed_knowledge_refs: [],
          allowed_tools: [],
          approval_refs: [],
        },
      },
      {
        clock,
        eventLog,
        idGenerator,
        reviewRepository,
      },
    );

    expect(approvedReview.frontmatter).toMatchObject({
      id: "review_0010",
      status: "approved",
      target_ref: "artifact_0008",
      decision: "approved",
      rationale: "Draft is acceptable for task completion simulation.",
      approval_scope: ["artifact_review", "task_completion"],
    });

    const reviewFileNames = await readdir(join(workspace, "reviews"));
    expect(reviewFileNames).toEqual(["review-support-handoff-checklist-draft.md"]);

    const reviewFile = await readFile(
      join(workspace, "reviews", "review-support-handoff-checklist-draft.md"),
      "utf8",
    );
    const reviewDocument = parseMarkdownFrontmatter(reviewFile, ReviewFrontmatterSchema);
    expect(reviewDocument.frontmatter.status).toBe("approved");
    expect(reviewDocument.frontmatter.decision).toBe("approved");
    expect(reviewDocument.body).toContain("Draft is acceptable for task completion simulation.");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: RequestReview");
    expect(log).toContain("- target: review_0010");
    expect(log).toContain("- new_status: requested");
    expect(log).toContain("Requested human review for generated Artifact draft.");
    expect(log).toContain("- command: ApproveReview");
    expect(log).toContain("- previous_status: requested");
    expect(log).toContain("- new_status: approved");
    expect(log).toContain("Draft is acceptable for task completion simulation.");
  });
});
