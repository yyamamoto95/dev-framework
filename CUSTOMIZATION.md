# カスタマイズガイド — どこを変え、どこを変えないか

scaffold された 40 超のファイルは、役割がまったく異なる 3 種類に分かれる。
**このガイドの分類に従えば、フレームワークの指針（BDD・仕様駆動・SSOT）を壊さずに自分のプロジェクトへ最適化できる。**

## 3 分類の全体像

| 分類 | 意味 | 変更の扱い |
|------|------|-----------|
| ✏️ **A: 必ず書く** | 雛形は「器」。中身はあなたのプロダクトの WHAT/WHY | 書かないとフレームワークが機能しない |
| 🔧 **B: 調整してよい** | プロジェクト・スタックへの適合が前提の部分 | 調整は正常な使い方。自由に変える |
| 🧱 **C: フレームワークの核** | プロセス・スキル・CI が相互に結合した規約本体 | 原則変えない。改善したくなったら本リポジトリへ PR（還流） |

### ✏️ A: 必ず自分のプロジェクト用に書くファイル

| ファイル | 書くこと |
|---------|---------|
| `.github/spec/product.md` | ミッション・やらないこと・AI 開発ガイドライン・**用語（ユビキタス言語）** |
| `.github/spec/user-stories.md` | BDD ユーザーストーリー（軸ごと・Given/When/Then・MoSCoW） |
| `.github/decisions/decision-log.md` | 技術決定の ADR（決めるたびに追記） |
| `.github/design/` | UI/UX・データモデル設計（必要になったら） |
| `.github/project-overview.md` | 技術スタック・ディレクトリ構成 |

### 🔧 B: プロジェクトに合わせて調整してよいファイル

| ファイル | 調整ポイント |
|---------|-------------|
| `presets/` 由来の全ファイル（coding-conventions / ddd_rules / verify-flow.sh / enforce-ui-wrapper.sh） | スタック・コマンド・パスを全面的に自分用へ。使わないものは削除 |
| `.github/rules/pull-request-instructions.md` | チェック項目の追加・スクリーンショット要件など。**章構成と「AI が PR 本文を生成する」前提は維持** |
| `.github/workflows/security-scan-issue.yml` | cron 頻度・skip-dirs・修正方針の文言 |
| `.github/workflows/ai-review-triage.yml` | 検知対象のレビュアー Bot 名 |
| `.github/PULL_REQUEST_TEMPLATE.md` | チェック項目の追加（**`Closes #N` / `Sprint: N` の欄は削除しない** → 不変条件参照） |
| `.claude/settings.json` | プロジェクト固有フックの追加 |
| `.github/sprint-protocol.md` の **§5 SSOT マップの表** | ドキュメント・データ SSOT を追加したら行を足す（これはプロジェクト側の義務） |

### 🧱 C: フレームワークの核（変えるなら還流）

| ファイル | 理由 |
|---------|------|
| `.github/sprint-protocol.md`（§5 の表以外） | 1日1スプリント・MoSCoW・3層モデル・ラベル体系の定義。全スキル・CI がこれを前提に動く |
| `.github/skills/*.md`・`.claude/commands/*.md` | スキルの手順はラベル・PR 形式・CI と結合している |
| `.github/rules/workflow.md`・`commit-message-instructions.md` | AI エージェントの基本動作規約 |
| `.github/hooks/enforce-flow.sh` | main 保護。全エージェント共通の実体 |
| `.github/workflows/` の 5 本（measure-cycle-time / project-board-sync / sync-project-status / set-sprint-number / auto-priority） | ラベル名・PR 本文形式・Variables 名と結合 |
| `.github/scripts/velocity-report.sh` 等 | 実績導出は PR 本文形式・size ラベルに依存 |
| ポインタ（`AGENTS.md` / `.cursorrules` / `.github/copilot-instructions.md` / `.claude/CLAUDE.md`） | 各エージェントを SSOT へ誘導するだけの薄いファイル |

## 不変条件（invariants）— 核が結合しているポイント

C を「変えるな」という根拠。以下は **スキル・CI・スクリプトの 3 者にまたがって使われる結合点**であり、
1 箇所だけ変えると観測（サイクルタイム・velocity・ボード同期）が静かに壊れる。

| 不変条件 | 依存しているもの |
|---------|----------------|
| ラベル名: `backlog` / `sprint-backlog` / `in-progress` / `in-review` / `retro` / `retro-action` / `priority: P0〜P3` / `size: XS〜XL` | 全スキル・全ワークフロー・velocity-report.sh |
| PR 本文の `Closes #N` と `Sprint: N` | measure-cycle-time.yml・velocity-report.sh・ボードの Done 遷移 |
| size → Story Points 対応（XS=1 / S=2 / M=3 / L=5 / XL=8） | measure-cycle-time.yml・velocity-report.sh |
| GitHub Variables 名（`CURRENT_SPRINT` / `PROJECT_ID` / `PROJECT_*_FIELD_ID` / `PROJECT_STATUS_*`） | 全ワークフロー・/sprint-start・/sprint-close |
| Issue コメントの「スプリント開始」形式 | measure-cycle-time.yml のパース処理 |
| ドキュメント 3 層モデル（spec=WHAT / rules=HOW / decisions=WHY）と SSOT マップの優先順位 | 全 AI エージェントの参照順序 |

どうしても変えたい場合は、依存箇所を**全部同時に**変える。それは事実上フレームワークの fork なので、汎用性があるなら還流を検討する。

## 導入後の立ち上げ手順（BDD・仕様駆動の順序）

scaffold と環境セットアップ（CLI が表示する次のステップ）を終えたら、**この順序**で始める。
コードより先に WHAT を書くのが仕様駆動の入口。

1. **`product.md` を書く** — ミッション・「やらないこと」・用語表。用語表がユビキタス言語の SSOT になり、以後のコード命名・レビュー基準になる
2. **`user-stories.md` を書く** — ユーザーの関心事を「軸」として立て、各軸に US を Given/When/Then で書く。この時点で完璧を目指さない（変更前提）
3. **US を Issue 化する** — 1 US（または分割した1振る舞い）= 1 Issue。`backlog` + `priority` + `size` ラベルを付け、MoSCoW の Must から `sprint-backlog` へ
4. **rules を自分のスタックへ調整する** — B 分類（presets・verify-flow.sh のコマンド等）をプロジェクトの実態に合わせる。合わないルールを放置すると AI エージェントが誤った規約を強制し続ける
5. **スプリントを開始する** — `/sprint-start`。以後は 1 PBI = 1 スプリントのサイクル（実装 → PR → マージ → `/sprint-close` でレトロ）に乗る

要件変更が起きたら: `spec/` を先に直し、MoSCoW で再トリアージ（sprint-protocol §3）。**実装だけ変えて spec を放置しない**こと。

## 還流の判断基準

変更したくなったら 1 つだけ自問する: **「この改善は他のプロジェクトでも役立つか？」**

- **Yes** → 本リポジトリへ PR（テンプレート・スキル・CI の改善はここに集約する）
- **No（プロジェクト固有）** → 自リポジトリの `.github/` を直し、`sprint-protocol.md` §5 の SSOT マップを更新する

レトロスペクティブの Try アクションがプロセス改善だった場合も同じ基準で振り分ける。
