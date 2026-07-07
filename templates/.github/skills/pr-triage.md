# /pr-triage — Gemini レビューの AI トリアージ

## いつ使うか

`needs-ai-triage` ラベルが付いた PR が存在するとき。
Gemini Code Assist がレビューを投稿すると GitHub Actions が自動でラベルを付与する。

## 事前に読み込むファイル

- `.github/rules/coding-conventions.md` — 規約の SSOT（判断基準・指摘不要事項を含む）

---

## 実行プロセス

### 1. トリアージ対象 PR を取得する

```bash
gh pr list \
  --repo {owner}/{repo} \
  --label "needs-ai-triage" \
  --state open \
  --json number,title,author,url
```

対象が 0 件なら「トリアージ待ちの PR はありません」と報告して終了する。

---

### 2. 各 PR のレビュー内容を取得する

対象 PR ごとに以下を実行する。

```bash
# Gemini のレビュー一覧を取得する
gh api repos/{owner}/{repo}/pulls/{PR_NUMBER}/reviews \
  --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")] | last'

# インラインコメントを取得する
gh api repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments \
  --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")]'

# 変更ファイル一覧を取得する
gh pr view {PR_NUMBER} \
  --repo {owner}/{repo} \
  --json files
```

---

### 3. 各指摘の妥当性を評価する

`.github/rules/coding-conventions.md`（末尾の「Gemini Code Assist レビューガイド」セクションを含む）を参照し、各指摘について以下を判断する。

| 判定 | 意味 | 対応 |
|------|------|------|
| `valid` | 規約違反・バグの可能性あり | 要修正 |
| `invalid` | プロジェクト方針と合わない誤指摘 | 対応不要（理由を説明） |
| `info` | 任意の改善提案 | 対応不要（参考として記録） |

#### 評価のポイント

- プロトタイプ・実験用ディレクトリへの指摘は限定的に評価する
- プロジェクト固有の評価基準（意図的な規約・許容パターン）は `.github/rules/coding-conventions.md` を参照
- 日本語コミット・絵文字禁止は意図的な規約であり指摘不要
- セキュリティ指摘（XSS・シークレット漏洩）はプロトタイプでも `valid`

---

### 4. トリアージ結果をコメントで投稿する

```bash
gh pr comment {PR_NUMBER} \
  --repo {owner}/{repo} \
  --body "{TRIAGE_COMMENT}"
```

コメントフォーマット:

```markdown
## AI トリアージ結果

> Gemini Code Assist のレビューを AI エージェントが評価しました。

**総合評価**: {一言サマリー}

### 指摘の評価

| # | 指摘箇所 | 判定 | 優先度 | 理由 | 対応 |
|---|---------|------|--------|------|------|
| 1 | {path}:{line} | 有効/対象外/情報 | MAJOR/MINOR/NIT | {理由} | **要修正/対応不要/適用外** |

---
{all_clear なら}
[OK] 全指摘が対応不要と判断されました。CI が通り次第マージします。

{要修正ありなら}
[要対応] 要修正の指摘が {n} 件あります。修正してコミットすると Gemini が再レビューします。
```

---

### 5a. 全指摘が対応不要の場合 → 自動マージを予約する

```bash
# needs-ai-triage を除去して ai-triaged を付与する
gh pr edit {PR_NUMBER} \
  --repo {owner}/{repo} \
  --remove-label "needs-ai-triage" \
  --add-label "ai-triaged"

# CI 通過後に自動マージを予約する
gh pr merge {PR_NUMBER} \
  --repo {owner}/{repo} \
  --auto \
  --squash
```

---

### 5b. 要修正の指摘がある場合 → ラベルを更新して完了

```bash
# needs-ai-triage を除去して ai-triaged を付与する（処理済みにする）
gh pr edit {PR_NUMBER} \
  --repo {owner}/{repo} \
  --remove-label "needs-ai-triage" \
  --add-label "ai-triaged"
```

修正は開発者が行い、次のコミット・プッシュで Gemini が再レビューする。
再レビュー後に GitHub Actions が再度 `needs-ai-triage` を付与する。

---

### 6. 全 PR の処理完了を報告する

処理した PR 一覧と結果サマリーを表形式で報告する。

```
処理完了:
  PR #357 — 全指摘対応不要 → auto-merge 予約済み
  PR #360 — 要修正 2件 → コメント投稿済み
```

---

## 制約

- `gh` がインストールされ `gh auth status` が通っていること
- Gemini のレビューが存在しない PR はスキップする
- 処理済み（`ai-triaged` ラベルあり）の PR は重複処理しない
- コメントは必ず日本語で投稿する
