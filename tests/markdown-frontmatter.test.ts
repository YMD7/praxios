import { describe, expect, it } from "vitest";

import {
  MarkdownFrontmatterError,
  buildMarkdownFileName,
  parseMarkdownFrontmatter,
  stringifyMarkdownFrontmatter,
} from "../packages/adapters/src/index";
import { SourceFrontmatterSchema } from "../contracts/src/index";

const sourceFrontmatter = {
  id: "src_01JZ8Q9K7M2V4X6P8N3R5T0A1B",
  type: "source",
  title: "Synthetic Meeting Transcript",
  status: "captured",
  created: "2026-06-23T00:00:00.000Z",
  updated: "2026-06-23T00:00:00.000Z",
  origin: "fixture",
  observed_at: "2026-06-23T00:00:00.000Z",
  content_hash: "sha256:abc",
  sensitivity: "internal",
} as const;

describe("markdown frontmatter adapter", () => {
  it("reads frontmatter and body from Markdown", () => {
    const document = parseMarkdownFrontmatter(
      [
        "---",
        `id: ${sourceFrontmatter.id}`,
        "type: source",
        "title: Synthetic Meeting Transcript",
        "status: captured",
        "created: 2026-06-23T00:00:00.000Z",
        "updated: 2026-06-23T00:00:00.000Z",
        "origin: fixture",
        "observed_at: 2026-06-23T00:00:00.000Z",
        "content_hash: sha256:abc",
        "sensitivity: internal",
        "---",
        "# Body",
        "",
      ].join("\n"),
      SourceFrontmatterSchema,
    );

    expect(document.frontmatter).toEqual(sourceFrontmatter);
    expect(document.body).toBe("# Body\n");
  });

  it("writes Markdown while keeping file name slug separate from stable ID", () => {
    const content = stringifyMarkdownFrontmatter({
      frontmatter: sourceFrontmatter,
      body: "# Body\n",
    });

    expect(content).toContain(`id: ${sourceFrontmatter.id}`);
    expect(content).toContain("title: Synthetic Meeting Transcript");
    expect(content).toContain("---\n# Body\n");
    expect(buildMarkdownFileName(sourceFrontmatter)).toBe("synthetic-meeting-transcript.md");
  });

  it("returns invalid_frontmatter for malformed or invalid frontmatter", () => {
    expect(() => parseMarkdownFrontmatter("# Missing", SourceFrontmatterSchema)).toThrow(
      MarkdownFrontmatterError,
    );

    try {
      parseMarkdownFrontmatter(
        ["---", "id: bad", "type: source", "---", "# Body", ""].join("\n"),
        SourceFrontmatterSchema,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(MarkdownFrontmatterError);
      expect((error as MarkdownFrontmatterError).code).toBe("invalid_frontmatter");
    }
  });
});
