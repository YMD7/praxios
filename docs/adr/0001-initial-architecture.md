# ADR 0001: 初期アーキテクチャ方針

## Status

採択

## Context

Praxios は、日々の業務情報を reusable operational knowledge に変換し、その
knowledge を使って tasks を遂行し、completed work を knowledge base へ
戻す AI-native personal work system です。

Initial brief は、次の 3 つの有用な pattern を参照しています。

- immutable raw sources を持つ LLM-maintained Markdown wiki
- YAML frontmatter を持つ OKF-style portable Markdown files
- Markdown publishing and browsing layer としての Quartz

これらの pattern は有用ですが、どれも単独で Praxios を定義するものでは
ありません。Praxios には task execution、review、artifacts、learning、
auditability、security、privacy、clear trust model も必要です。

## Decision

Praxios は次から始めます。

- Source、Knowledge、Task、ContextPacket、Artifact、Review、Learning、Command、
  Event の domain-first model
- ports-and-adapters architecture
- 初期 portable persistence representation としての Markdown/YAML
- first vertical slice のための local files と fixtures
- risky または external な actions に対する human review
- 重要な変更のための append-only event history
- gateway または agent modules の背後に隔離された LLM calls

Praxios は次から始めません。

- real Gmail、Slack、Notion、Google integrations
- full web UI
- multi-user permissions
- vector database
- complex background workers
- production deployment
- fully autonomous agents
- automatic external sending
- destructive sync

## Rationale

Praxios の最大リスクは Markdown rendering や LLM call ではありません。最大
リスクは、work context、generated artifacts、approvals、knowledge updates が
長期的に相互作用する中で trust を維持することです。

Local fixture-based vertical slice により、integration complexity が model を
歪める前に domain loop を証明できます。

Domain を Markdown、Quartz、external systems、LLM providers から独立させる
ことで、初期の storage や UI の判断が accidental business logic になることを
防ぎます。

## Consequences

Positive:

- Core model が testable かつ portable に保たれます。
- Risky actions は external systems に影響する前に review できます。
- Knowledge は humans と agents が inspect できます。
- Future integrations は adapters として追加できます。

Negative:

- 初期 version は integrated demo より地味に見えます。
- Commands、events、validation、approval に関する up-front discipline が必要です。
- Domain objects を実装した後、Markdown storage 用の mapping code が必要に
  なる可能性があります。

## Follow-up decisions

Future ADRs SHOULD 決定する:

- initial schema language と validation library
- event log format
- Markdown frontmatter conventions
- local fixture structure
- LLM provider boundary と redaction policy
- first CLI workflow
- workflow と golden AI behavior の test strategy
