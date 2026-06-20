# セキュリティとプライバシー

Praxios は email、Slack messages、meeting transcripts、internal documents、
hiring information、personal data、sensitive company data を扱う可能性が
あります。Security と privacy は初期 version から architecture concern です。

## Trust boundary

次のものは、検証されるまで external または untrusted として扱います。

- imported files
- API responses
- webhook payloads
- user-provided content
- LLM output
- synced external system snapshots
- generated artifacts proposed for reuse

## Zero Trust for agentic work

Praxios は AI agent を trusted actor として扱いません。Agent が正規の tool
access を持つ場合でも、その access は誤用され得るものとして設計します。

Zero Trust for agentic work の目的は、agent を止めることではありません。
Agent が安全に作業を進められるように、identity、permission、context、memory、
tool use、output、approval、audit の境界を明示することです。

MUST:

- すべての agent action に actor identity と task context を持たせる。
- Permission は task-scoped、least-privilege、time-bounded を基本にする。
- Agent が使える Source、Knowledge、Tool、side effect を Task または
  ContextPacket に明示する。
- ContextPacket は最小限かつ inspectable にする。
- LLM output、tool results、imported Source、stored memory は untrusted input として
  validation する。
- Durable Knowledge への反映は proposal、review、approval を通す。
- External sharing、destructive update、major knowledge rewrite は human approval を
  必須にする。
- Prompt injection、tool poisoning、memory poisoning、identity / privilege abuse、
  supply-chain risk を初期設計から threat model に含める。

SHOULD:

- Tool access を capability として表現し、default deny に近い設計にする。
- Agent がなぜその context と tool を必要としたかを audit log から追えるようにする。
- Security review では「agent が悪意ある input を読んだ場合」を通常ケースとして扱う。
- Multi-agent coordination を導入する前に、agent 間の memory sharing と permission
  propagation のルールを定義する。

First version では enterprise SOC や Agentic SOAR のような重い運用基盤は作りません。
ただし、後から追加できるように、agent identity、task-scoped permission、audit、
review queue、contracts validation の設計を避けて通ってはいけません。

## Sensitive data の原則

- Sensitive data は default で local に留めるべきです。
- Secrets を repository に commit してはいけません。
- Fixtures は、明示的に approve され label されない限り、実際の private data
  を含めてはいけません。
- LLM context construction の前に redaction できるべきです。
- Sensitivity label は Source、Knowledge、ContextPacket、Artifact records と
  一緒に移動するべきです。
- External sharing には human approval が必要です。

## LLM context safety

Context construction は deliberate かつ inspectable である必要があります。

ContextPacket は task に関係する情報だけを含めるべきです。Default で大きな
sensitive data dump を含めてはいけません。Sensitive context が必要な場合は、
理由と approval status を見えるようにします。

LLM provider は、明示的に local 実行していない限り external service です。
LLM provider へ data を送ることは side effect であり、log される必要があります。

Sensitive data、personal data、private company data、production data、秘密情報を
含む可能性がある ContextPacket を external LLM provider へ送る前には、redaction
または human approval が必要です。Approval は送信先 provider、送信する data
category、task purpose、有効範囲を明示する必要があります。

External LLM provider への送信では、default で次を行います。

- task に必要な最小限の context だけを送る。
- Source 全文より source references、抜粋、要約を優先する。
- 秘密情報と不要な personal data を redact する。
- Provider、model、timestamp、payload category、approval reference を audit する。
- Prompt injection を含む可能性がある Source content を instruction として扱わない。

## Approval requirement

次の操作の前には human approval が必要です。

- external email sending
- posting to Slack or similar systems
- destructive updates
- legal, financial, HR, hiring, contract, or personal-data-related decisions
- sharing personal data or sensitive company data externally
- sending sensitive ContextPackets to external LLM providers without prior policy approval
- major knowledge rewrites
- important Task final completion
- changing secrets or credentials
- operations that affect production data

## Audit requirement

Important actions SHOULD 記録する:

- actor
- agent identity when applicable
- timestamp
- operation
- target
- task context
- permission or capability used
- source references
- before and after state when applicable
- approval reference when required
- rationale

Audit logs は debugging だけでなく user trust の一部です。

## Secret management

Secrets は repository files の外で管理する必要があります。Environment variables、
local secret stores、dedicated secret management tools を使います。Documentation
では user-specific path ではなく、`$PROJECT_ROOT` や `~` のような generic path
を使います。

## Data retention

初期 version は explicit local files と fixtures を優先します。後で real
external data を導入する場合、import または sync を実装する前に retention と
deletion behavior を定義する必要があります。

## Destructive operations

Destructive operations は explicit、reviewed、logged である必要があります。
Direct mutation より reversible proposals、diffs、review queues を優先します。
