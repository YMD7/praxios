import { Hono } from "hono";
import { z } from "zod";
import {
  PROPOSAL_STATUSES,
  payloadSchemaForKind,
  type Repositories,
} from "@praxios/core";
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

    // pending のときだけ承認・適用する。applied/rejected を再承認すると
    // applyProposal が再実行され、タスクや Wiki ページが重複生成されるため。
    const current = await repos.proposals.get(id);
    if (!current) return c.json({ error: "not_found" }, 404);
    if (current.status !== "pending") {
      return c.json({ error: "not_pending", status: current.status }, 409);
    }

    // 編集された payload は、適用前に種別スキーマで検証する。
    // （適用時にしか検証しないと、不正な payload で適用が失敗し提案が固着する）
    let editedPayload: Record<string, unknown> | undefined;
    if (parsed.data.payload) {
      const schema = payloadSchemaForKind(current.proposalKind);
      const result = schema?.safeParse(parsed.data.payload);
      if (result && !result.success) {
        return c.json({ error: result.error.flatten() }, 400);
      }
      editedPayload = (result?.data ??
        parsed.data.payload) as Record<string, unknown>;
    }

    const updated = await repos.proposals.update(id, {
      status: "approved",
      reviewedAt: nowIso(),
      reviewerId: "local-user",
      reviewComment: parsed.data.reviewComment ?? null,
      ...(editedPayload ? { payload: editedPayload } : {}),
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
