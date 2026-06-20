# ドメインモデル

Praxios の core domain は、業務情報を knowledge-backed work execution へ
変換するための明示的な概念で構成します。柔軟な metadata は extension
point では許容しますが、中核概念を generic object へ潰してはいけ
ません。

## Source

Source は original または external な情報です。

例:

- Email message
- Slack thread
- Meeting transcript
- Notion page
- Google Doc
- Calendar event
- Uploaded document
- AI conversation snippet

Source は根拠または材料です。Source は自動的に Knowledge には
なりません。

Source SHOULD 記録する:

- origin
- external id when available
- observed time
- fetched time
- content hash or version
- sensitivity label
- stale possibility

## Knowledge

Knowledge は、source または work experience から抽出された、再利用可能な
operational understanding です。

例:

- Decision background
- Business rule
- Operating procedure
- Judgment criterion
- Project context
- Known constraint
- Repeated failure pattern
- Team preference
- Communication rule
- Open question

Knowledge は durable、linkable、updateable である必要があります。可能な限り
Source によって裏付けられているべきです。

Knowledge SHOULD 記録する:

- provenance
- lifecycle status
- confidence
- source references
- supersession or deprecation
- last reviewed time

## Task

Task は 1 行 TODO ではありません。Task は active work case です。

Task MUST 含む:

- trigger
- intent
- done criteria
- status
- related sources
- related knowledge
- context requirements
- required decisions
- actions
- artifacts
- blockers
- result
- learnings

Task state は direct mutation ではなく、explicit command によって変更する
必要があります。

## TaskCandidate

TaskCandidate は Source、Knowledge、または user input から抽出された、未確定の
work case 候補です。TaskCandidate は Task ではありません。Human または明示的な
policy によって confirm されるまで、active work case として扱ってはいけません。

TaskCandidate MUST 含む:

- title
- trigger
- inferred intent
- proposed done criteria
- source references or explicit user-provided rationale
- confidence
- uncertainty
- extraction rationale
- created by
- created at

TaskCandidate SHOULD 含む:

- related knowledge references
- suggested priority
- suggested owner
- duplicate or related Task references
- missing information
- risk notes

TaskCandidate の state transition は明示的である必要があります。

- `proposed`: 抽出または作成された状態。
- `confirmed`: Task として採用された状態。
- `dismissed`: Task として扱わない判断がされた状態。
- `merged`: 既存 Task または別 TaskCandidate に統合された状態。

`ConfirmTask` は TaskCandidate から Task を作ります。このとき、done criteria、
context requirements、required decisions、source references を確認する必要が
あります。LLM が生成した TaskCandidate を、検証なしに Task へ昇格してはいけません。

## ContextPacket

ContextPacket は task-specific な working memory です。Wiki は long-term
memory であり、ContextPacket は short-term task memory です。

ContextPacket SHOULD 含む:

- relevant sources
- relevant knowledge
- constraints
- missing information
- decisions needed
- suggested next actions
- risks
- draft inputs

ContextPacket は、人間が確認できる程度に小さく、task を遂行できる程度に
有用である必要があります。

## Artifact

Artifact は Task execution の過程で作成される output です。

例:

- Email draft
- Slack reply draft
- Decision memo
- Report
- Updated document proposal
- Meeting follow-up note
- Research summary
- Checklist

Generated Artifact は Source ではありません。AI-generated output は、後から
明示的に Source として capture され label されない限り、根拠として扱っては
いけません。

## Review

Review は first-class concept です。AI は準備し、提案し、draft を作り、
説明します。重要な action の承認は human が行います。

Review が必要な操作:

- 外部 email 送信
- User 代理での Slack posting
- 破壊的 update
- contract、legal、financial、HR、hiring、personal-data-related decision
- personal data や sensitive company data の外部共有
- sensitive data を含む ContextPacket の external LLM provider 送信
- 大規模な Knowledge rewrite
- 重要な Task の final completion
- secret や credential の変更
- production data に影響する操作

Review SHOULD 記録する:

- reviewer
- decision
- rationale
- reviewed artifact or diff
- required changes
- approval scope
- timestamp

## Learning

Learning は completed work から再利用可能な Knowledge を抽出する process
です。

Learning SHOULD 検討する:

- 新しい procedure
- 更新された constraint
- よりよい template
- 変化した assumption
- 繰り返される pattern
- 避けるべき mistake
- deprecate または update すべき Knowledge

Learning output は、Knowledge になる前に proposal として扱うべきです。

## Command

Command は intent を表します。Command は何をしたいかを示し、成功した事実
を表すものではありません。

例:

- CreateTaskCandidate
- ConfirmTask
- BuildContextPacket
- GenerateArtifactDraft
- ApproveArtifact
- CompleteTask
- ProposeKnowledgeUpdate

Command は state を変更する前に domain policy に照らして検証する必要が
あります。

## Event

Event は実際に起きたことを記録します。Event は auditability を支えます。

例:

- TaskCandidateCreated
- TaskConfirmed
- ContextPacketBuilt
- ArtifactDraftGenerated
- ArtifactApproved
- TaskCompleted
- KnowledgeUpdateProposed

Event SHOULD 記録する:

- actor
- timestamp
- command reference when applicable
- previous state
- new state
- rationale
- source references
- approval reference when required
