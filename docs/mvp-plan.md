# Praxios MVP Plan

## 目的

Praxios の最小 MVP は、外部連携の多さではなく、以下の中核循環が
実際に操作できることを検証する。

(1) Source を取り込む

(2) Source から Proposal を生成する

(3) ユーザーが Proposal を承認または却下する

(4) 承認済み Proposal を Task / Wiki に反映する

(5) Source、Proposal、反映結果、監査ログを追跡できる

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

Praxios の初期価値は、ページ描画や SEO ではなく、Source 取り込み、
Proposal pipeline、Approval、Worker、Storage 抽象にある。

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
- Task 作成 Proposal
- Task context 追加 Proposal
- Wiki 更新 Proposal
- Approval Queue
- Proposal の承認 / 却下
- 承認済み Proposal の適用
- Wiki page と Wikilink
- Source Viewer
- Audit event

### 含めない

- Slack / Gmail / Google Drive の実連携
- 外部サービスへの書き込み
- 複数ユーザー認証
- 権限ロール
- ベクトル検索
- LLM の本番接続
- 複雑な自動ルーティングルール UI

## 境界

### packages/core

ドメインモデル、DB schema、Repository、Source 保存、Proposal 適用、
Wiki link 抽出を持つ。UI framework と HTTP framework には依存しない。

### apps/api

Hono による HTTP API。core のユースケースを呼び出す薄い層にする。

### apps/web

React SPA。安定 URL を持つ画面を提供する。

- `/tasks`
- `/tasks/:taskId`
- `/approvals`
- `/wiki`
- `/wiki/:pageId`
- `/sources/:sourceId`

### apps/worker

Source から Proposal を生成する独立プロセス。MVP では同じ core
サービスを呼ぶ最小 polling worker とする。

## データ保存

- 構造化データ: `$PROJECT_ROOT/data/praxios.sqlite`
- Source 正本: `$PROJECT_ROOT/data/sources/<sourceId>/raw.txt`
- Source hash: SHA-256
- DB schema の正本: `packages/core/src/db/schema.ts`
- `packages/core/src/db/sql.ts`: `db:init` 用の暫定 bootstrap SQL

## 初期 Proposal 種別

- `task_create`
- `task_context`
- `wiki_update`

## 実装順序

(1) pnpm workspace と TypeScript 設定

(2) SQLite schema と初期化処理

(3) Source 保存、hash、Repository

(4) Proposal 生成と承認 / 却下 / 適用

(5) Hono API

(6) React SPA

(7) Worker

(8) core のユニットテスト

## 検証基準

- Source を手動登録できる
- 登録した Source から pending Proposal が作られる
- Approval Queue で Proposal を承認できる
- Task と Wiki が更新される
- Task Workspace から Source と Proposal の根拠を辿れる
- `pnpm typecheck` と `pnpm test` が成功する
