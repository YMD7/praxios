import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { repositories } from "./repos";
import { tasksRoutes } from "./routes/tasks";

const app = new Hono();

app.use("/api/*", cors());
app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/tasks", tasksRoutes(repositories));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`[api] listening on http://localhost:${port}`);
