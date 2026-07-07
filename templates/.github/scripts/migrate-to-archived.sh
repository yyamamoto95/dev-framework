#!/usr/bin/env bash
# migrate-to-archived.sh
#
# 使い方:
#   1. GitHub Projects の UI でステータスフィールドに「Archived」オプションを手動追加する
#      Settings > Fields > Status > Add option > 名前: Archived
#   2. 追加後に生成された option ID を以下の ARCHIVED_OPTION_ID に設定する
#      （取得方法: gh api graphql -f query='{ user(login: "'"$OWNER"'") { projectV2(number: '"$PROJECT_NUMBER"') {
#        field(name: "Status") { ... on ProjectV2SingleSelectField { options { id name } } } } } }'）
#   3. このスクリプトを実行する: bash .github/scripts/migrate-to-archived.sh
#
# 対象: CLOSED かつ Sprint # フィールドが未設定のアイテム → Archived へ移動

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID を環境変数で指定してください}"
STATUS_FIELD_ID="${STATUS_FIELD_ID:?STATUS_FIELD_ID を環境変数で指定してください}"
SPRINT_NUM_FIELD_ID="${SPRINT_NUM_FIELD_ID:?SPRINT_NUM_FIELD_ID を環境変数で指定してください}"
OWNER="${OWNER:-$(gh repo view --json owner --jq .owner.login)}"
PROJECT_NUMBER="${PROJECT_NUMBER:?PROJECT_NUMBER を環境変数で指定してください}"

# --- ここを「Archived」の option ID に書き換える（UI で追加後に確認） ---
ARCHIVED_OPTION_ID="${ARCHIVED_OPTION_ID:-}"

if [[ -z "$ARCHIVED_OPTION_ID" ]]; then
  echo "エラー: ARCHIVED_OPTION_ID が未設定です。"
  echo "GitHub Projects UI で「Archived」ステータスを追加し、option ID を環境変数として渡してください。"
  echo ""
  echo "現在のステータス一覧:"
  gh api graphql -f query='query($login: String!, $number: Int!) {
    user(login: $login) {
      projectV2(number: $number) {
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            options { id name }
          }
        }
      }
    }
  }' -f login="$OWNER" -F number="$PROJECT_NUMBER" \
     --jq '.data.user.projectV2.field.options[] | "\(.id)  \(.name)"'
  echo ""
  echo "実行例: ARCHIVED_OPTION_ID=xxxx bash .github/scripts/migrate-to-archived.sh"
  exit 1
fi

echo "Archived option ID: $ARCHIVED_OPTION_ID"
echo "対象: CLOSED かつ Sprint # 未設定のアイテムを Archived に移動します..."

# アイテム一覧取得
ITEMS=$(gh api graphql -f query='query($login: String!, $number: Int!) {
  user(login: $login) {
    projectV2(number: $number) {
      items(first: 100) {
        nodes {
          id
          fieldValues(first: 15) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2Field { name } }
              }
            }
          }
          content {
            ... on Issue {
              number
              state
            }
          }
        }
      }
    }
  }
}' -f login="$OWNER" -F number="$PROJECT_NUMBER")

# Python で対象アイテムを絞り込んで移動
echo "$ITEMS" | python3 - <<PYEOF
import json, sys, subprocess

data = json.loads(sys.stdin.read())
nodes = data["data"]["user"]["projectV2"]["items"]["nodes"]

targets = []
for node in nodes:
    content = node.get("content", {})
    if not content or content.get("state") != "CLOSED":
        continue
    status = None
    sprint_num = None
    for fv in node.get("fieldValues", {}).get("nodes", []):
        fname = fv.get("field", {}).get("name", "")
        if fname == "Status":
            status = fv.get("name")
        elif fname == "Sprint #":
            sprint_num = fv.get("number")
    if status == "Done" and sprint_num is None:
        targets.append((node["id"], content.get("number")))

print(f"移動対象: {len(targets)} 件")
for item_id, issue_num in targets:
    mutation = """
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "$PROJECT_ID"
    itemId: "$ITEM_ID"
    fieldId: "$FIELD_ID"
    value: { singleSelectOptionId: "$OPTION_ID" }
  }) { projectV2Item { id } }
}
""".replace("$PROJECT_ID", "${PROJECT_ID}") \
   .replace("$ITEM_ID", item_id) \
   .replace("$FIELD_ID", "${STATUS_FIELD_ID}") \
   .replace("$OPTION_ID", "${ARCHIVED_OPTION_ID}")
    result = subprocess.run(
        ["gh", "api", "graphql", "-f", f"query={mutation}"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  #{issue_num} -> Archived")
    else:
        print(f"  #{issue_num} エラー: {result.stderr[:100]}")
PYEOF

echo "完了。スプリント一覧ビューの No Sprint グループを確認してください。"
