# /branch — ブランチ作成

## いつ使うか

新しいタスクを開始するとき。必ず main の最新を取り込んでからブランチを切る。

## 手順

1. 現在のブランチを確認する
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```

2. main の最新を取り込む
   ```bash
   git fetch origin main
   git checkout main
   git merge --ff-only origin/main
   ```
   ※ fast-forward できない場合は中断してユーザーに報告する

3. 作業内容から適切なプレフィックスと slug を生成し、最新の main からブランチを作成する
   ```bash
   git checkout -b {prefix}/{issue-number}-{slug}
   ```

   | プレフィックス | 用途 |
   |--------------|------|
   | `feat/` | 新機能 |
   | `fix/` | バグ修正 |
   | `refactor/` | リファクタリング |
   | `chore/` | 雑務・設定変更 |
   | `docs/` | ドキュメント変更 |

## 命名規則

- kebab-case（ローワーケース・ハイフン区切り）
- Issue 番号がある場合は必ず含める（例: `feat/issue-123-add-search-filter`）

## 制約

- main への直接コミット・プッシュは禁止
- ブランチは必ずここから開始する
