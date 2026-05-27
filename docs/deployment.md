# Deployment

production / staging への deploy 手順 + 運用 (監視・トラブルシュート・rotation) SSOT。本書は **podman + podman-compose による NIG インフラ上の deploy** を **手動運用** で扱う。dev 環境の手順は `development.md` を参照。

## 環境一覧

| 環境 | host | URL | 起動コマンド | image prefix |
|---|---|---|---|---|
| dev | localhost (Docker Compose) | `http://localhost:3000` | `npm run dev` (HMR) | `db-portal-dev` |
| staging | NIG (podman + podman-compose) | `https://portal-staging.ddbj.nig.ac.jp` | `npm start` (built SSR) | `db-portal-staging` |
| production | NIG (podman + podman-compose) | `https://portal.ddbj.nig.ac.jp` | `npm start` (built SSR) | `db-portal-prod` |

staging / production はどちらも NIG の podman ホスト上で動く。`compose.yml` を共通化し、podman 固有の差分は `compose.podman.yml` の override で吸収する。

## リポジトリ前提

- staging deploy はリリースマネージャが手動で実施する (main 追従)
- production deploy は git tag (`v<MAJOR>.<MINOR>.<PATCH>` SemVer) を打ってから手動で実施する
- env ファイル (`env.staging` / `env.production`) は git 管理。実 secret は `CHANGE_ME` プレースホルダで commit
- 実 secret は `.env.<env>.local` を deploy 先 host に置いて上書き (詳細)

## 起動アーキテクチャ (production / staging 共通)

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

## compose 設定

`compose.yml` 1 本で dev / staging / production を扱う。`${DB_PORTAL_PREFIX}` を `container_name` / `image` / `volume` / `network` 名に含めるので、同一ホスト上で 3 環境が並列に動いても衝突しない。実体は repo の `compose.yml` を直接参照。

主要構成:

| 項目 | 値 |
|---|---|
| service | `app` 1 つ |
| container_name | `${DB_PORTAL_PREFIX}-app` |
| port | host `${DB_PORTAL_APP_PORT}` → container `${DB_PORTAL_APP_INTERNAL_PORT}` |
| volume | source mount (`.:/app:rw`) + named `node_modules` + named `news-cache` (`${DB_PORTAL_NEWS_CACHE_DIR}`) |
| environment | `DB_PORTAL_*` 群 + `NODE_ENV` |
| command | `${DB_PORTAL_APP_COMMAND}` |

NIG の podman 環境では rootless 運用のため `compose.podman.yml` で override:

| override 設定 | 値 | 意図 |
|---|---|---|
| `userns_mode` | `keep-id` | host UID と一致させ mounted volume の所有権を揃える |
| `security_opt` | `label=disable` | SELinux label を無効化 (NIG ホストの設定に合わせる) |

`podman-compose -f compose.yml -f compose.podman.yml up -d` の形で起動する。

### 環境ごとの差

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
| `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` | 1800 | 1800 |

dev / staging / production の env 値全体は `env.{dev,staging,production}` を直接参照。env 設計の根拠は `decisions.md`。

## Secret 管理

production の `env.production` は `CHANGE_ME` プレースホルダのまま commit する。実値は deploy 先 host で `.env.production.local` に書き、起動時に上書き (compose は `.env` を読むため、deploy script で `.env.production.local` を `.env` に merge する形)。

| Secret | 開発 | staging | production |
|---|---|---|---|
| `DB_PORTAL_LLM_API_KEY` | 空 (UI hide) | staging key | host 上 `.env.production.local` |

News mirror は git protocol HTTPS で動くため GitHub PAT は不要 (`decisions.md`)。詳細な rotation 手順は下方「Secret rotation」 を参照。

```bash
# production host
sudo umask 077
sudo tee /etc/db-portal/.env.production.local > /dev/null <<'EOF'
DB_PORTAL_LLM_API_KEY=<actual>
EOF
```

deploy script はこれを git checkout 後のリポジトリ root に merge して `.env` を作る:

```bash
cat env.production /etc/db-portal/.env.production.local > .env
```

`.env.production.local` 自体は `.gitignore` の `.env.*.local` に含まれる。

## CI 範囲

`.github/workflows/ci.yml` は PR / `main` への push で次の最小チェックを Docker Compose 内で回す:

- `npm run typecheck`
- `npm run lint`
- `npm test -- --run` (unit + PBT)

deploy / e2e / openapi 差分検知 / 性能計測は CI から自動実行しない。staging / production の deploy は本書 / の手動手順で行う。e2e は staging へ手動 trigger (`tests/e2e/notes.md`)、openapi 差分検知は本書、`lastUpdated` の整合チェックは `npm run check:last-updated` をリリース前に手動で叩く。これらを CI 化する追加 workflow (staging-deploy / production-deploy / nightly / 性能ゲート) は採用しない方針。

### openapi.json 差分検知 (手動 / リリース直前)

production の `openapi.json` と portal が知っている型 (`app/lib/api/openapi-types.ts`) の差分は、リリース直前に手動で確認する:

```bash
cp env.production .env
docker compose down -v && docker compose up -d --build
docker compose exec app npm run gen:api-types
git diff --exit-code app/lib/api/openapi-types.ts
```

差分があれば該当 API 変更を portal 側に反映してから release tag を打つ。

## 手動 deploy 手順

### staging (main 追従)

```bash
ssh portal-staging.ddbj.nig.ac.jp
cd /opt/db-portal-staging

# main の最新を取り込み
git fetch --prune origin
git checkout main
git reset --hard origin/main

# .env を作成 (secret は host 上 .env.staging.local に置いておく)
cat env.staging /etc/db-portal/.env.staging.local > .env

# 再 build + 起動
podman-compose -f compose.yml -f compose.podman.yml build app
podman-compose -f compose.yml -f compose.podman.yml up -d

# health check (3 endpoint)
curl -fs http://localhost:3100/api/me                  # 401 期待
curl -fs http://localhost:3100/api/news | head         # 200 (JSON array)
curl -fs http://localhost:3100/api/llm/health | head   # 200 (status field)
```

### production (tag 指定)

```bash
# (ローカル) リリース tag を打つ
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

ssh portal.ddbj.nig.ac.jp
cd /opt/db-portal-prod

# tag に checkout
git fetch --tags --prune origin
git checkout v1.2.3

# .env を実 secret で組む
cat env.production /etc/db-portal/.env.production.local > .env

# 再 build + 起動
podman-compose -f compose.yml -f compose.podman.yml build app
podman-compose -f compose.yml -f compose.podman.yml up -d

# smoke test (3 endpoint + /sitemap.xml /robots.txt)
curl -fs https://portal.ddbj.nig.ac.jp/api/me
curl -fs https://portal.ddbj.nig.ac.jp/api/news | head
curl -fs https://portal.ddbj.nig.ac.jp/api/llm/health
curl -fs https://portal.ddbj.nig.ac.jp/sitemap.xml | head -3
curl -fs https://portal.ddbj.nig.ac.jp/robots.txt
```

リバースプロキシ (NIG infra 側) で `portal.ddbj.nig.ac.jp` → `http://<host>:3200` を設定。HSTS は server 側でも返すが、リバースプロキシでも有効化することを推奨。

## Rollback 手順

problem tag を踏んでしまった場合の前 tag への切り戻し:

```bash
ssh portal.ddbj.nig.ac.jp
cd /opt/db-portal-prod

# 直前の安定 tag を確認
git tag --sort=-creatordate | head -5
# 例: v1.2.3 (problem)、v1.2.2 (stable) ← これに戻したい

# 安定 tag に checkout し直す
git fetch --tags
git checkout v1.2.2

# .env を作り直し (secret 持ち越し) + 再 build + 起動
cat env.production /etc/db-portal/.env.production.local > .env
podman-compose -f compose.yml -f compose.podman.yml build app
podman-compose -f compose.yml -f compose.podman.yml up -d

# smoke test (3 endpoint + sitemap / robots)
```

staging は main 追従なので、問題のある commit を `git revert` して main に push し、 を再度実行して戻す。host 上で直接 `git checkout <prev-commit>` で戻すこともできるが、main との差分が温存されるので **revert + push** を推奨。

### schema migration / DB

session store は in-memory なので、deploy / rollback で消失する (ユーザは再ログイン)。News disk cache (`/var/cache/db-portal/news`) は schema バージョンを内部に持ち、起動時に互換チェックが入る (`news.md`)。schema 互換性が壊れる変更は別 release note に明記する。

## 監視

### Log

`server/lib/log.ts` の logger は **stdout に構造化 JSON** を流す。各レコードは次のフィールドを持つ:

| Field | 型 | 説明 |
|---|---|---|
| `time` | string (ISO8601) | log 時刻 |
| `level` | `"debug" \| "info" \| "warn" \| "error"` | severity |
| `event` | string | snake_case event name (例 `server_listening` / `news_mirror_failed`) |
| `...` | 任意 | event 固有の payload (redact 済) |

production の log level は `warn` (`env.production`)、staging は `info`、dev は `debug`。`DB_PORTAL_LOG_LEVEL` で上書き可能。

container の log は podman / docker の standard log 経路で取れる:

```bash
# staging
podman logs -f db-portal-staging-app

# production
podman logs -f db-portal-prod-app
```

### 主要 event 一覧

| Event | level | 意味 | 対応 |
|---|---|---|---|
| `server_listening` | info | server 起動完了 | 正常 |
| `news_mirror_initial_load` | info | disk cache から item を初期 load | 正常 |
| `news_mirror_fetched` | info | GitHub API から item 取得成功 | 正常 |
| `news_mirror_failed` | warn | GitHub API 取得失敗 (rate limit / network) | 「トラブルシューティング」 |
| `llm_health_changed` | info | vLLM 接続状態が遷移 (`ok` ↔ `unreachable` 等) | 状態は `/api/llm/health` で確認 |
| `llm_health_check_failed` | warn | health 取得自体が timeout / 5xx | 「トラブルシューティング」 |
| `llm_rate_limited` | info | per-IP / per-session rate limit 発火 | 「トラブルシューティング」 |
| `oidc_callback_failed` | warn | state 不一致 / token 交換失敗 | 「トラブルシューティング」 |
| `auth_session_refresh_failed` | warn | Keycloak refresh が拒否 | 「トラブルシューティング」 |
| `request_failed` | error | unhandled exception (5xx) | log の stack を見る |

`accessToken` / `refreshToken` / `cookie` / `authorization` の各フィールドは `[REDACTED]` に置換されて log に出る (`auth.md`)。session entry を丸ごと log に出すケースは作らない。

### Health endpoint

`server/index.ts` が以下を提供する。production / staging 両方で生存確認 / 外部監視に使う:

| Endpoint | 期待 (起動成功時) | 監視で見るもの |
|---|---|---|
| `GET /api/me` | 401 (cookie なし) | server が listen しているか |
| `GET /api/news` | 200 JSON array (空可) | mirror 起動 + cache 応答 |
| `GET /api/llm/health` | 200 `{status: "ok" \| "unreachable" \| "unset"}` | vLLM 接続性 |

外部監視ツール (NIG infra 側の uptime monitor 等) はこの 3 endpoint を 1 分間隔で叩き、連続失敗で alert を出す構成にする。`/api/llm/health` の `status` フィールドの解釈は `llm.md`。production / staging では `unset` は出ない設計 (env に LLM URL が設定されているため)。

## 起動シーケンス

`npm start` (= `validate:content` + `tsx server/index.ts`) で起動。次の順で初期化する:

1. `validate:content`: `app/content/databases/**/*.content.tsx` + `app/content/services/**/*.content.tsx` を Zod parse。1 件でも fail すると **exit 1** で起動失敗 (build / runtime 両方で fail-fast)
2. `server/lib/env.ts` の `parseServerEnv` で env を Zod 検証。必須 env (`DB_PORTAL_PORTAL_ORIGIN` / `DB_PORTAL_KEYCLOAK_REALM_URL` 等) が無いと exit
3. Express server を listen (`server_listening` log)
4. News mirror が起動 (`startMirror`): **5 秒後に初回 fetch**、以降 `DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS` 間隔で polling (`news.md`)
5. LLM health monitor が起動: 起動直後に 1 回 health check、以降 5 分間隔で polling (`llm.md`)

起動からの最初の 5 秒は `/api/news` が空配列を返すことがある (mirror 未起動)。これは 200 で返るので外形監視は通る。

## トラブルシューティング

### News mirror が動かない

#### 症状

- `/api/news` が空配列を返し続ける
- log に `news_mirror_failed` が頻発

#### 切り分け

```bash
# GitHub API rate limit を確認
curl -fs -H "Authorization: Bearer $TOKEN" https://api.github.com/rate_limit

# disk cache の状態を確認
podman exec db-portal-prod-app ls -la /var/cache/db-portal/news/
# news.json が存在し、schema_version フィールドを持つこと

# mirror polling interval を確認
podman exec db-portal-prod-app env | grep DB_PORTAL_NEWS_MIRROR
```

#### 対応

| 原因 | 対応 |
|---|---|
| `git clone` / `git fetch` のネットワーク失敗 | host から `git ls-remote <repo url>` で疎通確認、 GitHub status 確認 |
| repo URL / branch が誤設定 | `DB_PORTAL_NEWS_DDBJ_REPO_URL` / `DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH` (および dbcls 側) を `.env` で確認、 修正後 `restartMirror` か container 再起動 |
| disk cache 破損 (Zod schema mismatch) | `news.json` を `mv news.json news.json.bak` して renaming、 server 再起動 (再構築) |
| repo の force-push で history が壊れた | `repos/<src>/` を `rm -rf` して container 再起動 (clone からやり直し) |

詳細な mirror 挙動は `news.md`。News mirror は git protocol HTTPS で動くため GitHub PAT は不要 (`decisions.md`)。

### vLLM が unreachable

#### 症状

- `/api/llm/health` が `{status: "unreachable", reason: ...}` を返す
- search assistant が UI に表示されない (`hidden`)

#### 切り分け

```bash
# vLLM endpoint への疎通
podman exec db-portal-prod-app curl -fs http://l40s-03:3200/v1/models

# log で health 推移を確認
podman logs db-portal-prod-app | grep llm_health
```

#### 対応

| 原因 | 対応 |
|---|---|
| vLLM プロセス停止 | NIG GPU host 上で vLLM サービス再起動 (NIG 担当に連絡) |
| network 障害 (`l40s-03` 到達不可) | NIG infra 障害を確認 |
| timeout (`DB_PORTAL_LLM_TIMEOUT_MS` 不足) | env 上書きで増やす |
| `DB_PORTAL_LLM_BASE_URL` 空 | env を見直す (production / staging では空にしない) |

復旧後、health monitor が次の 5 分間隔で `ok` 検知 → `llm_health_changed` log を吐く → UI 側で次の health 取得で再表示。

### LLM rate limit が誤発火

#### 症状

- ユーザから「アシスタント生成が `429` を返す」 報告
- log に `llm_rate_limited` 多発

#### 切り分け

```bash
# 現在の rate limit env を確認
podman exec db-portal-prod-app env | grep DB_PORTAL_LLM_RATE_LIMIT
```

#### 対応

`DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` (default 60) / `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` (default 30) を env に追加して上書き。共有 NAT 環境 (大学・研究所) からのアクセスは per-IP の上限に集中するので、必要なら per-IP を 120-300 程度まで緩める。緩める前後で log の `llm_rate_limited` 頻度を比較する。

### 認証関連エラー

#### state 不一致 (`oidc_callback_failed: invalid_state`)

- 想定: 攻撃者が偽 callback URL を踏ませようとした (`auth.md`) / ユーザが古い browser tab で callback に到達
- 対応: ユーザに最新 tab でリトライ依頼。多発する場合は Keycloak 側で redirect URI 設定変更がないか確認 (`auth.md`)

#### token refresh 失敗 (`auth_session_refresh_failed`)

- 想定: Keycloak 側 SSO session が idle / max を超えた、portal 再起動で session 消失
- 対応: 自動的に session が破棄され 401 が返る。UI 側は再ログイン promote される。多発する場合は Keycloak `Client Session Max` (12h、`auth.md`) が短すぎないか確認

#### login が redirect ループする

- 想定: `DB_PORTAL_PORTAL_ORIGIN` と Keycloak `Valid Redirect URIs` が不一致 (`auth.md`)
- 対応: `.env` の `DB_PORTAL_PORTAL_ORIGIN` と Keycloak 管理画面の URI を突き合わせる。production は完全一致でないと拒否

### session が頻繁に切れる

session TTL は default 30 分 (sliding)。操作のたびに延長されるが、ブラウザを 30 分以上放置すると expire する。これは仕様 (`auth.md`)。

- 「思ったより早く切れる」: `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` env で延長 (例 7200 = 2h)。ただし XSS / 物理セキュリティとのバランスで設計値は 30 分にしてある。延長する場合は Keycloak の `Client Session Idle` (default 30 分、`auth.md`) も同時に揃えること (短い方で実効 TTL が決まるため)
- 「すべての user が同時に切れた」: server が再起動したため (in-memory session、永続化なし)。deploy timing と log の `server_listening` 時刻を突合

multi-instance / redis 化はリリース時点未対応。拡張時の env は `DB_PORTAL_SESSION_STORE=memory|redis` を想定 (`auth.md`)。

### disk cache 容量

`/var/cache/db-portal/news/` 配下は単一 `news.json` (数 MB 程度) のみ。単調に増えることはない。容量問題が出るとすれば schema 変更で `news.json.bak` が累積するケース (「News mirror が動かない」 の手順で生成)、定期的に bak ファイルを削除する。

### CSP 違反 (browser console に CSP error)

production で CSP `Content-Security-Policy` が違反 report を上げる場合:

- 新規導入した 3rd-party script (CDN font 等) が CSP ホワイトリストに無い
  - portal は Noto Sans JP を self-host (`@fontsource-variable/noto-sans-jp`)、外部 CDN は使わない。外部 script を追加していないか確認
- inline `<script>` / `<style>` に nonce が付いていない (RR が hydration script に nonce を載せ忘れ)
  - root.tsx の `<Scripts nonce={nonce} />` の渡し方を確認

CSP 仕様の詳細は `architecture.md` を参照。

## Secret rotation

「Secret 管理」 は build / deploy 時の env 設計、本節は incident 時 / 定期的な secret 交換手順。

### rotation 対象

| Secret | 保管場所 | rotation 頻度 |
|---|---|---|
| `DB_PORTAL_LLM_API_KEY` | host `.env.production.local` | vLLM 側 key 更新時 |
| Keycloak client secret | (なし、public client) | -- |
| `DB_PORTAL_E2E_USER_PASSWORD` | リリースマネージャの作業環境 (env / password manager) | 半年毎 / incident 時 |
| Deploy host への SSH 鍵 | 各リリースマネージャの `~/.ssh/` | 半年毎 / incident 時 |

Keycloak `db-portal` は public client (`auth.md`) のため client secret は存在しない。PKCE で代替している。News mirror は git protocol HTTPS で動くため GitHub PAT は不要 (`decisions.md`)。

### vLLM API key

1. NIG 担当から新 API key を取得
2. host 上で `.env.production.local` の `DB_PORTAL_LLM_API_KEY` を更新
3. 上方の「Secret 管理」 の `.env` 生成手順を実行して container を `--force-recreate app` で再起動
4. log で `llm_health_changed: ok` を確認

### e2e テストユーザー password

1. Keycloak 管理コンソール `https://idp-staging.ddbj.nig.ac.jp` (staging realm) で `ts-db-portal-dev` ユーザーの password を更新
2. リリースマネージャの作業環境 (password manager / `.env` 等) で `DB_PORTAL_E2E_USER_PASSWORD` を新値に更新
3. 次の手動 e2e 実行 (`npm run test:e2e`) で auth 系シナリオ (`S-AUTH-02` 等) が pass することを確認

### Deploy host への SSH 鍵

1. リリースマネージャの開発環境で新 ssh key を発行 (`ssh-keygen -t ed25519`)
2. host (`portal-staging.ddbj.nig.ac.jp` / `portal.ddbj.nig.ac.jp`) の `~/.ssh/authorized_keys` から旧 key を削除、新 public key を追加
3. 次の手動 deploy (上方「手動 deploy 手順」) で接続成功を確認

## 定期メンテナンス

| 周期 | 作業 |
|---|---|
| 週次 | log で `*_failed` event を集計、上位を確認 |
| 月次 | News disk cache のサイズ確認、bak ファイル整理 |
| 半年毎 | Deploy host への SSH 鍵 rotation、e2e user password rotation |
| リリース毎 | release announcement 公開、`gen:api-types` の production URL 差分確認 (上方「openapi.json 差分検知」) |

## リリース後評価項目

リリース後にフィードバックを集めて次フェーズで再評価:

- LLM rate limit (共有 NAT 環境での誤発火頻度) → 「トラブルシューティング」 で env 緩和の判断材料
- Sentry / 外部監視 SaaS 導入の要否 (リリース時点は self-host 構造化 log のみ)
- multi-instance 化 / redis session 化 (リリース時点は 1 instance 想定)
- axe-core e2e 統合 (リリース時点は手動 a11y review のみ)

