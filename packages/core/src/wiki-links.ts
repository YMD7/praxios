export interface ParsedWikiLink {
  pageId: string;
  anchorText: string;
}

const wikiLinkPattern = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;

export function normalizePageId(value: string): string {
  return value.trim().replace(/\s+/g, "-");
}

export function extractWikiLinks(body: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(wikiLinkPattern)) {
    const rawPageId = match[1];
    if (!rawPageId) {
      continue;
    }

    const pageId = normalizePageId(rawPageId);
    const anchorText = match[2]?.trim() || rawPageId.trim();
    const key = `${pageId}:${anchorText}`;

    if (!seen.has(key)) {
      links.push({ pageId, anchorText });
      seen.add(key);
    }
  }

  return links;
}

export function createPageIdFromTitle(title: string): string {
  return normalizePageId(
    title
      .toLowerCase()
      .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠ー]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  );
}
