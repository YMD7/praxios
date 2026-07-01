# ユーザー設定 (config.json)

Praxios の一部の挙動は、ローカルの JSON ファイルで設定できる。現状は Agent terminal で
起動できるエージェント定義とデフォルト選択を管理する。トップレベルキーを追加するだけで
設定項目を拡張できる構造になっている。

## ファイルの場所と優先順位

設定は次の 2 か所から読み込まれ、`組み込み → ユーザー単位 → プロジェクト単位` の順で
上書きされる（後勝ち）。

| 層 | パス | 用途 |
|----|------|------|
| ユーザー単位 | `~/.config/praxios/config.json`（`XDG_CONFIG_HOME` 準拠） | マシン全体の既定 |
| プロジェクト単位 | `<workspaceRoot>/.praxios/config.json` | リポジトリ固有の上書き |

- マージはトップレベルキー単位。あるキーを定義した最上位の層が、そのキーの値を丸ごと決める。
  例: ユーザー単位で `agents` を、プロジェクト単位で `defaultAgent` のみを定義した場合、
  `agents` はユーザー単位、`defaultAgent` はプロジェクト単位が採用される。
- どちらのファイルも無い場合は組み込みデフォルト（Codex / Claude Code、デフォルトは Codex）を使う。
- JSON が壊れている・スキーマに合わない場合は警告を出してその層を無視し、下位層へフォールバックする。

`.praxios/` は `.gitignore` 対象のため、プロジェクト単位設定はコミットされない（各自のローカル設定）。

## スキーマ

```jsonc
{
  // 利用可能なエージェントの一覧（1 件以上、id は一意）
  "agents": [
    {
      "id": "codex",             // 内部識別子（必須・一意）
      "label": "Codex",          // UI 表示名（必須）
      "command": "codex",        // pty で実行するコマンド（必須）
      "description": "OpenAI Codex CLI"  // 補足説明（任意）
    }
  ],
  // 初期選択されるエージェントの id（agents に存在しない値なら先頭要素にフォールバック）
  "defaultAgent": "codex"
}
```

## 記入例

Claude Code をデフォルトにしつつ、任意の CLI エージェントを追加する例:

```json
{
  "agents": [
    { "id": "claude", "label": "Claude Code", "command": "claude", "description": "Anthropic Claude Code CLI" },
    { "id": "codex", "label": "Codex", "command": "codex", "description": "OpenAI Codex CLI" },
    { "id": "gemini", "label": "Gemini", "command": "gemini" }
  ],
  "defaultAgent": "claude"
}
```

## 反映タイミング

- 設定は API の `GET /config` および Agent terminal の新規接続時に都度読み込まれるため、
  サーバー再起動は不要（既存の terminal セッションには反映されない）。
- Web UI の Settings 画面（左メニュー）は現在の実効設定を読み取り専用で表示する。
  設定ファイル編集後は Settings の再読み込みボタンで最新値を確認できる。

## 注意

`command` は `node-pty` 経由でそのまま実行される。設定ファイルはユーザー自身が管理する
ローカル開発ツールの一部という前提で、任意コマンドの実行を許容している。
