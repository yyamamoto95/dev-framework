#!/usr/bin/env bash
# ============================================================
# velocity-report.sh — スプリント実績を GitHub から pull 型で導出する
#
# 派生データ（velocity）を git にコミットせず、SSOT から都度計算する:
#   - マージ済み PR 本文の `Sprint: N` と `Closes #M`（スプリントと PBI の対応）
#   - Issue の `size:` ラベル（XS=1 / S=2 / M=3 / L=5 / XL=8）
#   - 計画 pt・ゴール・仮説の恒久記録は Retro Issue（`retro` ラベル）を参照する
#   - 進行中スプリントの番号・ゴール・仮説・計画 pt は GitHub Variables
#     （CURRENT_SPRINT / SPRINT_GOAL / SPRINT_HYPOTHESIS / SPRINT_PLANNED_POINTS）
#
# 使い方:
#   .github/scripts/velocity-report.sh [表示スプリント数]   # 既定: 6
#   REPO=owner/repo .github/scripts/velocity-report.sh 10  # 別リポジトリ指定
# ============================================================
set -euo pipefail

REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
COUNT="${1:-6}"

points_for_size() {
  case "$1" in
    XS) echo 1 ;;
    S)  echo 2 ;;
    M)  echo 3 ;;
    L)  echo 5 ;;
    XL) echo 8 ;;
    *)  echo "" ;;
  esac
}

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

# 1. マージ済み PR から (sprint, pr, issues) の対応表を作る
gh pr list --repo "$REPO" --state merged --limit 300 \
  --json number,body --jq '
  .[]
  | select(.body != null)
  | . as $pr
  | ($pr.body | capture("(?i)Sprint:\\s*(?<sprint>[0-9]+)") // empty)
  | {sprint: (.sprint | tonumber),
     pr: $pr.number,
     issues: [$pr.body | scan("(?i)(?:closes|fixes|resolves)\\s+#([0-9]+)") | .[0] | tonumber]}
  | select((.issues | length) > 0)
  | [(.sprint | tostring), (.pr | tostring), (.issues | map(tostring) | join(","))]
  | @tsv
' > "$workdir/sprint-prs.tsv"

if [ ! -s "$workdir/sprint-prs.tsv" ]; then
  echo "Sprint: N を含むマージ済み PR が見つかりませんでした。"
  exit 0
fi

# 1.5. N+1 API コールを防ぐため、Issue 情報を一括取得してキャッシュする
gh issue list --repo "$REPO" --state all --limit 500 \
  --json number,title,labels > "$workdir/issues.json" 2>/dev/null \
  || echo '[]' > "$workdir/issues.json"

# 2. 新しい順に COUNT 件のスプリントを対象にする
sprints=$(cut -f1 "$workdir/sprint-prs.tsv" | sort -run | head -n "$COUNT")

echo "# スプリント実績レポート（pull 型導出 / $(date '+%Y-%m-%d')）"
echo ""

grand_total=0
for s in $sprints; do
  echo "## Sprint #${s}"
  total=0
  pbi_count=0
  unsized=0
  seen=""

  while IFS=$'\t' read -r sprint pr issues; do
    [ "$sprint" = "$s" ] || continue
    for i in ${issues//,/ }; do
      # 同一スプリント内で同じ Issue を重複集計しない
      case " $seen " in *" $i "*) continue ;; esac
      seen="$seen $i"

      # キャッシュから Issue 情報を取得し、なければ個別取得（フォールバック）
      info=$(jq -e -c ".[] | select(.number == $i)" "$workdir/issues.json" 2>/dev/null) || info=""
      if [ -z "$info" ]; then
        info=$(gh issue view "$i" --repo "$REPO" --json title,labels 2>/dev/null) || {
          echo "- #${i} (取得失敗) — PR #${pr}"
          continue
        }
      fi
      title=$(echo "$info" | jq -r '.title')
      size=$(echo "$info" | jq -r '[.labels[].name
        | select(test("(?i)^size:\\s*"))][0] // "" | sub("(?i)^size:\\s*"; "") | ascii_upcase')
      pts=$(points_for_size "$size")

      if [ -n "$pts" ]; then
        total=$((total + pts))
        pt_label="${pts}pt"
      else
        unsized=$((unsized + 1))
        pt_label="—（size ラベル未設定）"
      fi
      pbi_count=$((pbi_count + 1))
      echo "- #${i} ${title} [size: ${size:-なし}] ${pt_label}（PR #${pr}）"
    done
  done < "$workdir/sprint-prs.tsv"

  echo ""
  echo "**完了 PBI: ${pbi_count} 件 / 実績: ${total}pt**"
  [ "$unsized" -gt 0 ] && echo "[警告] size ラベル未設定の PBI が ${unsized} 件あります（ポイント集計から除外）"
  echo ""
  grand_total=$((grand_total + total))
done

# wc -w で単語数を数える（空文字でも 1 と誤カウントしない）。0 件ならゼロ除算を避けて終了する
sprint_count=$(echo ${sprints} | wc -w | tr -d ' ')
if [ "$sprint_count" -eq 0 ]; then
  echo "対象スプリントがありません。"
  exit 0
fi
echo "---"
echo "対象 ${sprint_count} スプリント合計: ${grand_total}pt（平均 $((grand_total / sprint_count))pt/スプリント）"
echo ""
echo "> 計画 pt・ゴール・仮説は各スプリントの Retro Issue（\`retro\` ラベル）を参照。"
echo "> 進行中スプリントは GitHub Variables（CURRENT_SPRINT / SPRINT_GOAL / SPRINT_HYPOTHESIS / SPRINT_PLANNED_POINTS）を参照。"
