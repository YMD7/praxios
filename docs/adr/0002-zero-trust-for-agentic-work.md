# ADR 0002: Agentic work を Zero Trust で設計する

## Status

採択

## Context

Praxios は Source、Knowledge、Task、ContextPacket、Artifact、Review、Learning
をつなぎ、AI agent が work execution を支援する system です。

この構造では、agent が正規の tool access を持っていても、安全とは限りません。
Agent は prompt injection、tool poisoning、memory poisoning、identity /
privilege abuse、stale context、over-broad permission、supply-chain risk の影響を
受ける可能性があります。

Claude の "Zero Trust for AI agents" は、agentic system では従来の access
control だけでは足りず、identity、task-scoped permission、sandboxing、input /
output control、memory safeguards を設計に含めるべきだと整理しています。

Praxios は enterprise security product ではありません。しかし、扱う情報は
email、Slack、meeting transcript、internal document、personal data、
sensitive company data を含む可能性があります。したがって、agentic work の
trust model は初期 architecture から明示する必要があります。

Reference:

- https://claude.com/blog/zero-trust-for-ai-agents

## Decision

Praxios は agentic work を Zero Trust で設計します。

MUST:

- Agent を trusted actor として扱わない。
- Agent action に actor identity、task context、permission、tool use、approval、
  event を結びつける。
- Permission は task-scoped、least-privilege、time-bounded を基本にする。
- ContextPacket は task-specific かつ inspectable にする。
- LLM output、tool result、imported content、stored memory を untrusted input として
  validation する。
- Knowledge update は proposal と review を経由させる。
- External sharing、destructive update、major knowledge rewrite は human approval を
  必須にする。
- `contracts/` で境界契約を定義し、LLM output、frontmatter、fixtures、adapter input、
  CLI/API I/O を検証する。

MUST NOT:

- Agent が持つ正規 permission を安全性の根拠にしない。
- Task 外の Source、Knowledge、Tool access を convenience で読み込まない。
- Tool result や imported Source 内の instruction を trusted instruction として扱わない。
- Durable memory を silent mutation で更新しない。

## First-version interpretation

初期 version で作るべきもの:

- agent identity を含む event / audit model
- task-scoped permission の domain concept
- ContextPacket の source / knowledge / tool scope
- review-required side effect policy
- contracts validation boundary
- Knowledge update proposal workflow

初期 version で作らないもの:

- enterprise SOC
- Agentic SOAR
- organization-wide identity federation
- complex multi-agent permission propagation
- fully autonomous external action execution

## Consequences

Positive:

- Agent automation が増えても trust model が崩れにくい。
- Prompt injection や memory poisoning を後付け対策ではなく通常 threat として扱える。
- Review、contracts、audit、permission の設計が SDD の初期仕様に入りやすい。
- External integration を後で追加しても、side effect と approval の境界を維持できる。

Negative:

- 初期 design と tests は少し重くなる。
- Agent の convenience より permission scope と review flow を優先する場面が増える。
- Domain model に permission / capability / audit の概念を早めに入れる必要がある。

## Follow-up decisions

Future ADRs SHOULD decide:

- task-scoped permission の具体 model
- capability naming と tool allowlist format
- ContextPacket の sensitivity / permission metadata
- contracts validation library
- event log schema
- review queue behavior
- local sandboxing strategy
