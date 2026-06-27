import type {
  ContextItem,
  Proposal,
  Source,
  Task,
  TaskPriority,
  WikiLink,
  WikiPage
} from "@praxios/core";

const apiBase = import.meta.env.VITE_API_URL ?? "/api";

export interface TaskWorkspaceInfo {
  taskId: string;
  path: string;
  contextPath: string;
  context: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  async listTasks() {
    return request<{ tasks: Task[] }>("/tasks");
  },
  async createTask(input: {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string | null;
    completionCriteria: string;
  }) {
    return request<{ task: Task }>("/tasks", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async getTask(taskId: string) {
    return request<{ task: Task }>(`/tasks/${taskId}`);
  },
  async listTaskContext(taskId: string) {
    return request<{ contextItems: ContextItem[] }>(`/tasks/${taskId}/context`);
  },
  async listTaskSources(taskId: string) {
    return request<{ sources: Source[] }>(`/tasks/${taskId}/sources`);
  },
  async listTaskProposals(taskId: string) {
    return request<{ proposals: Proposal[] }>(`/tasks/${taskId}/proposals`);
  },
  async getTaskWorkspace(taskId: string) {
    return request<{ workspace: TaskWorkspaceInfo }>(`/tasks/${taskId}/workspace`);
  },
  async syncTaskWorkspace(taskId: string) {
    return request<{ workspace: TaskWorkspaceInfo }>(`/tasks/${taskId}/workspace/sync`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  async ingestSource(input: {
    sourceType: string;
    sourceTitle: string;
    content: string;
    taskId?: string | null;
    processNow?: boolean;
  }) {
    return request<{ source: Source; proposals: Proposal[] }>("/sources", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async listSources() {
    return request<{ sources: Source[] }>("/sources");
  },
  async getSource(sourceId: string) {
    return request<{ source: Source }>(`/sources/${sourceId}`);
  },
  async getSourceContent(sourceId: string) {
    const response = await fetch(`${apiBase}/sources/${sourceId}/content`);
    if (!response.ok) {
      throw new Error(`Source content request failed: ${response.status}`);
    }
    return response.text();
  },
  async listProposals(status?: "pending" | "applied" | "rejected") {
    const query = status ? `?status=${status}` : "";
    return request<{ proposals: Proposal[] }>(`/proposals${query}`);
  },
  async applyProposal(proposalId: string) {
    return request<{ proposal: Proposal }>(`/proposals/${proposalId}/apply`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  async rejectProposal(proposalId: string) {
    return request<{ proposal: Proposal }>(`/proposals/${proposalId}/reject`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  async listWikiPages() {
    return request<{ pages: WikiPage[] }>("/wiki");
  },
  async getWikiPage(pageId: string) {
    return request<{ page: WikiPage }>(`/wiki/${pageId}`);
  },
  async upsertWikiPage(input: {
    pageId: string;
    title: string;
    body: string;
    tags: string[];
  }) {
    return request<{ page: WikiPage }>(`/wiki/${input.pageId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  async createWikiPage(input: {
    pageId: string;
    title: string;
    body: string;
    tags: string[];
  }) {
    return request<{ page: WikiPage }>("/wiki", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async listWikiLinks(pageId: string) {
    return request<{ outgoing: WikiLink[]; backlinks: WikiLink[] }>(`/wiki/${pageId}/links`);
  }
};
