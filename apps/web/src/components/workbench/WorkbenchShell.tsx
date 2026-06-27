import {
  ClipboardCheck,
  Database,
  HomeIcon,
  ListTodo,
  Network,
  SearchCheck,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
import type { AgentTerminalPanelHandle } from "@/components/terminal/AgentTerminalPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApprovalQueue } from "@/views/ApprovalQueue";
import { Home } from "@/views/Home";
import { SourceList } from "@/views/SourceList";
import { SourceViewer } from "@/views/SourceViewer";
import { TaskList } from "@/views/TaskList";
import { WikiList } from "@/views/WikiList";
import { WikiPageView } from "@/views/WikiPageView";
import { HOME_TAB_ID, getTaskTabId, type TaskWorkbenchTab, type WorkbenchTab } from "./types";
import { useWorkbenchTabs } from "./use-workbench-tabs";
import { TaskWorkbenchPanel } from "./TaskWorkbenchPanel";

const navigation = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/sources", label: "Sources", icon: Database },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/wiki", label: "Wiki", icon: Network }
];

export function WorkbenchShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const terminalRefs = useRef(new Map<string, AgentTerminalPanelHandle>());
  const initialRouteSyncedRef = useRef(false);
  const {
    activeTabId,
    closeTab,
    openTabs,
    openTaskTab,
    setActiveTabId,
    taskTabs,
    updateTaskTabTitle
  } = useWorkbenchTabs();

  const activeTaskTab = useMemo(
    () => taskTabs.find((tab) => tab.id === activeTabId),
    [activeTabId, taskTabs]
  );
  const handleTaskLoaded = useCallback(
    (task: { id: string; title: string }) => updateTaskTabTitle(task.id, task.title),
    [updateTaskTabTitle]
  );

  useEffect(() => {
    const taskId = matchTaskPath(location.pathname);

    if (!initialRouteSyncedRef.current) {
      initialRouteSyncedRef.current = true;
      if (!taskId && activeTaskTab) {
        navigate(`/tasks/${activeTaskTab.taskId}`, { replace: true });
        return;
      }
    }

    if (!taskId) {
      setActiveTabId(HOME_TAB_ID);
      return;
    }

    const tabId = getTaskTabId(taskId);
    if (!taskTabs.some((tab) => tab.id === tabId)) {
      openTaskTab({ id: taskId, title: "Loading task..." });
      return;
    }
    setActiveTabId(tabId);
  }, [
    activeTaskTab,
    location.pathname,
    navigate,
    openTaskTab,
    setActiveTabId,
    taskTabs
  ]);

  function activateTab(tab: WorkbenchTab) {
    setActiveTabId(tab.id);
    navigate(tab.kind === "home" ? "/" : `/tasks/${tab.taskId}`);
  }

  function closeWorkbenchTab(tab: TaskWorkbenchTab) {
    const nextTab = getFallbackTab(openTabs, tab.id, activeTabId);
    closeTab(tab.id, nextTab.id);
    terminalRefs.current.get(tab.id)?.closeSession();
    terminalRefs.current.delete(tab.id);
    navigate(nextTab.kind === "home" ? "/" : `/tasks/${nextTab.taskId}`);
  }

  function registerTerminal(tabId: string, handle: AgentTerminalPanelHandle | null) {
    if (handle) {
      terminalRefs.current.set(tabId, handle);
    } else {
      terminalRefs.current.delete(tabId);
    }
  }

  return (
    <div className="flex h-screen min-h-0 bg-background text-foreground">
      <GlobalMenu onNavigateHome={() => setActiveTabId(HOME_TAB_ID)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TabStrip
          activeTabId={activeTabId}
          onActivate={activateTab}
          onClose={closeWorkbenchTab}
          tabs={openTabs}
        />
        <div className="min-h-0 flex-1">
          <section className={cn("h-full min-h-0", activeTabId !== HOME_TAB_ID && "hidden")}>
            <HomeTabPanel />
          </section>
          {taskTabs.map((tab) => (
            <section
              className={cn("h-full min-h-0", activeTabId !== tab.id && "hidden")}
              key={tab.id}
            >
              <TaskWorkbenchPanel
                onRegisterTerminal={(handle) => registerTerminal(tab.id, handle)}
                onTaskLoaded={handleTaskLoaded}
                tab={tab}
              />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function GlobalMenu({ onNavigateHome }: { onNavigateHome: () => void }) {
  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center border-r bg-sidebar py-3 text-sidebar-foreground">
      <Link
        aria-label="Praxios Home"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary hover:bg-primary/25"
        onClick={onNavigateHome}
        to="/"
      >
        <SearchCheck aria-hidden="true" className="h-5 w-5" />
      </Link>
      <nav className="grid gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "flex h-11 w-11 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isActive && "bg-sidebar-active text-sidebar-foreground"
                )
              }
              key={item.to}
              onClick={onNavigateHome}
              title={item.label}
              to={item.to}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

function TabStrip({
  activeTabId,
  onActivate,
  onClose,
  tabs
}: {
  activeTabId: string;
  onActivate: (tab: WorkbenchTab) => void;
  onClose: (tab: TaskWorkbenchTab) => void;
  tabs: WorkbenchTab[];
}) {
  return (
    <div className="flex h-11 shrink-0 items-end gap-1 border-b bg-card px-2">
      {tabs.map((tab) => (
        <div
          className={cn(
            "mb-[-1px] flex h-9 max-w-[240px] items-center gap-1 rounded-t-md border px-2",
            activeTabId === tab.id
              ? "border-border border-b-background bg-background text-foreground"
              : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
          key={tab.id}
        >
          <button
            className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium"
            onClick={() => onActivate(tab)}
            type="button"
          >
            {tab.title}
          </button>
          {tab.kind === "task" && (
            <Button
              aria-label={`Close ${tab.title}`}
              className="h-6 w-6 shrink-0 rounded-md p-0"
              onClick={() => onClose(tab)}
              size="icon"
              title="Close tab"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function HomeTabPanel() {
  return (
    <div className="h-full min-h-0 overflow-auto p-5">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/approvals" element={<ApprovalQueue />} />
        <Route path="/wiki" element={<WikiList />} />
        <Route path="/wiki/:pageId" element={<WikiPageView />} />
        <Route path="/sources" element={<SourceList />} />
        <Route path="/sources/:sourceId" element={<SourceViewer />} />
        <Route path="/tasks/:taskId" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function matchTaskPath(pathname: string) {
  const match = pathname.match(/^\/tasks\/([^/]+)$/);
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

function getFallbackTab(tabs: WorkbenchTab[], closingTabId: string, activeTabId: string) {
  if (closingTabId !== activeTabId) {
    return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]!;
  }

  const closingIndex = tabs.findIndex((tab) => tab.id === closingTabId);
  return tabs[closingIndex - 1] ?? tabs[closingIndex + 1] ?? tabs[0]!;
}
