# mulmoclaude 参照メモ

## 位置づけ

この文書は、Praxios の設計時に参照する外部プロジェクトメモです。
実装仕様ではありません。

mulmoclaude は、LLM Wiki、workspace-as-agent、DSL-as-harness 的な考え方を
実際の local workspace と UI / API / agent workflow に落とし込んでいる
参考実装です。Praxios は mulmoclaude を直接コピーしませんが、local-first な
knowledge workspace、agent-readable files、lint / health check、書き込み経路の
設計で継続的に参考にします。

## 参照元

- Repository: <https://github.com/receptron/mulmoclaude>
- Wiki help:
  <https://github.com/receptron/mulmoclaude/blob/main/packages/services/workspace-setup/assets/helps/wiki.md>
- Workspace is the Agent:
  <https://github.com/receptron/mulmoclaude/blob/main/docs/papers/workspace-is-the-agent.md>
- Workspace paths:
  <https://github.com/receptron/mulmoclaude/blob/main/server/workspace/paths.ts>
- Wiki page writer:
  <https://github.com/receptron/mulmoclaude/blob/main/server/workspace/wiki-pages/io.ts>
- Wiki API route:
  <https://github.com/receptron/mulmoclaude/blob/main/server/api/routes/wiki.ts>
- Wiki backlinks:
  <https://github.com/receptron/mulmoclaude/blob/main/server/workspace/wiki-backlinks/index.ts>
- Index parser:
  <https://github.com/receptron/mulmoclaude/blob/main/src/lib/wiki-page/index-parse.ts>

## 観察した構成

mulmoclaude の LLM Wiki は、単なる Markdown directory ではなく、workspace、
agent workflow、API、UI、writer、parser、lint / graph / backlink を含む
subsystem です。

代表的な wiki layout:

```text
data/wiki/
  index.md
  log.md
  summary.md
  SCHEMA.md
  pages/
    <topic>.md
  sources/
    <slug>.md
```

主な操作:

- `Ingest`: source から entities / concepts を抽出し、wiki pages を作成または
  更新し、cross-reference、log、index を整える。
- `Query`: `index.md` と関連 pages を読み、根拠付きで回答する。
- `Lint`: contradictions、stale claims、orphan pages、missing cross-reference、
  page 化すべき concepts を検出し、必要に応じて修正する。

重要な設計:

- Markdown + YAML frontmatter を user-visible な knowledge representation にする。
- `index.md` を browse / query の入口にする。
- `log.md` を wiki activity の記録にする。
- `pages/` と `sources/` を分ける。
- 小さな常時 context と、大きな on-demand wiki を分ける。
- wiki page write を単一の writer 経路へ寄せ、atomic write、frontmatter 更新、
  editor identity、history snapshot をそこで扱う。
- index parser、graph、lint などは pure helper として分離する。

## Praxios へ取り込むべき考え方

Praxios v0 では、mulmoclaude の UI / API / history / backlink 機構をそのまま
導入しません。まず plain-file workspace と domain loop を安定させます。

それでも、次の考え方は早期から採用する価値があります。

- `Source` と `Knowledge` を file layout 上でも分ける。
- `index.md` や `log.md` に相当する入口と変更記録を持つ。
- Markdown/frontmatter を人間と agent の両方が読める contract として扱う。
- Direct file edit を無制限に許さず、将来の単一 writer 経路を意識する。
- Lint / health check を、後付けの整形機能ではなく trust infrastructure として
  扱う。
- Parser / validator / graph builder / lint rule は UI や CLI から独立させる。

## Praxios がそのまま真似しないこと

- `data/wiki/` を Praxios の top-level model にしない。
  Praxios では `sources/`、`knowledge/`、`tasks/`、`artifacts/`、`reviews/`
  が first-class workspace areas です。
- Wiki を product の中心概念にしない。
  Praxios の中心は knowledge-backed work execution loop です。
- v0 で web UI plugin、session backlink、history snapshot、roles / skills /
  collections を含む広い workspace-as-agent runtime を作らない。
- Lint を自動修正中心にしない。
  初期は検出、説明、proposal を優先します。

## Lint / health check の示唆

Praxios の lint は、Markdown の style check ではありません。仕組みが壊れた状態を
早期に発見するための workspace health check です。

壊れ方の例:

- `Knowledge` が根拠 Source、provenance、status を持たない。
- `Source` と `Artifact` が混同され、AI 生成物が evidence として扱われる。
- `Task` が done criteria、context requirements、required decisions を欠く。
- `Review` が必要な action が review なしで完了扱いになる。
- `ContextPacket` が task と無関係な Source / Knowledge / sensitive data を含む。
- 同じ rule / procedure / decision が複数ページで矛盾する。
- 更新されたはずの Knowledge が old assumption を残している。
- orphan Knowledge が増え、将来の task execution に使われない。
- `log.md` や Event history と実ファイルの state が食い違う。
- sync conflict、partial write、broken link、missing frontmatter により agent が
  誤った context を読む。

初期 lint は、問題を自動修正するよりも、次を出力するべきです。

- 何が壊れている可能性があるか。
- どのファイルと concept に関係するか。
- risk level。
- 推奨される manual review または proposal。
- 自動修正してよい場合と、human approval が必要な場合の区別。

## 将来の設計論点

後続の SDD Blueprint / Spec では、次を検討します。

- `praxios lint` を workspace 全体の health check にするか、対象別 command に
  分けるか。
- lint rule を domain rule、storage rule、security rule、linking rule、
  freshness rule に分類するか。
- lint result を Artifact、Review、Event のどれとして記録するか。
- lint の自動修正をどこまで許すか。
- lint を vertical slice の acceptance criteria に含めるか。
