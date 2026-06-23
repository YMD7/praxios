import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MarkdownEventLog, initializePlainFileWorkspace } from "../packages/adapters/src/index";
import type { CommandContext, EventLog } from "../packages/ports/src/index";

describe("markdown event log", () => {
  it("appends a validated event-like section to log.md", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-event-log-"));
    await initializePlainFileWorkspace(workspace);
    const eventLog: EventLog = new MarkdownEventLog(workspace);

    await eventLog.append({
      event_id: "event_0001",
      occurred_at: "2026-06-23T10:15:00+09:00",
      actor_id: "user",
      agent_id: "deterministic-agent",
      command: "CompleteTask",
      target: "task_0001",
      task_ref: "task_0001",
      allowed_source_refs: ["src_0001"],
      allowed_knowledge_refs: ["know_0001"],
      allowed_tools: ["deterministic-agent"],
      approval_refs: ["review_0001"],
      previous_status: "active",
      new_status: "completed",
      result: "succeeded",
      rationale: "Done criteria met.",
      refs: ["artifact_0001", "review_0001"],
    });

    await expect(readFile(join(workspace, "log.md"), "utf8")).resolves.toContain(
      [
        "## 2026-06-23T10:15:00+09:00 - CompleteTask",
        "",
        "- event_id: event_0001",
        "- occurred_at: 2026-06-23T10:15:00+09:00",
        "- actor_id: user",
        "- agent_id: deterministic-agent",
        "- command: CompleteTask",
        "- target: task_0001",
        "- task_ref: task_0001",
        "- allowed_source_refs:",
        "  - src_0001",
        "- allowed_knowledge_refs:",
        "  - know_0001",
        "- allowed_tools:",
        "  - deterministic-agent",
        "- approval_refs:",
        "  - review_0001",
        "- previous_status: active",
        "- new_status: completed",
        "- result: succeeded",
        "- rationale: Done criteria met.",
        "- refs:",
        "  - artifact_0001",
        "  - review_0001",
      ].join("\n"),
    );
  });

  it("rejects invalid event entries before appending", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "praxios-event-log-"));
    await initializePlainFileWorkspace(workspace);
    const eventLog: EventLog = new MarkdownEventLog(workspace);

    await expect(
      eventLog.append({
        event_id: "bad-event-id",
        occurred_at: "2026-06-23T10:15:00+09:00",
        actor_id: "user",
        command: "CompleteTask",
        target: "task_0001",
        allowed_source_refs: [],
        allowed_knowledge_refs: [],
        allowed_tools: [],
        approval_refs: [],
        result: "succeeded",
        rationale: "Done criteria met.",
        refs: [],
      }),
    ).rejects.toThrow();

    await expect(readFile(join(workspace, "log.md"), "utf8")).resolves.toBe("# Praxios Log\n\n");
  });

  it("allows application and fake agent calls to share CommandContext", async () => {
    const context: CommandContext = {
      actor_id: "user",
      agent_id: "deterministic-agent",
      command: "ExtractTaskCandidates",
      target: "src_0001",
      allowed_source_refs: ["src_0001"],
      allowed_knowledge_refs: [],
      allowed_tools: ["deterministic-agent"],
      approval_refs: [],
    };

    const fakeAgent = async (input: string, commandContext: CommandContext) => ({
      input,
      actor_id: commandContext.actor_id,
      agent_id: commandContext.agent_id,
      allowed_source_refs: commandContext.allowed_source_refs,
    });

    await expect(fakeAgent("meeting fixture", context)).resolves.toEqual({
      input: "meeting fixture",
      actor_id: "user",
      agent_id: "deterministic-agent",
      allowed_source_refs: ["src_0001"],
    });
  });
});
