# Praxios v0 Vertical Slice 仕様・構成
更新日: 2026-06-23

## 1. 目的と前提

この Blueprint は、Praxios の最初の実装単位を定義します。目的は、外部連携や
Web UI ではなく、local fixture と plain-file workspace だけで Praxios の中核循環を
実行できることを証明することです。

対象循環:

```text
Source -> Knowledge -> Task -> Context -> Execution
  -> Artifact -> Review -> Learning -> Knowledge
```

前提:

- 最初のユーザーは 1 人。
- runtime application code はまだ存在しない。
- v0 workspace は Markdown-first、plain-file、local-first。
- real Gmail、Slack、Notion、Google integrations は対象外。
- LLM provider 呼び出しは、初期実装では fake / fixture / deterministic adapter から
  始めてよい。

## 2. 現状と推奨アーキテクチャ

推奨構成は、local single-process CLI から application services を呼ぶ形です。
CLI は business logic を所有しません。

初期実装は次を証明します。

- workspace 初期化
- fixture Source の取り込み
- TaskCandidate 抽出
- Task confirm
- ContextPacket section 生成
- Artifact draft 生成
- Review request と approval simulation
- Task completion
- Learning / Knowledge update proposal
- workspace lint / health check

## 3. ドメイン原則

- Source、Knowledge、TaskCandidate、Task、ContextPacket、Artifact、Review、
  Learning、Command、Event を generic object へ潰さない。
- Generated Artifact は Source evidence ではない。
- Task は done criteria と context requirements を持つ。
- Review は first-class concept として扱う。
- LLM output と filesystem content は untrusted input として扱う。
- Workspace lint は formatting ではなく trust infrastructure として扱う。

## 4. 主要機能領域

- Plain-file workspace management
- Boundary contracts / validation
- Fixture Source loading
- Deterministic agent adapter for TaskCandidate / Artifact draft generation
- Domain workflow services
- Review and simulated approval
- Append-only `log.md`
- Workspace lint / health check

## 5. 主要フロー

1. User initializes a Praxios workspace.
2. User loads a meeting transcript fixture as Source.
3. System extracts TaskCandidates grounded in the Source.
4. User confirms one TaskCandidate as Task.
5. System builds a task-specific ContextPacket section.
6. System generates an Artifact draft from the ContextPacket.
7. System creates a Review request and requires approval before completion.
8. User simulates approval.
9. System completes the Task and appends log entries.
10. System proposes Learning / Knowledge update and runs workspace lint.

## 6. データモデル（概要）

v0 は次の top-level workspace areas を使います。

```text
praxios-workspace/
  sources/
  knowledge/
  tasks/
  artifacts/
  reviews/
  log.md
  praxios.md
  .praxios/
    config.yaml
```

各 domain directory はフラットにし、filename は human-readable slug、
canonical identity は frontmatter `id`、canonical references は ID refs とします。

## 7. セキュリティ・不正対策

- External integrations は実装しない。
- Secrets、tokens、private data を fixtures に含めない。
- Sensitive data は default local。
- Review required な action は approval simulation なしに completed にしない。
- ContextPacket は task-specific に構築し、不要な data を混ぜない。

## 8. 可観測性・コスト

- `log.md` に主要 command/event を append-only に記録する。
- Lint result は問題、対象、risk、推奨 action を表示する。
- 外部 API や hosted service を使わないため、v0 の実行コストは local runtime のみ。

## 9. MVP受け入れ基準

- Local fixture だけで end-to-end workflow を実行できる。
- 生成された workspace files は human-readable Markdown と YAML frontmatter を持つ。
- Source、Task、Artifact、Review、Knowledge proposal の参照関係が ID refs で追える。
- Review required な Task completion は approval simulation なしに成功しない。
- Generated Artifact が Source evidence として扱われないことを lint または test で確認できる。
- `log.md` から主要 state transition を追える。

## 10. 未決・次アクション

- Runtime language、package manager、schema validation library は Design で決定する。
- v0 の LLM 呼び出しは fake adapter から始めるか、external LLM gateway を薄く用意するかを
  Design で決定する。
- ContextPacket と Learning は独立 file にせず、v0 では Task / Artifact section に保持する。
- 最初の実装 Scope は `S01: Local fixture workflow` とする。
