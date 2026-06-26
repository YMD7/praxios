import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error.js';
import { env } from './lib/env.js';
import tasksRoute from './routes/tasks.js';
import sourcesRoute from './routes/sources.js';
import proposalsRoute from './routes/proposals.js';
import wikiRoute from './routes/wiki.js';

const app = new Hono();

app.use(logger());
app.use('*', cors({ origin: env.CORS_ORIGIN }));
app.use(errorHandler);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/tasks', tasksRoute);
app.route('/api/sources', sourcesRoute);
app.route('/api/proposals', proposalsRoute);
app.route('/api/wiki', wikiRoute);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server is running on http://localhost:${env.PORT}`);
