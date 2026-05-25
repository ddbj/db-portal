# Top Page

`/` (ja) と `/en` (en) で表示されるトップページの仕様。`app/routes/top/route.tsx` が SSOT。

トップは「DDBJ ポータルへの入口」として、検索ボックスを実質的なヒーローに据え、サービス一覧と最新ニュースへの導線を 2-col grid で構成する。

## 1. 全体構成

```
┌─ Header (NotificationBar / Breadcrumb は shell が自動描画)──────────┐
│ <main>                                                              │
│   Hero section                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │ <SearchBox size="lg" showScope={false}>          │              │
│   │ [example chip] [example chip] [example chip]     │              │
│   │ [→ クエリビルダーで詳細条件 を組む TextLink ]    │              │
│   └──────────────────────────────────────────────────┘              │
│                                                                     │
│   Main grid (2-col, lg 以降: 1fr right-pane)                        │
│   ┌──────────────────────┬───────────────────────┐                  │
│   │ <ServiceGrid />      │ <NewsAside />         │                  │
│   │ <PopularResources /> │   (sticky)            │                  │
│   └──────────────────────┴───────────────────────┘                  │
│ </main>                                                             │
└─ Footer (shell)────────────────────────────────────────────────────┘
```

NewsAside は **トップページのみ** で aside カラムに表示する (`shell.md §8.3`)。`ShellLayout` は NewsAside を embed しない。トップ route 側で explicit に呼ぶことで layout の単一責務を保つ。

## 2. routes/top/route.tsx

```tsx
import { HeroSection } from "~/features/top"
import { PopularResources } from "~/features/top"
import { ServiceGrid } from "~/features/top"
import { NewsAside } from "~/shell"

export const handle = { i18n: { en: "complete" } } as const

const TopRoute = () => (
  <div className="px-page-gutter">
    <div className="max-w-content-max mx-auto py-section-md grid gap-section-md lg:grid-cols-[1fr_var(--spacing-right-pane)]">
      <main className="flex flex-col gap-section-md min-w-0">
        <HeroSection />
        <ServiceGrid />
        <PopularResources />
      </main>
      <aside className="lg:sticky lg:top-section-sm self-start">
        <NewsAside />
      </aside>
    </div>
  </div>
)

export default TopRoute
```

`HeroSection` / `ServiceGrid` / `PopularResources` は `app/features/top/` 配下に置く (画面固有 component、`app/ui/` には入れない)。`NewsAside` は shell 共通 component を import する (トップでのみ消費、`shell.md §5`)。

## 3. Hero section

### 3.1 構成

- `SearchBox` (`size="lg"`, `showScope={false}`, `showSearchIcon`, `maxWidth=820`)
- 下に example chip 列 (3 件): クリックで `q` に投入、submit と等価 (UX 試行で 3 件固定)
- 右端に `<TextLink to="/search">` で「クエリビルダーで詳細条件を組む →」 リンク

### 3.2 onSubmit の挙動

- 入力値 `q` を受け、`/search/results?q=<encoded>` (ja) / `/en/search/results?q=<encoded>` (en) に navigate する
- DSL parse / serialize は `/search` ルート側でのみ実行する (top の hero は simple query を URL に渡すだけ)
- 空入力で submit された場合は `/search/results` (q 無し) に遷移、`/search/results` 側が「examples を提案」表示

### 3.3 i18n キー

| key | ja | en |
|---|---|---|
| `top.hero.placeholder` | "キーワード、accession、学名で検索" | "Search by keyword, accession, or organism" |
| `top.hero.submit` | "検索" | "Search" |
| `top.hero.advancedLink` | "クエリビルダーで詳細条件を組む" | "Open the query builder" |
| `top.hero.examplesLabel` | "例" | "Examples" |
| `top.hero.examples` | (3 件配列) | (3 件配列) |
| `top.hero.a11y.input` | "検索キーワード" | "Search keywords" |

Hero に独立した heading は置かない (SearchBox 自体が page の入口を兼ねる)。Header の wordmark + Footer の組織情報がブランド表示を担う。

## 4. Service tiles

### 4.1 データソース

`app/content/services/` collection の `top.category === "primary-service"` を `top.order` 昇順で取得する (`content-system.md §3.2`)。

リリース時点で 6 件:

| id | 表示 | link.kind | link target |
|---|---|---|---|
| `search` | 横断検索 / Cross-DB search | internal | `/search` (ja) / `/en/search` (en は features 側で prefix 補完) |
| `submit-nav` | 登録ナビ / Submission navigator | internal | `/submit` |
| `services-index` | サービス一覧 / Services | external | https://www.ddbj.nig.ac.jp/services/index.html |
| `supercomputer` | スパコン / Supercomputer | external | https://sc.ddbj.nig.ac.jp/ |
| `statistics` | 統計 / Statistics | external | https://www.ddbj.nig.ac.jp/statistics/index.html |
| `activity` | 活動報告 / Activities | external | https://www.ddbj.nig.ac.jp/activities/index.html |

Card 全体をクリッカブルにするため、`app/ui/link-card.tsx` の `LinkCard` primitive を使う。`LinkCard` は internal リンクなら `react-router` の `<Link>`、external リンクなら `<a target="_blank" rel="noopener noreferrer">` を内部で組み立てる (`app/ui/` zone なので生 `<a>` 使用が許容される)。features 側の `ServiceCard` (`app/features/top/service-card.tsx`) は `link.kind` を見て internal なら `lang` prefix を補った to を、external なら href をそのまま `LinkCard` に渡す。

### 4.2 グリッドと card design

- `grid-cols-2 gap-3` (`design/screens/01-top.notes.md` の "Service tiles" 通り)
- 各 card: 56×56 icon (`surface-subtle` bg, brand fg) + title (17px bold) + description (13px ink-soft)
- icon は `app/ui/icons/` の汎用 icon を流用する。Service ごとの専用 icon (検索 / 登録 / スパコン / 統計 / 活動 / サービス一覧) はリリース時点では汎用 icon (`SearchIcon` / `UserIcon` / `GlobeIcon` / `ExternalIcon` 等) で代替する
- 外部リンク card には右上に `ExternalIcon` (12px) を visual hint として表示

## 5. Popular Resources

### 5.1 データソース

`app/content/services/` collection の `top.category === "popular-ddbj"` / `top.category === "popular-dbcls"` を `top.order` 昇順で取得する。

リリース時点の構成 (`design/screens/01-top.notes.md` の DDBJ × 7 / DBCLS × 5):

| group | id | monogram | link | 備考 |
|---|---|---|---|---|
| popular-ddbj | `bioproject` | BP | internal `/databases/bioproject` | DatabaseContent 連動 |
| popular-ddbj | `biosample` | BS | internal `/databases/biosample` | DatabaseContent 連動 |
| popular-ddbj | `dra` | DR | external | DDBJ Sequence Read Archive |
| popular-ddbj | `annotation` | DA | external | DDBJ Annotated/MSS |
| popular-ddbj | `gea` | GE | external | Gene Expression Archive |
| popular-ddbj | `jga` | JG | external | Japanese Genotype-phenotype Archive |
| popular-ddbj | `metabobank` | MB | external | MetaboBank |
| popular-dbcls | `togovar` | TGV | external | TogoVar |
| popular-dbcls | `togogenome` | TGN | external | TogoGenome |
| popular-dbcls | `refex` | REX | external | RefEx |
| popular-dbcls | `togoid` | TGI | external | TogoID |
| popular-dbcls | `togotv` | TTV | external | TogoTV (tutorial) |

`/databases/:slug` が用意されている entry は internal link (`bioproject` / `biosample`)、他は外部 URL。後続フェーズで他 DB の DatabaseContent が追加されれば、entry 側で `link.kind` を内部に切り替えるだけで Popular Resources も自動的に portal 内に遷移する。

### 5.2 グリッドと card design

- `SectionHeading "Popular Resources"` を上に出す (TextLink の action は持たない)
- group label (`DDBJ` / `DBCLS`) は source 色の dot + Label brand 色で表示
- 各 group は `grid-cols-3 gap-2`
- 各 ResourceCard: 36×36 monogram (round 8, source color の 18%-alpha 背景 + source color の文字) + name (14px semibold) + 1 行 description (13px ink-soft)
- monogram の色は `Tag kind="source"` と同じ tone を使い、DDBJ = `src-ddbj`、DBCLS = `src-dbcls` token を `bg-src-ddbj-soft text-src-ddbj` のように適用する (`design/constraints.md §1`)

### 5.3 i18n キー

| key | ja | en |
|---|---|---|
| `top.serviceGrid.heading` | "DDBJ ポータルでできること" | "What you can do in DDBJ Portal" |
| `top.popularResources.heading` | "Popular Resources" | "Popular Resources" |
| `top.popularResources.groupDdbj` | "DDBJ" | "DDBJ" |
| `top.popularResources.groupDbcls` | "DBCLS" | "DBCLS" |

各 entry の title / description は collection 内の `title.{ja,en}` / `description.{ja,en}` を直接読む (i18n リソースには複製しない、SSOT は collection)。

## 6. NewsAside

`app/shell/news-aside.tsx` をそのまま消費する (詳細は `shell.md §5`)。

- `useQuery({ queryKey: ["news"], queryFn: fetchNews })` で取得
- 上位 8 件を slice (limit は client 側責任)
- 各 row: 日付 (mono) + Tag source DDBJ + Tag category + title link (1 行 ellipsis)
- heading + 「すべて見る」 link (`/news` / `/en/news`)
- 空 list の場合は `newsAside.empty` メッセージ
- ローディング中は `common.loading`

トップ以外で NewsAside を使う場面はリリース時点で無い (shell の `ShellLayout` は NewsAside を持たない、`shell.md §8.3`)。

## 7. NotificationBar 連動

`ShellLayout` 内の `NotificationBar` は全 page で表示される (top page でも他 page でも)。トップ固有のロジックは無い。表示条件 / sessionStorage 永続化 / close 動作は `shell.md §4` 参照。

## 8. SSR / hydration

- TopRoute は loader を持たない (Service tiles / Popular Resources は collection 起動時 load、News は TanStack Query)
- SSR では News fetch を `useQuery` の `prefetch` で行わない。TanStack Query の hydration はリリース時点で採用しないため、初回 client mount で fetch する
- 結果として SSR では `NewsAside` が loading / empty 状態でレンダリングされ、hydration 後に実データに置き換わる (initial paint で skeleton 相当の表示)

## 9. テスト

### 9.1 unit

- `tests/unit/routes/top.test.tsx`: TopRoute の 2-col grid 構成、`<HeroSection>` / `<ServiceGrid>` / `<PopularResources>` / `<NewsAside>` が DOM 上に存在、ja / en で正しい lang が引かれる (`createRoutesStub`)
- `tests/unit/features/top/service-grid.test.tsx`: services collection (mock) を渡して 6 tile が `top.order` 順に並ぶ
- `tests/unit/features/top/service-card.test.tsx`: internal link は `<Link>`、external link は `external` mode で render
- `tests/unit/features/top/popular-resources.test.tsx`: DDBJ / DBCLS グループに正しく振り分けられ、monogram が表示される

### 9.2 PBT

- `tests/pbt/content/services/schema-coverage.pbt.test.ts`: 任意の有効な `ServiceContent` 入力に対し Zod parse が成功、無効な組み合わせで失敗
- `tests/pbt/lib/routes-helpers/bilingual-symmetry.pbt.test.ts`: helper の path / id 対称性

### 9.3 E2E

- `S-TOP-01`: `/` 訪問で hero 検索ボックス + ServiceGrid + NewsAside + PopularResources が描画
- `S-TOP-02`: `/en` 訪問で en リソース表示、Service tile クリックで `/en/search` 等に遷移
- `S-TOP-03`: hero 検索ボックスで `cancer` を submit、`/search/results?q=cancer` に遷移、検索結果が表示される
- `E-TOP-01`: News mirror 起動前 (cache 空) の `/` で NewsAside の empty / loading 状態が崩れず表示される

## 10. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §1` | トップの機能領域定義 |
| `routes.md` | bilingualIndex helper による `/` / `/en` 配線 |
| `content-system.md §3.2` | ServiceContent schema |
| `shell.md §5` / `§8.3` | NewsAside の仕様とトップ embed 特例 |
| `search.md` | hero 検索ボックス submit 後の `/search/results` の挙動 |
| `news.md` | NewsAside / NotificationBar が消費する `/api/news` |
