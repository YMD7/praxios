# Praxios SDD Project Steering

## 位置づけ

この文書は Praxios の SDD steering source です。実装仕様ではありません。
実装仕様は SDD の Blueprint、Scope、Requirements、Design、Tasks で段階的に
作成します。

既存の `docs/` は Praxios の構想、原則、方向性、制約を示す基礎文書です。
SDD はそれらを参照し、実装可能な仕様へ落とし込みます。

## Product summary

Praxios は、日々の業務情報を再利用可能な Knowledge に変換し、その Knowledge
を使って Task を安全に遂行し、Review と Learning を通じて Knowledge base
へ戻す AI-native な作業基盤です。

## Name

Praxios は "praxis" と "OS" から作った造語です。ここでの praxis は、知識や
理論を実践に移すことを意味します。

`Work OS` は製品名として使いません。

## Core loop

```text
Source -> Knowledge -> Task -> Context -> Execution
  -> Artifact -> Review -> Learning -> Knowledge
```

## Scope

- Personal-first, product-grade。
- 最初のユーザーは 1 人。
- ただし disposable personal tool としては作らない。
- 初期 version は local files と fixtures の vertical slice に集中する。
- Source、Knowledge、Task、ContextPacket、Artifact、Review、Learning を
  明確に分ける。
- Review と auditability を first-class concept として扱う。
- Agentic work は Zero Trust で設計する。

## Non-goals

Praxios は次のものではありません。

- notes app
- TODO app
- RAG search tool
- Notion clone
- Slack / Gmail summarizer
- generic agent framework
- Karpathy's LLM Wiki の直接実装
- strict OKF implementation
- `Work OS` という名前の製品

初期 version では次を作りません。

- real Gmail / Slack / Notion / Google integrations
- full web UI
- multi-user permissions
- complex background workers
- vector database
- production deployment
- fully autonomous agents
- automatic external sending
- destructive sync
- task-scoped permission や audit を持たない agent automation

## User-owned decisions

次はユーザーが決めるべき product decision です。Agent は勝手に補完しては
いけません。

- target users / personas
- product goals
- success criteria
- service concept の優先順位
- first milestone の合格条件
- どの業務入力を最初に扱うか

## First implementation direction

最初の SDD Blueprint は、domain loop と trust model を証明する小さな
vertical slice を対象にするべきです。

候補:

(1) meeting transcript fixture を Source として load する。
(2) TaskCandidates を extract する。
(3) 1 つの Task を confirm する。
(4) fixture Source と Knowledge から ContextPacket を build する。
(5) Artifact draft または proposal を generate する。
(6) Review required として mark する。
(7) Approval を simulate する。
(8) Task を complete する。
(9) Learning / Knowledge update proposal を作る。

## Reference implementations

- `docs/references/mulmoclaude.md`: LLM Wiki、local workspace、lint / health
  check、workspace-as-agent 的な設計の参照メモ。Knowledge workspace や lint を
  設計するときに参照します。

## Source documents

- `README.md`
- `docs/00-constitution.md`
- `docs/01-domain-model.md`
- `docs/02-agent-contract.md`
- `docs/references/mulmoclaude.md`
- `docs/adr/0001-initial-architecture.md`
