import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TaskFrontmatterSchema } from "../../../contracts/src/index.js";
import type { TaskRecord, TaskRepository } from "../../ports/src/index.js";
import { buildMarkdownFileName, stringifyMarkdownFrontmatter } from "./markdown-frontmatter.js";

export class MarkdownTaskRepository implements TaskRepository {
  constructor(private readonly workspacePath: string) {}

  async writeTask(task: TaskRecord): Promise<TaskRecord> {
    const parsedFrontmatter = TaskFrontmatterSchema.parse(task.frontmatter);
    const fileName = buildMarkdownFileName({
      id: parsedFrontmatter.id,
      title: parsedFrontmatter.title,
    });
    const relativePath = `tasks/${fileName}`;

    await writeFile(
      join(this.workspacePath, relativePath),
      stringifyMarkdownFrontmatter({
        frontmatter: parsedFrontmatter,
        body: task.body,
      }),
      { encoding: "utf8", flag: "wx" },
    );

    return {
      frontmatter: parsedFrontmatter,
      body: task.body,
      relativePath,
    };
  }
}
