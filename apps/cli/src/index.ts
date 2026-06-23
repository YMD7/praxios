#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import type { ApplicationError } from "../../../packages/application/src/index.js";
import {
  approveReview,
  buildContextPacket,
  captureFixtureSource,
  completeTask,
  confirmTask,
  extractTaskCandidates,
  generateArtifactDraft,
  lintWorkspace,
  proposeKnowledgeUpdate,
  requestReviewForArtifact,
} from "../../../packages/application/src/index.js";
import {
  DeterministicAgentAdapter,
  FileFixtureLoader,
  MarkdownArtifactRepository,
  MarkdownEventLog,
  MarkdownReviewRepository,
  MarkdownSourceRepository,
  MarkdownTaskRepository,
  MarkdownWorkspaceReader,
  SystemClock,
  UlidIdGenerator,
  initializePlainFileWorkspace,
} from "../../../packages/adapters/src/index.js";
import type {
  ArtifactRecord,
  CommandContext,
  ReviewRecord,
  SourceRecord,
  TaskRecord,
  WorkspaceSnapshot,
} from "../../../packages/ports/src/index.js";

export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface RunCliOptions {
  readonly cwd?: string;
  readonly repositoryPath?: string;
}

interface CliArguments {
  readonly command: string;
  readonly positional: readonly string[];
  readonly workspacePath: string;
  readonly repositoryPath: string;
}

export function formatCliError(error: Pick<ApplicationError, "code" | "message">): string {
  return `${error.code}: ${error.message}`;
}

export async function runCli(
  argv: readonly string[],
  options: RunCliOptions = {},
): Promise<CliResult> {
  try {
    const cwd = options.cwd ?? process.cwd();
    const args = parseArguments(argv, cwd, options.repositoryPath ?? cwd);
    const runtime = createRuntime(args.workspacePath, args.repositoryPath);
    const stdout = await runCommand(args, runtime);
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: formatUnknownError(error),
    };
  }
}

async function runCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<string> {
  switch (args.command) {
    case "init":
      return JSON.stringify(await initializePlainFileWorkspace(args.workspacePath), null, 2);
    case "load-fixture":
      return JSON.stringify(await loadFixture(args, runtime), null, 2);
    case "extract-task-candidates":
      return JSON.stringify(await extractCandidates(args, runtime), null, 2);
    case "confirm-task":
      return JSON.stringify(await confirmTaskCommand(args, runtime), null, 2);
    case "build-context":
      return JSON.stringify(await buildContextCommand(args, runtime), null, 2);
    case "draft-artifact":
      return JSON.stringify(await draftArtifactCommand(args, runtime), null, 2);
    case "request-review":
      return JSON.stringify(await requestReviewCommand(args, runtime), null, 2);
    case "approve-review":
      return JSON.stringify(await approveReviewCommand(args, runtime), null, 2);
    case "complete-task":
      return JSON.stringify(await completeTaskCommand(args, runtime), null, 2);
    case "propose-learning":
      return JSON.stringify(await proposeLearningCommand(args, runtime), null, 2);
    case "lint":
      return JSON.stringify(await lintCommand(args, runtime), null, 2);
    default:
      throw new CliUsageError(`Unknown command: ${args.command}`);
  }
}

function createRuntime(workspacePath: string, repositoryPath: string) {
  return {
    agentGateway: new DeterministicAgentAdapter(repositoryPath),
    artifactRepository: new MarkdownArtifactRepository(workspacePath),
    clock: new SystemClock(),
    eventLog: new MarkdownEventLog(workspacePath),
    fixtureLoader: new FileFixtureLoader(repositoryPath),
    idGenerator: new UlidIdGenerator(),
    reviewRepository: new MarkdownReviewRepository(workspacePath),
    sourceRepository: new MarkdownSourceRepository(workspacePath),
    taskRepository: new MarkdownTaskRepository(workspacePath),
    workspaceReader: new MarkdownWorkspaceReader(workspacePath),
  };
}

async function loadFixture(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const fixtureName = requirePositional(args, 0, "fixture name");
  const result = await captureFixtureSource(
    {
      fixtureName,
      context: createContext({
        command: "CaptureSource",
        target: `fixture:${fixtureName}`,
      }),
    },
    runtime,
  );
  return result.source.frontmatter;
}

async function extractCandidates(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const sourceId = requirePositional(args, 0, "source id");
  const fixtureName = args.positional[1] ?? "product-launch-sync";
  const snapshot = await runtime.workspaceReader.readWorkspace();
  const source = findSource(snapshot, sourceId);
  const artifact = await extractTaskCandidates(
    {
      fixtureName,
      source,
      context: createContext({
        agent: true,
        command: "ExtractTaskCandidates",
        target: source.frontmatter.id,
        sourceRefs: [source.frontmatter.id],
      }),
    },
    runtime,
  );
  return artifact.frontmatter;
}

async function confirmTaskCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const artifactId = requirePositional(args, 0, "task candidate Artifact id");
  const candidateKey = args.positional[1] ?? "candidate-1";
  const artifact = findArtifact(await runtime.workspaceReader.readWorkspace(), artifactId);
  const task = await confirmTask(
    {
      candidateSetArtifact: artifact,
      candidateKey,
      context: createContext({
        command: "ConfirmTask",
        target: `${artifact.frontmatter.id}#${candidateKey}`,
        sourceRefs: artifact.frontmatter.source_refs,
      }),
    },
    runtime,
  );
  return task.frontmatter;
}

async function buildContextCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const taskId = requirePositional(args, 0, "task id");
  const snapshot = await runtime.workspaceReader.readWorkspace();
  const task = findTask(snapshot, taskId);
  const taskWithContext = await buildContextPacket(
    {
      task,
      availableSources: findSources(snapshot, task.frontmatter.source_refs),
      context: createContext({
        agent: true,
        command: "BuildContextPacket",
        target: task.frontmatter.id,
        taskRef: task.frontmatter.id,
        sourceRefs: task.frontmatter.source_refs,
      }),
    },
    runtime,
  );
  return taskWithContext.frontmatter;
}

async function draftArtifactCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const task = findTask(await runtime.workspaceReader.readWorkspace(), requirePositional(args, 0, "task id"));
  const artifact = await generateArtifactDraft(
    {
      task,
      context: createContext({
        agent: true,
        command: "GenerateArtifactDraft",
        target: task.frontmatter.id,
        taskRef: task.frontmatter.id,
        sourceRefs: task.frontmatter.source_refs,
      }),
    },
    runtime,
  );
  return artifact.frontmatter;
}

async function requestReviewCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const snapshot = await runtime.workspaceReader.readWorkspace();
  const artifact = findArtifact(snapshot, requirePositional(args, 0, "artifact id"));
  const review = await requestReviewForArtifact(
    {
      artifact,
      context: createContext({
        command: "RequestReview",
        target: artifact.frontmatter.id,
        taskRef: "task_ref" in artifact.frontmatter ? artifact.frontmatter.task_ref : undefined,
        sourceRefs: artifact.frontmatter.source_refs,
      }),
    },
    runtime,
  );
  return review.frontmatter;
}

async function approveReviewCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const review = findReview(await runtime.workspaceReader.readWorkspace(), requirePositional(args, 0, "review id"));
  const approvedReview = await approveReview(
    {
      review,
      rationale: args.positional[1] ?? "Approved from CLI.",
      context: createContext({
        command: "ApproveReview",
        target: review.frontmatter.id,
      }),
    },
    runtime,
  );
  return approvedReview.frontmatter;
}

async function completeTaskCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const snapshot = await runtime.workspaceReader.readWorkspace();
  const task = findTask(snapshot, requirePositional(args, 0, "task id"));
  const completionArtifactId = args.positional[1];
  const completionArtifact =
    completionArtifactId === undefined ? undefined : findArtifact(snapshot, completionArtifactId);
  const completedTask = await completeTask(
    {
      task,
      completionArtifact,
      context: createContext({
        command: "CompleteTask",
        target: task.frontmatter.id,
        taskRef: task.frontmatter.id,
        sourceRefs: task.frontmatter.source_refs,
      }),
      reviews: findReviews(snapshot),
    },
    runtime,
  );
  return completedTask.frontmatter;
}

async function proposeLearningCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  const task = findTask(await runtime.workspaceReader.readWorkspace(), requirePositional(args, 0, "task id"));
  const proposal = await proposeKnowledgeUpdate(
    {
      task,
      context: createContext({
        agent: true,
        command: "ProposeKnowledgeUpdate",
        target: task.frontmatter.id,
        taskRef: task.frontmatter.id,
        sourceRefs: task.frontmatter.source_refs,
      }),
    },
    runtime,
  );
  return proposal.frontmatter;
}

async function lintCommand(
  args: CliArguments,
  runtime: ReturnType<typeof createRuntime>,
): Promise<unknown> {
  return lintWorkspace(
    {
      snapshot: await runtime.workspaceReader.readWorkspace(),
      context: createContext({
        command: "LintWorkspace",
        target: args.workspacePath,
      }),
    },
    runtime,
  );
}

function parseArguments(
  argv: readonly string[],
  cwd: string,
  repositoryPath: string,
): CliArguments {
  const values = [...argv];
  const command = values.shift();
  if (command === undefined) {
    throw new CliUsageError("Command is required.");
  }

  let workspacePath = cwd;
  const positional: string[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--workspace") {
      workspacePath = values[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (value === "--repository") {
      repositoryPath = values[index + 1] ?? "";
      index += 1;
      continue;
    }

    positional.push(value);
  }

  if (workspacePath.length === 0 || repositoryPath.length === 0) {
    throw new CliUsageError("--workspace and --repository require values.");
  }

  return { command, positional, workspacePath, repositoryPath };
}

function createContext(input: {
  readonly command: string;
  readonly target: string;
  readonly agent?: boolean;
  readonly taskRef?: string;
  readonly sourceRefs?: readonly string[];
}): CommandContext {
  return {
    actor_id: "user",
    agent_id: input.agent ? "deterministic-agent" : undefined,
    command: input.command,
    target: input.target,
    task_ref: input.taskRef,
    allowed_source_refs: [...(input.sourceRefs ?? [])],
    allowed_knowledge_refs: [],
    allowed_tools: input.agent ? ["deterministic-agent"] : [],
    approval_refs: [],
  };
}

function findSource(snapshot: WorkspaceSnapshot, id: string): SourceRecord {
  const file = snapshot.files.find(
    (candidate) => candidate.frontmatter?.type === "source" && candidate.frontmatter.id === id,
  );
  if (file?.frontmatter?.type !== "source" || file.body === undefined) {
    throw new CliUsageError(`Source not found: ${id}`);
  }

  return {
    frontmatter: file.frontmatter,
    body: file.body,
    relativePath: file.relativePath,
  };
}

function findSources(snapshot: WorkspaceSnapshot, ids: readonly string[]): SourceRecord[] {
  return ids.map((id) => findSource(snapshot, id));
}

function findTask(snapshot: WorkspaceSnapshot, id: string): TaskRecord {
  const file = snapshot.files.find(
    (candidate) => candidate.frontmatter?.type === "task" && candidate.frontmatter.id === id,
  );
  if (file?.frontmatter?.type !== "task" || file.body === undefined) {
    throw new CliUsageError(`Task not found: ${id}`);
  }

  return {
    frontmatter: file.frontmatter,
    body: file.body,
    relativePath: file.relativePath,
  };
}

function findArtifact(snapshot: WorkspaceSnapshot, id: string): ArtifactRecord {
  const file = snapshot.files.find(
    (candidate) => candidate.frontmatter?.type === "artifact" && candidate.frontmatter.id === id,
  );
  if (file?.frontmatter?.type !== "artifact" || file.body === undefined) {
    throw new CliUsageError(`Artifact not found: ${id}`);
  }

  return {
    frontmatter: file.frontmatter,
    body: file.body,
    relativePath: file.relativePath,
  };
}

function findReview(snapshot: WorkspaceSnapshot, id: string): ReviewRecord {
  const file = snapshot.files.find(
    (candidate) => candidate.frontmatter?.type === "review" && candidate.frontmatter.id === id,
  );
  if (file?.frontmatter?.type !== "review" || file.body === undefined) {
    throw new CliUsageError(`Review not found: ${id}`);
  }

  return {
    frontmatter: file.frontmatter,
    body: file.body,
    relativePath: file.relativePath,
  };
}

function findReviews(snapshot: WorkspaceSnapshot): ReviewRecord[] {
  return snapshot.files.flatMap((file) => {
    if (file.frontmatter?.type !== "review" || file.body === undefined) {
      return [];
    }

    return [
      {
        frontmatter: file.frontmatter,
        body: file.body,
        relativePath: file.relativePath,
      },
    ];
  });
}

function requirePositional(args: CliArguments, index: number, label: string): string {
  const value = args.positional[index];
  if (value === undefined || value.trim().length === 0) {
    throw new CliUsageError(`Missing ${label}.`);
  }

  return value;
}

function formatUnknownError(error: unknown): string {
  if (isApplicationError(error)) {
    return formatCliError(error);
  }

  if (error instanceof CliUsageError) {
    return `usage_error: ${error.message}`;
  }

  if (error instanceof Error) {
    return `unexpected_error: ${error.message}`;
  }

  return "unexpected_error: Unknown failure.";
}

function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}

class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runCli(process.argv.slice(2));
  if (result.stdout.length > 0) {
    process.stdout.write(`${result.stdout}\n`);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(`${result.stderr}\n`);
  }
  process.exitCode = result.exitCode;
}
