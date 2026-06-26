import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from './env.js';

export interface StorageAdapter {
  saveSource(id: string, content: Buffer | string): string;
  readSource(id: string): string;
  deleteSource(id: string): void;
}

class FileSystemStorage implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }
  }

  private sourceDir(id: string): string {
    return resolve(this.baseDir, 'sources', id);
  }

  private sourcePath(id: string): string {
    return resolve(this.sourceDir(id), 'raw.txt');
  }

  saveSource(id: string, content: Buffer | string): string {
    const dir = this.sourceDir(id);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const path = this.sourcePath(id);
    writeFileSync(path, content);
    return path;
  }

  readSource(id: string): string {
    return readFileSync(this.sourcePath(id), 'utf-8');
  }

  deleteSource(id: string): void {
    const path = this.sourcePath(id);
    if (existsSync(path)) {
      // TODO: remove directory
    }
  }
}

export const storage = new FileSystemStorage(resolve(process.cwd(), env.DATA_DIR));

export function computeHash(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}
