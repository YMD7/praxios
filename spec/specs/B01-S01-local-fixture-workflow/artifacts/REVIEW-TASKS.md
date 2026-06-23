# Tasks Review Log

## 2026-06-23 Tasks Review 01

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/tasks.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Task decomposition
  - Validation / CI / test coverage
- raw result:
  - `.tmp/spec-review-tasks-r1-decomposition.md`

### 指摘

1. [Must-Fix] `tasks.md`: Design が要求する unit / adapter tests と fake-agent boundary
   test が明示されていない。
   - Contract unit tests、domain transition tests、lint rule unit tests、
     Markdown adapter tests、malformed fake-agent output rejection を task に含める必要がある。

2. [Must-Fix] `tasks.md`: 主要 state transition の log write が実装 task に割り当てられていない。
   - TaskCandidateCreated、TaskConfirmed、ContextPacketBuilt、ArtifactDraftGenerated、
     ReviewRequested、ReviewApproved、KnowledgeUpdateProposed の責務を task に明示する必要がある。

### Revision 01

実施日: 2026-06-23

#### 修正内容

1. [Must-Fix] unit / adapter / fake-agent boundary tests の明示不足 ✅
   - 修正箇所: `tasks.md` T5.4
   - 修正内容: contract、domain transition、lint rule、Markdown adapter、
     malformed fake-agent output rejection の tests を明示。

2. [Must-Fix] major state transition log writes の担当 task 不足 ✅
   - 修正箇所: `tasks.md` T3.3、T3.4、T3.5、T4.1、T4.2、T4.4
   - 修正内容: TaskCandidateCreated、TaskConfirmed、ContextPacketBuilt、
     ArtifactDraftGenerated、ReviewRequested、ReviewApproved、KnowledgeUpdateProposed
     の log append 完了条件を追加。

#### 残課題

- なし。

## 2026-06-23 Tasks Review 02

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/tasks.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Task decomposition
  - Validation / CI / test coverage
- raw result:
  - `.tmp/spec-review-tasks-r2-decomposition.md`

### 指摘

1. [Must-Fix][New-Finding] `tasks.md`: `EventLogEntry` / `CommandContext` の監査
   fields 実装が task に落ちていない。
   - T2.4 に full `EventLogEntry` fields と CommandContext propagation を追加する必要がある。

2. [Must-Fix][New-Finding] `tasks.md`: Workspace lint の最小 rules が design /
   requirements より不足している。
   - T5.1 に design の minimum S01 lint rules 全項目と `invalid status` を追加する必要がある。

3. [Must-Fix][New-Finding] `tasks.md`: `Lint completed` event の log append が実装
   task に割り当てられていない。
   - T5.2 または T5.3 に `LintCompleted` log entry append を追加する必要がある。

### Revision 02

実施日: 2026-06-23

#### 修正内容

1. [Must-Fix][New-Finding] `EventLogEntry` / `CommandContext` fields 不足 ✅
   - 修正箇所: `tasks.md` T2.4
   - 修正内容: design の `EventLogEntry` fields と `CommandContext` propagation を
     完了条件に追加。

2. [Must-Fix][New-Finding] Workspace lint minimum rules 不足 ✅
   - 修正箇所: `tasks.md` T5.1
   - 修正内容: `invalid status`、unique IDs、Source `content_hash`、`log.md`
     required fields for major transitions を含めるよう補強。

3. [Must-Fix][New-Finding] `LintCompleted` log append 不足 ✅
   - 修正箇所: `tasks.md` T5.2
   - 修正内容: `praxios lint` が `LintCompleted` log entry を append する完了条件を追加。

#### 残課題

- なし。

## 2026-06-23 Tasks Review 03

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/tasks.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Task decomposition
  - Validation / CI / test coverage
- raw result:
  - `.tmp/spec-review-tasks-r3-decomposition.md`

### 指摘

1. [Must-Fix] `tasks.md`: Workspace lint の最小 rules が design と完全には同期していない。
   - `design.md` は `id` prefix、`type`、directory の整合を要求しているが、
     `tasks.md` は invalid ID prefix のみを明示していた。

### Revision 03

実施日: 2026-06-23

#### 修正内容

1. [Must-Fix] `id` prefix / `type` / directory 整合 lint の明示不足 ✅
   - 修正箇所: `tasks.md` T5.1
   - 修正内容: Workspace lint の検出対象を invalid ID prefix / type /
     directory mismatch として明記。

#### 残課題

- なし。

## 2026-06-23 Tasks Review 04

Status: latest
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/tasks.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Task decomposition
  - Validation / CI / test coverage
- raw result:
  - `.tmp/spec-review-tasks-r4-decomposition.md`

### 結果

収束しました。承認フローへ進んでください。

#### 確認内容

- 前回 Must-Fix は解決済み。
- `tasks.md` T5.1 に `invalid ID prefix / type / directory mismatch` が
  明記されている。
- design の lint rule と整合している。
- 修正によるデグレは確認されていない。
