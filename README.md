# Praxios

## SDD

このリポジトリには、Codex 用の SDD plugin を同梱している。

リポジトリルートで、初回のみ Codex に repo-local marketplace を登録し、
SDD を追加する。

```bash
codex plugin marketplace add .
```

```bash
codex plugin add sdd@ymd7-plugins
```

登録後、新しい Codex セッションで SDD skills が利用できる。
