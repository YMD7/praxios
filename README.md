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

ローカルデータ（SQLite 本体・Source 正本）は `data/` に保存される
（.gitignore 済み）。
