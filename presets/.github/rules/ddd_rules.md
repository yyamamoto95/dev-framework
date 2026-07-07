# DDD 導入プロジェクト基本ルール（アーキテクチャガイドライン）

> **スタック固有プリセット**: DDD / Onion Architecture を採用するプロジェクト向け。採用しない場合は導入不要。

## 1. レイヤー責務

### Presentation（外界との接点）
- HTTP（Express）など外部との入出力を扱う
- リクエスト/レスポンスの整形、認証/セッション確認、DTO への変換など
- ドメインの振る舞いを呼び出す（ユースケース/サービス/リポジトリはドメイン側の契約を通じて利用）
- 外部依存（DBドライバ、外部 API、暗号化ライブラリ等）を直接持ち込まない

### Application（ユースケースの実行）
- システムのユースケースをオーケストレーションする
- ドメインの契約（Repository interface 等）を用いて処理を実行する
- トランザクション境界の管理、複数ステップの整合性維持など

### Domain（ビジネスロジックとモデル）
- ユビキタス言語に基づくモデル（Entities/ValueObjects）
- Repository インターフェース（永続化の契約）
- ドメインルール（検証、状態遷移、計算ロジック等）
- 外部フレームワークに依存しない

### Infrastructure（DB・外部ライブラリの実装）
- Infrastructure 実装（Prisma リポジトリ、外部ライブラリラッパ等）
- DB 接続、マイグレーション、外部 API の実装
- Domain が定義する Repository インターフェースを実装する

## 2. 依存の方向（依存ルール）

- **依存は Domain に向かう**（上位層が下位層の具体実装に依存しない）
- 典型的な依存関係は以下の通り:
  - `Presentation -> Application -> Domain`
  - `Infrastructure -> Domain`
- 具体実装（例: `PrismaOrderRepository`）は `Infrastructure` に置き、外部（Presentation/Application）からは **インターフェース経由で利用**する

## 3. ユビキタス言語（命名規則）

- ドメイン概念（例: `Order`, `User`, `userId`, `order_list`, `user_list` など）に対して、命名をブレさせない
- 推奨:
  - `domain/models/*` にあるプロパティはドメイン表現に従う（例: `userId`, `balanceType`）
  - Repository interface は “〜のための repository” ではなく “〜を扱う repository”（例: `IOrderRepository`）
  - Use case / controller / route はドメインの操作単位で命名する（例: `GetOrder`, `SaveOrder`, `LoginUser`）
- DB 物理名（列名やテーブル名）は、Entity の `@Column({ name: '...' })` / `@Entity({ name: '...' })` によって明示し、変換・生成物（DBML 等）に反映されるようにする

