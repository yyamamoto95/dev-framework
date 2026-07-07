# /pr — Pull Request 作成

## いつ使うか

実装・コミットが完了し、PR を作成するとき。

## 事前に読み込むファイル

- `.github/rules/pull-request-instructions.md` — PR 生成の論理ルール
- `.github/PULL_REQUEST_TEMPLATE.md` — PR 本文フォーマット

## 実行プロセス

### 1. 未コミット変更の確認

```bash
git status --porcelain
```

未コミットがある場合は `/commit` を先に実行する。

### 2. Serena MCP によるセルフレビュー（利用可能な場合）

PR 前に見落としと影響を確認し、修正できる不備は事前に修正する。

| 目的 | ツール |
|------|--------|
| 変更シンボルの参照元確認 | `find_referencing_symbols` |
| 横断検索 | `search_for_pattern` |
| シンボル概要の把握 | `get_symbols_overview` |

### 3. プッシュ

```bash
git push origin HEAD
```

### 4. PR 情報の生成

**タイトル**: `{prefix}: {内容}` 形式（Conventional Commits 風）

**本文**: `.github/PULL_REQUEST_TEMPLATE.md` の全セクションを埋める

| セクション | 記載内容 |
|-----------|---------|
| Description | 背景・目的・主な変更点・影響範囲 |
| Traceability | 対応 Issue 番号・PRD/設計ファイルへのリンク |
| Serena Insight | 変更シンボル・参照元・使用ツール・リスク（Serena 利用時） |
| Verification | テスト実施内容・結果 |

本文には必ず `Closes #Issue番号` と `Sprint: N` を含める。

### 5. PR 作成

```bash
gh pr create --title "{title}" --body "{body}"
```

### 6. 報告

作成された PR の URL をユーザーに提示する。

## 制約

- `gh` がインストールされていない場合はエラーを報告する
- すでに PR が存在する場合はその URL を表示するのみ
- 本文は必ず日本語
- 差分に含まれていない機能を説明に含めない
