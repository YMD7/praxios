import type { Proposal, Task } from "@praxios/core";
import { Check, FileText, RefreshCw, SendHorizonal, X } from "lucide-react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentTerminalPanel } from "@/components/terminal/AgentTerminalPanel";
import type { AgentTerminalPanelHandle } from "@/components/terminal/AgentTerminalPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { api, type TaskWorkspaceInfo } from "@/api";
import type { TaskWorkbenchTab } from "./types";

const shareSnippet = "Context was updated for this task.";
const defaultContextPercent = 42;
const minContextPaneWidth = 320;
const minAiPaneWidth = 420;

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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contextCount, setContextCount] = useState(0);
  const [relatedSourceCount, setRelatedSourceCount] = useState(0);
  const [contextUpdated, setContextUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pendingContextProposals = useMemo(
    () =>
      proposals.filter(
        (proposal) => proposal.proposalType === "task_context" && proposal.status === "pending"
      ),
    [proposals]
  );
  const pendingApprovalCount = useMemo(
    () => proposals.filter((proposal) => proposal.status === "pending").length,
    [proposals]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [taskResult, contextResult, proposalResult, workspaceResult] = await Promise.all([
        api.getTask(tab.taskId),
        api.listTaskContext(tab.taskId),
        api.listTaskProposals(tab.taskId),
        api.getTaskWorkspace(tab.taskId)
      ]);

      setTask(taskResult.task);
      setWorkspace(workspaceResult.workspace);
      setProposals(proposalResult.proposals);
      setContextCount(contextResult.contextItems.length);
      setRelatedSourceCount(
        new Set(contextResult.contextItems.map((item) => item.sourceId).filter(Boolean)).size
      );
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

  async function applyProposal(proposalId: string) {
    setError(null);
    try {
      await api.applyProposal(proposalId);
      setContextUpdated(true);
      await load();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to apply proposal");
    }
  }

  async function rejectProposal(proposalId: string) {
    setError(null);
    try {
      await api.rejectProposal(proposalId);
      await load();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Failed to reject proposal");
    }
  }

  function shareToAi() {
    terminalRef.current?.insertText(shareSnippet);
    setContextUpdated(false);
  }

  return (
    <TaskSplitLayout storageKey={`praxios-task-workbench-${tab.taskId}`}>
      {{
        context: (
          <div className="h-full min-h-0">
            <ContextPane
              contextCount={contextCount}
              contextUpdated={contextUpdated}
              error={error}
              loading={loading}
              onApplyProposal={(proposalId) => void applyProposal(proposalId)}
              onRefresh={() => void load()}
              onRejectProposal={(proposalId) => void rejectProposal(proposalId)}
              onShareToAi={shareToAi}
              pendingApprovalCount={pendingApprovalCount}
              pendingContextProposals={pendingContextProposals}
              relatedSourceCount={relatedSourceCount}
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
  contextCount,
  contextUpdated,
  error,
  loading,
  onApplyProposal,
  onRefresh,
  onRejectProposal,
  onShareToAi,
  pendingApprovalCount,
  pendingContextProposals,
  relatedSourceCount,
  task,
  workspace
}: {
  contextCount: number;
  contextUpdated: boolean;
  error: string | null;
  loading: boolean;
  onApplyProposal: (proposalId: string) => void;
  onRefresh: () => void;
  onRejectProposal: (proposalId: string) => void;
  onShareToAi: () => void;
  pendingApprovalCount: number;
  pendingContextProposals: Proposal[];
  relatedSourceCount: number;
  task: Task | null;
  workspace: TaskWorkspaceInfo | null;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col border-r bg-background">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-normal">
              {task?.title ?? "Loading task..."}
            </h1>
            {contextUpdated && (
              <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-warning/15 px-2 text-xs font-semibold text-warning">
                Context updated
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {workspace?.path ?? "Preparing workspace"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            disabled={!contextUpdated}
            onClick={onShareToAi}
            size="sm"
            title="Share context update to AI"
            type="button"
            variant="outline"
          >
            <SendHorizonal aria-hidden="true" className="h-4 w-4" />
            Share to AI
          </Button>
          <Button onClick={onRefresh} size="icon" title="Refresh context" type="button" variant="ghost">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-4 p-4">
          {error && (
            <div className="error text-sm">{error}</div>
          )}

          <section className="grid gap-2">
            <h2 className="text-sm font-semibold tracking-normal">Task</h2>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Metric label="Status" value={task?.status ?? "-"} />
              <Metric label="Priority" value={task?.priority ?? "-"} />
              <Metric label="Due" value={task?.dueDate ?? "-"} />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {task?.description || "No description"}
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-sm font-semibold tracking-normal">Work Queue</h2>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Metric label="Context" value={String(contextCount)} />
              <Metric label="Sources" value={String(relatedSourceCount)} />
              <Metric label="Approvals" value={String(pendingApprovalCount)} />
            </div>
            <PendingContextUpdates
              onApply={onApplyProposal}
              onReject={onRejectProposal}
              proposals={pendingContextProposals}
            />
          </section>

          <section className="grid gap-2">
            <h2 className="text-sm font-semibold tracking-normal">context.md</h2>
            <pre className="max-h-[52vh] whitespace-pre-wrap rounded-md border p-3 text-xs leading-5">
              {loading && !workspace
                ? "Loading context..."
                : workspace?.context ?? "No context file"}
            </pre>
          </section>
        </div>
      </ScrollArea>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-card p-2">
      <div className="truncate text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function PendingContextUpdates({
  onApply,
  onReject,
  proposals
}: {
  onApply: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  proposals: Proposal[];
}) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card p-3 text-sm text-muted-foreground">
        No pending context updates
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {proposals.map((proposal) => (
        <article className="grid gap-2 rounded-md border bg-card p-3" key={proposal.id}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              <strong className="truncate text-sm">{getPayloadString(proposal, "title")}</strong>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {getPayloadString(proposal, "summary")}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => onApply(proposal.id)} size="sm" type="button">
              <Check aria-hidden="true" className="h-4 w-4" />
              Apply
            </Button>
            <Button
              onClick={() => onReject(proposal.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function getPayloadString(proposal: Proposal, key: string) {
  const value = proposal.payload[key];
  return typeof value === "string" && value.length > 0 ? value : "-";
}
