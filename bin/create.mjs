#!/usr/bin/env node
// ============================================================
// create-dev-framework — dev-framework を新規プロジェクトへ scaffold する
//
// 使い方（対象プロジェクトのルートで実行）:
//   pnpm create dev-framework
//   npm  create dev-framework@latest
//   npx  create-dev-framework
//
//   オプション:
//     --owner <name>            GitHub オーナー名
//     --project-number <N>      ProjectV2 の番号
//     --product-name <name>     プロダクト名
//     --with-ts-presets         TS モノレポ向けプリセットも導入する
//     --yes                     プロンプトを出さず引数のみで実行
//
// 方針: 既存ファイルは上書きしない（再実行・部分導入セーフ）。
// ============================================================
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync,
  statSync, writeFileSync, chmodSync, copyFileSync,
} from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = process.cwd();
const TEXT_EXT = new Set(['.md', '.yml', '.yaml', '.json', '.sh', '.txt', '.cursorrules']);

// ---- 引数パース ----
function parseArgs(argv) {
  const out = { withPresets: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--owner') out.owner = argv[++i];
    else if (a === '--project-number') out.projectNumber = argv[++i];
    else if (a === '--product-name') out.productName = argv[++i];
    else if (a === '--with-ts-presets') out.withPresets = true;
    else if (a === '--yes') out.yes = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else { console.error(`不明なオプション: ${a}`); process.exit(1); }
  }
  return out;
}

const HELP = `create-dev-framework — 開発フレームワークを scaffold する

  pnpm create dev-framework --owner <name> --project-number <N> --product-name <名前> [--with-ts-presets]
  npx  create-dev-framework doctor   # 導入後のセットアップ漏れを検査する

対象プロジェクトの git リポジトリのルートで実行してください。既存ファイルは上書きしません。`;

// ============================================================
// doctor — セットアップ漏れの検査
// CI は Variables 未設定時にエラーではなく「静かにスキップ」するため、
// 観測（サイクルタイム・velocity・ボード同期）の欠落は気づきにくい。
// 最初のスプリント開始前に必ず実行する。
// ============================================================
const REQUIRED_FILES = [
  '.github/sprint-protocol.md',
  '.github/spec/product.md',
  '.github/rules/workflow.md',
  '.github/hooks/enforce-flow.sh',
  '.github/workflows/measure-cycle-time.yml',
  '.claude/commands/branch.md',
];
const REQUIRED_VARIABLES = [
  'PROJECT_ID', 'PROJECT_STATUS_FIELD_ID', 'PROJECT_SPRINT_FIELD_ID',
  'PROJECT_SP_FIELD_ID', 'PROJECT_CYCLE_TIME_FIELD_ID',
  'PROJECT_STATUS_BACKLOG', 'PROJECT_STATUS_SPRINT_BACKLOG',
  'PROJECT_STATUS_IN_REVIEW', 'PROJECT_STATUS_DONE',
];
const REQUIRED_LABELS = [
  'backlog', 'sprint-backlog', 'in-progress', 'in-review', 'retro', 'retro-action',
  'priority: P0', 'priority: P1', 'priority: P2', 'priority: P3',
  'size: XS', 'size: S', 'size: M', 'size: L', 'size: XL',
];

function sh(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
  }
}

function scanPlaceholders(dir, hits) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { scanPlaceholders(p, hits); continue; }
    if (!isText(p)) continue;
    let s;
    try { s = readFileSync(p, 'utf8'); } catch { continue; }
    const m = s.match(/\{\{[A-Z_]+\}\}/g);
    if (m) hits.push(`${relative(TARGET, p)}: ${[...new Set(m)].join(' ')}`);
  }
}

function doctor() {
  let fail = 0;
  let warn = 0;
  const ng = (name, hint) => { fail++; console.log(`❌ ${name}\n     → ${hint}`); };
  const okay = (name) => console.log(`✅ ${name}`);
  const soft = (name, hint) => { warn++; console.log(`⚠️  ${name}\n     → ${hint}`); };

  console.log('=== create-dev-framework doctor ===\n');

  // origin から対象リポジトリを特定する（remote が複数あっても gh が迷わないよう -R で明示する）
  let repoFlag = '';
  const origin = sh('git remote get-url origin');
  const m = origin.ok ? origin.out.match(/github\.com[:/]([^/]+\/[^/\s]+?)(?:\.git)?$/) : null;
  if (m) {
    repoFlag = ` -R ${m[1]}`;
    console.log(`対象リポジトリ: ${m[1]}\n`);
  } else {
    console.log('⚠️  origin リモートから GitHub リポジトリを特定できませんでした。gh の既定解決に任せます。\n');
  }

  // 1. ファイル
  for (const f of REQUIRED_FILES) {
    if (existsSync(join(TARGET, f))) okay(`ファイル: ${f}`);
    else ng(`ファイル: ${f} がない`, 'pnpm create dev-framework を実行して scaffold する');
  }

  // 2. gh CLI と認証
  const ghAuth = sh('gh auth status');
  if (!sh('gh --version').ok) {
    ng('gh CLI が見つからない', 'https://cli.github.com/ からインストールする');
    console.log('\ngh がないため以降の GitHub 検査をスキップしました。');
    process.exit(1);
  }
  if (ghAuth.ok) okay('gh 認証');
  else ng('gh 未認証', 'gh auth login を実行する');

  // 3. GitHub Variables
  const vars = sh(`gh variable list${repoFlag} --json name --jq '.[].name'`);
  if (vars.ok) {
    const names = new Set(vars.out.split('\n'));
    for (const v of REQUIRED_VARIABLES) {
      if (names.has(v)) okay(`Variable: ${v}`);
      else ng(`Variable: ${v} が未設定`, `gh variable set ${v} --body "..."（ID の確認方法は導入時の「次のステップ」参照）`);
    }
    if (names.has('CURRENT_SPRINT')) okay('Variable: CURRENT_SPRINT');
    else soft('Variable: CURRENT_SPRINT が未設定', '/sprint-start が設定する。手動なら gh variable set CURRENT_SPRINT --body "1"');
  } else {
    ng('Variables を取得できない', `リモートリポジトリと gh の認証を確認する: ${vars.out.split('\n')[0]}`);
  }

  // 4. Secrets
  const secrets = sh(`gh secret list${repoFlag} --json name --jq '.[].name'`);
  if (secrets.ok && secrets.out.split('\n').includes('PROJECT_TOKEN')) okay('Secret: PROJECT_TOKEN');
  else ng('Secret: PROJECT_TOKEN が未設定', 'project スコープの PAT (classic) を発行し gh secret set PROJECT_TOKEN で登録する（ProjectV2 更新は GITHUB_TOKEN では不可）');

  // 5. ラベル
  const labels = sh(`gh label list${repoFlag} --limit 100 --json name --jq '.[].name'`);
  if (labels.ok) {
    const names = new Set(labels.out.split('\n'));
    const missing = REQUIRED_LABELS.filter((l) => !names.has(l));
    if (missing.length === 0) okay(`ラベル: 必須 ${REQUIRED_LABELS.length} 種すべて存在`);
    else ng(`ラベル: ${missing.join(' / ')} がない`, missing.map((l) => `gh label create "${l}"`).join(' && '));
  } else {
    ng('ラベルを取得できない', `リモートリポジトリを確認する: ${labels.out.split('\n')[0]}`);
  }

  // 6. 未置換プレースホルダ
  const hits = [];
  if (existsSync(join(TARGET, '.github'))) scanPlaceholders(join(TARGET, '.github'), hits);
  if (hits.length === 0) okay('未置換プレースホルダなし');
  else soft(`未置換の {{...}} が残っている:\n     ${hits.join('\n     ')}`, 'Project の ID を環境変数で渡して再 scaffold するか手動で置換する');

  console.log(`\n=== 結果: ${fail === 0 ? 'OK' : `NG ${fail} 件`}${warn ? ` / 警告 ${warn} 件` : ''} ===`);
  if (fail > 0) {
    console.log('NG を解消するまで CI の観測（サイクルタイム・velocity・ボード同期）は欠落します。');
    process.exit(1);
  }
  console.log('セットアップは完了しています。/sprint-start でスプリントを開始できます。');
}

// ---- テキスト拡張子か ----
function isText(path) {
  const dot = path.lastIndexOf('.');
  const ext = dot === -1 ? '' : path.slice(dot);
  return TEXT_EXT.has(ext) || path.endsWith('.cursorrules');
}

// ---- ディレクトリを再帰コピー（既存はスキップ）。コピーしたファイルの相対パス配列を返す ----
function copyTree(srcRoot, destRoot, copied, skipped) {
  if (!existsSync(srcRoot)) return;
  for (const entry of readdirSync(srcRoot, { withFileTypes: true })) {
    const src = join(srcRoot, entry.name);
    const dest = join(destRoot, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyTree(src, dest, copied, skipped);
    } else {
      if (existsSync(dest)) { skipped.push(dest); continue; }
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      if (src.endsWith('.sh')) chmodSync(dest, 0o755);
      copied.push(dest);
    }
  }
}

// ---- プレースホルダ置換 ----
function substitute(files, vars) {
  for (const f of files) {
    if (!isText(f)) continue;
    let s;
    try { s = readFileSync(f, 'utf8'); } catch { continue; }
    let out = s;
    for (const [k, v] of Object.entries(vars)) {
      if (v == null) continue;
      out = out.split(`{{${k}}}`).join(v);
    }
    if (out !== s) writeFileSync(f, out);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'doctor') {
    if (!existsSync(join(TARGET, '.git'))) {
      console.error('エラー: git リポジトリのルートで実行してください（.git が見つかりません）。');
      process.exit(1);
    }
    doctor();
    return;
  }

  const args = parseArgs(argv);
  if (args.help) { console.log(HELP); return; }

  if (!existsSync(join(TARGET, '.git'))) {
    console.error('エラー: git リポジトリのルートで実行してください（.git が見つかりません）。');
    process.exit(1);
  }

  let { owner, projectNumber, productName, withPresets } = args;
  if (!args.yes) {
    const rl = createInterface({ input, output });
    if (!owner) owner = await rl.question('GitHub オーナー名: ');
    if (!projectNumber) projectNumber = await rl.question('ProjectV2 の番号（例: 1）: ');
    if (!productName) productName = await rl.question('プロダクト名: ');
    if (!args.withPresets) {
      const a = (await rl.question('TS モノレポ向けプリセット（coding-conventions / DDD / shadcn フック）も導入する? [y/N]: ')).trim().toLowerCase();
      withPresets = a === 'y' || a === 'yes';
    }
    rl.close();
  }

  if (!owner || !projectNumber || !productName) {
    console.error('エラー: --owner / --project-number / --product-name は必須です。');
    process.exit(1);
  }

  const boardUrl = `https://github.com/users/${owner}/projects/${projectNumber}`;
  const vars = {
    GITHUB_OWNER: owner,
    PROJECT_NUMBER: projectNumber,
    PRODUCT_NAME: productName,
    BOARD_URL: boardUrl,
    // Project ID 系は GitHub Variables が SSOT。env で渡された場合のみ置換
    PROJECT_ID: process.env.PROJECT_ID,
    PROJECT_SPRINT_FIELD_ID: process.env.PROJECT_SPRINT_FIELD_ID,
    PROJECT_SOURCE_PBI_FIELD_ID: process.env.PROJECT_SOURCE_PBI_FIELD_ID,
    PROJECT_STATUS_FIELD_ID: process.env.PROJECT_STATUS_FIELD_ID,
    PROJECT_STATUS_DONE: process.env.PROJECT_STATUS_DONE,
  };

  const copied = [];
  const skipped = [];
  copyTree(join(PKG_ROOT, 'templates'), TARGET, copied, skipped);
  if (withPresets) copyTree(join(PKG_ROOT, 'presets'), TARGET, copied, skipped);

  // スキルを .claude/commands/ に展開（Claude Code がプロジェクトスキルとして読む）
  const skillsDir = join(TARGET, '.github', 'skills');
  if (existsSync(skillsDir)) {
    const cmdDir = join(TARGET, '.claude', 'commands');
    mkdirSync(cmdDir, { recursive: true });
    for (const name of readdirSync(skillsDir)) {
      if (!name.endsWith('.md')) continue;
      const dest = join(cmdDir, name);
      if (existsSync(dest)) { skipped.push(dest); continue; }
      copyFileSync(join(skillsDir, name), dest);
      copied.push(dest);
    }
  }

  substitute(copied, vars);

  console.log('\n=== 導入完了 ===');
  console.log(`コピー: ${copied.length} ファイル / スキップ（既存）: ${skipped.length} ファイル`);
  for (const f of skipped) console.log(`  skip: ${relative(TARGET, f)}`);

  console.log(`
=== 次のステップ ===

1. GitHub Project（ボード）を作成し、フィールドを追加する:
     Status（Backlog / Sprint Backlog / In Progress / In Review / Done）
     Sprint # / Story Points / Cycle Time (h)（いずれも Number）

2. Project の各種 ID を確認する:
     gh api graphql -f query='{ user(login: "${owner}") { projectV2(number: ${projectNumber}) { id fields(first: 20) { nodes { ... on ProjectV2FieldCommon { id name } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'

3. GitHub Variables を設定する（ワークフローが参照）:
     gh variable set PROJECT_ID --body "PVT_..."
     gh variable set PROJECT_STATUS_FIELD_ID --body "PVTSSF_..."
     gh variable set PROJECT_SPRINT_FIELD_ID --body "PVTF_..."
     gh variable set PROJECT_SP_FIELD_ID --body "PVTF_..."
     gh variable set PROJECT_CYCLE_TIME_FIELD_ID --body "PVTF_..."
     gh variable set PROJECT_STATUS_BACKLOG --body "..."
     gh variable set PROJECT_STATUS_SPRINT_BACKLOG --body "..."
     gh variable set PROJECT_STATUS_IN_REVIEW --body "..."
     gh variable set PROJECT_STATUS_DONE --body "..."
     gh variable set CURRENT_SPRINT --body "1"

4. Secrets を設定する:
     gh secret set PROJECT_TOKEN   # project スコープを持つ PAT (classic)

5. ラベルを作成する: backlog / sprint-backlog / in-progress / in-review /
     retro / retro-action / priority: P0〜P3 / size: XS〜XL

6. .github/retrospective-template.md に {{...}} が残る場合は、手順2のIDを
   環境変数で渡して再取得するか手動で置換する。

セットアップが揃ったかは npx create-dev-framework doctor で検査できる（スプリント開始前に必ず実行）。

=== 開発の立ち上げ（BDD・仕様駆動の順序。コードより先に WHAT を書く） ===

  a. .github/spec/product.md — ミッション・やらないこと・用語（ユビキタス言語）
  b. .github/spec/user-stories.md — 軸ごとに US を Given/When/Then で書く
  c. US を Issue 化（backlog + priority + size ラベル）→ Must を sprint-backlog へ
  d. rules・フックを自分のスタックへ調整（調整してよい範囲は CUSTOMIZATION.md 参照）
  e. /sprint-start でスプリント開始（1 PBI = 1 スプリント）

どこを変えてよく、どこがフレームワークの核（変更非推奨）かは
CUSTOMIZATION.md（https://github.com/yyamamoto95/dev-framework/blob/main/CUSTOMIZATION.md）を参照。
スキルは .claude/commands/ に展開済み（/branch /commit /pr /merge 等がすぐ使える）。
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
