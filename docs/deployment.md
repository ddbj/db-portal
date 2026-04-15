# デプロイガイド

staging / production 環境へのデプロイ手順、podman 運用の注意事項、環境変数一覧。

## 環境一覧

| 環境 | ドメイン | インフラ | ランタイム | ポート | Keycloak |
|---|---|---|---|---|---|
| dev | localhost:3000 | 開発サーバー | docker compose | 3000 | idp-staging.ddbj.nig.ac.jp |
| staging | portal-staging.ddbj.nig.ac.jp | 遺伝研スパコン (a012) | podman-compose | 3100 | idp-staging.ddbj.nig.ac.jp |
| production | portal.ddbj.nig.ac.jp | 遺伝研スパコン (a011) | podman-compose | 3100 | idp.ddbj.nig.ac.jp |

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
| `DB_PORTAL_SEARCH_API_URL` | `https://ddbj-staging.nig.ac.jp/search/api` | DDBJ Search API のエンドポイント。全環境でしばらく staging を向ける。本番 Search API（`https://ddbj.nig.ac.jp/search/api`）への切り替えは Search API 側の改修完了後に判断 |
