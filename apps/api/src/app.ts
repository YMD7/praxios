import {
  createTaskSchema,
  ingestSourceSchema,
  PraxiosCore,
  PraxiosError,
  proposalStatuses,
  updateTaskSchema,
  upsertWikiPageSchema
} from "@praxios/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { z, ZodError } from "zod";
import { listTerminalAgents } from "./terminal.js";

const proposalStatusQuerySchema = z.enum(proposalStatuses).optional();
const reviewBodySchema = z.object({
  reviewerId: z.string().min(1).default("local-user"),
  reviewComment: z.string().nullable().optional()
});

function validationError(c: Context, error: ZodError) {
  return c.json({ error: "invalid_request", details: error.flatten() }, 400);
}

async function parseRequiredBody<TSchema extends z.ZodTypeAny>(c: Context, schema: TSchema) {
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return { ok: false as const, response: validationError(c, parsed.error) };
  }

  return { ok: true as const, data: parsed.data as z.infer<TSchema> };
}

async function parseOptionalBody<TSchema extends z.ZodTypeAny>(c: Context, schema: TSchema) {
  const text = await c.req.text().catch(() => "");
  let body: unknown = {};

  if (text.trim().length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      return {
        ok: false as const,
        response: c.json({ error: "invalid_json", message: "Malformed JSON body" }, 400)
      };
    }
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return { ok: false as const, response: validationError(c, parsed.error) };
  }

  return { ok: true as const, data: parsed.data as z.infer<TSchema> };
}

export function createApp(core = new PraxiosCore()) {
  const app = new Hono();

  app.use("*", cors());

  app.onError((error, c) => {
    if (error instanceof PraxiosError) {
      return c.json({ error: error.code, message: error.message }, error.status);
    }
    if (error instanceof ZodError) {
      return validationError(c, error);
    }

    console.error(error);
    return c.json({ error: "internal_error", message: error.message }, 500);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/tasks", (c) => c.json({ tasks: core.listTasks() }));

  app.post("/tasks", async (c) => {
    const body = await parseRequiredBody(c, createTaskSchema);
    if (!body.ok) return body.response;

    const task = core.createTask(body.data);
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
    const taskId = c.req.param("taskId");
    if (!core.getTask(taskId)) {
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    }

    const body = await parseRequiredBody(c, updateTaskSchema);
    if (!body.ok) return body.response;

    const task = core.updateTask(taskId, body.data);
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
    const body = await parseRequiredBody(c, ingestSourceSchema);
    if (!body.ok) return body.response;

    if (body.data.taskId && !core.getTask(body.data.taskId)) {
      return c.json({ error: "not_found", message: "Task not found" }, 404);
    }

    const result = core.ingestSource(body.data);
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
    const parsed = proposalStatusQuerySchema.safeParse(c.req.query("status"));
    if (!parsed.success) {
      return validationError(c, parsed.error);
    }

    const status = parsed.data;
    const options = status ? { status } : {};
    return c.json({ proposals: core.listProposals(options) });
  });

  app.post("/proposals/:proposalId/apply", async (c) => {
    const body = await parseOptionalBody(c, reviewBodySchema);
    if (!body.ok) return body.response;

    const proposal = core.applyProposal(
      c.req.param("proposalId"),
      body.data.reviewerId,
      body.data.reviewComment ?? null
    );
    return c.json({ proposal });
  });

  app.post("/proposals/:proposalId/reject", async (c) => {
    const body = await parseOptionalBody(c, reviewBodySchema);
    if (!body.ok) return body.response;

    const proposal = core.rejectProposal(
      c.req.param("proposalId"),
      body.data.reviewerId,
      body.data.reviewComment ?? null
    );
    return c.json({ proposal });
  });

  app.get("/wiki", (c) => c.json({ pages: core.listWikiPages() }));

  app.post("/wiki", async (c) => {
    const body = await parseRequiredBody(c, upsertWikiPageSchema);
    if (!body.ok) return body.response;

    if (core.getWikiPage(body.data.pageId)) {
      return c.json({ error: "conflict", message: "Wiki page already exists" }, 409);
    }

    const page = core.upsertWikiPage(body.data);
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
    const body = await parseRequiredBody(c, upsertWikiPageSchema.omit({ pageId: true }));
    if (!body.ok) return body.response;

    const pageId = c.req.param("pageId");
    if (!core.getWikiPage(pageId)) {
      return c.json({ error: "not_found", message: "Wiki page not found" }, 404);
    }

    const page = core.upsertWikiPage({
      pageId,
      title: body.data.title,
      body: body.data.body,
      tags: body.data.tags
    });
    return c.json({ page });
  });

  app.get("/wiki/:pageId/links", (c) => {
    return c.json(core.listWikiLinks(c.req.param("pageId")));
  });

  app.get("/audit", (c) => c.json({ events: core.listAuditEvents() }));

  app.get("/terminal/agents", (c) => c.json({ agents: listTerminalAgents() }));

  return app;
}
