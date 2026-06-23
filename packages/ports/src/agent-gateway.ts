import type { TaskCandidate } from "../../../contracts/src/index.js";
import type { CommandContext } from "./command-context.js";
import type { SourceRecord } from "./source-repository.js";

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

export interface AgentGateway {
  extractTaskCandidates(input: ExtractTaskCandidatesInput): Promise<ExtractTaskCandidatesOutput>;
}
