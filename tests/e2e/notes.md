# E2E Notes

Playwright e2e の設計上の制約・運用上のハマりどころ。シナリオ自体は `scenarios.md` を参照。

## 1. 環境 / baseURL

e2e は **staging URL に対して実行** する。dev (Docker) に対しては基本的に走らせない。

| env | 用途 | baseURL |
|---|---|---|
| `DB_PORTAL_PORTAL_ORIGIN` | `playwright.config.ts` が参照 | `https://portal-staging.ddbj.nig.ac.jp` (省略時 default) |

staging に向けて回す場合 (リリースマネージャの手元 / 作業環境):

```bash
docker compose exec app sh -c '
  DB_PORTAL_PORTAL_ORIGIN=https://portal-staging.ddbj.nig.ac.jp \
  DB_PORTAL_E2E_USER_PASSWORD=<staging test user password> \
  npm run test:e2e
'
```

CI からの自動実行はしない (`deployment.md §6`)。リリース判定の前に手動で回す。

## 2. テスト間の独立性

### 2.1 cookie / storage の cleanup

各 spec の `test.beforeEach` で次を実行する:

```ts
await context.clearCookies()
await page.evaluate(() => {
  localStorage.clear()
  sessionStorage.clear()
})
```

`context` は test ごとに fresh で発行されるが、storageState を共有する spec (auth login 済) では明示的に clear する。これを忘れると S-AUTH-01 (未認証画面) が直前 spec の session を引き継いで失敗する。

### 2.2 順序非依存

`scenarios.md` 内の番号は仕様 ID であり、実行順とは独立。`vitest --shuffle` / `playwright --shard` で並べ替えて全 spec が通ること。

### 2.3 spec ファイルの粒度

1 Domain = 1 spec file。各 spec 内で `test.describe` を Domain 名にし、各 `test` を S-/E- ID で命名する。ID と test 名を 1:1 にしておくと、scenarios.md ↔ spec の追跡が機械的にできる。

```ts
test.describe("Search Domain", () => {
  test("S-SEARCH-01: トップ → /search → 検索実行", async ({ page }) => { ... })
  test("E-SEARCH-01: 不正 DSL の URL", async ({ page }) => { ... })
})
```

## 3. 認証

### 3.1 P-USER の storage state

`tests/e2e/auth.setup.ts` が Playwright project の `setup` dependency として走り、`helpers.ts` の `loginViaKeycloak` を経由して `tests/e2e/.auth/user.json` に storage state を保存する。`user` project は `playwright.config.ts` で `storageState: USER_STORAGE_STATE` を `use` に積むので、各 P-USER spec (`*.user.spec.ts`) は最初からログイン済 context で動く。

`.auth/` は `.gitignore` で除外する。

### 3.2 ログイン情報の入手

`DB_PORTAL_E2E_USER_PASSWORD` は実行者の環境変数として渡す (password manager 等から取り出す)。ユーザーは Keycloak `staging` realm の `ts-db-portal-dev` (`keycloak-setup.md §7`)。

### 3.3 storageState の TTL

Keycloak refresh token の Idle (30 分) を超えると Auth 系 spec が失敗する。spec 起動前に必ず `auth.setup.ts` を回す構成にすれば自動更新される。手動ローカル実行時は失敗したら再 setup で OK。

## 4. 待機 / retry

### 4.1 staging 安定性

ddbj-search-api / Keycloak / vLLM / GitHub API の遅延は 1-3 秒、ピーク時 5-10 秒。`expect(...).toBeVisible({ timeout: 10_000 })` を default に、ネットワーク重い操作 (検索結果取得) は 15-20 秒まで許容する。

### 4.2 Retry

`playwright.config.ts` で `retries: process.env.CI ? 1 : 0` を設定。staging の 1 回限り 502 / 503 は CI 側で吸収する。ローカルでは retry しない (再現性を確認)。

### 4.3 Network idle 待機

検索結果ページなど、loader → API → render の chain で動作する画面は `await page.waitForLoadState("networkidle")` を使う。ただし vLLM SSE が走る画面は永遠に network idle にならないので、SSE 画面では `expect(...).toBeVisible()` の polling に頼る。

## 5. 外部 API の rate limit

### 5.1 GitHub API

匿名 60 req/h。News mirror spec を回しすぎると枯れる。CI / ローカル双方で `GITHUB_TOKEN` env を渡し、spec から `/api/news` を経由する (server 側 mirror の PAT 経由) ことで rate limit を回避する。

### 5.2 vLLM

`DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` / `_PER_SESSION_MIN` (default 60 / 30 req/min)。LLM spec を 1 ファイルにまとめ、並列で同じ user として叩かない。並列性は `test.describe.configure({ mode: "serial" })` で抑える。

### 5.3 ddbj-search-api

明示的な rate limit は無いが、staging 環境の負荷状況で偶発的に遅延する。§4.1 の timeout で吸収。

## 6. SSE / streaming のテスト

LLM SSE (`/api/llm/search-assistant`) のテストは Playwright の `request` API + `EventSource` polyfill ではなく、**UI 経由で network response を観測する** 形に統一する:

```ts
const response = page.waitForResponse(
  (r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200,
)
await page.locator('[data-testid="search-assistant-textarea"]').fill("breast cancer rna-seq")
await page.locator('[data-testid="search-assistant-submit"]').click()
await response
await expect(page.locator('[data-testid="search-assistant-proposal"]')).toBeVisible({ timeout: 30_000 })
```

server 側 BFF が SSE を完了するまでに 5-30 秒かかる。timeout を長めに設定。

## 7. 異常系シナリオ (E-*)

staging で再現困難な異常系 (5xx / 不正 state / vLLM 停止 等) の扱い:

| シナリオ | 再現方法 |
|---|---|
| E-SEARCH-01 (不正 DSL) | URL を直接組み立てて navigation (server / API は通常運転) |
| E-SEARCH-02 (cross-search 5xx) | `page.route()` で network intercept、staging API レスポンスを差し替える |
| E-AUTH-01 (state 不一致) | URL を直接組み立てる (`/api/auth/callback?code=x&state=evil`) |
| E-AUTH-02 (token refresh 失敗) | unit テスト側で吸収。e2e は session expire 後の 401 表示確認のみ |
| E-LLM-01 (vLLM 停止) | LLM unset 環境 (dev) でしか再現できない。e2e では `/api/llm/health` の status が `unreachable` または `unset` のときに UI 非表示を確認する形に |
| E-LLM-02 (SSE 切断) | `page.route()` で response を途中切断 |
| E-NEWS-01 (GitHub API 障害) | server 側挙動なので staging では再現困難。unit テストで吸収、e2e は `/api/news` が常に 200 を返すことだけ確認 |
| E-NEWS-02 (front matter 不正) | mirror 側 unit で吸収 |
| E-CONTENT-01 (未知 slug) | URL を直接 navigation (`/databases/unknown-slug`) |
| E-CONTENT-02 (翻訳未完成) | handle.i18n.en === "missing" の fixture を持つ database content で確認 |

`page.route()` は外部境界 mock の一種で、e2e の「実物を叩く」 原則から逸脱するが、staging で再現不可能な障害シナリオのみ許容する。妥当性確認の境界としては unit + msw 側を主、e2e 側は補助とする。

## 8. スクリーンショット / trace

`playwright.config.ts` で `trace: "on-first-retry"` を設定。CI で失敗した spec は `playwright-report/` に trace が残り、GitHub Actions の artifact として upload される。

local 実行で失敗を見たい場合:

```bash
docker compose exec app npx playwright show-trace test-results/<spec-name>/trace.zip
```

## 9. 実行タイミング

e2e は CI から自動実行しない。リリース判定の前にリリースマネージャがローカル / 作業用環境で staging に対して回す:

```bash
docker compose exec app sh -c '
  DB_PORTAL_PORTAL_ORIGIN=https://portal-staging.ddbj.nig.ac.jp \
  DB_PORTAL_E2E_USER_PASSWORD=<staging test user password> \
  npm run test:e2e
'
```

失敗時の HTML report は `playwright-report/` に出力される (`npx playwright show-report` でブラウザ表示)。

## 10. 関連 docs

| docs | 関連箇所 |
|---|---|
| `tests/e2e/scenarios.md` | シナリオ SSOT |
| `docs/auth.md §12.3` | 認証 e2e 範囲 |
| `docs/llm.md §6` | LLM e2e 範囲 |
| `docs/deployment.md` | staging deploy フロー |
| `docs/keycloak-setup.md §7` | テストユーザー |
