# Frontend

フロントエンド (`app/ui/` / `app/shell/` / `app/routes/top/` + `app/features/top/` / `app/content/` + `app/lib/content/`) の 4 領域を 1 本にまとめた SSOT。primitive のデザイン原則、global chrome、トップページ、コンテンツ collection をこの順で扱う。

## UI primitives

`app/ui/` 配下の primitive の **設計原則** と **横断ポリシー**。本書は API カタログではない: 各 primitive の Props 型 / variant 値 / class 構成は実装と `/_design` route が SSOT。

### デザインシステム SSOT

| 種類 | SSOT | 補足 |
|---|---|---|
| トークン値 (color / font / spacing / radius / shadow / tracking / leading) | `app/styles/tailwind.css` の `@theme` block | Tailwind v4 が utility class を自動生成 |
| primitive 実装 | `app/ui/*.tsx` のコード | Props 型、Variant 切替、class 構造はコードが最終形態 |
| primitive 使い方ガイド (本書) | `docs/frontend.md` | 設計原則 / 横断ポリシー / 視覚カタログの入口 |
| 視覚カタログ | `/_design` route (`app/routes/_design/`) | 全 primitive を variant × state で並べる。production build では除外 |
| 物理強制 | `eslint.config.ts` | 生 hex / arbitrary value / 生 HTML / zones の lint ルール |

トークン名 (`brand`, `fs-h2`, `section-md`, `tracking-tag`, `leading-snug` …) と意味の対応は `app/styles/tailwind.css` のコメントを参照する。本書では token 名で primitive の class を語り、px 値は書かない。

### 設計原則

#### トークン参照のみ

`@theme` で定義された token (`brand` / `ink` / `border-soft` / `radius-card` …) を Tailwind utility class (`bg-brand` / `text-ink` / `rounded-card` …) で参照する。`app/{features,routes,content}/` 配下で次は ESLint で物理禁止される (`architecture.md`):

- 生 hex literal (`"#6F4392"` のような文字列)
- arbitrary Tailwind value (`bg-[#6F4392]` / `text-[14px]` / `p-[3px]`)

`app/ui/` と `app/shell/` は arbitrary value を許容するが、生 hex は禁止される。新しい色や spacing が必要になったら、まず `@theme` に token を追加してから token utility 経由で参照する。0.5px 刻みのような半端値は token に置かない (drift の温床)。

#### `className` prop を外から受けない

各 primitive は `className?` を **受けない**。variant を表現するには `kind` / `tone` / `size` / `mono` などの semantic prop を追加する。これにより:

- 利用側がデザインを破る class を注入できない
- token を経由しない色 / spacing が漏れ込まない
- ESLint の生 hex / arbitrary value 禁止が確実に効く

レイアウト微調整は wrapper を 1 段被せるか、`Section` / `flex` 等のレイアウト primitive を組み合わせて表現する。

#### アクセシビリティを primitive 側で完結

操作可能要素は native `<button>` / `<a>` / `<input>` / `<select>` で実装する (div / span に `role` を後付けしない)。各 primitive で次を保証する:

- focus 表現は global `:focus-visible` (`@theme` の `--color-focus` yellow ring) を経由するだけ。各 primitive は focus 用 class を書かない
- icon-only button は `ariaLabel` 必須 (型レベルで強制)
- `aria-disabled` を `disabled` HTML 属性と lockstep
- 装飾 SVG は `aria-hidden="true"`、機能 SVG は親 `<button aria-label>` に内包
- modal は `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- table は `<caption className="sr-only">` + `<th scope="col" / scope="row">`

色だけで意味を伝えない: status critical / warning は text label + icon / shape を併用する。

#### zones

`app/ui/` は他の zone を import しない (`architecture.md`)。`app/ui/` 内部の primitive 同士は import 可。util (`cn` helper や icon 集約) も `app/ui/` 配下に置く。

### ファイル構成

`app/ui/` 配下に primitive ファイルと icons (`app/ui/icons/`) を置き、`app/ui/index.ts` で re-export する。外部 module からは `import { Button, Tag, Modal } from "~/ui"` で参照する。`Header` / `Footer` のような chrome は `app/shell/` 側 (本書「Shell」)。

### 共通規約

#### variant prop の表現

state 表現には次の prop 名を使う:

| prop | 採用 primitive 例 | 例 |
|---|---|---|
| `kind` | Button / Tag / Chip | `kind="primary"` / `kind="brand"` / `kind="filter"` |
| `tone` | Tag (status) / Callout | `tone="critical"` / `tone="warn"` |
| `size` | Button / Tag / SearchBox | `size="sm" \| "md" \| "lg"` |
| `mono` | Tag / Chip / Label | `mono` (boolean) |
| `selected` | Chip / FacetRow | `selected` (boolean) |
| `as` | Chip / SectionHeading | `as="a" \| "button"` / `as="h2" \| "h3"` |

新しい variant を増やすときは本書の対応セクションと `app/ui/` の primitive 定義を同時に更新する。

#### state 網羅

各 primitive で次の state を必ず実装 + テストする:

- default
- hover (clickable な場合; ホバーで色変化はしない、bundle 仕様)
- focus (global `:focus-visible` の yellow ring を頼る)
- disabled (`aria-disabled="true"` + `disabled` HTML 属性 + opacity 0.55 + `cursor-not-allowed`)
- checked / selected (該当 primitive)
- loading (該当 primitive)

#### forward 不可

`forwardRef` を必要に応じて使う (Modal の focus trap で trigger ref を返すケースなど)。`...rest` の spread は許容するが、`className` だけは pick して破棄する。

### primitive カテゴリ

各 primitive の Props 型 / class 骨格 / variant 一覧は **コードと `/_design` route が SSOT**。本書は各カテゴリで「何を担う primitive 群か」 と「特殊な制約」 のみ述べる。

- **Chrome** (`page.tsx` / `page-title.tsx` / `search-box.tsx`): ページ全体の wrapper、H1 + eyebrow、Top / Search で共通利用する一体型検索 input。`PageTitle` は 3px brand 左バーを持たない (バーは `SectionHeading` の予約)
- **Layout** (`section.tsx`): 垂直リズム + 中央寄せ + 横余白を担う wrapper。`padTop` / `padBottom` の token (`section-sm` / `section-mid` / `section-block` / `section-md` / `section-lg`) は `@theme` block が SSOT
- **Headings & Labels** (`section-heading.tsx` / `sidebar-heading.tsx` / `sidebar-group-label.tsx` / `label.tsx`): main column 用 `SectionHeading` は **brand 左バー付き**、sidebar 用 `SidebarHeading` は **バー無し** で見た目を切る。`Label` の `color` prop は token 表現外の動的色 (source palette 等) を受け取る逃げ道
- **Forms** (`button.tsx` / `icon-button.tsx` / `text-input.tsx` / `text-area.tsx` / `native-select.tsx` / `form-group.tsx` / `fmt-radio.tsx` / `fmt-check.tsx`): native `<button>` / `<input>` / `<select>` の thin wrapper。詳細は次節の error state policy を参照
- **Tags & Chips** (`tag.tsx` / `chip.tsx`): `Tag` は非インタラクティブ label、`Chip` はインタラクティブ pill。`Tag` は `kind: tag / brand / source / status` の discriminated union、`Chip` は `as: a | button` の 2 系統 (URL push か 状態変更か)
- **Facets** (`applied-filters.tsx` / `facet-group.tsx` / `facet-row.tsx` / `date-facet.tsx`): sidebar facet UI。`DateFacet` は segmented quick range + collapsible FROM/TO
- **Callout** (`callout.tsx`): inline notice、3 tone (info / warn / ok)、`role="status" | "alert"` を consumer 側が制御
- **Modal** (`modal.tsx` / `modal-preview.tsx`): root + Header / Body / Footer / Preview / Card の家族。詳細は次節の Modal core を参照
- **その他** (`pagination.tsx` / `link-card.tsx` / `text-link.tsx`): pagination は数字ボタン + 前 / 次 / ellipsis のミニマル実装。`LinkCard` / `TextLink` は **内部 link (RR `<Link>`) と外部 link (`<a target="_blank">`) を 1 primitive に統一**、外部は `rel="noopener noreferrer"` を自動付与

### Forms: error state と SR 連携

入力 primitive (`Button` を除く form control: TextInput / TextArea / NativeSelect / FmtRadio / FmtCheck) は、`state="warn"` のような視覚的エラー表現と、screen reader 向けの aria 関連付けを **同時に satisfy する**:

- `aria-invalid` は **state ベース** で primitive 側が自動付与する (`state="warn"` のとき `aria-invalid="true"`、default のとき false / 未設定)
- `aria-describedby` は consumer 側 (`FormGroup` の `errorId` / `hintId` など) が渡せるよう prop を開ける
- error message を表示する側 (`FormGroup` の hint 領域や Callout) は **必ず id を持ち**、その id を input の `aria-describedby` に流す
- placeholder は色情報のみで状態を示さない (placeholder text を error message として使わない)

`FormGroup` 自身は `<fieldset>` + `<legend>` で実装し、`num` + `label` を `<legend>` 内に置く。これにより radio / checkbox 群が単一の質問グループとして screen reader に announce される。1 input (TextInput 等) を子に持つ場合も `<fieldset>` で囲んで問題ない。

placeholder の色は global stylesheet (`app/styles/tailwind.css`) で `::placeholder { color: var(--color-ink-soft) }` を一括指定し、surface (white) 上でコントラスト比 4.5:1 を満たす。

`IconButton` の default size は AA 基準を満たす 26px。touch 主体の文脈 (mobile-first 画面、tap 連打が想定される UI) では consumer 側で `size={44}` を渡す。

### Modal: core 挙動

`Modal` (root) の挙動は code に書きにくい横断ポリシーなのでここで固定する:

- `open=false` のとき何も render しない (mount 状態は親が制御)
- Esc キーで `onClose` 発火 (`closeOnEscape={false}` で無効化)
- overlay click で `onClose` 発火 (dialog 内部 click は伝播停止扱い、pointerdown / click を組合せて drag-out closure を防ぐ。`closeOnOverlay={false}` で無効化)
- focus trap: open 時に dialog 内最初の focusable に focus 移動、Tab / Shift+Tab で dialog 内を循環、close 時に trigger 要素に focus 復元
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby={ariaLabelledby}` + `aria-describedby={ariaDescribedby}` (渡された場合)
- `width` の default は 820、`maxWidth` は `calc(100% - 64px)` で viewport を超えないようにする
- open 時に `document.body.style.overflow = "hidden"` で背景スクロールを抑止し、close 時に復元する

focus trap は外部 dependency を増やさず自前実装する (focus 候補は `:not([disabled]):not([aria-hidden])` の `button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])`、Tab で末尾→先頭・Shift+Tab で先頭→末尾を巻き戻す)。

`ModalPreview` は `<aside>` で render し、`flex-[0_0_44%]` で 2-col modal 内の右 44% 幅を取る (`ModalBody cols={2}` と組合わせる)。submit 系 modal で「保存したら出る FlowStep」 を予測表示する用途。

### トークン utility 生成と arbitrary value の許容範囲

Tailwind v4 は `@theme` 宣言から utility class を自動生成する (`--color-brand` → `bg-brand` / `text-brand` / `border-brand`、`--spacing-section-md` → `p-section-md` / `m-section-md`、`--text-fs-h2` → `text-fs-h2`、`--tracking-tag` → `tracking-tag`、`--leading-snug` → `leading-snug`、`--radius-card` → `rounded-card`、`--shadow-card` → `shadow-card`)。token の意味は `app/styles/tailwind.css` のコメントに添える。

`app/ui/` 内で arbitrary value を書くケース:

- 1px / 3px などの hairline・accent ライン (`border-l-[3px]` 等) で、token 化する価値が薄い細部値
- 1 箇所限定の layout 値 (`PageTitle` subtitle の `max-w-[1100px]`、`SearchBox` scope の `min-w-[140px]`、`ModalPreview` の `flex-[0_0_44%]` など)
- `style={{ color, fontSize, maxWidth }}` で動的に渡される値

`app/shell/` でも次は許容: vh / rem 単位 (`min-h-[60vh]` / `max-w-[10rem]` 等、`@theme` で表現しづらい単位)。「複数箇所で同じ値が出てきた」 「サイズ感を全体で揃えたい」 と感じたら `@theme` に token を追加して移行する。

### ESLint による物理強制

逸脱検出は `eslint.config.ts` が SSOT:

- `app/{features,routes,content}/`: 生 hex / arbitrary value 禁止、`react/forbid-elements` で生 `button` / `a` / `input` / `select` / `textarea` 禁止 (primitive 経由を強制)
- `app/{ui,shell}/`: 細部値 / vh / rem を許容、生 hex のみ禁止

### 視覚確認

dev 環境 (および `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` を有効化した env) で `/_design` route を生成する。`routes/_design/primitives.tsx` で全 primitive を variant × size × state すべて並べ、`routes/_design/tokens.tsx` で全 token を一覧表示する。production build では `app/routes.ts` で除外し 404 にする。

## Shell

`app/shell/` 配下の global layout 部品。Header / Footer / NotificationBar / NewsAside / Breadcrumb / TranslationUnavailable / ShellLayout の責務と組み立てを定義する。`app/root.tsx` がこれらを噛ませて全ページ共通の chrome を構築する。

### 責務分担

| ファイル | 役割 |
|---|---|
| `header.tsx` | wordmark + 主要 nav + lang 切替 + login button、active nav 判定 |
| `footer.tsx` | 組織情報 + 4 リンク (運営組織 / 利用規約 / プライバシー / アクセシビリティ) |
| `notification-bar.tsx` | 全ページ上部、announcement カテゴリ news を表示、close 永続化 |
| `news-aside.tsx` | トップ右ペイン compact news 8 件 + 「すべて見る」リンク |
| `breadcrumb.tsx` | `app/lib/content/breadcrumb.ts` の `useBreadcrumb` を消費して描画 |
| `translation-unavailable.tsx` | en page で翻訳が未完了の場合のバナー |
| `login-button.tsx` | `useAuth` の状態を見て「ログイン / ログアウト」 button を切替 |
| `switch-lang.tsx` | `/api/set-lang` に POST して言語切替する fetcher Form |
| `shell-layout.tsx` | Header / NotificationBar / Breadcrumb / `<Outlet />` / Footer を組み立てる wrapper |
| `index.ts` | 上記の re-export |

`app/shell/` は `app/ui/` の primitive と `app/lib/` の hook / helper を消費する。`app/features/` を import してはならない (`architecture.md` zones)。LoginButton / Footer / SwitchLang 等が BFF endpoint や外部 URL への `<a href>` を直接扱うため `react/forbid-elements` は除外、ただし `<button>` 等は primitive 経由を優先する。

### Header

#### 構成

```
[wordmark] ............................ [nav] [|] [SwitchLang] [LoginButton]
```

- wordmark: 左端、`/` への link
- nav: 中央-右寄せ、active nav に `aria-current="page"` + `text-brand font-bold`
- 縦区切り: `w-px h-[18px] bg-border-soft mx-2`
- SwitchLang: lang 切替リンク (cookie 更新で URL 不変、`i18n.md`)
- LoginButton: 認証 state を見て「ログイン / ログアウト」を出し分け

背景は `surface` (白)、下に `1px solid border-soft` の境界。紫ベタ / グラデーション / 上端帯は使わない。

#### nav 構成

ja / en で同じ構造、文言だけ i18n リソースから引く。wordmark が top page リンクを兼ねるため top は nav に含めない。news は nav に置かず、トップ右ペインの NewsAside + `/news` 直リンクで誘導する。

| key | i18n key | kind | 遷移先 | active 条件 |
|---|---|---|---|---|
| search | `nav.search` | internal | `/search` | path が `/search` 始まり (results 含む) |
| submit | `nav.submit` | internal | `/submit` | path が `/submit` 始まり |
| about | `nav.about` | external | `https://bsi.rois.ac.jp` | 外部リンクのため active 判定対象外 |

`/databases/:slug` は top-level nav に含まない (deep page、active = null)。about は外部 URL なので `<a target="_blank" rel="noopener noreferrer">` + ExternalIcon で開く。

#### active 判定

`useLocation.pathname` を見て NAV_ITEMS の internal item を順に走査し、`pathname === item.path` または `pathname.startsWith(item.path + "/")` で active id を返す。external item は active 判定の対象外。Header には optional `active` prop を用意して上位から override 可能 (テスト用)。

#### LoginButton

`app/lib/auth/use-auth.ts` の `useAuth` を呼び、state によって以下を出し分ける:

| `useAuth.status` | 表示 | 遷移先 |
|---|---|---|
| `"loading"` | skeleton (spinner) | — |
| `"unauthenticated"` | "ログイン" button | `buildLoginUrl({ returnTo: pathname })` |
| `"authenticated"` | user icon + display name + ドロップダウン (展開で "ログアウト" button) | `buildLogoutUrl({ returnTo: pathname })` |

returnTo はクライアントから渡す。`buildLoginUrl` / `buildLogoutUrl` は同一 origin 検証して `/` 始まり以外を `/` に正規化する (`auth.md`)。

#### SwitchLang

`/api/set-lang` resource route に POST する fetcher Form で実装する (`i18n.md`)。URL は不変、root loader が revalidate されて全画面が新 lang で再 render される。Globe icon を左に、text に "JA / EN" 切替の意味を持たせる ("Switch to English" / "日本語" を i18n リソースから引く)。

### Footer

`background: ink` (`#1A1726`)、文字 `text-white`。組織情報 (左) と 4 リンク (右) の `justify-between`。

```
[DDBJ — Bioinformation and DDBJ Center / National Institute of Genetics · ROIS / BSI]
                                                                   [運営組織] [利用規約] [プライバシー] [アクセシビリティ]
```

リンク先は i18n リソース駆動 (DDBJ 既存サイトの各 page へ向ける)。

### NotificationBar

#### 表示条件

`/api/news` から取得した news のうち以下を満たすものを 1 件表示:

- `category === "announcement"`
- 表示済みリスト (`dismissedIds` を sessionStorage に保持) に含まれていない

#### 順序

複数件が条件を満たす場合は **`publishedAt` 降順 (新しい順)**。優先度フィールドは持たない (時系列のみで決定)。

#### close 動作

close button (× IconButton) を押すと:

1. sessionStorage の `dbPortal.notificationBar.dismissed` に `newsId` を追加
2. 次の候補があれば自動的に表示、なければ bar 自体を hide

sessionStorage を採用するのは「tab を閉じるまでは再表示しない、次の session では再評価」 の挙動が望ましいため (cookie だと長期で抑制されすぎる、localStorage だと永久に閉じてしまう)。

#### 構成

```
[Tag status critical "重要"]  [mono date]  [title link]  ............................. [詳細 →]  [× close]
```

- 帯背景: `surface-subtle`、上下 1px `border-soft`
- Tag は `kind="status" tone="critical"`、size sm
- date: mono `text-ink-soft text-fs-label`
- title: `text-ink font-medium`、hover で underline
- 「詳細 →」: `app/ui/text-link.tsx` 経由で news 詳細 URL へ
- × close: `app/ui/icon-button.tsx`、`ariaLabel={t("notificationBar.close")}`

#### SSR hydration

sessionStorage は client 専用。SSR では「全件未読」前提で 1 件表示し、hydration 後に sessionStorage を読んで dismissed を反映する。これにより hydration mismatch を避けつつ、SSR でも初回 paint で notification が見える。

### NewsAside

トップページ右ペイン専用 (sticky positioning)。ヘッダー高さを除いた viewport 高さに追従し、8 件の compact news list を表示する。

#### 表示

- heading: `SectionHeading` で `t("newsAside.heading")` (= "お知らせ")、右に `t("newsAside.viewAll")` link
- 各 row:
  - 日付 (mono, `text-ink-soft text-fs-label`)
  - `Tag kind="source" name="DDBJ"`
  - `Tag kind="tag"` (category、例 "リリース")
  - title link (1 行 ellipsis)

#### 取得

`app/lib/api/news.ts` の `fetchNews` を TanStack Query で呼び、上位 8 件を slice する (limit は client 側責任)。hook は `app/shell/news-aside.tsx` 内に置く (features を import すると zones を超えるため)。

### Breadcrumb

`app/shell/breadcrumb.tsx` は `app/lib/content/breadcrumb.ts` の `useBreadcrumb` を消費し、結果を `<nav aria-label={t("a11y.breadcrumbNav")}>` で wrap するだけの薄い UI 層。表示形式は `[ホーム] > [データベース] > [BioProject]`、先頭は `t("breadcrumb.home")` + ホームへの link、末尾は `aria-current="page"`、区切りは `›` (U+203A、`aria-hidden`)。仕様詳細は本書「Content system」の「Breadcrumb 自動生成」を参照。

### TranslationUnavailable

#### 表示条件

現在の lang が `en` かつ、route handle の `i18n.en` が `"complete"` 以外 (`useMatches` を辿り、いずれかの match が条件を満たす場合)。親 layout は handle を持たず、子 route が宣言する。

ja 側の route handle には `i18n` flag を **書かない** (ja default なので flag 不要、不在 = complete とみなす)。ja で missing キーは PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) が許さない。

route handle 規約は `architecture.md` の「route handle 規約」 を参照。

#### 表示位置

`ShellLayout` 内で Header と main の間、NotificationBar の **下**、Breadcrumb の **上** に出す (banner 性質、route content より上)。

#### 構成

```
[i icon] {t("translationUnavailable.title")}
         {t("translationUnavailable.description")}
                                           [Switch to Japanese link]
```

- 背景: `surface-subtle`、border `border-soft`
- title: `text-ink font-semibold text-fs-body`
- description: `text-ink-mid text-fs-body-sm`
- Switch link: `/api/set-lang` に POST する fetcher Form (cookie 更新 / URL 不変)

`Callout tone="info"` を流用してもよいが、action link を含めたいので shell 側に専用 component として置く。

#### missing key の挙動

`react-i18next` の `fallbackLng: "ja"` により、en リソースに無いキーは ja の値が render される (`i18n.md`)。これにより:

- 翻訳の一部が欠落していても画面は壊れない (ja でフォールバック)
- TranslationUnavailable バナーで「日本語で表示している」 状態を可視化
- ユーザーは Switch link で能動的に ja に切替可能 (URL 不変)

route handle に `i18n.en === "complete"` を書いたものはバナー非表示。ja default 設計なので en 側の翻訳が出揃った時点で flag を更新する運用。

### ShellLayout

`app/shell/shell-layout.tsx` が `app/root.tsx` から呼ばれる。

#### 構成

```
Page
├ SkipLink
├ Header
├ NotificationBar
├ TranslationUnavailable
├ Breadcrumb
├ <main id="main">{children}</main>
└ Footer
```

- `Page` は `app/ui/page.tsx` (font / color baseline)
- `Header` は内部で `useLocation` + `useLang` から active nav を導出 (props で渡さない)
- `main` に `id="main"` を付け、`SkipLink` の遷移先にする
- `SkipLink` は Header の **上** に置く sr-only な link で、Tab で focus したときだけ可視化する

#### トップページ特例

`/` (top page) では `<main>` の中身を 2-col grid にして右側に `NewsAside` を出す。ShellLayout はこの分岐を **持たない** (NewsAside の配置はトップ route 側で組み立てる、layout を pure に保つ)。`NewsAside` 自体は `app/shell/` 配下に置くが、layout に embed せず route から explicit に import して使う。

### i18n 統合

`app/lib/i18n/` の `createI18nInstance(lang)` を 1 request ごとに呼び、`<I18nextProvider>` に渡す。これにより SSR の並列 request で `changeLanguage` のレースが発生しない (`i18n.md`)。module-level の global instance は持たない。

shell が直接消費するキー namespace は `common` / `nav` / `breadcrumb` / `auth` / `switchLang` / `notificationBar` / `newsAside` / `translationUnavailable` / `footer` / `a11y`。実体は `app/lib/i18n/resources/{ja,en}.ts` が SSOT。ja と en でキーセットは完全一致させる (`i18n.md` PBT で担保)。

## Top route

`/` で表示されるトップページの仕様。`app/routes/top/route.tsx` が SSOT。

トップは「DDBJ ポータルへの入口」として、検索ボックスを実質的なヒーローに据え、サービス一覧と最新ニュースへの導線を 2-col grid で構成する。

### 全体構成

ShellLayout が Header / NotificationBar / Breadcrumb / Footer を描画した上で、TopRoute は `<main>` に Hero section と「ServiceGrid + PopularResources の左カラム / NewsAside の右カラム」 の 2-col grid (`lg` 以降は `1fr right-pane`) を組み立てる。NewsAside は **トップページのみ** で aside カラムに表示する。`ShellLayout` は NewsAside を embed せず、トップ route 側で explicit に呼ぶことで layout の単一責務を保つ。

```
┌─────────────────────────────────────────────────────────────┐
│  Hero (SearchBox + scope + examples + advanced link)         │
├──────────────────────────────────┬──────────────────────────┤
│  ServiceGrid (2x3 = 6 tiles)     │                          │
│                                  │  NewsAside               │
│  PopularResources                │  (sticky, 8 items)       │
│    DDBJ group (3 cols × 3)       │                          │
│    DBCLS group (3 cols × 2)      │                          │
└──────────────────────────────────┴──────────────────────────┘
```

`HeroSection` / `ServiceGrid` / `PopularResources` は `app/features/top/` 配下に置く (画面固有 component、`app/ui/` には入れない)。`NewsAside` は shell 共通 component を import する。

### Hero section

#### 構成

- `SearchBox` (`size="lg"`, `showSearchIcon`, `maxWidth=820`, scope selector あり)
- scope の選択肢は `SCOPE_KEYS = ["all", ...DB_SLUGS]`、初期値は `"all"` (= "全データベース")
- 下に example chip 列 (3 件): クリックで `q` に投入、submit と等価 (UX 試行で 3 件固定)
- 右端に「クエリビルダーで詳細条件を組む →」 リンク (`/search` への TextLink)

#### onSubmit の挙動

- 入力値 `q` と scope を受け、`/search/results?q=<encoded>` に navigate する
- scope が `"all"` 以外なら `db=<slug>` を URL に付加 (`scopeKeyToDbSlug` で変換)
- DSL parse / serialize は `/search` ルート側でのみ実行する (top の hero は simple query を URL に渡すだけ)
- 空入力で submit された場合は `/search/results` (q 無し、scope に応じた `db` のみ) に遷移、`/search/results` 側が「examples を提案」表示

#### i18n キー

| key | ja | en |
|---|---|---|
| `top.hero.placeholder` | "キーワード、accession、学名で検索" | "Search by keyword, accession, or organism" |
| `top.hero.submit` | "検索" | "Search" |
| `top.hero.advancedLink` | "クエリビルダーで詳細条件を組む" | "Open the query builder" |
| `top.hero.examplesLabel` | "例" | "Examples" |
| `top.hero.examples` | (3 件配列) | (3 件配列) |
| `top.hero.a11y.input` | "検索キーワード" | "Search keywords" |
| `top.hero.a11y.scope` | "検索対象データベース" | "Database scope" |

Hero に独立した heading は置かない (SearchBox 自体が page の入口を兼ねる)。Header の wordmark + Footer の組織情報がブランド表示を担う。

### Service tiles

#### データソース

`app/content/services/` collection の `top.category === "primary-service"` を `top.order` 昇順で取得する (本書「Content system」)。

現状 6 件:

| id | 表示 | link.kind | link target |
|---|---|---|---|
| `search` | 横断検索 / Cross-DB search | internal | `/search` |
| `submit-nav` | 登録ナビ / Submission navigator | internal | `/submit` |
| `services-index` | サービス一覧 / Services | external | https://www.ddbj.nig.ac.jp/services/index.html |
| `supercomputer` | スパコン / Supercomputer | external | https://sc.ddbj.nig.ac.jp/ |
| `statistics` | 統計 / Statistics | external | https://www.ddbj.nig.ac.jp/statistics/index.html |
| `activity` | 活動報告 / Activities | external | https://www.ddbj.nig.ac.jp/activities/index.html |

Card 全体をクリッカブルにするため、`app/ui/link-card.tsx` の `LinkCard` primitive を使う。`LinkCard` は internal なら `react-router` の `<Link>`、external なら `<a target="_blank" rel="noopener noreferrer">` を内部で組み立てる。

#### グリッドと card design

- `grid-cols-2 gap-3`
- 各 card: 56×56 icon (`surface-subtle` bg, brand fg) + title (17px bold) + description (13px ink-soft)
- icon は `app/ui/icons/` の汎用 icon を流用する (`SearchIcon` / `UserIcon` / `GlobeIcon` / `ExternalIcon` 等)。Service 専用 icon は持たない
- 外部リンク card には右上に `ExternalIcon` (12px) を visual hint として表示

### Popular Resources

#### データソース

`app/content/services/` collection の `top.category === "popular-ddbj"` / `top.category === "popular-dbcls"` を `top.order` 昇順で取得する。

現状の構成 (DDBJ × 7 / DBCLS × 5):

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

`/databases/:slug` が用意されている entry は internal link (`bioproject` / `biosample`)、他は外部 URL。他 DB の DatabaseContent が追加されれば、entry 側で `link.kind` を内部に切り替えるだけで Popular Resources も自動的に portal 内に遷移する。

#### グリッドと card design

- `SectionHeading "Popular Resources"` を上に出す (TextLink の action は持たない)
- group label (`DDBJ` / `DBCLS`) は source 色の dot + Label brand 色で表示
- 各 group は `grid-cols-3 gap-2`
- 各 ResourceCard: 36×36 monogram (round 8, source color の 18%-alpha 背景 + source color の文字) + name (14px semibold) + 1 行 description (13px ink-soft)
- monogram の色は `Tag kind="source"` と同じ tone を使い、DDBJ = `src-ddbj`、DBCLS = `src-dbcls` token を `bg-src-ddbj-soft text-src-ddbj` のように適用する

#### i18n キー

| key | ja | en |
|---|---|---|
| `top.serviceGrid.heading` | "DDBJ ポータルでできること" | "What you can do in DDBJ Portal" |
| `top.popularResources.heading` | "Popular Resources" | "Popular Resources" |
| `top.popularResources.groupDdbj` | "DDBJ" | "DDBJ" |
| `top.popularResources.groupDbcls` | "DBCLS" | "DBCLS" |

各 entry の title / description は collection 内の `title.{ja,en}` / `description.{ja,en}` を直接読む (i18n リソースには複製しない、SSOT は collection)。

### NewsAside / NotificationBar

トップは右ペインで `app/shell/news-aside.tsx` を消費する。詳細仕様 (取得 / 表示 / 空・loading) は本書「Shell」の「NewsAside」を参照。NewsAside はトップ専用で、`ShellLayout` には含めない (route 側で explicit に呼ぶ)。

NotificationBar は `ShellLayout` 経由で全 page に出る。トップ固有のロジックは無く、仕様詳細は本書「Shell」の「NotificationBar」を参照。

### SSR / hydration

- TopRoute は loader を持たない (Service tiles / Popular Resources は collection 起動時 load、News は TanStack Query)
- SSR では News fetch を `useQuery` の `prefetch` で行わない (TanStack Query の hydration は採用していない)。初回 client mount で fetch する
- 結果として SSR では `NewsAside` が loading / empty 状態でレンダリングされ、hydration 後に実データに置き換わる (initial paint で skeleton 相当の表示)

## Content system

データベース解説、サービス紹介、各種ガイドのコンテンツを TypeScript ファイル (`*.content.tsx`) として書く collection 方式を採用する。`architecture.md` の zones に従い、コンテンツは `app/content/` に集約する。

### 方針

- コンテンツは **`*.content.tsx`** ファイルとして書く。Markdown 直書きは採用しない
- 長文の本文 (`body.ja` / `body.en`) は **TSX fragment 直書き**。リッチ表現 (Callout / Section / Table / TextLink) は `app/ui/` の primitive を JSX で使う
- Frontmatter 相当のメタ (title / slug / description / 関連 DB / 外部リンク / サービス分類) は **Zod schema で型検証**。ビルド時に壊れていれば即エラー
- Breadcrumb は content 側に書かず、**route handle + i18n リソースで自動生成** する
- 翻訳は同一ファイル内 `{ ja, en }` 並びで持ち、diff が読みやすい形を取る

代替案 (Markdown / MDX / Headless CMS) との比較と却下理由は `decisions.md` の「コンテンツは `*.content.tsx`」 を参照。

### ディレクトリ構造

```
app/content/
├── databases/
│   ├── bioproject/index.content.tsx   → /databases/bioproject
│   └── biosample/index.content.tsx    → /databases/biosample
└── services/
    ├── bioproject.content.tsx          BioProject (top + submit 兼任)
    ├── biosample.content.tsx           BioSample (top + submit 兼任)
    ├── search.content.tsx              portal 内検索 (top primary tile)
    ├── submit-nav.content.tsx          portal 内登録ナビ (top primary tile)
    ├── supercomputer.content.tsx       NIG スパコン (top primary tile, external)
    ├── ...
    ├── humandbs.content.tsx            humandbs (submit-only)
    └── jpost.content.tsx               jPOST (submit-only)
```

対応する Zod schema は `app/schemas/content/{database-content.ts, service-content.ts}` に置く。loader / type / breadcrumb hook は `app/lib/content/` に置く (`loader.ts` / `breadcrumb.ts` / `types.ts` / `index.ts`)。

zone 関係は `architecture.md` を参照。`content` は `ui` / `lib` / `schemas` / `content` を import 可、`features` / `shell` への import は禁止 (ESLint `no-restricted-paths` で物理強制)。

### DatabaseContent

`/databases/:slug` 各エントリの schema。フィールド一覧:

| フィールド | 型 | 備考 |
|---|---|---|
| `slug` | kebab-case 文字列 | URL の `:slug` と一致 |
| `title` | `{ ja, en }` 各 min(1) | |
| `description` | `{ ja, en }` 各 min(1) | 1 行説明 |
| `body` | `{ ja: ReactNode, en: ReactNode }` | TSX fragment、Zod では `z.custom<ReactNode>` で素通し |
| `meta.lastUpdated` | ISO 8601 文字列 | 手書きで運用 (`development.md` の content 更新フロー) |
| `meta.relatedDbs` | `DatabaseSlug` enum の配列 | 実装済み slug union に narrow、未知 / タイポは build 時に弾く。新規 DB を追加する時は `DatabaseSlug` enum にも追記する |
| `meta.externalLinks` | `{ label: { ja, en }, href: URL }` の配列 | INSDC / EBI / NCBI 等への外部リンク集 |

実装側 (`app/content/databases/<slug>/index.content.tsx`) は `satisfies DatabaseContent` で書き、フィールド書き忘れ / 型違い / 余計なフィールドが全て type error になるようにする。

Breadcrumb は本 schema に書かない (route handle + i18n で自動生成、後述)。

### ServiceContent

サービス情報 (検索 / 登録 / 各種 DB / 外部サービス) を 1 collection に集約する。トップページの Service tiles / Popular Resources と submit feature の外部 CTA リンクが同じ source を共用する。

フィールド一覧:

| フィールド | 型 | 備考 |
|---|---|---|
| `id` | kebab-case 文字列 | submit feature 用 entry は submit `Service` enum の値と一致させる |
| `title` | `{ ja, en }` 各 min(1) | |
| `description` | `{ ja, en }` 各 min(1) | |
| `link` | `{ kind: "internal", to: "/..." }` または `{ kind: "external", href: URL }` | optional、ただし top usage がある場合は必須 |
| `top` | TopUsage (下表) | optional。トップでの表示分類 |
| `submit` | SubmitUsage (下表) | optional。submit feature での参照 |

`.refine` で次を担保:

- top と submit の少なくとも一方が必須
- top usage がある場合は link 必須

#### TopUsage の category 分岐

| category | 追加フィールド | 表示位置 |
|---|---|---|
| `primary-service` | `order` (非負整数) | トップの Service tile grid (左 main 上段、6 件) |
| `popular-ddbj` | `order` + `monogram` (2-3 文字大文字英数) | Popular Resources DDBJ 群 |
| `popular-dbcls` | `order` + `monogram` | Popular Resources DBCLS 群 |

`order` は各カテゴリ内の表示順。`monogram` は "BP" / "BS" / "DR" / "TGV" のような 2-3 文字。`primary-service` には monogram を要求しない (Service icon を別途持つため)。`order` の重複は手動管理。

#### SubmitUsage

| フィールド | 型 | 備考 |
|---|---|---|
| `service` | submit `Service` enum | flow card / preview card で参照される |
| `externalUrl` | URL | 外部 CTA リンク先 |
| `source` | `"DDBJ" \| "DBCLS"` または null | tag 表示用 |
| `accessionPlaceholders` | 文字列配列 | step カード上の placeholder 例 |

`submit-only` の entry (humandbs / dbcls / jpost / eva / dgva 等) は `top` を持たず、`link` も持たない (submit 外部 CTA でだけ参照される)。

### Loader 公開 API

| 関数 | 返却 |
|---|---|
| `getDatabaseBySlug(slug)` | `DatabaseContent \| undefined` |
| `listDatabases()` | `readonly DatabaseContent[]` |
| `validateAllDatabases()` | `ValidationResult<DatabaseContent>` |
| `getServiceById(id)` | `ServiceContent \| undefined` |
| `listServices()` | `readonly ServiceContent[]` |
| `listServicesByTopCategory(category)` | `readonly ServiceContent[]` (`top.order` 昇順) |
| `getServiceBySubmit(service)` | `ServiceContent \| undefined` (submit Service enum 値で逆引き) |
| `validateAllServices()` | `ValidationResult<ServiceContent>` |

CLI (`scripts/validate-content.ts`) は両 `validateAll*` を順に呼び、どちらかが失敗すれば `process.exit(1)` する。

### 起動時 fail-fast

`loader.ts` は `import.meta.glob` で `*.content.tsx` を eager load + Zod parse する。1 件でも parse 失敗があれば module top で throw し、loader を import した時点で起動を止める。

`server/index.ts` は zones の制約 (`server → app/lib` 禁止) で loader を直接 import しない。代わりに、`npm run dev` / `npm run start` / `npm run build` の前段で `npm run validate:content` を必ず通すことで、collection 不整合を起動前に検出する。dev / staging / production / CI すべてで同じ fail-fast が効き、「production で初めて気付く」 事故を防ぐ。

server プロセスを `node server/index.ts` のように直接起動した場合は破損 content が runtime まで検知されない。`npm run *` 経由で `validate:content` を必ず前置する運用が fail-fast の唯一の担保となる。

### Breadcrumb 自動生成

#### 方針

Content 側に breadcrumb を **書かない**。Route handle に i18n キー (または resolver 名) を持たせ、`useBreadcrumb` hook が `useMatches` を走査して構築する。shell 側 (`app/shell/breadcrumb.tsx`) は hook の結果を `<nav aria-label>` で wrap するだけの薄い UI 層。

#### Static / Dynamic ラベル

| handle | ラベル解決 | 用途 |
|---|---|---|
| `breadcrumbI18nKey: "breadcrumb.databases"` | `t(key)` | 中間 segment (例: "データベース") |
| `breadcrumbResolver: "database-content"` | resolver 関数で `{ label, href }` | 末尾 segment (例: BP の title を content から引く) |

`breadcrumbI18nKey` に存在しないキー (typo 等) が渡されたとき、hook は i18next default に従いキー文字列そのものをラベルとして返す (item は skip しない)。typo を visible に出すことで dev で早期に気付かせるための挙動。

#### useBreadcrumb hook

`app/lib/content/breadcrumb.ts` の `useBreadcrumb(options?)` に集約する。

- 引数 `options.resolvers` は resolver 名 → resolver 関数の dict
- resolver 関数の入力: `{ data, pathname, params }`
- resolver の出力: `{ label, href }` または `null` (`null` を返した match は item を生やさない)

hook は `useMatches` を順に走査し、handle に `breadcrumbI18nKey` / `breadcrumbResolver` を持つ match を処理して `BreadcrumbItem[]` を返す。resolver は features/lib のヘルパに依存しないよう、shell 側で `~/lib/content/loader` の `listDatabases` / `getServiceById` を直接読んで組み立てる。

#### 表示しないケース

0-1 件 (= top のみ) を返した場合、何も render しない (`null`)。top page で breadcrumb が冗長になるのを避けるため。

#### 利点

- Content (`*.content.tsx`) で breadcrumb を書く必要がない (二重ソースなし)
- Route 構造を変えると breadcrumb も自動追従
- i18n ラベルは locale ファイルに集約 (翻訳が一箇所に集まる)

### TSX fragment スコープ

#### Import 可能な範囲

`content` zone は次を import できる (`architecture.md`):

- `app/ui/` のリッチコンポーネント (Callout / Section / TextLink / Tag / SectionHeading 等)
- `app/lib/` のヘルパ (URL 生成 / format 等)
- `app/schemas/` の型 (`satisfies DatabaseContent` のため)
- `app/content/` 内の他コンテンツ (相互リンク等)

`app/features/` / `app/shell/` への import は **禁止**。コンテンツは feature ロジックに依存させない (依存させると content の差し替えが feature 修正を巻き込む)。

#### 生 HTML 要素の制約

ESLint `react/forbid-elements` (`app/{features,routes,content}/**`) で次を禁止する:

| 要素 | 代替 |
|---|---|
| `<button>` | `~/ui` の `Button` / `IconButton` |
| `<a>` | `~/ui` の `TextLink` または `react-router` の `Link` |
| `<input>` | `~/ui` の form primitive |
| `<select>` | `~/ui` の `NativeSelect` |
| `<textarea>` | `~/ui` の form primitive (必要なら primitive を追加) |

許容される構造タグ: `<p>` / `<div>` / `<ul>` / `<ol>` / `<li>` / `<dl>` / `<dt>` / `<dd>` / `<h2>` / `<h3>` / `<strong>` / `<em>` 等。生 hex / Tailwind arbitrary value は ESLint で禁止される。

### 翻訳運用

#### ja / en 並走

両言語を 1 ファイルに持つ (`body: { ja: <>...</>, en: <>...</> }`)。レビュー時に diff で両言語の差を確認できる。

#### 未翻訳の扱い

en だけ書かれていない場合、Zod schema が `body.en` を必須にしているため build 時に弾かれる。「en は後追い」を許容するために、`body.en` には「This page is not yet translated. See the Japanese version for now.」のような翻訳予定スタブを書き、route の `handle.i18n.en` を `"missing"` にして `<TranslationUnavailable />` バナーを出す運用とする。schema 側で `body.en` を optional にする案は不採用 (型上 en は必須として扱い、未提供は UI 側で明示する)。

#### 翻訳完了 flag

route 単位の翻訳完了状態を `handle.i18n.en` (`"complete"` / `"missing"` / `"partial"`) で持つ。dynamic ルート (`databases/$slug` 等) で content の en が個別に欠落する場合は、route 側の handle を `"partial"` に下げる運用 (route handle はコンテンツ全体の最大値を表す)。

### Build と runtime の境界

| フェーズ | 何が起きるか |
|---|---|
| Build 時 | `validate:content` が全 collection (databases + services) を Zod parse、1 件でも失敗で fail |
| 起動時 | `loader.ts` が `import.meta.glob` で eager load + parse、1 件でも失敗で server / dev が起動失敗 |
| Runtime | `getDatabaseBySlug` / `getServiceById` / `listServicesByTopCategory` は in-memory lookup (1 度だけ初期化) |

Runtime には Zod parse の overhead がない (起動時に終わっている)。

## テスト

### Unit

UI primitives:

- `vitest-axe` で各 primitive / shell component の `axe` violation 0 件を保証

Shell:

- nav 項目 / active 判定 / SwitchLang / LoginButton 出し分け
- Footer の 4 リンクと i18n 引き
- NotificationBar の表示・close・全件 close でバー消失・sessionStorage 永続化
- NewsAside の 8 件 list / 「すべて見る」 link / source / category Tag
- Breadcrumb の 0-1 件 null / handle 駆動描画
- TranslationUnavailable の表示条件 / ja URL で非表示
- ShellLayout の組み立て / skip link

Top route:

- 2-col grid 構成、HeroSection / ServiceGrid / PopularResources / NewsAside の存在
- ServiceGrid が `top.order` 順に並ぶ
- ServiceCard の internal / external 切替
- PopularResources の DDBJ / DBCLS 群振り分けと monogram 表示

Content system:

- 不正な fixture で `validateAll*` が `errors` を返す、`getDatabaseBySlug` / `getServiceById` が存在しない id で `undefined`
- DatabaseContent の parse + `body.ja` / `body.en` の render
- submit `Service` enum の全 14 件が submit usage 付きの service entry を持つ (= flow card で URL が落ちない不変量)

### PBT

Shell:

- shell が追加する全 i18n キーで ja / en のキーセット同一

Top route:

- 任意の有効な `ServiceContent` 入力で Zod parse 成功、無効な組み合わせで失敗
- routes-helpers の path / id 対称性

Content system:

- 任意の有効な `DatabaseContent` 入力で Zod parse 成功
- 任意の有効な `ServiceContent` 入力で Zod parse 成功、無効な組み合わせ (top も submit も無い / top あるのに link 無い) で必ず失敗
