import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TaskFrontmatterSchema } from "../../../contracts/src/index.js";
import type { TaskRecord, TaskRepository } from "../../ports/src/index.js";
import { buildMarkdownFileName, stringifyMarkdownFrontmatter } from "./markdown-frontmatter.js";

export class MarkdownTaskRepository implements TaskRepository {
  constructor(private readonly workspacePath: string) {}

  async writeTask(task: TaskRecord): Promise<TaskRecord> {
    return this.persistTask(task, "wx");
  }

  async updateTask(task: TaskRecord): Promise<TaskRecord> {
    return this.persistTask(task, "w");
  }

  private async persistTask(task: TaskRecord, flag: "w" | "wx"): Promise<TaskRecord> {
    const parsedFrontmatter = TaskFrontmatterSchema.parse(task.frontmatter);
    const relativePath =
      task.relativePath ??
      `tasks/${buildMarkdownFileName({
        id: parsedFrontmatter.id,
        title: parsedFrontmatter.title,
      })}`;

    await writeFile(
      join(this.workspacePath, relativePath),
      stringifyMarkdownFrontmatter({
        frontmatter: parsedFrontmatter,
        body: task.body,
      }),
      { encoding: "utf8", flag },
    );

    return {
      frontmatter: parsedFrontmatter,
      body: task.body,
      relativePath,
    };
  }
}
