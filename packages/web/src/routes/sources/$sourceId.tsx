import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { proposalsApi, sourcesApi } from '../../lib/api.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';

export const Route = createFileRoute('/sources/$sourceId')({
  component: SourceViewerPage,
});

function SourceViewerPage() {
  const { sourceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { data: source, isLoading } = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => sourcesApi.get(sourceId),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => proposalsApi.list(),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => sourcesApi.analyze(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setAnalysisError(null);
    },
    onError: (error: Error) => {
      setAnalysisError(error.message);
    },
  });

  const linkedProposals = proposals.filter((p) => p.sourceIds.includes(sourceId));

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!source) return <div className="p-8">Source not found</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/sources" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to sources
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-bold">{source.sourceTitle || 'Untitled Source'}</h1>
        <Button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze with AI'}
        </Button>
      </div>

      {analysisError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{analysisError}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm">{source.content}</pre>
        </CardContent>
      </Card>

      <h2 className="mb-4 mt-8 text-xl font-bold">Generated Proposals</h2>
      {linkedProposals.length === 0 ? (
        <p className="text-gray-500">No proposals generated from this source yet.</p>
      ) : (
        <div className="space-y-4">
          {linkedProposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{proposal.proposalType}</CardTitle>
                  <Badge variant={proposal.status === 'pending' ? 'yellow' : 'green'}>
                    {proposal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">{proposal.rationale}</p>
                <pre className="rounded-md bg-gray-50 p-3 text-xs">
                  {JSON.stringify(proposal.payload, null, 2)}
                </pre>
                <Link
                  to="/approvals"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Review in approval queue →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
