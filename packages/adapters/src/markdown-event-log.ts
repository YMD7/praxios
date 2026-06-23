import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import { EventLogEntrySchema, type EventLogEntry } from "../../../contracts/src/index.js";
import type { EventLog } from "../../ports/src/index.js";

export class MarkdownEventLog implements EventLog {
  constructor(private readonly workspacePath: string) {}

  async append(entry: EventLogEntry): Promise<void> {
    const parsed = EventLogEntrySchema.parse(entry);
    await appendFile(join(this.workspacePath, "log.md"), formatEventLogEntry(parsed), "utf8");
  }
}

export function formatEventLogEntry(entry: EventLogEntry): string {
  return [
    "",
    `## ${formatScalar(entry.occurred_at)} - ${formatScalar(entry.command)}`,
    "",
    `- event_id: ${formatScalar(entry.event_id)}`,
    `- occurred_at: ${formatScalar(entry.occurred_at)}`,
    `- actor_id: ${formatScalar(entry.actor_id)}`,
    optionalScalar("agent_id", entry.agent_id),
    `- command: ${formatScalar(entry.command)}`,
    `- target: ${formatScalar(entry.target)}`,
    optionalScalar("task_ref", entry.task_ref),
    formatList("allowed_source_refs", entry.allowed_source_refs),
    formatList("allowed_knowledge_refs", entry.allowed_knowledge_refs),
    formatList("allowed_tools", entry.allowed_tools),
    formatList("approval_refs", entry.approval_refs),
    optionalScalar("previous_status", entry.previous_status),
    optionalScalar("new_status", entry.new_status),
    `- result: ${formatScalar(entry.result)}`,
    `- rationale: ${formatScalar(entry.rationale)}`,
    formatList("refs", entry.refs),
    "",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function optionalScalar(label: string, value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return `- ${label}: ${formatScalar(value)}`;
}

function formatList(label: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `- ${label}: []`;
  }

  return [`- ${label}:`, ...values.map((value) => `  - ${formatScalar(value)}`)].join("\n");
}

function formatScalar(value: string): string {
  return value.replace(/\r?\n/gu, " ").trim();
}
