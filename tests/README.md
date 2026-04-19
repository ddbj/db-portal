# テスト方針

## 目的

テストはバグを見つけるために書く。通ることを確認するために書かない。

境界値・エッジケース・異常系を重点的にテストする。「この入力で壊れないか？」を常に問い続ける。

## 3 バケツ

機能ごとに「どの粒度でバグを検出したいか」で振り分ける。

| バケツ | 配置 | 道具 | 対象 |
| --- | --- | --- | --- |
| unit | `tests/unit/` | Vitest + fast-check + React Testing Library + MSW | 純粋ロジック、Component の表示分岐 |
| browser | `tests/browser/` | Playwright + MSW stub | UI 動線、副作用（クリップボード、`target="_blank"`、browser history） |
| integration | `tests/integration/` | Playwright + 実 staging API + 実 Keycloak | 本物の貫通確認、認証フロー |

振り分けの軸:

- **外部境界に依存するか**: 実 Search API / 実 Keycloak が必須なら integration
- **ブラウザ環境が必要か**: DOM 操作・ナビゲーション・副作用が中心なら browser、純粋ロジックなら unit

迷ったら browser に寄せる。ブラウザ検証の方が現実の挙動に近い。

## Mock 戦略

mock するのは外部境界だけ。内部実装（React Router の loader、TanStack Query hook の内部、独自 store）は mock しない。設計が mock を要求するなら、テストではなく設計を直す。

- unit / browser: MSW v2 で Search API レスポンスを stub。認証は `react-oidc-context` 相当を境界として差し替え
- integration: 一切 mock しない。実 Keycloak・実 Search API staging に接続

## Property-Based Testing

fast-check で意味のある不変条件を持つ純粋ロジックにだけ適用する。

適用例:

- DSL ↔ URL の roundtrip（encode → decode → encode が冪等）
- URL 正規化の冪等性（正規化済み URL を再正規化しても変わらない）
- ページネーション境界（`page × perPage` が 10,000 以下なら offset 方式、超えたら cursor 方式）

「どんな入力でも例外を投げない」は不変条件として弱い。採用しない。PBT は example-based test の代替ではなく補完。両方書く。

## Mutation Testing

採用しない。

## カバレッジ

数値目標にしない。`test:coverage` は届いていない箇所の可視化のみに使う。

## 命名規則

```
describe("対象") > it("条件と期待結果")
```

名前を読むだけで何を検証しているか分かるようにする。

## フィクスチャ

`tests/helpers/fixtures.ts` に共有ファクトリを集約する。同じ fixture を 2 ファイル以上で使うならここに移す。1 ファイルでしか使わないファクトリはそのファイル内に置いて良い。

MSW のデフォルト handler は `src/mocks/handlers.ts`。テスト内で `server.use()` により個別に上書きする。

## テスト間の独立性

- テスト間で状態を共有しない
- 実行順序に依存しない

## 実行運用

- 実装時は変更に関連するテストだけ走らせる
- 全テスト実行・全バケツ実行は CI に任せる。手動では（明示的に求められた時以外は）行わない
- integration テストは気軽に実行して良い。ただし無関係な変更で全 integration を回さない

## ディレクトリ構成

```
tests/
├── README.md            # このファイル（方針）
├── scenarios.md         # 機能 × シナリオ一覧
├── integration-note.md  # integration テストの運用注意
├── setup.ts             # Vitest global setup
├── playwright.config.ts
├── helpers/             # 共有 fixture / renderer / MSW handler 等
├── unit/
├── browser/
└── integration/
```

## 関連ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [scenarios.md](./scenarios.md) | 機能ごとのテストシナリオ |
| [integration-note.md](./integration-note.md) | integration テストの運用注意（auth state、データ前提、CI 戦略） |
| [../docs/development.md](../docs/development.md) | 開発環境・コマンド一覧 |
