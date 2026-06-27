/**
 * Wiki 操作（ページ保存と wikilink 解決）。
 *
 * 手動編集（API）と Wiki 更新提案の適用（applyProposal）で共有する。
 *
 * 保存時の方針:
 * - 保存したページ自身: 本文 + proposedLinks から全リンクを再解決する。
 * - その他のページ: 既存リンクの provenance（sourceId/anchorText）と
 *   proposedLinks 由来リンクを保ったまま、未解決リンクだけを現在のページ集合に
 *   対して再解決する（新規ページ追加による自動解決のため）。
 *   他ページを本文から丸ごと再計算しないことで、provenance の消失を防ぐ。
 */

import {
  resolveWikilinks,
  type Repositories,
  type WikiLink,
  type WikiPage,
} from "@praxios/core";

type LinkInput = Omit<WikiLink, "id" | "createdAt" | "updatedAt">;

const stripMeta = (l: WikiLink): LinkInput => ({
  fromPageId: l.fromPageId,
  toPageId: l.toPageId,
  anchorText: l.anchorText,
  status: l.status,
  sourceId: l.sourceId,
  confidence: l.confidence,
});

export interface SaveWikiPageInput {
  pageId?: string | null;
  title: string;
  body: string;
  tags?: string[];
  proposedLinks?: { toPageId: string; anchorText?: string | null }[];
  sourceId?: string | null;
}

/** Wiki ページを作成/更新し、リンクを解決する。 */
export async function saveWikiPage(
  repos: Repositories,
  input: SaveWikiPageInput,
): Promise<WikiPage> {
  const fields = {
    title: input.title,
    body: input.body,
    tags: input.tags ?? [],
  };
  const page = input.pageId
    ? await repos.wiki.updatePage(input.pageId, fields)
    : await repos.wiki.createPage(fields);
  if (!page) throw new Error(`wiki page not found: ${input.pageId}`);

  const pages = await repos.wiki.listPages();
  const index = pages.map((p) => ({ id: p.id, title: p.title }));

  // 保存したページ: 本文 + proposedLinks から全リンクを再解決。
  await repos.wiki.replaceLinks(
    page.id,
    resolveWikilinks(
      page.id,
      page.body,
      input.proposedLinks ?? [],
      index,
      input.sourceId ?? null,
    ),
  );

  // 他ページ: 未解決リンクのみ再解決して治癒する（provenance は保持）。
  for (const other of pages) {
    if (other.id === page.id) continue;
    const existing = await repos.wiki.outgoingLinks(other.id);
    let changed = false;
    const healed = existing.map((l) => {
      if (l.status === "resolved") return stripMeta(l);
      const match = index.find(
        (p) => p.id === l.toPageId || p.title === l.toPageId,
      );
      if (!match || match.id === other.id) return stripMeta(l);
      changed = true;
      return { ...stripMeta(l), toPageId: match.id, status: "resolved" as const };
    });
    if (changed) await repos.wiki.replaceLinks(other.id, healed);
  }

  return page;
}
