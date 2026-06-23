import type { ArtifactFrontmatter } from "../../../contracts/src/index.js";

export interface ArtifactRecord {
  readonly frontmatter: ArtifactFrontmatter;
  readonly body: string;
  readonly relativePath?: string;
}

export interface ArtifactRepository {
  writeArtifact(artifact: ArtifactRecord): Promise<ArtifactRecord>;
}
