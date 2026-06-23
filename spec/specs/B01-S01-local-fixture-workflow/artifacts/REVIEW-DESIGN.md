# Design Review Log

## 2026-06-23 Design Review 01

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/design.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Architecture feasibility
  - Security / audit / Zero Trust
- raw result:
  - `.tmp/spec-review-design-r1-architecture-security.md`

### 指摘

1. [Must-Fix] `design.md`: Review contract が `rationale` と `approval_scope` を要求していない。
   - Approval simulation の範囲が監査できず、何を承認したのか不明なまま
     `completeTask` が通る設計になる。

2. [Must-Fix] `design.md`: `artifact_kind: knowledge_update_proposal` 専用 contract が不足している。
   - AC5.2 の Source refs、Task refs、confidence または uncertainty を満たす
     proposal structure が必要。

3. [Must-Fix] `design.md`: Task body 内の `## Context Packet` の最小構造が不足している。
   - related Source / Knowledge、constraints、missing information、risks、
     不要 data 混入防止を実装・検証できない。

4. [Must-Fix] `design.md`: EventLog / AgentGateway / log entry に agent identity、
   task context、permission / tool scope が結びついていない。
   - ADR 0002 の Zero Trust 要件を S01 最小設計に反映する必要がある。

### Revision 01

実施日: 2026-06-23

#### 修正内容

1. [Must-Fix] Review contract の `rationale` / `approval_scope` 不足 ✅
   - 修正箇所: `design.md` Frontmatter minimum
   - 修正内容: Review required fields に `rationale` と `approval_scope` を追加。

2. [Must-Fix] Knowledge update proposal 専用 structure 不足 ✅
   - 修正箇所: `design.md` Knowledge update proposal body
   - 修正内容: `artifact_kind: knowledge_update_proposal` の required fields と body
     structure を追加。

3. [Must-Fix] ContextPacket section 最小構造不足 ✅
   - 修正箇所: `design.md` ContextPacket section
   - 修正内容: `source_refs`、`knowledge_refs`、`allowed_tools`、`sensitivity`、
     constraints、missing information、risks、draft inputs の最小構造を追加。

4. [Must-Fix] Agent identity / task context / permission scope audit 不足 ✅
   - 修正箇所: `design.md` Components and interfaces、`log.md` entry
   - 修正内容: `CommandContext` と `EventLogEntry` を追加し、actor、agent、task、
     source/knowledge/tool scope、approval refs を application / agent / event に
     結びつける設計へ更新。

#### 残課題

- なし。

## 2026-06-23 Design Review 02

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/design.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Architecture feasibility
  - Security / audit / Zero Trust
- raw result:
  - `.tmp/spec-review-design-r2-architecture-security.md`

### 指摘

1. [Must-Fix][New-Finding] `design.md`: `lintWorkspace` が `Lint completed` を
   `log.md` に append する流れを定義していない。
   - `requirements.md` AC5.1 は `Lint completed` を主要 workflow event として
     記録することを要求しているため、design で `LintCompleted` event append を
     明示する必要がある。

### Revision 02

実施日: 2026-06-23

#### 修正内容

1. [Must-Fix][New-Finding] `LintCompleted` event append 不足 ✅
   - 修正箇所: `design.md` Happy path、Workspace lint
   - 修正内容: lint flow に `A->>L: append LintCompleted` を追加し、
     `lintWorkspace` が shared `EventLogEntry` contract で `LintCompleted` を
     append することを明記。

#### 残課題

- なし。

## 2026-06-23 Design Review 03

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/design.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Architecture feasibility
  - Security / audit / Zero Trust
- raw result:
  - `.tmp/spec-review-design-r3-architecture-security.md`

### 結果

収束しました。承認フローへ進んでください。

#### 確認内容

- 前回 Must-Fix は解決済み。
- `lintWorkspace` が `LintCompleted` を `log.md` へ append する流れは
  `design.md` の Happy path と Workspace lint に明記済み。
- requirements の主要 workflow event 要件と整合している。
- 修正によるデグレは確認されていない。

## 2026-06-23 Design Review 04

Status: latest
<!-- Reviewed by: Codex built-in /review -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/design.md`
- `spec/specs/B01-S01-local-fixture-workflow/tasks.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Contract consistency
  - Review gate safety
- raw result:
  - Codex built-in `/review` result in conversation context

### 指摘

1. [P2] `design.md`: pre-task Artifact の `task_ref` を条件付きにする。
   - TaskCandidate extraction は Task confirm 前に
     `artifact_kind: task_candidate_set` を作るため、全 Artifact に `task_ref` を
     必須要求すると存在しない `task_` ref を捏造する実装になり得る。

2. [P2] `design.md`: approval gate を target と scope に紐づける。
   - Workspace に複数 Task / Review がある場合、別 Task や別 Artifact の approval
     で completion gate を通せてしまう可能性がある。

### Revision 04

実施日: 2026-06-23

#### 修正内容

1. [P2] pre-task Artifact の `task_ref` 条件付き化 ✅
   - 修正箇所: `design.md` TaskCandidate storage、Frontmatter minimum、Contracts
   - 修正内容: `task_candidate_set` は Task confirm 前に作られるため `task_ref` を
     要求せず、Task-bound Artifact は `task_ref` を要求する、と明記。

2. [P2] approval gate の target / scope binding ✅
   - 修正箇所: `design.md` Approval failure path、Workspace lint、
     `tasks.md` T4.3 / T5.1 / T5.4 / T5.5
   - 修正内容: `completeTask` は対象 Task または completion Artifact を指し、
     `approval_scope` が `task_completion` を含む approved Review のみを受け付ける、
     と明記。

#### 残課題

- なし。
