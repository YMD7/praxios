import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '../services/task.js';
import {
  createTaskSchema,
  taskFilterSchema,
  updateTaskSchema,
} from '@praxios/shared';

const app = new Hono();

app.get('/', zValidator('query', taskFilterSchema), async (c) => {
  const filter = c.req.valid('query');
  const items = await listTasks(filter);
  return c.json({ items });
});

app.post('/', zValidator('json', createTaskSchema), async (c) => {
  const input = c.req.valid('json');
  const task = await createTask(input);
  return c.json(task, 201);
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const task = await getTask(id);
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
});

app.patch('/:id', zValidator('json', updateTaskSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const task = await updateTask(id, input);
  return c.json(task);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteTask(id);
  return c.body(null, 204);
});

export default app;
