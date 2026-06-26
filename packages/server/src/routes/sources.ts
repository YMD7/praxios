import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSourceSchema } from '@praxios/shared';
import {
  createSource,
  deleteSource,
  getSource,
  getSourceContent,
  listSources,
} from '../services/source.js';
import { createProposal } from '../services/proposal.js';
import { aiProvider } from '../ai/provider.js';

const app = new Hono();

app.get('/', async (c) => {
  const items = await listSources();
  return c.json({ items });
});

app.post('/', zValidator('json', createSourceSchema), async (c) => {
  const input = c.req.valid('json');
  const source = await createSource(input);
  return c.json(source, 201);
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const source = await getSource(id);
  if (!source) return c.json({ error: 'Source not found' }, 404);
  const content = await getSourceContent(id);
  return c.json({ ...source, content });
});

app.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');
  const source = await getSource(id);
  if (!source) return c.json({ error: 'Source not found' }, 404);

  const content = await getSourceContent(id);
  const generated = await aiProvider.generateProposal(content);

  const proposal = await createProposal({
    proposalType: generated.proposalType,
    destination: generated.destination,
    sourceIds: [id],
    payload: generated.payload,
    evidence: generated.evidence,
    rationale: generated.rationale,
    createdBy: 'ai',
  });

  return c.json(proposal, 201);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteSource(id);
  return c.body(null, 204);
});

export default app;
