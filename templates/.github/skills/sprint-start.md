# /sprint-start — スプリント開始

## いつ使うか

新しいスプリントを開始するとき（スプリントプランニング）。
詳細フローは `.github/sprint-protocol.md` セクション 8「スプリントプランニングをして」を参照。

## 実行プロセス

### 1. スプリント番号を採番する（最初に必ず実行）

スプリント番号の SSOT は GitHub Variable `CURRENT_SPRINT`。main へのコミットは不要。

```bash
# 現在値を取得して +1 した値を設定する（スプリント開始宣言）
CURRENT=$(gh variable get CURRENT_SPRINT)
NEXT=$((CURRENT + 1))
gh variable set CURRENT_SPRINT --body "${NEXT}"
echo "Sprint #${NEXT} を開始"
```

以降このスプリントで作成するすべての PR 本文に `Sprint: ${NEXT}` を含める。

### 2. 前スプリントの Retro Issue をクローズする

新スプリント開始時に、前スプリントの Retro Issue（`retro` ラベル・OPEN）をクローズする：

```bash
gh issue list --label "retro" --state open --json number,title
gh issue close {Retro Issue番号} --comment "Sprint #${NEXT} 開始に伴いクローズ。"
```

### 3. 直近 3 スプリントの平均ベロシティを計算する

```bash
.github/scripts/velocity-report.sh 3
```

出力の実績 pt から平均を算出する（実績なければ初期値 6pt）。

### 4. PBI を選定する

全オープン Issue を取得し、以下の基準で今スプリントの PBI を選定する：

- `priority: P0/P1` を最優先
- `size: XS/S/M` を優先
- 合計ポイントが平均ベロシティ以内に収まる組み合わせ
- 依存関係（ブロッカー）を考慮

### 5. スプリントゴール・仮説を導出し、Variables に記録する

`.github/sprint-protocol.md` セクション 7 の形式でスプリントゴールと仮説をユーザーに提示し、承認後に記録する：

```bash
gh variable set SPRINT_GOAL --body "{このスプリントで○○を実現する}"
gh variable set SPRINT_HYPOTHESIS --body "{○○することで△△が期待できる}"
gh variable set SPRINT_PLANNED_POINTS --body "{選定PBIのsize合計pt}"
```

> Variables は「進行中スプリント」の一時記録。恒久記録はクロージング時に Retro Issue 本文へ転記される。

### 6. 承認後、PBI にラベルを付与する

```bash
gh issue edit {Issue番号} --add-label "sprint-backlog,in-progress"
```

選定した PBI ごとに実行する。`set-sprint-number.yml` が `CURRENT_SPRINT` を読んで Sprint # フィールドを自動設定する。

## 制約

- PBI 選定はユーザーの承認後に実行する
- velocity の派生データを git にコミットしない（実績は Retro Issue とマージ済み PR から都度導出する）
