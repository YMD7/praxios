/**
 * ローカル永続データの配置。
 *
 * SQLite 本体と Source 正本ファイルは、リポジトリ直下の data/ に置く
 * （.gitignore 済み）。環境変数で上書き可能。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // packages/db/src
const repoRoot = path.resolve(here, "../../..");

export const DATA_DIR =
  process.env.PRAXIOS_DATA_DIR ?? path.join(repoRoot, "data");
export const DB_PATH =
  process.env.PRAXIOS_DB_PATH ?? path.join(DATA_DIR, "praxios.db");
export const SOURCE_FILES_DIR = path.join(DATA_DIR, "sources");
export const MIGRATIONS_DIR = path.resolve(here, "..", "drizzle");
