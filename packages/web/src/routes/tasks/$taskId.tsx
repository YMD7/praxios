import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { proposalsApi, sourcesApi, tasksApi } from '../../lib/api.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Select } from '../../components/ui/Select.js';
import { TaskForm } from '../../components/TaskForm.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { taskPriorityLabels, taskStatusLabels } from '../../lib/labels.js';
import type { ProposalKind, TaskPriority, TaskStatus } from '@praxios/shared';

export const Route = createFileRoute('/tasks/$taskId')({
  component: TaskWorkspacePage,
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

const proposalStatusBadgeVariant: Record<string, 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  revised: 'purple',
  applied: 'blue',
};

const proposalKindOptions = [
  { value: 'task_proposal', label: 'Task Proposal' },
  { value: 'wiki_update_proposal', label: 'Wiki Update Proposal' },
  { value: 'message_proposal', label: 'Message Proposal' },
];

function TaskWorkspacePage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalKind, setProposalKind] = useState<ProposalKind>('task_proposal');
  const [proposalSourceId, setProposalSourceId] = useState('');
  const [proposalPayload, setProposalPayload] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => proposalsApi.list(),
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => sourcesApi.list(),
  });

  const taskProposals = proposals.filter((p) => p.taskId === taskId);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.update>[1]) => tasksApi.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate({ to: '/tasks' });
    },
  });

  const createProposalMutation = useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowProposalForm(false);
      setProposalSourceId('');
      setProposalPayload('');
    },
  });

  const handleProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProposalMutation.mutate({
      proposalType: proposalKind,
      destination: proposalKind === 'task_proposal' ? 'task' : proposalKind === 'wiki_update_proposal' ? 'wiki' : 'message',
      taskId,
      sourceIds: proposalSourceId ? [proposalSourceId] : [],
      payload: proposalPayload ? { text: proposalPayload } : {},
      evidence: [],
      rationale: null,
      createdBy: 'user',
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!task) return <div className="p-8">Task not found</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/tasks" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to tasks
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="mt-2 flex gap-2">
            <Badge variant={statusBadgeVariant[task.status]}>{taskStatusLabels[task.status]}</Badge>
            <Badge variant={priorityBadgeVariant[task.priority]}>{taskPriorityLabels[task.priority]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
            Delete
          </Button>
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              initial={task}
              onSubmit={updateMutation.mutate}
              onCancel={() => setIsEditing(false)}
              submitLabel="Update"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="mt-1 whitespace-pre-wrap">{task.description || 'No description'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Completion Criteria</h4>
                <p className="mt-1 whitespace-pre-wrap">{task.completionCriteria || 'Not set'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Due Date</h4>
                <p className="mt-1">{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Proposals</CardTitle>
                <Button size="sm" onClick={() => setShowProposalForm((v) => !v)}>
                  {showProposalForm ? 'Close' : 'Add Proposal'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showProposalForm && (
                <form onSubmit={handleProposalSubmit} className="mb-6 space-y-4 border-b border-gray-100 pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Kind</label>
                      <Select
                        value={proposalKind}
                        onChange={(e) => setProposalKind(e.target.value as ProposalKind)}
                        options={proposalKindOptions}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Source</label>
                      <Select
                        value={proposalSourceId}
                        onChange={(e) => setProposalSourceId(e.target.value)}
                        options={[
                          { value: '', label: 'No source' },
                          ...sources.map((s) => ({ value: s.id, label: s.sourceTitle || s.id })),
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Proposal Content</label>
                    <Textarea
                      value={proposalPayload}
                      onChange={(e) => setProposalPayload(e.target.value)}
                      rows={3}
                      placeholder="提案の内容を入力"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Save Proposal</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowProposalForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {taskProposals.length === 0 ? (
                <p className="text-gray-500">No proposals yet.</p>
              ) : (
                <div className="space-y-3">
                  {taskProposals.map((proposal) => (
                    <div key={proposal.id} className="rounded-md border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{proposal.proposalType}</span>
                        <Badge variant={proposalStatusBadgeVariant[proposal.status]}>
                          {proposal.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {proposal.rationale ||
                          (typeof proposal.payload.text === 'string' ? proposal.payload.text : null) ||
                          'No details'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
