import { PraxiosCore } from "@praxios/core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let tempDir: string;
let core: PraxiosCore;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxios-api-"));
  fs.writeFileSync(path.join(tempDir, "pnpm-workspace.yaml"), "packages: []\n");
  core = new PraxiosCore({ workspaceRoot: tempDir });
  app = createApp(core);
});

afterEach(() => {
  core.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Praxios API validation", () => {
  it("returns 400 for invalid task create bodies", async () => {
    const response = await app.request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
  });

  it("returns 400 for invalid proposal status filters", async () => {
    const response = await app.request("/proposals?status=unknown");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
  });

  it("returns 400 for malformed optional review bodies", async () => {
    const response = await app.request("/proposals/proposal-1/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_json" });
  });

  it("returns 404 when ingesting a source for an unknown task", async () => {
    const response = await app.request("/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "manual_note",
        sourceTitle: "Unknown task source",
        content: "Attach to missing task.",
        taskId: "missing-task"
      })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "not_found" });
  });

  it("returns 409 when creating a duplicate wiki page", async () => {
    const body = {
      pageId: "duplicate-page",
      title: "Duplicate page",
      body: "First body",
      tags: []
    };

    const first = await app.request("/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const second = await app.request("/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ error: "conflict" });
  });

  it("returns 409 when applying a non-pending proposal", async () => {
    const ingestResponse = await app.request("/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "manual_note",
        sourceTitle: "Contract request",
        content: "Create an agreement draft.",
        processNow: true
      })
    });
    const ingestBody = await ingestResponse.json();
    const proposalId = ingestBody.proposals[0].id as string;

    const firstApply = await app.request(`/proposals/${proposalId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const secondApply = await app.request(`/proposals/${proposalId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    expect(firstApply.status).toBe(200);
    expect(secondApply.status).toBe(409);
    expect(await secondApply.json()).toMatchObject({ error: "proposal_not_pending" });
  });

  it("creates task workspace context files through the API", async () => {
    const task = core.createTask({
      title: "Workspace task",
      description: "Prepare task workspace.",
      status: "New",
      priority: "Normal",
      completionCriteria: "Workspace exists."
    });

    const first = await app.request(`/tasks/${task.id}/workspace`);
    const firstBody = await first.json();
    const second = await app.request(`/tasks/${task.id}/workspace/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstBody.workspace.path).toBe(path.join(tempDir, ".praxios", "tasks", task.id));
    expect(secondBody.workspace.context).toContain("# Task Context");
    expect(
      fs.readFileSync(path.join(firstBody.workspace.path, "AGENTS.md"), "utf8")
    ).toContain("praxios-agent-load-check");
    expect(fs.readFileSync(path.join(firstBody.workspace.path, "CLAUDE.md"), "utf8")).toBe(
      "@AGENTS.md\n"
    );
  });

  it("deletes task records through the API", async () => {
    const task = core.createTask({
      title: "Delete via API",
      description: "Remove this task.",
      status: "New",
      priority: "Normal",
      completionCriteria: "Task is gone."
    });
    const workspace = core.getTaskWorkspace(task.id);

    const deleteResponse = await app.request(`/tasks/${task.id}`, {
      method: "DELETE"
    });
    const getResponse = await app.request(`/tasks/${task.id}`);

    expect(deleteResponse.status).toBe(204);
    expect(getResponse.status).toBe(404);
    expect(fs.existsSync(workspace.path)).toBe(false);
  });

  it("returns 404 when deleting a missing task", async () => {
    const response = await app.request("/tasks/missing-task", {
      method: "DELETE"
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "not_found" });
  });

  it("lists sources attached to a task", async () => {
    const task = core.createTask({
      title: "Contract task",
      description: "Prepare a contractor agreement.",
      status: "New",
      priority: "Normal",
      completionCriteria: "Context is ready."
    });

    await app.request("/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "email_thread",
        sourceTitle: "Contract terms thread",
        content: "The amount is 1,420,000 JPY.",
        taskId: task.id
      })
    });
    await app.request("/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "manual_note",
        sourceTitle: "Unattached source",
        content: "This should not appear in task sources."
      })
    });

    const response = await app.request(`/tasks/${task.id}/sources`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].sourceTitle).toBe("Contract terms thread");
    expect(body.sources[0].metadata.taskId).toBe(task.id);
  });
});
