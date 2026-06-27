/**
 * 時刻ユーティリティ。
 *
 * アプリ層で手動設定するタイムスタンプ（appliedAt / reviewedAt 等）に使う。
 * DB の既定値（createdAt / updatedAt）は SQLite の strftime('%Y-%m-%dT%H:%M:%fZ','now')
 * で生成され、同じ ISO-8601(UTC, ミリ秒) 形式に揃えてある。
 */

export function nowIso(): string {
  return new Date().toISOString();
}
