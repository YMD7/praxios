import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { createRuntimeConfig, type RuntimeConfigInput } from "../config.js";
import * as schema from "./schema.js";
import { initializeDatabase } from "./sql.js";

export type PraxiosDatabase = BetterSQLite3Database<typeof schema>;

export interface OpenDatabaseResult {
  sqlite: Database.Database;
  db: PraxiosDatabase;
}

export function openDatabase(input: RuntimeConfigInput = {}): OpenDatabaseResult {
  const config = createRuntimeConfig(input);
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

  const sqlite = new Database(config.dbPath);
  sqlite.pragma("journal_mode = WAL");
  initializeDatabase(sqlite);

  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}
