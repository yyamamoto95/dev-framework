# create-dev-framework

AI 駆動・振る舞い駆動（BDD）・仕様駆動の開発と、AI エージェントによるスクラム運用（1日1スプリント・SSOT）を
新規プロジェクトへ一括導入する scaffolding CLI。`create-next-app` などと同じく、テンプレートを取得して
**各プロジェクトに自己完結で展開する**（実行時に外部リポジトリを参照しない）。

## クイックスタート

対象プロジェクトの git リポジトリのルートで実行する。

```bash
pnpm create dev-framework --owner <GitHubオーナー> --project-number <N> --product-name "<プロダクト名>"
# TS モノレポ（Next.js / Hono / Prisma / shadcn/ui）向けの規約プリセットも入れる場合:
pnpm create dev-framework --owner ... --project-number ... --product-name ... --with-ts-presets
```

`npm create dev-framework@latest` / `npx create-dev-framework` でも同じ。引数を省くと対話プロンプトになる。

導入後の残作業（GitHub Project 作成・Variables・PROJECT_TOKEN・ラベル）は CLI が最後に具体的コマンド付きで表示する。

## 何が入るか

3 層構成でドキュメントを管理する: **spec/ = WHAT（何を作るか）／ rules/ = HOW（どう作るか）／ decisions/ = WHY（なぜそう決めたか・ADR）**。

| 展開先 | 内容 |
|--------|------|
| `.github/sprint-protocol.md` | 開発体制の SSOT（1日1スプリント・MoSCoW・SSOT マップ・ボード運用） |
| `.github/workflows/` | プロセス系 CI 7本（サイクルタイム計測・ボード同期・priority 補完・Sprint# 設定・AI レビュー検知・CVE 起票）。Project ID 類は各プロジェクトの GitHub Variables を参照 |
| `.github/skills/` + `.claude/commands/` | スキル 9本（/branch /commit /pr /merge /pr-triage /search /sprint-start /sprint-close /translate） |
| `.github/hooks/enforce-flow.sh` | main 直接編集ブロックフック |
| `.github/rules/` | AI エージェント作業規約・PR/コミット規約 |
| `.github/spec/` `.github/decisions/` `.github/design/` | プロダクト仕様・ADR・設計の雛形（WHAT/WHY は各プロジェクトが記述） |
| `.github/scripts/` | velocity-report.sh（pull 型で実績を導出）等 |
| ポインタ | `AGENTS.md`（Codex）・`.cursorrules`（Cursor）・`.github/copilot-instructions.md`（Copilot）・`.claude/`（Claude Code） |
| `--with-ts-presets` | coding-conventions / DDD ルール / shadcn ラッパー・verify フック |

既存ファイルは上書きしない。再実行・部分導入しても安全。

## カスタマイズ — どこを変え、どこを変えないか

scaffold されるファイルは 3 分類ある。**[CUSTOMIZATION.md](./CUSTOMIZATION.md) に全ファイルの分類表・
結合点（不変条件）・導入後の立ち上げ手順（BDD/仕様駆動の順序）をまとめてある。必ず一読すること。**

- ✏️ **必ず書く**: `spec/`・`decisions/`・`design/`・`project-overview.md` — 雛形は器。あなたのプロダクトの WHAT/WHY を書く
- 🔧 **調整してよい**: `presets/` 由来の規約・フック、CI の cron・Bot 名、PR チェック項目 — プロジェクト適合が前提
- 🧱 **フレームワークの核**: `sprint-protocol.md`・スキル・プロセス系 CI・ラベル体系 — 相互に結合しており、単独で変えると観測が壊れる。改善は本リポジトリへ PR（還流）

## 設計方針

- **自己完結スキャフォールド**: 展開後は外部リポジトリへの実行時依存を持たない。private/OSS を問わず誰でも導入でき、CI が他リポジトリの可用性に左右されない。
- **バージョン管理は semver**: フレームワークの改善は本パッケージのバージョンで管理する。導入済みプロジェクトへは再取得（将来 `upgrade` サブコマンドを提供予定）で反映する。取得後は各プロジェクトで乖離しうるため、共通ロジックの一元管理より**配布容易性と疎結合を優先**する設計。
- **データ SSOT は GitHub 側**: Project ID・フィールド ID・スプリント番号は GitHub Variables を SSOT とし、テンプレートには焼き込まない。

## 前提と制約

- **対象**: GitHub + GitHub Projects（ProjectV2）で開発する個人・小規模チーム。スキルは Claude Code で最も快適に動く（Cursor / Copilot / Codex にはポインタファイルで規約を誘導）
- **ユーザー所有の Project 前提**: 補助スクリプトと CLI の案内が `user(login:)` の GraphQL を使う。**Organization 所有の Project は現状未対応**（コアのワークフロー自体は PROJECT_ID 直参照のため動くが、ID 取得手順を読み替える必要がある）
- **日本語**: ドキュメント・スキルはすべて日本語
- **`gh` CLI 必須**: スキル・スクリプト・doctor が GitHub CLI を前提とする

## セットアップ検証（doctor）

導入後のセットアップ漏れ（Variables・ラベル・Secrets）は CI が**静かにスキップする**形で現れ、気づきにくい。
以下で検査できる：

```bash
npx create-dev-framework doctor
```

必須ファイル・`gh` 認証・GitHub Variables・ラベル・PROJECT_TOKEN・未置換プレースホルダを検査し、
不足があれば修正コマンド付きで報告する。**最初のスプリントを始める前に必ず一度実行すること。**

## 開発

```
templates/   … 常に展開されるファイル群（ターゲット構成をミラー）
presets/     … --with-ts-presets のときだけ展開するスタック固有プリセット
bin/create.mjs … CLI 本体（Node 標準ライブラリのみ・依存ゼロ）
```

改善はこのリポジトリへ PR する。各プロジェクトの `.github/` を直接直しただけではフレームワークは育たない。
