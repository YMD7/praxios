import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createWikiPageSchema, updateWikiPageSchema } from '@praxios/shared';
import {
  createWikiPage,
  deleteWikiPage,
  getBacklinks,
  getOutgoingLinks,
  getWikiPage,
  listWikiPages,
  updateWikiPage,
} from '../services/wiki.js';

const app = new Hono();

app.get('/', async (c) => {
  const items = await listWikiPages();
  return c.json({ items });
});

app.post('/', zValidator('json', createWikiPageSchema), async (c) => {
  const input = c.req.valid('json');
  const page = await createWikiPage(input);
  return c.json(page, 201);
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const page = await getWikiPage(id);
  if (!page) return c.json({ error: 'Wiki page not found' }, 404);
  const outgoing = await getOutgoingLinks(id);
  const backlinks = await getBacklinks(id);
  return c.json({ ...page, outgoing, backlinks });
});

app.patch('/:id', zValidator('json', updateWikiPageSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const page = await updateWikiPage(id, input);
  return c.json(page);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteWikiPage(id);
  return c.body(null, 204);
});

export default app;
