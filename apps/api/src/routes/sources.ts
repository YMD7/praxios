import { Hono } from "hono";
import { z } from "zod";
import type { Repositories } from "@praxios/core";
import { readSourceContent, saveSourceContent } from "@praxios/db";
import { randomUUID } from "node:crypto";

const createSchema = z.object({
  sourceType: z.string().min(1).default("manual_text"),
  sourceTitle: z.string().nullish(),
  content: z.string().min(1),
  sourceUrl: z.string().nullish(),
  provider: z.string().nullish(),
  occurredAt: z.string().nullish(),
});

export function sourcesRoutes(repos: Repositories) {
  const r = new Hono();

  r.get("/", async (c) => c.json(await repos.sources.list()));

  r.post("/", async (c) => {
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const d = parsed.data;
    const id = randomUUID();
    const { sourcePath, hash } = saveSourceContent(id, d.content);
    const source = await repos.sources.create({
      id,
      sourceType: d.sourceType,
      sourceTitle: d.sourceTitle ?? null,
      sourceUrl: d.sourceUrl ?? null,
      sourceRefId: null,
      provider: d.provider ?? null,
      sourcePath,
      hash,
      occurredAt: d.occurredAt ?? null,
      metadata: null,
    });
    return c.json(source, 201);
  });

  r.get("/:id", async (c) => {
    const source = await repos.sources.get(c.req.param("id"));
    if (!source) return c.json({ error: "not_found" }, 404);
    let content = "";
    try {
      content = readSourceContent(source.sourcePath);
    } catch {
      content = "(本文ファイルを読み込めませんでした)";
    }
    return c.json({ ...source, content });
  });

  return r;
}
