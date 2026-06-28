import type { Source, Task } from "@praxios/core";
import { CodeXml, Eye, ExternalLink, FileText, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { AgentTerminalPanel } from "@/components/terminal/AgentTerminalPanel";
import type { AgentTerminalPanelHandle } from "@/components/terminal/AgentTerminalPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { api, type TaskWorkspaceInfo } from "@/api";
import type { TaskWorkbenchTab } from "./types";

const defaultContextPercent = 42;
const minContextPaneWidth = 320;
const minAiPaneWidth = 420;
type ContextDisplayMode = "rendered" | "raw";

export function TaskWorkbenchPanel({
  onRegisterTerminal,
  onTaskLoaded,
  tab
}: {
  onRegisterTerminal: (handle: AgentTerminalPanelHandle | null) => void;
  onTaskLoaded: (task: Task) => void;
  tab: TaskWorkbenchTab;
}) {
  const terminalRef = useRef<AgentTerminalPanelHandle | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [workspace, setWorkspace] = useState<TaskWorkspaceInfo | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [taskResult, workspaceResult, sourceResult] = await Promise.all([
        api.getTask(tab.taskId),
        api.getTaskWorkspace(tab.taskId),
        api.listTaskSources(tab.taskId)
      ]);

      setTask(taskResult.task);
      setWorkspace(workspaceResult.workspace);
      setSources(sourceResult.sources);
      onTaskLoaded(taskResult.task);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [onTaskLoaded, tab.taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onRegisterTerminal(terminalRef.current);
    return () => onRegisterTerminal(null);
  }, [onRegisterTerminal]);

  return (
    <TaskSplitLayout storageKey={`praxios-task-workbench-${tab.taskId}`}>
      {{
        context: (
          <div className="h-full min-h-0">
            <ContextPane
              error={error}
              loading={loading}
              onRefresh={() => void load()}
              sources={sources}
              task={task}
              workspace={workspace}
            />
          </div>
        ),
        ai: (
          <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <AgentTerminalPanel ref={terminalRef} tabId={tab.id} taskId={tab.taskId} />
          </div>
        )
      }}
    </TaskSplitLayout>
  );
}

function TaskSplitLayout({
  children,
  storageKey
}: {
  children: { context: ReactNode; ai: ReactNode };
  storageKey: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [contextPercent, setContextPercent] = useState(() =>
    readSavedContextPercent(storageKey)
  );

  useEffect(() => {
    setContextPercent(readSavedContextPercent(storageKey));
  }, [storageKey]);

  const updateContextWidth = useCallback(
    (nextContextPx: number, containerWidth: number) => {
      if (containerWidth <= 0) return;
      const clampedPx = clampContextPaneWidth(nextContextPx, containerWidth);
      const nextPercent = (clampedPx / containerWidth) * 100;
      setContextPercent(nextPercent);
      saveContextPercent(storageKey, nextPercent);
    },
    [storageKey]
  );

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const startX = event.clientX;
      const startContextWidth = rect.width * (contextPercent / 100);

      const onPointerMove = (moveEvent: PointerEvent) => {
        updateContextWidth(startContextWidth + moveEvent.clientX - startX, rect.width);
      };
      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
    },
    [contextPercent, updateContextWidth]
  );

  const onHandleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const currentWidth = container.clientWidth * (contextPercent / 100);
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateContextWidth(currentWidth - 40, container.clientWidth);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        updateContextWidth(currentWidth + 40, container.clientWidth);
      } else if (event.key === "Home") {
        event.preventDefault();
        updateContextWidth(minContextPaneWidth, container.clientWidth);
      } else if (event.key === "End") {
        event.preventDefault();
        updateContextWidth(container.clientWidth - minAiPaneWidth, container.clientWidth);
      }
    },
    [contextPercent, updateContextWidth]
  );

  return (
    <div
      className="grid h-full min-h-0"
      ref={containerRef}
      style={{
        gridTemplateColumns: `minmax(${minContextPaneWidth}px, ${contextPercent}%) 8px minmax(${minAiPaneWidth}px, 1fr)`
      }}
    >
      <div className="min-w-[320px] overflow-hidden">
        {children.context}
      </div>
      <div
        aria-label="Resize task panes"
        aria-orientation="vertical"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(contextPercent)}
        className="relative z-10 flex cursor-col-resize items-center justify-center bg-border outline-none hover:bg-ring/40 focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={onHandleKeyDown}
        onPointerDown={onHandlePointerDown}
        role="separator"
        tabIndex={0}
      >
        <div className="h-8 w-1 rounded-full bg-muted-foreground/60" />
      </div>
      <div className="min-w-[420px] overflow-hidden">
        {children.ai}
      </div>
    </div>
  );
}

function readSavedContextPercent(storageKey: string) {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return defaultContextPercent;
    const parsed = JSON.parse(value) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "contextPercent" in parsed &&
      typeof parsed.contextPercent === "number"
    ) {
      return clampContextPercent(parsed.contextPercent);
    }
  } catch {
    return defaultContextPercent;
  }

  return defaultContextPercent;
}

function saveContextPercent(storageKey: string, contextPercent: number) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({ contextPercent: clampContextPercent(contextPercent) })
  );
}

function clampContextPaneWidth(contextPaneWidth: number, containerWidth: number) {
  const maxContextPaneWidth = Math.max(minContextPaneWidth, containerWidth - minAiPaneWidth);
  return Math.min(Math.max(contextPaneWidth, minContextPaneWidth), maxContextPaneWidth);
}

function clampContextPercent(contextPercent: number) {
  return Math.min(Math.max(contextPercent, 20), 70);
}

function ContextPane({
  error,
  loading,
  onRefresh,
  sources,
  task,
  workspace
}: {
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  sources: Source[];
  task: Task | null;
  workspace: TaskWorkspaceInfo | null;
}) {
  const [contextDisplayMode, setContextDisplayMode] = useState<ContextDisplayMode>("rendered");
  const context = workspace?.context ?? "";
  const sectionHeadingClass = "text-sm font-semibold tracking-normal";

  return (
    <section className="flex h-full min-h-0 flex-col border-r bg-background">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b bg-card px-4 py-4">
        <div className="min-w-0 space-y-1.5">
          <h2 className={sectionHeadingClass}>Task</h2>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-normal">
              {task?.title ?? "Loading task..."}
            </h1>
          </div>
          <TaskStatusBadge status={task?.status} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={onRefresh} size="icon" title="Refresh context" type="button" variant="ghost">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-5 p-5">
          {error && <div className="error text-sm">{error}</div>}
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionHeadingClass}>Sources</h2>
              <span className="text-xs text-muted-foreground">{sources.length}</span>
            </div>
            <TaskSourceList loading={loading} sources={sources} />
          </section>
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionHeadingClass}>Context</h2>
              <div className="inline-flex rounded-md border bg-muted p-0.5">
                {(["rendered", "raw"] as const).map((mode) => (
                  <Button
                    className="h-7 rounded px-2 text-xs"
                    key={mode}
                    onClick={() => setContextDisplayMode(mode)}
                    size="sm"
                    type="button"
                    title={mode === "rendered" ? "Rendered" : "Raw"}
                    variant={contextDisplayMode === mode ? "secondary" : "ghost"}
                  >
                    {mode === "rendered" ? (
                      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <CodeXml aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
            {contextDisplayMode === "raw" ? (
              <pre className="min-h-[60vh] whitespace-pre-wrap rounded-md border bg-card p-3 text-xs leading-5">
                {loading && !workspace ? "Loading context..." : context || "No context file"}
              </pre>
            ) : (
              <div className="min-h-[60vh] rounded-md border bg-card p-4">
                {loading && !workspace ? (
                  <div className="text-sm text-muted-foreground">Loading context...</div>
                ) : context ? (
                  <MarkdownDocument content={context} />
                ) : (
                  <div className="text-sm text-muted-foreground">No context file</div>
                )}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </section>
  );
}

function TaskStatusBadge({ status }: { status: Task["status"] | undefined }) {
  return (
    <span className="mt-1 inline-flex h-5 w-fit items-center rounded border bg-muted px-2 text-[11px] font-medium uppercase leading-none text-muted-foreground">
      {status ?? "loading"}
    </span>
  );
}

function MarkdownDocument({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          a: ({ children, ...props }) => (
            <a
              {...props}
              className="text-link underline-offset-4 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-border pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em]">
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h1 className="mb-4 text-2xl font-semibold tracking-normal">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-3 border-b pb-2 text-lg font-semibold tracking-normal">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold tracking-normal">{children}</h3>
          ),
          li: ({ children }) => <li className="mb-1 leading-6">{children}</li>,
          ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-1">{children}</ol>,
          p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-md border bg-background p-3 text-xs leading-5">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="my-4 min-w-full table-auto">{children}</table>
            </div>
          ),
          td: ({ children }) => <td className="border px-2 py-1 align-top">{children}</td>,
          th: ({ children }) => (
            <th className="border bg-muted px-2 py-1 text-left font-semibold">{children}</th>
          ),
          ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1">{children}</ul>
        }}
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function TaskSourceList({ loading, sources }: { loading: boolean; sources: Source[] }) {
  if (loading && sources.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card p-3 text-sm text-muted-foreground">
        Loading sources...
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card p-3 text-sm text-muted-foreground">
        No sources attached to this task yet.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {sources.map((source) => (
        <article className="grid gap-2 rounded-md border bg-card p-3" key={source.id}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              <Link
                className="truncate text-sm font-semibold text-foreground hover:text-link"
                to={`/sources/${source.id}`}
              >
                {source.sourceTitle}
              </Link>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{source.sourceType}</span>
              <span>{source.provider ?? getSourceChannel(source) ?? "local"}</span>
              <span>{new Date(source.capturedAt).toLocaleString()}</span>
            </div>
          </div>
          {source.sourceUrl && (
            <a
              className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-link"
              href={source.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{source.sourceUrl}</span>
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

function getSourceChannel(source: Source) {
  const channel = source.metadata.channel;
  return typeof channel === "string" && channel.length > 0 ? channel : null;
}
