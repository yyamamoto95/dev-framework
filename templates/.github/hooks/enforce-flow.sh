#!/usr/bin/env bash
# ============================================================
# enforce-flow.sh — main ブランチへの直接編集をブロックするフック
#
# 各エージェントのフックまたは手動実行から呼び出される共通実体。
# Write / Edit / MultiEdit 相当の操作前にブランチを確認し、
# main/master 上の場合は exit 1 でツール実行をブロックする。
#
# 自動実行できない環境では、作業開始時に手動で実行することを推奨する。
#   $ bash .github/hooks/enforce-flow.sh
# ============================================================

set -euo pipefail

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  echo "ERROR: main/master への直接編集は禁止されています。" >&2
  echo "       /branch スキルで作業ブランチを作成してください。" >&2
  echo "       例: git checkout -b feat/issue-NNN-description" >&2
  exit 1
fi

exit 0
