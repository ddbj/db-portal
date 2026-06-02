# Architecture

DDBJ ポータルの全体構造を定義する。本書は `docs/` 配下の最上位 SSOT であり、各論 (`api-types.md` / `i18n.md` / `auth.md` / `frontend.md` / `development.md`) はここから参照される。登録ナビは「登録経路の知識ベース」 として独立した Zod schema (`app/schemas/submit/`) で表現し、外部 metadata schema には依存しない。

## ディレクトリ構造

```
db-portal/
├── app/                         アプリケーションコード (browser + SSR)
│   ├── root.tsx                 HTML shell、i18n provider、QueryClient provider
│   ├── routes.ts                config-based routing の宣言 (URL 全構造の SSOT)
│   ├── routes/                  route component の置き場 (file 名 ≠ URL)
│   ├── features/                画面横断ロジック (search / submit / news / services / top / errors)
│   ├── shell/                   Header / Footer / NotificationBar / NewsAside / Breadcrumb
│   ├── ui/                      Tailwind primitives (Button / Card / Tag / Callout / Modal …)
│   ├── lib/                     純粋ユーティリティ (api / i18n / auth client / content / query)
│   ├── content/                 *.content.tsx (型安全コンテンツ collection)
│   ├── schemas/                 Zod schemas (submit vocab / FlowStep / News / DatabaseContent …)
│   └── styles/                  Tailwind v4 entry + @theme block
├── server/                      BFF / Node 専用コード (browser に出さない)
│   ├── index.ts                 Node entry (RR v7 server adapter + API route 配線)
│   ├── lib/                     env 検証 / 構造化 log
│   ├── auth/                    session store / cookie / OIDC token 交換
│   ├── api/                     /api/* エンドポイント実装
│   ├── news/                    ddbj/www + dbcls/website mirror + disk cache
│   ├── services/                services 一覧の正規化 + disk cache (news clone 再利用)
│   └── llm/                     vLLM HTTP client
├── docs/                        本書を含む仕様 SSOT (概念 + 図 + schemas/ 参照)
├── tests/
│   ├── unit/                    Vitest + msw + createRoutesStub
│   ├── pbt/                     fast-check (純粋ロジックの不変量)
│   └── e2e/                     Playwright (staging に対して)
├── env.dev / env.staging / env.production
├── compose.yml / compose.podman.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── react-router.config.ts
└── eslint.config.ts
```

`app/` は browser 実行と SSR 実行の両方を担う。`server/` は Node 専用で browser bundle に乗らない。詳細は本書の SSR/CSR、build/runtime のセクションで扱う。

portal は 1 リポジトリで運用する。module 境界は内部 import 制約 (本書「import 境界 / zones 表」) で物理強制し、これで単一プロダクトの規模では十分に分離される。

## URL とルーティング

`app/routes.ts` (RR v7 config-based routing) が URL 全構造の SSOT。

### URL 一覧

URL は lang 中立 (cookie で言語が決まる、`i18n.md` 参照)。

| URL | route file | 役割 |
|---|---|---|
| `/` | `routes/top/route.tsx` | トップ (hero 検索 + サービス tile + Services list + News aside) |
| `/search` | `routes/search/route.tsx` | クエリビルダー / AI アシスタント / 検索条件構築 |
| `/search/results` | `routes/search-results/route.tsx` | cross-DB / per-DB の検索結果 |
| `/submit` | `routes/submit/route.tsx` | 登録ナビ (テーブル + FlowStep カード + modal) |
| `/news` | `routes/news/route.tsx` | ニュース一覧 + facet panel |
| `/services` | `routes/services/route.tsx` | services 一覧 + facet panel |
| `/databases/:slug` | `routes/databases/$slug.tsx` | DatabaseContent collection の各エントリ表示 |
| `/api/set-lang` | `routes/api.set-lang.ts` | 言語切替 resource route (action のみ、cookie 更新 + Referer に 303) |
| `/auth/callback` | `routes/auth/callback.tsx` | OIDC コールバック fallback |
| `/auth/silent-callback` | `routes/auth/silent-callback.tsx` | silent renew コールバック placeholder |
| `/auth/logout-callback` | `routes/auth/logout-callback.tsx` | logout コールバック fallback |
| `/_design/*` | `routes/_design/*` | デザイントークン / primitive 視覚確認 (本番ビルドではフラグで除外) |

`/databases/:slug` は config-based route で 1 つの param ルートとして宣言する。各 DB は `/databases/<slug>` の形に統一する (URL 設計の論理性、および既存 DDBJ サイトの単体 path との衝突回避のため)。

`/auth/*` は BFF (`server/api/auth/*`) が 302 で抜けるため、client 側の route は実際には到達しないが、Keycloak client 設定が旧 redirect_uri を保持していた場合の fallback として残す (`auth.md`)。

`/api/set-lang` は `server/index.ts` の `app.all("*", createRequestHandler(...))` フォールバック経由で RR まで届く (既存 BFF 個別登録 `/api/me` / `/api/news` 等とは衝突しない、`i18n.md` 参照)。

### routes.ts の役割

`app/routes.ts` は上表の URL を helper 関数 (`index` / `route` / `layout` / `designRoutes`) で 1 ファイルに列挙する。RR v7 config-based routing の入口であり、URL を追加 / 変更するときは本ファイルだけを直す。`/auth/*` は薄い layout (`routes/auth/layout.tsx`) を共有し、`/_design/*` は env フラグで開発時のみ生成する。

`routes.ts` の import path は `./lib/routes-helpers` を相対指定する (RR の `react-router typegen` が `~` alias を解決しないため)。

### route handle 規約

route handle (静的 metadata) は **各 route component module の `export const handle = {...} as const`** で宣言する。`routes.ts` の helper では渡せない (RR の `CreateRouteOptions` / `CreateIndexOptions` / `CreateLayoutOptions` は `id` 等のみ受け入れる)。loader (非同期 data fetch) ではなく handle に書く理由は、`createRoutesStub` を使った unit test で loader 実行を起こさず参照できる点と、SSR / CSR で同じ値が確実に取れる点。

| handle key | 値 | 用途 |
|---|---|---|
| `i18n.en` | `"complete"` / `"missing"` / `"partial"` | `<TranslationUnavailable />` バナー判定 |
| `breadcrumbI18nKey` | string (例: `"breadcrumb.databases"`) | static breadcrumb segment |
| `breadcrumbResolver` | string (resolver 名) | dynamic breadcrumb segment、`useBreadcrumb` の resolver dict で解決 |
| `titleSegments` | `string[]` (例: `["Search", "Results"]`) | static document title segment (root→leaf)、`resolvePageTitle` が逆順 + `BSI` で組む (`i18n.md`「document title」) |
| `titleResolver` | string (resolver 名) | dynamic document title segment、`resolvePageTitle` の resolver dict で解決 |

複数 handle が混在してよい (例: `{ breadcrumbResolver: "database-content", i18n: { en: "complete" } }`)。`useMatches` で全 match の handle を走査するので、親 layout の handle と子 route の handle は両方有効。

en 表示時に対応キーが en リソースに存在しない page では、route handle に `handle.i18n.en = "partial" | "missing"` を立てる。`<TranslationUnavailable />` がそれを検出してバナーを出す。`handle.i18n.en` を書かない route は「en 翻訳が complete である」 とみなす。

動的 breadcrumb の resolver dict は `app/shell/breadcrumb.tsx` 内で組み立て、`getDatabaseBySlug(params.slug)` 等を呼んで `{ label, href }` を返す。中間セグメント (「データベース」 等) は `app/shell/breadcrumb.tsx` 内で固定挿入する (`/databases` 単体 URL を持たないので、ラベルクリック先は top に向ける)。

### design preview routes

`/_design/*` は `process.env.NODE_ENV` が production 以外、または `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` のときだけ `app/routes.ts` に含まれる (`app/lib/routes-helpers.ts` の `designRoutes()` が分岐)。staging では env を立てれば閲覧可、production では off にすることで bundle と URL 露出を抑える。

### loader / action 規約

- データ fetch は `loader` で行う。SSR / CSR どちらでも fetch (`/api/*` 経由) を共通化する
- `app` から `server` への直接 import は ESLint で禁止 (`no-restricted-paths`)。BFF の関数を呼びたい場合も `fetch(new URL("/api/...", request.url))` 経由
- search-results route は `process.env.DB_PORTAL_SEARCH_API_URL` を直接読んで ddbj-search-api に問い合わせる (BFF を経由しない読み取り。`api-types.md`)
- loader 内 throw は React Router の error boundary に流れる。404 は `throw new Response("Not Found", { status: 404 })` 形式
- root loader は cookie / Accept-Language / `?lang=` から lang を解決し loaderData に乗せる (`i18n.md`)
- `/api/set-lang` は唯一の action 持ち resource route。lang cookie 更新後 303 redirect で Referer に戻す
- RR v7 framework mode は `loader` 1 つで SSR / CSR を兼ねる。`clientLoader` を別宣言しない (loader を 1 本化することで挙動の予測可能性を保つ)

## import 境界

### zones 表

各ディレクトリの import 可否を定義する。`eslint-plugin-import` の `no-restricted-paths` で物理強制される。

| from \ to | features/X | features/Y | shell | ui | lib | schemas | content |
|---|---|---|---|---|---|---|---|
| features/X | ✓ | × | ✓ | ✓ | ✓ | ✓ | ✓ |
| shell | × | × | ✓ | ✓ | ✓ | ✓ | ✓ |
| ui | × | × | × | ✓ | × | × | × |
| lib | × | × | × | × | ✓ | ✓ | × |
| schemas | × | × | × | × | × | ✓ | × |
| content | × | × | × | ✓ | ✓ | ✓ | ✓ |
| routes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

`server/` と `app/` の間も次の通り分離する。

| from \ to | app/features | app/shell | app/ui | app/lib | app/schemas | app/content | app/routes |
|---|---|---|---|---|---|---|---|
| server | × | × | × | × | ✓ | × | × |
| app | × (`server/` 全般 import 不可) |

`app/schemas` だけが `app` と `server` の共用境界。Zod schema は型と runtime validation を兼ねるので、BFF 側のレスポンス整形と client 側の表示で同じ schema を共有する。

### zones の意図

| zone | 役割 | 上位 zone への依存 |
|---|---|---|
| `schemas` | Zod による型 + runtime validation | 持たない (純粋型定義) |
| `lib` | 純粋ユーティリティ (HTTP wrapper / i18n runtime / content loader / query client) | `schemas` のみ (content loader が DatabaseContent を parse するなど、runtime validation を担う lib は schema に依存する) |
| `ui` | Tailwind primitive | 持たない (`@theme` token のみ参照) |
| `content` | `*.content.tsx` collection | `ui` のリッチコンポーネント (Callout / Section …) を JSX で使う |
| `shell` | Header / Footer / NavBar / Breadcrumb (画面横断 chrome) | `ui` / `lib` / `schemas` / `content` |
| `features` | 画面ごとの状態管理・reducer・modal などのロジック | `shell` / `ui` / `lib` / `schemas` / `content` |
| `routes` | RR v7 framework mode の route component (loader / action / 描画) | 全 zone (薄く配線するだけ) |
| `server` | BFF (Node 専用) | `app/schemas` のみ (共用境界) |

`features` 同士の直接 import は禁止する。features を跨ぐ共通ロジックは `lib` か `schemas` に降ろし、UI 共通は `ui` か `shell` に降ろす。これにより 1 feature の変更が他 feature へ波及しない。

### デザイントークンの物理強制

ESLint が次の 2 系統で逸脱を検出する。

- 生 hex literal 禁止: `app/{features,routes,shell,content}/` 配下で `#[0-9A-Fa-f]{3,8}` を含む文字列リテラルを `no-restricted-syntax` で弾く。`app/ui/` のみ除外
- arbitrary Tailwind value 禁止: `app/{features,routes,content}/` 配下で `className` 内の `bg-[#...]` / `text-[14.5px]` / `p-[3px]` を弾く。`app/ui/` と `app/shell/` は除外 (chrome / primitive 設計上の細部値を許容)
- `app/routes/_design/` (開発時のみ生成される token / primitive 視覚確認 route) は `no-restricted-syntax` 全体から除外 (token 一覧表示のために hex 文字列を意図的に保持する)

色や spacing を直接書きたくなったら、まず `app/styles/tailwind.css` の `@theme` block にトークンとして追加する。utility class (`bg-brand` / `text-ink` / `p-section-md`) を経由して参照する。

## SSR と CSR の境界

React Router v7 framework mode (`react-router.config.ts` で `{ ssr: true }`) を使う。

| フェーズ | 実行環境 | 触れていいもの |
|---|---|---|
| Server render | Node | `app/` 全部 (`server/` への直接 import は不可、BFF へは `fetch(/api/*)` 経由) |
| Client hydration | Browser | `app/` 全部 (browser API のみ)、`server/` 不可 |
| Loader / Action | Node (RR) | `app/` 全部 (`server/` への直接 import は不可、BFF へは `fetch(/api/*)` 経由) |

`app` から `server/` への直接 import は ESLint (`no-restricted-paths`) で禁止する。共用境界は `app/schemas` のみで、それ以外の `server/` モジュールは `app/` から触れない。Node 上では `server/api/me.ts` の関数を直接 import しても動くが、それを許すと server zones を超えた import になるため、次のルールで分離する。

- Server route handler 経由 (`POST /api/*`): client / server 両方から呼べる正規 API
- `server/` 内部関数: server adapter から組み立てる内部実装、`app/` からは触れない

Loader / Action は HTTP を経由する。Same-process でも `fetch(new URL("/api/...", url))` を使い、zone 境界を物理的に守る。

## BFF と client の責務分離

`server/` 配下が BFF (Backend for Frontend) として次の責務を持つ。client (`app/`) はこれらに依存して動く。

| BFF 責務 | エンドポイント | client が直接アクセスする外部に対する遮蔽点 |
|---|---|---|
| OIDC token 管理 | `/api/auth/*`、`/api/me` | Keycloak token は browser に出さない (`auth.md`) |
| LLM ストリーミング | `GET /api/llm/health`、`POST /api/llm/search-assistant` | vLLM の URL / API key を browser に出さない、SSE は BFF で pass-through |
| News mirror | `GET /api/news` | ddbj/www の commit を polling し、disk cache を経由して browser へ提供 |
| Services mirror | `GET /api/services` | News mirror の clone を再利用し、services データを正規化・disk cache 経由で browser へ提供 (`services.md`) |

secret (LLM API key / Keycloak credential) を要求する外部 API (vLLM / Keycloak / GitHub) は BFF 経由でのみ叩く。ddbj-search-api は public な検索 API のため client から直接アクセスする。これにより:

- secret が client bundle に embed されない
- vLLM が CORS を緩める必要がない
- 障害時 fallback (LLM 未到達なら UI を hide する) を BFF の health 判定で集約できる

## ビルド時と runtime の境界

### ビルド時に確定するもの

- API 型 (`app/lib/api/openapi-types.ts`): `npm run gen:api-types` で staging openapi.json から生成。git commit 対象。詳細 `api-types.md`
- コンテンツ collection (`app/content/**/*.content.tsx`): `import.meta.glob` で列挙、Zod schema で eager validate。1 件でも parse 失敗すれば build が落ちる。詳細 `frontend.md`
- i18n リソース (`app/lib/i18n/resources/{ja,en}.ts`): 静的 import。`ja` と `en` でキーセットが乖離した場合は PBT (`tests/pbt/`) で検出。詳細 `i18n.md`
- Tailwind utility class: `@theme` block + JSX を Vite が走査して必要な class のみを出力

### Runtime に決まるもの

- 環境変数 (`DB_PORTAL_*`): `server/lib/env.ts` の Zod schema で起動時に validate。違反すれば server を起動しない
- BFF session store: in-memory Map に sid → session entry。プロセス再起動で揮発
- News mirror cache: disk persist (`DB_PORTAL_NEWS_CACHE_DIR`)、起動時に再 load し即応答可能
- Services mirror cache: disk persist (`DB_PORTAL_SERVICES_CACHE_DIR`)、News mirror の sync フックで source 別に再構築 (`services.md`)
- LLM health 状態: `/api/llm/health` の結果を server memory に保持

### client bundle と server bundle の分離

| 変数 | 接頭辞 | アクセス方法 | 何に使えるか |
|---|---|---|---|
| Server | `DB_PORTAL_*` | `process.env.DB_PORTAL_*` (server-only) | secret 含めて全て可 |
| Client | `VITE_DB_PORTAL_*` | `import.meta.env.VITE_DB_PORTAL_*` | secret は絶対に含めない |

`compose.yml` で `VITE_DB_PORTAL_*` を `DB_PORTAL_*` から派生させ、`DB_PORTAL_LLM_API_KEY` などの secret は `VITE_` 側に出さない。secret を browser に流出させない最後の防壁となる。

## データフローの 4 経路

ポータル内で発生する主要な情報の流れ。

### 検索

```
[Browser]
  ├─ Advanced builder reducer (app/features/search/)
  └─ Sidebar facet → AST (app/features/search/)
        │
        ▼ debounce 500-1000 ms
  ddbj-search-api POST /db-portal/serialize
        │
        ▼
  DSL 文字列を URL の ?q= に反映
        │
        ▼
  検索結果取得 (loader + ddbj-search-api GET /db-portal/{cross-search,search})
```

AST 表現は `app/lib/api/search-types.ts` の `ParseNode` alias を SSOT とする。詳細 `api-types.md`。

### 登録ナビゲーション

```
[Browser]
  Submission state (FileEntry[] + FileGroup[])
        │
        ▼ schemas/submit/ の純粋関数群
  サービス step 関数 collection (BioSample / BioProject / DRA / JGA …)
        │
        ▼
  FlowStep[] (動的カード)
```

`app/schemas/submit/` が controlled vocabulary と Submission 型の SSOT。サービス step 関数の不変量は `tests/pbt/submit/` で固定する。

### 認証

```
[Browser] cookie (sid, HttpOnly, SameSite=Lax, Secure)
        │
        ▼
[Server] /api/me
        │
        ▼ in-memory session store
  idToken (logout 用) + userInfo + 失効時刻 (sliding TTL)
```

session store は logout 時の `id_token_hint` 用 idToken・ユーザー情報・失効時刻 (アクセスごとに延長) を保持する。保持フィールドの詳細は `auth.md` と `server/auth/session-store.ts` を参照。

### LLM

```
[Browser]
  useLlmAvailability → BFF /api/llm/health の結果で UI を hide/show
        │
        ▼ available 時
  POST /api/llm/search-assistant (SSE)
        │
        ▼
[Server] vLLM へ pass-through (event: message / done / error)
```

vLLM 接続情報 (`DB_PORTAL_LLM_BASE_URL`) が空の dev 環境では `/api/llm/health` が `{status:"unset"}` を返し、UI 側で AI アシスタント機能を非表示にする。

## テストの位置付け

| 種別 | 配置 | 役割 |
|---|---|---|
| Unit | `tests/unit/` | コンポーネント / 関数 / `createRoutesStub` での loader 統合。HTTP は msw |
| PBT | `tests/pbt/` | 純粋ロジックの不変量 (submit step / AST round-trip / URL serialize / i18n キー整合) |
| E2E | `tests/e2e/` | Playwright で staging URL に対して実行 |

Mock は外部境界 (HTTP / OIDC / FS / 時刻 / 乱数) のみ。内部関数 / コンポーネント / Zod schema は mock しない。詳細な方針は `tests/` 配下の README とテストごとの設計に従う。

## デザインシステム

`app/styles/tailwind.css` の `@theme` block がデザイントークンの SSOT (色 / spacing / font / radius / shadow)。`app/ui/` の primitive はこの token を utility class 経由で参照する。

- token utility class: `bg-brand` / `text-ink` / `border-border-soft` / `p-section-md` / `rounded-card` …
- 生 hex literal / arbitrary value は ESLint で物理禁止
- primitive 一覧 (Button / IconButton / Select / FormGroup / Tag / Chip / Callout / Modal / Pagination …) は `app/ui/` に集約、`features` / `shell` / `routes` / `content` は primitive を消費する
- 新 primitive が必要な場合、`features` 内で独自実装せず `app/ui/` に追加する (zones で物理強制)

詳細な token 値と primitive 仕様はコード (`app/styles/tailwind.css` と `app/ui/`) を一次情報とする。

## 非機能要件

### セキュリティ headers

`server/lib/security.ts` が全 HTTP レスポンスに次の headers を付与する (Express middleware として `server/index.ts` で mount):

| Header | 契約 | 適用範囲 |
|---|---|---|
| `Content-Security-Policy` | nonce ベースの厳格 CSP (下記 directive 表)。directive 文字列の SSOT は `server/lib/security.ts` | dev を除く全 response (`env !== "dev"` のとき付与) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | production のみ (`DB_PORTAL_ENV=production`) |
| `X-Frame-Options` | `DENY` | 全 response |
| `X-Content-Type-Options` | `nosniff` | 全 response |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 全 response |

CSP の各 directive が満たす契約 (具体値は `server/lib/security.ts` を SSOT とする):

| directive | 契約 |
|---|---|
| `default-src` / `base-uri` / `form-action` | `'self'` に限定 |
| `script-src` | `'self'` + per-request の `'nonce-{nonce}'` のみ (`'unsafe-inline'` なし) |
| `style-src` | `'self'` + `'unsafe-inline'` |
| `img-src` / `font-src` | `'self'` + `data:` |
| `connect-src` | `'self'`。`DB_PORTAL_SEARCH_API_URL` 設定時は ddbj-search-api の origin を `security.ts` が動的付与 |
| `frame-ancestors` | `'none'` (clickjacking 遮断) |

CSP の `nonce-{nonce}` は **per-request** に `crypto.randomUUID` で生成して middleware が `res.locals.cspNonce` に置き、root loader が `<Scripts>` / `<Links>` に渡す。これにより RR v7 hydration script を含む全 inline script が nonce 経由で許可され、`'unsafe-inline'` は付けない。

`style-src` に `'unsafe-inline'` を残しているのは、Tailwind v4 の inject や React の `style={...}` prop に対応するため。script より影響範囲が小さく、portal は外部 stylesheet を読まないので妥当と判断する。

### sitemap.xml / robots.txt

URL × lang × hreflang の表現は i18n と一体なので、SSOT を `i18n.md` の「SEO」 節に集約する。本書は概要のみ:

- `GET /sitemap.xml` (`server/api/sitemap.ts`): content collection (`databases`) + 静的 routes について `?lang=ja` / `?lang=en` 2 URL を出力、hreflang 相互宣言
- `GET /robots.txt` (`server/api/robots.ts`): production のみ全許可 + Sitemap、dev / staging は全 disallow

### 404 ページ

URL に該当 route が無い場合 / loader が `throw new Response("Not Found", { status: 404 })` を呼んだ場合は、`app/root.tsx` の `ErrorBoundary` が 404 専用 UI を render する。Shell (Header / Footer) はそのまま、main 領域に i18n キー `errors.notFound.{title,description,backToTop}` を引いた説明 + ホームへの戻りリンクを描画する。

404 以外の error (5xx) は同じ ErrorBoundary が `errors.generic.{title,description}` を表示する。Stack trace は UI に出さない (env を問わず常に hide)。

### アクセシビリティ

- WCAG AA 相当の色コントラスト (token 段階で確認、`app/routes/_design/` で視覚チェック可)
- フォーカスリングを `app/styles/tailwind.css` の `*:focus-visible` で global に適用 (`--color-focus` token を outline 色とする、primitive 単位で個別に上書きしない)
- キーボード操作で全画面到達可能 (modal は focus trap)
- `<html lang>` を `useLang` で動的に出力 (`i18n.md`)

axe 系の e2e 統合は採用していない (false positive 多発リスクを避け、人手レビュー優先)。primitive 単位の検査は unit test (`vitest-axe`) で扱う。

### 性能目標

| 指標 | 目標 |
|---|---|
| LCP (top / search 結果) | < 2.5 s |
| TTFB (SSR) | < 600 ms |
| 検索 API → 結果描画 | < 2 s (95 percentile) |

達成手段:

- Vite + React Router framework mode の自動 code splitting (`vite.config.ts` には `tailwindcss()` と `reactRouter()` plugin のみ、route 単位の chunk は RR が処理する)
- Tailwind v4 の CSS optimization
- Noto Sans JP Variable の self-host + `font-display: swap`
- 画像 lazy loading (`<img loading="lazy">`)
- TanStack Query の `staleTime` 調整 (`/api/me` 5 分、`/api/news` 5 分)

計測は Playwright e2e で `page.evaluate( => performance.getEntriesByType("navigation"))` を取得し、staging で複数試行平均を取って判定。検索 95p は ddbj-search-api 側の負荷状況で振れるため最終判定は手動。
