# Praxios

Praxios は、日々の業務情報を再利用可能な知識に変え、その知識を使って
仕事を安全に遂行するための AI-native な作業基盤です。

名前は "praxis" と "OS" から作った造語です。ここでの praxis は、知識や
理論を実践に移すことを意味します。Praxios は製品名であり、"Work OS" は
製品名として使いません。

## 現在の状態

このリポジトリは初期実装段階です。基礎文書と SDD 構造に加えて、
`B01-S01 local fixture workflow` の小さな vertical slice が入っています。
この slice は local files と synthetic fixtures だけを使い、外部 SaaS 連携、
external LLM provider、production deployment、自律的な外部送信は含みません。

今後の Codex session は、コード変更前に次の文書を読む必要があります。

- [AGENTS.md](AGENTS.md)
- [docs/00-constitution.md](docs/00-constitution.md)
- [docs/01-domain-model.md](docs/01-domain-model.md)
- [docs/02-agent-contract.md](docs/02-agent-contract.md)
- [docs/03-engineering-principles.md](docs/03-engineering-principles.md)
- [docs/04-security-and-privacy.md](docs/04-security-and-privacy.md)
- [docs/05-architecture-overview.md](docs/05-architecture-overview.md)
- [docs/code-review.md](docs/code-review.md)
- [docs/references/mulmoclaude.md](docs/references/mulmoclaude.md)
- [docs/adr/0001-initial-architecture.md](docs/adr/0001-initial-architecture.md)
- [docs/adr/0002-zero-trust-for-agentic-work.md](docs/adr/0002-zero-trust-for-agentic-work.md)
- [docs/adr/0003-plain-file-workspace.md](docs/adr/0003-plain-file-workspace.md)

SDD の steering 文書は `spec/_custom/steering/` から参照できます。
これらは実装仕様ではなく、Blueprint / Requirements / Design / Tasks を作る
ための方向づけです。

## 参考プロジェクト

- [mulmoclaude](docs/references/mulmoclaude.md): LLM Wiki、local workspace、
  lint / health check、workspace-as-agent 的な設計の参照元。

## プロダクトの目的

Praxios は単なる notes app、TODO app、RAG search tool、Notion clone、
generic agent framework ではありません。

Praxios の目的は、次の循環を安全に成立させることです。

```text
Source -> Knowledge -> Task -> Context -> Execution
  -> Artifact -> Review -> Learning -> Knowledge
```

最初のユーザーは 1 人です。ただし、使い捨ての個人スクリプトとしては作り
ません。データ構造、安全性、監査性、テスト、拡張性は、将来的に他者が使う
可能性にも耐える水準を目指します。

## 最初の開発方針

最初の milestone は full product ではありません。外部連携や web UI を
作る前に、local files と fixtures だけで小さな vertical slice を通します。

現在の `B01-S01` slice は次の流れを実装しています。

(1) meeting transcript fixture を Source として読み込む
(2) TaskCandidate を抽出する
(3) 1 つの Task を confirm する
(4) 関連 Source と Knowledge から ContextPacket を作る
(5) Artifact draft または proposal を生成する
(6) Review required として記録する
(7) approval を simulate する
(8) Task を complete する
(9) Learning / Knowledge update proposal を作る
(10) workspace lint / health check を実行する

最初から real Gmail、Slack、Notion、Google integrations、vector database、
multi-user permissions、production deployment、自律的な外部送信は作り
ません。

## S01 local workflow の実行

依存関係を入れた後、まず build と test を実行します。

```bash
pnpm install
```

```bash
pnpm build
```

```bash
pnpm test
```

CLI は build 後の `apps/cli/dist/index.js` から実行できます。以下は一時
workspace で synthetic fixture を使う例です。

```bash
WORKSPACE=/tmp/praxios-workspace
```

```bash
node apps/cli/dist/index.js init \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js load-fixture product-launch-sync \
  --workspace "$WORKSPACE"
```

以降の command は直前の JSON 出力に含まれる `id` を使って進めます。

```bash
node apps/cli/dist/index.js extract-task-candidates <source_id> \
  product-launch-sync \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js confirm-task <candidate_artifact_id> \
  candidate-1 \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js build-context <task_id> \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js draft-artifact <task_id> \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js request-review <artifact_id> \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js approve-review <review_id> \
  "Approved for completion." \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js complete-task <task_id> <artifact_id> \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js propose-learning <task_id> \
  --workspace "$WORKSPACE"
```

```bash
node apps/cli/dist/index.js lint \
  --workspace "$WORKSPACE"
```

CLI は application services を呼ぶ薄い entrypoint です。business logic は
CLI ではなく `packages/application` と contracts / adapters 側に置きます。

## Local tooling

このリポジトリには、Codex 用の SDD plugin を同梱しています。

リポジトリルートで、初回のみ Codex に repo-local marketplace を登録し、
SDD を追加できます。

```bash
codex plugin marketplace add .
```

```bash
codex plugin add sdd@ymd7-plugins
```

登録後、新しい Codex セッションで SDD skills が利用できます。
