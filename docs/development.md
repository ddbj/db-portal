# Development

開発環境のセットアップ、環境ファイル切替、よく使うコマンドをまとめる。本書は実装の起動手順 SSOT。詳細な API / コンテンツ / 認証の方針は他 docs を参照。

## 前提

- 開発はすべて **Docker Compose 内で実行**。ホストに Node を直接入れない
- 本番は podman + podman-compose (NIG インフラ)
- 接続情報・credential は `.env` を通じて compose に流す。直接 export しない
- Editor / IDE は host で動かす (LSP / 補完用に node_modules を host から見たい場合は volume mount で対応する形)

## 初回セットアップ

```bash
# リポジトリ clone
git clone git@github.com:ddbj/db-portal ~/git/github.com/ddbj/db-portal
cd ~/git/github.com/ddbj/db-portal

# 環境ファイルを .env にコピー
cp env.dev .env

# コンテナを build + 起動
docker compose up -d --build

# 依存関係のインストール (compose の volume に node_modules が乗る)
docker compose exec app npm install

# API 型生成 (staging openapi.json から)
docker compose exec app npm run gen:api-types

# dev サーバが起動していることを確認
curl -s http://localhost:3000 | head -20
```

`compose.yml` の `app` サービスが `npm run dev` を `command` として持つので、`docker compose up` だけで dev サーバが起動する。

## 環境ファイル

### 切替方法

```bash
# dev に切替
cp env.dev .env
docker compose down -v
docker compose up -d --build

# staging に切替 (dev volume を消してから)
cp env.staging .env
docker compose down -v
docker compose up -d --build
```

`compose.yml` は `.env` の `DB_PORTAL_PREFIX` を `container_name` / `image` / `volume` / `network` 名に含めるので、dev / staging / production が同一ホストで並列に動いても衝突しない (`decisions.md`)。

### 環境ごとの差

| 変数 | dev | staging | production |
|---|---|---|---|
| `DB_PORTAL_PREFIX` | `db-portal-dev` | `db-portal-staging` | `db-portal-prod` |
| `DB_PORTAL_ENV` | `dev` | `staging` | `production` |
| `DB_PORTAL_APP_COMMAND` | `npm run dev` | `npm start` | `npm start` |
| `DB_PORTAL_APP_PORT` | `3000` | `3100` | `3200` |
| `DB_PORTAL_PORTAL_ORIGIN` | `http://localhost:3000` | `https://portal-staging.ddbj.nig.ac.jp` | `https://portal.ddbj.nig.ac.jp` |
| `DB_PORTAL_LOG_LEVEL` | `debug` | `info` | `warn` |
| `DB_PORTAL_SEARCH_API_URL` | staging | staging | production |
| `DB_PORTAL_OPENAPI_URL` | staging | staging | production |
| `DB_PORTAL_KEYCLOAK_REALM_URL` | staging | staging | production |
| `DB_PORTAL_KEYCLOAK_CLIENT_ID` | `db-portal-dev` | `db-portal-staging` | `db-portal` |
| `DB_PORTAL_LLM_BASE_URL` | (空、UI hide) | `http://l40s-03:3200` | `http://l40s-03:3200` |
| `DB_PORTAL_LLM_API_KEY` | (空) | staging key | `CHANGE_ME` |

Production の secret は `CHANGE_ME` プレースホルダのまま git に commit される。実値は deploy 時に `.env.production.local` などで上書きする (詳細は `deployment.md`)。News mirror は git protocol HTTPS で動くため GitHub PAT は不要 (`decisions.md`)。

### Secret の扱い

- `.gitignore` に `.env.*.local` を含める
- `DB_PORTAL_LLM_API_KEY` は production deploy 時に上書きする
- 開発者は staging key を使う、production key は触らない

## よく使うコマンド

全コマンドは `docker compose exec app` 経由で実行する。

```bash
# 依存
docker compose exec app npm install

# 型チェック
docker compose exec app npm run typecheck

# Lint (no-restricted-paths zones + 生 hex / arbitrary value 禁止を含む)
docker compose exec app npm run lint
docker compose exec app npm run lint:fix

# テスト (unit + pbt)
docker compose exec app npm test
docker compose exec app npm run test:unit
docker compose exec app npm run test:pbt
docker compose exec app npm test -- --watch

# E2E (Playwright、staging URL に対して実行)
docker compose exec app npm run test:e2e

# Build
docker compose exec app npm run build

# Dev サーバ (compose の default command と同じ、明示再起動用)
docker compose exec app npm run dev

# API 型生成 (.env の DB_PORTAL_OPENAPI_URL を参照)
docker compose exec app npm run gen:api-types

# Content collection の validate (build 前に走るが手動でも)
docker compose exec app npm run validate:content
```

## ファイル変更の反映

| 変更箇所 | 反映方法 |
|---|---|
| `app/` / `server/` の TS / TSX | RR v7 dev server が HMR で即反映 |
| `app/styles/tailwind.css` | Tailwind v4 plugin が即反映 |
| `app/lib/api/openapi-types.ts` | 手動で `gen:api-types` 再実行 |
| `app/content/**/*.content.tsx` | 起動時 eager validate のため、追加・削除は server 再起動 |
| `package.json` | `docker compose exec app npm install` で再 install |
| `Dockerfile` / `compose.yml` | `docker compose down -v && docker compose up -d --build` |
| `env.*` | `.env` を再 cp してから `docker compose down -v && up -d --build` |

`.env` の変更は compose の re-up が必要。`docker compose restart app` だけでは新 env が反映されない場合がある (compose の env 解釈タイミングに依存)。

## Container 内の env 検証

```bash
docker compose exec app sh -c 'env | grep ^DB_PORTAL_ | sort'
docker compose exec app sh -c 'env | grep ^VITE_DB_PORTAL_ | sort'
```

`DB_PORTAL_` prefix で grep して、`env.dev` などのファイルと一致することを確認する。Vite 用は `VITE_DB_PORTAL_` で別途確認 (secret が `VITE_` 側に漏れていないかも確認できる)。

## 新規依存追加

```bash
# Production dep
docker compose exec app npm install <pkg>

# Dev dep
docker compose exec app npm install -D <pkg>

# package.json + package-lock.json を git に commit
git status
git add package.json package-lock.json
```

ホストの `npm install` は禁止 (node_modules のバージョン解決が host 環境に依存するため)。

## API 型の更新

```bash
# .env が dev / staging のとき (staging openapi.json から生成)
docker compose exec app npm run gen:api-types

# Production 向けに型差分を確認したいとき
cp env.production .env
docker compose down -v
docker compose up -d --build
docker compose exec app npm run gen:api-types
git diff app/lib/api/openapi-types.ts

# 元に戻す
cp env.dev .env
docker compose down -v
docker compose up -d --build
```

staging / production の openapi.json と portal 側生成物 (`app/lib/api/openapi-types.ts`) の差分検知は手動運用 (`api-types.md`)。

## Content の lastUpdated 運用

`*.content.tsx` の `meta.lastUpdated` は **手書き** する。

```ts
meta: {
  lastUpdated: "2026-05-21T00:00:00Z",
  // ...
}
```

- コンテンツの実質的な更新 (誤字修正以外) があったときに手で更新
- CI で commit timestamp と `lastUpdated` を比較し、差分が 30 日以上なら warning を出す lint を持つ (実装は CI 設計の別 SSOT)
- 完全自動化はしない (編集者の意図的更新を担保する)

## Debug 用 URL (dev サーバ起動後)

| URL | 期待 |
|---|---|
| `http://localhost:3000` | トップページ (placeholder でも 200) |
| `http://localhost:3000/en` | 英語版トップ |
| `http://localhost:3000/api/me` | 401 (Cookie なし) |
| `http://localhost:3000/api/news` | `[]` (空配列、News mirror 未稼働 / 初期化中) |
| `http://localhost:3000/api/llm/health` | `{"status":"unset"}` (dev で `DB_PORTAL_LLM_BASE_URL` 空のため) |

## Troubleshooting

### `npm install` が遅い / 失敗する

```bash
# node_modules volume を一旦削除
docker compose down -v
docker compose up -d --build
docker compose exec app npm install
```

`docker compose down -v` で named volume (`${DB_PORTAL_PREFIX}-node_modules`) が削除される。これによりホスト環境を汚さずに node_modules を初期化できる。

### dev サーバが reload されない

Vite の HMR が外部 IP からの WebSocket 接続を許容できていない場合がある。`vite.config.ts` の `server.hmr.host` などを確認する。`compose.yml` の port mapping が `3000:3000` (両端同じ) であれば通常は問題ない。

### Lint で zones エラーが出る

`app/features/X` から `app/features/Y` を import している、または `app/lib` から `app/features` を import している可能性が高い。`architecture.md` の zones 表を再確認し、共通化が必要なら `lib` か `schemas` に降ろす。

### `gen:api-types` が失敗する

`DB_PORTAL_OPENAPI_URL` が container 内に届いていない可能性がある。 の検証コマンドで確認する。Staging API が落ちている場合もある (`curl $DB_PORTAL_OPENAPI_URL` で疎通確認)。

### Keycloak とのログインがリダイレクトループする

`DB_PORTAL_PORTAL_ORIGIN` と Keycloak client の `Valid Redirect URIs` が一致していない可能性。`auth.md` の env 設定と Keycloak 管理コンソールの設定を突き合わせる。

## PR を出す前のチェック

CI (`.github/workflows/ci.yml`) は次の 3 つを Docker Compose 内で回す。PR を出す前にローカルでも同じコマンドを走らせて全 pass を確認する。

```bash
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
```

加えて、リリース直前 / 大きい変更時には以下も手元で確認する (CI 自動化はリリース後に再評価):

```bash
docker compose exec app npm run validate:content
docker compose exec app npm run build
docker compose exec app npm run check:last-updated
docker compose exec app npm run gen:api-types  # 差分があれば commit
docker compose exec app npm run test:e2e       # staging URL に対して
```

