# デプロイガイド

staging / production 環境へのデプロイ手順、podman 運用の注意事項、環境変数一覧。

## 環境一覧

| 環境 | ドメイン | インフラ | ランタイム | ポート | Keycloak |
|---|---|---|---|---|---|
| dev | localhost:3000 | 開発サーバー | docker compose | 3000 | idp-staging.ddbj.nig.ac.jp |
| staging | portal-staging.ddbj.nig.ac.jp | 遺伝研スパコン (a012) | podman-compose | 3100 | idp-staging.ddbj.nig.ac.jp |
| production | portal.ddbj.nig.ac.jp | 遺伝研スパコン (a011) | podman-compose | 3100 | idp.ddbj.nig.ac.jp |
| LLM (shared) | (内部 LAN のみ) | 遺伝研 GPU node (nig-gpu-2 / l40s-03) | podman-compose | 3200 | - |

### 接続情報

| 環境 | SSH | デプロイパス |
|---|---|---|
| staging | `ssh nig-a012-search` | `~/db-portal-staging` |
| production | `ssh nig-a011-search` | `~/db-portal-prod` |
| LLM (GPU node) | `ssh nig-gpu-2` | `~/db-portal-staging` (a012 と Lustre 共有、`llm/` で podman-compose) |

上流の Nginx（リバースプロキシ）は DDBJ インフラ側で管理する（[ddbj/service-gateway-conf](https://github.com/ddbj/service-gateway-conf)）。本リポジトリには含めない。

## デプロイ手順（staging / production）

### 1. 環境変数の設定

```bash
# staging
cp env.staging .env

# production
cp env.production .env
```

### 2. ビルドと起動

```bash
podman-compose up -d --build
podman-compose exec app npm install
podman-compose exec app npm run build
podman-compose exec app npm run start
```

### 3. 動作確認

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3100
```

## podman の注意事項

### userns_mode: keep-id

`compose.podman.yml` に `userns_mode: keep-id` を設定している。これにより podman の rootless モードでホストの UID をコンテナ内にマッピングし、bind mount のパーミッション問題を回避する。

staging / production の env ファイルでは `COMPOSE_FILE=compose.yml:compose.podman.yml` として自動的にマージされる。Docker 環境（dev）では `compose.yml` のみを使用する。

### node_modules

node_modules は named volume (`node_modules:/app/node_modules:rw`) で管理している。bind mount のソースツリーとは分離されるため、ホスト・コンテナ間のパーミッション問題を回避できる。

volume が壊れた場合:

```bash
podman-compose down -v
podman-compose up -d --build
podman-compose exec app npm install
```

## 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `DB_PORTAL_ENV` | `dev` | 環境識別子（コンテナ名に使用） |
| `TZ` | `Asia/Tokyo` | タイムゾーン |
| `APP_COMMAND` | `sleep infinity` | コンテナ起動コマンド |
| `APP_PORT` | `3000` | ホスト側ポート |
| `APP_INTERNAL_PORT` | `3000` | コンテナ内ポート（`PORT` として渡される） |
| `KEYCLOAK_REALM_URL` | - | Keycloak の realm URL |
| `KEYCLOAK_CLIENT_ID` | - | OIDC クライアント ID |
| `DB_PORTAL_SEARCH_API_URL` | - | DDBJ Search API のエンドポイント。dev / staging は `https://ddbj-staging.nig.ac.jp/search/api`、production は `https://ddbj.nig.ac.jp/search/api` |
| `VITE_PORTAL_ORIGIN` | - | canonical URL / OGP URL の origin。dev は `http://localhost:3000`、staging は `https://portal-staging.ddbj.nig.ac.jp`、production は `https://portal.ddbj.nig.ac.jp`。`import.meta.env` 経由で SSR / CSR 両方から参照。production ビルドで未設定の場合はビルド時に throw（`src/lib/portal-origin.ts`） |
| `GITHUB_TOKEN` | -（optional） | ニュースミラー機構が使う GitHub API 認証 PAT。未設定でも動作するが、未認証 60req/h の rate limit を緩和したい場合に推奨（ddbj/www / dbcls/website 両 source 共通） |
| `NEWS_SYNC_INTERVAL_MS` | `600000` | ニュースミラー同期間隔（ms）。デフォルトは ddbj/www の本番反映と同じ 10 分（全 source 共通） |
| `NEWS_CACHE_DIR` | `./data` | ニュースキャッシュ JSON の保存先（`news-cache.json`）。書き込み可能であること |
| `NEWS_DISABLE` | -（optional） | `1` を指定するとミラー worker 起動を抑止。test / CI / 緊急停止時に使う |
| `NEWS_MIRROR_BRANCH` | `main` | ddbj/www の取得元ブランチ |
| `NEWS_MIRROR_MAX_FILES_PER_LANG` | `400` | 各 source の ja / en それぞれで最新何件までを portal でミラーするか |
| `NEWS_MIRROR_DBCLS_ENABLED` | `1` | `0` を指定すると dbcls/website ソースを無効化（ddbj/www のみミラー） |
| `NEWS_MIRROR_DBCLS_BRANCH` | `master` | dbcls/website の取得元ブランチ |
| `NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG` | `NEWS_MIRROR_MAX_FILES_PER_LANG` の値 | dbcls 専用の上限。未設定なら `NEWS_MIRROR_MAX_FILES_PER_LANG` を流用 |

## LLM サービングサーバー (GPU node)

検索・登録補助用の vLLM を GPU node (nig-gpu-2 / l40s-03) で常時起動し、staging / production の portal app から内部 LAN 経由で共有する構成。

詳細は [`docs/llm.md`](./llm.md) を SSOT として参照（デプロイ構成・環境変数・運用手順）。GPU node のオペレータ向け最小手順は [`llm/README.md`](../llm/README.md)、設計議論の記録は `.claude/docs/llm-integration-plan.md`。
