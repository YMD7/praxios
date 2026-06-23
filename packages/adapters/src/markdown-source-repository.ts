import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { SourceFrontmatterSchema } from "../../../contracts/src/index.js";
import type { SourceRecord, SourceRepository } from "../../ports/src/index.js";
import {
  buildMarkdownFileName,
  parseMarkdownFrontmatter,
  stringifyMarkdownFrontmatter,
} from "./markdown-frontmatter.js";

export class MarkdownSourceRepository implements SourceRepository {
  constructor(private readonly workspacePath: string) {}

  async findByContentHash(contentHash: string): Promise<SourceRecord | undefined> {
    const sourcesPath = join(this.workspacePath, "sources");
    const fileNames = await readdir(sourcesPath);

    for (const fileName of fileNames) {
      if (!fileName.endsWith(".md")) {
        continue;
      }

      const relativePath = `sources/${fileName}`;
      const content = await readFile(join(sourcesPath, fileName), "utf8");
      const document = parseMarkdownFrontmatter(content, SourceFrontmatterSchema);

      if (document.frontmatter.content_hash === contentHash) {
        return {
          frontmatter: document.frontmatter,
          body: document.body,
          relativePath,
        };
      }
    }

    return undefined;
  }

  async writeSource(source: SourceRecord): Promise<SourceRecord> {
    const parsedFrontmatter = SourceFrontmatterSchema.parse(source.frontmatter);
    const fileName = buildMarkdownFileName({
      id: parsedFrontmatter.id,
      title: parsedFrontmatter.title,
    });
    const relativePath = `sources/${fileName}`;

    await writeFile(
      join(this.workspacePath, relativePath),
      stringifyMarkdownFrontmatter({
        frontmatter: parsedFrontmatter,
        body: source.body,
      }),
      { encoding: "utf8", flag: "wx" },
    );

    return {
      frontmatter: parsedFrontmatter,
      body: source.body,
      relativePath,
    };
  }
}
