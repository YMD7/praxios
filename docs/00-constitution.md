# Praxios 基本憲章

## 目的

Praxios は、日々の業務情報を再利用可能な operational knowledge に変換し、
その Knowledge を使って Task を安全に遂行し、完了した work から Learning
を抽出して Knowledge base へ戻すための AI-native な作業基盤です。

Praxios の中核循環は次の通りです。

```text
Source -> Knowledge -> Task -> Context -> Execution
  -> Artifact -> Review -> Learning -> Knowledge
```

## 中核思想

- Personal-first, product-grade で作ります。
- Knowledge は作業遂行のために存在します。
- Task は 1 行 TODO ではなく、現在進行中の work case です。
- Review は後付けの safety feature ではなく、中核概念です。
- AI は準備、抽出、提案、draft を行います。
- 重要な action の承認は human が行います。
- User trust は product feature です。
- 地味で明示的かつ監査可能な architecture を優先します。

## 対象外

Praxios は次のものではありません。

- notes app
- TODO app
- RAG search tool
- Notion clone
- Slack / Gmail summarizer
- 汎用 agent framework
- Karpathy's LLM Wiki の直接実装
- strict OKF implementation
- "Work OS" という名前の製品

## プロダクト境界

Praxios は LLM Wiki 的な knowledge compilation を取り入れますが、wiki
そのものではありません。Praxios は Task execution、Review、Artifact、
Learning loop、external source system 連携、trust model を含む、より広い
work execution system です。

Praxios は OKF 的な portable knowledge representation を取り入れますが、
OKF が core domain を定義するわけではありません。

Quartz は Markdown knowledge を閲覧・公開するための rendering layer です。
Quartz は core architecture ではありません。

## 初期 version の焦点

最初の version は domain loop と trust model を証明することに集中します。
Local files と fixtures だけで vertical slice を実装し、外部連携や production
deployment は後回しにします。

MUST:

- Source と Knowledge を分ける。
- Generated Artifact を Source の根拠として扱わない。
- Task に done criteria と context requirements を持たせる。
- Risky action は review required にする。
- 重要な state changes を audit 可能にする。

MUST NOT:

- 外部 system model を core domain へ漏らす。
- Markdown storage を domain model として扱う。
- LLM output に domain state を直接変更させる。
- 自律的な external sending を初期 version で実装する。
