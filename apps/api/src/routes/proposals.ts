import { Hono } from "hono";
import { z } from "zod";
import { PROPOSAL_STATUSES, type Repositories } from "@praxios/core";
import { applyProposal } from "@praxios/pipeline";

function nowIso(): string {
  return new Date().toISOString();
}

const reviewSchema = z.object({
  payload: z.record(z.unknown()).optional(),
  reviewComment: z.string().nullish(),
});

export function proposalsRoutes(repos: Repositories) {
  const r = new Hono();

  r.get("/", async (c) => {
    const status = c.req.query("status");
    const filter =
      status && (PROPOSAL_STATUSES as readonly string[]).includes(status)
        ? { status: status as (typeof PROPOSAL_STATUSES)[number] }
        : undefined;
    return c.json(await repos.proposals.list(filter));
  });

  r.get("/:id", async (c) => {
    const p = await repos.proposals.get(c.req.param("id"));
    return p ? c.json(p) : c.json({ error: "not_found" }, 404);
  });

  r.post("/:id/approve", async (c) => {
    const id = c.req.param("id");
    const parsed = reviewSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const updated = await repos.proposals.update(id, {
      status: "approved",
      reviewedAt: nowIso(),
      reviewerId: "local-user",
      reviewComment: parsed.data.reviewComment ?? null,
      ...(parsed.data.payload
        ? { payload: parsed.data.payload as Record<string, unknown> }
        : {}),
    });
    if (!updated) return c.json({ error: "not_found" }, 404);

    try {
      const result = await applyProposal(repos, id);
      return c.json({ proposal: await repos.proposals.get(id), result });
    } catch (err) {
      // 適用に失敗しても承認状態は保持し、エラーを返す。
      return c.json({ proposal: updated, error: String(err) }, 200);
    }
  });

  r.post("/:id/reject", async (c) => {
    const parsed = reviewSchema.safeParse(await c.req.json().catch(() => ({})));
    const updated = await repos.proposals.update(c.req.param("id"), {
      status: "rejected",
      reviewedAt: nowIso(),
      reviewerId: "local-user",
      reviewComment: parsed.success
        ? (parsed.data.reviewComment ?? null)
        : null,
    });
    return updated ? c.json(updated) : c.json({ error: "not_found" }, 404);
  });

  return r;
}
