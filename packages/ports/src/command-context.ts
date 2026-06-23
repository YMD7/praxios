import type { EventLogEntry } from "../../../contracts/src/index.js";

export type CommandContext = Pick<
  EventLogEntry,
  | "actor_id"
  | "agent_id"
  | "command"
  | "target"
  | "task_ref"
  | "allowed_source_refs"
  | "allowed_knowledge_refs"
  | "allowed_tools"
  | "approval_refs"
>;
