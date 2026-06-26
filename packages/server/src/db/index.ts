import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { env } from '../lib/env.js';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbDir = dirname(env.DATABASE_URL);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(env.DATABASE_URL);
sqlite.exec('PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });
