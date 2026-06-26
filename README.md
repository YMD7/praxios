# Praxios

AI ネイティブな業務 OS。詳細は [`docs/product.md`](docs/product.md) と
[`docs/architecture.md`](docs/architecture.md) を参照。

## 技術スタック

- monorepo: pnpm workspaces + TypeScript
- DB: SQLite (better-sqlite3) + Drizzle ORM
- API: Hono (Node)
- Web: Vite + React + React Router + TanStack Query
- Worker: 別プロセス（AI パイプライン、Phase 3 で実装）

## 構成

```
packages/
  core/   ドメイン型・Repository 抽象・Registry
  db/     Drizzle スキーマ・実装・migrate/seed
apps/
  api/    Hono API サーバー
  web/    React SPA
  worker/ AI Worker
```

## 実装済み機能（MVP）

- Task List / Task Workspace（手動 CRUD、安定 URL）
- Source 手動取り込み（ハッシュ + ファイル保存）と Source Viewer
- Proposal パイプライン: Source → Extract → Route → Proposal → Approve → Apply
  - AI 抽出は Claude（`claude-opus-4-8` / 構造化出力）
  - `ANTHROPIC_API_KEY` 未設定時はヒューリスティック抽出にフォールバック
- Approval Queue（承認/却下、承認で Task/Wiki に適用）
- Wiki + wikilink（`[[PageId]]` 解決・backlink・未解決リンクの自動回復）

外部連携（Slack/メール/Drive 等）は手動入力/モックのまま。Integration Layer の
差し込み口のみ用意。

## セットアップ

```
pnpm install
pnpm --filter @praxios/db generate   # スキーマからマイグレーション SQL 生成
pnpm db:setup                        # migrate + seed
```

## 開発

```
pnpm dev          # api + web を同時起動（db:setup 込み）
pnpm dev:worker   # 別ターミナルで Worker
```

- Web: http://localhost:5173
- API: http://localhost:8787

AI 抽出を有効にするには `ANTHROPIC_API_KEY` を設定する（未設定でも
ヒューリスティック抽出で一連の流れは動作する）。

```
export ANTHROPIC_API_KEY=sk-ant-...
```

ローカルデータ（SQLite 本体・Source 正本）は `data/` に保存される
（.gitignore 済み）。リセットするには `rm -rf data` 後に `pnpm db:setup`。
