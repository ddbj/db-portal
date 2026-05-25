# Deployment

production / staging への deploy 手順 SSOT。本書は **podman + podman-compose による NIG インフラ上の deploy** を **手動運用** で扱う。dev 環境の手順は `development.md` を参照。

## 1. 環境一覧

| 環境 | host | URL | 起動コマンド | image prefix |
|---|---|---|---|---|
| dev | localhost (Docker Compose) | `http://localhost:3000` | `npm run dev` (HMR) | `db-portal-dev` |
| staging | NIG (podman + podman-compose) | `https://portal-staging.ddbj.nig.ac.jp` | `npm start` (built SSR) | `db-portal-staging` |
| production | NIG (podman + podman-compose) | `https://portal.ddbj.nig.ac.jp` | `npm start` (built SSR) | `db-portal-prod` |

staging / production はどちらも NIG の podman ホスト上で動く。`compose.yml` を共通化し、podman 固有の差分は `compose.podman.yml` の override で吸収する。

## 2. リポジトリ前提

- staging deploy はリリースマネージャが手動で実施する (main 追従)
- production deploy は git tag (`v<MAJOR>.<MINOR>.<PATCH>` SemVer) を打ってから手動で実施する
- env ファイル (`env.staging` / `env.production`) は git 管理。実 secret は `CHANGE_ME` プレースホルダで commit
- 実 secret は `.env.<env>.local` を deploy 先 host に置いて上書き (詳細 §5)

## 3. 起動アーキテクチャ (production / staging 共通)

```
[Browser] HTTPS
   │
   ▼
[Reverse Proxy (NIG infra)]   ← TLS terminate / Host header / X-Forwarded-* 付与
   │
   ▼
[podman: ${DB_PORTAL_PREFIX}-app]
   │  port: 3100 (staging) / 3200 (production)
   │  internal: 3000
   │  command: npm start  =  validate:content + tsx server/index.ts
   │
   ├─ SSR: React Router v7 framework mode (build/server/index.js)
   └─ BFF: Express endpoints
       ├─ /api/me
       ├─ /api/auth/*
       ├─ /api/news
       ├─ /api/llm/*
       ├─ /api/search/serialize
       ├─ /sitemap.xml
       └─ /robots.txt
```

`server/index.ts` が production / dev の両方をハンドルする (`NODE_ENV` で分岐)。production では事前 build した `build/server/index.js` を `createRequestHandler` に渡し、`build/client/assets` を `immutable, max-age=1y` で静的配信する。

リバースプロキシ側 (NIG infra) は次を必ず付与する:

- `X-Forwarded-Proto: https`
- `X-Forwarded-Host: portal.ddbj.nig.ac.jp` (allow list に入る host のみ)
- `X-Forwarded-For: <client ip>`

Express の `trust proxy` は `loopback` を設定済 (`server/index.ts`)。許可しない上流からの `X-Forwarded-*` は無視される。

## 4. compose 設定

### 4.1 compose.yml (共通)

`compose.yml` 1 本で dev / staging / production を扱う。`${DB_PORTAL_PREFIX}` を `container_name` / `image` / `volume` / `network` 名に含めるので、同一ホスト上で 3 環境が並列に動いても衝突しない。

主要 service 定義 (詳細は `compose.yml`):

```yaml
services:
  app:
    container_name: ${DB_PORTAL_PREFIX}-app
    image: ${DB_PORTAL_PREFIX}-app
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${DB_PORTAL_APP_PORT}:${DB_PORTAL_APP_INTERNAL_PORT}"
    volumes:
      - .:/app:rw
      - app-node_modules:/app/node_modules:rw
      - news-cache:${DB_PORTAL_NEWS_CACHE_DIR:-/var/cache/db-portal/news}:rw
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - DB_PORTAL_*  # 全 env を明示宣言
    command: ${DB_PORTAL_APP_COMMAND}
```

### 4.2 compose.podman.yml (production / staging override)

NIG の podman 環境では rootless 運用のため override が必要:

```yaml
services:
  app:
    userns_mode: keep-id        # host UID と一致させ、mounted volume の所有権をそろえる
    security_opt:
      - label=disable           # SELinux label を無効化 (NIG ホストの設定に合わせる)
```

`podman-compose -f compose.yml -f compose.podman.yml up -d` の形で起動する。

### 4.3 環境ごとの差

| 変数 | staging | production |
|---|---|---|
| `DB_PORTAL_PREFIX` | `db-portal-staging` | `db-portal-prod` |
| `DB_PORTAL_ENV` | `staging` | `production` |
| `DB_PORTAL_APP_PORT` | 3100 | 3200 |
| `NODE_ENV` | `production` | `production` |
| `DB_PORTAL_LOG_LEVEL` | `info` | `warn` |
| `DB_PORTAL_PORTAL_ORIGIN` | `https://portal-staging.ddbj.nig.ac.jp` | `https://portal.ddbj.nig.ac.jp` |
| `DB_PORTAL_SEARCH_API_URL` | staging | production |
| `DB_PORTAL_OPENAPI_URL` | staging | production |
| `DB_PORTAL_KEYCLOAK_REALM_URL` | staging realm | production realm |
| `DB_PORTAL_KEYCLOAK_CLIENT_ID` | `db-portal-staging` | `db-portal` |
| `DB_PORTAL_LLM_API_KEY` | staging key | `CHANGE_ME` → 上書き |
| `DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` | staging PAT | `CHANGE_ME` → 上書き |
| `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` | 1800 | 1800 |

env 設計の上位方針は `env-policy.md`、dev / staging / production の env 値全体は `env.{dev,staging,production}` を直接参照。

## 5. Secret 管理

production の `env.production` は `CHANGE_ME` プレースホルダのまま commit する。実値は deploy 先 host で `.env.production.local` に書き、起動時に上書き (compose は `.env` を読むため、deploy script で `.env.production.local` を `.env` に merge する形)。

| Secret | 開発 | staging | production |
|---|---|---|---|
| `DB_PORTAL_LLM_API_KEY` | 空 (UI hide) | staging key | host 上 `.env.production.local` |
| `DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` | 空 | staging PAT | host 上 `.env.production.local` |

詳細な rotation 手順は `operations.md §5` を参照。

```bash
# production host
sudo umask 077
sudo tee /etc/db-portal/.env.production.local > /dev/null <<'EOF'
DB_PORTAL_LLM_API_KEY=<actual>
DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN=<actual>
EOF
```

deploy script はこれを git checkout 後のリポジトリ root に merge して `.env` を作る:

```bash
cat env.production /etc/db-portal/.env.production.local > .env
```

`.env.production.local` 自体は `.gitignore` の `.env.*.local` に含まれる。

## 6. CI 範囲

`.github/workflows/ci.yml` は PR / `main` への push で次の最小チェックを Docker Compose 内で回す:

- `npm run typecheck`
- `npm run lint`
- `npm test -- --run` (unit + PBT)

deploy / e2e / openapi 差分検知 / 性能計測は CI から自動実行しない。staging / production の deploy は本書 §7 / §8 の手動手順で行う。e2e は staging へ手動 trigger (`tests/e2e/notes.md §1`)、openapi 差分検知は本書 §6.2、`lastUpdated` の整合チェックは `npm run check:last-updated` をリリース前に手動で叩く。これらを CI 化する追加 workflow (staging-deploy / production-deploy / nightly / 性能ゲート) は採用しない方針。

### 6.1 health check で確認する endpoint

deploy 後 / 定期監視で叩く 3 endpoint:

- `GET /api/me` → 401 (cookie なしのため、ステータスコードが届けば server 起動済)
- `GET /api/news` → 200 (空配列も OK、server 起動済 + mirror 初回 fetch 中の可能性)
- `GET /api/llm/health` → 200 (`status` は `ok` / `unreachable` / `unset` のいずれか、staging / production では `ok` か `unreachable` を許容)

### 6.2 openapi.json 差分検知 (手動 / リリース直前)

production の `openapi.json` と portal が知っている型 (`app/lib/api/openapi-types.ts`) の差分は、リリース直前に手動で確認する:

```bash
cp env.production .env
docker compose down -v && docker compose up -d --build
docker compose exec app npm run gen:api-types
git diff --exit-code app/lib/api/openapi-types.ts
```

差分があれば該当 API 変更を portal 側に反映してから release tag を打つ。

## 7. 手動 deploy 手順

### 7.1 staging (main 追従)

```bash
ssh portal-staging.ddbj.nig.ac.jp
cd /opt/db-portal-staging

# 1. main の最新を取り込み
git fetch --prune origin
git checkout main
git reset --hard origin/main

# 2. .env を作成 (secret は host 上 .env.staging.local に置いておく)
cat env.staging /etc/db-portal/.env.staging.local > .env

# 3. 再 build + 起動
podman-compose -f compose.yml -f compose.podman.yml build app
podman-compose -f compose.yml -f compose.podman.yml up -d

# 4. health check (§6.1 の 3 endpoint)
curl -fs http://localhost:3100/api/me                  # 401 期待
curl -fs http://localhost:3100/api/news | head         # 200 (JSON array)
curl -fs http://localhost:3100/api/llm/health | head   # 200 (status field)
```

### 7.2 production (tag 指定)

```bash
# (ローカル) リリース tag を打つ
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

ssh portal.ddbj.nig.ac.jp
cd /opt/db-portal-prod

# 1. tag に checkout
git fetch --tags --prune origin
git checkout v1.2.3

# 2. .env を実 secret で組む
cat env.production /etc/db-portal/.env.production.local > .env

# 3. 再 build + 起動
podman-compose -f compose.yml -f compose.podman.yml build app
podman-compose -f compose.yml -f compose.podman.yml up -d

# 4. smoke test (§6.1 の 3 endpoint + /sitemap.xml /robots.txt)
curl -fs https://portal.ddbj.nig.ac.jp/api/me
curl -fs https://portal.ddbj.nig.ac.jp/api/news | head
curl -fs https://portal.ddbj.nig.ac.jp/api/llm/health
curl -fs https://portal.ddbj.nig.ac.jp/sitemap.xml | head -3
curl -fs https://portal.ddbj.nig.ac.jp/robots.txt
```

リバースプロキシ (NIG infra 側) で `portal.ddbj.nig.ac.jp` → `http://<host>:3200` を設定。HSTS は server 側でも返すが、リバースプロキシでも有効化することを推奨。

## 8. Rollback 手順

problem tag を踏んでしまった場合の前 tag への切り戻し:

```bash
ssh portal.ddbj.nig.ac.jp
cd /opt/db-portal-prod

# 1. 直前の安定 tag を確認
git tag --sort=-creatordate | head -5
# 例: v1.2.3 (problem)、v1.2.2 (stable) ← これに戻したい

# 2. 安定 tag に checkout し直す
git fetch --tags
git checkout v1.2.2

# 3. .env を作り直し (secret 持ち越し) + 再 build + 起動
cat env.production /etc/db-portal/.env.production.local > .env
podman-compose -f compose.yml -f compose.podman.yml build app
podman-compose -f compose.yml -f compose.podman.yml up -d

# 4. smoke test (§7.2 の 3 endpoint + sitemap / robots)
```

staging は main 追従なので、問題のある commit を `git revert` して main に push し、§7.1 を再度実行して戻す。host 上で直接 `git checkout <prev-commit>` で戻すこともできるが、main との差分が温存されるので **revert + push** を推奨。

### 8.1 schema migration / DB

session store は in-memory なので、deploy / rollback で消失する (ユーザは再ログイン)。News disk cache (`/var/cache/db-portal/news`) は schema バージョンを内部に持ち、起動時に互換チェックが入る (`news-policy.md`)。schema 互換性が壊れる変更は別 release note に明記する。

## 9. Health check

`server/index.ts` が以下を提供する。production / staging 両方で生存確認に使う:

| Endpoint | 期待 (起動成功時) | 用途 |
|---|---|---|
| `GET /api/me` | 401 (cookie なし) | server が listen しているか |
| `GET /api/news` | 200 JSON array (空可) | mirror 起動 + cache 応答 |
| `GET /api/llm/health` | 200 `{status: "ok" \| "unreachable" \| "unset"}` | vLLM 接続性 |

`/api/llm/health` の `status` フィールドの解釈は `llm.md §3.2`。production / staging では `unset` は出ない設計 (env に LLM URL が設定されているため)。

## 10. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md` | 起動アーキテクチャ / zones / CSP per-request nonce / sitemap / 404 |
| `auth.md` | BFF session / OIDC flow / Cookie 仕様 |
| `keycloak-setup.md` | Keycloak realm / client / redirect URI の production 設定手順 |
| `operations.md` | 監視 / log / トラブルシューティング / secret rotation |
| `development.md` | dev 環境のセットアップ / env 切替 / CI コマンドのローカル実行 |
| `news.md` | News mirror の disk cache / GitHub PAT |
| `llm.md` | vLLM endpoint / rate limit / SSE |
