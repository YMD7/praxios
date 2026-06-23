# Praxios Architecture

## 前提

このドキュメントは、Praxios の初期アーキテクチャ方針を示す。

具体的な技術スタック、データベース、AI モデル、外部連携方式は今後の設計で決定する。ここでは、プロダクトコンセプトを実現するために必要な論理構造を定義する。

## 全体像

Praxios は、タスクを中心に業務情報、AI アクション、ユーザー承認、Wiki 知識を接続する Web アプリケーションである。

主要レイヤー:

- Web UI
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
- Wiki への反映候補

タスクごとに URL を持ち、ブラウザーのタブやウィンドウで個別に開けることを前提とする。

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

Wiki はタスクとは別 URL で開ける。タスク処理中に参照されるだけでなく、タスク完了時に更新候補が提示される。

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

## AI Worker Layer

AI Worker Layer は、タスク遂行を支援または実行する。

主な責務:

- トリガー検出
- タスク作成候補の生成
- タスク理解の更新
- 次アクションの提案
- 定型フローの実行支援
- メッセージ案の作成
- ドキュメント更新案の作成
- Wiki 更新候補の生成

AI Worker は自律的に処理を進めるが、重要操作は Approval and Audit Layer を通す。

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

## Wiki Layer

Wiki Layer は、タスクから生まれた成果物や業務知識を蓄積する。

主な責務:

- Wiki ページ管理
- タスクからの知識抽出
- 更新候補の生成
- ユーザーレビュー
- 過去知識の検索
- タスク実行時の知識提供

Wiki はタスク実行の出力先であり、次のタスク実行の入力元でもある。

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

(4) タスクから Wiki へ知識を残す流れ

(5) タスクと Wiki を相互参照できる構造

外部連携は、最初は手動入力やモックデータでも成立する構造にしておく。

