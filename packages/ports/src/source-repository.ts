import type { SourceFrontmatter } from "../../../contracts/src/index.js";

export interface SourceRecord {
  readonly frontmatter: SourceFrontmatter;
  readonly body: string;
  readonly relativePath?: string;
}

export interface SourceRepository {
  findByContentHash(contentHash: string): Promise<SourceRecord | undefined>;
  writeSource(source: SourceRecord): Promise<SourceRecord>;
}
