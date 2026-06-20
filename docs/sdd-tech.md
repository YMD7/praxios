# Praxios SDD Tech Steering

## 位置づけ

この文書は Praxios の技術 steering source です。実装仕様ではありません。
未決定の技術は agent が補完せず、後続 Blueprint または ADR で決定します。

## Confirmed constraints

- Documentation format: Markdown。
- Knowledge representation direction: Markdown + YAML frontmatter。
- Initial execution scope: local files and fixtures。
- Architecture style: ports-and-adapters。
- Boundary contract directory: `contracts/`。
- Agentic security model: Zero Trust for agentic work。
- Rendering layer candidate: Quartz。
- Repo-local workflow tooling: SDD plugin。
- VCS: GitHub with `gh`。
- Secrets は repository files の外で管理する。
- Fixtures は、明示的に approve され label されない限り、実際の private data
  を含めない。
- LLM provider calls は、明示的に local 実行でない限り external side effect
  として扱う。

## Not yet decided

次は未決定です。Agent は勝手に確定してはいけません。

- runtime language
- package manager
- schema validation library
- event log format
- Markdown frontmatter conventions
- local fixture structure
- test framework
- golden test strategy
- formatter / linter
- CI/CD baseline
- first CLI workflow

## Boundary contracts direction

`contracts/` は、自然言語の domain concepts を機械で検証できる境界契約へ
落とし込む場所です。

主な用途:

- LLM structured output の検証
- Markdown/YAML frontmatter の検証
- JSON fixture の検証
- Adapter から入る external data の正規化
- CLI/API の入出力契約
- workflow test の expected output 定義
- 将来の export/import 互換性

`contracts/` に置く schema は domain logic ではありません。形として正しいか、
必須 field があるか、enum や reference の形式が壊れていないかを検証する
ための契約です。

状態遷移、business policy、task completion の可否判断は `packages/core/`
の domain logic が決めます。

実装候補としては、runtime validation ができる TypeScript / Zod 系が自然です。
ただし、runtime language と validation library はまだ未決定であり、後続
Blueprint または ADR で決定します。

## Testing direction

Functions だけでなく workflows を test します。

重要な workflow:

- Meeting transcript -> TaskCandidate
- TaskCandidate -> confirmed Task
- confirmed Task -> ContextPacket
- ContextPacket -> Artifact draft
- Artifact draft -> Review
- Review -> approved Artifact
- completed Task -> Learning candidate
- Learning candidate -> Knowledge update proposal

AI-related behavior は fixtures を使って test するべきです。Exact text match より
structural expectations を優先します。

## Security and privacy direction

- Sensitive data は default で local に留める。
- Redaction は LLM context construction の前に行えるようにする。
- Sensitivity label は Source、Knowledge、ContextPacket、Artifact records と
  一緒に扱う。
- External sharing には human approval が必要。
- Destructive operations は explicit、reviewed、logged にする。
- Agent identity、task-scoped permission、context minimization、tool access
  controls、memory poisoning 対策、audit trail を初期設計から含める。
- Prompt injection、tool poisoning、identity / privilege abuse、supply-chain risk
  を通常の threat として扱う。
- Heavy enterprise SOC / Agentic SOAR は初期 version の対象外。ただし後から
  接続できるよう、events、approvals、permissions、contracts validation を
  domain/application design から落とさない。

## Source documents

- `docs/03-engineering-principles.md`
- `docs/04-security-and-privacy.md`
- `docs/05-architecture-overview.md`
- `docs/adr/0001-initial-architecture.md`
- `docs/adr/0002-zero-trust-for-agentic-work.md`
