# S1: Local fixture workflow 仕様
更新日: 2026-06-23

## 0. ゴール

Local fixture だけで Praxios の最小 workflow を実行し、plain-file workspace、
domain loop、review gate、workspace lint の成立を確認します。

## 1. スコープ / 非スコープ

**In**

- Workspace initialization.
- Synthetic meeting transcript fixture loading as Source.
- TaskCandidate extraction through deterministic fake agent or fixture-backed adapter.
- Task confirmation with done criteria.
- ContextPacket section generation.
- Artifact draft creation.
- Review request and approval simulation.
- Task completion guarded by review state.
- Learning / Knowledge update proposal.
- `log.md` append-only event/activity entries.
- Workspace lint / health check.
- Workflow tests using fixtures.

**Out**

- Real Gmail / Slack / Notion / Google integrations.
- Real external sending.
- External LLM provider dependency.
- Web UI.
- Multi-user permissions.
- Vector database or search index.
- Production deployment.
- Destructive sync.

## 2. エンドポイント（API/I/F）

v0 は HTTP API を作りません。I/F は local CLI command と application service です。
CLI command names are provisional and can change in Design.

Initial command candidates:

- `praxios init`
- `praxios load-fixture`
- `praxios extract-task-candidates`
- `praxios confirm-task`
- `praxios build-context`
- `praxios draft-artifact`
- `praxios approve-review`
- `praxios complete-task`
- `praxios propose-learning`
- `praxios lint`

## 3. データモデル差分

New implementation will introduce provisional contracts for:

- Source frontmatter
- TaskCandidate output
- Task frontmatter/body sections
- Artifact frontmatter/body
- Review frontmatter/body
- Knowledge update proposal
- `log.md` entry format
- lint result format

## 4. セキュリティ / NFR

- Fixture data must be synthetic and committed safely.
- No secret, credential, token, or private production data.
- External services are not required.
- Review-required transitions fail closed.
- Generated Artifact must not become Source evidence.
- Workspace lint must be deterministic and runnable offline.

## 5. 監査イベント

`log.md` should include entries for:

- Source captured
- TaskCandidate created
- Task confirmed
- ContextPacket built
- Artifact draft generated
- Review requested
- Review approved
- Task completed
- Knowledge update proposed
- Lint completed

## 6. エラー契約

No HTTP status codes in v0. CLI/application errors should distinguish:

- invalid workspace
- invalid frontmatter
- missing reference
- invalid state transition
- approval required
- lint failure
- fixture not found

## 7. 受け入れ基準（AC）

1. A fresh local workspace can be initialized without external services.
2. A synthetic meeting transcript fixture can be captured as Source with stable `src_` ID.
3. TaskCandidate extraction produces grounded candidates with Source refs and uncertainty.
4. One candidate can be confirmed into a Task with done criteria and `task_` ID.
5. ContextPacket is recorded in the Task body and only references task-relevant data.
6. Artifact draft and Review request are created with ID refs.
7. Task completion fails until approval is simulated.
8. Completion appends a `log.md` entry with event ID, actor, command, target, and status change.
9. Learning / Knowledge update proposal is created without silently mutating active Knowledge.
10. Workspace lint reports no high-severity issues for the happy-path fixture workspace.

## 8. テスト観点

- Workflow test for happy path.
- Invalid transition test: complete before approval.
- Validation test: missing required frontmatter.
- Lint test: generated Artifact used as Source evidence.
- Idempotency test: re-loading same fixture should not create duplicate Source.
