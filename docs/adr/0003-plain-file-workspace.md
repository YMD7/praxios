# ADR 0003: Plain-file workspace 方針

## Status

採択

## Context

Praxios v0 は、ユーザーが手元のフォルダで直接扱える local-first workspace から
始めます。Initial architecture では Markdown/YAML を portable persistence
representation として扱う方針を採択しましたが、workspace の正本をどの形式に
置くかは未決定でした。

Praxios は Karpathy の LLM Wiki pattern と Google の Open Knowledge Format
の考え方から影響を受けています。どちらも、複雑な database や required SDK
ではなく、Markdown files、YAML frontmatter、ordinary filesystem、Git
diffability、人間と agent の双方が読める表現を重視します。

mulmoclaude は、LLM Wiki を local workspace、agent workflow、API、UI、
lint / graph / backlink、atomic writer に落とし込んだ参考実装です。Praxios は
これを直接コピーしませんが、plain-file workspace と lint / health check の設計
では継続的に参照します。

一方で、Praxios は wiki だけではありません。Task、Review、Artifact、Learning、
operation documents、approval、audit など、work execution の概念も扱います。
そのため、plain files を保ちながら operational work に必要な構造を持たせる
必要があります。

## Decision

Praxios v0 workspace は plain-file、Markdown-first、OKF-inspired な構造から
始めます。

初期 workspace layout は次を基準にします。

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

各 domain directory は v0 ではフラットにします。

```text
sources/
  <slug>.md
knowledge/
  <slug>.md
tasks/
  <slug>.md
artifacts/
  <slug>.md
reviews/
  <slug>.md
```

Project、area、client、topic、date などの分類軸は、path 階層ではなく
frontmatter metadata で表します。Path hierarchy に domain meaning を持たせる
判断は、必要になった時点で別 ADR または migration spec として扱います。

File names は human-readable slug にします。ただし canonical identity は
frontmatter の stable `id` とします。Canonical references は file path や
Markdown link ではなく、stable ID refs を使います。

```text
tasks/
  follow-up-with-customer-a.md
knowledge/
  pricing-policy.md
sources/
  meeting-customer-a-2026-06-22.md
```

```yaml
---
id: task_...
type: task
title: Follow up with Customer A
source_refs:
  - src_...
knowledge_refs:
  - kn_...
---
```

Markdown links は人間向けの補助表現として使えますが、機械的な参照の正本には
しません。Rename や title change に耐えるため、agent と application services は
frontmatter `id` と ID refs を優先します。

Stable ID prefix は type ごとに次を使います。

```text
Source     -> src_
Knowledge  -> know_
Task       -> task_
Artifact   -> artifact_
Review     -> review_
Event      -> event_
```

例:

```text
src_01JZ8Q9K7M2V4X6P8N3R5T0A1B
know_01JZ8Q9M4A6C8D2E9F3G7H1J2K
task_01JZ8QA2B9D4F6H8J1K3M5N7P
artifact_01JZ8QB7C2E4G6J8K0M2P5R9S
review_01JZ8QC1D3F5H7J9K2M4N6P8Q
event_01JZ8QD4E6G8J0K2M4P6R8S1T
```

Lint は `id` prefix、frontmatter `type`、directory の一致を検査します。

すべての主要 workspace object は frontmatter に `id`、`type`、`title`、`created`、
`updated` を持ちます。`status` も必須ですが、許可される status enum は
`Source`、`Knowledge`、`Task`、`Artifact`、`Review` ごとに定義します。共通の
`status` enum を作って domain lifecycle の違いを潰してはいけません。

v0 status enum は provisional とし、実装と workflow test から学んで更新します。
ただし `TaskCandidate` と confirmed `Task` は混同しません。

```text
TaskCandidate.status:
  proposed
  confirmed
  dismissed

Source.status:
  captured
  processed
  archived

Knowledge.status:
  proposed
  active
  deprecated
  archived

Task.status:
  active
  blocked
  completed
  canceled

Artifact.status:
  draft
  proposed
  approved
  rejected
  archived

Review.status:
  requested
  approved
  rejected
  changes_requested
  canceled
```

v0 の frontmatter は、完全な最終 schema ではなく minimum viable contract として
扱います。最初に対象とする workspace object は `Source`、`Knowledge`、`Task`、
`Artifact`、`Review` です。`ContextPacket` と `Learning` は重要概念ですが、
v0 で独立 file にするか、Task / Artifact / Review の section として扱うかは
後続の SDD spec で決めます。

v0 minimum fields の初期候補:

```text
Source:
  id, type, title, status, created, updated, origin, observed_at,
  content_hash, sensitivity

Knowledge:
  id, type, title, status, created, updated, source_refs,
  confidence, sensitivity

Task:
  id, type, title, status, created, updated, trigger_refs,
  source_refs, knowledge_refs, done_criteria, review_required

Artifact:
  id, type, title, status, created, updated, task_ref,
  source_refs, generated_by, review_required

Review:
  id, type, title, status, created, updated, target_ref,
  requested_by, decision
```

この一覧は実装契約ではありません。後続の SDD spec と `contracts/` で検証可能な
形に落とし込む前の設計メモです。

`ContextPacket` と `Learning` は first-class domain concepts のまま維持します。
ただし v0 workspace では `context-packets/` や `learnings/` の top-level directory
を作りません。

`ContextPacket` は task-specific な working context bundle として、v0 では Task
file 内の section、または Artifact draft の input section に記録します。
`Learning` は completed Task から Knowledge update へ進む process / proposal として、
v0 では completed Task の section、または Knowledge update proposal Artifact として
記録します。

これらを独立 file として扱うかどうかは、ContextPacket の再利用、比較、review、
Learning workflow が実装上必要になった時点で再検討します。

Markdown body section は v0 では最小限に保ちます。Section は agent が安定して
追記・更新しやすく、人間が読んで判断できる単位として使います。ただし、最初から
すべての domain concept に詳細な section template を強制しません。

Task file の初期 section 候補:

```markdown
# <Task title>

## Intent

## Done Criteria

## Context Packet

## Actions

## Review

## Result

## Learning Candidates
```

Knowledge file の初期 section 候補:

```markdown
# <Knowledge title>

## Summary

## Operational Notes

## Evidence

## Related Knowledge

## Open Questions
```

これらは v0 の starting convention であり、過剰な template completeness を目的に
しません。実装と workflow test で必要性が確認された section だけを増やします。

Canonical user data は plain files として保存します。SQLite、vector database、
search index、cache、runtime database は v0 の canonical storage にしません。

`.praxios/` は v0 から許容します。ただし、置いてよいのは runtime metadata と
config だけです。Canonical user data、Sources、Knowledge、Tasks、Artifacts、
Reviews、audit history は `.praxios/` に入れてはいけません。

`praxios.md` は human と agent が読む workspace guide とします。`.praxios/config.yaml`
は CLI や将来の runtime が読む機械設定とします。

`log.md` は v0 の canonical append-only activity / event log とします。個別の
`events/` directory は v0 では作りません。`log.md` は人間が読める Markdown を
保ちつつ、最低限の machine-readable-ish fields を持つ section として記録します。

例:

```markdown
## 2026-06-22T10:15:00+09:00 - Task completed

- event_id: event_01JZ...
- actor: user
- command: CompleteTask
- target: task_01JZ...
- previous_status: active
- new_status: completed
- rationale: Done criteria met.
- refs:
  - artifact_01JZ...
  - review_01JZ...
```

将来 machine-readable event storage が必要になった場合は、`events/` などの
canonical event representation を SDD spec または ADR で再検討します。

## Rationale

ユーザーが workspace folder を開いたときに、Praxios の中身を理解できることは
trust と portability に直結します。Markdown と普通のファイルを正本にすれば、
Praxios を使わなくなっても knowledge、tasks、artifacts、reviews は残ります。

OKF 的な plain-file bundle は、iCloud、Dropbox、Google Drive、OneDrive、Git、
tarball、通常の filesystem と相性がよく、特定の SaaS や runtime に依存しません。

`.praxios/` を完全に禁止すると、runtime config、workspace version、将来の lock
や migration state の置き場がなくなり、表のファイルに機械都合の情報が混ざります。
ただし hidden directory に canonical data を入れると、ユーザーの理解可能性と
portability を損ないます。したがって `.praxios/` は許容するが、正本を置かない
という境界を明確にします。

## Consequences

Positive:

- Workspace は人間が読め、agent が編集しやすく、Git diff しやすい。
- Cloud sync folder や Git に置きやすい。
- Database や runtime が壊れても、正本は普通のファイルとして残る。
- Future search index や SQLite cache は再生成可能な derived data として追加できる。
- Flat per-domain directory により、link、refs、lint、import の初期仕様を単純に
  保てる。
- Human-readable filename と stable ID refs を分けることで、inspectability と
  rename tolerance の両方を保てる。

Negative:

- Query performance や cross-file validation は、初期には database-backed system
  より弱い。
- Markdown/frontmatter の規約、filename、linking、log format を丁寧に設計する
  必要がある。
- CLI や agent が direct file edits を行う場合、validation と review discipline
  が必要になる。
- `log.md` は strict event store ではないため、将来 machine-readable event replay
  が必要になった場合は移行設計が必要になる。
- ファイル数が増えると人間の一覧性が落ちるため、将来 index、generated views、
  UI、または migration が必要になる可能性がある。
- Filename、title、frontmatter `id`、ID refs の整合性を lint で検査する必要が
  ある。

## Follow-up decisions

Future SDD specs SHOULD decide:

- frontmatter の最小 fields
- `sources/`、`knowledge/`、`tasks/`、`artifacts/`、`reviews/` の具体的な file
  conventions
- `log.md` の append-only section format と lint rules
- human-readable filename、frontmatter `id`、ID refs、Markdown links の整合 rules
- type ごとの stable ID prefix と ID generation rules
- type ごとの最小 frontmatter fields と status enum
- machine-readable event storage をいつ導入するか
- operation documents をどこに置き、処理後にどう archive するか
- `.praxios/config.yaml` の最小 schema
- sync conflict detection と workspace lint / health check
- lint result を Artifact、Review、Event のどれとして記録するか
- lint の自動修正をどこまで許すか

## References

- `docs/references/mulmoclaude.md`
