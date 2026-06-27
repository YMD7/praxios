import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "./schema";

const databasePath = join(process.cwd(), "data", "praxios.db");
mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath);
export const db = drizzle(sqlite, { schema });

export function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New',
      priority TEXT NOT NULL DEFAULT 'Medium',
      due_date TEXT,
      trigger_id TEXT,
      completion_criteria TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_title TEXT NOT NULL,
      source_url TEXT,
      source_ref_id TEXT,
      provider TEXT NOT NULL DEFAULT 'manual',
      occurred_at TEXT,
      captured_at TEXT NOT NULL,
      hash TEXT NOT NULL,
      source_path TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS context_items (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      occurred_at TEXT,
      relevance_score REAL NOT NULL DEFAULT 0.5,
      evidence TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      proposal_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      source_ids TEXT NOT NULL DEFAULT '[]',
      task_id TEXT,
      destination TEXT NOT NULL DEFAULT '{}',
      payload TEXT NOT NULL DEFAULT '{}',
      evidence TEXT NOT NULL DEFAULT '{}',
      rationale TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'mock-ai-worker',
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewer_id TEXT,
      review_comment TEXT,
      applied_at TEXT
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      reviewer_id TEXT,
      reviewed_at TEXT,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS wiki_pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wiki_links (
      id TEXT PRIMARY KEY,
      from_page_id TEXT NOT NULL,
      to_page_id TEXT NOT NULL,
      anchor_text TEXT,
      status TEXT NOT NULL,
      source_id TEXT,
      confidence REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_links (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      wiki_page_id TEXT NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'related',
      evidence TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);
}

