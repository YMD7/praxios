#!/bin/bash
# ワークツリー削除スクリプト（サブモジュール対応・秘匿ファイル回収版）
# SDD プラグイン用（${CLAUDE_PLUGIN_ROOT}/scripts/ 配下に配置）

set -euo pipefail

# デバッグログ（タイムアウト調査用）
_CLEANUP_LOG="/tmp/cleanup-worktree-debug.log"
_log() { echo "[$(date '+%H:%M:%S')] $1" >> "$_CLEANUP_LOG"; }
_log_start() {
  echo "=== cleanup-worktree debug log ===" > "$_CLEANUP_LOG"
  _log "START: args=$*"
}

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# スクリプト自身の配置ディレクトリ（兄弟スクリプトへの参照用）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# プロジェクトルート解決（スクリプトの配置場所に依存しない）
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -z "$PROJECT_ROOT" ]]; then
  echo "❌ エラー: git リポジトリ内で実行してください" >&2
  exit 1
fi

# ヘルプ表示
show_help() {
  cat << 'EOF'
ワークツリー削除スクリプト（SDD プラグイン用）

使い方:
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-worktree.sh <worktree_name_or_path>

引数:
  worktree_name_or_path  削除するワークツリー/ブランチ名

オプション:
  -h, --help            このヘルプを表示
  --dry-run             実行予定の操作を表示（削除は行わない）

例:
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-worktree.sh specB02-S01-T1.1
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-worktree.sh --dry-run adhoc/test-branch

機能:
  - サブモジュール対応の安全削除
  - 秘匿ファイル自動回収（差分チェック付き）
  - ローカル・リモートブランチ削除
  - mainブランチ保護
  - ベースブランチ自動同期（develop → main フォールバック）
  - パッケージマネージャ自動検出（bun/pnpm/yarn/npm）
EOF
}

# エラーメッセージ表示
error() {
  echo -e "${RED}❌ エラー: $1${NC}" >&2
}

# 警告メッセージ表示
warn() {
  echo -e "${YELLOW}⚠️  警告: $1${NC}" >&2
}

# 成功メッセージ表示
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# 情報メッセージ表示
info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# パッケージマネージャ検出 + install 実行
run_package_install() {
  if [[ -f "$PROJECT_ROOT/bun.lock" ]] || [[ -f "$PROJECT_ROOT/bun.lockb" ]]; then
    bun install
  elif [[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]]; then
    pnpm install --frozen-lockfile --ignore-scripts
  elif [[ -f "$PROJECT_ROOT/yarn.lock" ]]; then
    yarn install --frozen-lockfile
  elif [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
    npm ci
  else
    info "ロックファイルが見つかりません。依存インストールをスキップします"
    return 0
  fi
}

# ベースブランチ同期（テスト対象関数）
sync_base_branch() {
  local dry_run="${1:-false}"

  local base_branch="develop"
  if ! git rev-parse --verify "origin/$base_branch" >/dev/null 2>&1; then
    base_branch="main"
  fi

  if ! $dry_run; then
    _log "Step7: fetch origin $base_branch"
    git fetch origin "$base_branch" 2>/dev/null || { warn "フェッチに失敗しました"; base_branch=""; }
    _log "Step7: fetch done"

    if [[ -n "$base_branch" ]]; then
      local local_rev remote_rev current_branch
      local_rev=$(git rev-parse "$base_branch" 2>/dev/null || echo "none")
      remote_rev=$(git rev-parse "origin/$base_branch" 2>/dev/null || echo "")
      current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

      # remote ref が解決できない場合は「更新あり」と誤判定しないよう早期に抜ける
      if [[ -z "$remote_rev" ]]; then
        warn "origin/${base_branch} の revision を取得できませんでした（fetch 後の状態不整合）"
        return
      fi

      if [[ "$local_rev" != "$remote_rev" ]]; then
        info "リモートに新しいコミットがあります"

        # `git pull origin <base>` は current branch にマージする挙動のため、
        # base branch を明示的に更新できる場合のみ更新する（current == base）
        if [[ "$current_branch" != "$base_branch" ]]; then
          warn "現在のブランチが ${base_branch} と異なるため、ローカル ${base_branch} は更新しません (current: ${current_branch})"
          info "手動更新する場合: git checkout ${base_branch} && git merge --ff-only origin/${base_branch}"
        else
          _log "Step7: git merge --ff-only origin/$base_branch"
          if git merge --ff-only "origin/$base_branch"; then
            _log "Step7: merge done"
            success "${base_branch} ブランチを最新に更新しました"

            info "依存パッケージを同期中..."
            _log "Step7: package install"
            if run_package_install; then
              _log "Step7: package install done"
              success "依存パッケージのインストール完了"
            else
              warn "依存パッケージのインストールに失敗しました（手動で実行してください）"
            fi
          else
            warn "fast-forward マージに失敗しました（手動で確認してください）"
          fi
        fi
      else
        success "${base_branch} ブランチは最新です"
      fi
    fi
  else
    info "実行予定: git fetch origin ${base_branch}（current が ${base_branch} の場合のみ ff-merge）"
  fi
}

# ===== ここまでがテスト可能な関数定義ゾーン =====
# ソースガード: _CLEANUP_WORKTREE_TESTING=1 の場合はここで停止
if [[ "${_CLEANUP_WORKTREE_TESTING:-}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi
# ===== ここからがスクリプト本体（テスト時は実行されない）=====

# 引数チェック
if [[ $# -eq 0 ]]; then
  error "引数が必要です"
  echo ""
  show_help
  exit 1
fi

# オプション解析
DRY_RUN=false
TARGET=""

# 解析ループで `shift` すると `$@` が空になり、後段のログで実行引数が追えなくなるため保存しておく
ORIGINAL_ARGS=("$@")

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      TARGET="$1"
      shift
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  error "ワークツリー名またはパスを指定してください"
  exit 1
fi

# プロジェクトルートに移動
cd "$PROJECT_ROOT"
_log_start "${ORIGINAL_ARGS[@]}"

# ワークツリー一覧を取得
info "ワークツリー一覧を取得中..."
WORKTREE_LIST=$(git worktree list --porcelain)

# 対象ワークツリーを検索（完全一致のみ）
# 部分一致は似た名前の別ワークツリーを誤削除するリスクがあるため使わない
WORKTREE_PATH=""
WORKTREE_BRANCH=""
MATCHES=()

while IFS= read -r line; do
  if [[ $line == worktree* ]]; then
    CURRENT_PATH="${line#worktree }"
  elif [[ $line == branch* ]]; then
    CURRENT_BRANCH="${line#branch refs/heads/}"
    CURRENT_BASENAME="$(basename "$CURRENT_PATH")"

    # パス完全一致 / パス末尾（basename）一致 / ブランチ完全一致 のみ許容
    if [[ "$CURRENT_PATH" == "$TARGET" ]] \
      || [[ "$CURRENT_BASENAME" == "$TARGET" ]] \
      || [[ "$CURRENT_BRANCH" == "$TARGET" ]]; then
      MATCHES+=("$CURRENT_PATH"$'\t'"$CURRENT_BRANCH")
    fi
  fi
done <<< "$WORKTREE_LIST"

# 複数一致は曖昧なので中断（誤削除防止）
if [[ ${#MATCHES[@]} -gt 1 ]]; then
  error "複数のワークツリーが一致しました（曖昧）: $TARGET"
  echo ""
  info "一致したワークツリー:"
  for m in "${MATCHES[@]}"; do
    echo "  ${m%%$'\t'*}  [${m##*$'\t'}]"
  done
  echo ""
  info "完全なパスまたはブランチ名で指定してください"
  exit 1
fi

if [[ ${#MATCHES[@]} -eq 1 ]]; then
  IFS=$'\t' read -r WORKTREE_PATH WORKTREE_BRANCH <<< "${MATCHES[0]}"
fi

# 対象が見つからない場合
if [[ -z "$WORKTREE_PATH" ]]; then
  error "ワークツリーが見つかりません: $TARGET"
  echo ""
  info "利用可能なワークツリー:"
  git worktree list
  exit 1
fi

# メインブランチチェック
if [[ "$WORKTREE_BRANCH" == "main" ]] || [[ "$WORKTREE_BRANCH" == "master" ]]; then
  error "mainブランチは削除できません"
  exit 1
fi

# メインリポジトリチェック
if [[ "$WORKTREE_PATH" == "$PROJECT_ROOT" ]]; then
  error "メインリポジトリは削除できません"
  exit 1
fi

# 削除対象を表示
echo ""
info "削除対象:"
echo "  パス: $WORKTREE_PATH"
echo "  ブランチ: $WORKTREE_BRANCH"
echo ""

if $DRY_RUN; then
  info "ドライランモード: 実際の削除は行いません"
  echo ""
fi

# ステップ1: 秘匿ファイル回収（ワークツリー削除前に実行）
_log "Step1: secret file recovery"
info "ステップ1: 秘匿ファイル回収..."

# 一時ファイル管理
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

COPIED_LIST="$TEMP_DIR/copied"
SKIPPED_LIST="$TEMP_DIR/skipped"
OVERWRITTEN_LIST="$TEMP_DIR/overwritten"
ERROR_LIST="$TEMP_DIR/error"
DIFF_FLAG="$TEMP_DIR/diff_found"

touch "$COPIED_LIST" "$SKIPPED_LIST" "$OVERWRITTEN_LIST" "$ERROR_LIST"

# 秘匿ファイル検索・処理
while IFS= read -r worktree_file; do
  rel_path="${worktree_file#$WORKTREE_PATH/}"
  root_file="$PROJECT_ROOT/$rel_path"

  # ルート側に既存の場合は差分チェック
  if [[ -f "$root_file" ]] || [[ -L "$root_file" ]]; then
    # `set -e` の下で `diff -q` が 1 を返すとスクリプトが終了してしまうため if で包む
    if diff -q "$worktree_file" "$root_file" >/dev/null 2>&1; then
      diff_exit_code=0
    else
      diff_exit_code=$?
    fi

    if [[ $diff_exit_code -eq 0 ]]; then
      info "  ⏭️  スキップ（同一）: $rel_path"
      echo "$rel_path" >> "$SKIPPED_LIST"
    elif [[ $diff_exit_code -eq 1 ]]; then
      touch "$DIFF_FLAG"
      warn "  ⚠️  差分検出: $rel_path"

      if $DRY_RUN; then
        info "     → ドライラン: 上書き確認が必要"
      else
        echo "     差分あり。上書きしますか？"
        read -r -p "     (y/N): " response

        if [[ "$response" =~ ^[Yy]$ ]]; then
          if cp "$worktree_file" "$root_file"; then
            success "     ✅ 上書き完了: $rel_path"
            echo "$rel_path" >> "$OVERWRITTEN_LIST"
          else
            error "     ❌ 上書き失敗: $rel_path"
            echo "$rel_path" >> "$ERROR_LIST"
          fi
        else
          info "     ⏭️  スキップ: $rel_path"
          echo "$rel_path" >> "$SKIPPED_LIST"
        fi
      fi
    else
      error "  ❌ 比較失敗: $rel_path (exit code: $diff_exit_code)"
      echo "$rel_path" >> "$ERROR_LIST"
    fi
    continue
  fi

  # ルート側に存在しない場合は自動コピー
  root_dir="$(dirname "$root_file")"

  if $DRY_RUN; then
    info "  📋 コピー予定: $rel_path"
    echo "$rel_path" >> "$COPIED_LIST"
  else
    mkdir -p "$root_dir"
    if cp "$worktree_file" "$root_file"; then
      success "  ✅ コピー完了: $rel_path"
      echo "$rel_path" >> "$COPIED_LIST"
    else
      error "  ❌ コピー失敗: $rel_path"
      echo "$rel_path" >> "$ERROR_LIST"
    fi
  fi
done < <(bash "$SCRIPT_DIR/detect-secrets.sh" "$WORKTREE_PATH")

# カウント集計
COPIED_COUNT=$(wc -l < "$COPIED_LIST" | tr -d ' ')
SKIPPED_COUNT=$(wc -l < "$SKIPPED_LIST" | tr -d ' ')
OVERWRITTEN_COUNT=$(wc -l < "$OVERWRITTEN_LIST" | tr -d ' ')
ERROR_COUNT=$(wc -l < "$ERROR_LIST" | tr -d ' ')

# サマリー表示
echo ""
if $DRY_RUN; then
  info "秘匿ファイル回収（ドライラン）:"
  echo "  コピー予定: $COPIED_COUNT 個"
  echo "  スキップ: $SKIPPED_COUNT 個"
  if [[ -f "$DIFF_FLAG" ]]; then
    warn "  差分あり（確認必要）"
  fi
else
  info "秘匿ファイル回収サマリー:"
  echo "  コピー: $COPIED_COUNT 個"
  echo "  上書き: $OVERWRITTEN_COUNT 個"
  echo "  スキップ: $SKIPPED_COUNT 個"
  if [[ $ERROR_COUNT -gt 0 ]]; then
    warn "  エラー: $ERROR_COUNT 個"
  fi
fi
echo ""

# ステップ2: サブモジュール処理
_log "Step2: submodule check"
info "ステップ2: サブモジュール確認..."

# サブモジュールの存在確認
HAS_SUBMODULES=false
if [[ -f "$WORKTREE_PATH/.gitmodules" ]] && [[ -s "$WORKTREE_PATH/.gitmodules" ]]; then
  HAS_SUBMODULES=true
fi

# status でも確認（.gitmodules が空の場合対応）
SUBMODULE_STATUS=$(cd "$WORKTREE_PATH" && git submodule status 2>/dev/null || true)
if [[ -n "$SUBMODULE_STATUS" ]]; then
  HAS_SUBMODULES=true
fi

if $HAS_SUBMODULES; then
  warn "サブモジュールが検出されました"

  # サブモジュール一覧を取得
  SUBMODULES=""
  if [[ -f "$WORKTREE_PATH/.gitmodules" ]] && [[ -s "$WORKTREE_PATH/.gitmodules" ]]; then
    SUBMODULES=$(cd "$WORKTREE_PATH" && git config --file .gitmodules --get-regexp path 2>/dev/null | awk '{ print $2 }' || true)
  fi

  if [[ -z "$SUBMODULES" ]]; then
    SUBMODULES=$(cd "$WORKTREE_PATH" && git submodule status 2>/dev/null | awk '{ print $2 }' || true)
  fi

  if [[ -n "$SUBMODULES" ]]; then
    echo "$SUBMODULES" | while IFS= read -r submodule; do
      if [[ -n "$submodule" ]]; then
        info "  サブモジュールを解除: $submodule"
        if ! $DRY_RUN; then
          cd "$WORKTREE_PATH"
          git submodule deinit -f "$submodule" 2>/dev/null || warn "サブモジュール解除に失敗（継続）"
        fi
      fi
    done
  else
    warn "サブモジュールパス特定失敗（手動削除を試行）"
  fi
else
  success "サブモジュールなし"
fi

# ステップ3: ワークツリー削除
_log "Step3: worktree remove"
info "ステップ3: ワークツリー削除..."

if ! $DRY_RUN; then
  if git worktree remove "$WORKTREE_PATH" --force 2>/dev/null; then
    success "ワークツリーを削除しました"
  else
    warn "git worktree remove が失敗。代替方法を試行..."
    git worktree prune 2>/dev/null || true

    if [[ -d "$WORKTREE_PATH" ]]; then
      warn "ディレクトリが残存: 手動削除が必要"
      warn "  find \"$WORKTREE_PATH\" -depth -delete"
    else
      success "ワークツリーを削除しました（prune経由）"
    fi
  fi
fi

# ステップ4: Git管理情報クリーンアップ
_log "Step4: worktree prune"
info "ステップ4: Git管理情報クリーンアップ..."

if ! $DRY_RUN; then
  git worktree prune -v 2>&1 || true
  success "Git管理情報をクリーンアップしました"
fi

# ステップ5: ローカルブランチ削除
_log "Step5: local branch delete"
info "ステップ5: ローカルブランチ削除..."

if ! $DRY_RUN; then
  if git branch | grep -q "^\s*${WORKTREE_BRANCH}$"; then
    git branch -D "$WORKTREE_BRANCH"
    success "ローカルブランチを削除しました: $WORKTREE_BRANCH"
  else
    info "ローカルブランチは既に削除されています"
  fi
else
  info "実行予定: git branch -D $WORKTREE_BRANCH"
fi

# ステップ6: リモートブランチ確認・削除
_log "Step6: remote branch check"
info "ステップ6: リモートブランチ確認..."

REMOTE_EXISTS=$(git ls-remote --heads origin "$WORKTREE_BRANCH" 2>/dev/null || true)

if [[ -n "$REMOTE_EXISTS" ]]; then
  warn "リモートブランチが存在します: origin/$WORKTREE_BRANCH"

  if $DRY_RUN; then
    info "実行予定: git push origin --delete $WORKTREE_BRANCH"
  else
    git push origin --delete "$WORKTREE_BRANCH"
    success "リモートブランチを削除しました"
  fi
else
  success "リモートブランチは存在しません"

  # リモート追跡参照があれば削除
  if git branch -r | grep -q "^\s*origin/${WORKTREE_BRANCH}$"; then
    if ! $DRY_RUN; then
      git branch -dr "origin/$WORKTREE_BRANCH"
      success "リモート追跡参照を削除しました"
    else
      info "実行予定: git branch -dr origin/$WORKTREE_BRANCH"
    fi
  fi
fi

# ステップ7: ベースブランチの同期
_log "Step7: sync base branch"
info "ステップ7: ベースブランチの同期..."
sync_base_branch "$DRY_RUN"
_log "Step7: done"

# ステップ8: メインリポジトリの未ステージ変更を検知・報告
if ! $DRY_RUN; then
  unstaged=$(git diff --name-only 2>/dev/null)
  if [ -n "$unstaged" ]; then
    echo ""
    warn "main に未ステージの変更があります:"
    echo "$unstaged" | sed 's/^/  /'
    echo "  （必要に応じて確認・コミットしてください）"
  fi
fi

# 最終確認
echo ""
info "クリーンアップ完了！"
echo ""
info "現在のワークツリー:"
git worktree list

echo ""
info "残存するブランチ参照:"
git branch -a | grep -i "$TARGET" || echo "（該当なし）"

_log "COMPLETED"
exit 0
