/**
 * core の Repository インターフェースを Drizzle/SQLite で実装する。
 */

import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import type {
  ContextItem,
  Proposal,
  Repositories,
  Source,
  Task,
  WikiLink,
  WikiPage,
} from "@praxios/core";
import type { Db } from "./client";
import {
  contextItems,
  proposals,
  sources,
  tasks,
  wikiLinks,
  wikiPages,
} from "./schema";

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

function first<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

export function createRepositories(db: Db): Repositories {
  return {
    tasks: {
      async list(): Promise<Task[]> {
        return db.select().from(tasks).orderBy(desc(tasks.updatedAt));
      },
      async get(id): Promise<Task | null> {
        return first(await db.select().from(tasks).where(eq(tasks.id, id)));
      },
      async create(input): Promise<Task> {
        const rows = await db
          .insert(tasks)
          .values({ id: input.id ?? randomUUID(), ...input })
          .returning();
        return rows[0]!;
      },
      async update(id, patch): Promise<Task | null> {
        const rows = await db
          .update(tasks)
          .set({ ...patch, updatedAt: nowSql })
          .where(eq(tasks.id, id))
          .returning();
        return first(rows);
      },
    },

    sources: {
      async list(): Promise<Source[]> {
        return db.select().from(sources).orderBy(desc(sources.capturedAt));
      },
      async get(id): Promise<Source | null> {
        return first(await db.select().from(sources).where(eq(sources.id, id)));
      },
      async create(input): Promise<Source> {
        const rows = await db
          .insert(sources)
          .values({ id: input.id ?? randomUUID(), ...input })
          .returning();
        return rows[0]!;
      },
    },

    context: {
      async listByTask(taskId): Promise<ContextItem[]> {
        return db
          .select()
          .from(contextItems)
          .where(eq(contextItems.taskId, taskId))
          .orderBy(desc(contextItems.createdAt));
      },
      async create(input): Promise<ContextItem> {
        const rows = await db
          .insert(contextItems)
          .values({ id: input.id ?? randomUUID(), ...input })
          .returning();
        return rows[0]!;
      },
    },

    proposals: {
      async list(filter): Promise<Proposal[]> {
        const where = filter?.status
          ? eq(proposals.status, filter.status)
          : undefined;
        return db
          .select()
          .from(proposals)
          .where(where)
          .orderBy(desc(proposals.createdAt));
      },
      async get(id): Promise<Proposal | null> {
        return first(
          await db.select().from(proposals).where(eq(proposals.id, id)),
        );
      },
      async create(input): Promise<Proposal> {
        const rows = await db
          .insert(proposals)
          .values({ id: input.id ?? randomUUID(), ...input })
          .returning();
        return rows[0]!;
      },
      async update(id, patch): Promise<Proposal | null> {
        const rows = await db
          .update(proposals)
          .set(patch)
          .where(eq(proposals.id, id))
          .returning();
        return first(rows);
      },
    },

    wiki: {
      async listPages(): Promise<WikiPage[]> {
        return db.select().from(wikiPages).orderBy(desc(wikiPages.updatedAt));
      },
      async getPage(id): Promise<WikiPage | null> {
        return first(
          await db.select().from(wikiPages).where(eq(wikiPages.id, id)),
        );
      },
      async createPage(input): Promise<WikiPage> {
        const rows = await db
          .insert(wikiPages)
          .values({ id: input.id ?? randomUUID(), ...input })
          .returning();
        return rows[0]!;
      },
      async updatePage(id, patch): Promise<WikiPage | null> {
        const rows = await db
          .update(wikiPages)
          .set({ ...patch, updatedAt: nowSql })
          .where(eq(wikiPages.id, id))
          .returning();
        return first(rows);
      },
      async backlinks(toPageId): Promise<WikiLink[]> {
        return db
          .select()
          .from(wikiLinks)
          .where(eq(wikiLinks.toPageId, toPageId));
      },
      async outgoingLinks(fromPageId): Promise<WikiLink[]> {
        return db
          .select()
          .from(wikiLinks)
          .where(eq(wikiLinks.fromPageId, fromPageId));
      },
      async replaceLinks(fromPageId, links): Promise<void> {
        await db.transaction((tx) => {
          tx.delete(wikiLinks).where(eq(wikiLinks.fromPageId, fromPageId)).run();
          for (const link of links) {
            tx.insert(wikiLinks)
              .values({ id: randomUUID(), ...link })
              .run();
          }
        });
      },
    },
  };
}
