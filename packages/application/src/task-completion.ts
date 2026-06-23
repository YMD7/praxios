import type {
  ArtifactRecord,
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  ReviewRecord,
  TaskRecord,
  TaskRepository,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

export interface CompleteTaskInput {
  readonly task: TaskRecord;
  readonly reviews: readonly ReviewRecord[];
  readonly completionArtifact?: ArtifactRecord;
  readonly context: CommandContext;
}

export interface CompleteTaskDependencies {
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
  readonly taskRepository: TaskRepository;
}

export async function completeTask(
  input: CompleteTaskInput,
  dependencies: CompleteTaskDependencies,
): Promise<TaskRecord> {
  if (input.task.frontmatter.status !== "active" && input.task.frontmatter.status !== "blocked") {
    throw new ApplicationError({
      code: "invalid_transition",
      message: "Only active or blocked Tasks can be completed.",
      target: input.task.frontmatter.id,
    });
  }

  const approval = findTaskCompletionApproval(input);
  if (approval === undefined) {
    throw new ApplicationError({
      code: "approval_required",
      message:
        "Task completion requires an approved Review targeting the Task or completion Artifact with task_completion scope.",
      target: input.task.frontmatter.id,
    });
  }

  const now = dependencies.clock.now().toISOString();
  const completedTask: TaskRecord = {
    ...input.task,
    frontmatter: {
      ...input.task.frontmatter,
      status: "completed",
      updated: now,
    },
    body: replaceResultSection(input.task.body),
  };

  const writtenTask = await dependencies.taskRepository.updateTask(completedTask);

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
    approval_refs: [approval.frontmatter.id, ...input.context.approval_refs],
    previous_status: input.task.frontmatter.status,
    new_status: writtenTask.frontmatter.status,
    result: "succeeded",
    rationale: "Completed Task after matching task_completion approval.",
    refs: [
      writtenTask.frontmatter.id,
      approval.frontmatter.id,
      ...(input.completionArtifact === undefined ? [] : [input.completionArtifact.frontmatter.id]),
    ],
  });

  return writtenTask;
}

function findTaskCompletionApproval(input: CompleteTaskInput): ReviewRecord | undefined {
  const validTargets = new Set([
    input.task.frontmatter.id,
    ...(input.completionArtifact === undefined ? [] : [input.completionArtifact.frontmatter.id]),
  ]);

  return input.reviews.find(
    (review) =>
      review.frontmatter.status === "approved" &&
      review.frontmatter.decision === "approved" &&
      validTargets.has(review.frontmatter.target_ref) &&
      review.frontmatter.approval_scope.includes("task_completion"),
  );
}

function replaceResultSection(body: string): string {
  const nextSection = ["## Result", "", "- status: completed", ""].join("\n");
  const lines = body.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === "## Result");
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
