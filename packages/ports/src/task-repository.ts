import type { TaskFrontmatter } from "../../../contracts/src/index.js";

export interface TaskRecord {
  readonly frontmatter: TaskFrontmatter;
  readonly body: string;
  readonly relativePath?: string;
}

export interface TaskRepository {
  writeTask(task: TaskRecord): Promise<TaskRecord>;
}
