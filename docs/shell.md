# Shell

`app/shell/` 配下の global layout 部品。Header / Footer / NotificationBar / NewsAside / Breadcrumb / TranslationUnavailable / ShellLayout の責務と組み立てを定義する。`app/root.tsx` がこれらを噛ませて全ページ共通の chrome を構築する。

## 1. 責務分担

| ファイル | 役割 |
|---|---|
| `header.tsx` | wordmark + 主要 nav + lang 切替 + login button、active nav 判定 |
| `footer.tsx` | 組織情報 + 4 リンク (運営組織 / 利用規約 / プライバシー / アクセシビリティ) |
| `notification-bar.tsx` | 全ページ上部、announcement カテゴリ news を表示、close 永続化 |
| `news-aside.tsx` | トップ右ペイン compact news 8 件 + 「すべて見る」リンク |
| `breadcrumb.tsx` | `app/lib/content/breadcrumb.ts` の `useBreadcrumb` を消費して描画 |
| `translation-unavailable.tsx` | en page で翻訳が未完了の場合のバナー |
| `login-button.tsx` | `useAuth()` の状態を見て「ログイン / ログアウト」 button を切替、`buildLoginUrl` / `buildLogoutUrl` を消費 |
| `switch-lang.tsx` | 現在 URL の対応する別 lang URL に飛ぶ link、`getCounterpartUrl` を消費 |
| `shell-layout.tsx` | Header / NotificationBar / Breadcrumb / `<Outlet />` / Footer を組み立てる wrapper |
| `index.ts` | 上記の re-export |

`app/shell/` は `app/ui/` の primitive と `app/lib/` の hook / helper を消費する。`app/features/` を import してはならない (`architecture.md §3` zones)。

`app/shell/` は ESLint `react/forbid-elements` から除外される (`docs/ui-primitives.md §15`)。LoginButton / Footer / SwitchLang 等は BFF endpoint や外部 URL への `<a href>` を直接扱うため。`<button>` 等を書く場合も primitive 経由を優先し、必要なときだけ生要素にとどめる。生 hex / arbitrary Tailwind value 禁止は `app/shell/` でも引き続き効く。

## 2. Header

### 2.1 構成

```
[wordmark] ............................ [nav] [|] [SwitchLang] [LoginButton]
```

- wordmark: 左端、`/` (ja) または `/en` (en) への link
- nav: 中央-右寄せ、active nav に `aria-current="page"` + `text-brand font-bold`
- 縦区切り: `w-px h-[18px] bg-border-soft mx-2`
- SwitchLang: lang 切替リンク
- LoginButton: 認証 state を見て「ログイン / ログアウト」を出し分け

背景は `surface` (白)、下に `1px solid border-soft` の境界 (`design/constraints.md §2` で許容)。紫ベタ / グラデーション / 上端帯は使わない。

### 2.2 nav 構成

ja / en で同じ構造、文言だけ i18n リソースから引く。wordmark が top page リンクを兼ねるため top は nav に含めない。news は nav に置かず、トップ右ペインの NewsAside + `/news` 直リンクで誘導する。

| key | i18n key | kind | 遷移先 (ja) | 遷移先 (en) | active 条件 |
|---|---|---|---|---|---|
| search | `nav.search` | internal | `/search` | `/en/search` | path が `/search` 始まり (results 含む) |
| submit | `nav.submit` | internal | `/submit` | `/en/submit` | path が `/submit` 始まり |
| about | `nav.about` | external | `https://bsi.rois.ac.jp` | 同左 | 外部リンクのため active 判定対象外 |

`/databases/:slug` は top-level nav に含まない (deep page、active = null)。about は外部 URL なので `<a target="_blank" rel="noopener noreferrer">` + ExternalIcon で開く。

### 2.3 active 判定

```ts
type InternalNavItem = { id: "search" | "submit"; kind: "internal"; path: "search" | "submit" }
type ExternalNavItem = { id: "about"; kind: "external"; href: string }
type NavItem = InternalNavItem | ExternalNavItem

const NAV_ITEMS: readonly NavItem[] = [
  { id: "search", kind: "internal", path: "search" },
  { id: "submit", kind: "internal", path: "submit" },
  { id: "about", kind: "external", href: "https://bsi.rois.ac.jp" },
]

const computeActiveNav = (pathname: string, lang: Lang): NavId | null => {
  for (const item of NAV_ITEMS) {
    if (item.kind !== "internal") continue
    const prefix = lang === "en" ? "/en" : ""
    const href = `${prefix}/${item.path}`
    if (pathname === href || pathname.startsWith(`${href}/`)) return item.id
  }
  return null
}
```

`pathname` は `useLocation().pathname` から取得する。external item は active 判定の対象外。

### 2.4 LoginButton

`app/lib/auth/use-auth.ts` の `useAuth()` を呼び、state によって以下を出し分ける:

| `useAuth().status` | 表示 | onClick / href |
|---|---|---|
| `"loading"` | skeleton (spinner) | — |
| `"unauthenticated"` | `<Button kind="secondary" size="sm">{t("auth.login")}</Button>` | `buildLoginUrl({ returnTo: pathname })` の link |
| `"authenticated"` | user icon + display name + ドロップダウン (展開で `t("auth.logout")` button) | `buildLogoutUrl({ returnTo: pathname })` の link |

returnTo はクライアントから渡す。`buildLoginUrl` / `buildLogoutUrl` が同一 origin 検証して `/` 始まり以外を `/` に正規化する (`docs/auth.md §5.2`)。

### 2.5 SwitchLang

`app/lib/i18n/url.ts` の `getCounterpartUrl(pathname, target)` で対応 URL を計算し、React Router `<Link>` で push する。

```
ja の場合: <Link to={getCounterpartUrl(pathname, "en")}>{t("switchLang.toEn")}</Link>
en の場合: <Link to={getCounterpartUrl(pathname, "ja")}>{t("switchLang.toJa")}</Link>
```

globe icon を左に、text に "JA / EN" 切替の意味を持たせる ("Switch to English" / "日本語" を `switchLang.toEn` / `switchLang.toJa` から引く)。

## 3. Footer

`background: ink` (`#1A1726`)、文字 `text-white`。組織情報 (左) と 4 リンク (右) の `justify-between`。

```
[DDBJ — Bioinformation and DDBJ Center / National Institute of Genetics · ROIS / BSI]
                                                                   [運営組織] [利用規約] [プライバシー] [アクセシビリティ]
```

リンク先は i18n リソース駆動。staging / production で `https://www.ddbj.nig.ac.jp/...` に向ける。

## 4. NotificationBar

### 4.1 表示条件

`/api/news` から取得した news のうち以下を満たすものを 1 件表示:

- `category === "announcement"` (`NewsCategory` enum、`app/lib/api/news.ts`)
- 表示済みリスト (`dismissedIds` を sessionStorage に保持) に含まれていない

### 4.2 順序

複数件が条件を満たす場合は **`publishedAt` 降順 (新しい順)**。優先度フィールドは持たない (時系列のみで決定)。

### 4.3 close 動作

close button (× IconButton) を押すと:

1. sessionStorage の `dbPortal.notificationBar.dismissed` に `newsId` を追加
2. 次の候補があれば自動的に表示、なければ bar 自体を hide

sessionStorage を採用するのは「tab を閉じるまでは再表示しない、次の session では再評価」 の挙動が望ましいため (cookie だと長期で抑制されすぎる、localStorage だと永久に閉じてしまう)。

### 4.4 構成

```
[Tag status critical "重要"]  [mono date]  [title link]  ............................. [詳細 →]  [× close]
```

- 帯背景: `surface-subtle`、上下 1px `border-soft`
- Tag は `kind="status" tone="critical"`、size sm
- date: mono `text-ink-soft text-fs-label`
- title: `text-ink font-medium`、hover で underline
- 「詳細 →」: `app/ui/text-link.tsx` 経由で news 詳細 URL へ
- × close: `app/ui/icon-button.tsx`、`ariaLabel={t("notificationBar.close")}`

### 4.5 SSR hydration

sessionStorage は client 専用。SSR では「全件未読」前提で 1 件表示し、hydration 後に sessionStorage を読んで dismissed を反映する。これにより hydration mismatch を避けつつ、SSR でも初回 paint で notification が見える。

## 5. NewsAside

トップページ右ペイン専用 (sticky positioning)。ヘッダー高さを除いた viewport 高さに追従し、8 件の compact news list を表示する。

### 5.1 表示

- heading: `SectionHeading` で `t("newsAside.heading")` (= "お知らせ")、右に `t("newsAside.viewAll")` link
- 各 row:
  - 日付 (mono, `text-ink-soft text-fs-label`)
  - `Tag kind="source" name="DDBJ"`
  - `Tag kind="tag"` (category、例 "リリース")
  - title link (1 行 ellipsis)

### 5.2 取得

`app/lib/api/news.ts` の `fetchNews()` を TanStack Query (`useQuery`) で呼び、上位 8 件を slice する (limit は client 側責任、fetch wrapper はパラメタを取らない)。hook は `app/shell/news-aside.tsx` 内に置く (features を import すると zones を超えるため)。

## 6. Breadcrumb

`app/lib/content/breadcrumb.ts` の `useBreadcrumb()` を消費する。

### 6.1 表示

```
[ホーム] > [データベース] > [BioProject]
```

- 先頭: `t("breadcrumb.home")` (= "ホーム"), `/` (ja) または `/en` (en) への link
- 中間: link
- 末尾: 現在 page、link なし、`aria-current="page"`

区切りは `›` (U+203A、装飾なので `aria-hidden`)。

### 6.2 zone 境界

`useBreadcrumb()` は handle resolver パターンで構築される (`docs/content-system.md §5`)。`app/shell/breadcrumb.tsx` は hook を呼んで `<nav aria-label={t("a11y.breadcrumbNav")}>` で wrap するだけ。

`breadcrumbI18nKey` に存在しない i18n キー (typo 等) が渡されたとき、hook は i18next default に従いキー文字列そのものをラベルとして返す (item は skip しない)。typo を visible に出すことで dev で早期に気付かせるための挙動。

### 6.3 表示しないケース

`useBreadcrumb()` が 0-1 件 (= top のみ) を返した場合、何も render しない (`null`)。これは top page (`/` / `/en`) で breadcrumb が冗長になるのを避けるため。

## 7. TranslationUnavailable

### 7.1 表示条件

現在の lang が `en` かつ、route handle の `i18n.en` が `"complete"` 以外。

```ts
// 各 route.tsx
export const handle = {
  i18n: { en: "complete" | "missing" | "partial" },
} as const
```

`useMatches()` を辿り、いずれかの match の `handle.i18n.en` が `"complete"` 以外であればバナーを表示する。親 layout (例 `routes/lang-en/layout.tsx`) は handle を持たず、子 route が宣言する。(`some` で判定するため、子と親の双方が flag を持ちつつ片方が missing でもバナーが出る)

ja 側の route handle には `i18n` flag を **書かない** (ja default なので flag 不要、不在 = complete とみなす)。ja で missing キーは PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) が許さない。

### 7.2 表示位置

`ShellLayout` 内で Header と main の間、NotificationBar の **下**、Breadcrumb の **上** に出す (banner 性質、route content より上)。

### 7.3 構成

```
[i icon] {t("translationUnavailable.title")}
         {t("translationUnavailable.description")}
                                           [Switch to Japanese link]
```

- 背景: `surface-subtle`、border `border-soft`
- title: `text-ink font-semibold text-fs-body`
- description: `text-ink-mid text-fs-body-sm`
- Switch link: `app/ui/text-link.tsx` 経由で `getCounterpartUrl(pathname, "ja")` に向く

`primitives/callout.md` の `Callout tone="info"` を流用してもよいが、action link を含めたいので shell 側に専用 component として置く。

### 7.4 missing key の挙動

`react-i18next` の `fallbackLng: "ja"` により、en リソースに無いキーは ja の値が render される (`docs/i18n.md §5.2`)。これにより:

- 翻訳の一部が欠落していても画面は壊れない (ja でフォールバック)
- TranslationUnavailable バナーで「日本語で表示している」 状態を可視化
- ユーザーは Switch link で能動的に ja URL に切替可能

route handle に `i18n.en === "complete"` を書いたものはバナー非表示。ja default 設計なので en 側の翻訳が出揃った時点で flag を更新する運用。

## 8. ShellLayout

`app/shell/shell-layout.tsx` が `app/root.tsx` から呼ばれる。

### 8.1 構成

```tsx
<Page>
  <SkipLink />
  <Header />
  <NotificationBar />
  <TranslationUnavailable />
  <Breadcrumb />
  <main id="main">{children}</main>
  <Footer />
</Page>
```

- `Page` は `app/ui/page.tsx` (font / color baseline)
- `Header` は内部で `useLocation()` + `useLang()` から active nav を `computeActiveNav` で導出する (props で渡さない)
- `main` に `id="main"` を付け、`SkipLink` の遷移先にする
- `SkipLink` は Header の **上** に置く sr-only な link で、Tab で focus したときだけ可視化する (`design/constraints.md §5`)

### 8.2 Header active 判定

Header 内部で `useLocation()` + `useLang()` を呼び、`computeActiveNav(pathname, lang)` で active id を導出する。`Header` には optional `active` prop も用意されており、上位から明示的に渡せば override できる (テスト用)。

### 8.3 トップページ特例

`/` / `/en` (top page) では `<main>` の中身を 2-col grid にして右側に `NewsAside` を出す。ShellLayout はこの分岐を **持たない** (NewsAside の配置はトップ route 側で組み立てる、layout を pure に保つ)。`NewsAside` 自体は `app/shell/` 配下に置くが、layout に embed せず route から explicit に import して使う。

## 9. i18n 統合

### 9.1 request-scoped instance

`app/lib/i18n/index.ts` は `createI18nInstance(lang)` を export し、1 request ごとに新しい i18next instance を作る。`app/root.tsx` で `useMemo(() => createI18nInstance(lang), [lang])` し、`<I18nextProvider i18n={instance}>` に渡す。

これにより SSR の並列 request で `changeLanguage` のレースが発生しない (`docs/i18n.md §5.2`)。module-level の global instance は持たない。

### 9.2 翻訳キーの所在

shell が直接消費するキーを `app/lib/i18n/resources/{ja,en}.ts` に追加する:

- `common.*`: siteName / loading / error / close / detail
- `nav.*`: search / submit / about
- `breadcrumb.*`: home / databases
- `auth.*`: login / logout / loggingIn
- `switchLang.*`: toEn / toJa
- `notificationBar.*`: close / important
- `newsAside.*`: heading / viewAll / empty
- `translationUnavailable.*`: title / description / switchToJa
- `footer.*`: orgFullName / orgSubtitle / operatedBy / termsOfUse / privacy / accessibility
- `a11y.*`: skipToContent / breadcrumbNav / mainNav / languageSwitcher / notificationBar

ja と en でキーセットは完全一致させる (`docs/i18n.md §7.1` PBT で担保)。

## 10. テスト

### 10.1 unit (Vitest + @testing-library/react)

- `tests/unit/shell/header.test.tsx`: nav 項目 / active 判定 / SwitchLang URL / LoginButton 出し分け
- `tests/unit/shell/footer.test.tsx`: 4 リンクが表示、i18n キーから text を引く
- `tests/unit/shell/notification-bar.test.tsx`: announcement 1 件を表示 / close で次の 1 件 / 全件 close でバー消失 / sessionStorage 永続化
- `tests/unit/shell/news-aside.test.tsx`: 8 件 list / 「すべて見る」 link / source / category Tag
- `tests/unit/shell/breadcrumb.test.tsx`: `useBreadcrumb` の結果に応じて render、0-1 件は null
- `tests/unit/shell/translation-unavailable.test.tsx`: route handle `i18n.en !== "complete"` で表示、ja URL で非表示
- `tests/unit/shell/shell-layout.test.tsx`: 全 children が組み立たり、skip link が `<main>` に飛ぶ

### 10.2 PBT

`tests/pbt/lib/i18n/resource-parity.pbt.test.ts` を拡張、shell が追加するキー全部について `ja` と `en` のキーセット同一を担保する。

### 10.3 a11y

各 primitive / shell component に対し、`vitest-axe` で `expect(await axe(container)).toHaveNoViolations()` を実行する。production e2e への統合は本リリースのスコープ外 (人手レビューで担保)。

## 11. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §3` | zones 制約 (shell ← ui / lib / schemas / content、features → shell 不可) |
| `i18n.md §5` | TranslationUnavailable のフォールバック仕様 |
| `auth.md §4.4` / `§5` | LoginButton が消費する `buildLoginUrl` / `buildLogoutUrl` 仕様 |
| `content-system.md §5` | Breadcrumb が消費する `useBreadcrumb` 仕様 |
| `ui-primitives.md` | shell が使う primitive (Tag / Button / IconButton / TextLink / SectionHeading 等) |
