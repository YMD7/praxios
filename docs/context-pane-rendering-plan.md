# Context Pane Rendering Plan

## 目的

ナビゲーターが Task Context を読みやすく確認できるようにする。
`context.md` は AI が読む正規コンテキストとして維持し、UI では Markdown を HTML として表示する。

## 今回の実装範囲

- `context.md` の保存形式は変更しない。
- Context タブに `Rendered` / `Raw` 表示切替を追加する。
- `Rendered` は Markdown を HTML としてレンダリングする。
- `Raw` は従来通り Markdown テキストをそのまま表示する。
- HTML 変換時は sanitize を行い、危険な HTML を表示しない。
- Mermaid などの図解レンダリングは今回含めない。

## 次フェーズ

- raw Source とは別に、ingest 後の構造化 JSON artifact を保存する。
- JSON artifact は Praxios UI 側で HTML 表示する。
- JSON のキーはトグル付き見出しとして扱う。
- 値は Markdown テキスト、配列、オブジェクトへ段階的に対応する。
- Source 単位の構造化 artifact と Task 単位の Context は別レイヤーとして維持する。

## 実装方針

- Web に Markdown renderer 用の依存を追加する。
- Context ペインに専用の Markdown 表示コンポーネントを追加する。
- 既存の Task Workspace / Source List / API 仕様は変更しない。
- 既存の `context.md` 生成・同期処理は変更しない。

## 検証

- `pnpm --filter @praxios/web typecheck`
- `pnpm typecheck`
