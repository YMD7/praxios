import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ArtifactFrontmatterSchema } from "../../../contracts/src/index.js";
import type { ArtifactRecord, ArtifactRepository } from "../../ports/src/index.js";
import { buildMarkdownFileName, stringifyMarkdownFrontmatter } from "./markdown-frontmatter.js";

export class MarkdownArtifactRepository implements ArtifactRepository {
  constructor(private readonly workspacePath: string) {}

  async writeArtifact(artifact: ArtifactRecord): Promise<ArtifactRecord> {
    const parsedFrontmatter = ArtifactFrontmatterSchema.parse(artifact.frontmatter);
    const fileName = buildMarkdownFileName({
      id: parsedFrontmatter.id,
      title: parsedFrontmatter.title,
    });
    const relativePath = `artifacts/${fileName}`;

    await writeFile(
      join(this.workspacePath, relativePath),
      stringifyMarkdownFrontmatter({
        frontmatter: parsedFrontmatter,
        body: artifact.body,
      }),
      { encoding: "utf8", flag: "wx" },
    );

    return {
      frontmatter: parsedFrontmatter,
      body: artifact.body,
      relativePath,
    };
  }
}
