# Praxios エージェントガイド

このプロジェクトは日本語をベースにします。ユーザーとの対話、設計議論、
プロジェクト文書は原則として日本語で行います。コードの識別子、型名、
関数名、ファイル名は英語を使います。

## VCS

GitHub — use `gh` for issue/PR operations

## 必ず読む文書

Praxios で作業する agent は、コード変更、構造変更、仕様変更の前に次の
文書を読む必要があります。

- `README.md`
- `docs/00-constitution.md`
- `docs/01-domain-model.md`
- `docs/02-agent-contract.md`
- `docs/03-engineering-principles.md`
- `docs/04-security-and-privacy.md`
- `docs/05-architecture-overview.md`
- `docs/code-review.md`
- `docs/adr/0001-initial-architecture.md`
- `docs/adr/0002-zero-trust-for-agentic-work.md`
- `spec/_custom/steering/project.md`
- `spec/_custom/steering/structure.md`
- `spec/_custom/steering/tech.md`

これらの文書に矛盾がある場合は、先に差分と判断材料をユーザーへ提示し、
合意なしに実装で解決しないでください。

`docs/` は Praxios の構想、原則、方向性、制約を示す基礎文書です。
`spec/` は SDD の Blueprint、Requirements、Design、Tasks を置く領域です。
既存 `docs/` を実装仕様そのものとして扱わないでください。

## 作業原則

- 質問にはまず回答してください。
- 推測を仕様として扱わないでください。
- 実装前に、確認した情報源と現状理解を簡潔に共有してください。
- 変更は必要最小限にしてください。
- 実装の都合で domain model を曖昧にしないでください。
- `Source`、`Knowledge`、`Task`、`ContextPacket`、`Artifact`、`Review`、
  `Learning`、`Command`、`Event` を generic object へ潰さないでください。
- AI 生成物を Source の根拠として扱わないでください。
- 重要な外部アクション、破壊的変更、大規模な Knowledge rewrite は human
  approval なしに実行しないでください。

## Review guidelines

- ユーザーが「レビューして」と依頼した場合、まず Codex built-in `/review`
  を使って対象 diff を review してください。
- `/review` には、結果を日本語で出すよう custom instructions を含めてください。
- `/review` の後、必要な場合のみ subagent に観点別レビューを依頼してください。
- 詳細な review workflow は `docs/code-review.md` に従ってください。

## 実装時の制約

- Core domain logic は UI、Markdown、Quartz、外部 API、LLM provider に
  依存してはいけません。
- External systems は adapter として扱ってください。
- LLM output は untrusted external input として検証してください。
- State change は explicit command と event で表現してください。
- 重要な変更は audit 可能にしてください。
- Side effect は名前、permission、log を明示してください。
- Prompts は source code として version 管理、review、test してください。

## 初期 milestone

最初に実装すべきものは、local fixture だけで動く小さな vertical slice です。
real Gmail、Slack、Notion、Google integrations、full web UI、vector DB、
production deployment、自律的な外部送信は、domain loop と trust model が
安定するまで作らないでください。
