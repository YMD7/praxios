import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PraxiosCore } from "../src/services/praxios-core.js";

let tempDir: string;
let core: PraxiosCore;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxios-core-"));
  fs.writeFileSync(path.join(tempDir, "pnpm-workspace.yaml"), "packages: []\n");
  core = new PraxiosCore({ workspaceRoot: tempDir });
});

afterEach(() => {
  core.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("PraxiosCore", () => {
  it("ingests a source, creates proposals, and applies a task proposal", () => {
    const result = core.ingestSource({
      sourceType: "manual_note",
      sourceTitle: "Contract request",
      content: "Create an agreement draft and refer to [[ContractFlow]].",
      metadata: {},
      processNow: true
    });

    expect(result.source.hash).toHaveLength(64);
    expect(result.proposals).toHaveLength(2);

    const taskProposal = result.proposals.find(
      (proposal) => proposal.proposalType === "task_create"
    );

    expect(taskProposal).toBeDefined();

    core.applyProposal(taskProposal!.id);

    const tasks = core.listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe("Contract request");
  });

  it("applies wiki update proposals and records unresolved links", () => {
    const result = core.ingestSource({
      sourceType: "manual_note",
      sourceTitle: "Contract process",
      content: "Use [[Legal Review]] before sending documents.",
      metadata: {},
      processNow: true
    });

    const wikiProposal = result.proposals.find(
      (proposal) => proposal.proposalType === "wiki_update"
    );

    expect(wikiProposal).toBeDefined();

    core.applyProposal(wikiProposal!.id);

    const page = core.getWikiPage("contract-process");
    expect(page?.title).toBe("Contract process");

    const links = core.listWikiLinks("contract-process");
    expect(links.outgoing[0]?.toPageId).toBe("Legal-Review");
    expect(links.outgoing[0]?.status).toBe("unresolved");
  });
});
