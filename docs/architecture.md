# Architecture

DDBJ ポータルの全体構造を定義する。本書は `docs/` 配下の最上位 SSOT であり、各論 (`api-types.md` / `i18n.md` / `auth.md` / `content-system.md` / `development.md`) はここから参照される。

## プロジェクトの位置付け

DDBJ の登録・検索サービスへの統合ポータル。**DDBJ Record (v3) schema には依存しない**。登録ナビは「登録経路の知識ベース」 であって登録メタデータではなく、Record 完成後に必要なら adapter を後付けする (`decisions.md`)。

ddbj.nig.ac.jp 全ページの移行を最終ゴールとするが、リリース時点では含めない。コンテンツ機構 (`*.content.tsx` collection、`content-system.md`) は段階移行できるよう最初から設計する (`decisions.md`)。

次の機能領域を 1 リポジトリで提供する。

| 機能 | URL | 概要 |
|---|---|---|
| トップ | `/` | 検索ボックスを実質的なヒーローとし、DDBJ 全体動線と最新ニュースへ案内する |
| 検索 | `/search` `/search/results` | cross-DB 検索と DB 指定検索を Advanced builder と Sidebar facet で構成 |
| 登録ナビゲーション | `/submit` | テーブル + per-cell tag + 動的 FlowStep カードによる登録経路ナビ |
| ニュース | `/news` | ddbj/www の `_news/` を mirror し、カテゴリ facet で閲覧 |
| データベース解説 | `/databases/:slug` | コンテンツ collection から各 DB の説明を生成 |
| 認証 | `/auth/*` | DDBJ Account (Keycloak) との OIDC 連携、JS は token に触れない  |
| 英語版 | `/en/...` | URL prefix によるロケール切替 (詳細 `i18n.md`) |

## ディレクトリ構造

```
db-portal/
├── app/                         アプリケーションコード (browser + SSR)
│   ├── root.tsx                 HTML shell、i18n provider、QueryClient provider
│   ├── routes.ts                config-based routing の宣言 (URL 全構造の SSOT)
│   ├── routes/                  route component の置き場 (file 名 ≠ URL)
│   ├── features/                画面横断ロジック (search / submit / news / auth)
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
│   ├── news/                    ddbj/www mirror + disk cache
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

リポジトリは 1 つのまま運用する。module 境界は内部 import 制約で表現し、物理分割 (`packages/*` への分解) は採用しない (`decisions.md`)。

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
| Server render | Node | `app/` 全部 + `server/` の `lib` / `auth` (cookie 経由で session 解決) |
| Client hydration | Browser | `app/` 全部 (browser API のみ)、`server/` 不可 |
| Loader / Action | Node (RR) | `app/` 全部 + `server/` の `lib` / `auth` (`fetch` で `/api/*` を叩くより、内部で直接 import するほうが overhead が少ない) |

ローダーで `fetch("/api/me")` を呼ぶか、`server/api/me.ts` の関数を直接 import するかは Node 上では後者でも動く。ただし、内部関数を直接呼ぶと server zones を超えて import することになる (`app → server` 禁止)。そのため次のルールで分離する。

- Server route handler 経由 (`POST /api/*`): client / server 両方から呼べる正規 API
- `server/` 内部関数: server adapter から組み立てる内部実装、`app/` からは触れない

Loader / Action は HTTP を経由する。Same-process でも `fetch(new URL("/api/...", url))` を使い、zone 境界を物理的に守る。

## BFF と client の責務分離

`server/` 配下が BFF (Backend for Frontend) として次の責務を持つ。client (`app/`) はこれらに依存して動く。

| BFF 責務 | エンドポイント | client が直接アクセスする外部に対する遮蔽点 |
|---|---|---|
| OIDC token 管理 | `/api/auth/*`、`/api/me` | Keycloak access token / refresh token は browser に出さない (`auth.md`) |
| Search API への AST→DSL serialize 中継 | `POST /api/search/serialize` | ddbj-search-api への HTTP を BFF 経由にし、debounce ロジックは client / 認可と timeout は BFF |
| LLM ストリーミング | `/api/llm/health`、`POST /api/llm/*` | vLLM の URL / API key を browser に出さない、SSE は BFF で pass-through |
| News mirror | `GET /api/news` | ddbj/www の commit を polling し、disk cache を経由して browser へ提供 |

外部 API (Search / vLLM / Keycloak / GitHub) に client が直接アクセスすることはない。これにより:

- secret (LLM API key / Keycloak client secret) が client bundle に embed されない
- ddbj-search-api / vLLM が CORS を緩める必要がない
- 障害時 fallback (LLM 未到達なら UI を hide する) を BFF の health 判定で集約できる

## ビルド時と runtime の境界

### ビルド時に確定するもの

- API 型 (`app/lib/api/openapi-types.ts`): `npm run gen:api-types` で staging openapi.json から生成。git commit 対象。詳細 `api-types.md`
- コンテンツ collection (`app/content/**/*.content.tsx`): `import.meta.glob` で列挙、Zod schema で eager validate。1 件でも parse 失敗すれば build が落ちる。詳細 `content-system.md`
- i18n リソース (`app/lib/i18n/resources/{ja,en}.ts`): 静的 import。`ja` と `en` でキーセットが乖離した場合は PBT (`tests/pbt/`) で検出。詳細 `i18n.md`
- Tailwind utility class: `@theme` block + JSX を Vite が走査して必要な class のみを出力

### Runtime に決まるもの

- 環境変数 (`DB_PORTAL_*`): `server/lib/env.ts` の Zod schema で起動時に validate。違反すれば server を起動しない
- BFF session store: in-memory Map に sid → session entry。プロセス再起動で揮発
- News mirror cache: disk persist (`DB_PORTAL_NEWS_CACHE_DIR`)、起動時に再 load し即応答可能
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
  POST /api/search/serialize (server/api/search/serialize.ts)
        │
        ▼
  ddbj-search-api POST /db-portal/serialize
        │
        ▼
  DSL 文字列を URL の ?q= に反映
        │
        ▼
  検索結果取得 (TanStack Query + ddbj-search-api /db-portal/{cross-search,search})
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
  { tokens, userInfo, expiresAt (sliding 30 min) }
        │
        ▼ 期限切れ前に background refresh
[Keycloak] /protocol/openid-connect/token
```

詳細 `auth.md`。

### LLM

```
[Browser]
  useLlmAvailability → BFF /api/llm/health の結果で UI を hide/show
        │
        ▼ available 時
  POST /api/llm/* (SSE)
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
- primitive 一覧 (Button / IconButton / NativeSelect / FormGroup / Tag / Chip / Callout / Modal / Pagination …) は `app/ui/` に集約、`features` / `shell` / `routes` / `content` は primitive を消費する
- 新 primitive が必要な場合、`features` 内で独自実装せず `app/ui/` に追加する (zones で物理強制)

詳細な token 値と primitive 仕様はコード (`app/styles/tailwind.css` と `app/ui/`) を一次情報とする。

## 非機能要件

### セキュリティ headers

`server/lib/security.ts` が全 HTTP レスポンスに次の headers を付与する (Express middleware として `server/index.ts` で mount):

| Header | 値 | 適用範囲 |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` | 全 response |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | production のみ (`DB_PORTAL_ENV=production`) |
| `X-Frame-Options` | `DENY` | 全 response |
| `X-Content-Type-Options` | `nosniff` | 全 response |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 全 response |

CSP の `nonce-{nonce}` は **per-request** に `crypto.randomUUID` で生成し、middleware が `res.locals.cspNonce` に置く。SSR レンダリング時に `app/root.tsx` の `loader` が `res.locals.cspNonce` を読み、`<Scripts nonce={...} />` / `<Links nonce={...} />` に渡す。これにより RR v7 hydration script を含む全 inline script が nonce 経由で許可され、`'unsafe-inline'` は付けない。

`style-src` に `'unsafe-inline'` を残しているのは、Tailwind v4 の inject や React の `style={...}` prop に対応するため。script より影響範囲が小さく、portal は外部 stylesheet を読まないので妥当と判断する。

### sitemap.xml / robots.txt

- `GET /sitemap.xml` (`server/api/sitemap.ts`): content collection (`databases`) + 静的 routes (`/`、`/search`、`/submit`、`/news`) を ja / en の両方で列挙する `<urlset>` を返す。`<loc>` は production origin 固定 (`DB_PORTAL_PORTAL_ORIGIN` を base)、`<changefreq>` / `<priority>` は省略 (Google が無視するため)
- `GET /robots.txt` (`server/api/robots.ts`): `DB_PORTAL_ENV=production` のみ `User-agent: *` + `Allow: /` + `Sitemap: {origin}/sitemap.xml` を返す。dev / staging では `User-agent: *` + `Disallow: /` を返してインデックス回避

### 404 ページ

URL に該当 route が無い場合 / loader が `throw new Response(null, { status: 404 })` を呼んだ場合は、`app/root.tsx` の `ErrorBoundary` が 404 専用 UI を render する。Shell (Header / Footer) はそのまま、main 領域に i18n キー `errors.notFound.{title,description,backToTop}` を引いた説明 + ホームへの戻りリンクを描画する。

404 以外の error (5xx) は同じ ErrorBoundary が `errors.generic.{title,description}` を表示する。Stack trace は production では出さない (`DB_PORTAL_ENV` で分岐)。

### アクセシビリティ

- WCAG AA 相当の色コントラスト (token 段階で確認、`app/routes/_design/` で視覚チェック可)
- フォーカスリングを全インタラクティブ要素に明示 (`app/ui/` primitive 内で `ring-focus` token を必ず適用)
- キーボード操作で全画面到達可能 (modal は focus trap)
- `<html lang>` を `useLang` で動的に出力 (i18n.md)

axe-core の e2e 統合はリリース時点で未採用 (false positive 多発リスク回避、人手レビュー優先)。unit テスト内での @axe-core/react による primitive 単位の検査は将来評価。

### 性能目標

| 指標 | 目標 |
|---|---|
| LCP (top / search 結果) | < 2.5 s |
| TTFB (SSR) | < 600 ms |
| 検索 API → 結果描画 | < 2 s (95 percentile) |

達成手段:

- Vite code splitting (`splitVendorChunkPlugin` 自動適用)
- Tailwind v4 の CSS optimization
- Noto Sans JP Variable の self-host + `font-display: swap`
- 画像 lazy loading (`<img loading="lazy">`)
- TanStack Query の `staleTime` 調整 (`/api/me` 5 分、`/api/news` 5 分)

計測は Playwright e2e で `page.evaluate( => performance.getEntriesByType("navigation"))` を取得し、staging で複数試行平均を取って判定。検索 95p は ddbj-search-api 側の負荷状況で振れるため最終判定は手動。

