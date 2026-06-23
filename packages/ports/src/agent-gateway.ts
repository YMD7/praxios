import type { TaskCandidate } from "../../../contracts/src/index.js";
import type { CommandContext } from "./command-context.js";
import type { SourceRecord } from "./source-repository.js";
import type { TaskRecord } from "./task-repository.js";

export interface ExtractTaskCandidatesInput {
  readonly fixtureName: string;
  readonly source: SourceRecord;
  readonly context: CommandContext;
}

export interface ExtractTaskCandidatesOutput {
  readonly candidates: readonly unknown[];
}

export interface ValidatedTaskCandidatesOutput {
  readonly candidates: readonly TaskCandidate[];
}

export interface GenerateArtifactDraftInput {
  readonly task: TaskRecord;
  readonly context: CommandContext;
}

export interface GenerateArtifactDraftOutput {
  readonly title: unknown;
  readonly body: unknown;
}

export interface ProposeKnowledgeUpdateInput {
  readonly task: TaskRecord;
  readonly context: CommandContext;
}

export interface ProposeKnowledgeUpdateOutput {
  readonly title: unknown;
  readonly proposedChange: unknown;
  readonly rationale: unknown;
  readonly confidence: unknown;
  readonly uncertainty: unknown;
}

export interface AgentGateway {
  extractTaskCandidates(input: ExtractTaskCandidatesInput): Promise<ExtractTaskCandidatesOutput>;
  generateArtifactDraft(input: GenerateArtifactDraftInput): Promise<GenerateArtifactDraftOutput>;
  proposeKnowledgeUpdate(
    input: ProposeKnowledgeUpdateInput,
  ): Promise<ProposeKnowledgeUpdateOutput>;
}
