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

export interface GenerateArtifactDraftInput {
  readonly task: TaskRecord;
  readonly context: CommandContext;
}

export interface GenerateArtifactDraftDependencies {
  readonly agentGateway: AgentGateway;
  readonly artifactRepository: ArtifactRepository;
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
}

export async function generateArtifactDraft(
  input: GenerateArtifactDraftInput,
  dependencies: GenerateArtifactDraftDependencies,
): Promise<ArtifactRecord> {
  const missingSourceRefs = input.task.frontmatter.source_refs.filter(
    (sourceRef) => !input.context.allowed_source_refs.includes(sourceRef),
  );
  if (missingSourceRefs.length > 0) {
    throw new ApplicationError({
      code: "missing_reference",
      message: "Artifact draft generation requires all Task source refs in command scope.",
      target: input.task.frontmatter.id,
    });
  }

  const rawOutput = await dependencies.agentGateway.generateArtifactDraft({
    task: input.task,
    context: input.context,
  });
  const draftOutput = validateArtifactDraftOutput(rawOutput, input.task.frontmatter.id);
  const now = dependencies.clock.now().toISOString();
  const artifact: ArtifactRecord = {
    frontmatter: {
      id: dependencies.idGenerator.generate("artifact_"),
      type: "artifact",
      artifact_kind: "artifact_draft",
      title: draftOutput.title,
      status: "draft",
      created: now,
      updated: now,
      task_ref: input.task.frontmatter.id,
      source_refs: input.task.frontmatter.source_refs,
      generated_by: input.context.agent_id ?? "deterministic-agent",
      review_required: true,
    },
    body: draftOutput.body,
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
    rationale: "Generated deterministic Artifact draft from Task ContextPacket.",
    refs: [input.task.frontmatter.id, writtenArtifact.frontmatter.id],
  });

  return writtenArtifact;
}

function validateArtifactDraftOutput(
  value: { readonly title: unknown; readonly body: unknown },
  target: string,
): { readonly title: string; readonly body: string } {
  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    throw new ApplicationError({
      code: "invalid_agent_output",
      message: "Artifact draft output is missing a non-empty title.",
      target,
    });
  }

  if (typeof value.body !== "string" || value.body.trim().length === 0) {
    throw new ApplicationError({
      code: "invalid_agent_output",
      message: "Artifact draft output is missing a non-empty body.",
      target,
    });
  }

  return {
    title: value.title.trim(),
    body: value.body,
  };
}
