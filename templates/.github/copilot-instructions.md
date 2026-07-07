# GitHub Copilot 設定

このリポジトリの全規約は `.github/` に一元管理されている（SSOT）。
作業開始前に **`.github/sprint-protocol.md` セクション 5「SSOT マップ」** を必ず読むこと。

## 利用可能なスキル（ワークフロー定義）

すべてのスキルの実態は `.github/skills/` に配置されている。
該当するタスクを依頼されたら、対応するスキルファイルを読み込んで実行すること。

| スキル | ファイル | 用途 |
|--------|---------|------|
| `/branch` | `.github/skills/branch.md` | 作業ブランチの作成 |
| `/translate` | `.github/skills/translate.md` | ユーザー指示の構造化 |
| `/search` | `.github/skills/search.md` | 実装前の影響調査 |
| `/commit` | `.github/skills/commit.md` | Conventional Commits 形式でのコミット |
| `/pr` | `.github/skills/pr.md` | Pull Request の作成 |
| `/pr-triage` | `.github/skills/pr-triage.md` | Gemini レビューの AI トリアージ |
| `/merge` | `.github/skills/merge.md` | レビュー対応からマージまで |
| `/sprint-start` | `.github/skills/sprint-start.md` | スプリントプランニング |
| `/sprint-close` | `.github/skills/sprint-close.md` | スプリントクロージング |

## フック（品質チェックスクリプト）

GitHub Copilot はフックの自動実行には対応していないが、以下を作業の区切りに手動実行することを推奨する。

| フック | ファイル | タイミング |
|--------|---------|----------|
| enforce-flow | `.github/hooks/enforce-flow.sh` | 実装開始前（main ブランチ検知） |
| enforce-ui-wrapper | `.github/hooks/enforce-ui-wrapper.sh` | UI 実装前後（shadcn/ui ラッパー確認） |
| verify-flow | `.github/hooks/verify-flow.sh` | コミット前（型チェック・テスト実行） |

```bash
# 実行例
bash .github/hooks/enforce-flow.sh
bash .github/hooks/enforce-ui-wrapper.sh
bash .github/hooks/verify-flow.sh
```

## 実装フロー（標準）

1. `/branch` — 作業ブランチを作成
2. `/translate` — 指示を構造化
3. `/search` — 影響調査
4. 実装
5. `bash .github/hooks/verify-flow.sh` — 品質確認
6. `/commit` — コミット
7. `/pr` — PR 作成
