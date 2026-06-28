import {
  Database,
  HomeIcon,
  ListTodo,
  SearchCheck,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Home } from "@/views/Home";
import { SourceList } from "@/views/SourceList";
import { SourceViewer } from "@/views/SourceViewer";
import { TaskList } from "@/views/TaskList";
import {
  HOME_TAB_ID,
  getTaskTabId,
  isFixedWorkbenchTab,
  type TaskWorkbenchTab,
  type WorkbenchTab
} from "./types";
import { useWorkbenchTabs } from "./use-workbench-tabs";
import { TaskWorkbenchPanel } from "./TaskWorkbenchPanel";

const navigation = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/sources", label: "Sources", icon: Database }
];

export function WorkbenchShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const terminalRefs = useRef(new Map<string, AgentTerminalPanelHandle>());
  const initialRouteSyncedRef = useRef(false);
  const closingTaskIdsRef = useRef(new Set<string>());
  const [mountedTaskTabIds, setMountedTaskTabIds] = useState<Set<string>>(() => new Set());
  const {
    activeTabId,
    closeTab,
    openTabs,
    openTaskTab,
    setActiveTabId,
    taskTabs,
    updateTaskTabTitle
  } = useWorkbenchTabs();

  const routeTaskId = matchTaskPath(location.pathname);
  const activeTaskTab = useMemo(
    () => taskTabs.find((tab) => tab.id === activeTabId),
    [activeTabId, taskTabs]
  );
  const routeTaskTab = useMemo(
    () => taskTabs.find((tab) => tab.id === (routeTaskId ? getTaskTabId(routeTaskId) : "")),
    [routeTaskId, taskTabs]
  );
  const mountedTaskTabs = useMemo(
    () => taskTabs.filter((tab) => mountedTaskTabIds.has(tab.id) || tab.id === routeTaskTab?.id),
    [mountedTaskTabIds, routeTaskTab?.id, taskTabs]
  );
  const handleTaskLoaded = useCallback(
    (task: { id: string; title: string }) => updateTaskTabTitle(task.id, task.title),
    [updateTaskTabTitle]
  );

  useEffect(() => {
    if (!routeTaskTab) return;
    setMountedTaskTabIds((current) => addMountedTabId(current, routeTaskTab.id));
  }, [routeTaskTab]);

  useEffect(() => {
    const validTabIds = new Set(taskTabs.map((tab) => tab.id));
    setMountedTaskTabIds((current) => filterMountedTabIds(current, validTabIds));
  }, [taskTabs]);

  useEffect(() => {
    if (!initialRouteSyncedRef.current) {
      initialRouteSyncedRef.current = true;
      if (location.pathname === "/" && activeTaskTab) {
        navigate(`/tasks/${activeTaskTab.taskId}`, { replace: true });
        return;
      }
    }

    if (!routeTaskId) {
      closingTaskIdsRef.current.clear();
      setActiveTabId(HOME_TAB_ID);
      return;
    }

    for (const closingTaskId of closingTaskIdsRef.current) {
      if (closingTaskId !== routeTaskId) {
        closingTaskIdsRef.current.delete(closingTaskId);
      }
    }

    if (closingTaskIdsRef.current.has(routeTaskId)) {
      return;
    }

    const tabId = getTaskTabId(routeTaskId);
    if (!taskTabs.some((tab) => tab.id === tabId)) {
      openTaskTab({ id: routeTaskId, title: "Loading task..." });
      return;
    }
    setActiveTabId(tabId);
  }, [
    activeTaskTab,
    location.pathname,
    navigate,
    openTaskTab,
    routeTaskId,
    setActiveTabId,
    taskTabs
  ]);

  function activateTab(tab: WorkbenchTab) {
    setActiveTabId(tab.id);
    navigate(tab.kind === "home" ? "/tasks" : `/tasks/${tab.taskId}`);
  }

  function closeWorkbenchTab(tab: TaskWorkbenchTab) {
    const nextTab = getFallbackTab(openTabs, tab.id, activeTabId);
    closingTaskIdsRef.current.add(tab.taskId);
    closeTab(tab.id, nextTab.id);
    terminalRefs.current.delete(tab.id);
    setMountedTaskTabIds((current) => removeMountedTabId(current, tab.id));
    navigate(nextTab.kind === "home" ? "/tasks" : `/tasks/${nextTab.taskId}`);
  }

  function handleTaskDeleted(taskId: string) {
    const tab = taskTabs.find((item) => item.taskId === taskId);
    if (!tab) return;

    const shouldNavigate = activeTabId === tab.id || routeTaskId === taskId;
    const nextTab = getFallbackTab(openTabs, tab.id, activeTabId);

    closingTaskIdsRef.current.add(taskId);
    closeTab(tab.id, nextTab.id);
    terminalRefs.current.get(tab.id)?.closeSession();
    terminalRefs.current.delete(tab.id);
    setMountedTaskTabIds((current) => removeMountedTabId(current, tab.id));

    if (shouldNavigate) {
      navigate(nextTab.kind === "home" ? "/tasks" : `/tasks/${nextTab.taskId}`);
    }
  }

  const registerTerminal = useCallback((tabId: string, handle: AgentTerminalPanelHandle | null) => {
    if (handle) {
      terminalRefs.current.set(tabId, handle);
    } else {
      terminalRefs.current.delete(tabId);
    }
  }, []);

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
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {!routeTaskTab && (
            <div className="absolute inset-0">
              <HomeTabPanel onTaskDeleted={handleTaskDeleted} />
            </div>
          )}
          {mountedTaskTabs.map((tab) => (
            <div
              aria-hidden={routeTaskTab?.id !== tab.id}
              className={cn(
                "absolute inset-0",
                routeTaskTab?.id === tab.id ? "block" : "hidden"
              )}
              key={tab.id}
            >
              <TaskWorkbenchPanel
                isActive={routeTaskTab?.id === tab.id}
                onRegisterTerminal={registerTerminal}
                onTaskLoaded={handleTaskLoaded}
                tab={tab}
              />
            </div>
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
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-sidebar-foreground hover:bg-primary/25"
        onClick={onNavigateHome}
        to="/"
      >
        <SearchCheck
          aria-hidden="true"
          className="h-5 w-5 !text-sidebar-foreground"
        />
      </Link>
      <nav className="grid gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "flex h-11 w-11 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent",
                  isActive && "bg-sidebar-active text-sidebar-foreground"
                )
              }
              key={item.to}
              onClick={onNavigateHome}
              title={item.label}
              to={item.to}
            >
              <Icon
                aria-hidden="true"
                className="h-5 w-5 !text-sidebar-foreground"
              />
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
    <div className="flex h-11 shrink-0 items-end border-b bg-card px-2">
      {tabs.map((tab, index) => {
        const fixed = isFixedWorkbenchTab(tab);
        return (
          <div
            className={cn(
              "flex h-9 max-w-[240px] items-center gap-1 border border-b-0 px-2",
              index === 0 && "mr-1",
              activeTabId === tab.id
                ? cn(
                    "rounded-t-lg",
                    fixed
                      ? "border-border bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-background text-foreground"
                  )
                : cn(
                    "text-muted-foreground hover:bg-muted/80",
                    fixed
                      ? "border-border bg-primary/10 text-primary"
                      : "border-muted-foreground/30 bg-muted/60"
                  )
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
            {!fixed && (
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
        );
      })}
    </div>
  );
}

function HomeTabPanel({ onTaskDeleted }: { onTaskDeleted: (taskId: string) => void }) {
  return (
    <div className="h-full min-h-0 overflow-auto p-5">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<TaskList onTaskDeleted={onTaskDeleted} />} />
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

function addMountedTabId(current: Set<string>, tabId: string) {
  if (current.has(tabId)) return current;
  const next = new Set(current);
  next.add(tabId);
  return next;
}

function removeMountedTabId(current: Set<string>, tabId: string) {
  if (!current.has(tabId)) return current;
  const next = new Set(current);
  next.delete(tabId);
  return next;
}

function filterMountedTabIds(current: Set<string>, validTabIds: Set<string>) {
  let changed = false;
  const next = new Set<string>();
  for (const tabId of current) {
    if (validTabIds.has(tabId)) {
      next.add(tabId);
    } else {
      changed = true;
    }
  }
  return changed ? next : current;
}
