# Praxios Architecture

## 前提

このドキュメントは、Praxios MVP の初期アーキテクチャ方針を示す。

MVP は Proposal / Approval / Wiki ではなく、Task Workspace 内で
Source を ingest し、Context を更新する体験を中心にする。

保存層は次を前提にする。

- 構造化データは SQLite で保持する
- Source の正本情報はファイルシステムに保存する
- Source のメタ情報、ハッシュ、参照情報は SQLite で管理する
- Task ごとの Context は Workspace 内の `context.md` として扱う
- 将来 PostgreSQL などへ移行しやすいように Repository 経由で扱う

## 全体像

Praxios は、Task を中心に Source、Context、AI Terminal を接続する
Web アプリケーションである。

主要レイヤー:

- Web UI
- Task Layer
- Source Layer
- Context Layer
- AI Terminal / Worker Layer
- Integration Layer
- Audit Layer

## Web UI

主な画面:

- Task List
- Task Workspace
- Source List
- Source Viewer

### Task List

複数 Task を俯瞰し、新規 Task を作成する画面。

表示対象:

- タスク名
- 状態
- 優先度
- 期限
- 最終更新

### Task Workspace

1つの Task を進めるための中心画面。

Task Workspace は左右分割とする。

左ペイン:

- `Context`: Task の `context.md`
- `Sources`: Task に紐づく Source 一覧

右ペイン:

- AI Terminal

Task Workspace は、ユーザーと AI が同じ前提を見ながら作業する場所である。
MVP ではダッシュボード化せず、Context と Sources に絞る。

### Source List

取り込まれた Source を一覧する画面。

ユーザーは、どの情報がどのチャンネルから入ってきたかを確認できる。

### Source Viewer

Source のメタ情報と正本内容を確認する画面。

表示対象:

- sourceType
- provider
- sourceUrl
- sourceRefId
- capturedAt
- hash
- raw content

## Source Layer

Source Layer は、Praxios が扱う元情報を保存する層である。

Source は外部サービスやユーザー入力から得た正本情報を指す。

例:

- Slack メッセージ
- Slack スレッド
- Gmail メールスレッド
- Google Drive ファイル
- 会議文字起こし
- テキストファイル
- ユーザー入力メモ

Source の単位は固定しない。メールなら1通、メールスレッド全体、
Driveならファイル単位など、Source Definition で切り替える余地を残す。

主な責務:

- 元情報の保全
- 元情報へ戻る場所の保存
- 取得時刻の記録
- ハッシュによる正本確認
- Task との紐づけ

保存方針:

- 生データ本体は `sourcePath` としてファイル保存する
- SQLite には Source の正規化情報、ハッシュ、外部参照を保存する
- Source は原則不変として扱う
- 同じ外部スレッドの更新は、新しい Source または差分 Source として扱う

重要な原則:

- Context の根拠は Source へ辿れること
- Source は `sourceUrl` / `sourceRefId` / `provider` を持ち、元データへ戻れること
- ユーザーが「どのチャンネルから来た情報か」を確認できること

## Context Layer

Context Layer は、Source やユーザー対話から得た情報を Task 用に整理する層である。

MVP では `context.md` が Task Context の中心である。

Context に含める代表情報:

- 現在の要約
- 確定事項
- 未確認事項
- 変更履歴
- 次に AI が確認すべきこと
- 根拠 Source

Context は Source の丸写しではない。AI が Task 遂行に必要な形へ抽出・整理した
作業前提である。

更新方針:

- ユーザーが Task Workspace で直接回答した内容は Context に直接反映できる
- AI がユーザーの明示指示で取得した Source は ingest 後に Context へ反映する
- 将来、リスクの高い外部検知情報は Review / Approval を挟めるようにする

## AI Terminal / Worker Layer

AI Terminal は、ユーザーが AI に指示する場所である。

Praxios は自前推論を前提にしない。ローカル Codex / Claude Code などを
Hono WebSocket と node-pty 経由で起動し、ブラウザー上の xterm.js で表示する。

AI が担うこと:

- ユーザー指示の実行
- 必要な Source の探索
- Source の登録
- Source の ingest
- Context の更新
- 不足情報の質問

例:

ユーザー: 「メールに返答があったので確認してコンテキストを更新して」

AI:

(1) メールスレッドを確認する

(2) メールスレッドを Source として保存する

(3) 金額や日付などの確定情報を Context に追加する

(4) 不足している支払条件などをユーザーに質問する

## Integration Layer

Integration Layer は、外部サービスとの接続を担当する。

想定される連携先:

- Slack
- Gmail
- Google Drive
- カレンダー
- 会議録サービス
- ローカルファイル

MVP では実連携を必須にしない。手動入力、モックデータ、ローカルファイルでも
Source と Context の体験が成立することを優先する。

外部サービスへの書き込みは MVP では扱わない。

## Audit Layer

Audit Layer は、重要な操作履歴を残すための層である。

MVP で記録する対象:

- Task 作成
- Source 取り込み
- Context 更新

将来、外部送信やファイル更新を扱う場合は Approval と組み合わせる。

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

### Source

- id
- sourceType
- sourceTitle
- sourceUrl
- sourceRefId
- provider
- sourcePath
- occurredAt
- capturedAt
- processedAt
- hash
- metadata

### ContextItem

- id
- taskId
- sourceId
- title
- summary
- occurredAt
- relevanceScore
- evidence

### TaskWorkspace

- taskId
- path
- contextPath
- context

### AuditEvent

- id
- actor
- eventType
- subjectType
- subjectId
- payload
- createdAt

## URL 設計方針

Praxios はブラウザーのタブとウィンドウを活用するため、主要リソースに
安定した URL を持たせる。

MVP の主要 URL:

- `/tasks`
- `/tasks/:taskId`
- `/sources`
- `/sources/:sourceId`

## 後回しにする構造

以下は MVP の中心導線には置かない。

- Proposal Layer
- Approval Queue
- Wiki Layer
- 外部サービスへの書き込み
- 複数ユーザー認証
- 権限ロール
- ベクトル検索
- 複雑なルーティングルール UI

これらは不要という意味ではない。まず Source と Context の基本体験を固め、
必要性が明確になった段階で再導入する。

## 初期実装で優先する構造

(1) 複数 Task を管理できる Task List

(2) Context と Sources を表示する Task Workspace

(3) Task に Source を紐づける保存構造

(4) Source を ingest して Context を更新する流れ

(5) Source Viewer で元情報の場所と正本を確認できる構造

外部連携は、最初は手動入力やモックデータでも成立する構造にしておく。
