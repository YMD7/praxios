import { PraxiosCore } from "@praxios/core";
import { Hono } from "hono";
import { cors } from "hono/cors";

export function createApp(core = new PraxiosCore()) {
  const app = new Hono();

  app.use("*", cors());

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: error.message }, 500);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/tasks", (c) => c.json({ tasks: core.listTasks() }));

  app.post("/tasks", async (c) => {
    const task = core.createTask(await c.req.json());
    return c.json({ task }, 201);
  });

  app.get("/tasks/:taskId", (c) => {
    const task = core.getTask(c.req.param("taskId"));
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }
    return c.json({ task });
  });

  app.patch("/tasks/:taskId", async (c) => {
    const task = core.updateTask(c.req.param("taskId"), await c.req.json());
    return c.json({ task });
  });

  app.get("/tasks/:taskId/context", (c) => {
    return c.json({ contextItems: core.listContextItems(c.req.param("taskId")) });
  });

  app.get("/tasks/:taskId/proposals", (c) => {
    return c.json({ proposals: core.listProposals({ taskId: c.req.param("taskId") }) });
  });

  app.get("/sources", (c) => c.json({ sources: core.listSources() }));

  app.post("/sources", async (c) => {
    const result = core.ingestSource(await c.req.json());
    return c.json(result, 201);
  });

  app.get("/sources/:sourceId", (c) => {
    const source = core.getSource(c.req.param("sourceId"));
    if (!source) {
      return c.json({ error: "Source not found" }, 404);
    }
    return c.json({ source });
  });

  app.get("/sources/:sourceId/content", (c) => {
    return c.text(core.readSourceContent(c.req.param("sourceId")));
  });

  app.post("/sources/process", (c) => {
    return c.json(core.processPendingSources());
  });

  app.get("/proposals", (c) => {
    const status = c.req.query("status") as "pending" | "applied" | "rejected" | undefined;
    const options = status ? { status } : {};
    return c.json({ proposals: core.listProposals(options) });
  });

  app.post("/proposals/:proposalId/apply", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const proposal = core.applyProposal(
      c.req.param("proposalId"),
      body.reviewerId ?? "local-user",
      body.reviewComment ?? null
    );
    return c.json({ proposal });
  });

  app.post("/proposals/:proposalId/reject", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const proposal = core.rejectProposal(
      c.req.param("proposalId"),
      body.reviewerId ?? "local-user",
      body.reviewComment ?? null
    );
    return c.json({ proposal });
  });

  app.get("/wiki", (c) => c.json({ pages: core.listWikiPages() }));

  app.post("/wiki", async (c) => {
    const page = core.upsertWikiPage(await c.req.json());
    return c.json({ page }, 201);
  });

  app.get("/wiki/:pageId", (c) => {
    const page = core.getWikiPage(c.req.param("pageId"));
    if (!page) {
      return c.json({ error: "Wiki page not found" }, 404);
    }
    return c.json({ page });
  });

  app.put("/wiki/:pageId", async (c) => {
    const body = await c.req.json();
    const page = core.upsertWikiPage({
      pageId: c.req.param("pageId"),
      title: body.title,
      body: body.body,
      tags: body.tags ?? []
    });
    return c.json({ page });
  });

  app.get("/wiki/:pageId/links", (c) => {
    return c.json(core.listWikiLinks(c.req.param("pageId")));
  });

  app.get("/audit", (c) => c.json({ events: core.listAuditEvents() }));

  return app;
}
