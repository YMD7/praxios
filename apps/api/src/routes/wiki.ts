import { Hono } from "hono";
import { z } from "zod";
import type { Repositories } from "@praxios/core";
import { saveWikiPage } from "@praxios/pipeline";

const upsertSchema = z.object({
  title: z.string().min(1),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

export function wikiRoutes(repos: Repositories) {
  const r = new Hono();

  r.get("/", async (c) => c.json(await repos.wiki.listPages()));

  r.post("/", async (c) => {
    const parsed = upsertSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const page = await saveWikiPage(repos, parsed.data);
    return c.json(page, 201);
  });

  r.get("/:id", async (c) => {
    const id = c.req.param("id");
    const page = await repos.wiki.getPage(id);
    if (!page) return c.json({ error: "not_found" }, 404);

    const [outgoing, backlinks, pages] = await Promise.all([
      repos.wiki.outgoingLinks(id),
      repos.wiki.backlinks(id),
      repos.wiki.listPages(),
    ]);
    const titleOf = (pid: string) =>
      pages.find((p) => p.id === pid)?.title ?? null;

    return c.json({
      page,
      outgoing: outgoing.map((l) => ({ ...l, toTitle: titleOf(l.toPageId) })),
      backlinks: backlinks.map((l) => ({
        ...l,
        fromTitle: titleOf(l.fromPageId),
      })),
    });
  });

  r.patch("/:id", async (c) => {
    const parsed = upsertSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const existing = await repos.wiki.getPage(c.req.param("id"));
    if (!existing) return c.json({ error: "not_found" }, 404);
    const page = await saveWikiPage(repos, {
      pageId: c.req.param("id"),
      ...parsed.data,
    });
    return c.json(page);
  });

  return r;
}
