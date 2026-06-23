import { describe, expect, it } from "vitest";

import {
  ArtifactFrontmatterSchema,
  EventLogEntrySchema,
  LintReportSchema,
  ReviewFrontmatterSchema,
  SourceFrontmatterSchema,
  SourceIdSchema,
  TaskCandidateSchema,
  TaskFrontmatterSchema,
} from "../contracts/src/index";

const now = "2026-06-23T00:00:00.000Z";
const sourceId = "src_01JZ8Q9K7M2V4X6P8N3R5T0A1B";
const knowledgeId = "know_01JZ8Q9M4A6C8D2E9F3G7H1J2K";
const taskId = "task_01JZ8QA2B9D4F6H8J1K3M5N7PA";
const artifactId = "artifact_01JZ8QB7C2E4G6J8K0M2P5R9SA";
const reviewId = "review_01JZ8QC1D3F5H7J9K2M4N6P8QA";
const eventId = "event_01JZ8QD4E6G8J0K2M4P6R8S1TA";

describe("contracts", () => {
  it("validates ID prefix and ref format", () => {
    expect(SourceIdSchema.safeParse(sourceId).success).toBe(true);
    expect(SourceIdSchema.safeParse(taskId).success).toBe(false);
    expect(SourceIdSchema.safeParse("src_not-a-valid-id").success).toBe(false);
  });

  it("validates Source frontmatter required fields and status enum", () => {
    const validSource = {
      id: sourceId,
      type: "source",
      title: "Synthetic meeting transcript",
      status: "captured",
      created: now,
      updated: now,
      origin: "fixture",
      observed_at: now,
      content_hash: "sha256:abc",
      sensitivity: "internal",
    };

    expect(SourceFrontmatterSchema.safeParse(validSource).success).toBe(true);
    expect(SourceFrontmatterSchema.safeParse({ ...validSource, status: "done" }).success).toBe(
      false,
    );
    expect(SourceFrontmatterSchema.safeParse({ ...validSource, content_hash: "" }).success).toBe(
      false,
    );
  });

  it("validates TaskCandidate structured output", () => {
    const result = TaskCandidateSchema.safeParse({
      key: "candidate-1",
      title: "Follow up on launch checklist",
      proposed_done_criteria: ["Send the checklist to the team."],
      source_refs: [sourceId],
      knowledge_refs: [knowledgeId],
      confidence: "medium",
      uncertainty: "Owner still needs confirmation.",
      extraction_rationale: "The transcript includes a follow-up commitment.",
    });

    expect(result.success).toBe(true);
    expect(
      TaskCandidateSchema.safeParse({
        key: "candidate-1",
        title: "Missing evidence",
        proposed_done_criteria: ["Do it."],
        source_refs: [],
        confidence: "medium",
        extraction_rationale: "No source.",
      }).success,
    ).toBe(false);
  });

  it("validates Task frontmatter without authorizing transitions", () => {
    const task = {
      id: taskId,
      type: "task",
      title: "Follow up on launch checklist",
      status: "completed",
      created: now,
      updated: now,
      trigger_refs: [artifactId],
      source_refs: [sourceId],
      knowledge_refs: [knowledgeId],
      done_criteria: ["Checklist sent."],
      review_required: true,
    };

    expect(TaskFrontmatterSchema.safeParse(task).success).toBe(true);
    expect(TaskFrontmatterSchema.safeParse({ ...task, done_criteria: [] }).success).toBe(false);
  });

  it("validates Artifact task_ref requirements by artifact kind", () => {
    const base = {
      id: artifactId,
      type: "artifact",
      title: "Extracted candidates",
      status: "draft",
      created: now,
      updated: now,
      source_refs: [sourceId],
      generated_by: "deterministic-agent",
      review_required: false,
    };

    expect(
      ArtifactFrontmatterSchema.safeParse({
        ...base,
        artifact_kind: "task_candidate_set",
      }).success,
    ).toBe(true);
    expect(
      ArtifactFrontmatterSchema.safeParse({
        ...base,
        artifact_kind: "task_candidate_set",
        task_ref: taskId,
      }).success,
    ).toBe(false);
    expect(
      ArtifactFrontmatterSchema.safeParse({
        ...base,
        artifact_kind: "artifact_draft",
      }).success,
    ).toBe(false);
    expect(
      ArtifactFrontmatterSchema.safeParse({
        ...base,
        artifact_kind: "artifact_draft",
        task_ref: taskId,
      }).success,
    ).toBe(true);
  });

  it("validates Review, EventLog, and Lint contracts", () => {
    expect(
      ReviewFrontmatterSchema.safeParse({
        id: reviewId,
        type: "review",
        title: "Review draft",
        status: "approved",
        created: now,
        updated: now,
        target_ref: artifactId,
        requested_by: "user",
        decision: "approved",
        rationale: "Draft is acceptable.",
        approval_scope: ["task_completion"],
      }).success,
    ).toBe(true);

    expect(
      EventLogEntrySchema.safeParse({
        event_id: eventId,
        occurred_at: now,
        actor_id: "user",
        agent_id: "deterministic-agent",
        command: "CompleteTask",
        target: taskId,
        task_ref: taskId,
        allowed_source_refs: [sourceId],
        allowed_knowledge_refs: [knowledgeId],
        allowed_tools: ["deterministic-agent"],
        approval_refs: [reviewId],
        previous_status: "active",
        new_status: "completed",
        result: "succeeded",
        rationale: "Done criteria met.",
        refs: [artifactId, reviewId],
      }).success,
    ).toBe(true);

    expect(
      LintReportSchema.safeParse({
        issues: [
          {
            severity: "high",
            code: "missing_frontmatter",
            message: "Frontmatter is missing.",
            target: "tasks/example.md",
            suggested_action: "Add required frontmatter.",
          },
        ],
      }).success,
    ).toBe(true);
  });
});
