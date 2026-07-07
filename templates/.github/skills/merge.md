# /merge — レビュー対応からマージまで

## いつ使うか

PR を作成した後、レビューコメントへの対応・返信・会話クローズ・マージを一連で行うとき。
PR 番号（例: `359`）を引数として渡す。引数がない場合は現在のブランチの PR を自動検出する。

## 実行プロセス

### 1. PR の特定

```bash
# 引数あり
gh pr view {PR番号}

# 引数なし（現在ブランチから自動検出）
gh pr view
```

PR の URL・タイトル・ブランチ名・CI 状態を確認する。

### 2. レビューコメントの全件取得

**インラインコメント**（行指摘）と **PR レビュー本文**（AI ボット総評を含む）の両方を取得する。

```bash
# インラインコメント（行指摘）
gh api repos/{owner}/{repo}/pulls/{PR番号}/comments \
  --jq '.[] | {id, path, line, body, user: .user.login}'

# PR レビュー本文（gemini-code-assist 等 AI ボットの総評もここに含まれる）
gh pr view {PR番号} --repo {owner}/{repo} --json reviews \
  --jq '.reviews[] | {author: .author.login, state: .state, body: .body}'
```

取得した指摘を一覧化し、対応要否を判断する。

| 分類 | 判断基準 | 対応 |
|------|---------|------|
| 修正が必要 | バグ・規約違反・`high` 優先度の指摘 | コードを修正してコミット → `/commit` を使用 |
| 修正不要 | `medium`/`low`/NIT・既に対応済み・意図的な設計 | 返信のみ |

### 3. 必要な修正の実施

修正が必要な指摘がある場合、`/commit` スキルの手順に従ってコードを修正・コミット・プッシュする。
修正後、対応内容をコメント返信に明記する。

### 4. 全コメントへの返信

指摘ごとに返信する。

```bash
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies \
  --method POST \
  --field body="{返信内容}"
```

**返信の書き方:**
- 修正した場合: 「対応しました。{変更内容}（コミット: {hash}）」
- 対応不要の場合: 「ご指摘ありがとうございます。{理由}のため現状を維持します」
- 既に対応済みの場合: 「対応済みです。{コミット: {hash}}」

### 5. 全スレッドを resolve

未 resolve のスレッドを GraphQL で全件クローズする。

```bash
# スレッド ID の取得
gh api graphql -f query='
{
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {PR番号}) {
      reviewThreads(first: 20) {
        nodes { id isResolved }
      }
    }
  }
}'

# 未 resolve のスレッドをクローズ
gh api graphql -f query="mutation {
  resolveReviewThread(input: {threadId: \"{thread_id}\"}) {
    thread { isResolved }
  }
}"
```

### 6. マージ前の最終確認

以下を全て確認してから進む。

```bash
# CI チェックの状態
gh pr checks {PR番号}

# マージ可否・レビュー判定
gh pr view {PR番号} --json mergeable,reviewDecision,reviewRequests
```

| チェック項目 | 合格条件 |
|------------|---------|
| CI 全ジョブ | `pass` または `skipped`（`fail` が 0 件） |
| 未 resolve スレッド | 0 件 |
| Approve | Required review がある場合は承認済み |
| マージ可否 | `mergeable: MERGEABLE` |

いずれかが未達の場合はマージせず、ユーザーに状況を報告して指示を待つ。

### 7. マージ

```bash
gh pr merge {PR番号} --squash --delete-branch
```

- `--squash`: コミットを 1 つにまとめてマージ（デフォルト）
- `--delete-branch`: マージ後にブランチを自動削除

マージ完了後、マージされたコミット SHA と PR URL をユーザーに報告する。

## 制約

- 修正コミットは `/commit` のチェックリストを経由すること
- 全 CI が通過するまでマージしない
- `--force` / `--admin` は使用しない
- マージ方式（squash/merge/rebase）はユーザー指示があればそれに従う
- マージ後の main へのデプロイ確認はユーザーの判断に委ねる
