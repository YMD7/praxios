import type {
  ArtifactRecord,
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  TaskRecord,
  TaskRepository,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

interface ParsedCandidate {
  readonly key: string;
  readonly title: string;
  readonly sourceRefs: string[];
  readonly doneCriteria: string[];
}

export interface ConfirmTaskInput {
  readonly candidateSetArtifact: ArtifactRecord;
  readonly candidateKey: string;
  readonly context: CommandContext;
}

export interface ConfirmTaskDependencies {
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
  readonly taskRepository: TaskRepository;
}

export async function confirmTask(
  input: ConfirmTaskInput,
  dependencies: ConfirmTaskDependencies,
): Promise<TaskRecord> {
  if (input.candidateSetArtifact.frontmatter.artifact_kind !== "task_candidate_set") {
    throw new ApplicationError({
      code: "invalid_transition",
      message: "Only task candidate set Artifacts can be confirmed into Tasks.",
      target: input.candidateSetArtifact.frontmatter.id,
    });
  }

  const candidate = parseCandidateFromArtifact(input.candidateSetArtifact, input.candidateKey);
  const now = dependencies.clock.now().toISOString();
  const task: TaskRecord = {
    frontmatter: {
      id: dependencies.idGenerator.generate("task_"),
      type: "task",
      title: candidate.title,
      status: "active",
      created: now,
      updated: now,
      trigger_refs: [input.candidateSetArtifact.frontmatter.id],
      source_refs: candidate.sourceRefs,
      knowledge_refs: [],
      done_criteria: candidate.doneCriteria,
      review_required: true,
    },
    body: formatTaskBody(candidate, input.candidateSetArtifact.frontmatter.id),
  };

  const writtenTask = await dependencies.taskRepository.writeTask(task);

  await dependencies.eventLog.append({
    event_id: dependencies.idGenerator.generate("event_"),
    occurred_at: dependencies.clock.now().toISOString(),
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: writtenTask.frontmatter.id,
    task_ref: writtenTask.frontmatter.id,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: input.context.approval_refs,
    new_status: writtenTask.frontmatter.status,
    result: "succeeded",
    rationale: `Confirmed ${candidate.key} from task candidate set Artifact.`,
    refs: [input.candidateSetArtifact.frontmatter.id, writtenTask.frontmatter.id],
  });

  return writtenTask;
}

function parseCandidateFromArtifact(artifact: ArtifactRecord, candidateKey: string): ParsedCandidate {
  const section = findCandidateSection(artifact.body, candidateKey);
  if (section === undefined) {
    throw new ApplicationError({
      code: "missing_reference",
      message: `TaskCandidate key was not found in candidate set Artifact: ${candidateKey}`,
      target: artifact.frontmatter.id,
    });
  }

  const title = readScalar(section, "title");
  const sourceRefs = readList(section, "source_refs");
  const doneCriteria = readList(section, "proposed_done_criteria");

  if (title === undefined || sourceRefs.length === 0 || doneCriteria.length === 0) {
    throw new ApplicationError({
      code: "invalid_agent_output",
      message: "TaskCandidate section is missing required fields for Task confirmation.",
      target: artifact.frontmatter.id,
    });
  }

  return {
    key: candidateKey,
    title,
    sourceRefs,
    doneCriteria,
  };
}

function findCandidateSection(body: string, candidateKey: string): string | undefined {
  const lines = body.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === `### ${candidateKey}`);
  if (startIndex < 0) {
    return undefined;
  }

  const remainingLines = lines.slice(startIndex + 1);
  const endOffset = remainingLines.findIndex((line) => line.startsWith("### "));
  const sectionLines = endOffset < 0 ? remainingLines : remainingLines.slice(0, endOffset);

  return sectionLines.join("\n");
}

function readScalar(section: string, key: string): string | undefined {
  const match = new RegExp(`^- ${key}: (.+)$`, "mu").exec(section);
  return match?.[1]?.trim();
}

function readList(section: string, key: string): string[] {
  const match = new RegExp(`^- ${key}:\\n((?:  - .+\\n?)*)`, "mu").exec(section);
  if (match?.[1] === undefined) {
    return [];
  }

  return match[1]
    .split("\n")
    .map((line) => /^  - (.+)$/u.exec(line)?.[1]?.trim())
    .filter((value): value is string => value !== undefined && value.length > 0);
}

function formatTaskBody(candidate: ParsedCandidate, candidateSetArtifactRef: string): string {
  return [
    `# ${candidate.title}`,
    "",
    "## Intent",
    "",
    `Confirmed from candidate set Artifact \`${candidateSetArtifactRef}\` using local key \`${candidate.key}\`.`,
    "",
    "## Done Criteria",
    "",
    ...candidate.doneCriteria.map((criterion) => `- ${criterion}`),
    "",
    "## Context Packet",
    "",
    "_Not built yet._",
    "",
    "## Actions",
    "",
    "## Review",
    "",
    "## Result",
    "",
    "## Learning Candidates",
    "",
  ].join("\n");
}
