import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { wikiApi } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Textarea } from '../../components/ui/Textarea.js';

export const Route = createFileRoute('/wiki/')({
  component: WikiIndexPage,
});

function WikiIndexPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['wiki'],
    queryFn: () => wikiApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: wikiApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki'] });
      setTitle('');
      setBody('');
      setShowForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, body });
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wiki</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : 'New Page'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Wiki Page</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Body</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Use [[PageId]] or [[PageId|Display Name]] for wiki links"
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
          <CardTitle>Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : pages.length === 0 ? (
            <p className="text-gray-500">No wiki pages yet.</p>
          ) : (
            <div className="space-y-2">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  to="/wiki/$pageId"
                  params={{ pageId: page.id }}
                  className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="font-medium">{page.title}</div>
                  <div className="text-sm text-gray-500">
                    Updated {new Date(page.updatedAt).toLocaleDateString()}
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
