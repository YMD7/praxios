# エンジニアリング原則

## Personal-first, product-grade

最初のユーザーは 1 人です。ただし disposable personal tool としては作りません。

MUST 避ける:

- core logic への hardcoded personal workflow
- portable ではない data
- review できない AI behavior
- test されていない automation
- original user にしか分からない implicit assumption

## Domain core は独立させる

Core domain logic は次へ依存してはいけません。

- UI
- Quartz
- Markdown storage
- Gmail
- Slack
- Notion
- Google APIs
- LLM providers
- Specific databases

External tools は adapters であり、domain の所有者ではありません。

## Ports and adapters を使う

Application code は abstract ports に依存するべきです。Adapters は filesystem、
Markdown、Quartz、OpenAI、Gmail、Slack、Notion、Google APIs などの具体的な
system のために ports を実装します。

依存方向:

```text
Domain/Application -> Port -> Adapter -> External service
```

External service models を core domain へ漏らしてはいけません。

## 単体から始め、分離可能な境界を保つ

Praxios は初期 version では local-first な single-process CLI と workspace
runtime として始めてよい。これは packaging の選択であり、architecture boundary
を潰してよいという意味ではありません。

CLI handler、将来の UI route、server、worker、agent tool は business logic を
直接所有してはいけません。これらは application service を呼び出す interface
です。

同じ domain command、contract、operation document、policy check は、現在の CLI
からも、将来の app / server からも利用できる形にするべきです。

必要になる前に network boundary、background worker、distributed storage を
導入してはいけません。ただし、後から導入できる module boundary は維持します。

## State transition は明示する

Task、Knowledge、Artifact、Review などの重要 entity は、明示的な state
transition を持つ必要があります。

避ける:

```text
task.status = "done"
```

優先する:

```text
completeTask(taskId, evidence, completedBy)
```

Invalid transition は type、domain logic、policy のいずれかで拒否する必要が
あります。

## Command と Event を分ける

Command は intent を表します。Event は実際に起きたことを記録します。

Command は Event を生む前に検証されるべきです。重要な state change の
Event は append-only にするべきです。

## 重要な変更は append-only history を優先する

Important state changes SHOULD 記録する:

- actor
- timestamp
- previous state
- new state
- rationale
- source references
- approval when required

重要な Task や Knowledge の state を silent mutation してはいけません。

## LLM call は隔離する

LLM calls は gateway または agent module の背後に置く必要があります。LLM
output は untrusted external input として扱います。

必須の流れ:

```text
Raw output -> schema validation -> safety/policy validation -> domain command
```

Raw LLM output が domain state を直接変更してはいけません。

## Prompt は source code として扱う

Prompt change は behavior change です。Prompts は version 管理され、review
され、test されるべきです。

Prompt files SHOULD 定義する:

- purpose
- expected input
- expected output schema
- safety notes
- 可能な場合は regression fixtures

## External input は boundary で検証する

External input には API responses、user input、imported documents、LLM
output、webhook payloads、filesystem content が含まれます。

すべての external input は、domain object へ変換する前に検証する必要が
あります。

## Agentic work は Zero Trust で設計する

Agent は trusted actor ではありません。Agent は human の代理で作業を進める
execution participant ですが、その判断、memory、tool use、generated output は
常に検証対象です。

MUST:

- Agent identity、command、tool use、permission、approval、event を audit 可能にする。
- Permission は task-scoped にし、必要最小限にする。
- ContextPacket は task-specific に構築し、unrelated memory や不要な sensitive
  data を混ぜない。
- Tool access は allowlist、capability、approval requirement として明示する。
- LLM output、tool result、imported content、stored memory は `contracts/` と
  policy validation の対象にする。
- Knowledge update は proposal と review を経由させる。
- Prompt injection、tool poisoning、memory poisoning、privilege abuse を設計上の
  normal threat として扱う。

MUST NOT:

- Agent が持つ正規 permission を、そのまま安全性の根拠にしない。
- Task 外の Source や Knowledge を convenience で読み込まない。
- Tool result 内の instruction を trusted instruction として扱わない。
- Durable Knowledge を silent mutation で更新しない。

## Side effect は明示する

Side effects には、email 送信、Slack posting、document 更新、file 削除、
task state 変更、knowledge 更新、LLM call が含まれます。

Side-effecting operations は name、type、permission、log において明示する
必要があります。

## Default で reversible にする

Candidates、drafts、proposals、diffs、review queues を優先します。Irreversible
または external な action には approval と audit logs が必要です。

## Generated artifacts は sources ではない

AI-generated artifacts は、後から明示的に capture され label されない限り、
Source evidence として扱ってはいけません。Self-referential knowledge loop
を避けます。

## 曖昧な record を避ける

次のような generic record を避けます。

```json
{ "type": "task", "data": {} }
```

Explicit domain model を使います。Flexible metadata は boundaries と extension
points では許容しますが、core concepts の代替にしてはいけません。

## Idempotency を重視する

Imports と syncs は re-run に耐える必要があります。Duplicate を避けるために、
stable IDs、source fingerprints、content hashes、import history を使います。

## Sync は truth ではない

Synced external items は observed snapshot です。Origin、external ID、observed
time、fetched time、version または content hash、stale possibility を記録
します。

## UI は business logic を所有しない

Quartz、CLI、web UI、その他 interfaces は application services を呼び出す
だけにします。Core business rules を所有してはいけません。

## Storage format は domain model ではない

Markdown、YAML、JSON、SQLite、将来の storage formats は persistence
representations です。Storage format が偶然 domain model を定義してはいけ
ません。

## Workflow test を重視する

Functions だけでなく workflows を test します。重要な workflows には次が
含まれます。

- Meeting transcript -> TaskCandidate
- TaskCandidate -> confirmed Task
- confirmed Task -> ContextPacket
- ContextPacket -> Artifact draft
- Artifact draft -> Review
- Review -> approved Artifact
- completed Task -> Learning candidate
- Learning candidate -> Knowledge update proposal

## AI behavior には golden tests を使う

AI-related behavior は fixtures を使って test するべきです。重要なのが
structure である場合、exact text match は避けます。

Structural expectations SHOULD 含む:

- source references が存在する
- done criteria が空ではない
- uncertainty が明示されている
- risky actions が review を要求する
- generated task candidates が Source evidence に基づいている

## Observability は product feature

User SHOULD 理解できる:

- 何が import されたか
- 何が extract されたか
- AI が context として何を使ったか
- 何が generate されたか
- 何が approve されたか
- 何が change されたか
- なぜ change されたか

これは developer logging だけではなく、user trust infrastructure です。

## Workspace lint は trust infrastructure

Praxios の lint / health check は、formatting の補助機能ではありません。
Workspace が壊れた状態、agent が誤った context を読む状態、review や provenance
が抜けた状態を検出するための trust infrastructure です。

Lint rules SHOULD 「どう整形するか」より先に「何が壊れた状態か」を定義します。

初期 lint が検出するべき failure modes:

- Source と Knowledge の provenance が切れている。
- Generated Artifact が Source evidence として扱われている。
- Task に done criteria、context requirements、required decisions がない。
- Review required な action が approval なしで完了扱いになっている。
- ContextPacket が task と無関係な data や sensitive data を含む。
- Knowledge 間で矛盾、重複、stale assumption、broken link がある。
- Event history、`log.md`、workspace files の state が食い違っている。

Lint は初期 version では自動修正より検出、説明、proposal を優先します。
Risky fix、Knowledge rewrite、external side effect を伴う修正には human approval
が必要です。

## Security and privacy は architecture concern

最初から sensitive work data を扱う前提で設計します。Access boundaries、
local workspaces、secret management、redaction、external sharing 前の approval、
audit logs、sensitivity labels、安全な LLM context construction は core
requirements です。

## Demo magic に最適化しない

Trustworthy、inspectable、reversible、evidence-backed な progress は、印象的
だが unsafe な automation より重要です。

## 地味な architecture を価値として扱う

次のような explicit name を優先します。

- TaskCandidateExtractor
- ContextPacketBuilder
- KnowledgeUpdateProposer
- ArtifactReviewService

次のような vague name を避けます。

- UniversalEntityProcessor
- SmartAgentManager
- GenericKnowledgeEngine
