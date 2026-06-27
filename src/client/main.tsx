import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useParams
} from "@tanstack/react-router";
import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api";
import "./styles.css";

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  completionCriteria: string;
  pendingApprovalCount?: number;
};

type Source = {
  id: string;
  sourceType: string;
  sourceTitle: string;
  provider: string;
  capturedAt: string;
  sourcePath: string;
  hash: string;
};

type Proposal = {
  id: string;
  proposalType: string;
  status: string;
  rationale: string;
  payload: Record<string, unknown>;
};

type Approval = {
  id: string;
  status: string;
  proposal: Proposal | null;
  task: Task | null;
};

type WikiPage = {
  id: string;
  title: string;
  body: string;
  tags: string[] | string;
};

function useAsync<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, deps);

  return { data, error, reload: () => load().then(setData) };
}

function RootLayout() {
  return (
    <main className="shell">
      <aside className="rail">
        <div>
          <p className="eyebrow">Praxios MVP</p>
          <h1>AI-native work OS</h1>
        </div>
        <nav>
          <Link to="/tasks">Tasks</Link>
          <Link to="/approvals">Approvals</Link>
          <Link to="/wiki">Wiki</Link>
        </nav>
      </aside>
      <section className="workspace">
        <Outlet />
      </section>
    </main>
  );
}

function TaskListPage() {
  const { data, reload } = useAsync<{ tasks: Task[] }>(
    () => api("/tasks"),
    []
  );

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        priority: form.get("priority")
      })
    });
    event.currentTarget.reset();
    await reload();
  }

  return (
    <div className="stack">
      <header className="pageHeader">
        <p className="eyebrow">Task List</p>
        <h2>分散情報をタスク単位で束ねる</h2>
      </header>
      <form className="card formGrid" onSubmit={createTask}>
        <input name="title" placeholder="タスク名" required />
        <input name="priority" placeholder="Priority" defaultValue="Medium" />
        <textarea name="description" placeholder="背景や要件" />
        <button>タスク作成</button>
      </form>
      <div className="grid">
        {data?.tasks.map((task) => (
          <Link
            className="card taskCard"
            key={task.id}
            to="/tasks/$taskId"
            params={{ taskId: task.id }}
          >
            <span className="badge">{task.status}</span>
            <h3>{task.title}</h3>
            <p>{task.description || "説明なし"}</p>
            <small>
              {task.priority} / 承認待ち {task.pendingApprovalCount ?? 0}
            </small>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TaskWorkspacePage() {
  const { taskId } = useParams({ from: "/tasks/$taskId" });
  const { data, reload } = useAsync<{
    task: Task;
    context: Array<Record<string, string>>;
    proposals: Proposal[];
    knowledge: Array<{ wikiPageId: string; page?: WikiPage }>;
  }>(() => api(`/tasks/${taskId}`), [taskId]);

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api<Source>("/sources", {
      method: "POST",
      body: JSON.stringify({
        taskId,
        sourceType: form.get("sourceType"),
        sourceTitle: form.get("sourceTitle"),
        content: form.get("content")
      })
    });
    event.currentTarget.reset();
    await reload();
  }

  async function generate(sourceId: string) {
    await api(`/sources/${sourceId}/proposals/mock`, {
      method: "POST",
      body: JSON.stringify({ taskId })
    });
    await reload();
  }

  if (!data) return <p>Loading...</p>;

  return (
    <div className="stack">
      <header className="pageHeader">
        <p className="eyebrow">Task Workspace</p>
        <h2>{data.task.title}</h2>
        <p>{data.task.description}</p>
      </header>
      <section className="columns">
        <div className="card">
          <h3>Context</h3>
          {data.context.map((item) => (
            <article className="mini" key={item.id}>
              <Link to="/sources/$sourceId" params={{ sourceId: item.sourceId }}>
                {item.title}
              </Link>
              <p>{item.summary}</p>
              <button onClick={() => generate(item.sourceId)}>
                mock提案生成
              </button>
            </article>
          ))}
          <form className="formGrid compact" onSubmit={addSource}>
            <input name="sourceType" defaultValue="manual_note" />
            <input name="sourceTitle" placeholder="Source title" required />
            <textarea name="content" placeholder="Source body" required />
            <button>Source登録</button>
          </form>
        </div>
        <div className="card">
          <h3>Proposals</h3>
          {data.proposals.map((proposal) => (
            <article className="mini" key={proposal.id}>
              <span className="badge">{proposal.status}</span>
              <strong>{proposal.proposalType}</strong>
              <p>{proposal.rationale}</p>
              <pre>{JSON.stringify(proposal.payload, null, 2)}</pre>
            </article>
          ))}
        </div>
        <div className="card">
          <h3>Wiki Links</h3>
          {data.knowledge.map((link) => (
            <Link
              className="mini block"
              key={link.wikiPageId}
              to="/wiki/$pageId"
              params={{ pageId: link.wikiPageId }}
            >
              {link.page?.title ?? link.wikiPageId}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ApprovalQueuePage() {
  const { data, reload } = useAsync<{ approvals: Approval[] }>(
    () => api("/approvals"),
    []
  );

  async function review(id: string, action: "approve" | "reject") {
    await api(`/approvals/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ comment: `local ${action}` })
    });
    await reload();
  }

  return (
    <div className="stack">
      <header className="pageHeader">
        <p className="eyebrow">Approval Queue</p>
        <h2>AI提案を直接反映せず、人間が承認する</h2>
      </header>
      {data?.approvals.map((approval) => (
        <article className="card" key={approval.id}>
          <span className="badge">{approval.status}</span>
          <h3>{approval.proposal?.proposalType ?? "missing proposal"}</h3>
          <p>{approval.task?.title ?? "Wiki / global proposal"}</p>
          <p>{approval.proposal?.rationale}</p>
          <pre>{JSON.stringify(approval.proposal?.payload, null, 2)}</pre>
          {approval.status === "Pending" ? (
            <div className="actions">
              <button onClick={() => review(approval.id, "approve")}>
                承認して適用
              </button>
              <button className="secondary" onClick={() => review(approval.id, "reject")}>
                却下
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function WikiListPage() {
  const { data, reload } = useAsync<{ pages: WikiPage[] }>(
    () => api("/wiki"),
    []
  );

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/wiki", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body")
      })
    });
    event.currentTarget.reset();
    await reload();
  }

  return (
    <div className="stack">
      <header className="pageHeader">
        <p className="eyebrow">Wiki</p>
        <h2>タスクから生まれた業務メモリ</h2>
      </header>
      <form className="card formGrid" onSubmit={createPage}>
        <input name="title" placeholder="ページタイトル" required />
        <textarea
          name="body"
          placeholder="本文。[[PageId]] または [[PageId|表示名]] が使えます。"
        />
        <button>Wiki作成</button>
      </form>
      <div className="grid">
        {data?.pages.map((page) => (
          <Link
            className="card"
            key={page.id}
            to="/wiki/$pageId"
            params={{ pageId: page.id }}
          >
            <h3>{page.title}</h3>
            <small>{page.id}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

function WikiPageView() {
  const { pageId } = useParams({ from: "/wiki/$pageId" });
  const { data, reload } = useAsync<{
    page: WikiPage;
    outgoingLinks: Array<{ toPageId: string; anchorText?: string; status: string }>;
  }>(() => api(`/wiki/${pageId}`), [pageId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api(`/wiki/${pageId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body")
      })
    });
    await reload();
  }

  if (!data) return <p>Loading...</p>;

  return (
    <div className="stack">
      <header className="pageHeader">
        <p className="eyebrow">Wiki Page</p>
        <h2>{data.page.title}</h2>
      </header>
      <form className="card formGrid" onSubmit={save}>
        <input name="title" defaultValue={data.page.title} />
        <textarea name="body" defaultValue={data.page.body} rows={12} />
        <button>保存してリンク再計算</button>
      </form>
      <section className="card">
        <h3>Outgoing links</h3>
        {data.outgoingLinks.map((link) => (
          <p key={`${link.toPageId}-${link.anchorText}`}>
            <Link to="/wiki/$pageId" params={{ pageId: link.toPageId }}>
              {link.anchorText ?? link.toPageId}
            </Link>{" "}
            <span className="badge">{link.status}</span>
          </p>
        ))}
      </section>
    </div>
  );
}

function SourceViewerPage() {
  const { sourceId } = useParams({ from: "/sources/$sourceId" });
  const { data } = useAsync<{ source: Source; content: string }>(
    () => api(`/sources/${sourceId}`),
    [sourceId]
  );

  if (!data) return <p>Loading...</p>;

  return (
    <div className="stack">
      <header className="pageHeader">
        <p className="eyebrow">Source Viewer</p>
        <h2>{data.source.sourceTitle}</h2>
        <p>{data.source.hash}</p>
      </header>
      <article className="card sourceBody">{data.content}</article>
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });
const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TaskListPage
});
const taskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks/$taskId",
  component: TaskWorkspacePage
});
const approvalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/approvals",
  component: ApprovalQueuePage
});
const wikiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wiki",
  component: WikiListPage
});
const wikiPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wiki/$pageId",
  component: WikiPageView
});
const sourceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sources/$sourceId",
  component: SourceViewerPage
});

const routeTree = rootRoute.addChildren([
  tasksRoute,
  taskRoute,
  approvalsRoute,
  wikiRoute,
  wikiPageRoute,
  sourceRoute
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <p>Loading...</p>
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

