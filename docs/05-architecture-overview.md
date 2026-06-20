# アーキテクチャ概要

Praxios は boring な ports-and-adapters architecture を採用します。Core domain
は UI、storage format、external integrations、LLM providers から独立させます。

## Layer

```text
apps
  -> application
    -> domain
    -> ports
      -> adapters
        -> external systems
```

## Domain layer

Domain layer は core concepts と invariants を所有します。

- Source
- Knowledge
- Task
- ContextPacket
- Artifact
- Review
- Learning
- Command
- Event

Domain layer は Markdown、Quartz、Gmail、Slack、Notion、Google APIs、OpenAI、
specific databases、web UI frameworks に依存してはいけません。

## Application layer

Application layer は次のような workflows を調整します。

- importing or loading Source snapshots
- extracting TaskCandidates
- confirming Tasks
- building ContextPackets
- generating Artifact drafts
- routing Reviews
- completing Tasks
- proposing Knowledge updates

Application services は domain logic と ports を呼び出します。External service
details を埋め込んではいけません。

## Ports

Ports は abstract capabilities を定義します。

- SourceRepository
- KnowledgeRepository
- TaskRepository
- EventLog
- LlmGateway
- ArtifactStore
- ReviewQueue
- Clock
- IdGenerator

Ports は小さく explicit にするべきです。

## Adapters

Adapters は concrete systems のために ports を実装します。

- filesystem
- Markdown / YAML frontmatter
- Quartz publishing
- LLM provider
- future Gmail, Slack, Notion, Google APIs
- future database

Adapters は external data を application services へ渡す前に検証します。

## Agent modules

Agent modules は extraction、summarization、draft generation、proposal generation
を行えます。LLM output を untrusted input として扱い、domain command を発行
する前に validation へ通す必要があります。

## Storage and publishing

Portable knowledge bundles と human inspectability のために、Markdown と YAML
frontmatter を優先します。これらは persistence representations であり、
domain model ではありません。

Quartz は将来 Markdown knowledge の publish や browse に使えます。Quartz は
rendering layer に留める必要があります。

## 初期 repository layout

現在の bootstrap layout:

```text
AGENTS.md
README.md
docs/
  00-constitution.md
  01-domain-model.md
  02-agent-contract.md
  03-engineering-principles.md
  04-security-and-privacy.md
  05-architecture-overview.md
  adr/
    0001-initial-architecture.md
```

将来の implementation layout。必要になった時点で追加します。

```text
specs/
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

役に立つ前に empty implementation directories を作らないでください。

## First vertical slice

最初の runtime milestone は local files と fixtures だけを使うべきです。

(1) Meeting transcript fixture を Source として load する。
(2) TaskCandidates を extract する。
(3) 1 つの Task を confirm する。
(4) Fixture sources と Knowledge から ContextPacket を build する。
(5) Artifact draft または proposal を generate する。
(6) Review required として mark する。
(7) Approval を simulate する。
(8) Task を complete する。
(9) Propose Learning / Knowledge updates.

これにより、real integrations の前に domain loop と trust model を証明します。
