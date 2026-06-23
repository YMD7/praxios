import type {
  ArtifactRecord,
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  ReviewRecord,
  ReviewRepository,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

export interface RequestReviewInput {
  readonly artifact: ArtifactRecord;
  readonly context: CommandContext;
}

export interface ApproveReviewInput {
  readonly review: ReviewRecord;
  readonly rationale: string;
  readonly context: CommandContext;
}

export interface ReviewWorkflowDependencies {
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
  readonly reviewRepository: ReviewRepository;
}

export async function requestReviewForArtifact(
  input: RequestReviewInput,
  dependencies: ReviewWorkflowDependencies,
): Promise<ReviewRecord> {
  if (input.artifact.frontmatter.artifact_kind !== "artifact_draft") {
    throw new ApplicationError({
      code: "invalid_transition",
      message: "Only Artifact drafts can request this review workflow.",
      target: input.artifact.frontmatter.id,
    });
  }

  const now = dependencies.clock.now().toISOString();
  const review: ReviewRecord = {
    frontmatter: {
      id: dependencies.idGenerator.generate("review_"),
      type: "review",
      title: `Review ${input.artifact.frontmatter.title}`,
      status: "requested",
      created: now,
      updated: now,
      target_ref: input.artifact.frontmatter.id,
      requested_by: input.context.actor_id,
      decision: "pending",
      rationale: "Review requested before important Task completion.",
      approval_scope: ["artifact_review", "task_completion"],
    },
    body: formatReviewBody(input.artifact.frontmatter.id, "pending"),
  };

  const writtenReview = await dependencies.reviewRepository.writeReview(review);

  await dependencies.eventLog.append({
    event_id: dependencies.idGenerator.generate("event_"),
    occurred_at: dependencies.clock.now().toISOString(),
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: writtenReview.frontmatter.id,
    task_ref: input.context.task_ref,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: input.context.approval_refs,
    new_status: writtenReview.frontmatter.status,
    result: "succeeded",
    rationale: "Requested human review for generated Artifact draft.",
    refs: [input.artifact.frontmatter.id, writtenReview.frontmatter.id],
  });

  return writtenReview;
}

export async function approveReview(
  input: ApproveReviewInput,
  dependencies: ReviewWorkflowDependencies,
): Promise<ReviewRecord> {
  if (input.review.frontmatter.status !== "requested") {
    throw new ApplicationError({
      code: "invalid_transition",
      message: "Only requested Reviews can be approved.",
      target: input.review.frontmatter.id,
    });
  }

  const now = dependencies.clock.now().toISOString();
  const approvedReview: ReviewRecord = {
    ...input.review,
    frontmatter: {
      ...input.review.frontmatter,
      status: "approved",
      updated: now,
      decision: "approved",
      rationale: input.rationale,
    },
    body: formatReviewBody(input.review.frontmatter.target_ref, "approved", input.rationale),
  };

  const writtenReview = await dependencies.reviewRepository.updateReview(approvedReview);

  await dependencies.eventLog.append({
    event_id: dependencies.idGenerator.generate("event_"),
    occurred_at: dependencies.clock.now().toISOString(),
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: writtenReview.frontmatter.id,
    task_ref: input.context.task_ref,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: [writtenReview.frontmatter.id, ...input.context.approval_refs],
    previous_status: input.review.frontmatter.status,
    new_status: writtenReview.frontmatter.status,
    result: "succeeded",
    rationale: input.rationale,
    refs: [writtenReview.frontmatter.target_ref, writtenReview.frontmatter.id],
  });

  return writtenReview;
}

function formatReviewBody(targetRef: string, decision: string, rationale?: string): string {
  return [
    `# Review for ${targetRef}`,
    "",
    "## Target",
    "",
    `- target_ref: ${targetRef}`,
    "",
    "## Decision",
    "",
    `- decision: ${decision}`,
    "",
    "## Rationale",
    "",
    rationale ?? "Pending human review.",
    "",
  ].join("\n");
}
