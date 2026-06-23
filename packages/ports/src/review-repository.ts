import type { ReviewFrontmatter } from "../../../contracts/src/index.js";

export interface ReviewRecord {
  readonly frontmatter: ReviewFrontmatter;
  readonly body: string;
  readonly relativePath?: string;
}

export interface ReviewRepository {
  writeReview(review: ReviewRecord): Promise<ReviewRecord>;
  updateReview(review: ReviewRecord): Promise<ReviewRecord>;
}
