# Praxios MVP Implementation Plan

## Summary

MVP はローカル単体実行の Web アプリケーションとして実装する。中核検証は
`Source -> Proposal -> Approval -> Apply` と、Task / Context / Wiki の相互参照である。

## Tech Stack

- Backend: Hono on Node.js
- Frontend: React + Vite
- Routing: TanStack Router
- Database: SQLite + Drizzle ORM
- Source storage: local filesystem under `$PROJECT_ROOT/data/sources`
- AI Worker: mock proposal generator

Next.js は初期MVPでは採用しない。SEO、SSR、複雑なフルスタック規約よりも、
ローカルSQLite、Sourceファイル保全、明示的なAPI境界、承認フローを優先するため。

## MVP Scope

- Task List: 複数タスクの一覧と作成
- Task Workspace: Context、Source、Proposal、Wiki関連の確認
- Approval Queue: 提案の承認、却下、適用
- Source Viewer: 判断根拠となるSource本文の確認
- Wiki: ページ作成、本文更新、Wikilink抽出

## Out of Scope

- 認証、マルチユーザー、権限管理
- Slack、メール、Google Drive などの外部連携
- LLM実接続
- 外部送信、外部ファイル更新、自動実行

## Acceptance Scenarios

- Sourceを登録するとファイルとして保存され、SQLiteから参照できる
- Sourceからmock Proposalを生成できる
- Approval QueueでProposalを承認または却下できる
- 承認済みProposalがTask、Context、Wikiへ反映される
- Wiki本文の `[[PageId]]` がリンクとして保持される
- Task Workspaceから関連Source、Proposal、Wikiを辿れる

