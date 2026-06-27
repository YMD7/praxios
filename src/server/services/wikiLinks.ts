import { repository } from "../repository";

export function normalizePageId(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function extractWikiLinks(body: string) {
  const links: Array<{ toPageId: string; anchorText?: string; status: string }> = [];
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body))) {
    const toPageId = normalizePageId(match[1] ?? "");
    if (!toPageId) continue;
    const exists = repository.getWikiPage(toPageId);
    links.push({
      toPageId,
      anchorText: match[2]?.trim(),
      status: exists ? "resolved" : "unresolved"
    });
  }

  return links;
}

export function refreshWikiLinks(pageId: string, body: string) {
  repository.replaceWikiLinks(pageId, extractWikiLinks(body));
}

export function refreshWikiGraph() {
  for (const page of repository.listWikiPages()) {
    repository.replaceWikiLinks(page.id, extractWikiLinks(page.body));
  }
}
