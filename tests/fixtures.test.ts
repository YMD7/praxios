import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TaskCandidateSchema } from "../contracts/src/index";

const workspaceRoot = process.cwd();
const meetingFixturePath = join(workspaceRoot, "fixtures", "meetings", "product-launch-sync.md");
const expectedCandidatesPath = join(
  workspaceRoot,
  "fixtures",
  "expected",
  "product-launch-sync.task-candidates.json",
);

const disallowedFixturePatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/u,
  /\bsk-[A-Za-z0-9]{20,}\b/u,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/u,
  /\b(secret|token|credential)s?\b/iu,
  /\b(password|credential|secret|token)\s*[:=]/iu,
];

describe("synthetic fixtures", () => {
  it("keeps the meeting transcript synthetic and free of secret-like material", async () => {
    const transcript = await readFile(meetingFixturePath, "utf8");

    expect(transcript).toContain("This fixture is fully synthetic.");
    for (const pattern of disallowedFixturePatterns) {
      expect(transcript).not.toMatch(pattern);
    }
  });

  it("provides expected TaskCandidate output that matches the boundary contract", async () => {
    const expected = JSON.parse(await readFile(expectedCandidatesPath, "utf8")) as {
      source_fixture: string;
      source_ref: string;
      candidates: unknown[];
    };

    expect(expected.source_fixture).toBe("fixtures/meetings/product-launch-sync.md");
    expect(expected.source_ref).toBe("src_0001");
    expect(expected.candidates.length).toBeGreaterThan(0);

    for (const candidate of expected.candidates) {
      const result = TaskCandidateSchema.safeParse(candidate);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("proposed");
        expect(result.data.source_refs).toEqual([expected.source_ref]);
        expect(result.data.proposed_done_criteria.length).toBeGreaterThan(0);
        expect(result.data.extraction_rationale).not.toHaveLength(0);
      }
    }
  });
});
