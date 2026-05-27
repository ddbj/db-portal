# Deployment

production / staging への deploy を **podman + podman-compose による NIG インフラ上の手動運用** で扱う。本書は **運用の構造** (環境構成 / 起動アーキ / health endpoint / log event / トラブルシュート軸) のみを扱い、具体的な host / path / port / env 値 / Keycloak 設定値 / deploy script は git 管理外に持つ。

## 環境構成

| 環境 | 役割 | 起動 |
|---|---|---|
| dev | localhost (Docker Compose) | `npm run dev` (HMR) |
| staging | NIG (podman + podman-compose)、main 追従 | `npm start` (built SSR) |
| production | NIG (podman + podman-compose)、tag 指定 | `npm start` (built SSR) |

`compose.yml` 1 本で dev / staging / production を扱い、`${DB_PORTAL_PREFIX}` を `container_name` / `image` / `volume` / `network` 名に含めることで、同一ホスト上で 3 環境を衝突なく並列に動かせる。podman 固有の差分は `compose.podman.yml` の override で吸収する (rootless 対応の `userns_mode` / `security_opt`)。

env ファイル (`env.dev` / `env.staging` / `env.production`) は git 管理。production 側の secret は `CHANGE_ME` プレースホルダで commit し、実値は deploy 先 host 上の `.env.<env>.local` を起動時に `.env` に merge して上書きする (`.gitignore` の `.env.*.local` で実値は git に出ない)。

## 起動アーキ (production / staging 共通)

```
[Browser] HTTPS
   │
   ▼
[Reverse Proxy (NIG infra)]   ← TLS terminate / X-Forwarded-* 付与
   │
   ▼
[podman: ${DB_PORTAL_PREFIX}-app]
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

リバースプロキシ側 (NIG infra) は `X-Forwarded-Proto` / `X-Forwarded-Host` / `X-Forwarded-For` を付与する。Express の `trust proxy` は `loopback` を設定済 (`server/index.ts`)。許可しない上流からの `X-Forwarded-*` は無視される。

## リリースフロー

- staging deploy はリリースマネージャが手動で実施する (main 追従)
- production deploy は git tag (`v<MAJOR>.<MINOR>.<PATCH>` SemVer) を打ってから手動で実施する
- session store は in-memory なので、deploy / rollback で消失する (ユーザは再ログイン)
- News disk cache は schema バージョンを内部に持ち、起動時に互換チェックが入る (`news.md`)。schema 互換性が壊れる変更は別 release note に明記する
- Rollback は前安定 tag への checkout で行う。staging は main 追従なので、問題のある commit を `git revert` して main に push し直す方が安全 (host 上で `git checkout <prev-commit>` だと main との差分が温存される)

## CI 範囲

`.github/workflows/ci.yml` は PR / `main` への push で次の最小チェックを Docker Compose 内で回す:

- `npm run typecheck`
- `npm run lint`
- `npm test -- --run` (unit + PBT)

deploy / e2e / openapi 差分検知 / 性能計測は CI から自動実行しない。e2e は staging へ手動 trigger (`tests/e2e/notes.md`)、openapi 差分検知はリリース直前に手動で叩く、`lastUpdated` の整合チェックは `npm run check:last-updated` をリリース前に手動で叩く。

### openapi.json 差分検知 (手動 / リリース直前)

production の `openapi.json` と portal が知っている型 (`app/lib/api/openapi-types.ts`) の差分は、リリース直前に production env で `npm run gen:api-types` を再実行して手動で確認する。差分があれば該当 API 変更を portal 側に反映してから release tag を打つ。

## 起動シーケンス

`npm start` (= `validate:content` + `tsx server/index.ts`) で起動。次の順で初期化する:

1. `validate:content`: `app/content/databases/**/*.content.tsx` + `app/content/services/**/*.content.tsx` を Zod parse。1 件でも fail すると **exit 1** で起動失敗 (build / runtime 両方で fail-fast)
2. `server/lib/env.ts` の `parseServerEnv` で env を Zod 検証。必須 env が無いと exit
3. Express server を listen (`server_listening` log)
4. News mirror が起動 (`startMirror`): **5 秒後に初回 fetch**、以降 `DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS` 間隔で polling (`news.md`)
5. LLM health monitor が起動: 起動直後に 1 回 health check、以降 5 分間隔で polling (`llm.md`)

起動からの最初の 5 秒は `/api/news` が空配列を返すことがある (mirror 未起動)。これは 200 で返るので外形監視は通る。

## 監視

### Log

`server/lib/log.ts` の logger は **stdout に構造化 JSON** を流す。各レコードは次のフィールドを持つ:

| Field | 型 | 説明 |
|---|---|---|
| `time` | string (ISO8601) | log 時刻 |
| `level` | `"debug" \| "info" \| "warn" \| "error"` | severity |
| `event` | string | snake_case event name (例 `server_listening` / `news_mirror_failed`) |
| `...` | 任意 | event 固有の payload (redact 済) |

log level は環境ごとに切替可能 (`DB_PORTAL_LOG_LEVEL`)。

### 主要 event 一覧

| Event | level | 意味 |
|---|---|---|
| `server_listening` | info | server 起動完了 |
| `news_mirror_initial_load` | info | disk cache から item を初期 load |
| `news_mirror_fetched` | info | GitHub API から item 取得成功 |
| `news_mirror_failed` | warn | GitHub API 取得失敗 (rate limit / network) |
| `llm_health_changed` | info | vLLM 接続状態が遷移 (`ok` ↔ `unreachable` 等) |
| `llm_health_check_failed` | warn | health 取得自体が timeout / 5xx |
| `llm_rate_limited` | info | per-IP / per-session rate limit 発火 |
| `oidc_callback_failed` | warn | state 不一致 / token 交換失敗 |
| `auth_session_refresh_failed` | warn | Keycloak refresh が拒否 |
| `request_failed` | error | unhandled exception (5xx) |

`accessToken` / `refreshToken` / `cookie` / `authorization` の各フィールドは `[REDACTED]` に置換されて log に出る (`auth.md`)。session entry を丸ごと log に出すケースは作らない。

### Health endpoint

`server/index.ts` が以下を提供する。production / staging 両方で生存確認 / 外部監視に使う:

| Endpoint | 期待 (起動成功時) | 監視で見るもの |
|---|---|---|
| `GET /api/me` | 401 (cookie なし) | server が listen しているか |
| `GET /api/news` | 200 JSON array (空可) | mirror 起動 + cache 応答 |
| `GET /api/llm/health` | 200 `{status: "ok" \| "unreachable" \| "unset"}` | vLLM 接続性 |

外部監視ツール (NIG infra 側の uptime monitor 等) はこの 3 endpoint を 1 分間隔で叩き、連続失敗で alert を出す構成にする。`/api/llm/health` の `status` フィールドの解釈は `llm.md`。

## トラブルシューティング

各症状の **切り分け軸** と **原因 → 対応** の対応関係を扱う。具体的な podman コマンド / host 上の手順は git 管理外の運用メモを参照。

### News mirror が動かない

症状: `/api/news` が空配列を返し続ける、log に `news_mirror_failed` が頻発。

切り分け: GitHub への git 疎通、disk cache (`news.json`) の存在と `schema_version`、mirror polling interval の env。

原因の典型:

| 原因 | 対応軸 |
|---|---|
| network 失敗 (`git clone` / `git fetch` に到達できない) | host から直接 `git ls-remote` で疎通 |
| repo URL / branch が誤設定 | `DB_PORTAL_NEWS_DDBJ_REPO_URL` / `DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH` (および dbcls 側) を確認 |
| disk cache 破損 (Zod schema mismatch) | cache file を rename して server 再起動 (再構築) |
| repo の force-push で history が壊れた | `repos/<src>/` を消して container 再起動 (clone からやり直し) |

詳細な mirror 挙動は `news.md`。

### vLLM が unreachable

症状: `/api/llm/health` が `{status: "unreachable", reason: ...}` を返す、search assistant が UI に表示されない。

切り分け: vLLM endpoint への疎通 (`/v1/models`)、log の `llm_health` 推移。

| 原因 | 対応軸 |
|---|---|
| vLLM プロセス停止 | NIG GPU host 上で vLLM サービス再起動 (NIG 担当に連絡) |
| network 障害 | NIG infra 障害を確認 |
| timeout (`DB_PORTAL_LLM_TIMEOUT_MS` 不足) | env 上書きで増やす |
| `DB_PORTAL_LLM_BASE_URL` 空 | env を見直す (production / staging では空にしない) |

復旧後、health monitor が次の 5 分間隔で `ok` 検知 → `llm_health_changed` log を吐く → UI 側で次の health 取得で再表示。

### LLM rate limit が誤発火

症状: 「アシスタント生成が `429` を返す」、log に `llm_rate_limited` 多発。

`DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` (default 60) / `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` (default 30) を env に追加して上書きする。共有 NAT 環境 (大学・研究所) からのアクセスは per-IP の上限に集中するので、必要なら per-IP を 120-300 程度まで緩める。緩める前後で log の `llm_rate_limited` 頻度を比較する。

### 認証関連エラー

#### state 不一致 (`oidc_callback_failed: invalid_state`)

- 想定: 攻撃者が偽 callback URL を踏ませようとした (`auth.md`) / ユーザが古い browser tab で callback に到達
- 対応: ユーザに最新 tab でリトライ依頼。多発する場合は Keycloak 側で redirect URI 設定変更がないか確認

#### token refresh 失敗 (`auth_session_refresh_failed`)

- 想定: Keycloak 側 SSO session が idle / max を超えた、portal 再起動で session 消失
- 対応: 自動的に session が破棄され 401 が返る。UI 側は再ログイン promote される。多発する場合は Keycloak `Client Session Max` (`auth.md`) が短すぎないか確認

#### login が redirect ループする

- 想定: `DB_PORTAL_PORTAL_ORIGIN` と Keycloak `Valid Redirect URIs` が不一致 (`auth.md`)
- 対応: `.env` の `DB_PORTAL_PORTAL_ORIGIN` と Keycloak 管理画面の URI を突き合わせる

### session が頻繁に切れる

session TTL は default 30 分 (sliding)。操作のたびに延長されるが、ブラウザを 30 分以上放置すると expire する。これは仕様 (`auth.md`)。

- 「思ったより早く切れる」: `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` env で延長 (例 7200 = 2h)。Keycloak の `Client Session Idle` も同時に揃えること (短い方で実効 TTL が決まるため)
- 「すべての user が同時に切れた」: server が再起動したため (in-memory session、永続化なし)。deploy timing と log の `server_listening` 時刻を突合

### disk cache 容量

News cache 配下は単一 `news.json` (数 MB 程度) のみ。容量問題が出るとすれば schema 変更で `news.json.bak` が累積するケース、定期的に bak ファイルを削除する。

### CSP 違反 (browser console に CSP error)

production で CSP `Content-Security-Policy` が違反 report を上げる場合:

- 新規導入した 3rd-party script (CDN font 等) が CSP ホワイトリストに無い (portal は外部 CDN を使わない方針、外部 script を追加していないか確認)
- inline `<script>` / `<style>` に nonce が付いていない (RR が hydration script に nonce を載せ忘れ、`root.tsx` の `<Scripts nonce={nonce} />` を確認)

CSP 仕様の詳細は `architecture.md` を参照。

## Secret rotation

rotation 対象:

| Secret | 保管場所 | rotation 頻度 |
|---|---|---|
| `DB_PORTAL_LLM_API_KEY` | host `.env.production.local` | vLLM 側 key 更新時 |
| Keycloak client secret | (なし、public client) | -- |
| `DB_PORTAL_E2E_USER_PASSWORD` | リリースマネージャの作業環境 | 半年毎 / incident 時 |
| Deploy host への SSH 鍵 | 各リリースマネージャの `~/.ssh/` | 半年毎 / incident 時 |

Keycloak client は public client (`auth.md`) のため client secret は存在しない。PKCE で代替している。News mirror は git protocol HTTPS で動くため GitHub PAT は不要 (`decisions.md`)。

### vLLM API key 更新

1. NIG 担当から新 API key を取得
2. host 上 `.env.production.local` の `DB_PORTAL_LLM_API_KEY` を更新
3. `.env` を再生成して container を `--force-recreate app` で再起動
4. log で `llm_health_changed: ok` を確認

### e2e テストユーザー password

1. Keycloak 管理コンソール (staging realm) でテストユーザーの password を更新
2. リリースマネージャの作業環境で `DB_PORTAL_E2E_USER_PASSWORD` を新値に更新
3. 次の手動 e2e 実行で auth 系シナリオが pass することを確認

### Deploy host への SSH 鍵

1. リリースマネージャの開発環境で新 ssh key を発行 (`ssh-keygen -t ed25519`)
2. host の `~/.ssh/authorized_keys` から旧 key を削除、新 public key を追加
3. 次の手動 deploy で接続成功を確認

## 定期メンテナンス

| 周期 | 作業 |
|---|---|
| 週次 | log で `*_failed` event を集計、上位を確認 |
| 月次 | News disk cache のサイズ確認、bak ファイル整理 |
| 半年毎 | Deploy host への SSH 鍵 rotation、e2e user password rotation |
| リリース毎 | release announcement 公開、`gen:api-types` の production URL 差分確認 |
