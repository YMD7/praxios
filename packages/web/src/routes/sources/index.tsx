import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { sourcesApi } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { Input } from '../../components/ui/Input.js';

export const Route = createFileRoute('/sources/')({
  component: SourcesPage,
});

function SourcesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => sourcesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: sourcesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setTitle('');
      setContent('');
      setShowForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      sourceType: 'manual',
      sourceTitle: title || null,
      sourceUrl: null,
      sourceRefId: null,
      provider: 'manual',
      occurredAt: null,
      metadata: {},
      content,
    });
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sources</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : 'New Source'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Source</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Content</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Source List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : sources.length === 0 ? (
            <p className="text-gray-500">No sources yet.</p>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <Link
                  key={source.id}
                  to="/sources/$sourceId"
                  params={{ sourceId: source.id }}
                  className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="font-medium">{source.sourceTitle || 'Untitled Source'}</div>
                  <div className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {source.contentPreview || 'No preview'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
