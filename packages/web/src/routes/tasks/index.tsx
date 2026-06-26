import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { tasksApi } from '../../lib/api.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Select } from '../../components/ui/Select.js';
import { TaskForm } from '../../components/TaskForm.js';
import { taskPriorityLabels, taskStatusLabels, taskPriorityOptions, taskStatusOptions } from '../../lib/labels.js';
import type { TaskPriority, TaskStatus } from '@praxios/shared';

export const Route = createFileRoute('/tasks/')({
  component: TaskListPage,
});

const statusBadgeVariant: Record<TaskStatus, 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  new: 'default',
  triaging: 'yellow',
  ready: 'blue',
  in_progress: 'blue',
  waiting: 'yellow',
  needs_approval: 'red',
  completed: 'green',
  archived: 'default',
};

const priorityBadgeVariant: Record<TaskPriority, 'default' | 'blue' | 'green' | 'yellow' | 'red'> = {
  low: 'default',
  medium: 'green',
  high: 'yellow',
  urgent: 'red',
};

function TaskListPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', { status: statusFilter, priority: priorityFilter }],
    queryFn: () =>
      tasksApi.list({
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      }),
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : 'New Task'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm onSubmit={createMutation.mutate} onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
              options={[{ value: '', label: 'All Statuses' }, ...taskStatusOptions]}
              className="w-48"
            />
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
              options={[{ value: '', label: 'All Priorities' }, ...taskPriorityOptions]}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-gray-500">No tasks yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left font-medium text-gray-500">Title</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Status</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Priority</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">
                      <Link
                        to="/tasks/$taskId"
                        params={{ taskId: task.id }}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="py-3">
                      <Badge variant={statusBadgeVariant[task.status]}>
                        {taskStatusLabels[task.status]}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={priorityBadgeVariant[task.priority]}>
                        {taskPriorityLabels[task.priority]}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
