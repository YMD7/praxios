import { readdir, readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ArtifactFrontmatterSchema } from "../contracts/src/index";
import { captureFixtureSource, extractTaskCandidates } from "../packages/application/src/index";
import {
  DeterministicAgentAdapter,
  DeterministicClock,
  DeterministicIdGenerator,
  FileFixtureLoader,
  MarkdownArtifactRepository,
  MarkdownEventLog,
  MarkdownSourceRepository,
  initializePlainFileWorkspace,
  parseMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import type { CommandContext } from "../packages/ports/src/index";

describe("task candidate extraction workflow", () => {
  it("validates deterministic agent output before storing a candidate-set Artifact", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-candidate-extraction-"));
    await initializePlainFileWorkspace(workspace);

    const idGenerator = new DeterministicIdGenerator();
    const clock = new DeterministicClock(new Date("2026-06-23T00:00:00.000Z"));
    const eventLog = new MarkdownEventLog(workspace);
    const sourceRepository = new MarkdownSourceRepository(workspace);
    const sourceCaptureContext: CommandContext = {
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
        context: sourceCaptureContext,
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

    const artifact = await extractTaskCandidates(
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

    expect(artifact.frontmatter).toMatchObject({
      id: "artifact_0003",
      type: "artifact",
      artifact_kind: "task_candidate_set",
      title: "Task candidates for Product Launch Sync",
      status: "draft",
      source_refs: ["src_0001"],
      generated_by: "deterministic-agent",
      review_required: false,
    });
    expect("task_ref" in artifact.frontmatter).toBe(false);

    const artifactFileNames = await readdir(join(workspace, "artifacts"));
    expect(artifactFileNames).toEqual(["task-candidates-for-product-launch-sync.md"]);

    const artifactFile = await readFile(
      join(workspace, "artifacts", "task-candidates-for-product-launch-sync.md"),
      "utf8",
    );
    const artifactDocument = parseMarkdownFrontmatter(artifactFile, ArtifactFrontmatterSchema);

    expect(artifactDocument.frontmatter.id).toBe("artifact_0003");
    expect("task_ref" in artifactDocument.frontmatter).toBe(false);
    expect(artifactDocument.body).toContain("### candidate-1");
    expect(artifactDocument.body).toContain(
      "Draft the customer-facing support handoff checklist",
    );
    expect(artifactDocument.body).toContain("### candidate-2");
    expect(artifactDocument.body).toContain("Confirm final import status wording");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: ExtractTaskCandidates");
    expect(log).toContain("- target: artifact_0003");
    expect(log).toContain("- allowed_source_refs:");
    expect(log).toContain("  - src_0001");
    expect(log).toContain(
      "Generated and validated TaskCandidate set from captured Source.",
    );
  });
});
