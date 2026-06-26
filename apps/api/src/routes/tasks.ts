import { Hono } from "hono";
import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES, type Repositories } from "@praxios/core";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  status: z.enum(TASK_STATUSES).default("new"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  dueDate: z.string().nullish(),
  completionCriteria: z.string().nullish(),
  triggerId: z.string().nullish(),
});

const patchSchema = createSchema.partial();

export function tasksRoutes(repos: Repositories) {
  const r = new Hono();

  r.get("/", async (c) => c.json(await repos.tasks.list()));

  r.post("/", async (c) => {
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const d = parsed.data;
    const task = await repos.tasks.create({
      title: d.title,
      description: d.description ?? null,
      status: d.status,
      priority: d.priority,
      dueDate: d.dueDate ?? null,
      completionCriteria: d.completionCriteria ?? null,
      triggerId: d.triggerId ?? null,
    });
    return c.json(task, 201);
  });

  r.get("/:id", async (c) => {
    const task = await repos.tasks.get(c.req.param("id"));
    return task ? c.json(task) : c.json({ error: "not_found" }, 404);
  });

  r.patch("/:id", async (c) => {
    const parsed = patchSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const task = await repos.tasks.update(c.req.param("id"), parsed.data);
    return task ? c.json(task) : c.json({ error: "not_found" }, 404);
  });

  return r;
}
