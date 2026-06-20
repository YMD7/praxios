# Praxios

Praxios は、日々の業務情報を再利用可能な知識に変え、その知識を使って
仕事を安全に遂行するための AI-native な作業基盤です。

名前は "praxis" と "OS" から作った造語です。ここでの praxis は、知識や
理論を実践に移すことを意味します。Praxios は製品名であり、"Work OS" は
製品名として使いません。

## 現在の状態

このリポジトリはブートストラップ段階です。まだ runtime application code
はありません。最初の成果物は、今後の実装とレビューが従う基礎文書です。

今後の Codex session は、コード変更前に次の文書を読む必要があります。

- [AGENTS.md](AGENTS.md)
- [docs/00-constitution.md](docs/00-constitution.md)
- [docs/01-domain-model.md](docs/01-domain-model.md)
- [docs/02-agent-contract.md](docs/02-agent-contract.md)
- [docs/03-engineering-principles.md](docs/03-engineering-principles.md)
- [docs/04-security-and-privacy.md](docs/04-security-and-privacy.md)
- [docs/05-architecture-overview.md](docs/05-architecture-overview.md)
- [docs/adr/0001-initial-architecture.md](docs/adr/0001-initial-architecture.md)
- [docs/adr/0002-zero-trust-for-agentic-work.md](docs/adr/0002-zero-trust-for-agentic-work.md)

SDD の steering 文書は `spec/_custom/steering/` から参照できます。
これらは実装仕様ではなく、Blueprint / Requirements / Design / Tasks を作る
ための方向づけです。

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

推奨する最初の slice は次の通りです。

(1) meeting transcript fixture を Source として読み込む
(2) TaskCandidate を抽出する
(3) 1 つの Task を confirm する
(4) 関連 Source と Knowledge から ContextPacket を作る
(5) Artifact draft または proposal を生成する
(6) Review required として記録する
(7) approval を simulate する
(8) Task を complete する
(9) Learning / Knowledge update proposal を作る

最初から real Gmail、Slack、Notion、Google integrations、vector database、
multi-user permissions、production deployment、自律的な外部送信は作り
ません。

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
