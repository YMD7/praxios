# Spec B01-S01: Local fixture workflow タスクリスト

## 共通ガード

- 実装前に `requirements.md` と `design.md` を読む。
- S01 は local fixture workflow に限定し、real external integrations、external LLM
  provider、Web UI、vector database、production deployment を実装しない。
- Domain logic は CLI、Markdown storage、Zod、filesystem に依存させない。
- Generated Artifact を Source evidence として扱わない。
- Review required な Task completion は approval なしで成功させない。
- 新しい top-level workspace directory を追加する場合は、先に spec を更新する。
- Secret、token、credential、real private data を fixtures や tests に含めない。

## External Track 0: Manual Setup Preflight

追加手動作業なし。

- S01 は local files と synthetic fixtures のみを対象にする。
- 外部 service signup、API token、OAuth app、webhook、DNS、deployment、production data
  operation は不要。
- Package install は実装環境の通常作業であり、product runtime の外部依存ではない。

## Phase 1: Runtime baseline

- [x] T1.1: **TypeScript workspace を初期化する**
      _要件_: requirements.技術制約
      _依存_: なし
      _完了条件_:
  - `package.json`、`pnpm` workspace 設定、TypeScript 設定を追加する
  - `apps/cli`、`packages/core`、`packages/application`、`packages/ports`、
    `packages/adapters`、`contracts` の必要最小限の実装 directory を作る
  - 空の将来 directory は作らない

- [x] T1.2: **Vitest と基本 test scripts を設定する**
      _要件_: requirements.テスト要件
      _依存_: T1.1
      _完了条件_:
  - `pnpm test` で Vitest が起動する
  - 最小 smoke test が通る
  - test fixture 出力先は repository の canonical docs と混ざらない

- [x] T1.3: **共通型とエラー型を定義する**
      _要件_: design.Error handling
      _依存_: T1.1
      _完了条件_:
  - application error code を定義する
  - `invalid_workspace`、`invalid_frontmatter`、`missing_reference`、
    `invalid_transition`、`approval_required`、`fixture_not_found`、`lint_failed` を
    表現できる
  - CLI が error code を表示できる形にする

- [x] T1.4: **ID generator と Clock port を実装する**
      _要件_: requirements.AC2.1, requirements.AC5.1
      _依存_: T1.1
      _完了条件_:
  - `src_`、`know_`、`task_`、`artifact_`、`review_`、`event_` prefix を生成できる
  - ID prefix と type の対応を test する
  - deterministic test 用 Clock / IdGenerator を用意する

## Phase 2: Contracts and workspace adapter

- [x] T2.1: **Zod contracts を追加する**
      _要件_: requirements.AC2.1, requirements.AC3.1, requirements.AC4.1, requirements.AC4.2
      _依存_: T1.1, T1.3, T1.4
      _完了条件_:
  - `ids.schema.ts`、`source.schema.ts`、`task-candidate.schema.ts`、`task.schema.ts`、
    `artifact.schema.ts`、`review.schema.ts`、`event-log.schema.ts`、`lint.schema.ts`
    を追加する
  - required fields、status enum、ID prefix、ref format を validation できる
  - Artifact contract は `artifact_kind` ごとに `task_ref` 要否を validation できる
  - contracts が state transition authorization を持たない

- [x] T2.2: **Markdown frontmatter read/write を実装する**
      _要件_: requirements.AC1.1, requirements.AC1.2
      _依存_: T2.1
      _完了条件_:
  - Markdown file から frontmatter と body を読み取れる
  - frontmatter validation failure を `invalid_frontmatter` として返す
  - write 時に human-readable slug filename と stable `id` を分離できる

- [x] T2.3: **Workspace initialization を実装する**
      _要件_: requirements.AC1.1, requirements.AC1.2
      _依存_: T2.2
      _完了条件_:
  - `sources/`、`knowledge/`、`tasks/`、`artifacts/`、`reviews/`、`log.md`、
    `praxios.md`、`.praxios/config.yaml` を作成できる
  - `.praxios/` に canonical user data を置かない
  - 再実行しても既存 canonical data を破壊しない

- [x] T2.4: **Event log adapter を実装する**
      _要件_: requirements.AC5.1
      _依存_: T2.2, T2.3
      _完了条件_:
  - `log.md` に event-like section を append できる
  - `EventLogEntry` の `event_id`、`occurred_at`、`actor_id`、`agent_id`、
    `command`、`target`、`task_ref`、`allowed_source_refs`、
    `allowed_knowledge_refs`、`allowed_tools`、`approval_refs`、`previous_status`、
    `new_status`、`result`、`rationale`、`refs` を記録できる
  - application service と fake agent 呼び出しに `CommandContext` を渡せる
  - strict event replay は実装しない

## Phase 3: Source and Task workflow

- [x] T3.1: **Synthetic meeting transcript fixture を追加する**
      _要件_: requirements.AC2.1
      _依存_: T1.2
      _完了条件_:
  - private data を含まない meeting transcript fixture を追加する
  - expected TaskCandidate output fixture を追加する
  - fixture に secret、token、credential、real private data が含まれない

- [ ] T3.2: **Source capture workflow を実装する**
      _要件_: requirements.AC2.1
      _依存_: T2.3, T2.4, T3.1
      _完了条件_:
  - fixture を `sources/*.md` に保存できる
  - `content_hash` により同一 fixture の duplicate Source を防げる
  - SourceCaptured log entry を append する

- [ ] T3.3: **DeterministicAgentAdapter で TaskCandidate extraction を実装する**
      _要件_: requirements.AC2.2
      _依存_: T2.1, T3.1, T3.2
      _完了条件_:
  - fixture input から deterministic candidate set を返す
  - output は validation を通ってから保存される
  - candidate set は `artifact_kind: task_candidate_set` の Artifact として保存される
  - candidate set は Task confirm 前の Artifact なので `task_ref` を捏造しない
  - TaskCandidateCreated log entry を append する

- [ ] T3.4: **Task confirmation を実装する**
      _要件_: requirements.AC3.1
      _依存_: T3.3
      _完了条件_:
  - candidate-set Artifact と candidate key から `tasks/*.md` を作成できる
  - Task は `task_` ID、done criteria、source refs、trigger refs を持つ
  - TaskCandidate と confirmed Task の identity を混同しない
  - TaskConfirmed log entry を append する

- [ ] T3.5: **ContextPacket section generation を実装する**
      _要件_: requirements.AC3.2
      _依存_: T3.4
      _完了条件_:
  - Task body に `## Context Packet` section を作成または更新できる
  - related Source、Knowledge、constraints、missing information、risks を記録する
  - unrelated data を混ぜないことを test で確認する
  - ContextPacketBuilt log entry を append する

## Phase 4: Artifact, Review, completion, learning

- [ ] T4.1: **Artifact draft generation を実装する**
      _要件_: requirements.AC4.1
      _依存_: T3.5
      _完了条件_:
  - ContextPacket から deterministic Artifact draft を生成する
  - Artifact は `artifact_` ID、task ref、source refs、generated_by を持つ
  - Artifact を Source evidence として扱わない
  - ArtifactDraftGenerated log entry を append する

- [ ] T4.2: **Review request と approval simulation を実装する**
      _要件_: requirements.AC4.2
      _依存_: T4.1
      _完了条件_:
  - Artifact draft 生成時に Review request を作成できる
  - Review は `review_` ID、target ref、decision、rationale、approval scope を持つ
  - `approve-review` 相当の application service で approved にできる
  - ReviewRequested と ReviewApproved log entries を append する

- [ ] T4.3: **Task completion approval gate を実装する**
      _要件_: requirements.AC4.2, requirements.AC5.1
      _依存_: T4.2
      _完了条件_:
  - 対象 Task または completion に使う draft Artifact を承認する approved Review が
    ない Task completion は `approval_required` で失敗する
  - `task_completion` を含む approval scope がある場合のみ Task status を `completed` にできる
  - 別 Task / 別 Artifact / scope 不一致の Review では completion を通さない
  - TaskCompleted log entry を append する

- [ ] T4.4: **Learning / Knowledge update proposal を実装する**
      _要件_: requirements.AC5.2
      _依存_: T4.3
      _完了条件_:
  - completed Task から Learning candidate を作れる
  - active Knowledge を silent mutation しない
  - `artifact_kind: knowledge_update_proposal` の Artifact として Source refs、
    Task refs、confidence / uncertainty を記録する
  - KnowledgeUpdateProposed log entry を append する

## Phase 5: Lint, CLI, workflow verification

- [ ] T5.1: **Workspace lint rules を実装する**
      _要件_: requirements.AC5.3
      _依存_: T2.1, T2.2, T4.4
      _完了条件_:
  - missing frontmatter、invalid ID prefix / type / directory mismatch、
    missing refs、empty done criteria、invalid status、
    approval-required completion without matching target/scope、
    Artifact-as-Source misuse を検出する
  - unique IDs、Source `content_hash`、`log.md` required fields for major transitions を
    検出対象に含める
  - lint result は severity、code、message、target、suggested action を含む
  - lint は自動修正しない

- [ ] T5.2: **CLI entrypoints を実装する**
      _要件_: requirements.AC1.1, requirements.AC2.1, requirements.AC3.1, requirements.AC4.2, requirements.AC5.3
      _依存_: T3.5, T4.4, T5.1
      _完了条件_:
  - `praxios init`、`load-fixture`、`extract-task-candidates`、`confirm-task`、
    `build-context`、`draft-artifact`、`approve-review`、`complete-task`、
    `propose-learning`、`lint` 相当の command を実行できる
  - CLI は application services を呼ぶだけにする
  - errors は actionable message と non-zero exit code を返す
  - `praxios lint` は `LintCompleted` log entry を append する

- [ ] T5.3: **Happy path workflow test を追加する**
      _要件_: requirements.テスト要件
      _依存_: T5.2
      _完了条件_:
  - temp workspace で Source capture から lint まで通る
  - happy-path fixture workspace に high-severity lint issue が残らない
  - `log.md` に主要 transition が記録される

- [ ] T5.4: **Unit and adapter tests を追加する**
      _要件_: requirements.テスト要件
      _依存_: T5.1, T5.2
      _完了条件_:
  - contract unit tests が required fields、status enum、ID prefix、ref format を検証する
  - domain state transition tests が invalid transition と approval target/scope gate を検証する
  - lint rule unit tests が各 S01 lint rule を検証する
  - Markdown adapter tests が read/write と frontmatter validation を検証する
  - malformed fake-agent output が domain command へ変換されないことを検証する

- [ ] T5.5: **Failure workflow tests を追加する**
      _要件_: requirements.テスト要件
      _依存_: T5.1, T5.2, T5.4
      _完了条件_:
  - duplicate fixture import が duplicate Source を作らない
  - required frontmatter 欠落を拒否する
  - invalid ID prefix を lint または validation が検出する
  - approval なし、または target/scope が一致しない Task completion を拒否する
  - generated Artifact を Source evidence として扱う誤りを検出する

- [ ] T5.6: **仕様同期と完了確認を行う**
      _要件_: requirements.完了条件
      _依存_: T5.3, T5.5
      _完了条件_:
  - README または docs に必要な実行方法を追記する
  - `requirements.md`、`design.md`、`tasks.md` と実装差分の不一致を確認する
  - `pnpm test` が通る
  - S01 が external integrations、real external sending、production deployment を含まないことを確認する
