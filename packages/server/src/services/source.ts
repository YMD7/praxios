import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sources } from '../db/schema.js';
import { storage, computeHash } from '../lib/storage.js';
import type { CreateSource, Source } from '@praxios/shared';

function toSource(row: typeof sources.$inferSelect): Source {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceTitle: row.sourceTitle ?? null,
    sourceUrl: row.sourceUrl ?? null,
    sourceRefId: row.sourceRefId ?? null,
    provider: row.provider,
    occurredAt: row.occurredAt?.toISOString() ?? null,
    capturedAt: row.capturedAt.toISOString(),
    hash: row.hash,
    metadata: row.metadata ?? {},
    contentPreview: row.contentPreview ?? null,
  };
}

export async function listSources(): Promise<Source[]> {
  const rows = await db.select().from(sources).orderBy(sources.capturedAt);
  return rows.map(toSource);
}

export async function getSource(id: string): Promise<Source | null> {
  const [row] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return row ? toSource(row) : null;
}

export async function getSourceContent(id: string): Promise<string> {
  return storage.readSource(id);
}

export async function createSource(input: CreateSource): Promise<Source> {
  const now = new Date();
  const id = crypto.randomUUID();
  const content = input.content ?? '';
  const hash = computeHash(content);
  const preview = content.slice(0, 500);
  const storagePath = storage.saveSource(id, content);

  await db.insert(sources).values({
    id,
    sourceType: input.sourceType,
    sourceTitle: input.sourceTitle ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceRefId: input.sourceRefId ?? null,
    provider: input.provider,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : null,
    capturedAt: now,
    hash,
    metadata: input.metadata ?? {},
    contentPreview: preview || null,
    storagePath,
  });

  const source = await getSource(id);
  if (!source) throw new Error('Failed to create source');
  return source;
}

export async function deleteSource(id: string): Promise<void> {
  await db.delete(sources).where(eq(sources.id, id));
  storage.deleteSource(id);
}
