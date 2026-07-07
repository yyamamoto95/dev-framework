# スプリントレトロスペクティブ テンプレート

**用途**: スプリント完了時に AI エージェントが埋めてスプリントボードに登録するための振り返り定義。
`スプリントレビューをして` および `フルスプリントを回して` のクロージングフェーズで自動生成される。

## このファイルの位置づけ

- レトロは **「Retro: Sprint #N」という専用 Issue** として作成し、スプリントボードに登録する
- コメントとして投稿するのは補助的な通知のみ（完了PBIへの参照リンクを貼る程度）
- **アクションアイテム（Try）は個別の GitHub Issue として作成**し、`retro-action` ラベルを付けて次スプリントのバックログに自動追加する

---

## AI が実行するクロージングフロー（詳細）

### Step 1: データ収集（pull 型導出）

```bash
# 対象スプリントの完了 PBI・実績 pt をマージ済み PR + size ラベルから導出
.github/scripts/velocity-report.sh 3

# 進行中スプリントのゴール・仮説・計画 pt（GitHub Variables）
gh variable get CURRENT_SPRINT
gh variable get SPRINT_GOAL
gh variable get SPRINT_HYPOTHESIS
gh variable get SPRINT_PLANNED_POINTS

# サイクルタイムは measure-cycle-time.yml が各 PBI Issue にコメント投稿済み
gh issue view {PBI番号} --comments

# 前スプリントのRetro Issueを取得（前回のTry確認用）
gh issue list --label "retro" --state closed --limit 3 --json number,title,body
```

> velocity の恒久記録はこの Retro Issue 自体である。git に派生データ（旧 velocity-log.json）はコミットしない。

### Step 2: 前回Tryの実行確認

前回の「Retro: Sprint #N-1」Issueの `## Try` セクションを読み込み、
各アクションアイテムの `retro-action` Issueが `Done` になっているか確認する。

### Step 3: Retro Issue 作成

以下のテンプレートを埋めて GitHub Issue を作成する：

```bash
gh issue create \
  --title "Retro: Sprint #N" \
  --label "retro" \
  --body "..."
```

### Step 4: アクションアイテムを個別 Issue 化

Try セクションの各アイテムを個別 Issue として作成し、`retro-action` + `backlog` + **`size: XS/S/M/L`（必須）** ラベルを付ける：

```bash
gh issue create \
  --title "[Retro Action] {アクションの内容}" \
  --label "retro-action" --label "backlog" --label "size: XS" \
  --body "Sprint #N のレトロで特定した改善アクション。\n\n## 背景\n{Problemの内容}\n\n## 対応\n{Tryの内容}\n\nRef: Retro #{Retro Issue番号}"
```

> **注意**: `size:` ラベルの設定は必須。未設定の場合ポイント集計（velocity-report.sh）から除外される。`--label "retro-action,backlog"` の形式ではスペース付きラベルが正しく適用されないため、`--label` を個別に指定すること。

### Step 5: Retro Issue をプロジェクトボードに登録

```bash
# Issue をプロジェクトに追加
ITEM_ID=$(gh project item-add {{PROJECT_NUMBER}} --owner {{GITHUB_OWNER}} --url {Retro IssueのURL} --format json | jq -r '.id')

# Sprint # フィールドを設定（{{PROJECT_SPRINT_FIELD_ID}}）
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
  updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: $value}) {
    projectV2Item { id }
  }
}' -f projectId="{{PROJECT_ID}}" -f itemId="$ITEM_ID" \
   -f fieldId="{{PROJECT_SPRINT_FIELD_ID}}" -F "value[number]={N}"

# Source PBI フィールドを設定（{{PROJECT_SOURCE_PBI_FIELD_ID}}）
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
  updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: $value}) {
    projectV2Item { id }
  }
}' -f projectId="{{PROJECT_ID}}" -f itemId="$ITEM_ID" \
   -f fieldId="{{PROJECT_SOURCE_PBI_FIELD_ID}}" -f "value[text]=Sprint #{N} 全PBI（{PBI番号列}）"

# Status を Done に設定（{{PROJECT_STATUS_FIELD_ID}} / Done option: {{PROJECT_STATUS_DONE}}）
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
  updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: $value}) {
    projectV2Item { id }
  }
}' -f projectId="{{PROJECT_ID}}" -f itemId="$ITEM_ID" \
   -f fieldId="{{PROJECT_STATUS_FIELD_ID}}" -f "value[singleSelectOptionId]={{PROJECT_STATUS_DONE}}"
```

### Step 6: retro-action Issue をプロジェクトボードに登録

各 retro-action Issue をプロジェクトに追加し、以下のフィールドを設定する：

```bash
ACTION_ITEM_ID=$(gh project item-add {{PROJECT_NUMBER}} --owner {{GITHUB_OWNER}} --url {retro-action IssueのURL} --format json | jq -r '.id')

# Sprint # = 発生したスプリント番号
gh api graphql -f query='mutation(...) {...}' \
  -f fieldId="{{PROJECT_SPRINT_FIELD_ID}}" -F "value[number]={N}"

# Source PBI = 課題が発生したPBI番号または "Process"
gh api graphql -f query='mutation(...) {...}' \
  -f fieldId="{{PROJECT_SOURCE_PBI_FIELD_ID}}" -f "value[text]={#番号 or Process（原因の説明）}"
```

### Step 7: 完了PBIにRetro IssueへのリンクをNotify

```bash
gh issue comment {PBI Issue番号} --body "スプリントレトロスペクティブを作成しました: #{Retro Issue番号}"
```

---

## Retro Issue 本文テンプレート

AI は以下を実際のデータで埋めて Issue 本文とすること。`{placeholder}` を必ず置換する。

```markdown
## スプリント概要

| 項目 | 値 |
|------|---|
| スプリント番号 | #{N} |
| 実施日 | {YYYY-MM-DD} |
| 完了PBI | {PBI数}件 |
| 計画pt / 実績pt | {planned_points}pt / {total_points}pt |
| 達成率 | {total_points / planned_points × 100}%（planned_points が null の場合は「計測データなし」） |
| 平均サイクルタイム | {X}h（計測済みPBIのみ） |
| 前スプリント比 | {+X / -X pt}（前スプリントとの比較） |

---

## 仮説検証

| 項目 | 内容 |
|------|------|
| スプリントゴール | {GitHub Variable SPRINT_GOAL を転記} |
| 仮説 | {GitHub Variable SPRINT_HYPOTHESIS を転記} |
| 結果 | {実装完了 / 計測データなし（次スプリントで確認） / 仮説検証済み（理由）} |

---

## 完了PBI一覧

| Issue | タイトル | Size | 見積pt | CT (h) | 乖離 |
|-------|---------|------|--------|--------|------|
| #{番号} | {タイトル} | {size} | {pt}pt | {CT}h | {予定通り / +Xh超過 / -Xh短縮} |

---

## Keep（続けること）

- {うまくいったこと・再現したいアプローチ}

---

## Problem（問題だったこと）

- {詰まったポイントとその原因}

---

## Try — アクションアイテム

> 各アイテムは個別Issueとして作成済みです（`retro-action` ラベル）。
> 次スプリントのRetroで実行確認します。

- [ ] #{retro-action Issue番号} {アクションの内容}

---

## 前スプリントのTryを実行できたか

| Try（Sprint #{N-1}） | 対応Issue | 結果 |
|---------------------|----------|------|
| {前回のTry内容} | #{番号} | {完了 / 未着手 / 進行中} |

---

## AI診断

- **速度**: {直近3スプリントのサイクルタイムトレンド}
- **品質**: バグ率 {fix pt / 合計 pt}%（警戒ライン: 30%超） / tech-debt比率 {tech-debt pt / 合計 pt}%
- **詰まり**: {ブロック頻度と主な原因}
- **次の1アクション**: {最優先の改善提案}

---

_自動生成: スプリントエージェント — {生成日時}_
```

---

## AI 記入時の注意事項

1. **データを必ず確認してから記入する**（`.github/scripts/velocity-report.sh`・GitHub Variables・`gh pr view` で事実ベース）
2. **サイクルタイム乖離の基準**: XS < 0.5h / S < 2h / M < 4h / L < 5h
3. **前回Tryの確認**: 前スプリントの `retro-action` Issue の状態を `gh issue view` で確認する
4. **推測・憶測は記載しない**。データがない場合は「計測データなし」と明記する
5. **アクションアイテムは具体的に**: 「改善する」ではなく「○○ファイルの○○手順を追記する」のように書く
