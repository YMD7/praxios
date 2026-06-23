import { createHash } from "node:crypto";

import type {
  Clock,
  CommandContext,
  EventLog,
  FixtureLoader,
  IdGenerator,
  SourceRecord,
  SourceRepository,
} from "../../ports/src/index.js";
import { ApplicationError } from "./errors.js";

export interface CaptureFixtureSourceInput {
  readonly fixtureName: string;
  readonly context: CommandContext;
}

export interface CaptureFixtureSourceDependencies {
  readonly clock: Clock;
  readonly eventLog: EventLog;
  readonly fixtureLoader: FixtureLoader;
  readonly idGenerator: IdGenerator;
  readonly sourceRepository: SourceRepository;
}

export interface CaptureFixtureSourceResult {
  readonly source: SourceRecord;
  readonly created: boolean;
}

export async function captureFixtureSource(
  input: CaptureFixtureSourceInput,
  dependencies: CaptureFixtureSourceDependencies,
): Promise<CaptureFixtureSourceResult> {
  let fixture;
  try {
    fixture = await dependencies.fixtureLoader.loadMeetingTranscript(input.fixtureName);
  } catch (error) {
    throw new ApplicationError({
      code: "fixture_not_found",
      message: `Meeting transcript fixture was not found: ${input.fixtureName}`,
      target: input.fixtureName,
      cause: error,
    });
  }

  const contentHash = createContentHash(fixture.body);
  const existingSource = await dependencies.sourceRepository.findByContentHash(contentHash);

  if (existingSource !== undefined) {
    await appendSourceCapturedEvent({
      source: existingSource,
      created: false,
      context: input.context,
      dependencies,
    });
    return { source: existingSource, created: false };
  }

  const now = dependencies.clock.now().toISOString();
  const source: SourceRecord = {
    frontmatter: {
      id: dependencies.idGenerator.generate("src_"),
      type: "source",
      title: fixture.title,
      status: "captured",
      created: now,
      updated: now,
      origin: fixture.origin,
      observed_at: fixture.observed_at,
      content_hash: contentHash,
      sensitivity: fixture.sensitivity,
    },
    body: fixture.body,
  };

  const writtenSource = await dependencies.sourceRepository.writeSource(source);
  await appendSourceCapturedEvent({
    source: writtenSource,
    created: true,
    context: input.context,
    dependencies,
  });

  return { source: writtenSource, created: true };
}

function createContentHash(content: string): string {
  return `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;
}

async function appendSourceCapturedEvent(input: {
  readonly source: SourceRecord;
  readonly created: boolean;
  readonly context: CommandContext;
  readonly dependencies: CaptureFixtureSourceDependencies;
}): Promise<void> {
  const occurredAt = input.dependencies.clock.now().toISOString();

  await input.dependencies.eventLog.append({
    event_id: input.dependencies.idGenerator.generate("event_"),
    occurred_at: occurredAt,
    actor_id: input.context.actor_id,
    agent_id: input.context.agent_id,
    command: input.context.command,
    target: input.source.frontmatter.id,
    task_ref: input.context.task_ref,
    allowed_source_refs: input.context.allowed_source_refs,
    allowed_knowledge_refs: input.context.allowed_knowledge_refs,
    allowed_tools: input.context.allowed_tools,
    approval_refs: input.context.approval_refs,
    new_status: input.source.frontmatter.status,
    result: "succeeded",
    rationale: input.created
      ? "Captured synthetic meeting transcript fixture as a Source."
      : "Synthetic meeting transcript fixture was already captured; reused existing Source.",
    refs: [input.source.frontmatter.id],
  });
}
