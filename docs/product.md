# Praxios Product Concept

## 概要

Praxios は、AI と一緒にタスクを進めるための Task Context Builder である。

ユーザーは Task Workspace で AI に指示する。AI は作業中に得た情報を
Source として保存し、そのタスクを進めるために必要な情報へ整理して
Context に反映する。

従来、仕事に必要な情報は Slack、メール、Google Drive、会議録、
テキストファイル、個人の記憶などに分散していた。ユーザーはそれらを探し、
AI チャットへ貼り付け、得られた内容を別のメモやタスク管理ツールへ転記していた。

Praxios はこの流れを単純化する。ユーザーは AI に「メールに返答があったので確認して
コンテキストを更新して」のように指示する。AI は元情報の場所を Source として保持し、
タスクに必要な内容を Context に整理する。

## MVP の中心価値

MVP では、承認ワークフローや知識 Wiki より先に、以下を検証する。

(1) ユーザーが Task を作る

(2) ユーザーが Task Workspace で AI に指示する

(3) AI またはユーザーが Source を Task に紐づける

(4) AI が Source を ingest して Context を更新する

(5) ユーザーが Sources と Context を見て、AI の前提を確認できる

## 中心概念

### Task

Task は Praxios における作業単位である。

例:

- 業務委託契約を締結する
- 契約書ドラフトを作成する
- 会議後のTodoを整理する

Task は個別 URL と Workspace を持つ。ユーザーは複数 Task をブラウザータブや
Praxios の workbench tab で並行して扱う。

### Source

Source は、AI やユーザーが参照した元情報である。

例:

- メールスレッド
- Slack メッセージまたはスレッド
- Google Drive ファイル
- 会議文字起こし
- テキストファイル
- ユーザーが直接入力したメモ

Source は「元データそのもの」と「元データへ戻るための場所」を持つ。

保持する代表情報:

- `sourceType`: 情報の形。例: `email_thread`, `drive_file`
- `provider`: 取得元サービス。例: `gmail`, `slack`, `google_drive`
- `sourceUrl`: 元情報へ戻る URL
- `sourceRefId`: 外部サービス上の ID
- `capturedAt`: Praxios が取得した時刻
- `metadata`: channel、参加者、messageId などの補足情報
- `sourcePath`: 保存した正本ファイル
- `hash`: 正本の検証用ハッシュ

Source は Context の根拠である。ユーザーは Sources を見れば、
どの情報がどのチャンネルから入ってきたかを確認できる。

### Context

Context は、Task を進めるための現在の作業前提である。

Source は元情報であり、Context は作業に使う整理済み情報である。

例:

- 契約相手
- 発注金額
- 発注日
- 変更履歴
- 未確認事項
- AI が次に確認すべきこと
- 根拠 Source

Context は AI とユーザーが共有する正規の作業メモとして扱う。
MVP では `context.md` を中心に表示する。

### AI Terminal

AI Terminal は、ユーザーが AI に指示し、AI がタスクを進める場所である。

Praxios は自前推論を前提にしない。ユーザーのローカル Codex / Claude Code などを
Task Workspace と接続し、AI が Source と Context を扱えるようにする。

## ユーザージャーニー例

業務委託契約を締結するケース。

(1) ユーザーが `業務委託契約` という Task を作成する

(2) Praxios が Task Workspace と `context.md` を用意する

(3) ユーザーが AI に「Google Drive から業務委託契約のテンプレートを探して」と指示する

(4) AI が Drive ファイルを見つけ、Source として保存する

(5) AI がテンプレート URL、概要、使いどころを Context に追加する

(6) AI が契約相手、金額、発注日、支払条件など不足情報を質問する

(7) ユーザーが AI に直接回答する

(8) AI が回答を Context に反映する

(9) ユーザーが「メールに返答があったので確認してコンテキストを更新して」と指示する

(10) AI がメールスレッドを Source として保存し、確定した条件を Context に反映する

## UI 方針

Task Workspace は、最初から多機能な業務ダッシュボードにしない。

MVP の左ペインは次に絞る。

- `Context`: `context.md` を表示する
- `Sources`: Task に紐づく元情報を表示する

右ペインは AI Terminal とする。

Task の状態、優先度、承認待ち、Wiki 更新提案などは、必要性が明確になってから追加する。

## 後回しにする概念

以下は将来拡張として扱い、MVP の中心導線には置かない。

- Proposal
- Approval Queue
- Wiki
- 外部サービスへの書き込み
- 複数ユーザー認証
- 権限ロール
- ベクトル検索
- 複雑な自動ルーティングルール UI

ただし、将来の重要操作では承認が必要になる。外部送信、ファイル更新、
公開範囲変更などは、MVP 後に Approval として再導入する。

## 目指す状態

Praxios が目指すのは、AI チャット付きタスク管理ツールではない。

目指すのは、ユーザーが AI に作業を依頼すると、その過程で得られた情報が
Source と Context に整理され、タスクの前提が自然に育っていく状態である。
