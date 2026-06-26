import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { proposalsApi } from '../../lib/api.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Textarea } from '../../components/ui/Textarea.js';
import type { Proposal } from '@praxios/shared';

export const Route = createFileRoute('/approvals/')({
  component: ApprovalsPage,
});

const statusBadgeVariant: Record<string, 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  revised: 'purple',
  applied: 'blue',
};

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const reviewMutation = useMutation({
    mutationFn: ({ action }: { action: 'approve' | 'reject' | 'revise' }) =>
      proposalsApi.review(proposal.id, action, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setComment('');
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => proposalsApi.apply(proposal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['wiki'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{proposal.proposalType}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Badge variant={statusBadgeVariant[proposal.status]}>{proposal.status}</Badge>
              {proposal.taskId && (
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: proposal.taskId }}
                  className="hover:underline"
                >
                  Task
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Payload</h4>
          <pre className="mt-1 rounded-md bg-gray-50 p-3 text-xs">
            {JSON.stringify(proposal.payload, null, 2)}
          </pre>
        </div>
        {proposal.rationale && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Rationale</h4>
            <p className="mt-1 text-sm">{proposal.rationale}</p>
          </div>
        )}

        {proposal.status === 'pending' && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Review comment (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={() => reviewMutation.mutate({ action: 'approve' })}>Approve</Button>
              <Button
                variant="secondary"
                onClick={() => reviewMutation.mutate({ action: 'revise' })}
              >
                Revise
              </Button>
              <Button
                variant="destructive"
                onClick={() => reviewMutation.mutate({ action: 'reject' })}
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {proposal.status === 'approved' && (
          <div className="border-t border-gray-100 pt-4">
            <Button onClick={() => applyMutation.mutate()}>Apply Proposal</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalsPage() {
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => proposalsApi.list(),
  });

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Approval Queue</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : proposals.length === 0 ? (
        <p className="text-gray-500">No proposals awaiting review.</p>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}
