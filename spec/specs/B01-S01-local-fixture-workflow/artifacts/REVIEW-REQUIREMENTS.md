# Requirements Review Log

## 2026-06-23 Requirements Review 01

Status: superseded
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/requirements.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Scope / AC completeness
- raw result:
  - `.tmp/spec-review-requirements-r1-scope-ac.md`

### 指摘

1. [Must-Fix] `requirements.md`: `log.md` の AC が Task completion だけに限定されている。
   - Scope が求める Source captured、TaskCandidate created、Task confirmed、
     ContextPacket built、Artifact draft generated、Review requested/approved、
     Task completed、Knowledge update proposed、Lint completed の監査イベントを
     requirements に明示する必要がある。

2. [Must-Fix] `requirements.md`: Workspace lint の検出対象から `invalid status` が抜けている。
   - status enum の破損を検出できないと、review gate と state transition の trust
     model 検証が弱くなる。

3. [Must-Fix] `requirements.md`: Scope の error contract が requirements に十分落ちていない。
   - `invalid_workspace`、`invalid_frontmatter`、`missing_reference`、
     `invalid_transition`、`approval_required`、`lint_failed`、`fixture_not_found` を
     distinguish する要件が必要。

### Revision 01

実施日: 2026-06-23

#### 修正内容

1. [Must-Fix] 監査イベント網羅不足 ✅
   - 修正箇所: `requirements.md` AC5.1
   - 修正内容: Source captured から Lint completed までの S01 主要 events と、
     append-only log entry の共通 fields を追加。

2. [Must-Fix] `invalid status` 検出漏れ ✅
   - 修正箇所: `requirements.md` AC5.3
   - 修正内容: workspace lint の最低検出対象に `invalid status` を追加。

3. [Must-Fix] error contract 反映不足 ✅
   - 修正箇所: `requirements.md` 非機能要件
   - 修正内容: CLI / application errors の required codes と secret 非露出を追加。

#### 残課題

- なし。

## 2026-06-23 Requirements Review 02

Status: latest
<!-- Reviewed by: Codex sub-agents -->

### 対象

- `spec/specs/B01-S01-local-fixture-workflow/requirements.md`

### Reviewer context

- reviewer count: 1
- perspectives:
  - Scope / AC completeness
- raw result:
  - `.tmp/spec-review-requirements-r2-scope-ac.md`

### 指摘

収束しました。承認フローへ進んでください。
