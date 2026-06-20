# Praxios SDD Structure Steering

## 位置づけ

この文書は Praxios の構造 steering source です。実装仕様ではありません。
実装仕様は SDD の Blueprint、Scope、Requirements、Design、Tasks で段階的に
作成します。

## Current repository state

現在は bootstrap 段階で、runtime application code は存在しません。
主な実体は foundational docs と repo-local SDD plugin files です。

## Required reading before changes

Praxios で作業する agent は、コード変更、構造変更、仕様変更の前に次を読む
必要があります。

- `README.md`
- `AGENTS.md`
- `docs/00-constitution.md`
- `docs/01-domain-model.md`
- `docs/02-agent-contract.md`
- `docs/03-engineering-principles.md`
- `docs/04-security-and-privacy.md`
- `docs/05-architecture-overview.md`
- `docs/adr/0001-initial-architecture.md`

## Core architecture rules

- Core domain logic は UI、Markdown、Quartz、外部 API、LLM provider に
  依存してはいけません。
- External systems は adapter として扱います。
- Application code は ports に依存し、adapters が具体 system を実装します。
- External service model を core domain へ漏らしてはいけません。
- LLM output は untrusted input として validation を通します。
- State change は explicit command と event で表現します。
- 重要な変更は audit 可能にします。
- UI と storage format は business logic を所有してはいけません。

## Domain concepts

次の概念を generic object に潰してはいけません。

- Source
- Knowledge
- Task
- ContextPacket
- Artifact
- Review
- Learning
- Command
- Event

## SDD layout decision

SDD framework root は `spec/` を採用します。

```text
spec/
├── README.md
├── _custom/
│   ├── README.md
│   └── steering/
├── blueprints/
├── specs/
└── _archive/
    ├── blueprints/
    └── specs/
```

`spec/` は SDD の Blueprint、Scope、Requirements、Design、Tasks を置く
領域です。

## Boundary contract layout decision

機械で検証できる境界契約は、将来 `contracts/` に置きます。

`contracts/` は `spec/` とは別物です。`spec/` は SDD workflow の成果物を
置く場所であり、`contracts/` は LLM output、Markdown/YAML frontmatter、
fixtures、adapter input、CLI/API I/O などを Praxios が受け入れてよいか
検証する schema / contract を置く場所です。

`contracts/` は domain model そのものではありません。Domain logic、state
transition、business policy は `packages/core/` が所有します。

将来の候補:

```text
contracts/
  source.schema.ts
  source-ref.schema.ts
  knowledge.schema.ts
  task-candidate.schema.ts
  task.schema.ts
  context-packet.schema.ts
  artifact.schema.ts
  review.schema.ts
  learning.schema.ts
  command.schema.ts
  event.schema.ts
  frontmatter.schema.ts
```

## Future implementation layout

実装ディレクトリは必要になった時点で追加します。空の実装ディレクトリを
先に作らないでください。

想定候補:

```text
packages/
  core/
  application/
  ports/
  adapters/
  agent/
  storage/
  shared/
apps/
  cli/
  worker/
  web/
fixtures/
tests/
scripts/
```

## Naming conventions

- Project docs は numeric prefix + kebab-case を使います。
- ADR は numeric prefix + kebab-case を使います。
- Code identifiers、type names、function names、file names は英語を使います。
- Domain concept names は明示的にします。
- Vague names を避けます。

優先する名前:

- `TaskCandidateExtractor`
- `ContextPacketBuilder`
- `KnowledgeUpdateProposer`
- `ArtifactReviewService`

避ける名前:

- `UniversalEntityProcessor`
- `SmartAgentManager`
- `GenericKnowledgeEngine`

## Source documents

- `AGENTS.md`
- `docs/01-domain-model.md`
- `docs/03-engineering-principles.md`
- `docs/05-architecture-overview.md`
- `docs/adr/0001-initial-architecture.md`
- `docs/adr/0002-zero-trust-for-agentic-work.md`
