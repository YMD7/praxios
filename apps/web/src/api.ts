import type {
  Proposal,
  Source,
  Task,
  WikiLink,
  WikiPage,
} from "@praxios/core";

export type WikiOutgoing = WikiLink & { toTitle: string | null };
export type WikiBacklink = WikiLink & { fromTitle: string | null };
export interface WikiPageDetail {
  page: WikiPage;
  outgoing: WikiOutgoing[];
  backlinks: WikiBacklink[];
}

export type SourceWithContent = Source & { content: string };

export interface CreateSourceInput {
  sourceType?: string;
  sourceTitle?: string | null;
  content: string;
  sourceUrl?: string | null;
  provider?: string | null;
}

const BASE = "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: Task["priority"];
  completionCriteria?: string | null;
}

export const api = {
  tasks: {
    list: () => http<Task[]>("/tasks"),
    get: (id: string) => http<Task>(`/tasks/${id}`),
    create: (body: CreateTaskInput) =>
      http<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Task>) =>
      http<Task>(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  sources: {
    list: () => http<Source[]>("/sources"),
    get: (id: string) => http<SourceWithContent>(`/sources/${id}`),
    create: (body: CreateSourceInput) =>
      http<Source>("/sources", { method: "POST", body: JSON.stringify(body) }),
    analyze: (id: string) =>
      http<{ created: Proposal[] }>(`/sources/${id}/analyze`, {
        method: "POST",
      }),
  },
  proposals: {
    list: (status?: string) =>
      http<Proposal[]>(`/proposals${status ? `?status=${status}` : ""}`),
    approve: (id: string, body: { reviewComment?: string } = {}) =>
      http<{ proposal: Proposal; result?: unknown; error?: string }>(
        `/proposals/${id}/approve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    reject: (id: string, body: { reviewComment?: string } = {}) =>
      http<Proposal>(`/proposals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  wiki: {
    list: () => http<WikiPage[]>("/wiki"),
    get: (id: string) => http<WikiPageDetail>(`/wiki/${id}`),
    create: (body: { title: string; body?: string; tags?: string[] }) =>
      http<WikiPage>("/wiki", { method: "POST", body: JSON.stringify(body) }),
    update: (
      id: string,
      body: { title: string; body?: string; tags?: string[] },
    ) =>
      http<WikiPage>(`/wiki/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
};
