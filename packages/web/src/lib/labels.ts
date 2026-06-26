import type { TaskPriority, TaskStatus } from '@praxios/shared';

export const taskStatusLabels: Record<TaskStatus, string> = {
  new: 'New',
  triaging: 'Triaging',
  ready: 'Ready',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  needs_approval: 'Needs Approval',
  completed: 'Completed',
  archived: 'Archived',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const taskStatusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'new', label: taskStatusLabels.new },
  { value: 'triaging', label: taskStatusLabels.triaging },
  { value: 'ready', label: taskStatusLabels.ready },
  { value: 'in_progress', label: taskStatusLabels.in_progress },
  { value: 'waiting', label: taskStatusLabels.waiting },
  { value: 'needs_approval', label: taskStatusLabels.needs_approval },
  { value: 'completed', label: taskStatusLabels.completed },
  { value: 'archived', label: taskStatusLabels.archived },
];

export const taskPriorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: taskPriorityLabels.low },
  { value: 'medium', label: taskPriorityLabels.medium },
  { value: 'high', label: taskPriorityLabels.high },
  { value: 'urgent', label: taskPriorityLabels.urgent },
];
