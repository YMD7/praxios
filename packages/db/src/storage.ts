/**
 * Source 正本ファイルの保存層。
 *
 * 生データ本体はファイルに保存し（不変原則）、SQLite には sourcePath と
 * hash のみを持たせる。
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SOURCE_FILES_DIR } from "./paths";

export interface StoredSourceFile {
  sourcePath: string;
  hash: string;
}

export function saveSourceContent(id: string, content: string): StoredSourceFile {
  fs.mkdirSync(SOURCE_FILES_DIR, { recursive: true });
  const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  const sourcePath = path.join(SOURCE_FILES_DIR, `${id}.txt`);
  fs.writeFileSync(sourcePath, content, "utf8");
  return { sourcePath, hash };
}

export function readSourceContent(sourcePath: string): string {
  return fs.readFileSync(sourcePath, "utf8");
}
