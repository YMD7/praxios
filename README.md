# Praxios

Praxios は、Agent と一緒にタスクを進めるための Task Context Builder です。
ユーザーや Agent が参照した元情報を Source として保存し、タスク遂行に必要な前提を
Context として整理します。

MVP では、Slack や Gmail などの外部連携を増やすことよりも、次の流れを実際に操作できることを重視します。

(1) Task を作成する

(2) Task Workspace で Agent に作業を依頼する

(3) Source を Task に紐づけて保存する

(4) Source を ingest して Context 更新案を作る

(5) ユーザーが Source と Context を確認し、必要な更新を適用する

## 主な機能

- Task List: 複数の Task を作成・一覧する
- Task Workspace: Task ごとの `context.md` と Agent terminal を並べて扱う
- Sources: 取り込んだ元情報、メタ情報、正本内容を確認する
- Context: Source から抽出したタスクの作業前提を保持する
- Proposals: Source 由来の Context 更新案などを確認・適用する
- Wiki: 再利用可能な知識を保持するための実験的な領域

## リポジトリ構成

```text
apps/
  api/       Hono による HTTP API と terminal WebSocket
  web/       Vite + React による Web UI
  worker/    未処理 Source を定期処理する Worker
packages/
  core/      ドメインモデル、DB、Repository、Context 投影
docs/        プロダクト方針、アーキテクチャ、MVP 計画
```

## 必要なもの

- Node.js 20.19 以上、または 22.12 以上を推奨
- pnpm 10.30.3
- Agent terminal を使う場合は `codex` または `claude` コマンド

## 起動方法

pnpm が未準備の場合は、Corepack を有効化します。

```bash
corepack enable
```

依存関係をインストールします。

```bash
pnpm install
```

API と Web UI を起動します。

```bash
pnpm dev
```

起動後、ブラウザーで次を開きます。

```text
http://127.0.0.1:5173
```

API は既定で次の URL で起動します。

```text
http://127.0.0.1:8787
```

ヘルスチェック:

```text
http://127.0.0.1:8787/health
```

SQLite DB と Source 正本は、既定では `$PROJECT_ROOT/data` 配下に作成されます。
DB schema は API 起動時に自動で初期化されます。

DB だけを明示的に初期化したい場合は、次を実行します。

```bash
pnpm db:init
```

## 個別起動

API のみ起動:

```bash
pnpm dev:api
```

Web UI のみ起動:

```bash
pnpm dev:web
```

Worker を起動:

```bash
pnpm dev:worker
```

Worker は、`processNow: false` で登録された未処理 Source を定期的に処理します。
通常の Web UI 操作では Source 登録時に処理されるため、基本起動では必須ではありません。

## よく使うコマンド

型チェック:

```bash
pnpm typecheck
```

テスト:

```bash
pnpm test
```

ビルド:

```bash
pnpm build
```

## 環境変数

| 変数 | 既定値 | 用途 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | API の待ち受けホスト |
| `PORT` | `8787` | API の待ち受けポート |
| `VITE_API_URL` | `/api` | Web UI から見た API ベース URL |
| `PRAXIOS_WORKSPACE_ROOT` | 自動検出 | workspace root |
| `PRAXIOS_DATA_DIR` | `$PROJECT_ROOT/data` | データ保存先 |
| `PRAXIOS_DB_PATH` | `$PROJECT_ROOT/data/praxios.sqlite` | SQLite DB |
| `PRAXIOS_SOURCE_DIR` | `$PROJECT_ROOT/data/sources` | Source 正本保存先 |
| `PRAXIOS_WORKER_INTERVAL_MS` | `15000` | Worker の処理間隔 |
| `PRAXIOS_TERMINAL_CWD` | `process.cwd()` | Task 外 terminal の作業ディレクトリ |
| `TERMINAL_DETACHED_TTL_MS` | `1800000` | terminal 切断後の保持時間 |
| `TERMINAL_REPLAY_BUFFER_BYTES` | `262144` | terminal 再接続時の再表示バッファ |

## データ保存

- 構造化データ: `$PROJECT_ROOT/data/praxios.sqlite`
- Source 正本: `$PROJECT_ROOT/data/sources/<sourceId>/raw.txt`
- Task workspace: `$PROJECT_ROOT/.praxios/tasks/<taskId>`

`data/` と `.praxios/` はローカル生成物として `.gitignore` に含まれています。

## 現状のスコープ

現在の中心は、Task Workspace で Source と Context を扱う体験です。
外部サービスへの実連携、外部サービスへの書き込み、複数ユーザー認証、
権限ロール、ベクトル検索は MVP の中心スコープには含めていません。

ブラウザー上の Agent terminal は、ローカルの `codex` または `claude` コマンドを
`node-pty` 経由で起動します。これらの CLI が未導入の場合、terminal 起動時に失敗します。
利用可能なエージェントとデフォルトはローカルの JSON 設定で変更・追加できます
（詳細は [docs/configuration.md](docs/configuration.md)）。
