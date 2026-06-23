# Spec B01-S01: Local fixture workflow — 要件定義

## はじめに

本仕様は、Blueprint 01「Praxios v0 Vertical Slice」の Scope 01
「Local fixture workflow」を実装するための軽量な要件定義です。

**前フェーズとの関係:**

- 前提: runtime application code は未実装。
- 今回の目標: local files と fixtures だけで Praxios の最小 domain loop と
  trust model を検証する。

**Phase 1 の対象範囲:**

- Synthetic meeting transcript fixture を Source として取り込む。
- TaskCandidate、Task、ContextPacket、Artifact、Review、Learning proposal を
  最小 workflow で接続する。
- Review gate、append-only `log.md`、workspace lint を含める。

**手動作業プレフライトの結果:**

- 確認した情報源: `README.md`、`AGENTS.md`、`docs/00-05`、
  `docs/adr/0001-initial-architecture.md`、
  `docs/adr/0002-zero-trust-for-agentic-work.md`、
  `docs/adr/0003-plain-file-workspace.md`、SDD steering。
- AI単独で実装可能な範囲: repo 内 runtime code、contracts、synthetic fixtures、
  workflow tests、docs updates。
- ユーザー手動作業が必要な範囲: 追加手動作業なし。外部サービス、secret、
  production data、live deployment を使わない。
- 未確認事項: runtime language、package manager、schema validation library、
  test framework は Design で決定する。

---

## 要件1: Plain-file workspace を初期化できる

### ユーザーストーリー

```text
As a Praxios user
I want a local workspace initialized as plain files
So that I can inspect and keep my work data without depending on a SaaS runtime
```

### 受け入れ基準

#### AC1.1: Workspace layout

- Fresh workspace に `sources/`、`knowledge/`、`tasks/`、`artifacts/`、`reviews/`、
  `log.md`、`praxios.md`、`.praxios/config.yaml` が作成される。
- Canonical user data は `.praxios/` に保存されない。
- Domain directories は v0 では flat に保たれる。

#### AC1.2: Workspace metadata

- `.praxios/config.yaml` は runtime metadata / config のみを保持する。
- `praxios.md` は human / agent 向け workspace guide として作成される。
- 初期化は再実行しても既存 canonical data を壊さない。

---

## 要件2: Fixture Source から TaskCandidate を抽出できる

### ユーザーストーリー

```text
As a Praxios user
I want a meeting transcript fixture to become structured work candidates
So that I can verify the Source -> TaskCandidate boundary without real integrations
```

### 受け入れ基準

#### AC2.1: Source capture

- Synthetic meeting transcript fixture が `sources/*.md` に保存される。
- Source frontmatter は `id`、`type`、`title`、`status`、`created`、`updated`、
  `origin`、`observed_at`、`content_hash`、`sensitivity` を含む。
- Source ID は `src_` prefix を使う。
- 同じ fixture の再取り込みで duplicate Source が作られない。

#### AC2.2: TaskCandidate extraction

- TaskCandidate output は Source refs、proposed done criteria、confidence、
  uncertainty、extraction rationale を含む。
- TaskCandidate は confirmed Task として扱われない。
- LLM または fake agent output は validation を通らない限り domain command に
  変換されない。

---

## 要件3: Task を confirm し ContextPacket を作れる

### ユーザーストーリー

```text
As a Praxios user
I want to confirm one candidate into a task with scoped context
So that execution uses only relevant Source and Knowledge
```

### 受け入れ基準

#### AC3.1: Task confirmation

- Confirmed Task は `tasks/*.md` に保存される。
- Task frontmatter は `task_` ID、`type: task`、status、Source refs、
  Knowledge refs、done criteria、review requirement を持つ。
- TaskCandidate と Task の state / identity は混同されない。

#### AC3.2: ContextPacket section

- Task body に `## Context Packet` section が作成される。
- ContextPacket は related Source、Knowledge、constraints、missing information、
  risks を必要最小限で記録する。
- ContextPacket に unrelated Source、unrelated Knowledge、不要な sensitive data を
  混ぜない。

---

## 要件4: Artifact draft と Review gate を扱える

### ユーザーストーリー

```text
As a Praxios user
I want generated outputs to require review before important completion
So that AI-generated work remains inspectable and reversible
```

### 受け入れ基準

#### AC4.1: Artifact draft

- Artifact draft は `artifacts/*.md` に保存され、`artifact_` ID を持つ。
- Artifact は related Task と Source refs を持つ。
- Generated Artifact は Source evidence として扱われない。

#### AC4.2: Review request and approval simulation

- Review request は `reviews/*.md` に保存され、`review_` ID を持つ。
- Review は target Artifact または Task、decision、rationale、approval scope を記録する。
- Review required な Task completion は approval simulation なしに失敗する。

---

## 要件5: Completion、Learning proposal、log、lint を実行できる

### ユーザーストーリー

```text
As a Praxios user
I want completed work to produce audit records and learning proposals
So that future work can improve without corrupting durable knowledge
```

### 受け入れ基準

#### AC5.1: Task completion and log

- Approved Review がある場合のみ Task を `completed` にできる。
- 主要 workflow step は `log.md` に event-like section を append する。
- S01 で記録する event は、少なくとも Source captured、TaskCandidate created、
  Task confirmed、ContextPacket built、Artifact draft generated、Review requested、
  Review approved、Task completed、Knowledge update proposed、Lint completed を含む。
- Log entry は `event_` ID、actor、command、target、status または result、
  rationale、refs を含む。
- state transition を伴う entry は previous status と new status を含む。

#### AC5.2: Learning / Knowledge update proposal

- Completed Task から Learning candidate が作られる。
- Learning は active Knowledge を silent mutation せず、Knowledge update proposal として
  記録される。
- Proposal は Source refs、Task refs、confidence または uncertainty を含む。

#### AC5.3: Workspace lint

- Lint は workspace health check として実行できる。
- Happy-path fixture workspace で high-severity issue が残らない。
- Lint は少なくとも missing frontmatter、invalid ID prefix、missing refs、
  invalid status、review-required completion without approval、Artifact-as-Source misuse
  を検出する。

---

## 非機能要件

### セキュリティ要件

- Fixture は synthetic data のみを使う。
- Secrets、tokens、credentials、real private data を repo に保存しない。
- External LLM provider や external systems は S01 の必須依存にしない。
- Generated output と filesystem input は untrusted input として validation する。

### 保守性要件

- Domain logic は CLI、Markdown storage、LLM provider に依存しない。
- CLI は application services を呼ぶだけにする。
- Contracts / validation は boundary input に適用する。
- Tests は workflow を対象にする。

### 可観測性要件

- 主要 state transition は `log.md` で追跡できる。
- Lint result は対象、問題、risk、推奨 action を説明する。

### エラー契約

- CLI / application errors は少なくとも `invalid_workspace`、`invalid_frontmatter`、
  `missing_reference`、`invalid_transition`、`approval_required`、`lint_failed`、
  `fixture_not_found` を区別する。
- Error は actionable message と non-zero exit code に変換できる。
- Error contract は secret、token、private data を message に含めない。

---

## 制約・前提条件

### 単独完結項目

- Repo 内実装、fixtures、contracts、workflow tests は AI が実装可能。
- External service setup、secret 発行、production data 操作は不要。
- 手動 approval は simulated approval として local file / command で表現する。

### 外部依存・手動作業

追加手動作業なし。

根拠:

- S01 は local fixture workflow のみを対象とする。
- 外部サービス、secret、production data、deployment、OAuth、webhook、billing、
  account setup は非スコープ。

### 技術制約

- Runtime language、package manager、validation library、test framework は Design で決定する。
- v0 の schema / status enum は provisional。
- `ContextPacket` と `Learning` は v0 では top-level directory を持たない。

---

## リスク・懸念事項

| リスク | 影響 | 対策 |
|--------|------|------|
| Scope creep | MVP が重くなる | external integrations、Web UI、real LLM dependency を除外する |
| Domain/storage coupling | 将来の adapter 分離が難しくなる | Domain logic を Markdown adapter から分離する |
| LLM nondeterminism | Tests が不安定になる | fake / deterministic adapter と fixtures から始める |
| Audit weakness | Trust model が証明できない | completion と approval を `log.md` に記録する |
| Over-templating | Plain-file workspace が扱いづらくなる | body sections は最小限に保つ |

---

## テスト要件

- Workflow test: Source capture から lint までの happy path。
- Idempotency test: 同じ fixture の再取り込みで duplicate Source を作らない。
- Validation test: required frontmatter 欠落を拒否する。
- Policy test: approval なしの Task completion を拒否する。
- Lint test: generated Artifact を Source evidence として扱う誤りを検出する。
- Boundary test: fake agent output が schema validation なしに domain command へ進まない。

---

## 完了条件

この Spec は次を満たしたら完了です。

1. Blueprint B01 と Scope S01 に対応する requirements、design、tasks が承認済み。
2. Local fixture workflow の実装と workflow tests が通る。
3. Review gate、append-only `log.md`、workspace lint が動作する。
4. External integrations、real external sending、production deployment を含まない。

---

## 関連ドキュメント

- `spec/blueprints/01-v0-vertical-slice/overview.md`
- `spec/blueprints/01-v0-vertical-slice/architecture.md`
- `spec/blueprints/01-v0-vertical-slice/scopes/01-local-fixture-workflow.md`
- `docs/adr/0001-initial-architecture.md`
- `docs/adr/0002-zero-trust-for-agentic-work.md`
- `docs/adr/0003-plain-file-workspace.md`
- `docs/references/mulmoclaude.md`
