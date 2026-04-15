# 開発ガイド

ローカル開発環境のセットアップ、日常コマンド、テスト実行、トラブルシューティング。

## 前提条件

- Node.js 24+
- Docker（開発サーバー）または podman + podman-compose（遺伝研スパコン）

## セットアップ（Docker）

```bash
cp env.dev .env
docker compose up -d --build
```

Dockerfile 内で `npm ci` が実行され、初回起動時に Docker が named volume に node_modules をコピーする。`package.json` を変更した場合は `docker compose exec app npm install` で更新する。

## 開発サーバーの起動

```bash
docker compose exec app npm run dev
```

http://localhost:3000 でアクセスできる。

## コマンド一覧

全て `docker compose exec app` 経由で実行する。

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド済みアプリの起動 |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint 実行 |
| `npm run lint:fix` | ESLint 自動修正 |
| `npm test` | Vitest 実行（単発） |
| `npm run test:watch` | Vitest ウォッチモード |
| `npm run test:coverage` | カバレッジレポート生成 |
| `npm run test:e2e` | Playwright E2E テスト |
| `npm run test:e2e:ui` | Playwright UI モード |

## テスト

### ディレクトリ構成

```
tests/
├── setup.ts                 # Vitest global setup
├── playwright.config.ts     # Playwright config
├── unit/                    # Unit / Component tests (Vitest)
└── e2e/                     # E2E tests (Playwright)
```

### Unit / Component テスト（Vitest）

```bash
docker compose exec app npm test
```

- テストファイル: `tests/unit/**/*.test.{ts,tsx}`
- 設定: `vite.config.ts` の `test` セクション
- E2E (`tests/e2e/`) は自動で除外される

### E2E テスト（Playwright）

```bash
# ブラウザのインストール（初回のみ）
docker compose exec app npx playwright install chromium

# 開発サーバーが起動している状態で実行
docker compose exec app npm run test:e2e
```

- テストファイル: `tests/e2e/**/*.spec.ts`
- 設定: `tests/playwright.config.ts`

## ローカル開発（Docker なし）

Docker を使わずホストで直接開発する場合:

```bash
npm install
npm run dev
```

## node_modules のトラブルシューティング

node_modules の named volume が壊れた場合:

```bash
docker compose down -v   # volume を含めて削除
docker compose up -d --build
docker compose exec app npm install
```
