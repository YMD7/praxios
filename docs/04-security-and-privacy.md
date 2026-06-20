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
LLM provider へ data を送ることは side effect であり、log されるべきです。

## Approval requirement

次の操作の前には human approval が必要です。

- external email sending
- posting to Slack or similar systems
- sharing personal data externally
- sharing sensitive company data externally
- destructive updates
- major knowledge rewrites
- legal, financial, HR, hiring, or contract-related decisions
- changing secrets or credentials

## Audit requirement

Important actions SHOULD 記録する:

- actor
- timestamp
- operation
- target
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
