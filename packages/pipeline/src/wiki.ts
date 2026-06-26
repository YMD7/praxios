/**
 * Wiki 操作（ページ保存と wikilink 再計算）。
 *
 * 手動編集（API）と Wiki 更新提案の適用（applyProposal）で共有する。
 * ページ保存のたびに全ページのリンクを再計算し、未解決リンクの自動解決を試みる。
 */

import { resolveWikilinks, type Repositories, type WikiPage } from "@praxios/core";

interface PageExtras {
  proposedLinks?: { toPageId: string; anchorText?: string | null }[];
  sourceId?: string | null;
}

/** 全ページの wikilink を再計算する（未解決リンクの解決再試行を含む）。 */
export async function recomputeAllLinks(
  repos: Repositories,
  extras: Record<string, PageExtras> = {},
): Promise<void> {
  const pages = await repos.wiki.listPages();
  const index = pages.map((p) => ({ id: p.id, title: p.title }));
  for (const page of pages) {
    const ex = extras[page.id];
    const links = resolveWikilinks(
      page.id,
      page.body,
      ex?.proposedLinks ?? [],
      index,
      ex?.sourceId ?? null,
    );
    await repos.wiki.replaceLinks(page.id, links);
  }
}

export interface SaveWikiPageInput {
  pageId?: string | null;
  title: string;
  body: string;
  tags?: string[];
  proposedLinks?: { toPageId: string; anchorText?: string | null }[];
  sourceId?: string | null;
}

/** Wiki ページを作成/更新し、リンクを再計算する。 */
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

  await recomputeAllLinks(repos, {
    [page.id]: {
      proposedLinks: input.proposedLinks,
      sourceId: input.sourceId ?? null,
    },
  });
  return page;
}
