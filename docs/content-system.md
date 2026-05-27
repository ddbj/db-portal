# Content System

データベース解説、サービス紹介、各種ガイドのコンテンツを TypeScript ファイル (`*.content.tsx`) として書く collection 方式を採用する。`architecture.md` の zones に従い、コンテンツは `app/content/` に集約する。

## 方針

- コンテンツは **`*.content.tsx`** ファイルとして書く。Markdown 直書きは採用しない
- 長文の本文 (`body.ja` / `body.en`) は **TSX fragment 直書き**。リッチ表現 (Callout / Section / Table / TextLink) は `app/ui/` の primitive を JSX で使う
- Frontmatter 相当のメタ (title / slug / description / 関連 DB / 外部リンク / サービス分類) は **Zod schema で型検証**。ビルド時に壊れていれば即エラー
- Breadcrumb は content 側に書かず、**route handle + i18n リソースで自動生成** する 
- 翻訳は同一ファイル内 `{ ja, en }` 並びで持ち、diff が読みやすい形を取る

代替案 (Markdown / MDX / Headless CMS) との比較と却下理由は `decisions.md` の「コンテンツは `*.content.tsx`」 を参照。

## ディレクトリ構造

```
app/content/
├── databases/
│   ├── bioproject/
│   │   └── index.content.tsx        /databases/bioproject
│   └── biosample/
│       └── index.content.tsx        /databases/biosample
└── services/
    ├── bioproject.content.tsx       BioProject (top + submit 兼任)
    ├── biosample.content.tsx        BioSample (top + submit 兼任)
    ├── search.content.tsx           portal 内検索 (top primary tile, internal link)
    ├── submit-nav.content.tsx       portal 内登録ナビ (top primary tile, internal link)
    ├── supercomputer.content.tsx    NIG スパコン (top primary tile, external link)
    ├── ...
    ├── humandbs.content.tsx         humandbs (submit-only)
    └── jpost.content.tsx            jPOST (submit-only)
```

各 collection に対応する Zod schema は `app/schemas/content/` に置く:

```
app/schemas/content/
├── database-content.ts             DatabaseContent
└── service-content.ts              ServiceContent
```

Loader と型は `app/lib/content/`:

```
app/lib/content/
├── loader.ts                       collection 列挙 + Zod 検証 + getter
├── breadcrumb.ts                   useBreadcrumb hook と resolver 型
├── types.ts                        Collection / ValidationResult 型
└── index.ts                        re-export
```

zone 関係は `architecture.md` を参照。`content` は `ui` / `lib` / `schemas` / `content` を import 可、`features` / `shell` への import は禁止 (ESLint `no-restricted-paths` で物理強制)。

## Schemas

### DatabaseContent

```ts
// app/schemas/content/database-content.ts
import type { ReactNode } from "react"
import { z } from "zod"

const Bilingual = z.object({
  ja: z.string.min(1),
  en: z.string.min(1),
})

const BilingualBody = z.object({
  ja: z.custom<ReactNode>,
  en: z.custom<ReactNode>,
})

const ExternalLink = z.object({
  label: Bilingual,
  href: z.string.url,
})

export const DatabaseSlug = z.enum(["bioproject", "biosample"])
export type DatabaseSlug = z.infer<typeof DatabaseSlug>

export const DatabaseContent = z.object({
  slug: z.string.regex(/^[a-z0-9-]+$/),
  title: Bilingual,
  description: Bilingual,
  body: BilingualBody,
  meta: z.object({
    lastUpdated: z.string.datetime,
    relatedDbs: z.array(DatabaseSlug).default([]),
    externalLinks: z.array(ExternalLink).default([]),
  }),
})
```

設計判断:

- `body.ja` / `body.en` は `ReactNode` (Zod では `z.custom<ReactNode>` で素通し)。Zod は構造検証しない (TSX は JSX runtime によって解釈される)
- `title` / `description` は string で `min(1)` 検証する
- `meta.lastUpdated` は ISO 8601 文字列 (`z.string.datetime`)。手書きで運用する (`development.md` の content 更新フロー)
- `meta.relatedDbs` は他 DB slug の配列。`DatabaseSlug` enum で実装済み slug union に narrow するため、未知 / タイポは build 時 (`validate:content`) と TypeScript の `satisfies DatabaseContent` で弾かれる。新規 DB を `app/content/databases/` に追加する時は `DatabaseSlug` enum にも追記する
- `meta.externalLinks` は表示用の外部リンク集 (INSDC / EBI / NCBI 等への参照)
- **Breadcrumb はここに書かない** (route handle + i18n で自動生成)

### ServiceContent

サービス情報 (検索 / 登録 / 各種 DB / 外部サービス) を 1 collection に集約する。トップページの Service tiles / Popular Resources と submit feature の外部 CTA リンクが同じ source を共用する。

```ts
// app/schemas/content/service-content.ts
import { z } from "zod"

import { Service as SubmitService } from "~/schemas/submit"

const Bilingual = z.object({
  ja: z.string.min(1),
  en: z.string.min(1),
})

const ServiceLink = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("internal"), to: z.string.startsWith("/") }),
  z.object({ kind: z.literal("external"), href: z.string.url }),
])

const TopUsage = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("primary-service"),
    order: z.number.int.nonnegative,
  }),
  z.object({
    category: z.literal("popular-ddbj"),
    order: z.number.int.nonnegative,
    monogram: z.string.regex(/^[A-Z][A-Z0-9]{1,2}$/),
  }),
  z.object({
    category: z.literal("popular-dbcls"),
    order: z.number.int.nonnegative,
    monogram: z.string.regex(/^[A-Z][A-Z0-9]{1,2}$/),
  }),
])

const SubmitUsage = z.object({
  service: SubmitService,
  externalUrl: z.string.url,
  source: z.enum(["DDBJ", "DBCLS"]).nullable,
  accessionPlaceholders: z.array(z.string).default([]),
})

export const ServiceContent = z.object({
  id: z.string.regex(/^[a-z0-9-]+$/),
  title: Bilingual,
  description: Bilingual,
  link: ServiceLink.optional,
  top: TopUsage.optional,
  submit: SubmitUsage.optional,
})
  .refine(
    (s) => s.top !== undefined || s.submit !== undefined,
    { message: "service must declare at least one of top or submit usage" },
  )
  .refine(
    (s) => s.top === undefined || s.link !== undefined,
    { message: "service with top usage must declare link" },
  )
```

設計判断:

- `id` は kebab-case。submit feature 用 entry は submit `Service` enum の値と一致させる (`bioproject` / `biosample` / ...)
- `link` は top で表示する遷移先。`primary-service` の Service tile クリックと `popular-ddbj` / `popular-dbcls` の ResourceCard クリックで共通利用する
- `top.category` で表示位置を分岐:
  - `primary-service`: トップの Service tile grid (左 main 上段、6 件)
  - `popular-ddbj`: Popular Resources DDBJ 群 (黄系 monogram)
  - `popular-dbcls`: Popular Resources DBCLS 群 (青系 monogram)
- `top.order` で各カテゴリ内の表示順を決める。order の重複は loader 側 PBT で検出する余地はあるが、リリース時点では手動管理
- `top.monogram` は 2-3 文字の大文字英数字 (例: "BP" / "BS" / "DR" / "TGV")。`primary-service` には monogram を要求しない (Service icon を別途持つため)
- `submit.service` で submit feature の `Service` union と紐付ける。`app/features/submit/` の flow card / preview card がこの entry を引いて external CTA URL / accession placeholder / source タグを表示する
- `submit-only` の entry (humandbs / dbcls / jpost / eva / dgva 等) は `top` を持たず、`link` も持たない (submit 外部 CTA でだけ参照される)
- `.refine` で「少なくとも 1 つの usage が必要」「top usage がある場合は link 必須」を担保

### Loader 出力型

| 関数 | 返却 |
|---|---|
| `getDatabaseBySlug(slug)` | `DatabaseContent \| undefined` |
| `listDatabases` | `readonly DatabaseContent[]` |
| `validateAllDatabases` | `ValidationResult<DatabaseContent>` |
| `getServiceById(id)` | `ServiceContent \| undefined` |
| `listServices` | `readonly ServiceContent[]` |
| `listServicesByTopCategory(category)` | `readonly ServiceContent[]` (`top.order` 昇順) |
| `getServiceBySubmit(service)` | `ServiceContent \| undefined` (submit Service enum 値で逆引き) |
| `validateAllServices` | `ValidationResult<ServiceContent>` |

CLI (`scripts/validate-content.ts`) は両関数を順に呼び、どちらかが失敗すれば `process.exit(1)` する。

## Loader

### 列挙と検証

`import.meta.glob` で collection を eager load し、module top で Zod parse する。1 件でも parse 失敗があれば `loader.ts` 自体が `throw` する。

```ts
// app/lib/content/loader.ts (抜粋)
const databaseModules = import.meta.glob<{ default: unknown }>(
  "/app/content/databases/**/*.content.tsx",
  { eager: true },
)
const serviceModules = import.meta.glob<{ default: unknown }>(
  "/app/content/services/**/*.content.tsx",
  { eager: true },
)

const databaseResult = collectFromModules(DatabaseContent, databaseModules)
if (!databaseResult.ok) {
  throw new Error(
    `Database content validation failed:\n\n${formatValidationErrors(databaseResult.errors)}`,
  )
}
const serviceResult = collectFromModules(ServiceContent, serviceModules)
if (!serviceResult.ok) {
  throw new Error(
    `Service content validation failed:\n\n${formatValidationErrors(serviceResult.errors)}`,
  )
}
```

`collectFromModules<S extends ZodTypeAny>(schema, modules)` は内部の純粋関数として export され、テスト fixture を直接渡せる (`tests/unit/lib/content/loader.test.ts`)。

### 起動時 fail-fast

`server/index.ts` は zones の制約 (`server → app/lib` 禁止) で `loader.ts` を直接 import しない。代わりに、`npm run dev` / `npm run start` / `npm run build` の前段で `npm run validate:content` を必ず通すことで、collection 不整合を起動前に検出する。

```jsonc
// package.json
{
  "scripts": {
    "validate:content": "tsx scripts/validate-content.ts",
    "dev": "npm run validate:content && tsx watch ...",
    "start": "npm run validate:content && NODE_ENV=production tsx server/index.ts",
    "build": "npm run validate:content && NODE_ENV=production react-router build"
  }
}
```

`scripts/validate-content.ts` は Vite SSR の `ssrLoadModule` で `app/lib/content/loader.ts` を読み込み、`validateAllDatabases` / `validateAllServices` を呼んで失敗を stdout に出して `process.exit(1)` する。dev / staging / production すべてで同じ fail-fast が効く。

エラーログには `filepath` と Zod issue の path / message が含まれる (`formatValidationErrors` が整形)。

### ビルド時検証

`npm run build` も `validate:content` を前段に持つため、CI でも build 失敗として検知できる。これにより「production で初めて気付く」事故を防ぐ。

### fail-fast の保証範囲

`loader.ts` の top-level `throw` は `loader.ts` が import された瞬間に発火する。app 側は SSR / CSR の各 entry が `loader.ts` を import するため起動時にも fail-fast が効くが、server プロセスを `node server/index.ts` のように直接起動した場合は破損 content が runtime まで検知されない。`npm run *` 経由で `validate:content` を必ず前置する運用が fail-fast の唯一の担保となる。

## Breadcrumb 自動生成

### 方針

Content 側に breadcrumb を **書かない**。Route handle に i18n キー (または resolver 名) を持たせ、`useBreadcrumb` hook が `useMatches` を走査して構築する。

### Static / Dynamic ラベル

| handle | ラベル解決 | 用途 |
|---|---|---|
| `{ breadcrumbI18nKey: "breadcrumb.databases" }` | `t(key)` | 中間 segment (例: "データベース") |
| `{ breadcrumbResolver: "database-content" }` | resolver `(input) => { label, href }` | 末尾 segment (例: BP の title を i18n から引く) |

ja / en の table top は `breadcrumb.home` を `t` で引き、自動先頭付与する (`app/shell/breadcrumb.tsx` が首尾を担う)。

### useBreadcrumb hook

ロジックは `app/lib/content/breadcrumb.ts` の `useBreadcrumb(options?)` に集約する。`options.resolvers` は dynamic handle (動的ラベル) を解決する関数の辞書。`app/shell/breadcrumb.tsx` は hook の結果を render するだけの薄い UI 層となる。

```ts
// app/lib/content/breadcrumb.ts (抜粋)
export type BreadcrumbItem = { label: string; href: string }
export type BreadcrumbResolver = (input: {
  data: unknown
  pathname: string
  params: Readonly<Record<string, string | undefined>>
}) => BreadcrumbItem | null

export const useBreadcrumb = (
  options: { resolvers?: Record<string, BreadcrumbResolver> } = {},
): BreadcrumbItem[] => {
  const matches = useMatches
  const t = useT
  const resolvers = options.resolvers ?? {}
  const items: BreadcrumbItem[] = []
  for (const m of matches) {
    const handle = m.handle as unknown
    if (isStaticHandle(handle)) {
      items.push({ label: t(handle.breadcrumbI18nKey), href: m.pathname })
      continue
    }
    if (isDynamicHandle(handle)) {
      const resolver = resolvers[handle.breadcrumbResolver]
      if (!resolver) continue
      const item = resolver({ data: m.data, pathname: m.pathname, params: m.params })
      if (item) items.push(item)
    }
  }

  return items
}
```

shell 側の使い方 (`app/shell/breadcrumb.tsx` 内 の resolver は features/lib のヘルパに依存しないよう `~/lib/content` を直接読む):

```tsx
import { Link } from "react-router"

import { useBreadcrumb } from "~/lib/content/breadcrumb"
import { getServiceById, listDatabases } from "~/lib/content/loader"
import { useLang } from "~/lib/i18n"

const databaseResolver: BreadcrumbResolver = ({ params, pathname }) => {
  const db = params.slug ? listDatabases.find((d) => d.slug === params.slug) : undefined
  if (!db) return null
  return { label: db.title[lang], href: pathname }
}
```

### 表示しないケース

`useBreadcrumb` が 0-1 件 (= top のみ) を返した場合、何も render しない (`null`)。top page (`/` / `/en`) で breadcrumb が冗長になるのを避けるため。

### 利点

- Content (`*.content.tsx`) で breadcrumb を書く必要がない (二重ソースなし)
- Route 構造を変えると breadcrumb も自動追従
- i18n ラベルは locale ファイルに集約 (翻訳が一箇所に集まる)

## TSX fragment スコープ

### Import 可能な範囲

`content` zone は次を import できる (`architecture.md`):

- `app/ui/` のリッチコンポーネント (Callout / Section / TextLink / Tag / SectionHeading 等)
- `app/lib/` のヘルパ (URL 生成 / format 等)
- `app/schemas/` の型 (`satisfies DatabaseContent` のために `database-content.ts` を import)
- `app/content/` 内の他コンテンツ (相互リンク等で参照する場合)

`app/features/` / `app/shell/` への import は **禁止**。コンテンツは feature ロジックに依存させない (依存させると content の差し替えが feature 修正を巻き込む)。

### 生 HTML 要素の制約

ESLint `react/forbid-elements` (`app/{features,routes,content}/**`) で次を禁止する:

| 要素 | 代替 |
|---|---|
| `<button>` | `~/ui` の `Button` / `IconButton` |
| `<a>` | `~/ui` の `TextLink` または `react-router` の `Link` |
| `<input>` | `~/ui` の form primitive |
| `<select>` | `~/ui` の `NativeSelect` |
| `<textarea>` | `~/ui` の form primitive (必要なら primitive を追加) |

許容される構造タグ: `<p>` / `<div>` / `<ul>` / `<ol>` / `<li>` / `<dl>` / `<dt>` / `<dd>` / `<h2>` / `<h3>` / `<strong>` / `<em>` 等。生 hex / Tailwind arbitrary value は ESLint `no-restricted-syntax` で禁止される。

### 書き方の例

```tsx
// app/content/databases/bioproject/index.content.tsx
import { Callout, Section, TextLink } from "~/ui"
import { DatabaseContent } from "~/schemas/content/database-content"

export default {
  slug: "bioproject",
  title: { ja: "BioProject", en: "BioProject" },
  description: {
    ja: "研究プロジェクトとそのプロジェクトに由来するデータを束ねるメタデータ DB",
    en: "Metadata database that groups research projects and data derived from them",
  },
  body: {
    ja: (
      <>
        <Section padY="sm">
          <p>BioProject は研究プロジェクト単位でデータをまとめるメタデータデータベースです...</p>
        </Section>
        <Callout tone="info">
          登録には DDBJ Account が必要です。詳細は <TextLink to="/submit">登録ナビ</TextLink> を参照してください。
        </Callout>
      </>
    ),
    en: (
      <>
        <Section padY="sm">
          <p>BioProject organises data per research project as metadata...</p>
        </Section>
        <Callout tone="info">
          A DDBJ Account is required. See the <TextLink to="/en/submit">submission navigator</TextLink>.
        </Callout>
      </>
    ),
  },
  meta: {
    lastUpdated: "2026-05-25T00:00:00Z",
    relatedDbs: ["biosample"],
    externalLinks: [
      { label: { ja: "NCBI BioProject", en: "NCBI BioProject" }, href: "https://www.ncbi.nlm.nih.gov/bioproject/" },
      { label: { ja: "EBI BioStudies", en: "EBI BioStudies" }, href: "https://www.ebi.ac.uk/biostudies/" },
    ],
  },
} satisfies DatabaseContent
```

### `satisfies` を使う理由

`as DatabaseContent` (型 assertion) を使うと、誤ったプロパティ値でも型エラーが出ない。`satisfies` は型に従うことを宣言しつつ、本体の literal 型を保つ:

- フィールドを書き忘れたら type error
- フィールドを誤った型で書いたら type error
- 余計なフィールドを書いたら type error

## 翻訳運用

### ja / en 並走

両言語を 1 ファイルに持つ:

```ts
body: {
  ja: <>...</>,
  en: <>...</>,
}
```

レビュー時に diff で両言語の差を確認できる。

### 未翻訳の扱い

en だけ書かれていない場合、Zod schema が `body.en` を必須にしているため build 時に弾かれる。「en は後追い」を許容するために 2 つの選択肢がある:

| 選択肢 | 採用 |
|---|---|
| en に「翻訳予定」のスタブを書く + route の `handle.i18n.en` を `"missing"` にして `<TranslationUnavailable />` を出す | ✓ 採用 |
| schema で `body.en` を `optional` にする | × (型上 en は必須として扱いたい、未提供は UI 側で明示) |

`i18n.md` の `<TranslationUnavailable />` バナーと連動する。en スタブの典型例:

```tsx
en: (
  <>
    <p>This page is not yet translated. See the Japanese version for now.</p>
  </>
),
```

### 翻訳完了 flag

route 単位の翻訳完了状態を `handle` に持たせる:

```ts
// app/routes/databases/$slug.tsx
export const handle = {
  i18n: { en: "complete" },  // "complete" | "missing" | "partial"
} as const
```

dynamic ルート (例: `databases/$slug`) で content の en が個別に欠落する場合は、route 側の handle を `"partial"` に下げる運用、または content 側の `body.en` をスタブで埋める運用の二択。リリース時点は前者を採用 (route handle はコンテンツ全体の最大値を表す)。

## Build と runtime の境界

| フェーズ | 何が起きるか |
|---|---|
| Build 時 | `validate:content` が全 collection (databases + services) を Zod parse、1 件でも失敗で fail |
| 起動時 | `loader.ts` が `import.meta.glob` で eager load + parse、1 件でも失敗で server / dev が起動失敗 |
| Runtime | `getDatabaseBySlug` / `getServiceById` / `listServicesByTopCategory` は in-memory lookup (1 度だけ初期化) |

Runtime には Zod parse の overhead がない (起動時に終わっている)。

## テスト

### Unit

- `tests/unit/lib/content/loader.test.ts`: 不正な fixture を持つ collection で `validateAll*` が `errors` を返す、`getDatabaseBySlug` / `getServiceById` が存在しない id で `undefined` を返す
- `tests/unit/content/databases/{bioproject,biosample}.test.tsx`: `DatabaseContent.parse(default)` が成功、`body.ja` / `body.en` が render 可能
- `tests/unit/content/services/coverage.test.ts`: submit `Service` enum の全 14 件が submit usage 付きの service entry を持つ (= flow card で URL が落ちない不変量)

### PBT

- `tests/pbt/schemas/content/database-content.pbt.test.ts`: 任意の有効な `DatabaseContent` 入力に対して Zod parse が成功
- `tests/pbt/schemas/content/service-content.pbt.test.ts`: 任意の有効な `ServiceContent` 入力に対して Zod parse が成功、無効な組み合わせ (top も submit も無い / top あるのに link 無い) で必ず失敗

### E2E

- `S-CONTENT-01`: `/databases/bioproject` を開いて、`<h1>` に "BioProject" が表示される、外部リンクが target を持つ、breadcrumb が `ホーム > データベース > BioProject` の順
- `S-CONTENT-02`: `/en/databases/bioproject` で英語版が表示される
- `E-CONTENT-01`: `/databases/unknown-slug` で 404 ページが表示される

