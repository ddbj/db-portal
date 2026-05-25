# Operations

production / staging で portal を運用するうえでの **監視・log の読み方・トラブルシューティング・secret rotation** SSOT。日常運用に必要な手順とハマりどころをここに集約する。deploy 手順は `deployment.md`、 Keycloak 管理画面側の設定は `keycloak-setup.md` を参照。

## 1. 監視

### 1.1 Log

`server/lib/log.ts` の logger は **stdout に構造化 JSON** を流す。各レコードは次のフィールドを持つ:

| Field | 型 | 説明 |
|---|---|---|
| `time` | string (ISO8601) | log 時刻 |
| `level` | `"debug" \| "info" \| "warn" \| "error"` | severity |
| `event` | string | snake_case event name (例 `server_listening` / `news_mirror_failed`) |
| `...` | 任意 | event 固有の payload (redact 済) |

production の log level は `warn` (`env.production`)、 staging は `info`、 dev は `debug`。`DB_PORTAL_LOG_LEVEL` で上書き可能。

container の log は podman / docker の standard log 経路で取れる:

```bash
# staging
podman logs -f db-portal-staging-app

# production
podman logs -f db-portal-prod-app
```

### 1.2 主要 event 一覧

| Event | level | 意味 | 対応 |
|---|---|---|---|
| `server_listening` | info | server 起動完了 | 正常 |
| `news_mirror_initial_load` | info | disk cache から item を初期 load | 正常 |
| `news_mirror_fetched` | info | GitHub API から item 取得成功 | 正常 |
| `news_mirror_failed` | warn | GitHub API 取得失敗 (rate limit / network) | §3.1 |
| `llm_health_changed` | info | vLLM 接続状態が遷移 (`ok` ↔ `unreachable` 等) | 状態は `/api/llm/health` で確認 |
| `llm_health_check_failed` | warn | health 取得自体が timeout / 5xx | §3.2 |
| `llm_rate_limited` | info | per-IP / per-session rate limit 発火 | §3.3 |
| `oidc_callback_failed` | warn | state 不一致 / token 交換失敗 | §3.4 |
| `auth_session_refresh_failed` | warn | Keycloak refresh が拒否 | §3.4 |
| `request_failed` | error | unhandled exception (5xx) | log の stack を見る |

`accessToken` / `refreshToken` / `cookie` / `authorization` の各フィールドは `[REDACTED]` に置換されて log に出る (`auth.md §5.3`)。 session entry を丸ごと log に出すケースは作らない。

### 1.3 Health endpoint

deploy 後 / 定期監視で叩く 3 endpoint:

| Endpoint | 期待 (起動成功時) | 監視で見るもの |
|---|---|---|
| `GET /api/me` | 401 (cookie なし) | server 生存 |
| `GET /api/news` | 200 JSON array | mirror 動作 (空配列もとりあえず OK) |
| `GET /api/llm/health` | 200 `{status: ...}` | vLLM 接続性 |

外部監視ツール (NIG infra 側の uptime monitor 等) はこの 3 endpoint を 1 分間隔で叩き、 連続失敗で alert を出す構成にする。

## 2. 起動シーケンス

`npm start` (= `validate:content` + `tsx server/index.ts`) で起動。次の順で初期化する:

1. `validate:content`: `app/content/databases/**/*.content.tsx` + `app/content/services/**/*.content.tsx` を Zod parse。 1 件でも fail すると **exit 1** で起動失敗 (build / runtime 両方で fail-fast)
2. `server/lib/env.ts` の `parseServerEnv()` で env を Zod 検証。 必須 env (`DB_PORTAL_PORTAL_ORIGIN` / `DB_PORTAL_KEYCLOAK_REALM_URL` 等) が無いと exit
3. Express server を listen (`server_listening` log)
4. News mirror が起動 (`startMirror`): **5 秒後に初回 fetch**、 以降 `DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS` 間隔で polling (`news-policy.md`)
5. LLM health monitor が起動: 起動直後に 1 回 health check、 以降 5 分間隔で polling (`llm.md §3`)

起動からの最初の 5 秒は `/api/news` が空配列を返すことがある (mirror 未起動)。 これは 200 で返るので外形監視は通る。

## 3. トラブルシューティング

### 3.1 News mirror が動かない

#### 症状

- `/api/news` が空配列を返し続ける
- log に `news_mirror_failed` が頻発

#### 切り分け

```bash
# GitHub API rate limit を確認
curl -fs -H "Authorization: Bearer $TOKEN" https://api.github.com/rate_limit

# disk cache の状態を確認
podman exec db-portal-prod-app ls -la /var/cache/db-portal/news/
# news.json が存在し、 schema_version フィールドを持つこと

# mirror polling interval を確認
podman exec db-portal-prod-app env | grep DB_PORTAL_NEWS_MIRROR
```

#### 対応

| 原因 | 対応 |
|---|---|
| GitHub API rate limit (`x-ratelimit-remaining: 0`) | PAT を `.env.production.local` の `DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` に設定 (rotation は §5) |
| PAT が expire | 新規 PAT を発行して `.env.production.local` 上書き、 server 再起動 |
| disk cache 破損 (Zod schema mismatch) | `news.json` を `mv news.json news.json.bak` して renaming、 server 再起動 (再構築) |
| GitHub Commits API の一時障害 | GitHub status 確認、 一時的なら次の polling で復旧 |

詳細な mirror 挙動は `news-policy.md`、 GitHub PAT の発行手順は §5.2。

### 3.2 vLLM が unreachable

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

復旧後、 health monitor が次の 5 分間隔で `ok` 検知 → `llm_health_changed` log を吐く → UI 側で次の health 取得で再表示。

### 3.3 LLM rate limit が誤発火

#### 症状

- ユーザから「アシスタント生成が `429` を返す」 報告
- log に `llm_rate_limited` 多発

#### 切り分け

```bash
# 現在の rate limit env を確認
podman exec db-portal-prod-app env | grep DB_PORTAL_LLM_RATE_LIMIT
```

#### 対応

`DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` (default 60) / `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` (default 30) を env に追加して上書き。共有 NAT 環境 (大学・研究所) からのアクセスは per-IP の上限に集中するので、 必要なら per-IP を 120-300 程度まで緩める。緩める前後で log の `llm_rate_limited` 頻度を比較する。

### 3.4 認証関連エラー

#### state 不一致 (`oidc_callback_failed: invalid_state`)

- 想定: 攻撃者が偽 callback URL を踏ませようとした (`auth.md §6.8`) / ユーザが古い browser tab で callback に到達
- 対応: ユーザに最新 tab でリトライ依頼。多発する場合は Keycloak 側で redirect URI 設定変更がないか確認 (`keycloak-setup.md §4`)

#### token refresh 失敗 (`auth_session_refresh_failed`)

- 想定: Keycloak 側 SSO session が idle / max を超えた、 portal 再起動で session 消失
- 対応: 自動的に session が破棄され 401 が返る。 UI 側は再ログイン promote される。 多発する場合は Keycloak `Client Session Max` (12h、 `keycloak-setup.md §3`) が短すぎないか確認

#### login が redirect ループする

- 想定: `DB_PORTAL_PORTAL_ORIGIN` と Keycloak `Valid Redirect URIs` が不一致 (`auth.md §6.6`, `keycloak-setup.md §4`)
- 対応: `.env` の `DB_PORTAL_PORTAL_ORIGIN` と Keycloak 管理画面の URI を突き合わせる。 production は完全一致でないと拒否

### 3.5 session が頻繁に切れる

session TTL は default 30 分 (sliding)。 操作のたびに延長されるが、 ブラウザを 30 分以上放置すると expire する。 これは仕様 (`auth.md §5.2`)。

- 「思ったより早く切れる」: `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` env で延長 (例 7200 = 2h)。 ただし XSS / 物理セキュリティとのバランスで設計値は 30 分にしてある。 延長する場合は Keycloak の `Client Session Idle` (default 30 分、 `keycloak-setup.md §3`) も同時に揃えること (短い方で実効 TTL が決まるため)
- 「すべての user が同時に切れた」: server が再起動したため (in-memory session、 永続化なし)。 deploy timing と log の `server_listening` 時刻を突合

multi-instance / redis 化はリリース時点未対応。 拡張時の env は `DB_PORTAL_SESSION_STORE=memory|redis` を想定 (`auth.md §5.4`)。

### 3.6 disk cache 容量

`/var/cache/db-portal/news/` 配下は単一 `news.json` (数 MB 程度) のみ。 単調に増えることはない。 容量問題が出るとすれば schema 変更で `news.json.bak` が累積するケース (§3.1 の手順で生成)、 定期的に bak ファイルを削除する。

### 3.7 CSP 違反 (browser console に CSP error)

production で CSP `Content-Security-Policy` が違反 report を上げる場合:

- 新規導入した 3rd-party script (CDN font 等) が CSP ホワイトリストに無い
  - portal は Noto Sans JP を self-host (`@fontsource-variable/noto-sans-jp`)、 外部 CDN は使わない。 外部 script を追加していないか確認
- inline `<script>` / `<style>` に nonce が付いていない (RR が hydration script に nonce を載せ忘れ)
  - root.tsx の `<Scripts nonce={nonce} />` の渡し方を確認

CSP 仕様の詳細は `architecture.md §6` を参照。

## 4. Secret rotation

### 4.1 rotation 対象

| Secret | 保管場所 | rotation 頻度 |
|---|---|---|
| `DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` | host `.env.production.local` | PAT expire 前 (GitHub default 90 日) |
| `DB_PORTAL_LLM_API_KEY` | host `.env.production.local` | vLLM 側 key 更新時 |
| Keycloak client secret | (なし、 public client) | -- |
| `DB_PORTAL_E2E_USER_PASSWORD` | リリースマネージャの作業環境 (env / password manager) | 半年毎 / incident 時 |
| Deploy host への SSH 鍵 | 各リリースマネージャの `~/.ssh/` | 半年毎 / incident 時 |

Keycloak `db-portal` は public client (`keycloak-setup.md §2`) のため client secret は存在しない。PKCE で代替している。

### 4.2 GitHub PAT (News mirror)

1. GitHub `Settings → Developer settings → Personal access tokens (fine-grained)` で新 token を発行
   - Resource: `Public Repositories (read-only)` のみ (publicly accessible repo を読むだけ)
   - Expiration: 90 日
2. host 上で `.env.production.local` を編集

   ```bash
   sudo -e /etc/db-portal/.env.production.local
   # DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN=ghp_xxx を更新
   ```

3. `.env` を再生成して container 再起動

   ```bash
   cd /opt/db-portal-prod
   cat env.production /etc/db-portal/.env.production.local > .env
   podman-compose -f compose.yml -f compose.podman.yml up -d --force-recreate app
   ```

4. log で次の `news_mirror_fetched` が出ることを確認

   ```bash
   podman logs -f db-portal-prod-app | grep news_mirror
   ```

旧 token は GitHub 画面から revoke する (新 token 動作確認後)。

### 4.3 vLLM API key

1. NIG 担当から新 API key を取得
2. host 上で `.env.production.local` の `DB_PORTAL_LLM_API_KEY` を更新
3. container 再起動 (§4.2 と同じ)
4. log で `llm_health_changed: ok` を確認

### 4.4 e2e テストユーザー password

1. Keycloak 管理コンソール `https://idp-staging.ddbj.nig.ac.jp` (staging realm) で `ts-db-portal-dev` ユーザーの password を更新
2. リリースマネージャの作業環境 (password manager / `.env` 等) で `DB_PORTAL_E2E_USER_PASSWORD` を新値に更新
3. 次の手動 e2e 実行 (`npm run test:e2e`) で auth 系シナリオ (`S-AUTH-02` 等) が pass することを確認

### 4.5 Deploy host への SSH 鍵

1. リリースマネージャの開発環境で新 ssh key を発行 (`ssh-keygen -t ed25519`)
2. host (`portal-staging.ddbj.nig.ac.jp` / `portal.ddbj.nig.ac.jp`) の `~/.ssh/authorized_keys` から旧 key を削除、 新 public key を追加
3. 次の手動 deploy (`deployment.md §7`) で接続成功を確認

## 5. 定期メンテナンス

| 周期 | 作業 |
|---|---|
| 週次 | log で `*_failed` event を集計、 上位を確認 |
| 月次 | News disk cache のサイズ確認、 bak ファイル整理 |
| 90 日毎 | GitHub PAT rotation (§4.2) |
| 半年毎 | Deploy host への SSH 鍵 rotation (§4.5)、 e2e user password rotation (§4.4) |
| リリース毎 | release announcement 公開、 `gen:api-types` の production URL 差分確認 (`deployment.md §6.2`) |

## 6. リリース後評価項目

リリース後にフィードバックを集めて次フェーズで再評価:

- LLM rate limit (共有 NAT 環境での誤発火頻度) → §3.3 で env 緩和の判断材料
- Sentry / 外部監視 SaaS 導入の要否 (リリース時点は self-host 構造化 log のみ)
- multi-instance 化 / redis session 化 (リリース時点は 1 instance 想定)
- axe-core e2e 統合 (リリース時点は手動 a11y review のみ)

## 7. 関連 docs

| docs | 関連箇所 |
|---|---|
| `deployment.md` | deploy 手順 / health check / rollback |
| `keycloak-setup.md` | Keycloak realm / client / redirect URI |
| `auth.md` | session store / OIDC flow / log redact 対象 |
| `news.md` | mirror の polling / disk cache schema |
| `llm.md` | vLLM health / rate limit / SSE |
| `architecture.md` | CSP nonce / SSR / sitemap |
| `development.md` | dev 環境のトラブルシューティング (本書は production / staging 専用) |
