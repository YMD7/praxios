import type { Source, Task } from "@praxios/core";

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
  },
};
