import { eq } from 'drizzle-orm';
import { slugify } from '@praxios/shared';
import { db } from '../db/index.js';
import { wikiPages, wikiLinks } from '../db/schema.js';
import { parseWikiLinks } from '../lib/wikilinks.js';
import type { CreateWikiPage, UpdateWikiPage, WikiPage, WikiLink } from '@praxios/shared';

function toWikiPage(row: typeof wikiPages.$inferSelect): WikiPage {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toWikiLink(row: typeof wikiLinks.$inferSelect): WikiLink {
  return {
    id: row.id,
    fromPageId: row.fromPageId,
    toPageId: row.toPageId,
    anchorText: row.anchorText ?? null,
    status: row.status,
    sourceId: row.sourceId ?? null,
    confidence: row.confidence / 100,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWikiPages(): Promise<WikiPage[]> {
  const rows = await db.select().from(wikiPages).orderBy(wikiPages.updatedAt);
  return rows.map(toWikiPage);
}

export async function getWikiPage(id: string): Promise<WikiPage | null> {
  const [row] = await db.select().from(wikiPages).where(eq(wikiPages.id, id)).limit(1);
  return row ? toWikiPage(row) : null;
}

export async function getWikiPageByTitle(title: string): Promise<WikiPage | null> {
  const [row] = await db.select().from(wikiPages).where(eq(wikiPages.title, title)).limit(1);
  return row ? toWikiPage(row) : null;
}

export async function getOutgoingLinks(pageId: string): Promise<WikiLink[]> {
  const rows = await db.select().from(wikiLinks).where(eq(wikiLinks.fromPageId, pageId));
  return rows.map(toWikiLink);
}

export async function getBacklinks(pageId: string): Promise<WikiLink[]> {
  const rows = await db.select().from(wikiLinks).where(eq(wikiLinks.toPageId, pageId));
  return rows.map(toWikiLink);
}

async function resolveUnresolvedLinks(): Promise<void> {
  const unresolved = await db
    .select()
    .from(wikiLinks)
    .where(eq(wikiLinks.status, 'unresolved'));

  for (const link of unresolved) {
    const target = await getWikiPage(link.toPageId);
    if (target) {
      await db
        .update(wikiLinks)
        .set({ status: 'resolved', updatedAt: new Date() })
        .where(eq(wikiLinks.id, link.id));
    }
  }
}

async function syncWikiLinks(pageId: string, body: string): Promise<void> {
  const now = new Date();
  const parsed = parseWikiLinks(body);
  const existingRows = await db.select().from(wikiLinks).where(eq(wikiLinks.fromPageId, pageId));

  // Delete links no longer present
  const parsedKeys = new Set(parsed.map((l) => `${slugify(l.pageId)}|${l.anchorText ?? ''}`));
  for (const row of existingRows) {
    const key = `${row.toPageId}|${row.anchorText ?? ''}`;
    if (!parsedKeys.has(key)) {
      await db.delete(wikiLinks).where(eq(wikiLinks.id, row.id));
    }
  }

  // Upsert links
  const existingKeys = new Set(existingRows.map((r) => `${r.toPageId}|${r.anchorText ?? ''}`));
  for (const link of parsed) {
    const toPageId = slugify(link.pageId);
    if (existingKeys.has(`${toPageId}|${link.anchorText ?? ''}`)) continue;

    const target = await getWikiPage(toPageId);
    const status = target ? 'resolved' : 'unresolved';

    await db.insert(wikiLinks).values({
      id: crypto.randomUUID(),
      fromPageId: pageId,
      toPageId,
      anchorText: link.anchorText,
      status,
      confidence: 100,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function createWikiPage(input: CreateWikiPage): Promise<WikiPage> {
  const now = new Date();
  const id = slugify(input.title);

  const existing = await getWikiPage(id);
  if (existing) throw new Error('A page with this title already exists');

  await db.insert(wikiPages).values({
    id,
    title: input.title,
    body: input.body,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  });

  await syncWikiLinks(id, input.body);
  await resolveUnresolvedLinks();

  const page = await getWikiPage(id);
  if (!page) throw new Error('Failed to create wiki page');
  return page;
}

export async function updateWikiPage(id: string, input: UpdateWikiPage): Promise<WikiPage> {
  const now = new Date();

  await db
    .update(wikiPages)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.tags !== undefined && { tags: input.tags }),
      updatedAt: now,
    })
    .where(eq(wikiPages.id, id));

  if (input.body !== undefined) {
    await syncWikiLinks(id, input.body);
  }
  await resolveUnresolvedLinks();

  const page = await getWikiPage(id);
  if (!page) throw new Error('Wiki page not found');
  return page;
}

export async function deleteWikiPage(id: string): Promise<void> {
  await db.delete(wikiLinks).where(eq(wikiLinks.fromPageId, id));
  await db.delete(wikiLinks).where(eq(wikiLinks.toPageId, id));
  await db.delete(wikiPages).where(eq(wikiPages.id, id));
}
