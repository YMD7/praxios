import { eq } from 'drizzle-orm';
import { slugify } from '@praxios/shared';
import { db } from '../db/index.js';
import { tasks, wikiPages } from '../db/schema.js';
import type { Proposal } from '@praxios/shared';

export async function applyProposal(proposal: Proposal): Promise<void> {
  const now = new Date();

  if (proposal.proposalType === 'task_proposal') {
    const payload = proposal.payload as { title?: string; description?: string };
    if (proposal.taskId) {
      await db
        .update(tasks)
        .set({
          ...(payload.title && { title: payload.title }),
          ...(payload.description && { description: payload.description }),
          updatedAt: now,
        })
        .where(eq(tasks.id, proposal.taskId));
    } else {
      await db.insert(tasks).values({
        id: crypto.randomUUID(),
        title: payload.title || 'New task from proposal',
        description: payload.description || null,
        status: 'new',
        priority: 'medium',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (proposal.proposalType === 'wiki_update_proposal') {
    const payload = proposal.payload as { title?: string; body?: string; pageId?: string };
    const pageId = payload.pageId || slugify(payload.title || 'new-wiki-page');
    const existing = await db.select().from(wikiPages).where(eq(wikiPages.id, pageId)).limit(1);

    if (existing.length > 0) {
      await db
        .update(wikiPages)
        .set({
          ...(payload.title && { title: payload.title }),
          ...(payload.body !== undefined && { body: payload.body }),
          updatedAt: now,
        })
        .where(eq(wikiPages.id, pageId));
    } else {
      await db.insert(wikiPages).values({
        id: pageId,
        title: payload.title || 'New wiki page',
        body: payload.body || '',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (proposal.proposalType === 'message_proposal') {
    // TODO: external send integration
  }
}
