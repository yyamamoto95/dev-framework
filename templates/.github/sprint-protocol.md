# 超・適応型開発プロトコル

> 🧱 **dev-framework の核ファイル**: §5「SSOT マップ」の表への行追加を除き、プロジェクト都合での変更は非推奨（スキル・CI と結合している。詳細は CUSTOMIZATION.md）。
> 汎用的な改善は https://github.com/yyamamoto95/dev-framework へ還流する。


**このファイルは開発体制ルールの SSOT（Single Source of Truth）である。**
Claude Code・Cursor・GitHub Copilot・Codex など、開発に介入するすべての人間・AI エージェントはこのファイルを作業開始時に読み込むこと。

---

## 1. 基本思想：ビジネスチャンスを逃さない開発

> 「今欲しいシステム」を思いついたとき、技術的・体制的な壁でチャンスを逃すことをゼロにする。

### 3つの原則

| 原則 | 意味 |
|------|------|
| **変更を前提とする** | 要件変更は例外ではなくデフォルト。スコープを調整してリリース日を守る |
| **1日 = 1スプリント** | 不定期な作業日それ自体をスプリントとして観測・記録する |
| **AIが迷わない透明性** | どのエージェントが介入しても「今ビジネスが何を求めるか」を即座に同期できる |

---

## 2. スプリントの定義（不定期1日スプリント）

### サイクル定義

```
[作業開始]
  └── GitHub Issue に in-progress ラベルを付与（タイムスタンプ自動記録）
        └── 実装 → テスト → コミット → PR 作成
              └── PR マージ
                    └── GH Actions: サイクルタイム自動計測 + Project フィールド（Cycle Time/Sprint #/Story Points）更新
                          └── スプリントレビュー（レトロスペクティブ記録）
                                └── 「Retro: Sprint #N」Issue を作成してスプリントボードに登録
                                      └── Try アクションを retro-action Issue 化 → 次スプリントバックログへ
[作業終了]
```

### スプリントの単位

- **1 PBI = 1 スプリント** — 作業日が不定期でも、PBI の完了をサイクルの区切りとする
- 1日で完了しない PBI は「翌作業日に持ち越し」ではなく **PBI を分割** して完了可能な粒度にする
- スプリント期間の上限は **5営業日相当**。超過しそうな場合はユーザーに分割提案する

---

## 3. ① チャンスを逃さない意思決定フロー

### 要件変更が発生したとき

```
要件変更の発生
    │
    ▼
MoSCoW でスコープをトリアージ（5分以内）
    │
    ├── Must: 今日リリースに絶対必要
    ├── Should: できれば含めたい
    ├── Could: 余裕があれば
    └── Won't: 今回は含めない（次スプリントの backlog へ）
    │
    ▼
「Must のみ」で実装スコープを再定義
    │
    ▼
既存 PBI を更新 or 新規 PBI 作成（Won't は backlog ラベルに変更）
    │
    ▼
実装 → CI → マージ → リリース
```

### AI エージェントへの指示テンプレート

要件変更が生じた際は、以下の形式で AI に指示する：

```
## 要件変更の通知
変更内容: {何が変わったか}
リリース期限: {いつまでに出す必要があるか}
Must（絶対必要）: {今日リリースに必須の機能}
Won't（今回除外）: {スコープアウトする機能}
既存 PBI への影響: {更新・クローズすべき Issue 番号}
```

### スコープ調整の判断基準

| 状況 | アクション |
|------|-----------|
| 残り時間 > 工数見積もり | 予定通り全スコープで実装 |
| 残り時間 ≈ 工数見積もり | Should を Won't に移してリスクヘッジ |
| 残り時間 < 工数見積もり | Must のみに絞り、残りを次スプリントへ |
| 残り時間 << 工数見積もり | PBI を分割し、最小動作単位を今スプリントでリリース |

---

## 4. ② 不定期観測・振り返りの仕組み

### 自動計測（GitHub Actions）

以下のワークフローが自動で動作する（`.github/workflows/measure-cycle-time.yml`）：

1. **作業開始時**: `in-progress` ラベルが付与された瞬間、Issue に開始タイムスタンプをコメント
   - GH Actions は非同期で遅延する場合があるため、AI は `in-progress` ラベル付与直後に手動でも同コメントを投稿する（本ファイルセクション 8「スプリントを進めて」参照）
2. **作業終了時**: PR がマージされた瞬間、以下を自動実行：
   - Issue にサイクルタイムレポートをコメント投稿
   - Project ボードの `Cycle Time (h)` フィールドを更新
   - Project ボードの `Sprint #` フィールドを更新（PR 本文の `Sprint: N` から）
   - Project ボードの `Story Points` フィールドを更新（`size:` ラベルから）

### スプリント実績の導出（pull 型）

**velocity などの派生データは git にコミットしない。** 実績は GitHub 上の一次データから都度導出する。
（旧 `update-velocity.yml` + `velocity-log.json` の push 型自動更新は、ブランチ保護との競合・
Rebase Check 無効化の連鎖・手動補記の常態化を招いたため廃止した。履歴は git 履歴と Retro Issue に保全されている。）

| 事実 | SSOT | 参照方法 |
|------|------|---------|
| 現在のスプリント番号 | GitHub Variable `CURRENT_SPRINT` | `gh variable get CURRENT_SPRINT` |
| ゴール・仮説・計画pt（進行中） | GitHub Variables `SPRINT_GOAL` / `SPRINT_HYPOTHESIS` / `SPRINT_PLANNED_POINTS` | `gh variable get {名前}` |
| 完了 PBI・実績pt | マージ済み PR（本文 `Sprint: N` + `Closes #N`）× Issue の `size:` ラベル | `.github/scripts/velocity-report.sh` |
| サイクルタイム | Issue コメント + Project `Cycle Time (h)` フィールド（`measure-cycle-time.yml` が記録） | `gh issue view {番号} --comments` |
| スプリント履歴（恒久記録） | Retro Issue（`retro` ラベル。計画pt・実績pt・ゴール・仮説・完了PBI一覧を記録） | `gh issue list --label retro` |

### 複数 Issue を同一 PR でクローズする場合のサイクルタイム計測方針

1つの PR が複数の `Closes #N` を含む場合（例: 関連する2つのIssueを同一ブランチで解決）：

- GH Actions は **すべての Issue に同一のサイクルタイムを記録**する（PR マージ時刻基準）
- 実績導出（velocity-report.sh）では各 Issue が個別 PBI として集計される
- **推奨**: 原則 1 PBI = 1 PR とし、複数 Issue をまとめる場合は PR 本文に理由を明記する

### Project ボードのフィールド定義（SSOT）

| フィールド | GitHub Variables | 更新タイミング |
|-----------|------------------|--------------|
| `Sprint #` | `PROJECT_SPRINT_FIELD_ID` | PR マージ時（GH Actions）/ スプリントクロージング時（AI） |
| `Story Points` | `PROJECT_SP_FIELD_ID` | PR マージ時（GH Actions）/ バックフィル時（AI） |
| `Cycle Time (h)` | `PROJECT_CYCLE_TIME_FIELD_ID` | PR マージ時（GH Actions）/ バックフィル時（AI） |
| `Status` | `PROJECT_STATUS_FIELD_ID` | ラベル変更時（GH Actions `project-board-sync.yml`） |

Project ID・フィールド ID・Status 選択肢 ID はすべて GitHub Variables を SSOT とする
（`PROJECT_ID` / `PROJECT_*_FIELD_ID` / `PROJECT_STATUS_BACKLOG` / `PROJECT_STATUS_SPRINT_BACKLOG` / `PROJECT_STATUS_IN_REVIEW` / `PROJECT_STATUS_DONE`）。
フレームワーク導入時（init.sh）に設定する。

### 手動振り返り（スプリントレビュー）

`スプリントレビューをして` コマンドを実行すると AI が以下を実施する：

1. 直近マージ済み PR のサイクルタイム一覧を集計（`.github/scripts/velocity-report.sh` + Issue コメントで導出）
2. 前スプリントの Retro Issue を読み込み、前回 Try の実行状況を確認
3. `.github/retrospective-template.md` に基づいて「Retro: Sprint #N」Issue を作成
4. Issue をスプリントボードに登録し、Sprint # フィールドを設定（Status: Done）
5. Try アクションアイテムを個別 Issue（`retro-action` ラベル）として作成し、次スプリントバックログへ追加
6. 完了 PBI に Retro Issue へのリンクを通知コメントとして投稿

### 工数見積もりとの乖離分析

AI は以下の指標を週次でレポートする（`スプリントの状況を確認して` 実行時）：

```
先週の実績:
  完了 PBI 数: X 件
  平均サイクルタイム: Xh
  size: S の平均: Xh
  size: M の平均: Xh
  size: L の平均: Xh

乖離パターン:
  - 見積もりより長かった PBI: #{番号}（{size} → 実績 {X}h）
  - ブロックが発生した回数: X 回
  - ブロックの主な原因: {環境・仕様不明・依存など}
```

---

## 5. ③ 最新の共通ルール構成（SSOT マップ）

AI エージェントは以下のファイルを「唯一の真実の源泉」として参照すること。
**矛盾が生じた場合は、このマップの優先順位（上が高い）に従う。**

ドキュメントは3層で構成する: **`spec/` = WHAT（何を作るか）／`rules/` = HOW（どう作るか）／`decisions/` = WHY（なぜそう決めたか・ADR）**。
1つの事実は1ファイルにのみ書き、他からはパスで参照する。

| 優先 | ファイル | 用途 |
|------|---------|------|
| 1 | `.github/sprint-protocol.md` | 開発体制・意思決定・スプリント定義・SSOT マップ（本ファイル） |
| 2 | `.github/rules/workflow.md` | AI エージェント作業規約（必須プロセス・テスト要件・役割定義・通知ルール） |
| 3 | `.github/rules/pull-request-instructions.md` | PR 生成の論理ルール |
| 4 | `.github/rules/commit-message-instructions.md` | コミットメッセージ規約 |
| 5 | `.github/rules/coding-conventions.md` | コーディング規約（TS/BE/FE/アイコン） |
| 6 | `.github/rules/ddd_rules.md` | DDD / Onion Architecture 境界規範 |
| 7 | `.github/spec/product.md` | プロダクト仕様（ミッション・課題・要件・KPI・AI開発ガイドライン） |
| 7a | `.github/spec/user-stories.md` | BDD ユーザーストーリー・プロトタイプ検証チェックリスト |
| 7b以降 | `.github/spec/*.md` | プロダクト固有の詳細仕様（追加したらこの表に行を足す） |
| 8 | `.github/design/` | UI/UX・データモデル設計 |
| 9 | `.github/project-overview.md` | プロジェクト概要（ディレクトリ構成・ユビキタス言語・技術スタック。雛形から作成する） |
| 10 | `.github/decisions/decision-log.md` | 技術決定の ADR（アーキテクチャ・認証・ORM 等） |
| 11 | `.github/rules/operation/` | 運用手順（DB 更新フロー・インフラ構成など。必要になったら作成する） |
| — | `.github/retrospective-template.md` | Retro Issue 本文テンプレート＋クロージング手順（/sprint-close が参照） |
| — | GitHub Variables（`CURRENT_SPRINT` / `SPRINT_GOAL` / `SPRINT_HYPOTHESIS` / `SPRINT_PLANNED_POINTS`） | 進行中スプリント状態のデータ SSOT（恒久記録は Retro Issue。実績導出は `.github/scripts/velocity-report.sh`） |
| — | （プロジェクトのデータ SSOT） | DB スキーマ・API スキーマ・デザイントークン等のデータ SSOT をここへ列挙する |
| — | `.github/skills/` | スキル定義の SSOT（Claude/Cursor/Copilot/Codex 共通） |
| — | `.github/hooks/` | フックスクリプトの SSOT（Claude/Cursor/Copilot/Codex 共通） |
| — | `AGENTS.md` | Codex 専用ポインタ（本ファイルへの誘導のみ） |
| — | `.codex/skills/` | Codex 専用スキルポインタ（実体は `.github/skills/`） |
| — | `.codex/hooks/` | Codex 専用フックポインタ（実体は `.github/hooks/`） |
| — | `.claude/CLAUDE.md` | Claude Code 専用ポインタ（本ファイルへの誘導のみ） |
| — | `.cursor/skills/` | Cursor 専用スキルポインタ（実体は `.github/skills/`） |
| — | `.cursorrules` | Cursor 専用ポインタ（本ファイルへの誘導のみ） |
| — | `.github/copilot-instructions.md` | GitHub Copilot 専用ポインタ（スキル一覧への参照） |

### ドキュメントの鮮度を保つルール

> **重要: このファイルのセクション 5（SSOT マップ）は、Claude / Cursor / GitHub Copilot / Codex など全 AI エージェントが
> 作業開始時に必ず参照するエントリポイントである。
> ドキュメントを追加・移動・削除した場合は、必ず本セクションを最新化すること。
> 更新を怠ると、AI エージェントが誤ったファイルを参照し続けるリスクがある。**

- **ドキュメントを追加・移動・削除するたびに、このファイルのセクション 5「SSOT マップ」を更新する**
- **要件変更のたびに `.github/spec/` を更新する**（実装だけ変えてドキュメントを放置しない）
- **設計変更のたびに `.github/design/` を更新する**
- 「このドキュメント、実態と違う」と気づいたら即座に修正し、コミットメッセージに `docs: ` を付ける
- AI エージェントは矛盾を発見したらユーザーに報告してから作業を進める
- **一時点のレビュー結果・作業記録を `.md` として保存しない**。経緯は Issue / PR に、技術決定は `.github/decisions/decision-log.md`（ADR）に記録する。恒久ドキュメントには「現在の決定と意図」のみを書く
- **ドキュメントを新規追加する PR では、既存ドキュメントへの統合・削除を先に検討する**（安易な新規ファイル追加で乱立させない）

---

## 6. ④ GitHub ボード運用：動的な優先順位管理

ボード URL: {{BOARD_URL}}

### ラベルによる状態管理

| ラベル | 意味 | 誰が付与 |
|--------|------|---------|
| `backlog` | 未着手・優先度未定 | 人間/AI |
| `sprint-backlog` | 今スプリントで着手予定 | 人間（スプリントプランニング時） |
| `in-progress` | 現在実装中（サイクルタイム計測開始） | AI（スプリント開始時） |
| `in-review` | PR 作成済み・レビュー待ち | AI（PR 作成後） |
| `retro` | スプリントレトロスペクティブ Issue | AI（スプリントクロージング時） |
| `retro-action` | レトロから生まれた改善アクション PBI | AI（スプリントクロージング時） |

### priority ラベル規約（必須）

**すべての Issue（バグ・機能・chore を問わず）に priority ラベルを付与すること。**
`auto-priority.yml` が P2 を自動補完するが、起票者が正確な優先度を明示することを原則とする。

| ラベル | 付与基準 | 対応目安 |
|--------|---------|---------|
| `priority: P0` | 本番障害・データ損失・セキュリティ脆弱性 | 即日 |
| `priority: P1` | 主要機能が使えない・今スプリントで実装すべき重要機能 | 今スプリント |
| `priority: P2` | 標準バックログ。近いうちに対応（デフォルト値） | 次スプリント |
| `priority: P3` | あれば嬉しい機能・軽微な改善 | 将来 |

**AI エージェントが Issue を作成する際のルール**:
- `gh issue create` には必ず `--label "priority: P?"` を含めること
- `retro-action` Issue には `priority: P2` を付与すること（スプリントプランニング時に上書き可）
- CVE・セキュリティ Issue には `priority: P1` を付与すること

### 要件変更時のボード操作

```
要件変更発生
  │
  ├── 新規 PBI: sprint-backlog に追加 → 既存 sprint-backlog から Won't を backlog に戻す
  ├── 優先度変更: priority ラベルを付け替える（P0/P1/P2/P3）
  └── スコープアウト: backlog に移動（クローズしない。ビジネス価値は消えていない）
```

### 「何を捨て、何を優先したか」を1行で残す

要件変更でスコープアウトした場合は、元の Issue にコメントを残す：

```
スコープアウト: {日付}
理由: {何のためにこのPBIを後回しにしたか}
代わりに優先: #{Issue番号}
```

---

## 7. スプリントイベント定義

### スプリントプランニング（`スプリントプランニングをして`）

1. `sprint-backlog` ラベルの PBI を取得し、優先度・サイズ・依存関係を評価
2. 1スプリント（1作業日）で完了可能か判断
3. 完了不可なら PBI 分割を提案
4. **スプリントゴール・仮説・計画ポイントを導出する**（PBI選定後に必ず実施）:
   - 選定 PBI 群の共通テーマを抽出する
   - プロダクト3軸（即時フィードバック / 客観的比較 / 継続設計）のいずれかに対応付ける
   - `goal`: 「このスプリントで○○を実現する」形式で1文に要約する
   - `hypothesis`: 「○○することで△△が期待できる」形式で仮説を1文で記述する
   - `planned_points`: 選定した全 PBI の size ポイント合計を算出する（例: M×1 + S×2 = 7pt）
   - プランニング提示時に goal / hypothesis / planned_points をユーザーに明示する
   - 承認後、GitHub Variables（`SPRINT_GOAL` / `SPRINT_HYPOTHESIS` / `SPRINT_PLANNED_POINTS`）に**必ず**記録する（クロージング時に Retro Issue へ転記され恒久記録となる）
5. **pbi_type の判定基準**（レトロの AI 診断でバグ率・tech-debt 比率を算出する際にラベル・タイトルから判定する）:
   - Issue タイトルが `fix:` または `bug:` で始まる → `fix`
   - `type: tech-debt` ラベルを持つ → `tech-debt`
   - `type: chore` または `design:` で始まる → `chore`
   - それ以外 → `feature`
6. 承認後、`in-progress` ラベルを付与しサイクルタイム計測を開始

### デイリースタンドアップ（`スプリントの状況を確認して`）

1. `in-progress` の PBI と詰まりポイントを表示
2. 工数見積もりと経過時間の乖離を報告
3. ブロックがあれば解消案を提示

### スプリントレビュー（`スプリントレビューをして`）

1. 完了 PBI の一覧と実績 pt を集計（`.github/scripts/velocity-report.sh` で導出）し、達成率を計算する:
   - `達成率 = 実績pt / SPRINT_PLANNED_POINTS × 100`（`SPRINT_PLANNED_POINTS` が未設定の場合は「計測データなし」と表示）
2. 前スプリントの Retro Issue（`retro` ラベル）を読み込み、前回 Try の実行状況を確認
3. `.github/retrospective-template.md` に基づいて「Retro: Sprint #N」Issue を作成
4. Issue をスプリントボードに登録（Sprint # / Status: Done フィールドを設定）
5. Try アクションを `retro-action` + `backlog` + **`size: XS/S/M/L`（必須）** ラベルで個別 Issue 化し、ボードに追加（sizeラベル未設定は `points=null` でベロシティ計算から除外される）
6. 完了 PBI に Retro Issue へのリンクを通知コメントとして投稿
7. ベロシティトレンド（直近3スプリント）を表示
8. 次スプリントへの持ち越し PBI を整理

---

---

## 8. スプリントエージェントプロトコル（人間・AI 共通）

本プロトコルは、ユーザーが以下のコマンドを入力したときに人間または AI エージェントがスプリントを進行するための共通定義である。
Claude Code・Cursor・GitHub Copilot・Codex などの固有設定は、この共通定義への薄い参照に留める。

### ベロシティ定義

| size ラベル | ポイント | 想定作業時間（AI込み） |
|------------|---------|----------------------|
| XS | 1 | 〜30分 |
| S | 2 | 1〜2時間 |
| M | 3 | 2〜4時間 |
| L | 5 | 半日 |
| XL | 8 | 1日フル |

初期スプリントキャパシティ = **6pt**（仮設定。実績蓄積で調整）

### 起動コマンドと実行内容

#### `フルスプリントを回して`（完全自律モード）

1スプリントを開始からクロージングまで人間の介入なしに自律実行する。

```
リファインメント → プランニング → 実装ループ → 自動マージ → レビュー/レトロ
```

**実行フロー（詳細）**:

1. **リファインメント**: `スプリントリファインメントをして` のロジックで `backlog` を整査する
2. **プランニング**: `スプリントプランニングをして` のロジックでスコープを確定する
   - GitHub Variable `CURRENT_SPRINT` をインクリメントして現スプリント番号を確定する（main へのコミットは不要）
   - ベロシティから今日のキャパシティを計算し、収まる PBI を自動選定する
   - 選定した PBI に `sprint-backlog` + `in-progress` ラベルを付与する
   - `in-progress` ラベル付与後、**60 秒待機**する（GH Actions の「スプリント開始」コメント投稿を待つことで `cycle_time_hours` 計測用タイムスタンプが記録される）
3. **実装ループ**: `スプリントを進めて` のメインループを実行する（全 PBI 完了まで繰り返す）
4. **自動マージ**: 全 PBI の PR 作成後にそれぞれ `gh pr merge --squash --auto` を実行する
   - CI が失敗した場合はマージをスキップし、ユーザーに報告して中断する
5. **マージ待機**: `gh pr view {PR番号} --json state --jq .state` が `MERGED` になるまで最大 15 分・30 秒間隔でポーリングする
6. **スプリントクロージング**:
   - ラベル整理: 完了 Issue から `in-review`・`sprint-backlog` を除去する
   - Issue クローズ: `Closes #N` 自動クローズが機能しない場合は明示的にクローズする
   - スプリント実績の導出: `.github/scripts/velocity-report.sh` を実行し、完了 PBI と実績 pt を確認する（GH Actions の完了待機は不要）。size ラベル未設定の警告が出たら補正して再実行する
   - **レトロ Issue 作成**（必須）: `スプリントレビューをして` のロジックを実行して「Retro: Sprint #N」Issue を作成し、プロジェクトボードに登録する。**レトロ未作成のままスプリントを終了してはならない**
   - スプリントボードの PBI ステータスを Done に更新する
7. **スプリントサマリー報告**: 完了 PBI・ベロシティ実績・クロージング完了状況を出力する

**完全自律モードの制約**:
- CI が失敗した場合はマージせず、原因と修正案をユーザーに報告する
- 1つの PBI で 3回以上ブロックされた場合は自律実行を中断してユーザーに報告する
- 実装中に仕様の不明点が生じた場合は作業を中断してユーザーに確認する
- クロージングまで完全に完了させてからサマリーを出力する（途中状態で終了しない）

**Sandbox-First ルールとの整合ポリシー**:

| PBI の性質 | Sandbox 要否 | 根拠 |
|-----------|-------------|------|
| 新規コンポーネント・画面デザイン変更 | **必須** — 自律実行を中断してユーザーにレビューを求める | UI の意図は Issue だけでは確定できない |
| Issue に詳細仕様・参照デザインが明記されている | **スキップ可** — Issue の仕様をユーザー承認済みと見なし Sandbox と本番を同スプリントで実装する | 手戻りリスクが低い |
| バグ修正（見た目の変更なし） | **不要** | Sandbox-First ルールの除外対象 |
| Server Actions・API ロジックのみの修正 | **不要** | 同上 |

#### `スプリントリファインメントをして`

1. 全 `backlog` / `sprint-backlog` Issue を取得する
2. 以下の観点でバックログを整査し、問題のある Issue を列挙してユーザーに報告する：
   - **サイズ未設定**: `size:` ラベルがない → ポイント見積もりを提案する
   - **完了条件の欠落**: Issue 本文に「完了条件」「完了定義」がない → 追記を促す
   - **優先度未設定**: `priority:` ラベルがない → 推奨優先度を提案する
   - **依存関係の未解決**: 他 Issue への依存が記載されている場合、その Issue の状態を確認する
   - **バックログ鮮度**: `created_at` から 60日超 + `backlog` ラベルのままの Issue を Close 候補として列挙する（自動クローズはしない）
3. 整査結果をまとめてユーザーに提示し、修正が必要な Issue を `gh issue edit` で更新する（承認後）

#### `スプリントプランニングをして`

1. **スプリント番号を採番する**（最初に必ず実行）:
   - `gh variable get CURRENT_SPRINT` で現在値を取得し、+1 した値を `gh variable set CURRENT_SPRINT --body "{N}"` で設定する（スプリント開始宣言。main へのコミットは不要）
   - 前スプリントの Retro Issue（`retro` ラベル・OPEN）をクローズする
   - 以降このスプリントで作成する**すべての PR 本文に `Sprint: N`** を含める
2. `.github/scripts/velocity-report.sh 3` で直近 3スプリントの平均ベロシティを計算する（実績がない場合は初期値 6pt）
3. 全オープン Issue を取得して候補を選定する
4. 以下の基準で PBI を選定し、合計ポイントが平均ベロシティ以内に収まる組み合わせを提案する：
   - `priority: P0/P1` を最優先
   - `size: XS/S/M` を優先（1日で完了しやすい）
   - 依存関係（ブロッカー）を確認
5. スプリントゴール・仮説を導出してユーザーに提示する（セクション 7 参照）
6. 承認後、対象 PBI に `sprint-backlog` ラベルを付与する

#### `スプリントを進めて`（メインループ）

以下のループを、作業可能な PBI がなくなるまで繰り返す：

1. **PBI 選択 & 開始タイムスタンプ記録**: `in-progress` → `sprint-backlog` 最優先 → 自動選定の順で対象 Issue を特定する。`in-progress` ラベル付与後、即座に以下のコメントを Issue に投稿する：
   ```bash
   NOW_JST=$(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M')
   gh issue comment {Issue番号} --body "## スプリント開始
   | 項目 | 値 |
   |------|---|
   | 開始日時 | ${NOW_JST} JST |
   > サイクルタイム計測を開始しました。PR マージ時に自動集計されます。"
   ```
2. **ブランチ作成**: `.github/rules/workflow.md` の `/branch` 手順を実行する
3. **翻訳**: Issue の内容を「ユーザーの意図 → 技術課題 → 修正対象ファイル」へ翻訳する
4. **影響調査**: 関連ファイル・型定義・依存関係を調査する
5. **実装**: コードを修正・追加する
6. **自己検証**: lint + build → テスト追加・更新 → ユニットテスト全件パス（コマンドは `.github/hooks/verify-flow.sh` 参照）
7. **コミット**: Conventional Commits 形式、本文日本語
8. **プッシュ**: `git push -u origin {ブランチ名}`
9. **PR 作成 & ラベル更新**:
   - `.github/rules/pull-request-instructions.md` に従って PR を作成する
   - 本文に `Closes #Issue番号` と `Sprint: N` を含める
   - PR 作成後、`in-progress` を外して `in-review` を付与する
10. **報告**: ユーザーに完了報告を出力し、次の PBI に進む

**制約**:
- マージは実行しない。PR 作成まで行い、ユーザーまたは CI に委ねる
- 1つの PBI で 3回以上ブロックされた場合は、自律実行を中断してユーザーに報告する

#### `スプリントの状況を確認して`

1. `in-progress` / `in-review` の Issue 一覧とその PR リンクを表示する
2. `.github/scripts/velocity-report.sh 3` で直近 3スプリントのベロシティ実績を出力し、size 別平均サイクルタイムは各 Issue のサイクルタイムコメント（`measure-cycle-time.yml` が投稿）から集計する

#### `要件変更が発生した`（アドホック）

1. 本ファイルセクション 3「MoSCoW スコープトリアージ」を読み込む
2. Must / Should / Could / Won't を整理してユーザーに提示する
3. Won't になった PBI の Issue ラベルを `sprint-backlog` → `backlog` に変更する
4. スコープアウトした Issue に理由コメントを投稿する

### 自律実行時のコミット・プッシュ許可範囲

スプリントエージェントモードで実行する場合に限り、以下を許可する：

| 操作 | 条件 |
|------|------|
| `git commit` | Conventional Commits 形式を厳守 |
| `git push` | 作業ブランチへのプッシュのみ。`main` への直接プッシュは禁止 |
| `gh pr create` | PR の作成のみ |
| `gh pr merge --squash --auto` | `フルスプリントを回して` 実行時のみ。CI グリーン後に自動マージ |
| `gh pr view` | PR ステータスのポーリング |
| `gh issue comment` | 開始タイムスタンプ・レトロスペクティブ投稿のみ |
| `gh issue edit` | ラベル付与・除去・バックログ整査時の更新のみ |
| `gh issue close` | スプリントクロージング時・スプリント開始時の前 Retro クローズのみ |
| `gh variable get` / `gh variable set` | スプリント番号・ゴール・仮説・計画 pt の参照・更新のみ |

---

## 9. このプロトコルの更新ルール

- このファイル自体の変更は `chore: sprint-protocol` のコミットメッセージで行う
- 体制に大きな変更が生じた場合は PR を立てて変更履歴を残す

### スキル・フックのクロスAI互換ルール

> **スキルやフックを新規作成・変更する際は、必ず以下のルールに従うこと。**

**背景**: このリポジトリでは Claude Code / Cursor / GitHub Copilot / Codex などの複数 AI ツールを併用する。
特定の AI だけが使えるスキル・フックは知識の分断を招き、AI 切り替え時に再現性が失われる。

**ルール**:

1. **実態は `.github/` に配置する**
   - スキルの実態 → `.github/skills/{skill-name}.md`
   - フックの実態 → `.github/hooks/{hook-name}.sh`

2. **各 AI ツールには薄いラッパーを配置する**
   - Claude Code → `.claude/skills/{skill-name}.md`（1行: 「`.github/skills/{skill-name}.md` を読んで実行」）
   - Cursor → `.cursor/skills/{skill-name}/SKILL.md`（frontmatter + 1行参照）
   - GitHub Copilot → `.github/copilot-instructions.md` のスキル一覧テーブルに追記
   - Codex → `.codex/skills/{skill-name}/SKILL.md`（frontmatter + `.github/skills/{skill-name}.md` への参照）

3. **フックの自動実行対応状況を把握する**
   - Claude Code: `PreToolUse` / `PostToolUse` フックで自動実行可能
   - Codex: `.codex/hooks/` の薄いラッパーから `.github/hooks/` の実体を実行する
   - Cursor / Copilot: 自動実行不可。スキルドキュメント内に「作業前に手動実行すること」と明記する

4. **このセクション 5「SSOT マップ」を更新する**
   - スキル・フックの追加・変更・削除のたびに本マップを更新すること
- AI が提案する改善案は、ユーザーの承認なしにこのファイルを書き換えてはならない
