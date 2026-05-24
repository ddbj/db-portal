# Content System

データベース解説や各種ガイドのコンテンツを、TypeScript ファイル (`*.content.ts`) として書く collection 方式を採用する。`architecture.md` の zones に従い、コンテンツは `app/content/` に集約する。

## 1. 方針

- コンテンツは **`*.content.ts`** ファイルとして書く。Markdown 直書きは採用しない
- `body.ja` / `body.en` は **TSX fragment 直書き**。リッチ表現 (Callout / Section / Table / TextLink) は `app/ui/` の primitive を JSX で使う
- Frontmatter 相当のメタ (title / slug / description / 関連 DB …) は **Zod schema で型検証**。ビルド時に壊れていれば即エラー
- Breadcrumb は content 側に書かず、**route hierarchy + i18n リソースで自動生成** する (§5)
- 翻訳は同一ファイル内 `{ ja, en }` 並びで持ち、diff が読みやすい形を取る

### 1.1 採用理由

| 方式 | 型安全 | リッチ表現 | i18n diff の読みやすさ | 将来の CMS 化 |
|---|---|---|---|---|
| `*.content.ts` (採用) | ◎ Zod schema | ◎ JSX | ◎ 同一ファイルに `{ja, en}` 並走 | ○ loader を差し替えるだけ |
| Markdown frontmatter + MDX | △ frontmatter schema 検証は別途 | ◎ | △ 別ファイル管理になりがち | ○ |
| Headless CMS | △ 型は別途 codegen | ○ | △ | ◎ |

リリース時点でコンテンツ数が限られているため、CMS 化のコストは見合わない。`*.content.ts` collection で出発し、将来必要なら loader を差し替える余地を持つ。

## 2. ディレクトリ構造

```
app/content/
├── databases/
│   ├── bioproject/
│   │   ├── index.content.ts        /databases/bioproject
│   │   ├── overview.content.ts     /databases/bioproject/overview
│   │   └── ...
│   ├── biosample/
│   │   ├── index.content.ts
│   │   └── ...
│   └── ...
└── services/                       (将来) 検索 / 登録 / その他サービス紹介の content collection
```

`app/lib/content/` に loader と型を置く:

```
app/lib/content/
├── loader.ts                       collection 列挙 + Zod 検証 + getBySlug / listAll
└── types.ts                        Collection 型 + index helper
```

Schema (Zod) は `app/schemas/content/` に置く:

```
app/schemas/content/
├── database-content.ts             DatabaseContent
└── (将来) service-content.ts 等
```

zone 関係は `architecture.md §3.1` を参照。`content` は `ui` / `lib` / `schemas` / `content` を import 可、`features` / `shell` は import 不可。

## 3. Schema

### 3.1 DatabaseContent

```ts
// app/schemas/content/database-content.ts
import { z } from "zod"
import type { ReactNode } from "react"

const Bilingual = z.object({
  ja: z.string(),
  en: z.string(),
})

const BilingualBody = z.object({
  ja: z.custom<ReactNode>(),
  en: z.custom<ReactNode>(),
})

const ExternalLink = z.object({
  label: Bilingual,
  href: z.string().url(),
})

export const DatabaseContent = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: Bilingual,
  description: Bilingual,
  body: BilingualBody,
  meta: z.object({
    lastUpdated: z.string().datetime(),
    relatedDbs: z.array(z.string()).default([]),
    externalLinks: z.array(ExternalLink).default([]),
  }),
})

export type DatabaseContent = z.infer<typeof DatabaseContent>
```

### 3.2 設計判断

- `body.ja` / `body.en` は `ReactNode` (Zod では `z.custom<ReactNode>()` で素通し)。Zod は構造検証しない (TSX は JSX runtime によって解釈される)
- `title` / `description` は string で型検証する。空文字や 1 文字レベルは Zod の `min(1)` で弾く判断はコンテンツポリシーに従う (リリース時は `string()` のみで運用)
- `meta.lastUpdated` は ISO 8601 文字列 (`z.string().datetime()`)。手書きで運用する (運用方法は `development.md`)
- **Breadcrumb はここに書かない** (§5 参照、route hierarchy + i18n で自動生成)

## 4. Loader

### 4.1 列挙と検証

`import.meta.glob` で collection を列挙し、起動時 (server / SSR) と build 時 (Vite plugin / 検証スクリプト) の **両方で** Zod parse を走らせる。

```ts
// app/lib/content/loader.ts (抜粋)
import { DatabaseContent } from "~/schemas/content/database-content"

const modules = import.meta.glob<{ default: unknown }>(
  "/app/content/databases/**/*.content.ts",
  { eager: true },
)

type Loaded = {
  filepath: string
  content: DatabaseContent
}

const loaded: Loaded[] = Object.entries(modules).map(([filepath, mod]) => ({
  filepath,
  content: DatabaseContent.parse(mod.default),
}))

const bySlug = new Map<string, Loaded>(loaded.map((l) => [l.content.slug, l]))

export function getDatabaseBySlug(slug: string): DatabaseContent | undefined {
  return bySlug.get(slug)?.content
}

export function listDatabases(): readonly DatabaseContent[] {
  return loaded.map((l) => l.content)
}

export function validateAll(): { ok: true } | { ok: false; errors: { filepath: string; error: unknown }[] } {
  const errors: { filepath: string; error: unknown }[] = []
  for (const [filepath, mod] of Object.entries(modules)) {
    const r = DatabaseContent.safeParse(mod.default)
    if (!r.success) errors.push({ filepath, error: r.error })
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
```

### 4.2 起動時 fail-fast

Server 起動時に `validateAll()` を呼び、1 件でも parse 失敗があれば **server を起動しない**。詳細な error log を stdout に吐き、CI / 運用での発見を容易にする。

```ts
// server/index.ts (抜粋、起動時)
import { validateAll } from "~/lib/content/loader"

const r = validateAll()
if (!r.ok) {
  for (const { filepath, error } of r.errors) {
    log.error("Content validation failed", { filepath, error })
  }
  process.exit(1)
}
```

### 4.3 ビルド時検証

CI で `npm run build` 前に collection を検証するスクリプトを実行する:

```jsonc
// package.json
{
  "scripts": {
    "validate:content": "node scripts/validate-content.mjs",
    "build": "npm run validate:content && react-router build"
  }
}
```

`scripts/validate-content.mjs` は `validateAll()` を呼ぶだけの thin wrapper。これにより:

- 不正なコンテンツが含まれる branch は CI で fail
- 起動時 fail と build 時 fail の二重ガードで「production で初めて気付く」事故を防ぐ

## 5. Breadcrumb 自動生成

### 5.1 方針

Content 側に breadcrumb を **書かない**。Route hierarchy から URL を、i18n リソースからラベルを引いて自動生成する。

### 5.2 route handle に i18n キーを仕込む

```ts
// app/routes.ts (抜粋)
route("databases", "routes/databases/layout.tsx", {
  handle: { breadcrumbI18nKey: "breadcrumb.databases" },
}, [
  route(":slug", "routes/databases/$slug.tsx", {
    // slug 依存ラベルは loader が動的に handle を返すパターン
    handle: { breadcrumbResolver: "database-content" },
  }),
])
```

### 5.3 Breadcrumb component

```tsx
// app/shell/Breadcrumb.tsx (抜粋)
import { useMatches } from "react-router"
import { useT } from "~/lib/i18n/use-t"

type BreadcrumbHandle =
  | { breadcrumbI18nKey: string }
  | { breadcrumbResolver: string }

export function Breadcrumb() {
  const matches = useMatches()
  const t = useT()
  const items = matches
    .map((m) => {
      const handle = m.handle as BreadcrumbHandle | undefined
      if (!handle) return null
      if ("breadcrumbI18nKey" in handle) {
        return { label: t(handle.breadcrumbI18nKey), href: m.pathname }
      }
      if ("breadcrumbResolver" in handle) {
        return resolveDynamic(handle.breadcrumbResolver, m)
      }
      return null
    })
    .filter((x): x is { label: string; href: string } => x !== null)
  return <nav aria-label="breadcrumb">{/* render items */}</nav>
}

function resolveDynamic(
  resolver: string,
  match: ReturnType<typeof useMatches>[number],
): { label: string; href: string } | null {
  switch (resolver) {
    case "database-content": {
      const data = match.data as { title?: { ja: string; en: string } } | undefined
      const label = data?.title?.ja ?? "" // useLang() で切替する実装に
      return { label, href: match.pathname }
    }
  }
  return null
}
```

### 5.4 利点

- Content (`*.content.ts`) で breadcrumb を書く必要がない (二重ソースなし)
- Route 構造を変えると breadcrumb も自動追従
- i18n ラベルは locale ファイルに集約 (翻訳が一箇所に集まる)

## 6. TSX fragment スコープ

### 6.1 Import 可能な範囲

`content` zone は次を import できる (`architecture.md §3.1`):

- `app/ui/` のリッチコンポーネント (Callout / Section / TextLink / Table / Definition …)
- `app/lib/` のヘルパ (例: link 生成、format ユーティリティ)
- `app/schemas/` の型 (`satisfies DatabaseContent` のために `_schema.ts` を import)
- `app/content/` 内の他コンテンツ (相互リンク等で参照する場合)

`app/features/` / `app/shell/` への import は **禁止**。コンテンツは feature ロジックに依存しない (依存させると content の差し替えが feature 修正を巻き込む)。

### 6.2 書き方の例

```tsx
// app/content/databases/bioproject/index.content.ts
import { Callout, TextLink, Section, Definition } from "~/ui"
import { DatabaseContent } from "~/schemas/content/database-content"

export default {
  slug: "bioproject",
  title: { ja: "BioProject", en: "BioProject" },
  description: {
    ja: "研究プロジェクトと、そこから生じるサンプル / シーケンスデータを束ねるメタデータ DB",
    en: "Metadata database that organizes research projects and the samples / sequence data derived from them",
  },
  body: {
    ja: (
      <>
        <Section title="BioProject とは">
          <p>BioProject は、研究プロジェクト単位で BioSample や配列データを統合管理するメタデータ DB です。</p>
        </Section>
        <Callout type="info">
          登録には DDBJ Account が必要です。詳細は <TextLink to="/submit">登録</TextLink> ページを参照してください。
        </Callout>
        <Definition>
          <dt>Primary BioProject</dt>
          <dd>個別の研究プロジェクトを表す BioProject。</dd>
          <dt>Umbrella BioProject</dt>
          <dd>複数の Primary BioProject を束ねる BioProject。</dd>
        </Definition>
      </>
    ),
    en: (
      <>
        <Section title="What is BioProject">
          <p>BioProject organizes BioSample and sequence data per research project.</p>
        </Section>
        <Callout type="info">
          Registration requires a DDBJ Account. See the <TextLink to="/en/submit">submit</TextLink> page.
        </Callout>
      </>
    ),
  },
  meta: {
    lastUpdated: "2026-05-21T00:00:00Z",
    relatedDbs: ["biosample", "dra", "ddbj-annotated"],
    externalLinks: [
      { label: { ja: "INSDC BioProject", en: "INSDC BioProject" }, href: "https://www.ncbi.nlm.nih.gov/bioproject/" },
    ],
  },
} satisfies DatabaseContent
```

### 6.3 `satisfies` を使う理由

`as DatabaseContent` (型 assertion) を使うと、誤ったプロパティ値でも型エラーが出ない。`satisfies` は型に従うことを宣言しつつ、本体の literal 型を保つ。これにより:

- フィールドを書き忘れたら type error
- フィールドを誤った型で書いたら type error
- 余計なフィールドを書いたら type error

## 7. 翻訳運用

### 7.1 ja / en 並走

両言語を 1 ファイルに持つ:

```ts
body: {
  ja: <>...</>,
  en: <>...</>,
}
```

レビュー時に diff で両言語の差を確認できる。

### 7.2 未翻訳の扱い

en だけ書かれていない場合、Zod schema が `body.en` を必須にしているため build 時に弾かれる。「en は後追い」を許容するために 2 つの選択肢がある:

| 選択肢 | 採用 |
|---|---|
| en に「翻訳予定」のスタブを書く + route の `handle.i18n.en` を `"missing"` にして `<TranslationUnavailable />` を出す | ✓ 採用 |
| schema で `body.en` を `optional()` にする | × (型上 en は必須として扱いたい、未提供は UI 側で明示) |

`i18n.md §5` の `<TranslationUnavailable />` バナーと連動する。en スタブの典型例:

```tsx
en: (
  <>
    <p>This page is not yet translated. See the Japanese version for now.</p>
  </>
),
```

### 7.3 翻訳完了 flag

route 単位の翻訳完了状態を `handle` に持たせる:

```ts
// app/routes/databases/$slug.tsx
export const handle = {
  i18n: { en: "complete" },  // "complete" | "missing" | "partial"
} as const
```

Content 単位で en が揃わない可能性もある。content collection 側でも flag を持ちたい場合は schema に `meta.translationStatus.en: z.enum(["complete", "partial", "missing"]).default("complete")` を追加する余地がある (本リリースは route 単位で十分)。

## 8. Build と runtime の境界

| フェーズ | 何が起きるか |
|---|---|
| Build 時 | `validate:content` が全 collection を Zod parse、1 件でも失敗で fail |
| 起動時 | `loader.ts` が `import.meta.glob` で eager load + `validateAll()`、1 件でも失敗で server 起動失敗 |
| Runtime | `getDatabaseBySlug` / `listDatabases` は in-memory lookup (1 度だけ初期化) |

Runtime には Zod parse の overhead がない (起動時に終わっている)。

## 9. テスト

### 9.1 Unit

- `tests/unit/lib/content/loader.test.ts`: 不正な fixture を持つ collection で `validateAll` が `errors` を返す、`getDatabaseBySlug` が存在しない slug で `undefined` を返す

### 9.2 PBT

- `tests/pbt/schemas/content/database-content.pbt.test.ts`: 任意の `DatabaseContent` 入力に対して `parse(stringify(serialize(x)))` が等価 (ReactNode を除く部分で round-trip 検証)
- `tests/pbt/lib/content/loader.pbt.test.ts`: 任意の slug 集合に対して `getDatabaseBySlug` の lookup が `O(1)` で正しい結果を返す

### 9.3 E2E

- `S-CONTENT-01`: `/databases/bioproject` を開いて、`<h1>` に "BioProject" が表示される、外部リンクが target を持つ、breadcrumb が `ホーム > データベース > BioProject` の順
- `S-CONTENT-02`: `/en/databases/bioproject` で英語版が表示される
- `E-CONTENT-01`: `/databases/unknown-slug` で 404 ページが表示される

## 10. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §3.1` | `content` zone の import 境界 |
| `architecture.md §6.1` | Build 時に確定するもの |
| `i18n.md §5` | `<TranslationUnavailable />` バナーとの連携 |
| `development.md` | `lastUpdated` 手書き運用、CI lint で commit timestamp 差分 warning |
