# コーディング規約

> **スタック固有プリセット**: TypeScript モノレポ（pnpm / Next.js / Hono / Prisma / shadcn/ui）向けの規約プリセット。ディレクトリ構成・ツール名はプロジェクトに合わせて編集する。

**このファイルは `.github/` SSOT の一部である。すべての AI エージェントはこのファイルを参照すること。**

---

## 共通（TypeScript）

### 型定義

- `any` の使用は原則禁止。やむを得ない場合は理由をコメントし `unknown` を検討する
- `as` キャストは原則禁止。`as unknown as T` のような強制キャストは型チェックを完全に回避するため特に禁止。型が合わない場合は型定義・ロジック自体を見直す
- `!` 非nullアサーション演算子は禁止。`null` / `undefined` の可能性がある場合は型ガード・optional chaining・早期リターンで対処する
- 型推論を優先するが、関数の引数と戻り値には必ず型注釈を付与する

### 非同期処理

- `async/await` を使用し、`Promise.then()` は避ける
- `try-catch` によるエラーハンドリングを適切に行い、握りつぶさない

### `null` と `undefined` の使い分け

プロジェクト内で混在しないよう統一する。

| 用途 | 使う値 |
|------|--------|
| 「値が存在しない」ことを明示的に表す | `null` |
| 省略可能な引数・プロパティのデフォルト | `undefined` |
| Optional chaining の結果（`?.`） | `undefined`（言語仕様に従う） |

```typescript
// OK: 存在しないリソースは null で返す
async function findUser(id: string): Promise<User | null> { ... }

// OK: 省略可能な引数は undefined
function createOrder(amount: number, note?: string) { ... }
```

### 引数の数

引数が **4つ以上** の関数はオブジェクト引数に変換する。順序の取り違えを防ぎ、引数の追加・省略が容易になる。

```typescript
// NG: 引数が多く順序を間違えやすい
function createOrder(userId: string, amount: number, categoryId: number, date: string, note: string) { ... }

// OK: オブジェクト引数
function createOrder(params: {
  userId: string;
  amount: number;
  categoryId: number;
  date: string;
  note?: string;
}) { ... }
```

### デバッグコードの禁止

`console.log` / `console.debug` などのデバッグ出力を本番コードに残してはならない。ロギングが必要な場合はプロジェクトの logger モジュールを使用する。`console.error` / `console.warn` はやむを得ない場合のみ許容する。

### 条件分岐・三項演算子

#### 三項演算子

条件・値ともに短くシンプルな場合のみ使用する。

```typescript
// OK: 条件も値も短い
const label = isActive ? '有効' : '無効';
const fee = isPremium ? 0 : 500;

// NG: ネスト三項（何が返るか追いにくい → if/switch に書き直す）
const status = isActive ? isPremium ? 'premium' : 'normal' : 'inactive';

// NG: 式が長い（if に分けるべき）
const result = user.subscription.plan === 'premium' && user.isVerified
  ? calculatePremiumDiscount(user, cart)
  : calculateStandardPrice(cart);
```

#### if / switch の使い分け

| 使う場面 | 構文 |
|----------|------|
| 真偽判定・範囲チェック・複合条件 | `if` |
| 3ケース以上の離散値（enum・union型） | `switch` |

`switch` では **exhaustive check** を付けてケース追加漏れをコンパイルエラーで検出する：

```typescript
switch (category) {
  case 'food':      return 40000;
  case 'transport': return 15000;
  case 'medical':   return 10000;
  default:
    category satisfies never; // union に新値が追加されたらここでコンパイルエラー
}
```

#### 早期リターンによるネスト低減

条件の否定で早期リターンし、ネストの深さを抑える：

```typescript
// NG: ネストが深い
function process(user: User | null) {
  if (user) {
    if (user.isActive) {
      return doWork(user);
    }
  }
}

// OK: 早期リターン
function process(user: User | null) {
  if (!user) return;
  if (!user.isActive) return;
  return doWork(user);
}
```

### 変数宣言

- **`const` を優先する**: 再代入が不要な変数はすべて `const` で宣言する
- **`let` は再代入が必要な場合のみ**: ループカウンタや後から代入する変数に限定する
- **`var` は禁止**: スコープが関数スコープになるため使用しない

### マジックナンバーの排除

- 意味のある数値や文字列は定数（`const`）または `as const` オブジェクトとして定義する

### コードの整理

- **未使用コードは必ず削除する**: 未使用の変数・関数・import・型定義はコードベースに残さない
- **命名は用途に追従させる**: リファクタリングや仕様変更で役割が変わった変数・関数は命名も同時に更新する。古い名前が残ると次の変更者が誤認する
- **後方互換実装は原則禁止**: 実現可能な限り、旧インターフェース維持のための互換レイヤー・フォールバック・分岐は作らない。変更が必要な場合は参照・影響範囲をすべて特定し、一括で修正して負債を残さない
  - 禁止例: 削除済みシンボルの re-export、旧フィールド名を残すための alias、`if (legacy)` 分岐
  - 例外: 外部公開 API・ライブラリの SemVer 上の互換維持が必要な場合は許可するが、その旨をコメントで明示する

### 環境変数

- `process.env.*` をコード内に直接散在させない。`src/config.ts`（または同等の config モジュール）に集約し、そこから import して使う
- 未定義時のフォールバックは config 層でまとめて処理し、呼び出し側では型保証された値を受け取る形にする

### コメント・ドキュメント方針

- **必要な情報だけを残す**: コメントや JSDoc は必要な場合に必要な情報のみ記載する。論理名などドメインロジックが変わったとき差分が膨らむため、自明な説明は書かない
- **意図的な例外には必ずコメントを残す**: 一般的な実装と異なる、あるいは「なぜこうなっているか」が一見わからない箇所には、意図を明確に説明するコメントを付ける
- コメントと実装の同期・陳腐化の排除については **`## 保守性 > 古い情報を残さない`** セクションを参照

---

## 保守性

### 負債を残さない

#### TODO / FIXME の管理

コードに課題を残す場合は **Issue 番号を必ず付ける**。番号のない TODO は禁止。

```typescript
// NG: 誰がいつ解消するか不明
// TODO: エラーハンドリングを改善する

// OK: Issue にトレースできる
// TODO(#123): レート制限エラー時のリトライロジックを追加する
```

解消済みの TODO は削除する。Issue がクローズされても TODO が残るのは古い情報になる。

#### 暫定実装の明示

ハードコード・暫定ロジックをサイレントに残すことを禁止する。残す場合は理由と Issue 番号を明示する。

```typescript
// NG: なぜこの値か、いつ直すか不明
const MAX_ITEMS = 100;

// OK: 暫定であることと理由が明確
const MAX_ITEMS = 100; // TODO(#456): ページネーション実装後に制限を撤廃する
```

---

### 古い情報を残さない

#### コメントと実装の同期

ロジックを変更したとき、**同じ箇所のコメントを必ず同時に更新する**。実装と乖離したコメントは削除する。

```typescript
// NG: コメントと実装が矛盾している（コメントを更新し忘れた）
// 月次合計を計算する
function calcWeeklyTotal(orders: Order[]) { ... }

// OK: コメントと実装が一致している
// 週次合計を計算する
function calcWeeklyTotal(orders: Order[]) { ... }
```

#### OpenAPI スペックと実装の同期

- レスポンス型・リクエストボディ・パスパラメータを変更したら **`openapi.yaml` を同時更新する**
- `pnpm codegen` が SSOT。スペックと実装が乖離した状態でコミットしない
- codegen 後の型エラーは「スペックが正しく、実装を直す」という方向で解消する

---

### 誤解を生まない

#### boolean 変数・プロパティの命名

`is` / `has` / `can` / `should` プレフィックスを必須とする。

```typescript
// NG: 値が何を表すか不明
const active = true;
const flag = false;
const check = user.verified;

// OK: 意味が明確
const isActive = true;
const hasPermission = false;
const isVerified = user.verified;
```

`flag` / `flg` / `check` / `result` のような意味のない名前は禁止。

#### 否定形の変数名禁止

否定形の変数名は二重否定を生み読みにくくなる。変数は肯定形で定義し、否定は参照側で行う。

```typescript
// NG: 二重否定が生まれる
const isNotReady = !initialized;
if (!isNotReady) { ... } // 「not not ready」= ready

// OK: 肯定形で定義
const isReady = initialized;
if (!isReady) { ... }
```

#### 副作用のある関数の命名

DB 書き込み・状態変更・外部通知を伴う関数は、名前から副作用が読み取れる動詞を使う。

| 操作 | 推奨プレフィックス |
|------|----------------|
| 作成 | `create` / `register` |
| 更新 | `update` / `save` |
| 削除 | `delete` / `remove` |
| 送信 | `send` / `notify` / `publish` |
| 取得（副作用なし） | `get` / `find` / `fetch` / `list` |

`process` は副作用の有無が不明なため、より具体的な動詞に置き換える。ただし DDD UseCase クラスの `execute()` メソッドおよびイベントハンドラの `handle()` はパターン上の慣習のため除外する。

#### 関数の単一責務

1関数は1つの責務のみを持つ。「〜かつ〜する」という名前や説明になったら分割のサイン。

```typescript
// NG: バリデーションと保存が混在
async function validateAndSaveOrder(data: unknown) { ... }

// OK: 責務を分離
async function validateOrderInput(data: unknown): OrderInput { ... }
async function saveOrder(input: OrderInput): Order { ... }
```

#### 型で意図を表現（ブランド型）

`string` / `number` だけでは何の値か分からない引数は、型エイリアスやブランド型で意味を持たせる。

```typescript
// NG: 引数が全部 string で取り違えが起きる
function getOrder(userId: string, orderId: string) { ... }

// OK: 型で意味を表現
type UserId = string & { readonly _brand: 'UserId' };
type OrderId = string & { readonly _brand: 'OrderId' };
function getOrder(userId: UserId, orderId: OrderId) { ... }
```

---

## バックエンド（DDD / Onion Architecture）

| 層 | パス | ルール |
|----|------|--------|
| Domain | `apps/api/src/domain/` | 外部ライブラリへの依存禁止。値オブジェクト（Value Object）を活用する |
| Application | `apps/api/src/application/` | 1つのユースケースは1つの責務のみを持つ |
| Infrastructure | `apps/api/src/infrastructure/` | 外部接続（DB, API）の詳細はここに閉じ込める |
| Presentation | `apps/api/src/presentation/` | リクエストバリデーションを行い、不正なデータはユースケースに渡さない |

### ドメインロジックの集約（必須）

ビジネスロジックは必ずドメイン層に集約する。UseCase・Presentation 層にロジックが漏れ出ることを禁止する。

#### ドメインエンティティへの閉じ込め

ビジネスルール・計算・状態変化はドメインエンティティのメソッドとして実装する。

```typescript
// NG: ビジネスロジックが UseCase 層に漏れている
class ApproveOrderUseCase {
  async execute(id: string) {
    const order = await this.repo.findById(id);
    if (order.status !== 'pending') throw new Error('承認できない状態');
    if (order.amount > 100000) throw new Error('上限超過');
    order.status = 'approved'; // 状態変更も UseCase が担っている
    await this.repo.save(order);
  }
}

// OK: ルールと状態変化をエンティティに閉じ込める
class Order {
  approve(): void {
    if (this.status !== 'pending') throw new DomainError('承認できない状態');
    if (this.amount > 100000) throw new DomainError('上限超過');
    this.status = 'approved';
  }
}

class ApproveOrderUseCase {
  async execute(id: string) {
    const order = await this.repo.findById(id);
    order.approve(); // ルールはエンティティが知っている
    await this.repo.save(order);
  }
}
```

#### ドメインサービスの使いどころ

複数エンティティにまたがるロジック、または単一エンティティに閉じ込めると責務が過剰になる場合は **ドメインサービス**（`apps/api/src/domain/services/`）を作成する。

```typescript
// 例: 複数エンティティを参照して判定するロジック
class TotalCalculatorService {
  calculate(balance: Balance, orders: Order[]): number { ... }
}
```

エンティティに属さないロジックをそのまま UseCase に書くことは禁止。ドメインサービスとして切り出す。

#### utils との区別

`utils/` はドメインに依存しない **純粋な汎用関数** のみ配置する。ドメイン概念（`Order`・`Balance`・`UserId` 等）を引数・戻り値に含む関数は `utils/` に置かない。

| 配置先 | 基準 | 例 |
|--------|------|-----|
| `utils/` | ドメイン非依存・汎用 | 日付フォーマット・文字列トリム・配列ユーティリティ |
| `domain/entities/` | 1エンティティのルール・計算 | `Order.approve()` / `Balance.isNegative()` |
| `domain/services/` | 複数エンティティにまたがるロジック | `TotalCalculatorService` |

```typescript
// NG: ドメインロジックが utils に混入している
// utils/orderUtils.ts
export function calcMonthlyTotal(orders: Order[]): number { ... }

// OK: ドメインサービスとして配置
// domain/services/OrderAggregator.ts
export class OrderAggregator {
  calcMonthlyTotal(orders: Order[]): number { ... }
}
```

### マスターテーブル設計

選択肢・区分値など「変更頻度が低く、FE が選択 UI に使うテーブル」（マスターテーブル）には以下のカラムを必ず追加する。

| カラム | 型 | 説明 |
|--------|-----|------|
| `display_order` | `Int` | FE の選択 UI での表示順。小さいほど先頭。重複は禁止。 |
| `is_deleted` | `Boolean @default(false)` | 論理削除フラグ。レコードを物理削除せずに非活性化する。 |
| `deleted_at` | `DateTime? @map("deleted_at")` | 論理削除日時。`is_deleted = true` にした時点の UTC 日時を記録する。未削除時は `NULL`。 |

**論理削除の運用ルール:**
- 廃止するレコードは `is_deleted = true` かつ `deleted_at = 現在UTC日時` に更新する（物理削除禁止）
- `is_deleted` を `false` に戻す場合は `deleted_at = NULL` にリセットする
- リポジトリ層のデフォルトクエリは `is_deleted = false` のみを返す
- API レスポンスには論理削除済みレコードを含めない（廃止済み選択肢をユーザーに見せない）
- 既存データが廃止済みカテゴリを参照している場合でも、そのレコード自体は削除しない

**なぜ論理削除か:**
- ユーザーの過去データが参照している categoryId を物理削除すると FK 違反になる
- 廃止した選択肢への参照が残っていても履歴として保持できる

```prisma
// マスターテーブルの例
model CategoryList {
  id           Int       @id @default(autoincrement())
  displayOrder Int       @map("display_order")                        // 必須
  isDeleted    Boolean   @default(false) @map("is_deleted")           // 必須
  deletedAt    DateTime? @map("deleted_at")                           // 必須: 論理削除日時（未削除時は NULL）
  // ...その他のフィールド
}
```

### パフォーマンス

- **N+1 を回避する**: ループ内でクエリを発行しない。関連データは `include` / `JOIN` でまとめて取得する
- **JOIN 数を抑える**: JOIN が掛け算になり結果セットが爆発しないよう、必要な関連のみを取得する。大量データの多段 JOIN は OOM の原因になる
- **DB 接続数を管理する**: コネクションプールの上限を意識し、不要なコネクションを長時間保持しない
- **トランザクションを適切に張る**: 複数テーブルへの書き込みは必ずトランザクションでまとめる。読み取り専用クエリには不要なトランザクションを張らない
- **SELECT クエリには必ず ORDER BY を付ける**: DB の返却順序は保証されない。リポジトリ層のすべての SELECT クエリに `orderBy` を明示し、順序不定によるフレーキーテスト・表示バグを防ぐ

### セキュリティ

#### ORM・クエリ
- **生クエリは原則禁止**: Prisma の `$queryRaw` / `$executeRaw` は使わず、型安全な ORM クエリを使用する。どうしても必要な場合は `Prisma.sql` タグ付きテンプレートを使い、文字列結合は絶対に行わない

#### インジェクション対策
- **SQL インジェクション**: 生クエリ禁止により基本防止。やむを得ず生クエリを使う際は必ずプレースホルダーを使用する
- **外部入力は必ず Zod でバリデーションする**: Presentation 層で受け取るすべてのリクエスト（body / query / params）は Zod スキーマで検証し、不正な入力をユースケースに渡さない

#### 認証・認可
- **認証ミドルウェアはホワイトリスト方式で管理する**: 公開エンドポイントを明示的に列挙し、それ以外はすべて認証必須とする（デフォルト拒否）
- **リソースの所有者確認はユースケース層で行う**: ミドルウェアの認証通過だけでは不十分。他ユーザーのリソースへのアクセス可否は必ずユースケース層で検証する（水平権限昇格の防止）
- **機密情報をログに出力しない**: パスワード・トークン・APIキーをログに含めてはならない

#### 外部攻撃対策
- **レート制限を設ける**: 認証エンドポイント（ログイン・パスワードリセット等）にはブルートフォース対策としてレート制限を実装する
- **エラーレスポンスに内部情報を含めない**: スタックトレース・DB エラー詳細・内部パスは本番レスポンスに含めない

#### ドメインエラーとインフラエラーの分離
- DB 接続エラー・外部 API エラーは Infrastructure 層でキャッチし、ドメインエラー（`DomainError` 等）に変換して上位に伝播させる。生の Prisma エラーや HTTP エラーをそのまま上位層に漏らさない

### API 設計

#### レスポンス型の後方互換性

フィールドの **削除・リネーム・型変更** は既存クライアントを壊す破壊的変更。変更の種類によって手順を使い分ける。

| 変更種別 | 破壊的変更 | 手順 |
|----------|-----------|------|
| フィールド追加 | なし（後方互換） | 通常の実装変更で可 |
| フィールド削除・リネーム | あり | `openapi.yaml` を先に更新 → `pnpm codegen` で型エラー確認 → 実装修正 |
| 型変更（`string` → `number` 等） | あり | 同上 |

- `pnpm codegen` が SSOT。codegen 後の型エラーは「スペックが正しく、実装を直す」方向で解消する
- スペックと実装が乖離した状態でコミットしない

---

## フロントエンド（Next.js App Router）

### Component 設計

- 1つのコンポーネントは 150行以内を目安にする
- 副作用（`useEffect`）の利用は最小限にし、イベントハンドラや `useMemo` で処理する
- **Server Component をデフォルトとする**: `"use client"` は state・イベントハンドラ・ブラウザ API が必要な最小単位にのみ付与する。ページ全体を Client Component にしない

### セキュリティ

- **`dangerouslySetInnerHTML` は原則禁止**: XSS の直接原因になる。やむを得ない場合は DOMPurify 等で sanitize し、理由をコメントする
- **`eval()` / `new Function()` は禁止**: 任意コード実行のリスクがある
- **`href="javascript:..."` は禁止**: XSS の原因になる。クリックハンドラを使うこと
- **外部 URL へのリダイレクトはホワイトリスト制御**: ユーザー入力をそのままリダイレクト先にしない（Open Redirect 防止）
- **LocalStorage / SessionStorage に機密情報を保存しない**: アクセストークン・個人情報は保存禁止。XSS で全取得される
- **`<iframe>` には `sandbox` 属性を付与する**: 外部コンテンツを埋め込む場合は必要最小限の権限のみ許可する
- **ユーザー入力を直接 DOM・URL・CSS に挿入しない**: innerHTML・URL パラメータ・style 属性へのユーザー入力の直接挿入は XSS・CSS インジェクションの原因になる

### UI/UX

- ローディング状態とエラー状態の表示を必ず考慮する
- 破壊的な操作の前には必ず確認（モーダル等）を挟む

### shadcn/ui ラッパーコンポーネント規約（必須）

> **この規約は ESLint ルール（`no-restricted-imports`）によって自動強制される。違反はコミット時に `lefthook` でブロックされる。**

| ルール | 内容 |
|--------|------|
| **プリミティブ直接インポート禁止** | `@radix-ui/*`・`vaul`・`sonner(Toaster)` を `src/` から直接インポートしてはならない |
| **ラッパー経由の義務** | `src/components/ui/` 配下のラッパーコンポーネントを使用すること |
| **ネイティブ要素の制限** | `<button>`, `<input>`, `<select>` 等は shadcn/ui 相当ラッパーが存在する場合は使用禁止 |
| **新規コンポーネントの追加** | UI プリミティブが必要な場合は先に `src/components/ui/` にラッパーを作成してから使用する |
| **例外** | `toast()` 関数など UI 以外の API は `sonner` から直接インポート可。`__tests__/` 内はモック目的のため除外 |

**現在のラッパー一覧** (`src/components/ui/`):

| ラッパー | 内部ライブラリ | 用途 |
|----------|--------------|------|
| `button.tsx` | `@radix-ui/react-slot` | ボタン |
| `dialog.tsx` | `@radix-ui/react-dialog` | モーダル |
| `drawer.tsx` | `vaul` | ドロワー |
| `select.tsx` | `@radix-ui/react-select` | セレクトボックス |
| `sonner.tsx` | `sonner` | トースト通知 |
| `form.tsx` | `@radix-ui/react-label` | フォームフィールド |
| `tabs.tsx` | `@radix-ui/react-tabs` | タブ |
| `popover.tsx` | `@radix-ui/react-popover` | ポップオーバー |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | ツールチップ |
| `checkbox.tsx` | `@radix-ui/react-checkbox` | チェックボックス |
| `sheet.tsx` | `@radix-ui/react-dialog` | サイドシート |

---

## テストコード規約

> テスト要件（種別・配置先・必須ケース）の全体定義は `.github/rules/workflow.md` を参照。
> このセクションは「どう書くか」の品質基準を定める。

### テスト種別と配置先

| 対象 | 種別 | 配置先 |
|------|------|--------|
| FE: コンポーネント・hooks | Vitest + RTL | `apps/web/src/__tests__/components/` |
| FE: Server Actions | Vitest | `apps/web/src/__tests__/actions/` |
| FE: 主要フロー | Playwright E2E | `e2e/` |
| BE: UseCase・ドメインロジック | Vitest unit | `apps/api/src/__tests__/unit/` |
| BE: API エンドポイント | Vitest integration（実 DB） | `apps/api/src/__tests__/integration/` |
| Common: ユーティリティ | Vitest unit | `packages/common/src/__tests__/` |
| Common: Zod スキーマ | Vitest unit | `packages/common/src/__tests__/schemas/` |

### 命名規則

- テスト名は **「〜のとき、〜になる」** 形式で意図を明確にする
  - 良い例: `金額が0円のとき、バリデーションエラーになる`
  - 悪い例: `test amount validation`
- `describe` ブロックはテスト対象の関数名・コンポーネント名を使う

### 必須テストケース

#### 全テスト共通

すべてのテストで以下の網羅を意識する。

| ケース | 内容 |
|--------|------|
| 正常系 | 期待する入力で期待する出力が得られること |
| 異常系 | 不正な入力・エラー時に適切なハンドリングが行われること |
| 境界値 | 最小値・最大値・空文字・`null`・`0` などの境界を検証すること |

#### 引数・パラメータの網羅（UT / 統合テスト）

関数・APIの引数・クエリパラメータは **組み合わせを網羅的にテストする**。`test.each` を活用してケースを明示的に列挙する。

```typescript
// ✅ パラメータごとに網羅
test.each([
  { sortBy: 'date', order: 'asc',  expected: [order1, order2] },
  { sortBy: 'date', order: 'desc', expected: [order2, order1] },
  { sortBy: 'amount', order: 'asc', expected: [order1, order2] },
])('sortBy=$sortBy order=$order のとき正しい順序で返る', async ({ sortBy, order, expected }) => {
  const res = await getOrders({ sortBy, order });
  expect(res.map((e) => e.id)).toEqual(expected.map((e) => e.id));
});
```

#### BE 統合テスト（API エンドポイント）のカバレッジ要件

- **全エンドポイントに統合テストを用意する**。未テストのエンドポイントを残してはならない
- 各エンドポイントで以下のケースを必ず含める：

| ケース | 内容 |
|--------|------|
| 正常系 | 期待するリクエストで期待するレスポンス・DB 状態になること |
| バリデーションエラー | 不正な入力値で 400 が返ること |
| 未認証 | 認証なしリクエストで 401 が返ること |
| 認可エラー | 他ユーザーのリソースへのアクセスで 403 / 404 が返ること |
| 存在しないリソース | 該当データなしで 404 が返ること |

#### 検索・ソート・フィルタの網羅

検索クエリ・ソート・フィルタがある場合、**DBに実データを投入した上で結果が正しいことを検証する**。

- **ソート**: 昇順・降順それぞれで順序を検証する。同値の場合のタイブレーク順序も確認する
- **フィルタ**: 単独条件・複数条件の AND 組み合わせ・条件なし（全件）を検証する
- **空結果**: 該当データなしのとき空配列が返ること
- **ページネーション**: 1ページ目・中間ページ・最終ページ・空リストを検証する

```typescript
it('検索: categoryId フィルタで該当カテゴリのみ返る', async () => {
  const food    = await createTestOrder({ categoryId: 1 });
  const medical = await createTestOrder({ categoryId: 5 });

  const res = await request(app).get('/orders?categoryId=1');

  expect(res.body.map((e: Order) => e.id)).toContain(food.id);
  expect(res.body.map((e: Order) => e.id)).not.toContain(medical.id);
});
```

### テスト品質基準

#### 振る舞いをテストする（実装詳細に依存しない）

- **NG**: 内部メソッドの呼び出し回数・呼び出し順序を検証する
- **OK**: 戻り値・状態変化・DOM の変化・イベントの発火を検証する
- リファクタリング後もテストが壊れないことを意識する

#### アサーションを意味のあるものにする

- `expect(true).toBe(true)` のようなトートロジーは禁止
- **エラーの型とメッセージを両方検証する**:

  ```typescript
  // ❌ 型のみ（メッセージが変わってもパスしてしまう）
  await expect(fn()).rejects.toBeInstanceOf(ValidationError);

  // ✅ 型 + メッセージ両方
  await expect(fn()).rejects.toThrow(new ValidationError('金額は正の値を入力してください'));
  // または
  const err = await fn().catch((e) => e);
  expect(err).toBeInstanceOf(ValidationError);
  expect(err.message).toBe('金額は正の値を入力してください');
  ```

- **成功時も具体的なフィールド値まで検証する**:

  ```typescript
  // ❌ 存在確認のみ（値の中身が正しいか分からない）
  expect(result).toBeDefined();
  expect(result.success).toBe(true);

  // ✅ 期待する値を具体的に検証
  expect(result.id).toMatch(/^[0-9A-Z]{26}$/); // ulid形式
  expect(result.amount).toBe(1000);
  expect(result.category).toBe('food');
  ```

- `expect` が 0 件のテストは存在してはならない（`assertions` を明示するか削除する）

#### 1テスト1関心

- 1つの `it` / `test` ブロックで検証する関心事は1つに絞る
- `expect` の件数は **原則3件以内**。それを超える場合は `describe` / `it` を分割できないか検討する
- 「〜かつ〜かつ〜を検証する」というテスト名になったら分割のサイン

#### 非同期の確実な待機

FE テストで `waitFor` を使う場合、コールバック内でアサーションを完結させる：

```typescript
// ❌ waitFor の外で mock.calls にアクセスすると競合が起きる
await waitFor(() => expect(mockFn).toHaveBeenCalled());
expect(mockFn.mock.calls[0][0]).toBe('expected'); // 競合の可能性

// ✅ waitFor 内でアサーションを完結させる
await waitFor(() => {
  expect(mockFn).toHaveBeenCalledWith('expected');
});
```

#### 境界値の網羅

「境界値を検証すること」だけでなく、以下を明示的に含める：

| ケース | 例 |
|--------|-----|
| ゼロ | `amount = 0` |
| 負数 | `amount = -1` |
| 最大値 | スキーマ上限ちょうど |
| 最大値 + 1 | スキーマ上限を1超過 |
| 空文字列 | `name = ''` |
| 最大文字長 | `name.length === MAX_LENGTH` |

#### モック方針

- **外部依存のみモック**: DB・外部 API・タイマー・ファイルシステムはモックしてよい
- **プロジェクト内部ロジックはモックしない**: ユースケース・ドメインロジックは実コードで動かす（統合テストで担保する）
- `vi.mock()` の過剰使用は「テストが通っても実装が壊れている」状態を生む

#### モック初期化の統一

`beforeEach` でのモック管理は `vi.clearAllMocks()` に統一する：

```typescript
// ❌ 個別リセット（漏れが起きやすい）
beforeEach(() => {
  mockFn.mockReset();
  anotherMock.mockClear();
});

// ✅ 一括クリア
beforeEach(() => {
  vi.clearAllMocks(); // すべてのモックの呼び出し履歴をリセット
});
```

`vi.resetAllMocks()`（実装も消える）や `vi.restoreAllMocks()`（スパイを元に戻す）との使い分けを意識する。

#### テストの独立性

- 各テストは他のテストの実行順序・実行有無に依存してはならない
- 統合テストは `beforeEach` で `resetDatabase()` を呼び出し、テスト間の状態汚染を防ぐ
- **固定 ID のハードコード禁止**: テストデータの ID は必ず `ulid()` で動的生成する
  - 固定 ID は並列実行時に衝突し、テスト間で暗黙の順序依存を生む
  - `createTestUser()` などのファクトリ関数を経由することで ID 生成ポリシーを一元管理できる

#### テストデータの明示性

- テストデータにマジックナンバー・マジック文字列を使わない
- データの意図が変数名や `describe` のコンテキストから読み取れること
- 例: `const amount = 0` より `const BOUNDARY_AMOUNT = 0 // 境界値: ゼロ円`
- テスト固有の定数は `it` ブロック内に閉じ込め、スコープを最小にする

#### スナップショットテスト

UI コンポーネントのレンダリング検証には `toMatchInlineSnapshot` を使い、スナップショットを変更差分として追跡できるようにする：

```typescript
// ✅ インラインスナップショット（変更がコードレビューで視認できる）
expect(container.innerHTML).toMatchInlineSnapshot(`
  "<div class="card">...</div>"
`);

// ❌ 外部ファイルスナップショット（差分が .snap ファイルに隠れる）
expect(container).toMatchSnapshot();
```

#### テスト内コメント（why コメント）

非自明なセットアップや境界値には **なぜその値なのか** を1行コメントで添える：

```typescript
// ✅ 境界値の意図が明確
const amount = 10_000_001; // 上限 1000万円を1円超過

// ✅ モック設定の理由が明確
mockGetUser.mockResolvedValueOnce(null); // 退会済みユーザーを模倣
```

### DB 整合性チェック（統合テスト）

BE の統合テスト（API エンドポイント・UseCase × 実 DB）では、DB の状態を直接検証することで「SQL ミス・Prisma クエリの誤り」を検出する。

#### テストケースごとのデータ投入とクリーンアップ

- **各テストケースは自分が必要なデータを自分で投入する**。他テストのデータに依存してはならない
- `beforeEach` でテストデータを投入し、`afterEach` で削除する（または `beforeEach` でリセット後に投入）
- クリーンアップは `try/finally` または `afterEach` で **例外時も必ず実行されること** を保証する

```typescript
describe('POST /orders', () => {
  let testUser: User;

  beforeEach(async () => {
    testUser = await createTestUser(); // 動的 ID で投入
  });

  afterEach(async () => {
    await db.order.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  });
});
```

#### GET 系: DBデータとレスポンスの対応を検証

- テストデータを投入した後、API を呼び出し、**レスポンスの各フィールドが DB の値と一致することを検証する**
- 意図しないカラムからの値漏洩がないことも確認する（例: `password_hash` が混入していないか）

```typescript
it('GET /orders/:id — DBの値がレスポンスに正しく反映される', async () => {
  const order = await createTestOrder({ amount: 1500, categoryId: 2 });

  const res = await request(app).get(`/orders/${order.id}`);

  expect(res.body.amount).toBe(1500);
  expect(res.body.categoryId).toBe(2);
  // 意図しないフィールドが含まれていないこと
  expect(res.body).not.toHaveProperty('deletedAt');
  expect(res.body).not.toHaveProperty('internalNote');
});
```

#### 書き込み系: DB の操作結果を直接検証

- **意図したカラムに正しく保存・更新・削除されているか** を DB を直接参照して確認する
- **意図しないカラム・レコードが変更されていないか** を明示的に検証する

```typescript
it('POST /orders — 指定カラムのみ書き込まれ、他レコードは変更されない', async () => {
  const otherOrder = await createTestOrder({ amount: 500 }); // 別ユーザーのデータ

  await request(app).post('/orders').send({ amount: 1000, categoryId: 1 });

  // 意図したレコードが作成されている
  const created = await db.order.findFirst({ where: { amount: 1000 } });
  expect(created).not.toBeNull();
  expect(created!.categoryId).toBe(1);

  // 他のレコードが変更されていない
  const unchanged = await db.order.findUnique({ where: { id: otherOrder.id } });
  expect(unchanged!.amount).toBe(500); // 変わっていないこと
});
```

#### クリーンアップの確実な保証

- テスト終了後（成功・失敗問わず）に投入データが残らないこと
- `afterEach` のクリーンアップが漏れた場合に後続テストが汚染されないよう、`beforeEach` の先頭でも前回残渣を削除するパターンを推奨する

```typescript
beforeEach(async () => {
  // 前回のテストが失敗してクリーンアップされていない場合に備えてリセット
  await db.order.deleteMany({ where: { userId: testUser.id } });
  // 改めてテストデータを投入
  testUser = await createTestUser();
});
```

#### 認証・認可の網羅

各 API エンドポイントの統合テストに **認証・認可のネガティブケースを必ず含める**。

| ケース | 検証内容 |
|--------|---------|
| 未認証リクエスト | Authorization ヘッダなしで 401 が返ること |
| 他ユーザーのリソースアクセス | 自分以外のリソース ID を指定したとき 403 または 404 が返ること（存在を漏洩しない） |
| 削除済みユーザー | 退会済みユーザーのトークンで 401 が返ること |

```typescript
it('他ユーザーの注文は取得できない', async () => {
  const otherUser = await createTestUser();
  const order   = await createTestOrder({ userId: otherUser.id });

  const res = await request(app)
    .get(`/orders/${order.id}`)
    .set('Authorization', `Bearer ${currentUserToken}`);

  // 存在するが他ユーザーのリソース → 404（存在を教えない）
  expect(res.status).toBe(404);
});
```

---

### 機能デグレ防止

#### テストの消去・弱体化の禁止

- バグ修正・リファクタリング時に、既存テストを **削除・`skip`・アサーションの緩和** によって CI をパスさせることを禁止する
- テストが壊れた場合は「テストを直す」のではなく「実装が正しいかを確認する」

#### バグ修正時の再現テスト必須

- 修正したバグは必ず **「修正前に失敗し、修正後に通る」テストを追加** してからコミットする
- 再現テストがないバグ修正は同じバグの再発を防げない

#### 主要ユーザーフローの E2E カバレッジ確保

コアとなるユーザーフローは E2E テストが存在することを確保する。UT・統合テストだけでは画面間の繋ぎの崩壊を検出できない。

| フロー | テストの存在確認 |
|--------|----------------|
| ログイン → 一覧表示 | `e2e/` に存在すること |
| 注文登録 → 一覧反映 | `e2e/` に存在すること |
| 主要計算フローの確認 | `e2e/` に存在すること |

#### 変更シンボルの参照確認

- 関数・型・定数を変更・削除した場合は、**参照箇所を `grep` または Serena `find_referencing_symbols` で確認** し、影響範囲のテストが存在することを確認する
- 参照先にテストがない場合は追加するか、影響ないことをコメントで明示する

#### DB マイグレーション後の整合性検証

- マイグレーションを伴う変更（カラム追加・削除・型変更・NULL 制約変更）は、**統合テストで既存データへの影響がないことを確認** してからマージする
- 特に `NOT NULL` カラムの追加・`DEFAULT` なし追加は既存レコードを壊す可能性がある

---

### 禁止事項

| 禁止事項 | 理由 |
|----------|------|
| コメントアウトされたテスト | デッドコード。削除するか理由をコメントして skip を使う |
| `any` の使用 | 通常の型規約と同様に禁止 |
| UT で DB に直接アクセス | ユニットテストの責務から外れる。統合テストで行う |
| 統合テストで外部 HTTP をモックせず呼び出す | テスト環境の外部依存を作らない |
| 既存テストの削除・skip によるCI通過 | デグレ検出機能を破壊する |
| バグ修正に再現テストを付けないこと | 同一バグの再発を防げない |

---

## アイコン規約

- **アイコンライブラリの使用を必須とする**: UI にアイコンが必要な場合は必ず `lucide-react` を使用すること
- インラインの `<svg>` 直書きや絵文字での代替は禁止
- インポート例: `import { X, ChevronRight, TrendingDown } from "lucide-react";`
- サイズ指定: `size` prop または Tailwind の `w-*`/`h-*` クラスで統一する
- `strokeWidth` はデフォルト（2）を基本とし、デザイン上の理由がある場合のみ変更する

---

## Git 操作

- **コミットの粒度**: Atomic Commit（1変更＝1コミット）を徹底する
- **コミットメッセージ**: `.github/rules/commit-message-instructions.md` に従うこと（SSOT）
- **PR の生成**: `.github/rules/pull-request-instructions.md` に従うこと（SSOT）
- **ブランチ運用**: `{type}/{description}` 形式

---

## 開発・修正時の禁止事項

| 禁止事項 | 理由 |
|----------|------|
| 「ついで」の修正 | 指示外の箇所をリファクタリングしてはならない |
| 確認なしのコード削除 | コード削除時は影響範囲を報告し、許可を得ること |
| コメントの勝手な削除 | 既存の JSDoc や注釈を勝手に削除しない |
| 絵文字の使用 | コード・UI・コミットメッセージ・ドキュメントのいかなる箇所にも絵文字（emoji）を使用してはならない |

---

## Gemini Code Assist レビューガイド

> `GEMINI.md`（リポジトリルート）は Gemini Code Assist の読み込みエントリポイント。
> 規約の実体はここに集約されている（SSOT）。

### レビュー対象と優先度

#### 重点レビュー対象（`apps/web/`, `apps/api/`）

上記の TypeScript・DDD・フロントエンド・アイコン規約をすべて適用してレビューすること。

- レイヤーを跨ぐ不正な依存（例: Domain が Infrastructure を import）は必ず指摘する
- `apps/web/src/` 配下での `@radix-ui/*`・`vaul`・`sonner(Toaster)` の直接 import は指摘する（`src/components/ui/` ラッパー経由が必須）

#### 限定的レビュー対象（`apps/sandbox/`）

`apps/sandbox/` は UI/UX プロトタイプ専用。
**レビューの観点は「本実装に導入する際に負債にならないか」に絞る。**
sandbox 内でのみ完結するプロトタイプ的な実装は指摘しない。本番コードへコピーされたときに問題になるものだけを指摘する。

| 観点 | 方針 |
|------|------|
| セキュリティ（XSS・シークレットハードコード等） | **必ず指摘する**（sandbox でも本番でも危険） |
| `any` の使用 | **指摘する**（本番導入時に型安全性の問題になる） |
| ロジックの誤り・バグの可能性 | **指摘する**（本番導入時にそのまま残るリスク） |
| ネイティブ HTML 要素の直接使用 | **指摘しない**（本番移植時に shadcn ラッパーへ置換される前提） |
| Radix UI プリミティブの直接 import | **指摘しない**（同上） |
| framer-motion の多用 | **指摘しない**（プロトタイプ表現のため意図的） |
| 150 行超のコンポーネント | **指摘しない**（プロトタイプのため許容） |

#### テストファイルのレビュー（`**/__tests__/**`, `**/*.test.ts`, `**/*.test.tsx`）

テストファイルは実装コードと同等の品質基準でレビューする。
品質基準の詳細は本ファイルの **「テストコード規約」セクション** を参照。

| 観点 | チェック内容 |
|------|------------|
| **命名** | 「〜のとき、〜になる」形式で意図が明確か |
| **デッドコード** | コメントアウトテスト・到達しない `expect` が残っていないか |
| **振る舞いテスト** | 実装詳細（メソッド呼び出し回数等）ではなく振る舞い（出力・状態変化）を検証しているか |
| **アサーションの妥当性** | トートロジーがないか・エラーの種類まで検証しているか・`expect` が 0 件でないか |
| **ケース網羅** | 正常系・異常系・境界値がカバーされているか |
| **モック範囲** | 外部依存のみモックし、内部ロジックをモックしていないか |
| **テストの独立性** | 統合テストで `resetDatabase()` が呼ばれているか・固定 ID が使われていないか |
| **ファイル構成** | 対象モジュールと対応したディレクトリ・ファイル名になっているか |
| **共通規約** | `any` 禁止・未使用変数削除など通常の規約を適用しているか |

#### レビュー不要（スキップ）

- `apps/api/prisma/migrations/**` — 自動生成マイグレーション
- `infra/**` — Terraform（別途 infra チェックがある）
- `*.md` — ドキュメント

### コメントスタイル

- コメントは **日本語** で書く
- 指摘は「なぜ問題か」を明確に説明し、修正案は具体的なコードスニペットで示す
- 重大度を明示する: `[CRITICAL]` / `[MAJOR]` / `[MINOR]` / `[NIT]`
  - `[CRITICAL]`: セキュリティ・データ損失リスク → 必ずマージ前に修正
  - `[MAJOR]`: 規約違反・バグの可能性 → 原則修正
  - `[MINOR]`: 改善提案 → 任意
  - `[NIT]`: 細かいスタイル → 任意

### 指摘しなくてよいこと（意図的な設計）

- コミットメッセージが日本語であること（プロジェクト規約）
- `apps/web/src/components/ui/` 配下が Radix UI を import していること（ラッパー本体のため）
- 絵文字がコードに存在しないこと（絵文字禁止規約のため）

---

## PR 作成規約

### Issue 紐付け（必須・機械強制）

すべての PR は対応する Issue に紐付けること。
`pr-checks.yml` の `Issue Link Check` が PR body を検査し、紐付けがない場合はマージをブロックする。

```
Closes #123
```

| ルール | 詳細 |
|--------|------|
| **必須キーワード** | `Closes #NNN` / `Fixes #NNN` / `Resolves #NNN`（大文字小文字不問） |
| **複数 Issue** | 複数行で列挙する |
| **Issue がない場合** | 先に Issue を作成してから PR を出す。`chore`・`docs`・`refactor` 等でも Issue を作成する |
| **ブランチ名との一致** | `feat/issue-132-xxx` ブランチなら `Closes #132` が含まれることが望ましい（不一致は警告のみ） |

### なぜ全 PR に Issue が必要か

- 作業の背景・意図がトレースできる
- スプリント実績の pull 型集計（`Closes #N` から完了 PBI と size ラベルを導出）に必要
- Issue 駆動開発により「なんとなく作業」を防ぐ
