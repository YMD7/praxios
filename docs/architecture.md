# Praxios Architecture

## 前提

このドキュメントは、Praxios の初期アーキテクチャ方針を示す。

具体的な技術スタックは後から拡張しやすいように定義するが、保存層は次を前提にする。

- 構造化データ（Task/Proposal/Approval/Wiki メタ）は SQLite で保持する
- Source の正本情報と添付物はファイルシステムに保存し、ハッシュと参照情報を SQLite で管理する
- 将来は PostgreSQL などへの移行が可能なように、ストレージAPIを抽象化する

## 全体像

Praxios は、タスクを中心に業務情報、AI アクション、ユーザー承認、Wiki 知識を接続する Web アプリケーションである。

主要レイヤー:

- Source Layer
- Web UI
- Proposal Layer
- Registry and Rules
- Task Layer
- Context Layer
- AI Worker Layer
- Integration Layer
- Approval and Audit Layer
- Wiki Layer

## Web UI

Web UI は、ユーザーがナビゲーターとして AI の業務遂行を監督するためのインターフェースである。

主な画面:

- Task List
- Task Workspace
- Approval Queue
- Wiki
- Source Viewer

### Task List

複数タスクを俯瞰する画面。

表示対象:

- タスク名
- 状態
- 優先度
- 期限
- ブロッカー
- 承認待ち件数
- AI の進行中アクション
- 最終更新

### Task Workspace

1つのタスクを処理するための画面。

表示対象:

- 背景
- 要件
- 完了条件
- Todo
- 進捗
- 関連情報
- 関連ファイル
- ステークホルダー
- 次アクション
- AI の提案
- 承認が必要な操作
- Wiki 更新提案

タスクごとに URL を持ち、ブラウザーのタブやウィンドウで個別に開けることを前提とする。

AI terminal は Praxios が自前推論を提供せず、ユーザーのローカル
Claude Code / Codex を Hono WebSocket と node-pty 経由で起動する。
Web UI 側の terminal renderer は xterm.js を採用し、日本語入力と
CJK 幅表示をブラウザー上で扱う。

### Approval Queue

ユーザー承認が必要な操作を集約する画面。

例:

- 外部チャネルへの送信
- ドキュメントの作成または更新
- タスク状態の重要な変更
- Wiki への反映
- 権限や公開範囲に関わる操作

### Wiki

業務知識を参照、編集、レビューする画面。

Wiki はタスクとは別 URL で開ける。タスク処理中に参照されるだけでなく、タスク完了時に更新提案が提示される。

### Source Viewer

AI が判断に使った根拠情報を確認する画面。

対象:

- Slack メッセージ
- メール
- 会議メモ
- Drive ファイル
- 過去タスク
- Wiki ページ

ユーザーは AI の判断根拠を辿り、誤った関連付けや解釈を修正できる。

## Source Layer

Source Layer は、Praxios が扱う正本情報を保存する層。

Source は、外部サービスから取り込まれた素材情報を指す。

単位は固定せず、Source Definition で宣言する（例: Slack の1メッセージ、Slack スレッド、会議トランスクリプト全体、メールスレッド、ファイル全体など）。

主な責務:

- 取得した情報の保全
- 外部参照（URL や ID）との結びつけ
- 変更検知と再取得結果の差分履歴
- エビデンスとしての永続保持

保存の実務方針:

- 生データ本体は `sourcePath` としてファイル保存
- SQLite には source の正規化情報・ハッシュ・参照関係を保存する
- Source は不変原則を維持し、更新は新レコードとして差分付きで記録する

Source は不変に扱い、AI は基本的に読み取り専用で利用する。

### 重要な原則

- Source から何が生まれたかを常に追跡できること
- 提案やタスク更新は、必ず Source への参照を持つこと

## Registry and Rules

Praxios の拡張をコア実装変更なしで行うための宣言レイヤー。

以下を定義データとして管理する。

- Source Type
- Proposal Type
- 抽出ルール
- ルーティングルール
- 承認ポリシー
- UI 表示メタ情報

拡張例:

- Slack ではメッセージ単位を Source として扱う
- 同じ Slack 統合でも、会議要約だけを別 Source として扱う
- 既存提案ロジックを使って新規の業務フロー提案を定義
- 特定条件でのみ自動実行するかをユーザーが設定

## Task Layer

Task Layer は、Praxios の業務実行単位を管理する。

主な責務:

- タスク作成
- タスク状態管理
- 完了条件管理
- Todo 管理
- 依存関係管理
- ステークホルダー管理
- タスクごとの関連情報管理

代表的なタスク状態:

- New
- Triaging
- Ready
- In Progress
- Waiting
- Needs Approval
- Completed
- Archived

## Context Layer

Context Layer は、外部情報や内部情報をタスクに関連付ける。

主な責務:

- 情報源から取得したデータの正規化
- タスクとの関連度推定
- 関連情報の根拠管理
- 時系列管理
- コンテキストの更新検知
- 不足情報の特定

重要なのは、ユーザーにすべての情報を見せることではなく、そのタスクに関係する情報だけを文脈化して提示することである。

## Proposal Layer

Proposal Layer は、AI が Source を解釈し、提案として積み上げる層。

Proposal は、以下の種類で管理する。

- タスク提案 (Task Proposal)
- Wiki 更新提案 (Wiki Update Proposal)
- 送信提案 (Message/Approval Proposal)

共通の流れは以下。

1. Ingest
2. Extract
3. Route
4. Proposal
5. Approve
6. Apply

### 処理の意味

Ingest  
Integration Layer から Source を取り込む。

Extract  
タスク文脈に使える要素を抽出する。  
例: 依頼内容、期日、責任者、決定事項。

Route  
抽出情報を次の宛先に振り分ける。  
例: 既存タスクの更新、タスク新規提案、Wiki 更新提案、参照保持。

Proposal  
宛先別に提案を作成し、Evidence を添えて保存する。

Approve  
提案が承認対象の場合、Approval Queue を経由してユーザーがレビューする。

Apply  
承認後にタスク更新、送信、Wiki 反映を実行する。

## AI Worker Layer

AI Worker Layer は、タスク遂行を支援または実行する。

主な責務:

- トリガー検出
- タスク提案の生成
- タスク理解の更新
- 次アクションの提案
- 定型フローの実行支援
- メッセージ案の作成
- ドキュメント更新案の作成
- Wiki 更新提案の生成

AI Worker は自律的に処理を進めるが、重要操作は Approval and Audit Layer を通す。

### AI Worker と Proposal の関係

AI Worker の出力は、直接更新しない。  
まず Proposal として保存され、ユーザー承認を経て適用される。

## Integration Layer

Integration Layer は、外部サービスとの接続を担当する。

想定される連携先:

- Slack
- メール
- Google Drive
- カレンダー
- GitHub
- ドキュメント管理サービス
- タスク管理サービス

主な責務:

- 外部イベントの取得
- 外部データの読み取り
- 外部サービスへの書き込み
- 権限管理
- 連携状態の監視

外部サービスへの書き込みは、ユーザー承認や権限設定に基づいて制御する。

## Approval and Audit Layer

Approval and Audit Layer は、人間がナビゲーターとして介入するための安全装置である。

主な責務:

- 承認待ち操作の管理
- 操作前後の差分表示
- 承認、却下、編集、差し戻し
- 実行履歴の記録
- 判断根拠の保存
- 監査ログの保持

対象操作:

- 外部送信
- ファイル作成
- ファイル更新
- タスク完了
- Wiki 更新
- 重要な自動判断

対象提案の例:

- タスク提案の承認
- Wiki 更新提案の承認
- 送信提案の承認

## Wiki Layer

Wiki Layer は、タスクから生まれた成果物や業務知識を蓄積する。

主な責務:

- Wiki ページ管理
- タスクからの知識抽出
- 提案の生成
- ユーザーレビュー
- 過去知識の検索
- タスク実行時の知識提供

Wiki はタスク実行の出力先であり、次のタスク実行の入力元でもある。

### Wiki 内部参照（Wikilink）

Praxios では Wiki 内部参照（`Wikilink`）を初期仕様として扱う。

- 記法: `[[PageId]]` / `[[PageId|表示名]]`（`PageId` を基準キー）
- AI は本文提案と同時に `proposedLinks` を返し、提案ベースでリンクを推定する
- 保存時に本文と提案からリンク抽出し、存在確認・正規化して `WikiLink` に反映する
- リンク先が未作成でも「未解決リンク」として保持し、後続処理で解決を再試行する
- 手動編集・Source 再取り込み時も同一パイプラインでリンクを再計算する
- UI は `outgoing links`（参照先）と `backlinks`（参照元）を同時表示する

## データモデル初期案

### Task

- id
- title
- description
- status
- priority
- dueDate
- triggerId
- completionCriteria
- createdAt
- updatedAt

### Trigger

- id
- sourceType
- sourceId
- summary
- detectedAt
- confidence

### ContextItem

- id
- taskId
- sourceType
- sourceId
- title
- summary
- occurredAt
- relevanceScore
- evidence

### Action

- id
- taskId
- type
- status
- proposal
- target
- requiresApproval
- createdBy
- createdAt
- executedAt

### Approval

- id
- actionId
- status
- reviewerId
- reviewedAt
- comment

### WikiPage

- id
- title
- body
- tags
- createdAt
- updatedAt

### WikiLink

- id
- fromPageId
- toPageId
- anchorText
- status
- sourceId
- confidence
- createdAt
- updatedAt

### Source

- id
- sourceType
- sourceTitle
- sourceUrl
- sourceRefId
- provider
- occurredAt
- capturedAt
- hash
- metadata

### SourceDefinition

- id
- kind
- displayName
- provider
- owner
- extractConfig
- normalizeConfig
- routeHints
- allowedProposalKinds
- defaults
- createdAt
- updatedAt

### Proposal

- id
- proposalType
- status
- sourceIds
- taskId
- destination
- payload
- evidence
- rationale
- createdBy
- createdAt
- reviewedAt
- reviewerId
- reviewComment
- appliedAt

### ProposalDefinition

- id
- proposalKind
- displayName
- schema
- evidencePolicy
- approvalPolicy
- applyPolicy
- targets
- createdAt
- updatedAt

### KnowledgeLink

- id
- taskId
- wikiPageId
- relationType
- evidence

## 権限と安全性

Praxios は AI が業務を実行するため、外部操作に対する安全性が重要である。

初期方針:

- 読み取り権限と書き込み権限を分離する
- 外部送信は原則として承認対象にする
- AI の判断根拠を保存する
- ユーザーが関連付けや提案を修正できるようにする
- 重要操作は監査ログに残す
- 自動実行範囲はタスク種別や連携先ごとに設定可能にする

## URL 設計方針

Praxios はブラウザーのタブとウィンドウを活用するため、主要リソースに安定した URL を持たせる。

例:

- `/tasks`
- `/tasks/:taskId`
- `/approvals`
- `/wiki`
- `/wiki/:pageId`
- `/sources/:sourceId`

これにより、ユーザーはタスク一覧、個別タスク、Wiki、承認待ちを別タブで開き、並行して作業できる。

## 初期実装で優先する構造

最初からすべての外部連携や自動実行を実装する必要はない。

初期実装では、以下を優先する。

(1) 複数タスクを管理できる Task List

(2) タスク単位の Context を表示する Task Workspace

(3) AI 提案とユーザー承認を分ける Approval Queue

(4) Source → Proposal → 承認 → 適用 のフロー

(5) タスクと Wiki を相互参照できる構造

外部連携は、最初は手動入力やモックデータでも成立する構造にしておく。
