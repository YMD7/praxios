export interface ParsedWikiLink {
  pageId: string;
  anchorText: string | null;
}

export function parseWikiLinks(body: string): ParsedWikiLink[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
  const links: ParsedWikiLink[] = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    const pageId = match[1].trim();
    const anchorText = match[2] ? match[2].trim() : null;
    links.push({ pageId, anchorText });
  }
  return links;
}
