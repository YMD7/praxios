# コードレビュー手順

## 目的

この文書は Praxios の標準 review workflow を定義します。
Runtime code、docs、SDD steering、ADR のいずれも、review 依頼時はこの流れを
基準にします。

## デフォルトルール

ユーザーが「レビューして」と依頼した場合、まず Codex built-in `/review` を
使います。

`/review` は、選択した diff を専用 reviewer が読み、working tree を変更せずに
prioritized actionable findings を返すための標準入口です。

## 対象範囲の選択

対象は依頼内容に合わせて選びます。

- PR 前提の branch review: base branch との差分を review する。
- commit review: 指定 commit を review する。
- 未 commit の作業確認: uncommitted changes を review する。
- 文書・設計 review: custom review instructions を指定する。

## Custom instructions の扱い

Praxios では、runtime code 以外の変更も重要です。`/review` 実行時は対象に
応じて custom instructions を明示します。

すべての `/review` custom instructions には、レビュー結果を日本語で返すよう
明記します。

SDD steering / docs review の例:

```text
Review this as foundational documentation and SDD steering, not runtime code.
Focus on contradictions, missing guardrails, over-specified decisions,
under-specified security/trust requirements, and future implementation risks.
Return the review findings in Japanese.
```

Runtime code review の例:

```text
Review this change for correctness, domain model violations, unsafe side effects,
missing validation, missing tests, and regressions against Praxios foundational
docs.
Return the review findings in Japanese.
```

## Subagent を使う場合

`/review` の結果だけで判断できない場合、または複数の独立した観点が必要な
場合のみ subagent review を追加します。

有効な分割例:

- Product / SDD consistency
- Security / Zero Trust
- Architecture / maintainability
- Testing / workflow coverage

Subagent には、修正せず review のみ行うよう指示し、file / line reference、
severity、actionable finding を要求します。

## Triage

Review 結果はそのまま鵜呑みにせず、次に分類します。

- Must fix: 矛盾、重大な設計リスク、安全性・trust model の欠落。
- Should fix: 将来の実装で誤解を生む曖昧さ、重要な不足。
- Consider: 好みや軽微な改善。必要なら後続 issue / SDD task に送る。
- Won't fix: 誤読、過剰指摘、現段階では意図的に未決定の事項。

## 出力形式

レビュー結果をユーザーに返すときは、finding を先に出します。

- Severity
- File / line
- Issue
- Why it matters
- Suggested fix

Summary は最後に短く置きます。

## Review と実装の分離

Review 中に勝手に修正を始めてはいけません。修正する場合は、findings と
対応方針をユーザーに提示し、合意を得てから行います。
