import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ReviewFrontmatterSchema } from "../../../contracts/src/index.js";
import type { ReviewRecord, ReviewRepository } from "../../ports/src/index.js";
import { buildMarkdownFileName, stringifyMarkdownFrontmatter } from "./markdown-frontmatter.js";

export class MarkdownReviewRepository implements ReviewRepository {
  constructor(private readonly workspacePath: string) {}

  async writeReview(review: ReviewRecord): Promise<ReviewRecord> {
    return this.persistReview(review, "wx");
  }

  async updateReview(review: ReviewRecord): Promise<ReviewRecord> {
    return this.persistReview(review, "w");
  }

  private async persistReview(review: ReviewRecord, flag: "w" | "wx"): Promise<ReviewRecord> {
    const parsedFrontmatter = ReviewFrontmatterSchema.parse(review.frontmatter);
    const relativePath =
      review.relativePath ??
      `reviews/${buildMarkdownFileName({
        id: parsedFrontmatter.id,
        title: parsedFrontmatter.title,
      })}`;

    await writeFile(
      join(this.workspacePath, relativePath),
      stringifyMarkdownFrontmatter({
        frontmatter: parsedFrontmatter,
        body: review.body,
      }),
      { encoding: "utf8", flag },
    );

    return {
      frontmatter: parsedFrontmatter,
      body: review.body,
      relativePath,
    };
  }
}
