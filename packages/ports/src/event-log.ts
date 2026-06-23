import type { EventLogEntry } from "../../../contracts/src/index.js";

export interface EventLog {
  append(entry: EventLogEntry): Promise<void>;
}
