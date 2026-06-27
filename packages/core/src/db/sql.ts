import type Database from "better-sqlite3";

export const schemaSql = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TEXT,
  trigger_id TEXT,
  completion_criteria TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_url TEXT,
  source_ref_id TEXT,
  provider TEXT,
  source_path TEXT NOT NULL,
  occurred_at TEXT,
  captured_at TEXT NOT NULL,
  processed_at TEXT,
  hash TEXT NOT NULL,
  metadata TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sources_type_idx ON sources(source_type);
CREATE INDEX IF NOT EXISTS sources_processed_idx ON sources(processed_at);

CREATE TABLE IF NOT EXISTS context_items (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  occurred_at TEXT,
  relevance_score REAL NOT NULL,
  evidence TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS context_items_task_idx ON context_items(task_id);
CREATE INDEX IF NOT EXISTS context_items_source_idx ON context_items(source_id);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source_ids TEXT NOT NULL,
  task_id TEXT,
  destination TEXT NOT NULL,
  payload TEXT NOT NULL,
  evidence TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer_id TEXT,
  review_comment TEXT,
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_task_idx ON proposals(task_id);

CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS wiki_pages_page_id_idx ON wiki_pages(page_id);

CREATE TABLE IF NOT EXISTS wiki_links (
  id TEXT PRIMARY KEY,
  from_page_id TEXT NOT NULL,
  to_page_id TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  status TEXT NOT NULL,
  source_id TEXT,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS wiki_links_from_idx ON wiki_links(from_page_id);
CREATE INDEX IF NOT EXISTS wiki_links_to_idx ON wiki_links(to_page_id);

CREATE TABLE IF NOT EXISTS knowledge_links (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  wiki_page_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  evidence TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS knowledge_links_task_idx ON knowledge_links(task_id);
CREATE INDEX IF NOT EXISTS knowledge_links_page_idx ON knowledge_links(wiki_page_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_subject_idx
  ON audit_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at);
`;

export function initializeDatabase(sqlite: Database.Database): void {
  sqlite.exec(schemaSql);
}
