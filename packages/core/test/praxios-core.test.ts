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
    expect(links.outgoing[0]?.toPageId).toBe("legal-review");
    expect(links.outgoing[0]?.status).toBe("unresolved");
  });

  it("resolves incoming wiki links when a target page is created later", () => {
    core.upsertWikiPage({
      pageId: "contract-process",
      title: "Contract process",
      body: "Use [[Legal Review]] before sending documents.",
      tags: []
    });

    expect(core.listWikiLinks("contract-process").outgoing[0]?.status).toBe("unresolved");

    core.upsertWikiPage({
      pageId: "legal-review",
      title: "Legal Review",
      body: "Review legal risk before sending.",
      tags: []
    });

    const sourceLinks = core.listWikiLinks("contract-process");
    const targetLinks = core.listWikiLinks("legal-review");

    expect(sourceLinks.outgoing[0]?.status).toBe("resolved");
    expect(targetLinks.backlinks[0]?.fromPageId).toBe("contract-process");
    expect(targetLinks.backlinks[0]?.status).toBe("resolved");
  });

  it("keeps wikilink alias and source provenance when resolving later", () => {
    core.upsertWikiPage(
      {
        pageId: "contract-process",
        title: "Contract process",
        body: "Use [[Legal Review|legal review]] before sending documents.",
        tags: []
      },
      "source-1"
    );

    const unresolved = core.listWikiLinks("contract-process").outgoing[0];
    expect(unresolved?.toPageId).toBe("legal-review");
    expect(unresolved?.anchorText).toBe("legal review");
    expect(unresolved?.sourceId).toBe("source-1");
    expect(unresolved?.status).toBe("unresolved");

    core.upsertWikiPage({
      pageId: "legal-review",
      title: "Legal Review",
      body: "Review legal risk before sending.",
      tags: []
    });

    const resolved = core.listWikiLinks("contract-process").outgoing[0];
    const backlink = core.listWikiLinks("legal-review").backlinks[0];

    expect(resolved?.status).toBe("resolved");
    expect(resolved?.sourceId).toBe("source-1");
    expect(resolved?.anchorText).toBe("legal review");
    expect(backlink?.sourceId).toBe("source-1");
  });

  it("rolls back task side effects when proposal apply fails", () => {
    const result = core.ingestSource({
      sourceType: "manual_note",
      sourceTitle: "Contract request",
      content: "Create an agreement draft.",
      metadata: {},
      processNow: true
    });
    const taskProposal = result.proposals.find(
      (proposal) => proposal.proposalType === "task_create"
    );

    expect(taskProposal).toBeDefined();

    const originalMarkProposalApplied = core.repo.markProposalApplied.bind(core.repo);
    core.repo.markProposalApplied = (() => {
      throw new Error("forced apply failure");
    }) as typeof core.repo.markProposalApplied;

    expect(() => core.applyProposal(taskProposal!.id)).toThrow("forced apply failure");

    core.repo.markProposalApplied = originalMarkProposalApplied;

    expect(core.listTasks()).toHaveLength(0);
    expect(core.getProposal(taskProposal!.id)?.status).toBe("pending");
  });

  it("validates proposal payload before applying side effects", () => {
    const proposal = core.repo.createProposal({
      proposalType: "task_create",
      sourceIds: [],
      taskId: null,
      destination: { kind: "task" },
      payload: { description: "Missing title" },
      evidence: {},
      rationale: "Invalid payload fixture",
      createdBy: "test"
    });

    expect(() => core.applyProposal(proposal.id)).toThrow();
    expect(core.listTasks()).toHaveLength(0);
    expect(core.getProposal(proposal.id)?.status).toBe("pending");
  });

  it("does not reject proposals that were already applied", () => {
    const result = core.ingestSource({
      sourceType: "manual_note",
      sourceTitle: "Contract request",
      content: "Create an agreement draft.",
      metadata: {},
      processNow: true
    });
    const taskProposal = result.proposals.find(
      (proposal) => proposal.proposalType === "task_create"
    );

    expect(taskProposal).toBeDefined();

    core.applyProposal(taskProposal!.id);

    expect(() => core.rejectProposal(taskProposal!.id)).toThrow("Proposal is not pending");

    const proposal = core
      .listProposals()
      .find((candidate) => candidate.id === taskProposal!.id);

    expect(proposal?.status).toBe("applied");
    expect(core.listTasks()).toHaveLength(1);
  });
});
