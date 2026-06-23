import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  AgentGateway,
  ExtractTaskCandidatesInput,
  ExtractTaskCandidatesOutput,
  GenerateArtifactDraftInput,
  GenerateArtifactDraftOutput,
  ProposeKnowledgeUpdateInput,
  ProposeKnowledgeUpdateOutput,
} from "../../ports/src/index.js";

export class DeterministicAgentAdapter implements AgentGateway {
  constructor(private readonly repositoryPath: string) {}

  async extractTaskCandidates(
    input: ExtractTaskCandidatesInput,
  ): Promise<ExtractTaskCandidatesOutput> {
    if (!/^[a-z0-9-]+$/u.test(input.fixtureName)) {
      throw new Error(`Invalid expected output fixture name: ${input.fixtureName}`);
    }

    const fixture = JSON.parse(
      await readFile(
        join(
          this.repositoryPath,
          "fixtures",
          "expected",
          `${input.fixtureName}.task-candidates.json`,
        ),
        "utf8",
      ),
    ) as { readonly candidates?: readonly unknown[] };

    return {
      candidates: fixture.candidates ?? [],
    };
  }

  async generateArtifactDraft(
    input: GenerateArtifactDraftInput,
  ): Promise<GenerateArtifactDraftOutput> {
    return {
      title: "Support handoff checklist draft",
      body: [
        "# Support handoff checklist draft",
        "",
        "## Purpose",
        "",
        "Prepare a customer-facing support handoff checklist for launch review.",
        "",
        "## Draft Checklist",
        "",
        "- Confirm the support escalation path.",
        "- Identify who watches the first-hour incident channel.",
        "- Send the checklist to Maya and Leo for review.",
        "",
        "## Evidence",
        "",
        "- This draft is generated from Task-scoped Source refs only.",
        "- It is an Artifact draft, not Source evidence.",
        "",
      ].join("\n"),
    };
  }

  async proposeKnowledgeUpdate(
    _input: ProposeKnowledgeUpdateInput,
  ): Promise<ProposeKnowledgeUpdateOutput> {
    return {
      title: "Support launch checklist knowledge update",
      proposedChange:
        "Add a reusable procedure for preparing customer-facing support handoff checklists before launch.",
      rationale: [
        "The completed Task showed that support ownership, escalation paths, and first-hour monitoring",
        "should be captured before customer-facing launch communication is finalized.",
      ].join(" "),
      confidence: "medium",
      uncertainty:
        "This proposal is based on one completed Task and should be reviewed before promotion to Knowledge.",
    };
  }
}
