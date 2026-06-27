import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HOME_TAB_ID,
  createTaskTab,
  getTaskTabId,
  homeTab,
  type TaskWorkbenchTab,
  type WorkbenchTab
} from "./types";

const storageKey = "praxios.workbench.tabs.v1";

interface PersistedWorkbenchState {
  activeTabId?: string;
  taskTabs?: Array<Pick<TaskWorkbenchTab, "id" | "kind" | "taskId" | "title" | "closable">>;
}

function readPersistedState(): {
  activeTabId: string;
  taskTabs: TaskWorkbenchTab[];
} {
  if (typeof window === "undefined") {
    return { activeTabId: HOME_TAB_ID, taskTabs: [] };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { activeTabId: HOME_TAB_ID, taskTabs: [] };
    }

    const parsed = JSON.parse(raw) as PersistedWorkbenchState;
    const seen = new Set<string>();
    const taskTabs = (parsed.taskTabs ?? []).flatMap((tab) => {
      if (tab.kind !== "task" || !tab.taskId) return [];
      const id = getTaskTabId(tab.taskId);
      if (seen.has(id)) return [];
      seen.add(id);
      return [
        {
          id,
          kind: "task" as const,
          taskId: tab.taskId,
          title: tab.title || "Untitled task",
          closable: true as const
        }
      ];
    });

    const activeTabId = [HOME_TAB_ID, ...taskTabs.map((tab) => tab.id)].includes(
      parsed.activeTabId ?? ""
    )
      ? parsed.activeTabId!
      : HOME_TAB_ID;

    return { activeTabId, taskTabs };
  } catch {
    return { activeTabId: HOME_TAB_ID, taskTabs: [] };
  }
}

export function useWorkbenchTabs() {
  const initialState = useMemo(readPersistedState, []);
  const [taskTabs, setTaskTabs] = useState<TaskWorkbenchTab[]>(initialState.taskTabs);
  const [activeTabId, setActiveTabId] = useState(initialState.activeTabId);

  const openTabs = useMemo<WorkbenchTab[]>(() => [homeTab, ...taskTabs], [taskTabs]);

  useEffect(() => {
    if (taskTabs.length === 0 && activeTabId !== HOME_TAB_ID) {
      setActiveTabId(HOME_TAB_ID);
    }
  }, [activeTabId, taskTabs.length]);

  useEffect(() => {
    const validIds = new Set([HOME_TAB_ID, ...taskTabs.map((tab) => tab.id)]);
    if (!validIds.has(activeTabId)) {
      setActiveTabId(HOME_TAB_ID);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeTabId,
        taskTabs
      } satisfies PersistedWorkbenchState)
    );
  }, [activeTabId, taskTabs]);

  const openTaskTab = useCallback((task: { id: string; title: string }) => {
    const tab = createTaskTab(task);
    setTaskTabs((current) =>
      current.some((item) => item.id === tab.id) ? current : [...current, tab]
    );
    setActiveTabId(tab.id);
    return tab;
  }, []);

  const closeTab = useCallback((tabId: string, fallbackActiveTabId = HOME_TAB_ID) => {
    if (tabId === HOME_TAB_ID) return;

    setTaskTabs((current) => current.filter((tab) => tab.id !== tabId));
    setActiveTabId((current) => (current === tabId ? fallbackActiveTabId : current));
  }, []);

  const updateTaskTabTitle = useCallback((taskId: string, title: string) => {
    const tabId = getTaskTabId(taskId);
    setTaskTabs((current) => {
      let changed = false;
      const nextTabs = current.map((tab) => {
        if (tab.id !== tabId || tab.title === title) return tab;
        changed = true;
        return { ...tab, title };
      });
      return changed ? nextTabs : current;
    });
  }, []);

  return {
    activeTabId,
    closeTab,
    openTabs,
    openTaskTab,
    setActiveTabId,
    taskTabs,
    updateTaskTabTitle
  };
}
