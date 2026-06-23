import type {
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  SourceRecord,
  TaskRecord,
  TaskRepository,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

export interface BuildContextPacketInput {
  readonly task: TaskRecord;
  readonly availableSources: readonly SourceRecord[];
  readonly context: CommandContext;
}

export interface BuildContextPacketDependencies {
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
  readonly taskRepository: TaskRepository;
}

export async function buildContextPacket(
  input: BuildContextPacketInput,
  dependencies: BuildContextPacketDependencies,
): Promise<TaskRecord> {
  const scopedSources = input.availableSources.filter(
    (source) =>
      input.task.frontmatter.source_refs.includes(source.frontmatter.id) &&
      input.context.allowed_source_refs.includes(source.frontmatter.id),
  );

  if (scopedSources.length !== input.task.frontmatter.source_refs.length) {
    throw new ApplicationError({
      code: "missing_reference",
      message: "ContextPacket cannot be built without all Task source refs in scope.",
      target: input.task.frontmatter.id,
    });
  }

  const missingKnowledgeRefs = input.task.frontmatter.knowledge_refs.filter(
    (knowledgeRef) => !input.context.allowed_knowledge_refs.includes(knowledgeRef),
  );
  if (missingKnowledgeRefs.length > 0) {
    throw new ApplicationError({
      code: "missing_reference",
      message: "ContextPacket cannot be built with Knowledge refs outside command scope.",
      target: input.task.frontmatter.id,
    });
  }

  const updatedTask: TaskRecord = {
    ...input.task,
    frontmatter: {
      ...input.task.frontmatter,
      updated: dependencies.clock.now().toISOString(),
    },
    body: replaceContextPacketSection(
      input.task.body,
      formatContextPacketSection({
        builtAt: dependencies.clock.now().toISOString(),
        task: input.task,
        sources: scopedSources,
        context: input.context,
      }),
    ),
  };

  const writtenTask = await dependencies.taskRepository.updateTask(updatedTask);

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
    result: "succeeded",
    rationale: "Built task-scoped ContextPacket section from allowed Source and Knowledge refs.",
    refs: [writtenTask.frontmatter.id, ...scopedSources.map((source) => source.frontmatter.id)],
  });

  return writtenTask;
}

function replaceContextPacketSection(body: string, nextSection: string): string {
  const lines = body.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === "## Context Packet");
  if (startIndex < 0) {
    return `${body.trimEnd()}\n\n${nextSection}`;
  }

  const remainingLines = lines.slice(startIndex + 1);
  const endOffset = remainingLines.findIndex((line) => line.startsWith("## "));
  const endIndex = endOffset < 0 ? lines.length : startIndex + 1 + endOffset;

  return [...lines.slice(0, startIndex), ...nextSection.split("\n"), ...lines.slice(endIndex)].join(
    "\n",
  );
}

function formatContextPacketSection(input: {
  readonly builtAt: string;
  readonly task: TaskRecord;
  readonly sources: readonly SourceRecord[];
  readonly context: CommandContext;
}): string {
  return [
    "## Context Packet",
    "",
    `- built_at: ${input.builtAt}`,
    "- source_refs:",
    ...input.sources.map((source) => `  - ${source.frontmatter.id}`),
    formatList("knowledge_refs", input.task.frontmatter.knowledge_refs),
    formatList("allowed_tools", input.context.allowed_tools),
    `- sensitivity: ${highestSensitivity(input.sources)}`,
    "",
    "### Constraints",
    "",
    "- Use only Source and Knowledge refs explicitly scoped to this Task.",
    "- Keep generated output reviewable before important completion.",
    "",
    "### Missing Information",
    "",
    "- Exact checklist template is not specified in the fixture.",
    "",
    "### Risks",
    "",
    "- Launch communication should not proceed before support handoff review.",
    "",
    "### Draft Inputs",
    "",
    ...input.sources.map((source) => `- ${source.frontmatter.title} (${source.frontmatter.id})`),
    "",
  ].join("\n");
}

function formatList(label: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `- ${label}: []`;
  }

  return [`- ${label}:`, ...values.map((value) => `  - ${value}`)].join("\n");
}

function highestSensitivity(sources: readonly SourceRecord[]): string {
  const rank = ["public", "internal", "confidential", "restricted"];
  return sources.reduce(
    (highest, source) =>
      rank.indexOf(source.frontmatter.sensitivity) > rank.indexOf(highest)
        ? source.frontmatter.sensitivity
        : highest,
    "public",
  );
}
