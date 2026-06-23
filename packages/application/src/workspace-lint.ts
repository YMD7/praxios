import type { LintIssue, LintReport } from "../../../contracts/src/index.js";
import type {
  ArtifactFrontmatter,
  ReviewFrontmatter,
  SourceFrontmatter,
  TaskFrontmatter,
} from "../../../contracts/src/index.js";
import type {
  Clock,
  CommandContext,
  EventLog,
  IdGenerator,
  WorkspaceFile,
  WorkspaceRecordKind,
  WorkspaceSnapshot,
} from "../../ports/src/index.js";

export interface LintWorkspaceInput {
  readonly snapshot: WorkspaceSnapshot;
  readonly context: CommandContext;
}

export interface LintWorkspaceDependencies {
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly idGenerator: IdGenerator;
}

type RecordFrontmatter =
  | SourceFrontmatter
  | TaskFrontmatter
  | ArtifactFrontmatter
  | ReviewFrontmatter;

const VALID_STATUS: Record<WorkspaceRecordKind, readonly string[]> = {
  source: ["captured", "processed", "archived"],
  task: ["active", "blocked", "completed", "canceled"],
  artifact: ["draft", "proposed", "approved", "rejected", "archived"],
  review: ["requested", "approved", "rejected", "changes_requested", "canceled"],
};

const EXPECTED_TYPE: Record<WorkspaceRecordKind, string> = {
  source: "source",
  task: "task",
  artifact: "artifact",
  review: "review",
};

const EXPECTED_PREFIX: Record<WorkspaceRecordKind, string> = {
  source: "src_",
  task: "task_",
  artifact: "artifact_",
  review: "review_",
};

export async function lintWorkspace(
  input: LintWorkspaceInput,
  dependencies: LintWorkspaceDependencies,
): Promise<LintReport> {
  const issues = collectLintIssues(input.snapshot);
  const report: LintReport = { issues };
  const hasHighSeverityIssue = issues.some((issue) => issue.severity === "high");

  await dependencies.eventLog.append({
    event_id: dependencies.idGenerator.generate("event_"),
    occurred_at: dependencies.clock.now().toISOString(),
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: input.context.target,
    task_ref: input.context.task_ref,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: input.context.approval_refs,
    result: hasHighSeverityIssue ? "failed" : "succeeded",
    rationale: hasHighSeverityIssue
      ? "Workspace lint found high-severity issues."
      : "Workspace lint completed without high-severity issues.",
    refs: ["workspace"],
  });

  return report;
}

function collectLintIssues(snapshot: WorkspaceSnapshot): LintIssue[] {
  const issues: LintIssue[] = [];
  const validRecords = snapshot.files.flatMap((file) => recordFromFile(file));
  const ids = new Map<string, WorkspaceFile[]>();

  for (const file of snapshot.files) {
    issues.push(...lintFrontmatter(file));
    issues.push(...lintRawShape(file));

    const id = stringField(file.rawFrontmatter, "id");
    if (id !== undefined) {
      ids.set(id, [...(ids.get(id) ?? []), file]);
    }
  }

  for (const [id, files] of ids.entries()) {
    if (files.length > 1) {
      issues.push({
        severity: "high",
        code: "duplicate_id",
        message: `ID is used by ${files.length} workspace files.`,
        target: id,
        suggested_action: "Assign stable unique IDs to each record.",
      });
    }
  }

  const existingIds = new Set(validRecords.map((record) => record.frontmatter.id));
  for (const record of validRecords) {
    issues.push(...lintReferences(record, existingIds));
  }

  issues.push(...lintTaskCompletionApproval(validRecords));
  issues.push(...lintEventLog(snapshot.logContent));

  return issues;
}

function recordFromFile(
  file: WorkspaceFile,
): Array<{ readonly kind: WorkspaceRecordKind; readonly frontmatter: RecordFrontmatter }> {
  if (file.frontmatter === undefined) {
    return [];
  }

  return [{ kind: file.kind, frontmatter: file.frontmatter }];
}

function lintFrontmatter(file: WorkspaceFile): LintIssue[] {
  if (file.validationError === undefined) {
    return [];
  }

  const hasRawFrontmatter = file.rawFrontmatter !== undefined;
  return [
    {
      severity: "high",
      code: hasRawFrontmatter ? "invalid_frontmatter" : "missing_frontmatter",
      message: file.validationError,
      target: file.relativePath,
      suggested_action: "Fix the YAML frontmatter so it matches the record contract.",
    },
  ];
}

function lintRawShape(file: WorkspaceFile): LintIssue[] {
  const issues: LintIssue[] = [];
  const rawId = stringField(file.rawFrontmatter, "id");
  const rawType = stringField(file.rawFrontmatter, "type");
  const rawStatus = stringField(file.rawFrontmatter, "status");

  if (rawId !== undefined && !rawId.startsWith(EXPECTED_PREFIX[file.kind])) {
    issues.push({
      severity: "high",
      code: "invalid_id_prefix",
      message: `Expected ${file.kind} ID to start with ${EXPECTED_PREFIX[file.kind]}.`,
      target: file.relativePath,
      suggested_action: "Use the ID prefix assigned to this record directory.",
    });
  }

  if (rawType !== undefined && rawType !== EXPECTED_TYPE[file.kind]) {
    issues.push({
      severity: "high",
      code: "directory_type_mismatch",
      message: `Expected type ${EXPECTED_TYPE[file.kind]} for ${file.relativePath}.`,
      target: file.relativePath,
      suggested_action: "Move the file to the matching directory or fix its type field.",
    });
  }

  if (rawStatus !== undefined && !VALID_STATUS[file.kind].includes(rawStatus)) {
    issues.push({
      severity: "high",
      code: "invalid_status",
      message: `Status ${rawStatus} is not valid for ${file.kind}.`,
      target: file.relativePath,
      suggested_action: "Use a status allowed by the record contract.",
    });
  }

  for (const artifactRef of rawArtifactRefsInSourceRefs(file.rawFrontmatter)) {
    issues.push({
      severity: "high",
      code: "artifact_as_source",
      message: "Generated Artifact ref is used where Source evidence is required.",
      target: artifactRef,
      suggested_action: "Replace Artifact refs in source_refs with original Source refs.",
    });
  }

  return issues;
}

function lintReferences(
  record: { readonly kind: WorkspaceRecordKind; readonly frontmatter: RecordFrontmatter },
  existingIds: ReadonlySet<string>,
): LintIssue[] {
  const refs = refsForRecord(record.frontmatter);
  return refs
    .filter((ref) => !existingIds.has(ref))
    .map((ref) => ({
      severity: "high",
      code: "missing_reference",
      message: `Referenced record ${ref} does not exist in the workspace snapshot.`,
      target: record.frontmatter.id,
      suggested_action: "Import or create the referenced record, or remove the stale ref.",
    }));
}

function refsForRecord(frontmatter: RecordFrontmatter): string[] {
  if (frontmatter.type === "source") {
    return [];
  }

  if (frontmatter.type === "task") {
    return [
      ...frontmatter.trigger_refs,
      ...frontmatter.source_refs,
      ...frontmatter.knowledge_refs,
    ];
  }

  if (frontmatter.type === "artifact") {
    return [
      ...frontmatter.source_refs,
      ...("task_ref" in frontmatter && frontmatter.task_ref !== undefined
        ? [frontmatter.task_ref]
        : []),
    ];
  }

  return [frontmatter.target_ref];
}

function lintTaskCompletionApproval(
  records: ReadonlyArray<{
    readonly kind: WorkspaceRecordKind;
    readonly frontmatter: RecordFrontmatter;
  }>,
): LintIssue[] {
  const artifactsByTask = new Map<string, string[]>();
  const approvedReviews = records
    .map((record) => record.frontmatter)
    .filter((frontmatter): frontmatter is ReviewFrontmatter => frontmatter.type === "review")
    .filter(
      (review) =>
        review.status === "approved" &&
        review.decision === "approved" &&
        review.approval_scope.includes("task_completion"),
    );

  for (const artifact of records
    .map((record) => record.frontmatter)
    .filter((frontmatter): frontmatter is ArtifactFrontmatter => frontmatter.type === "artifact")) {
    if ("task_ref" in artifact && artifact.task_ref !== undefined) {
      artifactsByTask.set(artifact.task_ref, [
        ...(artifactsByTask.get(artifact.task_ref) ?? []),
        artifact.id,
      ]);
    }
  }

  return records
    .map((record) => record.frontmatter)
    .filter((frontmatter): frontmatter is TaskFrontmatter => frontmatter.type === "task")
    .filter((task) => task.status === "completed" && task.review_required)
    .filter((task) => {
      const validTargets = new Set([task.id, ...(artifactsByTask.get(task.id) ?? [])]);
      return !approvedReviews.some((review) => validTargets.has(review.target_ref));
    })
    .map((task) => ({
      severity: "high",
      code: "completion_without_approval",
      message: "Completed review-required Task has no matching task_completion approval.",
      target: task.id,
      suggested_action: "Approve a Review targeting the Task or completion Artifact.",
    }));
}

function lintEventLog(logContent: string | undefined): LintIssue[] {
  if (logContent === undefined) {
    return [
      {
        severity: "high",
        code: "missing_log",
        message: "Workspace log.md is missing.",
        target: "log.md",
        suggested_action: "Initialize the workspace or restore log.md.",
      },
    ];
  }

  const issues: LintIssue[] = [];
  const sections = logContent.split(/\n## /u).slice(1);
  for (const section of sections) {
    const command = section.match(/\n- command: ([^\n]+)/u)?.[1]?.trim();
    if (command === undefined) {
      continue;
    }

    const missingFields = ["event_id", "actor_id", "target", "result", "rationale"].filter(
      (field) => !section.includes(`- ${field}:`),
    );

    if (missingFields.length > 0) {
      issues.push({
        severity: "medium",
        code: "invalid_log_entry",
        message: `Log entry for ${command} is missing ${missingFields.join(", ")}.`,
        target: "log.md",
        suggested_action: "Rewrite the log entry through the EventLog adapter.",
      });
    }
  }

  return issues;
}

function rawArtifactRefsInSourceRefs(rawFrontmatter: unknown): string[] {
  const sourceRefs = arrayField(rawFrontmatter, "source_refs");
  return sourceRefs.filter((ref) => ref.startsWith("artifact_"));
}

function stringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldValue = value[field];
  return typeof fieldValue === "string" ? fieldValue : undefined;
}

function arrayField(value: unknown, field: string): string[] {
  if (!isRecord(value)) {
    return [];
  }

  const fieldValue = value[field];
  if (!Array.isArray(fieldValue)) {
    return [];
  }

  return fieldValue.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
