import { describe, expect, it } from "vitest";
import { extractWikiLinks, normalizePageId } from "../src/wiki-links.js";

describe("wiki links", () => {
  it("extracts page ids and aliases", () => {
    expect(extractWikiLinks("See [[ContractFlow]] and [[Legal Review|legal]].")).toEqual([
      { pageId: "contractflow", anchorText: "ContractFlow" },
      { pageId: "legal-review", anchorText: "legal" }
    ]);
  });

  it("normalizes whitespace", () => {
    expect(normalizePageId("Legal Review")).toBe("legal-review");
  });
});
