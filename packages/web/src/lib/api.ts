import type {
  CreateProposal,
  CreateSource,
  CreateTask,
  CreateWikiPage,
  Proposal,
  Source,
  Task,
  TaskFilter,
  UpdateTask,
  UpdateWikiPage,
  WikiLink,
  WikiPage,
} from '@praxios/shared';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const tasksApi = {
  list: (filter: TaskFilter = {}) =>
    request<{ items: Task[] }>(`/tasks?${new URLSearchParams(filter as Record<string, string>)}`).then((r) => r.items),

  get: (id: string) => request<Task>(`/tasks/${id}`),

  create: (data: CreateTask) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTask) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};

export const sourcesApi = {
  list: () => request<{ items: Source[] }>('/sources').then((r) => r.items),

  get: (id: string) => request<Source & { content: string }>(`/sources/${id}`),

  create: (data: CreateSource) =>
    request<Source>('/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  analyze: (id: string) =>
    request<Proposal>(`/sources/${id}/analyze`, {
      method: 'POST',
    }),
};

export const proposalsApi = {
  list: (status?: string) =>
    request<{ items: Proposal[] }>(`/proposals${status ? `?status=${status}` : ''}`).then((r) => r.items),

  get: (id: string) => request<Proposal>(`/proposals/${id}`),

  create: (data: CreateProposal) =>
    request<Proposal>('/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  review: (id: string, action: 'approve' | 'reject' | 'revise', comment?: string) =>
    request<Proposal>(`/proposals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    }),

  apply: (id: string) =>
    request<Proposal>(`/proposals/${id}/apply`, {
      method: 'POST',
    }),
};

export const wikiApi = {
  list: () => request<{ items: WikiPage[] }>('/wiki').then((r) => r.items),

  get: (id: string) =>
    request<WikiPage & { outgoing: WikiLink[]; backlinks: WikiLink[] }>(`/wiki/${id}`),

  create: (data: CreateWikiPage) =>
    request<WikiPage>('/wiki', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateWikiPage) =>
    request<WikiPage>(`/wiki/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/wiki/${id}`, {
      method: 'DELETE',
    }),
};
