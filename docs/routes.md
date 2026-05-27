# Routes

`app/routes.ts` (RR v7 config-based routing) の最終形態 SSOT。全 URL を 1 ファイルで一望する。

## URL 一覧

URL は lang 中立 (cookie で言語が決まる、`i18n.md` 参照)。

| URL | route file | 役割 |
|---|---|---|
| `/` | `routes/top/route.tsx` | トップ (hero 検索 + サービス tile + Popular Resources + News aside) |
| `/search` | `routes/search/route.tsx` | クエリビルダー / AI アシスタント / 検索条件構築 |
| `/search/results` | `routes/search-results/route.tsx` | cross-DB / per-DB の検索結果 |
| `/submit` | `routes/submit/route.tsx` | 登録ナビ (テーブル + FlowStep カード + modal) |
| `/news` | `routes/news/route.tsx` | ニュース一覧 + facet panel |
| `/databases/:slug` | `routes/databases/$slug.tsx` | DatabaseContent collection の各エントリ表示 |
| `/api/set-lang` | `routes/api.set-lang.ts` | 言語切替 resource route (action のみ、cookie 更新 + Referer に 303) |
| `/auth/callback` | `routes/auth/callback.tsx` | OIDC コールバック fallback |
| `/auth/silent-callback` | `routes/auth/silent-callback.tsx` | silent renew コールバック placeholder |
| `/auth/logout-callback` | `routes/auth/logout-callback.tsx` | logout コールバック fallback |
| `/_design/*` | `routes/_design/*` | デザイントークン / primitive 視覚確認 (本番ビルドではフラグで除外) |

`/databases/:slug` は config-based route で 1 つの param ルートとして宣言する。`/bioproject` 等の単体 URL は採用しない (URL 設計の論理性と既存サイトとの衝突回避)。

`/auth/*` は BFF (`server/api/auth/*`) が 302 で抜けるため、client 側の route は実際には到達しないが、Keycloak client 設定が旧 redirect_uri を保持していた場合の fallback として残す (`auth.md`)。

`/api/set-lang` は `server/index.ts` の `app.all("*", createRequestHandler(...))` フォールバック経由で RR まで届く (既存 BFF 個別登録 `/api/me` / `/api/news` 等とは衝突しない、`i18n.md` 参照)。

## routes.ts の構造

```ts
// app/routes.ts
import { type RouteConfig } from "@react-router/dev/routes"

import { designRoutes, index, layout, route } from "./lib/routes-helpers"

export default [
  index("routes/top/route.tsx"),
  route("search", "routes/search/route.tsx"),
  route("search/results", "routes/search-results/route.tsx"),
  route("submit", "routes/submit/route.tsx"),
  route("news", "routes/news/route.tsx"),
  route("databases/:slug", "routes/databases/$slug.tsx"),
  route("api/set-lang", "routes/api.set-lang.ts"),
  layout("routes/auth/layout.tsx", [
    route("auth/callback", "routes/auth/callback.tsx"),
    route("auth/silent-callback", "routes/auth/silent-callback.tsx"),
    route("auth/logout-callback", "routes/auth/logout-callback.tsx"),
  ]),
  ...designRoutes(),
] satisfies RouteConfig
```

### 構造の意図

- 各 URL は単一の宣言で表現する。lang は cookie で決まる (`i18n.md`) ため URL が一意
- **route handle は `routes.ts` から渡せない** (RR の `CreateRouteOptions` / `CreateIndexOptions` は `id` / `index` / `caseSensitive` のみ受け入れる)。各 route component の `export const handle = {...} as const` で個別に宣言する
- `/auth/*` は薄い layout (`routes/auth/layout.tsx`) を共有
- `/api/set-lang` は resource route (default export なし、`action` のみ)

`routes.ts` の import path は `./lib/routes-helpers` を相対指定する (RR の `react-router typegen` が `~` alias を解決しないため)。

## design preview routes

`/_design/*` は本番ビルドでは flag で除外する:

```ts
// app/lib/routes-helpers.ts
const isDesignPreviewEnabled =
  process.env.NODE_ENV !== "production"
  || process.env.DB_PORTAL_ENABLE_DESIGN_PREVIEW === "true"

export const designRoutes = (): RouteConfigEntry[] =>
  isDesignPreviewEnabled
    ? [
      route("_design", "routes/_design/layout.tsx", [
        index("routes/_design/index.tsx"),
        route("tokens", "routes/_design/tokens.tsx"),
        route("primitives", "routes/_design/primitives.tsx"),
      ]),
    ]
    : []
```

staging では `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` を立てれば閲覧可、production では off にすることで bundle と URL 露出を抑える。

## route handle 規約

route handle (静的 metadata) は **各 route component module の `export const handle = {...} as const`** で宣言する。`routes.ts` の helper では渡せない (RR の `CreateRouteOptions` / `CreateIndexOptions` / `CreateLayoutOptions` は `id` 等のみ受け入れる)。loader (非同期 data fetch) ではなく handle に書く理由は、`createRoutesStub` を使った unit test で loader 実行を起こさず参照できる点と、SSR / CSR で同じ値が確実に取れる点。

| handle key | 値 | 用途 |
|---|---|---|
| `i18n.en` | `"complete"` / `"missing"` / `"partial"` | `<TranslationUnavailable />` バナー判定 |
| `breadcrumbI18nKey` | string (例: `"breadcrumb.databases"`) | static breadcrumb segment |
| `breadcrumbResolver` | string (resolver 名) | dynamic breadcrumb segment、`useBreadcrumb` の resolver dict で解決 |

複数 handle が混在してよい (例: `{ breadcrumbResolver: "database-content", i18n: { en: "complete" } }`)。`useMatches` で全 match の handle を走査するので、親 layout の handle と子 route の handle は両方有効。

### en 翻訳の完成度マーキング

en 表示時に対応キーが en リソースに存在しない page では、route handle に `handle.i18n.en = "partial" | "missing"` を立てる。`<TranslationUnavailable />` がそれを検出してバナーを出す。`handle.i18n.en` を書かない route は「en 翻訳が complete である」 とみなす。

### 動的 breadcrumb の例

`/databases/:slug` の末尾セグメントは slug 依存ラベル (BioProject / BioSample 等)。route handle に resolver 名だけ書き、`app/shell/breadcrumb.tsx` の resolver dict で `getDatabaseBySlug(params.slug)` を呼ぶ:

```ts
// app/routes/databases/$slug.tsx
export const handle = {
  breadcrumbResolver: "database-content",
  i18n: { en: "complete" },
} as const
```

```tsx
// app/shell/breadcrumb.tsx (抜粋)
const items = useBreadcrumb({
  resolvers: {
    "database-content": ({ params, pathname }) => {
      const db = params.slug !== undefined ? getDatabaseBySlug(params.slug) : undefined
      if (!db) return null
      return { label: db.title[lang], href: pathname }
    },
  },
})
```

中間セグメント ("データベース") は `app/shell/breadcrumb.tsx` 内で固定挿入する (`/databases` 単体 URL を持たないので、ラベルクリック先は top に向ける)。

## loader / action 規約

### loader

- データ fetch は `loader` で行う。SSR / CSR どちらでも fetch (`/api/*` 経由) を共通化する
- `app` から `server` への直接 import は ESLint で禁止 (`no-restricted-paths`)。BFF の関数を呼びたい場合も `fetch(new URL("/api/...", request.url))` 経由
- search-results route は `process.env.DB_PORTAL_SEARCH_API_URL` を直接読んで ddbj-search-api に問い合わせる (BFF を経由しない読み取り。`api-types.md`)
- loader 内 throw は React Router の error boundary に流れる。404 は `throw new Response("Not Found", { status: 404 })` 形式
- root loader は cookie / Accept-Language / `?lang=` から lang を解決し loaderData に乗せる (`i18n.md`)

### action

- `/api/set-lang` は唯一の action 持ち resource route。lang cookie 更新後 303 redirect で Referer に戻す
- リリース時点で他に本番ロジックの action は無い (state 永続化 / mutation 系は後送り phase)

### client loader / serverLoader 区別

RR v7 framework mode は `loader` 1 つで SSR / CSR を兼ねる。`clientLoader` を別宣言しない (loader を 1 本化することで挙動の予測可能性を保つ)。

## テスト

### unit

- `tests/unit/routes/top.test.tsx`: TopRoute の 2-col grid (main + aside)、NewsAside / HeroSearchBox / ServiceGrid / PopularResources が描画される
- `tests/unit/routes/databases-slug.test.tsx`: DatabaseRoute が `bioproject` / `biosample` / unknown slug (404) で適切に分岐
- `tests/unit/routes/routes-config.test.ts`: `app/routes.ts` の helper 出力が期待 path / id を生成
- `tests/unit/routes/api.set-lang.test.ts`: action が cookie 更新 + 303 redirect を返す

### E2E

`tests/e2e/scenarios.md` の Top Domain (S-TOP-01..03 / E-TOP-01) と Content Domain (S-CONTENT-01..03 / E-CONTENT-01..02) で網羅する。
