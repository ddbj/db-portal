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

# dev サーバが起動していることを確認 (env.dev の DB_PORTAL_APP_PORT で listen)
curl -s http://localhost:3000 | head -20
```

`env.dev` が `COMPOSE_FILE=compose.yml:compose.dev.yml` を持つので、`docker compose up` だけで base (production 形) に dev override (source bind-mount + `node_modules` volume + `build.target: dev`) が重なり、`command` の `npm run dev` で dev サーバが起動する。dev は `http://localhost:3000` (`env.dev` の `DB_PORTAL_PORTAL_ORIGIN`)。staging / production 形を手元で確認したいときは `cp env.staging .env` (= `COMPOSE_FILE` 無し) で base のみが load され、image に build を焼いた runtime stage が起動する。

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

`compose.yml` は `.env` の `DB_PORTAL_PREFIX` を `container_name` / `image` / `volume` / `network` 名に含めるので、dev / staging / production が同一ホストで並列に動いても衝突しない。

### 環境ごとの差

env 変数の **全集合とデフォルトは `server/lib/env.ts` (Zod schema) が SSOT**、各環境の実値は `env.dev` / `env.staging` / `env.production` (root に commit 済)、compose 内マッピングは `compose.yml`。feature 固有変数の意味は各 feature docs が持つ。本書では「環境間で挙動が変わる軸」 と「どの docs が SSOT か」 だけ示す。

| 変数群 | 環境差 / 用途 | SSOT docs |
|---|---|---|
| `DB_PORTAL_PREFIX` / `DB_PORTAL_ENV` | 環境識別子 (compose の container_name / image / volume / network 名に展開) | — |
| `DB_PORTAL_APP_COMMAND` | dev = `npm run dev`、staging / production = `tsx server/index.ts` (build / `validate:content` は image build 時に済む、node を PID1 直下に置き `SIGTERM` を届かせる) | `deployment.md`「起動と停止」 |
| `COMPOSE_FILE` | dev のみ `compose.yml:compose.dev.yml` で dev override を自動合成。staging / production は未設定 (podman は明示 `-f` で `compose.podman.yml`) | `deployment.md` |
| `DB_PORTAL_APP_PORT` / `DB_PORTAL_APP_INTERNAL_PORT` / `DB_PORTAL_PORTAL_ORIGIN` | host / container の listen port (`APP_INTERNAL_PORT` は `vite.config.ts` の `server.port` と `server/index.ts` の `app.listen` が読む、dev 3000) と portal 自身の origin | — |
| `DB_PORTAL_LOG_LEVEL` / `DB_PORTAL_DEFAULT_LANG` | log severity / i18n default 言語 (`DEFAULT_LANG` は `VITE_DB_PORTAL_DEFAULT_LANG` で client にも露出) | `i18n.md` |
| `DB_PORTAL_SEARCH_API_URL` / `DB_PORTAL_SEARCH_API_TIMEOUT_MS` / `DB_PORTAL_OPENAPI_URL` | ddbj-search-api の base / timeout / openapi.json 配置先 | `api-types.md` |
| `DB_PORTAL_KEYCLOAK_*` / `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` | Keycloak realm / client / session TTL | `auth.md` |
| `DB_PORTAL_LLM_*` | vLLM 接続先と挙動 (`BASE_URL` 空で AI 補助を hide)。BFF 用と GPU node serving 用に分かれる | `llm.md` |
| `DB_PORTAL_NEWS_*` | News mirror の clone 設定と cache 配置 | `news.md` |
| `DB_PORTAL_SERVICES_CACHE_DIR` | Services mirror の cache 配置 (clone 先は News の `DB_PORTAL_NEWS_REPOS_DIR` を再利用) | `services.md` |

`DB_PORTAL_FACET_CACHE_TTL_MS` (match_all facet の server cache TTL、未設定で既定 1 時間、`search.md`) は `server/lib/env.ts` の検証対象外で、`process.env` を直読みする optional 変数 (env ファイルにも常時は置かない)。

### Secret の扱い

- `.gitignore` は `.env` / `.env.*` を ignore し、`env.dev` / `env.staging` / `env.production` だけ allowlist (`!`) で commit する (`.env.production.local` 等の local secret は `.env.*` で ignore される)
- production の secret は `env.production` で `CHANGE_ME` プレースホルダとして commit され、実値は deploy 時に `.env.production.local` から merge して上書き (詳細は `deployment.md`)
- 開発者は staging key を使う、production key は触らない
- News mirror は git protocol HTTPS で動くため GitHub PAT は不要 (`news.md`)

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
| `app/` / `server/` の TS / TSX | dev は `tsx watch server/index.ts` (Vite を middleware mode で内包)。`app/**` / `server/**` の変更で `tsx watch` が server プロセスを再起動して反映する |
| `app/styles/tailwind.css` | Tailwind v4 plugin が即反映 |
| `app/lib/api/openapi-types.ts` | 手動で `gen:api-types` 再実行 |
| `app/content/**/*.content.tsx` | 起動時 eager validate のため、追加・削除は server 再起動 |
| `package.json` | `docker compose exec app npm install` で再 install |
| `Dockerfile` / `compose.yml` / `compose.dev.yml` | `docker compose down -v && docker compose up -d --build` |
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

`*.content.tsx` の `meta.lastUpdated` は **手書き** で ISO 8601 文字列を入れる。

- コンテンツの実質的な更新 (誤字修正以外) があったときに手で更新
- CI で commit timestamp と `lastUpdated` を比較し、差分が 30 日以上なら warning を出す lint を持つ (実装は CI 設計の別 SSOT)
- 完全自動化はしない (編集者の意図的更新を担保する)

## Debug 用 URL (dev サーバ起動後)

dev origin (`env.dev` の `DB_PORTAL_PORTAL_ORIGIN`) を起点に:

| Path | 期待 |
|---|---|
| `/` | トップページ (placeholder でも 200) |
| `/api/me` | 401 (Cookie なし) |
| `/api/news` | `[]` (空配列、News mirror 未稼働 / 初期化中) |
| `/api/llm/health` | `DB_PORTAL_LLM_BASE_URL` が空、または起動 5 秒前なら `{"status":"unset"}`、URL 設定後の health check 失敗で `{"status":"unreachable", ...}`、成功で `{"status":"ok", "model": ...}` (`llm.md`) |

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

Vite の HMR が外部 IP からの WebSocket 接続を許容できていない場合がある。`vite.config.ts` の `server.host` / `server.port` が `0.0.0.0:DB_PORTAL_APP_INTERNAL_PORT` を listen しているか確認する。`compose.yml` の port mapping が dev で `3000:3000` (両端同じ) であれば通常は問題ない。

### Lint で zones エラーが出る

`app/features/X` から `app/features/Y` を import している、または `app/lib` から `app/features` を import している可能性が高い。`architecture.md` の zones 表を再確認し、共通化が必要なら `lib` か `schemas` に降ろす。

### `gen:api-types` が失敗する

`DB_PORTAL_OPENAPI_URL` が container 内に届いていない可能性がある。上の「Container 内の env 検証」 と同じ要領で `docker compose exec app printenv DB_PORTAL_OPENAPI_URL` で確認する。Staging API が落ちている場合もある (`curl $DB_PORTAL_OPENAPI_URL` で疎通確認)。

### Keycloak とのログインがリダイレクトループする

`DB_PORTAL_PORTAL_ORIGIN` と Keycloak client の `Valid Redirect URIs` が一致していない可能性。`auth.md` の env 設定と Keycloak 管理コンソールの設定を突き合わせる。

## PR を出す前のチェック

CI (`.github/workflows/ci.yml`) は次の 4 つを Docker Compose 内で回す。PR を出す前にローカルでも同じコマンドを走らせて全 pass を確認する。

```bash
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test -- --run
docker compose exec app npm audit --audit-level=high --omit=dev
```

`npm audit` は production dependencies の high+ severity のみを対象にする。CI で fail する。

ローカル開発で news cache repo を最新化したいときは:

```bash
docker compose exec app npm run news:repos:sync
```

これで `DB_PORTAL_NEWS_REPOS_DIR` 配下 (compose / env のデフォルトでは `./cache/repos/{ddbj-www,dbcls-website}/`) を最新化する (present なら `git fetch` + `reset --hard`、absent なら shallow clone) (`news.md`)。

加えて、リリース直前 / 大きい変更時には以下も手元で確認する:

```bash
docker compose exec app npm run validate:content
docker compose exec app npm run build
docker compose exec app npm run check:last-updated
docker compose exec app npm run gen:api-types  # 差分があれば commit
docker compose exec app npm run test:e2e       # staging URL に対して
```

