# Praxios v0 Vertical Slice アーキテクチャ
更新日: 2026-06-23

## TL;DR

推奨構成は、local CLI から application services を呼び、domain logic と
plain-file adapters を分離する small vertical slice です。最初は外部連携、
Web UI、production deployment、vector database を作りません。

## コンポーネント

- `apps/cli`: user-facing command entrypoint。Business logic は持たない。
- `packages/application`: workflow orchestration。
- `packages/core`: domain entities、commands、state transition、policy。
- `packages/ports`: filesystem、clock、ID generation、agent、event log などの抽象 port。
- `packages/adapters`: Markdown workspace、fixture loader、fake agent adapter。
- `contracts/`: frontmatter、LLM/fake-agent output、fixture JSON/Markdown の validation contract。
- `fixtures/`: private data を含まない sample meeting transcript と expected outputs。
- `tests/workflows`: end-to-end workflow tests。

実装 directory は Design / Tasks で必要になった時点で追加します。

## 責務分担

- Domain は Markdown、CLI、LLM provider、filesystem に依存しない。
- Application は domain command と ports を組み合わせる。
- Adapters は boundary validation を行ってから application へ渡す。
- CLI は command routing と結果表示だけを行う。
- Lint rules は CLI ではなく application/domain-adjacent service が所有する。

## データモデル（詳細）

Canonical data は workspace Markdown files です。

- `sources/*.md`: immutable-ish Source snapshots。
- `knowledge/*.md`: reusable operational knowledge。
- `tasks/*.md`: active work cases。ContextPacket と Learning Candidates section を含む。
- `artifacts/*.md`: generated drafts / proposals。
- `reviews/*.md`: review requests and decisions。
- `log.md`: append-only activity / event log。
- `.praxios/config.yaml`: runtime config only。Canonical user data は置かない。

`id` prefix:

- `src_`
- `know_`
- `task_`
- `artifact_`
- `review_`
- `event_`

## 主要フロー

1. `praxios init` initializes workspace directories and metadata.
2. `praxios load-fixture` writes a Source file from a bundled meeting transcript.
3. `praxios extract-task-candidates` creates TaskCandidate output from Source.
4. `praxios confirm-task` creates a Task file with done criteria.
5. `praxios build-context` updates Task body with ContextPacket section.
6. `praxios draft-artifact` creates an Artifact draft and Review request.
7. `praxios approve-review` simulates approval.
8. `praxios complete-task` completes Task only when policy allows it.
9. `praxios propose-learning` creates a Knowledge update proposal.
10. `praxios lint` reports workspace health issues.

Command names are initial architecture vocabulary, not final CLI contract.

## セキュリティ要点

- Fixture data must be synthetic and non-sensitive.
- External LLM calls are not required for S01.
- Generated output is untrusted until validated.
- Review-required transitions fail closed without approval.
- Lint must detect missing provenance, broken refs, invalid status, generated artifact evidence misuse,
  and review-required completion without approval.

## 実装順序

- Sprint 1: runtime language / validation library decision, workspace contracts, fixture workspace init。
- Sprint 2: Source loading, TaskCandidate extraction, Task confirm, context generation。
- Sprint 3: Artifact draft, Review simulation, Task completion, Learning proposal, lint, workflow tests。

## リスク/手当

- **Overbuilding risk**: keep CLI and templates small; defer real integrations and UI.
- **Domain/storage coupling**: keep domain state transitions outside Markdown adapter.
- **LLM nondeterminism**: start with deterministic fake agent and fixtures.
- **Audit weakness**: require `log.md` entries for major transitions.
- **Schema churn**: mark v0 contracts provisional and cover workflow with tests.
