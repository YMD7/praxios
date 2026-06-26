import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createProposalSchema, reviewProposalSchema } from '@praxios/shared';
import {
  apply,
  createProposal,
  getProposal,
  listPendingProposals,
  listProposals,
  updateProposalStatus,
} from '../services/proposal.js';

const app = new Hono();

app.get('/', async (c) => {
  const status = c.req.query('status');
  const items = status ? await listProposals(status) : await listPendingProposals();
  return c.json({ items });
});

app.post('/', zValidator('json', createProposalSchema), async (c) => {
  const input = c.req.valid('json');
  const proposal = await createProposal(input);
  return c.json(proposal, 201);
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const proposal = await getProposal(id);
  if (!proposal) return c.json({ error: 'Proposal not found' }, 404);
  return c.json(proposal);
});

app.post('/:id/review', zValidator('json', reviewProposalSchema), async (c) => {
  const id = c.req.param('id');
  const { action, comment } = c.req.valid('json');
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revised';
  const proposal = await updateProposalStatus(id, status, 'user', comment);
  return c.json(proposal);
});

app.post('/:id/apply', async (c) => {
  const id = c.req.param('id');
  const proposal = await apply(id);
  return c.json(proposal);
});

export default app;
