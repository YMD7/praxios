import { useState } from 'react';
import type { CreateTask, TaskPriority, TaskStatus } from '@praxios/shared';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Select } from './ui/Select.js';
import { Textarea } from './ui/Textarea.js';
import { taskPriorityOptions, taskStatusOptions } from '../lib/labels.js';

interface TaskFormProps {
  initial?: Partial<CreateTask>;
  onSubmit: (data: CreateTask) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function TaskForm({ initial = {}, onSubmit, onCancel, submitLabel = 'Save' }: TaskFormProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial.status ?? 'new');
  const [priority, setPriority] = useState<TaskPriority>(initial.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(
    initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 16) : ''
  );
  const [completionCriteria, setCompletionCriteria] = useState(initial.completionCriteria ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      triggerId: null,
      completionCriteria: completionCriteria || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            options={taskStatusOptions}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Priority</label>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={taskPriorityOptions}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Due Date</label>
        <Input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Completion Criteria</label>
        <Textarea
          value={completionCriteria}
          onChange={(e) => setCompletionCriteria(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
