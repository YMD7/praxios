# Praxios Design System

## 目的

Praxios のUIを増やす前に、設計判断と実装判断の基準を統一する。
この文書は、開発者とAIエージェントがUIを追加・変更するときの参照先である。

## 基本方針

- Praxios は作業台であり、マーケティングサイトではない。
- UIは密度を保ち、反復作業・比較・確認が速いことを優先する。
- 装飾よりも、状態、根拠、次の操作が明確であることを優先する。
- Source、Context、Task、AI Terminal の関係が常に追跡できるようにする。
- 見た目の独自性は、個別CSSではなくデザイントークンで表現する。
- 新しいUIは、既存の画面構造・余白・角丸・色の使い方に合わせる。

## 技術的な土台

- UIフレームワーク: React + Vite
- スタイリング: Tailwind CSS v4
- コンポーネント基盤: shadcn/ui
- アイコン: lucide-react
- shadcn/ui 設定: `apps/web/components.json`
- トークン定義: `apps/web/src/styles.css`
- shadcn/ui コンポーネント: `apps/web/src/components/ui`
- プロダクト固有コンポーネント: `apps/web/src/components`

## shadcn/ui 方針

- まず shadcn/ui で該当するプリミティブを探す。
- 既存の `Button`、`ScrollArea`、`Tabs`、`Resizable` などを優先して使う。
- 新しい汎用UIが必要な場合は、shadcn/ui の追加を第一候補にする。
- shadcn/ui コンポーネントを変更する場合は、API互換性をできるだけ保つ。
- Praxios固有の振る舞いは、薄いラッパーやvariantで表現する。
- 見た目だけのために、shadcn/ui と重複する独自コンポーネントを増やさない。

## デザイントークン

トークンの正本は `apps/web/src/styles.css` とする。

### コアトークン

shadcn/ui のセマンティックトークンを基本にする。

- `--background`
- `--foreground`
- `--card`
- `--popover`
- `--primary`
- `--secondary`
- `--muted`
- `--accent`
- `--destructive`
- `--border`
- `--input`
- `--ring`

### Praxios 固有トークン

作業台としての体験に必要な意味を持つトークンを追加する。

- ナビゲーション: `--sidebar-*`
- ターミナル: `--terminal-*`
- 状態表示: `--success-*`、`--warning-*`、`--error-*`
- コード表示: `--code-*`、`--inline-code`
- リンク: `--link`
- フォーカス: `--focus`

### トークン追加ルール

- TSX内に直接カラーコードを書かない。
- Tailwind arbitrary color で色を直接指定しない。
- 新しい色は、意味が明確なトークンとして `styles.css` に追加する。
- light / dark の両方に値を定義する。
- 1画面だけの都合でトークンを増やさない。
- 2箇所以上で使う、またはドメイン上の意味がある場合に追加する。

## レイアウト

- アプリの中心は Workbench であり、全画面の作業領域を優先する。
- ページ全体はフル幅の作業面として扱い、装飾的なカード階層を増やさない。
- 個別カードは、リスト項目、モーダル、ツールのまとまりに限定する。
- カードの角丸は原則 `8px` 以下にする。
- テキストはコンテナ内で折り返し、ボタンやタブからはみ出させない。
- 固定フォーマットのUIは、幅・高さ・最小幅を明示してレイアウトシフトを防ぐ。
- モバイル幅でも情報が重ならないことを確認する。

## コンポーネント設計

- 共通UIは `apps/web/src/components/ui` に置く。
- 業務文脈を持つUIは `apps/web/src/components/<domain>` に置く。
- 画面固有の構成は `apps/web/src/views` に置く。
- lucide に該当アイコンがある場合は lucide を使う。
- 更新、削除、閉じる、表示切替などの操作はアイコンボタンを優先する。
- 意味が曖昧なアイコンボタンには `aria-label` と `title` を付ける。
- 主要アクションはテキストまたはアイコン+テキストで明示する。
- フォーム、テーブル、リストは既存の密度と余白に合わせる。

## AIエージェントでのUI実装手順

UIを追加・変更する前に、次を確認する。

- `DESIGN.md`
- `apps/web/components.json`
- `apps/web/src/styles.css`
- 変更対象に近い既存画面またはコンポーネント

実装の順序:

(1) 既存UIとトークンを調査する。

(2) 変更方針を短く整理する。

(3) shadcn/ui または既存UIで再利用できるものを選ぶ。

(4) 必要最小限のコードで実装する。

(5) 型チェック、ビルド、画面確認を行う。

Figma やMCPから取得した情報は、完成コードではなく設計意図として扱う。
Praxiosのトークン、既存コンポーネント、アクセシビリティ要件へ翻訳して実装する。

## 完了条件

UI変更は、次を満たしたら完了とする。

- shadcn/ui または既存コンポーネントを優先している。
- 色、角丸、余白が既存トークンと整合している。
- light / dark の両方で破綻しない。
- キーボード操作とフォーカス表示が成立する。
- アイコンボタンに `aria-label` または `title` がある。
- ローディング、空状態、エラー状態の表示を考慮している。
- デスクトップと狭い幅でテキストやUIが重ならない。
- `pnpm typecheck` が通る。
- Web UIを変更した場合は `pnpm --filter @praxios/web build` が通る。

## 将来の拡張

- 画面数が増えたら、共通パターンを `docs/design/` に分割する。
- 視覚回帰テストが必要になったら Playwright のスクリーンショット検証を導入する。
- Figmaを正本にする段階になったら、Figma変数とCSSトークンの対応表を追加する。
