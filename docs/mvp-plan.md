# Praxios MVP Plan

## 目的

Praxios の最小 MVP は、外部連携の多さではなく、以下の中核循環が
実際に操作できることを検証する。

ユーザーは AI に「メールに返答があったので確認してコンテキストを更新して」
のように指示する。AI は元情報を Source として保存し、Task に必要な情報を
Context に整理する。

(1) Source を取り込む

(2) AI が Source を ingest する

(3) Source から Task Context を更新する

(4) ユーザーが AI との対話で不足情報を追加する

(5) Source と Context を Task Workspace で確認できる

## 採用スタック

- API: Hono
- Web UI: Vite + React SPA
- Terminal UI: xterm.js + FitAddon
- Worker: Node.js の独立プロセス
- DB: SQLite
- ORM: Drizzle ORM
- Validation: Zod
- Package manager: pnpm workspace

## Next.js を採用しない理由

Praxios の初期価値は、ページ描画や SEO ではなく、Task Workspace、
Source 取り込み、Context 生成、Worker、Storage 抽象にある。

Next.js は UI と BFF を短時間で同居させるには便利だが、Praxios では
バックグラウンド worker とファイル保存を第一級に扱う必要がある。
そのため MVP では API、Web、Worker、Core を明示的に分ける。

## MVP スコープ

### 含める

- Task List
- Task Workspace
- Source の手動取り込み
- Source 本文のファイル保存
- Source metadata / hash の SQLite 保存
- AI による Source ingest
- Task Context の生成・更新
- Source List / Source Viewer
- Audit event

### 含めない

- Slack / Gmail / Google Drive の実連携
- 外部サービスへの書き込み
- 複数ユーザー認証
- 権限ロール
- ベクトル検索
- LLM の本番接続
- Approval / Proposal pipeline
- 複雑な自動ルーティングルール UI

## 境界

### packages/core

ドメインモデル、DB schema、Repository、Source 保存、Context 生成・投影を持つ。
UI framework と HTTP framework には依存しない。

### apps/api

Hono による HTTP API。core のユースケースを呼び出す薄い層にする。

### apps/web

React SPA。安定 URL を持つ画面を提供する。

- `/tasks`
- `/tasks/:taskId`
- `/sources/:sourceId`

### apps/worker

Source を ingest して Task Context を更新する独立プロセス。MVP では
同じ core サービスを呼ぶ最小 worker とする。

## データ保存

- 構造化データ: `$PROJECT_ROOT/data/praxios.sqlite`
- Source 正本: `$PROJECT_ROOT/data/sources/<sourceId>/raw.txt`
- Source hash: SHA-256
- DB schema の正本: `packages/core/src/db/schema.ts`
- `packages/core/src/db/sql.ts`: `db:init` 用の暫定 bootstrap SQL

## 後回しにする構造

- Proposal pipeline
- Approval Queue
- Wiki
- 外部サービスへの書き込み

## 実装順序

(1) pnpm workspace と TypeScript 設定

(2) SQLite schema と初期化処理

(3) Source 保存、hash、Repository

(4) Source ingest と Context 更新

(5) Hono API

(6) React SPA

(7) Worker

(8) core のユニットテスト

## 検証基準

- Source を手動登録できる
- 登録した Source が Task に紐づく
- AI が Source を ingest し、Context が更新される
- Task Workspace から Source と Context を確認できる
- `pnpm typecheck` と `pnpm test` が成功する
