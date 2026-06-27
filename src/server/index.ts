import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { ensureSchema } from "./db/client";
import { repository, unpack } from "./repository";
import { seedIfEmpty } from "./seed";
import { approveProposal, rejectProposal } from "./services/approvalApply";
import { generateMockProposals } from "./services/mockProposal";
import { saveSource, readSourceContent } from "./services/sourceStore";
import { refreshWikiGraph, normalizePageId } from "./services/wikiLinks";

ensureSchema();
seedIfEmpty();

const app = new Hono();
app.use("/api/*", cors());

function summarizeSourceContent(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/tasks", (c) => {
  const approvals = repository.listPendingApprovals();
  const proposals = repository.listProposals();
  const tasks = repository.listTasks().map((task) => {
    const pendingApprovalCount = approvals.filter((approval) => {
      const proposal = proposals.find((item) => item.id === approval.proposalId);
      return proposal?.taskId === task.id;
    }).length;
    return { ...task, pendingApprovalCount };
  });
  return c.json({ tasks });
});

app.post("/api/tasks", async (c) => {
  const body = await c.req.json();
  return c.json(
    repository.createTask({
      title: String(body.title ?? "Untitled task"),
      description: String(body.description ?? ""),
      priority: String(body.priority ?? "Medium"),
      dueDate: body.dueDate ? String(body.dueDate) : undefined,
      completionCriteria: String(body.completionCriteria ?? "")
    }),
    201
  );
});

app.get("/api/tasks/:id", (c) => {
  const task = repository.getTask(c.req.param("id"));
  if (!task) return c.json({ error: "Task not found" }, 404);

  const context = repository.listTaskContext(task.id);
  const proposals = repository.listTaskProposals(task.id).map((proposal) => ({
    ...proposal,
    sourceIds: unpack<string[]>(proposal.sourceIds, []),
    destination: unpack(proposal.destination, {}),
    payload: unpack(proposal.payload, {}),
    evidence: unpack(proposal.evidence, {})
  }));
  const knowledge = repository.listKnowledgeForTask(task.id).map((link) => ({
    ...link,
    page: repository.getWikiPage(link.wikiPageId)
  }));

  return c.json({ task, context, proposals, knowledge });
});

app.get("/api/sources", (c) => c.json({ sources: repository.listSources() }));

app.get("/api/sources/:id", (c) => {
  const source = repository.getSource(c.req.param("id"));
  if (!source) return c.json({ error: "Source not found" }, 404);
  return c.json({
    source: { ...source, metadata: unpack(source.metadata, {}) },
    content: readSourceContent(source.sourcePath)
  });
});

app.post("/api/sources", async (c) => {
  const body = await c.req.json();
  const taskId = body.taskId ? String(body.taskId) : undefined;
  const content = String(body.content ?? "");
  const source = saveSource({
    sourceType: String(body.sourceType ?? "manual_note"),
    sourceTitle: String(body.sourceTitle ?? "Untitled source"),
    content,
    provider: String(body.provider ?? "manual"),
    sourceUrl: body.sourceUrl ? String(body.sourceUrl) : undefined,
    sourceRefId: body.sourceRefId ? String(body.sourceRefId) : undefined,
    occurredAt: body.occurredAt ? String(body.occurredAt) : undefined,
    metadata: { ...(body.metadata ?? {}), taskId }
  });

  if (taskId) {
    repository.createContext({
      taskId,
      sourceType: source.sourceType,
      sourceId: source.id,
      title: source.sourceTitle,
      summary: summarizeSourceContent(content),
      occurredAt: source.occurredAt,
      relevanceScore: 1,
      evidence: { attachedBy: "manual_source_create" }
    });
  }

  return c.json(source, 201);
});

app.post("/api/sources/:id/proposals/mock", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const created = generateMockProposals(
    c.req.param("id"),
    body.taskId ? String(body.taskId) : undefined
  );
  return c.json({ created });
});

app.get("/api/approvals", (c) => {
  const approvals = repository.listApprovals().map((approval) => {
    const proposal = repository.getProposal(approval.proposalId);
    const task = proposal?.taskId ? repository.getTask(proposal.taskId) : null;
    return {
      ...approval,
      proposal: proposal
        ? {
            ...proposal,
            sourceIds: unpack<string[]>(proposal.sourceIds, []),
            destination: unpack(proposal.destination, {}),
            payload: unpack(proposal.payload, {}),
            evidence: unpack(proposal.evidence, {})
          }
        : null,
      task
    };
  });
  return c.json({ approvals });
});

app.post("/api/approvals/:id/approve", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  approveProposal(c.req.param("id"), body.comment ? String(body.comment) : "");
  return c.json({ ok: true });
});

app.post("/api/approvals/:id/reject", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  rejectProposal(c.req.param("id"), body.comment ? String(body.comment) : "");
  return c.json({ ok: true });
});

app.get("/api/wiki", (c) => c.json({ pages: repository.listWikiPages() }));

app.post("/api/wiki", async (c) => {
  const body = await c.req.json();
  const pageId = body.id
    ? normalizePageId(String(body.id))
    : normalizePageId(String(body.title ?? "untitled-page"));
  const page = repository.upsertWikiPage({
    id: pageId,
    title: String(body.title ?? pageId),
    body: String(body.body ?? ""),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined
  });
  refreshWikiGraph();
  return c.json(page, 201);
});

app.get("/api/wiki/:pageId", (c) => {
  const page = repository.getWikiPage(c.req.param("pageId"));
  if (!page) return c.json({ error: "Wiki page not found" }, 404);
  return c.json({
    page: { ...page, tags: unpack<string[]>(page.tags, []) },
    outgoingLinks: repository.listWikiLinks(page.id)
  });
});

app.put("/api/wiki/:pageId", async (c) => {
  const body = await c.req.json();
  const pageId = c.req.param("pageId");
  const page = repository.upsertWikiPage({
    id: pageId,
    title: String(body.title ?? pageId),
    body: String(body.body ?? ""),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined
  });
  refreshWikiGraph();
  return c.json(page);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`Praxios API listening on http://localhost:${port}`);
