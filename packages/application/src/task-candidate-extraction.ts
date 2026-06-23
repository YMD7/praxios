import { TaskCandidateSchema, type TaskCandidate } from "../../../contracts/src/index.js";
import type {
  AgentGateway,
  ArtifactRecord,
  ArtifactRepository,
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  SourceRecord,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

export interface ExtractTaskCandidatesWorkflowInput {
  readonly fixtureName: string;
  readonly source: SourceRecord;
  readonly context: CommandContext;
}

export interface ExtractTaskCandidatesWorkflowDependencies {
  readonly agentGateway: AgentGateway;
  readonly artifactRepository: ArtifactRepository;
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
}

export async function extractTaskCandidates(
  input: ExtractTaskCandidatesWorkflowInput,
  dependencies: ExtractTaskCandidatesWorkflowDependencies,
): Promise<ArtifactRecord> {
  if (!input.context.allowed_source_refs.includes(input.source.frontmatter.id)) {
    throw new ApplicationError({
      code: "missing_reference",
      message: "TaskCandidate extraction requires the captured Source in command scope.",
      target: input.source.frontmatter.id,
    });
  }

  const rawOutput = await dependencies.agentGateway.extractTaskCandidates({
    fixtureName: input.fixtureName,
    source: input.source,
    context: input.context,
  });
  if (rawOutput.candidates.length === 0) {
    throw new ApplicationError({
      code: "invalid_agent_output",
      message: "TaskCandidate extraction output did not include any candidates.",
      target: input.fixtureName,
    });
  }

  const candidates = rawOutput.candidates.map((candidate) => {
    const result = TaskCandidateSchema.safeParse(candidate);
    if (!result.success) {
      throw new ApplicationError({
        code: "invalid_agent_output",
        message: "TaskCandidate extraction output failed validation.",
        target: input.fixtureName,
        cause: result.error,
      });
    }

    const hasOutOfScopeSourceRef = result.data.source_refs.some(
      (sourceRef) => sourceRef !== input.source.frontmatter.id,
    );
    if (hasOutOfScopeSourceRef || !result.data.source_refs.includes(input.source.frontmatter.id)) {
      throw new ApplicationError({
        code: "invalid_agent_output",
        message:
          "TaskCandidate extraction output must be grounded only in the captured Source.",
        target: input.source.frontmatter.id,
      });
    }

    return result.data;
  });

  const now = dependencies.clock.now().toISOString();
  const artifact: ArtifactRecord = {
    frontmatter: {
      id: dependencies.idGenerator.generate("artifact_"),
      type: "artifact",
      artifact_kind: "task_candidate_set",
      title: `Task candidates for ${input.source.frontmatter.title}`,
      status: "draft",
      created: now,
      updated: now,
      source_refs: [input.source.frontmatter.id],
      generated_by: input.context.agent_id ?? "deterministic-agent",
      review_required: false,
    },
    body: formatTaskCandidateSetBody(candidates),
  };

  const writtenArtifact = await dependencies.artifactRepository.writeArtifact(artifact);

  await dependencies.eventLog.append({
    event_id: dependencies.idGenerator.generate("event_"),
    occurred_at: dependencies.clock.now().toISOString(),
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: writtenArtifact.frontmatter.id,
    task_ref: input.context.task_ref,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: input.context.approval_refs,
    new_status: writtenArtifact.frontmatter.status,
    result: "succeeded",
    rationale: "Generated and validated TaskCandidate set from captured Source.",
    refs: [input.source.frontmatter.id, writtenArtifact.frontmatter.id],
  });

  return writtenArtifact;
}

function formatTaskCandidateSetBody(candidates: readonly TaskCandidate[]): string {
  return [
    "# Task Candidates",
    "",
    "## Task Candidates",
    "",
    ...candidates.flatMap((candidate) => [
      `### ${candidate.key}`,
      "",
      `- title: ${candidate.title}`,
      `- status: ${candidate.status}`,
      `- confidence: ${candidate.confidence}`,
      `- uncertainty: ${candidate.uncertainty}`,
      "- source_refs:",
      ...candidate.source_refs.map((sourceRef) => `  - ${sourceRef}`),
      "- proposed_done_criteria:",
      ...candidate.proposed_done_criteria.map((criterion) => `  - ${criterion}`),
      `- extraction_rationale: ${candidate.extraction_rationale}`,
      "",
    ]),
  ].join("\n");
}
