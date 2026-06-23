import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SourceFrontmatterSchema } from "../contracts/src/index";
import { captureFixtureSource } from "../packages/application/src/index";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  FileFixtureLoader,
  MarkdownEventLog,
  MarkdownSourceRepository,
  initializePlainFileWorkspace,
  parseMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import type { CommandContext } from "../packages/ports/src/index";

describe("source capture workflow", () => {
  it("captures a meeting transcript fixture as a Source and logs the event", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-source-capture-"));
    await initializePlainFileWorkspace(workspace);

    const dependencies = {
      clock: new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
      eventLog: new MarkdownEventLog(workspace),
      fixtureLoader: new FileFixtureLoader(process.cwd()),
      idGenerator: new DeterministicIdGenerator(),
      sourceRepository: new MarkdownSourceRepository(workspace),
    };
    const context: CommandContext = {
      actor_id: "user",
      command: "CaptureSource",
      target: "fixture:product-launch-sync",
      allowed_source_refs: [],
      allowed_knowledge_refs: [],
      allowed_tools: [],
      approval_refs: [],
    };

    const firstCapture = await captureFixtureSource(
      {
        fixtureName: "product-launch-sync",
        context,
      },
      dependencies,
    );
    const secondCapture = await captureFixtureSource(
      {
        fixtureName: "product-launch-sync",
        context,
      },
      dependencies,
    );

    expect(firstCapture.created).toBe(true);
    expect(secondCapture.created).toBe(false);
    expect(secondCapture.source.frontmatter.id).toBe(firstCapture.source.frontmatter.id);

    const sourceFileNames = await readdir(join(workspace, "sources"));
    expect(sourceFileNames).toEqual(["product-launch-sync.md"]);

    const sourceFile = await readFile(join(workspace, "sources", "product-launch-sync.md"), "utf8");
    const sourceDocument = parseMarkdownFrontmatter(sourceFile, SourceFrontmatterSchema);

    expect(sourceDocument.frontmatter).toMatchObject({
      id: "src_0001",
      type: "source",
      title: "Product Launch Sync",
      status: "captured",
      origin: "fixture:meeting-transcript",
      observed_at: "2026-06-22T09:30:00.000Z",
      sensitivity: "internal",
    });
    expect(sourceDocument.frontmatter.content_hash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(sourceDocument.body).toContain("This fixture is fully synthetic.");

    const log = await readFile(join(workspace, "log.md"), "utf8");
    expect(log).toContain("- command: CaptureSource");
    expect(log).toContain("- target: src_0001");
    expect(log).toContain("- new_status: captured");
    expect(log).toContain("Captured synthetic meeting transcript fixture as a Source.");
    expect(log).toContain(
      "Synthetic meeting transcript fixture was already captured; reused existing Source.",
    );
  });
});
