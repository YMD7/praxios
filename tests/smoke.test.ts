import { describe, expect, it } from "vitest";

import { formatCliError } from "../apps/cli/src/index";
import {
  DeterministicClock,
  DeterministicIdGenerator,
  UlidIdGenerator,
} from "../packages/adapters/src/index";
import { APPLICATION_ERROR_CODES, ApplicationError } from "../packages/application/src/index";
import {
  ID_PREFIX_BY_RECORD_TYPE,
  getIdPrefixForRecordType,
  getRecordTypeForIdPrefix,
} from "../packages/core/src/index";

describe("runtime baseline", () => {
  it("defines stable application error codes and CLI formatting", () => {
    expect(APPLICATION_ERROR_CODES).toEqual([
      "invalid_workspace",
      "invalid_frontmatter",
      "missing_reference",
      "invalid_transition",
      "invalid_agent_output",
      "approval_required",
      "fixture_not_found",
      "lint_failed",
    ]);

    const error = new ApplicationError({
      code: "approval_required",
      message: "Review approval is required.",
    });

    expect(formatCliError(error)).toBe("approval_required: Review approval is required.");
  });

  it("maps record types to ID prefixes", () => {
    expect(ID_PREFIX_BY_RECORD_TYPE).toEqual({
      source: "src_",
      knowledge: "know_",
      task: "task_",
      artifact: "artifact_",
      review: "review_",
      event: "event_",
    });
    expect(getIdPrefixForRecordType("source")).toBe("src_");
    expect(getRecordTypeForIdPrefix("event_")).toBe("event");
  });

  it("provides deterministic test clock and ID generation", () => {
    const clock = new DeterministicClock(new Date("2026-06-23T00:00:00.000Z"));
    const ids = new DeterministicIdGenerator();

    expect(clock.now().toISOString()).toBe("2026-06-23T00:00:00.000Z");
    expect(ids.generate("src_")).toBe("src_0001");
    expect(ids.generate("task_")).toBe("task_0002");
  });

  it("generates prefixed ULID-style IDs", () => {
    const ids = new UlidIdGenerator(
      new DeterministicClock(new Date("2026-06-23T00:00:00.000Z")),
    );

    expect(ids.generate("artifact_")).toMatch(/^artifact_[0-9A-HJKMNP-TV-Z]{26}$/u);
  });
});
