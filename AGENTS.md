# AGENTS.md

## Project Guidance

- UIを変更する前に `DESIGN.md` を読む。
- shadcn/ui と既存デザイントークンを優先する。
- shadcn/ui 設定は `apps/web/components.json` を確認する。
- トークンの正本は `apps/web/src/styles.css` とする。
- UI実装では、Praxios固有の判断を `DESIGN.md` に従って行う。

## Verification

- 通常の型チェック: `pnpm typecheck`
- Web UIのビルド: `pnpm --filter @praxios/web build`
- 変更後は `git status --short` で差分を確認する。
