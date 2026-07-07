#!/usr/bin/env bash
# ※ shadcn/ui スタック向けプリセット。採用しないプロジェクトではこのフックを導入しない。
# ============================================================
# enforce-ui-wrapper.sh — shadcn/ui ラッパー強制フック
#
# 各エージェントのフックまたは手動実行から呼び出される共通実体。
# Write / Edit 相当の操作前に、書き込まれるコンテンツを検査し、
# @radix-ui/* や vaul を src/components/ui/ 外から直接インポートしようとした場合に
# exit 1 でツール実行をブロックし、ラッパーの使用を促す。
#
# stdin には対応エージェントから JSON 形式でツール入力が渡される。
#
# 自動実行できない環境では、lefthook の pre-commit lint チェックで同等の強制が行われる。
# ============================================================

set -euo pipefail

# stdin から JSON ツール入力を読み込む
INPUT=$(cat)

# ファイルパスを取得（Write: file_path / Edit: file_path）
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('file_path') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")

# 書き込みコンテンツを取得（Write: content / Edit: new_string）
CONTENT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('content') or d.get('new_string') or '')
except Exception:
    print('')
" 2>/dev/null || echo "")

# apps/web/src 配下かつ components/ui/ と __tests__/ 以外のファイルのみチェック
if [[ "$FILE_PATH" == *"apps/web/src"* ]] && \
   [[ "$FILE_PATH" != *"components/ui"* ]] && \
   [[ "$FILE_PATH" != *"__tests__"* ]] && \
   [[ "$FILE_PATH" != *".stories."* ]]; then

  # @radix-ui/* または vaul の直接インポートを検出
  if echo "$CONTENT" | grep -qE "from ['\"]@radix-ui/|from ['\"]vaul['\"]"; then
    echo "ERROR: shadcn/ui ラッパー規約違反を検出しました。" >&2
    echo "" >&2
    echo "  対象ファイル: $FILE_PATH" >&2
    echo "" >&2
    echo "  @radix-ui/* または vaul を src/components/ui/ 外から直接インポートしてはなりません。" >&2
    echo "  @/components/ui/* のラッパーコンポーネントを使用してください。" >&2
    echo "" >&2
    echo "  ラッパーが存在しない場合は先に src/components/ui/{component}.tsx を作成してください。" >&2
    echo "  詳細: .github/rules/coding-conventions.md「shadcn/ui ラッパーコンポーネント規約」" >&2
    exit 1
  fi

  # sonner から Toaster を直接インポートしようとした場合を検出
  if echo "$CONTENT" | grep -qE "import.*\{[^}]*Toaster[^}]*\}.*from ['\"]sonner['\"]"; then
    echo "ERROR: shadcn/ui ラッパー規約違反を検出しました。" >&2
    echo "" >&2
    echo "  対象ファイル: $FILE_PATH" >&2
    echo "" >&2
    echo "  sonner から Toaster を直接インポートしてはなりません。" >&2
    echo "  @/components/ui/sonner の Toaster を使用してください。" >&2
    echo "  (toast() 関数は sonner から直接インポート可です)" >&2
    exit 1
  fi
fi

exit 0
