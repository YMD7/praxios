/**
 * Wikilink（`[[PageId]]` / `[[PageId|表示名]]`）のパースと解決。
 *
 * PageId を基準キーとするが、MVP では利便性のため「ページ id 一致」だけでなく
 * 「タイトル一致」でも解決する。リンク先が見つからなければ未解決リンクとして保持し、
 * ページ追加時の再計算で解決を試みる。
 */

import type { WikiLink } from "./types";

export interface ParsedWikilink {
  target: string;
  anchorText: string | null;
}

export type ResolvedLink = Omit<WikiLink, "id" | "createdAt" | "updatedAt">;

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;

/** 本文から `[[...]]` を抽出する。 */
export function parseWikilinks(body: string): ParsedWikilink[] {
  const out: ParsedWikilink[] = [];
  for (const m of body.matchAll(WIKILINK_RE)) {
    const target = (m[1] ?? "").trim();
    if (!target) continue;
    out.push({ target, anchorText: m[2]?.trim() ?? null });
  }
  return out;
}

/**
 * 本文と提案リンクから WikiLink を解決する。
 * pages は現存ページ（id/title）。target が id または title に一致すれば resolved。
 */
export function resolveWikilinks(
  fromPageId: string,
  body: string,
  proposedLinks: { toPageId: string; anchorText?: string | null }[],
  pages: { id: string; title: string }[],
  sourceId: string | null = null,
): ResolvedLink[] {
  const candidates: ParsedWikilink[] = [
    ...parseWikilinks(body),
    ...proposedLinks.map((p) => ({
      target: p.toPageId,
      anchorText: p.anchorText ?? null,
    })),
  ];

  const links = new Map<string, ResolvedLink>();
  for (const c of candidates) {
    const page = pages.find((p) => p.id === c.target || p.title === c.target);
    const toPageId = page ? page.id : c.target;
    if (toPageId === fromPageId) continue; // 自己参照は除外
    if (links.has(toPageId)) continue;
    links.set(toPageId, {
      fromPageId,
      toPageId,
      anchorText: c.anchorText,
      status: page ? "resolved" : "unresolved",
      sourceId,
      confidence: null,
    });
  }
  return [...links.values()];
}
