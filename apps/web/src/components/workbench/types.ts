import type { Task } from "@praxios/core";

export const HOME_TAB_ID = "home";

export type HomeWorkbenchTab = {
  id: typeof HOME_TAB_ID;
  kind: "home";
  title: string;
  closable: false;
};

export type TaskWorkbenchTab = {
  id: string;
  kind: "task";
  taskId: string;
  title: string;
  closable: true;
};

export type WorkbenchTab = HomeWorkbenchTab | TaskWorkbenchTab;

export const homeTab: HomeWorkbenchTab = {
  id: HOME_TAB_ID,
  kind: "home",
  title: "Home",
  closable: false
};

export function isFixedWorkbenchTab(tab: WorkbenchTab): tab is HomeWorkbenchTab {
  return tab.closable === false;
}

export function getTaskTabId(taskId: string) {
  return `task:${taskId}`;
}

export function createTaskTab(task: Pick<Task, "id" | "title">): TaskWorkbenchTab {
  return {
    id: getTaskTabId(task.id),
    kind: "task",
    taskId: task.id,
    title: task.title || "Untitled task",
    closable: true
  };
}
