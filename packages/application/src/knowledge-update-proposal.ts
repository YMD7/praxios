import type {
  AgentGateway,
  ArtifactRecord,
  ArtifactRepository,
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  TaskRecord,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

export interface ProposeKnowledgeUpdateInput {
  readonly task: TaskRecord;
  readonly context: CommandContext;
}

export interface ProposeKnowledgeUpdateDependencies {
  readonly agentGateway: AgentGateway;
  readonly artifactRepository: ArtifactRepository;
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
}

export async function proposeKnowledgeUpdate(
  input: ProposeKnowledgeUpdateInput,
  dependencies: ProposeKnowledgeUpdateDependencies,
): Promise<ArtifactRecord> {
  if (input.task.frontmatter.status !== "completed") {
    throw new ApplicationError({
      code: "invalid_transition",
      message: "Knowledge update proposals require a completed Task.",
      target: input.task.frontmatter.id,
    });
  }

  const missingSourceRefs = input.task.frontmatter.source_refs.filter(
    (sourceRef) => !input.context.allowed_source_refs.includes(sourceRef),
  );
  if (missingSourceRefs.length > 0) {
    throw new ApplicationError({
      code: "missing_reference",
      message: "Knowledge update proposal requires all Task source refs in command scope.",
      target: input.task.frontmatter.id,
    });
  }

  const rawOutput = await dependencies.agentGateway.proposeKnowledgeUpdate({
    task: input.task,
    context: input.context,
  });
  const proposalOutput = validateKnowledgeProposalOutput(rawOutput, input.task.frontmatter.id);
  const now = dependencies.clock.now().toISOString();
  const artifact: ArtifactRecord = {
    frontmatter: {
      id: dependencies.idGenerator.generate("artifact_"),
      type: "artifact",
      artifact_kind: "knowledge_update_proposal",
      title: proposalOutput.title,
      status: "proposed",
      created: now,
      updated: now,
      task_ref: input.task.frontmatter.id,
      source_refs: input.task.frontmatter.source_refs,
      generated_by: input.context.agent_id ?? "deterministic-agent",
      review_required: true,
    },
    body: formatKnowledgeProposalBody({
      taskRef: input.task.frontmatter.id,
      sourceRefs: input.task.frontmatter.source_refs,
      ...proposalOutput,
    }),
  };

  const writtenArtifact = await dependencies.artifactRepository.writeArtifact(artifact);

  await dependencies.eventLog.append({
    event_id: dependencies.idGenerator.generate("event_"),
    occurred_at: dependencies.clock.now().toISOString(),
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: writtenArtifact.frontmatter.id,
    task_ref: input.task.frontmatter.id,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: input.context.approval_refs,
    new_status: writtenArtifact.frontmatter.status,
    result: "succeeded",
    rationale: "Proposed Knowledge update from completed Task without mutating active Knowledge.",
    refs: [input.task.frontmatter.id, writtenArtifact.frontmatter.id],
  });

  return writtenArtifact;
}

function validateKnowledgeProposalOutput(
  value: {
    readonly title: unknown;
    readonly proposedChange: unknown;
    readonly rationale: unknown;
    readonly confidence: unknown;
    readonly uncertainty: unknown;
  },
  target: string,
): {
  readonly title: string;
  readonly proposedChange: string;
  readonly rationale: string;
  readonly confidence: string;
  readonly uncertainty: string;
} {
  const title = requireNonEmptyString(value.title, "title", target);
  const proposedChange = requireNonEmptyString(value.proposedChange, "proposedChange", target);
  const rationale = requireNonEmptyString(value.rationale, "rationale", target);
  const confidence = requireNonEmptyString(value.confidence, "confidence", target);
  const uncertainty = requireNonEmptyString(value.uncertainty, "uncertainty", target);

  return {
    title,
    proposedChange,
    rationale,
    confidence,
    uncertainty,
  };
}

function requireNonEmptyString(value: unknown, field: string, target: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError({
      code: "invalid_agent_output",
      message: `Knowledge update proposal output is missing a non-empty ${field}.`,
      target,
    });
  }

  return value.trim();
}

function formatKnowledgeProposalBody(input: {
  readonly taskRef: string;
  readonly sourceRefs: readonly string[];
  readonly proposedChange: string;
  readonly rationale: string;
  readonly confidence: string;
  readonly uncertainty: string;
}): string {
  return [
    "## Proposed Change",
    "",
    input.proposedChange,
    "",
    "## Rationale",
    "",
    input.rationale,
    "",
    "## Evidence",
    "",
    "- source_refs:",
    ...input.sourceRefs.map((sourceRef) => `  - ${sourceRef}`),
    `- task_ref: ${input.taskRef}`,
    "",
    "## Confidence",
    "",
    `- confidence: ${input.confidence}`,
    `- uncertainty: ${input.uncertainty}`,
    "",
  ].join("\n");
}
