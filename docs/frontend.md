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

### 設計原則と規約

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

色だけで意味を伝えない: status の意味は text label が担保し (色のみで状態を区別しない)、tone (色) は補強とする。error / warning / 完了など状態を強調する面では AlertIcon / CheckIcon 等の icon・shape も併用して salience を上げる。

#### zones とファイル構成

`app/ui/` 配下に primitive ファイルと icons (`app/ui/icons/`) を置き、`app/ui/index.ts` で re-export する。外部 module からは `import { Button, Tag, Modal } from "~/ui"` で参照する。`app/ui/` は他の zone を import せず (`architecture.md`)、内部の primitive 同士・util (`cn` helper や icon 集約) は `app/ui/` 配下で閉じる。`Header` のような chrome は `app/shell/` 側 (本書「Shell」)。

#### variant prop の表現

見た目の差は `className` でなく semantic prop で表す。prop 名は primitive 横断で意味を固定する。取り得る値はコードと `/_design` が SSOT で、本書には列挙しない:

| prop | 採用 primitive 例 | 何を表すか |
|---|---|---|
| `kind` | Button / Tag / Chip | 用途・役割の種別 (primary 操作か danger か、Tag の分類軸、Chip の出自) |
| `tone` | Tag (status) / Callout | 状態の強さ (critical / warn 等の色付け) |
| `size` | Button / Tag / SearchBox / Select / TextInput | 寸法段階。Select / TextInput / Combobox は固定高さ variant を持ち query builder の行高を揃える |
| `mono` | Tag / Chip / Label | 等幅表示 (識別子・コード片) |
| `selected` | Chip / FacetRow | 選択状態 |
| `as` | Chip / SectionHeading | 描画する HTML 要素の切替 (リンクかボタンか、見出しレベル) |

prop 名と意味はこの規約に従い、値の増減は `app/ui/` の primitive 定義で行う。

#### state 網羅

各 primitive で次の state を必ず実装 + テストする:

- default
- hover (clickable な場合; ホバーで色変化はしない方針)
- focus (global `:focus-visible` の yellow ring を頼る)
- disabled (`aria-disabled="true"` + `disabled` HTML 属性。視覚的な無効化の見た目値はコード + `/_design` が SSOT)
- checked / selected (該当 primitive)
- loading (該当 primitive)

#### forward 不可

`forwardRef` を必要に応じて使う (Modal の focus trap で trigger ref を返すケースなど)。`...rest` の spread は許容するが、`className` だけは pick して破棄する。

### primitive カテゴリ

各 primitive の Props 型 / class 骨格 / variant 一覧は **コードと `/_design` route が SSOT**。本書は各カテゴリで「何を担う primitive 群か」 と「特殊な制約」 のみ述べる。

- **Chrome** (`page.tsx` / `page-title.tsx` / `search-box.tsx`): ページ全体の wrapper、H1 + eyebrow、Top / Search / results で共通利用する一体型検索 input。`PageTitle` は左バーを持たない (左バーは `SectionHeading` の予約)。`SearchBox` は `trailing` slot (検索ボタン左の差し込み) と AI モードの brand 着色を持ち、キーワード / AI モード切替トグルをボックス内に納める。scope スロットを隠してもボックス高さは保ち、キーワード ⇄ AI のモード切替で高さがガタつかない。`/search` は提案レビュー型の `SearchInputPanel`、top / results は生成→遷移型の `NavigableSearchInput` がこの `SearchBox` を包む (`search.md`)
- **Layout** (`section.tsx`): 垂直リズム + 中央寄せ + 横余白を担う wrapper。`padTop` / `padBottom` で上下 padding を個別に選ぶ (段階の token は `app/styles/tailwind.css` の `@theme` `--spacing-section-*` が SSOT)
- **Headings & Labels** (`section-heading.tsx` / `sidebar-heading.tsx` / `sidebar-group-label.tsx` / `label.tsx`): main column 用 `SectionHeading` は装飾の左バー付き、sidebar 用 `SidebarHeading` はバー無しで、main column と sidebar を視覚的に切り分ける規約。`Label` の `color` prop は token 表現外の動的色 (source palette 等) を受け取る逃げ道
- **Forms** (`button.tsx` / `icon-button.tsx` / `text-input.tsx` / `text-area.tsx` / `select.tsx` / `combobox.tsx` / `form-group.tsx` / `fmt-radio.tsx` / `fmt-check.tsx`): native `<button>` / `<input>` の thin wrapper、および native `<select>` を代替する custom popover の `Select` / `Combobox`。error state policy は次節:
  - `Select`: 固定リストから 1 つ選ぶ
  - `Combobox`: editable な派生。候補を前方/部分一致で絞りつつ、候補に無い値も自由入力で確定できる (facet 集計に出ない正当な値を排除しない、検索ビルダーの facet 値入力)。`value` と表示 `label` を分離でき organism の学名表示等に使う
  - `Select` / `TextInput` / `Combobox` は固定高さ variant を持ち query builder の行高を揃える
- **Tags & Chips** (`tag.tsx` / `chip.tsx` / `examples.tsx`): `Tag` は非インタラクティブ label、`Chip` はインタラクティブ pill。`Chip` は `as` で URL push (link) か状態変更 (button) かを切り替える。`Examples` は `例:` ラベル + Chip 群の共通行で、top hero / `/search` / results で共有する
- **Facets** (`applied-filters.tsx` / `facet-group.tsx` / `facet-row.tsx` / `date-facet.tsx`): sidebar facet UI。`DateFacet` は segmented quick range + collapsible FROM/TO
- **Callout** (`callout.tsx`): inline notice、3 tone (info / warn / ok)、`role="status" | "alert"` を consumer 側が制御
- **Modal** (`modal.tsx` / `modal-preview.tsx`): root + Header / Body / Footer / Preview / Card の家族。詳細は次節の Modal core を参照
- **その他** (`pagination.tsx` / `link-card.tsx` / `text-link.tsx`): pagination は数字ボタン + 前 / 次 / ellipsis のミニマル実装。`LinkCard` / `TextLink` は **内部 link (RR `<Link>`) と外部 link (`<a target="_blank">`) を 1 primitive に統一**、外部は `rel="noopener noreferrer"` を自動付与

### Forms: error state と SR 連携

入力 primitive (`Button` を除く form control: TextInput / TextArea / Select / Combobox / FmtRadio / FmtCheck) は、`state="warn"` のような視覚的エラー表現と、screen reader 向けの aria 関連付けを **同時に satisfy する**:

- `aria-invalid` は **state ベース** で primitive 側が自動付与する (`state="warn"` のとき true、default で false)
- `aria-describedby` は consumer 側 (`FormGroup` の `errorId` / `hintId` など) が渡せるよう prop を開ける
- error message を表示する側 (`FormGroup` の hint 領域や Callout) は **必ず id を持ち**、その id を input の `aria-describedby` に流す
- placeholder は状態を示さない (placeholder text を error message に使わない)。surface 上でコントラスト比 4.5:1 を満たす

`FormGroup` 自身は `<fieldset>` + `<legend>` で実装し、`num` + `label` を `<legend>` 内に置く。これにより radio / checkbox 群が単一の質問グループとして screen reader に announce される。1 input (TextInput 等) を子に持つ場合も `<fieldset>` で囲んで問題ない。`IconButton` は AA の target size を満たす default を持ち、touch 主体の文脈では consumer 側で大きい `size` を渡す。具体の色値・サイズ値はコード + `/_design` が SSOT。

### Modal: core 挙動

`Modal` (root) は dialog として横断的に次を保証する。focus 候補の selector・寸法・scroll lock の実装は `app/ui/modal.tsx`、視覚は `/_design` が SSOT:

- `open=false` で何も render しない (mount は親が制御)
- focus を dialog 内に閉じ込める (open で内部先頭へ移動、Tab / Shift+Tab で循環、close で trigger に復元)。外部 dependency を増やさず自前実装する
- Esc キー・overlay click で `onClose` (それぞれ `closeOnEscape={false}` / `closeOnOverlay={false}` で無効化、overlay は pointerdown / click 併用で drag-out closure を防ぐ)
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (+ 渡されれば `aria-describedby`)
- open 中は背景スクロールを抑止し close で復元する

`ModalPreview` は 2-col modal の右ペイン (`ModalBody cols={2}` と組合わせ、「その操作で組まれる結果」 を予測表示する `<aside>`)。

### トークン utility 生成と arbitrary value の許容範囲

Tailwind v4 は `@theme` 宣言から utility class を自動生成する (`--color-brand` → `bg-brand` / `text-brand` 等)。生成規則と各 token の意味は `app/styles/tailwind.css` のコメントが SSOT。

`app/{ui,shell}/` で arbitrary value を許容するのは次の範囲 (物理強制は下記「ESLint による物理強制」):

- token 化する価値が薄い hairline・accent ラインなどの細部値
- 1 箇所限定の layout 値
- `style={{}}` で動的に渡される値
- `app/shell/` の vh / rem 単位 (`@theme` で表現しづらい単位)

「複数箇所で同じ値が出てきた」 「サイズ感を全体で揃えたい」 と感じたら `@theme` に token を追加して移行する。

### ESLint による物理強制

逸脱検出は `eslint.config.ts` が SSOT。zone 別の生 hex / arbitrary value 禁止は `architecture.md` の「デザイントークンの物理強制」が扱う。primitive 利用に固有なのは `react/forbid-elements` で、`app/{features,routes,content}/` で生 `button` / `a` / `input` / `select` / `textarea` を禁止して primitive 経由を強制する (`app/{ui,shell}/` は native 要素を組み立てるため除外)。

### 視覚確認

dev 環境 (および `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` を有効化した env) で `/_design` route を生成する。`routes/_design/primitives.tsx` で全 primitive を variant × size × state すべて並べ、`routes/_design/tokens.tsx` で全 token を一覧表示する。production build では `app/routes.ts` で除外し 404 にする。

## Shell

`app/shell/` 配下の global layout 部品。Header / NotificationBar / NewsAside / Breadcrumb / SkipLink / TranslationUnavailable / ShellLayout の責務と組み立てを定義する。`app/root.tsx` がこれらを噛ませて全ページ共通の chrome を構築する。

### 責務分担

| ファイル | 役割 |
|---|---|
| `header.tsx` | wordmark + 主要 nav + lang 切替 + login button、active nav 判定 |
| `notification-bar.tsx` | トップページ上部に featured news を表示、close 永続化 |
| `news-aside.tsx` | トップ右ペイン compact news + 「すべて見る」リンク |
| `breadcrumb.tsx` | `app/lib/content/breadcrumb.ts` の `useBreadcrumb` を消費して描画 |
| `skip-link.tsx` | Tab フォーカス時に表示される `<main>` への skip リンク |
| `translation-unavailable.tsx` | en page で翻訳が未完了の場合のバナー |
| `login-button.tsx` | `useAuth` の状態を見て「ログイン / ログアウト」 button を切替 |
| `switch-lang.tsx` | `/api/set-lang` に POST して言語切替する fetcher Form |
| `shell-layout.tsx` | SkipLink / Header / NotificationBar / Breadcrumb / `<Outlet />` を組み立てる wrapper |
| `index.ts` | 上記の re-export |

`app/shell/` は `app/ui/` の primitive と `app/lib/` の hook / helper を消費する。`app/features/` を import してはならない (`architecture.md` zones)。LoginButton / SwitchLang 等が BFF endpoint や外部 URL への `<a href>` を直接扱うため `react/forbid-elements` は除外、ただし `<button>` 等は primitive 経由を優先する。

### Header

#### 構成

```
[wordmark] ............................ [nav] [SwitchLang] [|] [LoginButton]
```

- wordmark: 左端、`/` への link。`/bsi-logo.svg` (BSI = BioData Science Initiative) を render するロゴ
- nav: 中央-右寄せ、active nav に `aria-current="page"`
- SwitchLang: lang 切替リンク (cookie 更新で URL 不変、`i18n.md`)
- SwitchLang と LoginButton の間に縦区切り
- LoginButton: 認証 state を見て「ログイン / ログアウト」を出し分け

背景は `surface` (白) で下端に境界線を引く。紫ベタ / グラデーション / 上端帯は使わない。見た目値は `app/shell/header.tsx` が SSOT。

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
| `"loading"` | text `t("auth.loggingIn")` (= "認証中…") | — |
| `"unauthenticated"` | "ログイン" link (`<a href>`) | `buildLoginUrl(pathname)` |
| `"authenticated"` | name と "ログアウト" が `·` でつながった単一 `<a href>` | `buildLogoutUrl(pathname)` |

returnTo はクライアントから渡す。`buildLoginUrl(returnTo?)` / `buildLogoutUrl(returnTo?)` は positional 引数で受け、同一 origin 検証して `/` 始まり以外を `/` に正規化する (`auth.md`)。

#### SwitchLang

`/api/set-lang` resource route に POST する fetcher Form で実装する (`i18n.md`)。URL は不変、root loader が revalidate されて全画面が新 lang で再 render される。Globe icon を左に、text に "JA / EN" 切替の意味を持たせる ("Switch to English" / "日本語" を i18n リソースから引く)。

### NotificationBar

トップページ上部の featured news スタック。表示仕様はここに集約する (`news.md` はデータ源の補足のみ)。レイアウト・close の実装・sessionStorage key・SSR hydration の詳細は `app/shell/notification-bar.tsx`、視覚は `/_design` が SSOT。

#### 表示条件

**トップページ (`pathname === "/"`) のみ** で render し、`/api/news` の news のうち次を満たすものを表示する:

- `featured === true` (featured whitelist で marked、`news.md`)
- その session で dismiss 済みでない

#### 順序

`publishedAt` 降順 (新しい順) に縦に積む。優先度フィールドは持たず時系列のみで決定する。

#### close と永続化

各 bar の close で当該 bar のみ即時に消え、全件 close で section ごと消える。dismiss 済みは **sessionStorage** に保持する。cookie だと長期で抑制されすぎ、localStorage だと永久に閉じてしまうため、「tab を閉じるまで再表示しない・次の session では再評価」 を満たす sessionStorage を選ぶ。

#### a11y / SSR

section landmark (`role="region"`) は 1 つに留め、各 bar は `<article aria-label={title}>` で個別識別する。sessionStorage は client 専用なので SSR では全件表示し、hydration 後に dismissed を反映する (hydration mismatch を避けつつ初回 paint で表示する)。

### NewsAside

トップページ右ペイン専用 (sticky)。最新 N 件 (`NEWS_LIMIT` 定数が SSOT、現状 5 件) の compact news list を表示する。heading (`SectionHeading` + 「すべて見る」 link)・各 row の構成・スタイルは `app/shell/news-aside.tsx`、視覚は `/_design` が SSOT。

`app/lib/api/news.ts` の `fetchNews` を TanStack Query で呼び、client 側で `NEWS_LIMIT` 件に slice する (limit は client 側責任)。fetch を `app/shell/news-aside.tsx` 内で行うのは、features を import すると zones を超えるため (`architecture.md`)。

### Breadcrumb

`app/shell/breadcrumb.tsx` は `app/lib/content/breadcrumb.ts` の `useBreadcrumb` を消費し、結果を `<nav aria-label={t("a11y.breadcrumbNav")}>` で wrap するだけの薄い UI 層。表示形式は `[ホーム] > [データベース] > [BioProject]`、先頭は `t("breadcrumb.home")` + ホームへの link、末尾は `aria-current="page"`、区切りは `›` (U+203A、`aria-hidden`)。仕様詳細は本書「Content system」の「Breadcrumb 自動生成」を参照。

### TranslationUnavailable

#### 表示条件

現在の lang が `en` かつ、route handle の `i18n.en` が `"complete"` 以外 (`useMatches` を辿り、いずれかの match が条件を満たす場合)。親 layout は handle を持たず、子 route が宣言する。

ja 側の route handle には `i18n` flag を **書かない** (ja default なので flag 不要、不在 = complete とみなす)。ja で missing キーは PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) が許さない。

route handle 規約は `architecture.md` の「route handle 規約」 を参照。

#### 表示位置

`ShellLayout` 内で Header と main の間、NotificationBar の **下**、Breadcrumb の **上** に出す (banner 性質、route content より上)。バナー本体の構成・スタイルは `app/shell/translation-unavailable.tsx`、視覚は `/_design` が SSOT。`Callout tone="info"` 相当だが、ja への Switch link (`/api/set-lang` に POST する fetcher Form、cookie 更新 / URL 不変) を含めるため shell 側の専用 component とする。

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
└ <main id="main">{children}</main>
```

- `Page` は `app/ui/page.tsx` (font / color baseline)
- `Header` は内部で `useLocation().pathname` から active nav を導出 (`computeActiveNav` で path 判定、props で渡さない)
- `main` に `id="main"` を付け、`SkipLink` の遷移先にする
- `SkipLink` は Header の **上** に置く sr-only な link で、Tab で focus したときだけ可視化する

#### トップページ特例

`/` (top page) では `<main>` の中身を 2-col grid にして右側に `NewsAside` を出す。ShellLayout はこの分岐を **持たない** (NewsAside の配置はトップ route 側で組み立てる、layout を pure に保つ)。`NewsAside` 自体は `app/shell/` 配下に置くが、layout に embed せず route から explicit に import して使う。

### i18n 統合

`app/lib/i18n/` の `createI18nInstance(lang)` を 1 request ごとに呼び、`<I18nextProvider>` に渡す。これにより SSR の並列 request で `changeLanguage` のレースが発生しない (`i18n.md`)。module-level の global instance は持たない。

shell が直接消費するキー namespace は `common` / `nav` / `breadcrumb` / `auth` / `switchLang` / `notificationBar` / `newsAside` / `translationUnavailable` / `a11y`。実体は `app/lib/i18n/resources/{ja,en}.ts` が SSOT。ja と en でキーセットは完全一致させる (`i18n.md` PBT で担保)。

## Top route

`/` で表示されるトップページの仕様。`app/routes/top/route.tsx` が SSOT。

トップは「DDBJ ポータルへの入口」として、検索ボックスを実質的なヒーローに据え、サービス一覧と最新ニュースへの導線を 2-col grid で構成する。

### 全体構成

ShellLayout が SkipLink / Header / NotificationBar / Breadcrumb を描画した上で、TopRoute は `<main>` に Hero section と「ServiceGrid + FeaturedServices の左カラム / NewsAside の右カラム」 の 2-col grid を組み立てる。NewsAside は **トップページのみ** で aside カラムに表示する。`ShellLayout` は NewsAside を embed せず、トップ route 側で explicit に呼ぶことで layout の単一責務を保つ。

```
┌─────────────────────────────────────────────────────────────┐
│  Hero (NavigableSearchInput: keyword/AI + scope + examples)  │
├──────────────────────────────────┬──────────────────────────┤
│  ServiceGrid (primary tiles)     │                          │
│                                  │  NewsAside               │
│  FeaturedServices                │  (sticky, 最新 N 件)      │
│    (name 順 compact list)        │                          │
└──────────────────────────────────┴──────────────────────────┘
```

`ServiceGrid` は `app/features/top/` 配下、`FeaturedServices` は `app/features/services/` 配下に置く (画面固有 component、`app/ui/` には入れない)。`HeroSection` は検索 box (`NavigableSearchInput`、`features/search`) を使うため **`app/routes/top/` 配下** に置く。zones の制約上 `features/top` は `features/search` を import できず、検索 box とサービスタイルの統合は route 層が担う。`NewsAside` は shell 共通 component を import する。

### Hero section

#### 構成

- `NavigableSearchInput` (`search-input/`、results と共有する太い検索 box。keyword / AI モードを 1 つの box で切り替える)
- scope の選択肢は `SCOPE_KEYS = ["all", ...DB_SLUGS]`、初期値は `"all"` (= "全データベース")。scope ラベルは `search.scope.*` キーから引く
- keyword モードでは scope = DB scope、box 直下に共通 `Examples` (`例:` + chip 列。例文言は `NavigableSearchInput` が `search.*` キーから引く)
- 検索例の trailing に「詳細条件で検索 →」リンク (`/search` への TextLink、`top.hero.advancedLink`)

#### AI モード (top は new 固定)

- `useLlmAvailability().ready` のときだけ box 内に「AI モード」トグルを出す (`llm.md`)
- top は **新規生成 (new) 固定** で `allowAppend={false}`。new/append selector は出さず、scope スロットは DB scope のまま。送信ボタンは keyword/AI とも **「検索」**
- AI モードに切り替えると検索例 chip が AI 用 (`search.assistant.examples`) に替わる
- AI 入力 → 「検索」で DSL を生成 (SSE)、**提案を見せず** に検証済み AST を `serializeAstToDsl` で DSL 化し `/search/results?q=<dsl>&db=<scope>` へ遷移する

#### keyword submit の挙動

- 入力値 `q` と scope を受け、`/search/results?q=<encoded>` に navigate する
- scope が `"all"` 以外なら `db=<slug>` を URL に付加 (`scopeKeyToDbSlug` で変換)
- DSL parse / serialize は results / AI 生成側でのみ実行する (top の keyword は simple query を URL に渡すだけ)
- 空入力で submit された場合は `/search/results` (q 無し、scope に応じた `db` のみ) に遷移

#### i18n キー

`top` namespace が hero 固有に持つのは詳細検索リンク 1 キーのみ。実文言は i18n リソース (`app/lib/i18n/resources/{ja,en}.ts`) が SSOT。

| key | 用途 |
|---|---|
| `top.hero.advancedLink` | 検索例 trailing の `/search` への誘導リンク文言 |

box の placeholder / aria / 送信ラベル / 検索例 / AI 文言は `NavigableSearchInput` が `search.*` キーを引く (top 固有では持たない)。

Hero に独立した heading は置かない (検索 box 自体が page の入口を兼ねる)。Header の wordmark がブランド表示を担う。

### Service tiles

#### データソース

`app/content/services/` collection の `top.category === "primary-service"` を `top.order` 昇順で取得する (本書「Content system」)。entry の全件・表示名・link 先は collection が SSOT、本書には書かない。

Card 全体をクリッカブルにするため、`app/ui/link-card.tsx` の `LinkCard` primitive を使う。`LinkCard` は internal なら `react-router` の `<Link>`、external なら `<a target="_blank" rel="noopener noreferrer">` を内部で組み立てる。

#### グリッドと card design

grid のレイアウト・寸法は `app/features/top/service-grid.tsx` / `service-card.tsx`、視覚は `/_design` が SSOT。規約として固定するのは:

- icon は service entry の `id` に応じた dedicated SVG を `app/features/top/service-icon.tsx` の switch から選ぶ (各 service 専用デザイン)
- 外部リンク card には `ExternalIcon` を visual hint として表示する

### Services (top page)

#### データソース

services mirror を client-side の TanStack Query で取得し、`featuredTop` の entry を抽出する (データ生成・featuredTop 規約は `services.md`)。`SectionHeading` (`top.services.heading`) と「すべて見る」link を上に出し、DDBJ・DBCLS を混在させた **name アルファベット順の compact list** で表示する。query key は `/services` 一覧と共有する。

#### 行 design

- 専用の compact row を内部に持つ。1 行 = name (url があれば外部 link) + 同行に 1 行 ellipsis の description。source Tag / category Tag / icon は持たない (詳細な一覧表示は `/services` に誘導)
- facet / pagination は top page には出さない

#### i18n キー

実文言は i18n リソース (`app/lib/i18n/resources/{ja,en}.ts`) が SSOT。

| key | 用途 |
|---|---|
| `top.serviceGrid.heading` | ServiceGrid 用 heading の資源 (現状 grid は内側に heading を render しない) |
| `top.services.heading` | FeaturedServices の `SectionHeading` |
| `top.services.viewAll` | FeaturedServices の `/services` への「すべて見る」link |

name / description は service mirror の data から、category ラベルは i18n (`services.category.*`) から解決する。

### NewsAside / NotificationBar

トップは右ペインで `app/shell/news-aside.tsx` を消費する。詳細仕様 (取得 / 表示 / 空・loading) は本書「Shell」の「NewsAside」を参照。NewsAside はトップ専用で、`ShellLayout` には含めない (route 側で explicit に呼ぶ)。

NotificationBar は `ShellLayout` 経由で全 page に出る。トップ固有のロジックは無く、仕様詳細は本書「Shell」の「NotificationBar」を参照。

### SSR / hydration

- TopRoute は loader を持たない (Service tiles は collection 起動時 load、Services list / News は client-side の TanStack Query で取得)
- SSR では News fetch を `useQuery` の `prefetch` で行わない (TanStack Query の hydration は採用していない)。初回 client mount で fetch する
- 結果として SSR では `NewsAside` が loading / empty 状態でレンダリングされ、hydration 後に実データに置き換わる (initial paint で skeleton 相当の表示)

## Content system

データベース解説、サービス紹介、各種ガイドのコンテンツを TypeScript ファイル (`*.content.tsx`) として書く collection 方式を採用する。`architecture.md` の zones に従い、コンテンツは `app/content/` に集約する。

### 方針

- コンテンツは **`*.content.tsx`** ファイルで書き、本文 (`body.ja` / `body.en`) は **TSX fragment 直書き**。リッチ表現 (Callout / Section / Table / TextLink) は `app/ui/` の primitive を JSX で組む
- Frontmatter 相当のメタ (title / slug / description / 関連 DB / 外部リンク / サービス分類) は **Zod schema で型検証**。ビルド時に壊れていれば即エラー
- Breadcrumb は content 側に書かず、**route handle + i18n リソースで自動生成** する
- 翻訳は同一ファイル内 `{ ja, en }` 並びで持ち、diff が読みやすい形を取る

この方式が保証する性質:

- 型安全: Zod schema による frontmatter 検証 + `satisfies` による本文構造の型 error
- リッチ表現: JSX で `app/ui/` primitive を直接使える
- i18n diff の読みやすさ: 同一ファイルに `{ja, en}` 並走、レビュー時に両言語の差を 1 ファイルで確認
- CMS 化への移行余地: loader (`app/lib/content/loader.ts`) を差し替えれば外部 CMS への切替が可能

### ディレクトリ構造

```
app/content/
├── databases/
│   ├── bioproject/index.content.tsx   → /databases/bioproject
│   └── biosample/index.content.tsx    → /databases/biosample
└── services/
    ├── bioproject.content.tsx          BioProject (submit-only)
    ├── biosample.content.tsx           BioSample (submit-only)
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

Breadcrumb は本 schema に書かない (route handle + i18n で自動生成、本書「Breadcrumb 自動生成」 節)。

### ServiceContent

portal 内 navigation の Service tiles (トップ左 main の primary tiles) と submit feature の外部 CTA リンクを 1 collection に集約する。外部サービス一覧 (DDBJ / DBCLS の各サービス) は本 collection ではなく services mirror が SSOT (`services.md`)。

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

#### TopUsage の category

| category | 追加フィールド | 表示位置 |
|---|---|---|
| `primary-service` | `order` (非負整数) | トップの Service tile grid (左 main 上段、portal 内 navigation) |

`order` は表示順 (各カテゴリ内、手動管理)。primary-service は `service-icon.tsx` の SVG を `id` で引く。外部サービスの top page 掲載は collection ではなく services mirror の `featuredTop` で決まる (`services.md`)。

#### SubmitUsage

| フィールド | 型 | 備考 |
|---|---|---|
| `service` | submit `Service` enum | flow card / preview card で参照される |
| `externalUrl` | URL | 外部 CTA リンク先 |
| `source` | `"DDBJ" \| "DBCLS"` または null | tag 表示用 |
| `accessionPlaceholders` | 文字列配列 | step カード上の placeholder 例 |

`submit-only` の entry (humandbs / jpost / eva 等) は `top` を持たず、`link` も持たない (submit 外部 CTA でだけ参照される)。

### Loader 公開 API

`app/lib/content/loader.ts` が公開する操作 (シグネチャは同ファイルが SSOT):

- slug / id 引き: database を slug で、service を id で 1 件取得 (未知は `undefined`)
- 一覧: database / service の全件取得
- top category 別一覧: 指定 top category を持つ service を `top.order` 昇順で取得
- submit 逆引き: submit `Service` enum 値から service entry を逆引き
- validateAll: database / service それぞれを Zod parse し直し、結果を返す

CLI (`scripts/validate-content.ts`) は database / service の validateAll に加えて submit-routing catalog (`validateSubmitRouting`) を順に呼び、いずれかが失敗すれば `process.exit(1)` する。

### 起動時 fail-fast

`loader.ts` は `import.meta.glob` で `*.content.tsx` を eager load + Zod parse する。1 件でも parse 失敗があれば module top で throw し、loader を import した時点で起動を止める。

`server/index.ts` は zones の制約 (`server → app/lib` 禁止) で loader を直接 import しない。代わりに、`npm run dev` / `npm run start` / `npm run build` の前段で `npm run validate:content` を必ず通すことで、collection 不整合を起動前に検出する。dev / staging / production / CI すべてで同じ fail-fast が効き、「production で初めて気付く」 事故を防ぐ。

server プロセスを `node server/index.ts` のように直接起動した場合は破損 content が runtime まで検知されない。`npm run *` 経由で `validate:content` を必ず前置する運用が fail-fast の唯一の担保となる。

### Breadcrumb 自動生成

Content 側に breadcrumb を **書かない**。Route handle に i18n キー (static) または resolver 名 (dynamic) を持たせ、`app/lib/content/breadcrumb.ts` の `useBreadcrumb` が `useMatches` を走査して構築する。shell 側 (`app/shell/breadcrumb.tsx`) は hook の結果を `<nav aria-label>` で wrap するだけの薄い UI 層。これにより content で breadcrumb を二重に書かずに済み、route 構造の変更に自動追従し、i18n ラベルは locale ファイルに集約される。

handle の 2 系統と用途:

| handle | ラベル解決 | 用途 |
|---|---|---|
| `breadcrumbI18nKey: "breadcrumb.databases"` | `t(key)` | 中間 segment (例: "データベース") |
| `breadcrumbResolver: "database-content"` | resolver 関数で `{ label, href }` | 末尾 segment (例: BP の title を content から引く) |

`breadcrumbI18nKey` に存在しないキー (typo 等) が渡されたとき、hook は i18next default に従いキー文字列そのものをラベルとして返す (item は skip しない)。typo を visible に出すことで dev で早期に気付かせる。

`useBreadcrumb` の不変量 (型は `breadcrumb.ts` が SSOT):

- handle 駆動: `useMatches` を順に走査し、handle に `breadcrumbI18nKey` (static) か `breadcrumbResolver` (dynamic) を持つ match だけを処理する
- static は i18n キーをそのままラベル化、dynamic は呼び出し側が渡した resolver 名 → resolver dict から関数を引いてラベルと href を解決する
- resolver が `null` を返した match は item を生やさない (該当 entry を breadcrumb から落とす)
- 返すのは **handle 由来の item 列のみ** (Home entry は含まない)。resolver は features/lib のヘルパに依存しないよう、shell 側で `~/lib/content/loader` の database / service lookup を直接読んで組み立てる

shell の `<Breadcrumb />` wrapper が hook の出力を受け取り、先頭に Home entry を prepend する。prepend 後の合計が 0-1 件 (= Home のみ、handle item 0 件) のとき、何も render しない (`null`)。top page で breadcrumb が冗長になるのを避けるため。

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
| `<select>` | `~/ui` の `Select` (popover combobox) |
| `<textarea>` | `~/ui` の form primitive (必要なら primitive を追加) |

許容される構造タグ: `<p>` / `<div>` / `<ul>` / `<ol>` / `<li>` / `<dl>` / `<dt>` / `<dd>` / `<h2>` / `<h3>` / `<strong>` / `<em>` 等。生 hex / Tailwind arbitrary value は ESLint で禁止される。

### 翻訳運用

#### ja / en 並走

両言語を 1 ファイルに持つ (`body: { ja: <>...</>, en: <>...</> }`)。レビュー時に diff で両言語の差を確認できる。

#### 未翻訳の扱い

en は schema 上必須として扱う。`body.en` が未提供の段階では「This page is not yet translated. See the Japanese version for now.」 のような翻訳予定スタブを書き、route の `handle.i18n.en` を `"missing"` にして `<TranslationUnavailable />` バナーで明示する (型では強制し、UI では fallback を見せる二段構え)。

#### 翻訳完了 flag

route 単位の翻訳完了状態を `handle.i18n.en` (`"complete"` / `"missing"` / `"partial"`) で持つ。dynamic ルート (`databases/$slug` 等) で content の en が個別に欠落する場合は、route 側の handle を `"partial"` に下げる運用 (route handle はコンテンツ全体の最大値を表す)。

### Build と runtime の境界

| フェーズ | 何が起きるか |
|---|---|
| Build 時 | `validate:content` が全 collection (databases + services) と submit-routing catalog を Zod parse、1 件でも失敗で fail |
| 起動時 | `loader.ts` が `import.meta.glob` で eager load + parse、1 件でも失敗で server / dev が起動失敗 |
| Runtime | `getDatabaseBySlug` / `getServiceById` / `listServicesByTopCategory` は in-memory lookup (1 度だけ初期化) |

Runtime には Zod parse の overhead がない (起動時に終わっている)。

## テスト

### Unit

UI primitives:

- `vitest-axe` で各 primitive / shell component の `axe` violation 0 件を保証

Shell:

- nav 項目 / active 判定 / SwitchLang / LoginButton 出し分け
- NotificationBar の表示順 / 個別 close で他 bar 残存 / 全件 close で section 消失 / sessionStorage 永続化
- NewsAside の 最新 N 件 (`NEWS_LIMIT`) list / 「すべて見る」 link / source / category Tag
- Breadcrumb の 0-1 件 null / handle 駆動描画
- TranslationUnavailable の表示条件 / ja URL で非表示
- ShellLayout の組み立て / skip link

Top route:

- 2-col grid 構成、HeroSection / ServiceGrid / FeaturedServices / NewsAside の存在
- ServiceGrid が `top.order` 順に並ぶ
- ServiceCard の internal / external 切替
- FeaturedServices が featuredTop を name 順 list で表示 (name + description のみ)

Content system:

- 不正な fixture で `validateAll*` が `errors` を返す、`getDatabaseBySlug` / `getServiceById` が存在しない id で `undefined`
- DatabaseContent の parse + `body.ja` / `body.en` の render
- submit `Service` enum の全値が submit usage 付きの service entry を持つ (= flow card で URL が落ちない不変量)

### PBT

Shell:

- shell が追加する全 i18n キーで ja / en のキーセット同一

Top route:

- 任意の有効な `ServiceContent` 入力で Zod parse 成功、無効な組み合わせで失敗
- routes-helpers の path / id 対称性

Content system:

- 任意の有効な `DatabaseContent` 入力で Zod parse 成功
- 任意の有効な `ServiceContent` 入力で Zod parse 成功、無効な組み合わせ (top も submit も無い / top あるのに link 無い) で必ず失敗
