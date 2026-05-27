# Routes

`app/routes.ts` (RR v7 config-based routing) の最終形態 SSOT。全 URL を 1 ファイルで一望し、ja / en の二重宣言は helper で DRY 化する。

## URL 一覧

| URL (ja) | URL (en) | route file | 役割 |
|---|---|---|---|
| `/` | `/en` | `routes/top/route.tsx` | トップ (hero 検索 + サービス tile + Popular Resources + News aside) |
| `/search` | `/en/search` | `routes/search/route.tsx` | クエリビルダー / AI アシスタント / 検索条件構築 |
| `/search/results` | `/en/search/results` | `routes/search-results/route.tsx` | cross-DB / per-DB の検索結果 |
| `/submit` | `/en/submit` | `routes/submit/route.tsx` | 登録ナビ (テーブル + FlowStep カード + modal) |
| `/news` | `/en/news` | `routes/news/route.tsx` | ニュース一覧 + facet panel |
| `/databases/:slug` | `/en/databases/:slug` | `routes/databases/$slug.tsx` | DatabaseContent collection の各エントリ表示 |
| `/auth/callback` | (lang 中立) | `routes/auth/callback.tsx` | OIDC コールバック fallback |
| `/auth/silent-callback` | (lang 中立) | `routes/auth/silent-callback.tsx` | silent renew コールバック placeholder |
| `/auth/logout-callback` | (lang 中立) | `routes/auth/logout-callback.tsx` | logout コールバック fallback |
| `/_design/*` | (lang 中立) | `routes/_design/*` | デザイントークン / primitive 視覚確認 (本番ビルドではフラグで除外) |

`/databases/:slug` は config-based route で 1 つの param ルートとして宣言する (Q7 確定)。`/bioproject` 等の単体 URL は採用しない (URL 設計の論理性と既存サイトとの衝突回避)。

`/auth/*` は BFF (`server/api/auth/*`) が 302 で抜けるため、client 側の route は実際には到達しないが、Keycloak client 設定が旧 redirect_uri を保持していた場合の fallback として残す (`auth.md`)。

## routes.ts の構造

```ts
// app/routes.ts
import { type RouteConfig } from "@react-router/dev/routes"

import {
  type BilingualEntry,
  bilingualRoutes,
  designRoutes,
  layout,
  route,
} from "./lib/routes-helpers"

const bilingualEntries: BilingualEntry[] = [
  { kind: "index", file: "routes/top/route.tsx", baseId: "top" },
  { kind: "route", path: "search", file: "routes/search/route.tsx", baseId: "search" },
  { kind: "route", path: "search/results", file: "routes/search-results/route.tsx", baseId: "search-results" },
  { kind: "route", path: "submit", file: "routes/submit/route.tsx", baseId: "submit" },
  { kind: "route", path: "news", file: "routes/news/route.tsx", baseId: "news" },
  { kind: "route", path: "databases/:slug", file: "routes/databases/$slug.tsx", baseId: "databases-slug" },
]

export default [
  ...bilingualRoutes(bilingualEntries),
  layout("routes/auth/layout.tsx", [
    route("auth/callback", "routes/auth/callback.tsx"),
    route("auth/silent-callback", "routes/auth/silent-callback.tsx"),
    route("auth/logout-callback", "routes/auth/logout-callback.tsx"),
  ]),
  ...designRoutes,
] satisfies RouteConfig
```

### 構造の意図

- 二重宣言 (ja / en) は **1 つの `bilingualEntries` list** から helper が ja default 群と en layout 群を派生させる。URL 構造の一望性と SSOT 性を担保する
- en 側は `route("en", "routes/lang-en/layout.tsx", [...])` で 1 つの layout 配下に集約される。layout は `handle = { lang: "en" }` を持つだけの薄い `<Outlet />`
- helper は base id (例: `"search"`) を entry に持ち、en 側 route の `id` を `<base>.en` 形式で生成する (`i18n.md`)
- **route handle は `routes.ts` から渡せない** (RR の `CreateRouteOptions` / `CreateIndexOptions` は `id` / `index` / `caseSensitive` のみ受け入れる)。各 route component の `export const handle = {...} as const` で個別に宣言する。ja default / en 共用 (同じ route file を読むため同じ handle が両方の lang で有効)
- `/auth/*` は ja / en 共用 (lang prefix なし)。`routes/auth/layout.tsx` が薄い wrapper

`routes.ts` の import path は `./lib/routes-helpers` を相対指定する (RR の `react-router typegen` が `~` alias を解決しないため)。

## bilingualRoutes helper

`app/lib/routes-helpers.ts` で実装する:

```ts
// app/lib/routes-helpers.ts (抜粋)
import { index, layout, route, type RouteConfigEntry } from "@react-router/dev/routes"

const LANG_EN_LAYOUT = "routes/lang-en/layout.tsx"

export type BilingualEntry =
  | { kind: "index"; file: string; baseId: string }
  | { kind: "route"; path: string; file: string; baseId: string }

const buildEntry = (entry: BilingualEntry, id: string | undefined): RouteConfigEntry => {
  if (entry.kind === "index") {
    return id === undefined ? index(entry.file) : index(entry.file, { id })
  }
  return id === undefined ? route(entry.path, entry.file) : route(entry.path, entry.file, { id })
}

export const bilingualRoutes = (entries: readonly BilingualEntry[]): RouteConfigEntry[] => {
  const jaEntries = entries.map((e) => buildEntry(e, undefined))
  const enEntries = entries.map((e) => buildEntry(e, `${e.baseId}.en`))

  return [...jaEntries, route("en", LANG_EN_LAYOUT, enEntries)]
}
```

### id 命名規則

en 側の id は `<base-id>.en` 形式 (例: `search-results.en`)。base id は entry で手書きで指定する (URL path のセグメントを `-` で繋ぐ慣習: `search/results` → `search-results`)。自動生成だと URL 構造の変更で id が予期せず変わるため明示する。

ja default 側は id を指定しない (RR は file path から自動生成)。

### lang-en layout の付与

`bilingualRoutes` は en entry を 1 つの `route("en", LANG_EN_LAYOUT, [...])` に集約する。layout (`app/routes/lang-en/layout.tsx`) は `handle = { lang: "en" }` を持つだけの薄い `<Outlet />`:

```tsx
// app/routes/lang-en/layout.tsx
import { Outlet } from "react-router"

export const handle = { lang: "en" as const }

const LangEnLayout =  => <Outlet />

export default LangEnLayout
```

`useLang` は `useMatches` を走査し、いずれかの `handle.lang === "en"` を見つけたら `"en"` を返す。同じ route component が ja / en で異なる id で 2 回マウントされても、両者で `useLang` が正しく分岐する。

### PBT 不変量

`tests/pbt/lib/routes-helpers/bilingual-symmetry.pbt.test.ts` で次を担保:

- 任意の有効な `entries` 入力に対し、`bilingualRoutes(entries)` は ja 用 entry 群 (entries 件数) + en layout 1 件 (entries 件数の en 子 route を含む) を返す
- en layout 配下の各 entry の id は常に対応する entry の `${baseId}.en` で終わる
- ja default 側 entry には en suffix の id が付かない
- ja default 側 entry と en layout 配下 entry の file path は 1:1 対応 (= 同じ route component を使う)
- entries.length が 0 の場合は en layout の children も空 (= 空 layout は許容)

### design preview routes

`/_design/*` は本番ビルドでは flag で除外する:

```ts
// app/lib/routes-helpers.ts
const isDesignPreviewEnabled =
  process.env.NODE_ENV !== "production"
  || process.env.DB_PORTAL_ENABLE_DESIGN_PREVIEW === "true"

export const designRoutes = : RouteConfigEntry[] =>
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

route handle (静的 metadata) は **各 route component module の `export const handle = {...} as const`** で宣言する。`routes.ts` の helper では渡せない (RR の `CreateRouteOptions` / `CreateIndexOptions` / `CreateLayoutOptions` は `id` 等のみ受け入れる)。loader (非同期 data fetch) ではなく handle に書く理由は、`createRoutesStub` を使った unit test で loader 実行を起こさず参照できる点と、SSR / CSR で同じ値が確実に取れる点 (`i18n.md`)。

| handle key | 値 | 用途 |
|---|---|---|
| `lang` | `"en"` (lang-en layout のみ) | `useLang` がロケール判定に使う |
| `i18n.en` | `"complete"` / `"missing"` / `"partial"` | `<TranslationUnavailable />` バナー判定 |
| `breadcrumbI18nKey` | string (例: `"breadcrumb.databases"`) | static breadcrumb segment |
| `breadcrumbResolver` | string (resolver 名) | dynamic breadcrumb segment、`useBreadcrumb` の resolver dict で解決 |

複数 handle が混在してよい (例: `{ lang: "en", i18n: { en: "complete" } }`)。`useMatches` で全 match の handle を走査するので、親 layout の handle と子 route の handle は両方有効。同じ route component が ja / en 両方で再利用されるため、handle 宣言は 1 度書けば両言語で有効になる。

### ja 側 route の handle

ja default なので `i18n.en` を書かない route は「en 翻訳が complete である」とみなす。en 翻訳が未完成で en URL を踏まれた場合のみ、当該 route に `handle.i18n.en = "partial" | "missing"` を立て、`<TranslationUnavailable />` バナーで誘導する。

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

中間セグメント ("データベース") は親 layout の static handle で出すか、`databases` collection 自体に対応する layout を切る場合は handle 経由で組む。リリース時点は `/databases/:slug` 単体で十分なため、中間セグメントは shell 側で `breadcrumbI18nKey: "breadcrumb.databases"` を仮想的に挿入する形は採らず、`useBreadcrumb` 結果に shell が `breadcrumb.home` を先頭に、`breadcrumb.databases` を中間に挿入する形を採る (`app/shell/breadcrumb.tsx` 内で固定):

```ts
// app/shell/breadcrumb.tsx (抜粋)
const databaseSlugMatch = matches.find((m) => isDatabaseRoute(m))
const middleItems = databaseSlugMatch !== undefined
  ? [{ label: t("breadcrumb.databases"), href: lang === "en" ? "/en" : "/" }]
  : []
```

(`/databases` 単体 URL を持たないので、ラベルクリック先は top に向ける。route hierarchy のラベル挿入は shell 側に閉じ込め、route handle を増やさない)

## loader / action 規約

### loader

- データ fetch は `loader` で行う。SSR / CSR どちらでも fetch (`/api/*` 経由) を共通化する
- `app` から `server` への直接 import は ESLint で禁止 (`no-restricted-paths`)。BFF の関数を呼びたい場合も `fetch(new URL("/api/...", request.url))` 経由
- search-results route は `process.env.DB_PORTAL_SEARCH_API_URL` を直接読んで ddbj-search-api に問い合わせる (BFF を経由しない読み取り。`api-types.md`)
- loader 内 throw は React Router の error boundary に流れる。404 は `throw new Response("Not Found", { status: 404 })` 形式

### action

リリース時点で本番ロジックの action は無い (state 永続化 / mutation 系は後送り phase)。

### client loader / serverLoader 区別

RR v7 framework mode は `loader` 1 つで SSR / CSR を兼ねる。`clientLoader` を別宣言しない (loader を 1 本化することで挙動の予測可能性を保つ)。

## テスト

### unit

- `tests/unit/routes/top.test.tsx`: TopRoute の 2-col grid (main + aside)、NewsAside / HeroSearchBox / ServiceGrid / PopularResources が描画される
- `tests/unit/routes/databases-slug.test.tsx`: DatabaseRoute が `bioproject` / `biosample` / unknown slug (404) で適切に分岐
- `tests/unit/routes/routes-config.test.ts`: `app/routes.ts` の helper 出力が期待 path / id を生成

### PBT

- `tests/pbt/lib/routes-helpers/bilingual-symmetry.pbt.test.ts`: helper の path / id 対称性

### E2E

`tests/e2e/scenarios.md` の Top Domain (S-TOP-01..03 / E-TOP-01) と Content Domain (S-CONTENT-01..03 / E-CONTENT-01..02) で網羅する。

