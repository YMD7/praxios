import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { slugify } from '@praxios/shared';
import { useState } from 'react';
import { wikiApi } from '../../lib/api.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Textarea } from '../../components/ui/Textarea.js';

export const Route = createFileRoute('/wiki/$pageId')({
  component: WikiPage,
});

function renderBody(body: string) {
  const parts = body.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/);
    if (match) {
      const pageId = slugify(match[1].trim());
      const text = match[2]?.trim() || match[1].trim();
      return (
        <Link
          key={i}
          to="/wiki/$pageId"
          params={{ pageId }}
          className="font-medium text-blue-600 hover:underline"
        >
          {text}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function WikiPage() {
  const { pageId } = Route.useParams();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: page, isLoading } = useQuery({
    queryKey: ['wiki', pageId],
    queryFn: () => wikiApi.get(pageId),
  });

  const updateMutation = useMutation({
    mutationFn: () => wikiApi.update(pageId, { title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', pageId] });
      queryClient.invalidateQueries({ queryKey: ['wiki'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => wikiApi.delete(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki'] });
      // Navigation handled by redirect after deletion is not trivial here
    },
  });

  const startEditing = () => {
    if (page) {
      setTitle(page.title);
      setBody(page.body);
      setIsEditing(true);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!page) return <div className="p-8">Wiki page not found</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/wiki" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to wiki
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        {isEditing ? (
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold" />
        ) : (
          <h1 className="text-2xl font-bold">{page.title}</h1>
        )}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={() => updateMutation.mutate()}>Save</Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEditing}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardContent className="pt-6">
              {isEditing ? (
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={20} />
              ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {renderBody(page.body)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Outgoing Links</CardTitle>
            </CardHeader>
            <CardContent>
              {page.outgoing.length === 0 ? (
                <p className="text-sm text-gray-500">No links</p>
              ) : (
                <ul className="space-y-2">
                  {page.outgoing.map((link) => (
                    <li key={link.id} className="flex items-center gap-2 text-sm">
                      <Link
                        to="/wiki/$pageId"
                        params={{ pageId: link.toPageId }}
                        className="hover:underline"
                      >
                        {link.anchorText || link.toPageId}
                      </Link>
                      <Badge variant={link.status === 'resolved' ? 'green' : 'yellow'}>
                        {link.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backlinks</CardTitle>
            </CardHeader>
            <CardContent>
              {page.backlinks.length === 0 ? (
                <p className="text-sm text-gray-500">No backlinks</p>
              ) : (
                <ul className="space-y-2">
                  {page.backlinks.map((link) => (
                    <li key={link.id} className="text-sm">
                      <Link
                        to="/wiki/$pageId"
                        params={{ pageId: link.fromPageId }}
                        className="hover:underline"
                      >
                        {link.fromPageId}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
