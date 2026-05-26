# UI Primitives

`app/ui/` 配下の primitive 仕様。22 primitive を 9 ファイルに分割して実装する。各 primitive は `app/styles/tailwind.css` の `@theme` トークンを utility class 経由でのみ参照し、利用側 (`shell` / `routes` / `features` / `content`) は `import { Button } from "~/ui"` の形で消費する。

## 1. 設計原則

### 1.1 トークン参照のみ

`@theme` で定義された token (`brand` / `ink` / `border-soft` / `radius-card` …) を Tailwind utility class (`bg-brand` / `text-ink` / `rounded-card` …) で参照する。`app/{features,routes,shell,content}/` 配下で次は ESLint で物理禁止される (`architecture.md §3.3`):

- 生 hex literal (`"#6F4392"` のような文字列)
- arbitrary Tailwind value (`bg-[#6F4392]` / `text-[14.5px]` / `p-[3px]`)

`app/ui/` のみこの制限から除外される。primitive 内部で 1px のような細部値や、token に表現しきれない計算値を Tailwind class に直接書ける。新しい色や spacing が必要になったら、まず `@theme` に token を追加してから token utility 経由で参照する。

### 1.2 `className` prop を外から受けない

各 primitive は `className?` を **受けない**。variant を表現するには `kind` / `tone` / `size` / `mono` などの semantic prop を追加する。これにより:

- 利用側がデザインを破る class を注入できない
- token を経由しない色 / spacing が漏れ込まない
- ESLint の生 hex / arbitrary value 禁止が確実に効く

レイアウト微調整 (例: 親側で `gap` / `margin` を制御したい) は wrapper を 1 段被せるか、`Section` / `flex` 等のレイアウト primitive を組み合わせて表現する。

### 1.3 アクセシビリティを primitive 側で完結

操作可能要素は native `<button>` / `<a>` / `<input>` / `<select>` で実装する (div / span に `role` を後付けしない、`design/constraints.md §5`)。各 primitive で次を保証する:

- focus 表現は global `:focus-visible` (`@theme` の `--color-focus` yellow ring) を経由するだけ。各 primitive は focus 用 class を書かない
- icon-only button は `ariaLabel` 必須 (型レベルで強制)
- `aria-disabled` を `disabled` HTML 属性と lockstep
- 装飾 SVG は `aria-hidden="true"`、機能 SVG は親 `<button aria-label>` に内包
- modal は `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- table は `<caption className="sr-only">` + `<th scope="col" / scope="row">`

色だけで意味を伝えない: status critical / warning は text label + icon / shape を併用する。

### 1.4 zones

`app/ui/` は他の zone を import しない (`architecture.md §3` 表)。`app/ui/` 内部の primitive 同士は import 可。util (`cn` helper や icon 集約) も `app/ui/` 配下に置く。

## 2. ファイル構成

```
app/ui/
├── index.ts                    全 primitive を re-export
├── cn.ts                       conditional class joiner (内部 util)
├── page.tsx                    Page
├── page-title.tsx              PageTitle
├── search-box.tsx              SearchBox
├── section.tsx                 Section
├── section-heading.tsx         SectionHeading
├── sidebar-heading.tsx         SidebarHeading
├── sidebar-group-label.tsx     SidebarGroupLabel
├── label.tsx                   Label
├── button.tsx                  Button
├── icon-button.tsx             IconButton
├── native-select.tsx           NativeSelect
├── form-group.tsx              FormGroup
├── fmt-radio.tsx               FmtRadio
├── fmt-check.tsx               FmtCheck
├── tag.tsx                     Tag
├── chip.tsx                    Chip
├── applied-filters.tsx         AppliedFilters
├── facet-group.tsx             FacetGroup
├── facet-row.tsx               FacetRow
├── date-facet.tsx              DateFacet
├── callout.tsx                 Callout
├── modal.tsx                   Modal + ModalHeader + ModalBody + ModalFooter
├── modal-preview.tsx           ModalPreview + PreviewCard
├── pagination.tsx              Pagination
├── text-link.tsx               TextLink (内部 link / 外部 link)
└── icons/                      機能アイコン (chevron / close / search / globe / user)
    └── index.tsx
```

外部 module からは `import { Button, Tag, Modal } from "~/ui"` で参照する。`Header` / `Footer` のような chrome は `app/shell/` 側に置く (画面 chrome は global layout の責務、`docs/shell.md`)。

## 3. 共通規約

### 3.1 variant prop の表現

state 表現には次の prop を使う:

| prop | 採用 primitive | 例 |
|---|---|---|
| `kind` | Button / Tag / Chip | `kind="primary"` / `kind="brand"` / `kind="filter"` |
| `tone` | Tag (status) / Callout | `tone="critical"` / `tone="warn"` |
| `size` | Button / Tag / SearchBox | `size="sm" \| "md" \| "lg"` |
| `mono` | Tag / Chip / Label | `mono` (boolean) |
| `selected` | Chip / FacetRow | `selected` (boolean) |
| `as` | Chip / SectionHeading | `as="a" \| "button"` / `as="h2" \| "h3"` |

新しい variant を増やすときは本書の対応セクションと `app/ui/` の primitive 定義を同時に更新する。

### 3.2 state 網羅

各 primitive で次の state を必ず実装 + テストする:

- default
- hover (clickable な場合; ホバーで色変化はしない、bundle 仕様)
- focus (global `:focus-visible` の yellow ring を頼る)
- disabled (`aria-disabled="true"` + `disabled` HTML 属性 + opacity 0.55 + `cursor-not-allowed`)
- checked / selected (該当 primitive)
- loading (該当 primitive)

### 3.3 forward 不可

`forwardRef` を必要に応じて使う (Modal の focus trap で trigger ref を返すケースなど)。`...rest` の spread は許容するが、`className` だけは pick して破棄する。

## 4. Chrome primitives

`app/ui/page.tsx` / `app/ui/page-title.tsx` / `app/ui/search-box.tsx`。Header / Footer は global chrome なので `app/shell/` 側に置く (`docs/shell.md`)。

### 4.1 Page

ページ全体のルート wrapper。font / color / leading の基準を設定する。

```ts
type PageProps = { children: ReactNode }
```

class:

```
min-h-full w-full bg-surface text-ink font-sans text-fs-body leading-relaxed
```

global stylesheet (`:focus-visible` / `.sr-only` 等) は `app/styles/tailwind.css` で root level に置くため、`Page` は最小の wrapper の責務だけ持つ。

### 4.2 PageTitle

H1 (28px) + 任意の eyebrow (mono small-caps) + 任意の subtitle。3px brand 左バーは持たない (バーは `SectionHeading` の予約)。

```ts
type PageTitleProps = {
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: ReactNode
  maxWidth?: number
}
```

class 骨格:

- 外周: `px-page-gutter pt-9 pb-6`
- 内側 wrapper: `max-w-content-max mx-auto` (default) または `style={{ maxWidth }}`
- eyebrow: `text-fs-label text-brand font-bold uppercase tracking-[0.1em] font-mono mb-2`
- H1: `text-fs-h1 font-extrabold text-ink leading-tight tracking-tight m-0`
- subtitle: `text-[14.5px] text-ink-mid leading-relaxed mt-2.5 max-w-[1100px]`

### 4.3 SearchBox

検索 input + scope selector + 検索ボタンの一体型。Top / Search / Search Results 3 種で共通使用。

```ts
type SearchBoxProps = {
  value?: string
  defaultValue?: string
  placeholder?: string
  scope?: string
  scopeOptions?: readonly string[]
  onScopeChange?: (value: string) => void
  maxWidth?: number
  showSearchIcon?: boolean
  showScope?: boolean
  size?: "md" | "lg"
  ariaLabel?: string
  submitLabel?: string
  scopeAriaLabel?: string
  onSubmit?: (query: string, scope?: string) => void
}
```

size 別寸法 (`primitives/chrome.md §SearchBox` を SSOT として参照):

| size | 入力 padding-y | scope padding-y | input font | scope font | button padding-x | button font |
|---|---|---|---|---|---|---|
| md | 11 | 10 | 15 | 14 | 26 | 14.5 |
| lg | 13 | 12 | 16 | 14.5 | 30 | 15.5 |

class 骨格:

- 外周 form: `bg-surface border border-border-strong rounded-card flex items-stretch overflow-hidden shadow-card`
- scope label: `flex items-center gap-2 px-4 py-2.5 text-[14px] font-bold border-r border-border-soft cursor-pointer text-ink min-w-[200px]`
- input: `flex-1 border-0 bg-transparent text-[15px] py-2.5 outline-none text-ink font-sans`
- button: `bg-brand text-white border-0 px-7 text-[14.5px] font-bold cursor-pointer`

`maxWidth` は `style={{ maxWidth }}` で渡す (token に縛らないレイアウト変数)。検索ボタンは disabled 化しない (常に submit 可能)。

## 5. Layout

### 5.1 Section

ページ内 section の垂直リズム + 中央寄せ + 横余白を担う wrapper。

```ts
type SectionProps = {
  children: ReactNode
  padY?: "lg" | "md" | "sm"
  maxWidth?: number
}
```

`padY` マッピング: `lg → py-section-lg` (48px) / `md → py-section-md` (32px) / `sm → py-section-sm` (16px)。

class 骨格:

```
<section className="px-page-gutter [py-section-*]">
  <div className="max-w-content-max mx-auto">{children}</div>
</section>
```

`maxWidth` を渡したときだけ `style={{ maxWidth }}` で上書きする。

## 6. Headings & Labels

### 6.1 SectionHeading

main-column の H2。**3px brand 左バー付き**。

```ts
type SectionHeadingProps = {
  children: ReactNode
  subtitle?: ReactNode
  count?: number
  countSuffix?: string
  action?: ReactNode
  as?: "h2" | "h3"
  id?: string
}
```

class 骨格 (heading 部):

```
text-fs-h2 font-bold text-ink m-0 pl-2.5 border-l-[3px] border-brand leading-tight
```

container は `flex flex-col gap-1.5 mb-3`、heading 行は `flex items-baseline justify-between gap-3 flex-wrap`、内側に `flex items-baseline gap-2.5 min-w-0` の wrapper を置いて heading + `count` を、`action` を右に出す。

`subtitle` が渡されたときは heading 行の直下に `<p className="text-fs-body-sm text-ink-mid m-0 pl-2.5">{subtitle}</p>` として描画する (左 padding は heading のバー位置に揃える)。AI 検索アシスタント等、heading + 説明文の組合せで使う。

`count` は `text-[12.5px] text-ink-soft` で数字を表示する。`countSuffix` が渡されたときだけ「{count} {countSuffix}」のように半角スペース 1 個挟んで suffix を後置する (ja は `t("common.countSuffix")` で `件`、en は `items`)。`count` が `undefined` のときは何も表示しない (空状態のセクションで「0 件」 を出さない選択も可能)。

### 6.2 SidebarHeading

sidebar / right-pane の主見出し。**バー無し**。

```ts
type SidebarHeadingProps = {
  children: ReactNode
  action?: ReactNode
  as?: "h2" | "h3"
  id?: string
}
```

heading: `text-fs-h3 font-bold text-ink m-0 tracking-tight leading-tight`。

### 6.3 SidebarGroupLabel

sidebar 内の facet グループ label。mono small-caps。`FacetGroup` 内部から呼ぶ。

```ts
type SidebarGroupLabelProps = {
  children: ReactNode
  action?: ReactNode
}
```

label: `text-fs-label font-bold text-ink-mid tracking-[0.06em]`。

### 6.4 Label

汎用 mono small-caps label。eyebrow / "WHERE" / "NO CONDITIONS" / "クエリプレビュー" / "FROM" / "TO" / "適用中 · n" 等で使う。

```ts
type LabelProps = {
  children: ReactNode
  color?: string
  size?: number
  as?: "span" | "div"
}
```

class: `font-mono font-bold uppercase tracking-[0.08em] text-ink-mid`。`color` / `size` を渡したときは `style={{ color, fontSize: size }}` で上書きする (`color` 値は token utility が表現できない動的色 — 例: source palette — を許容するための逃げ道。`color="brand"` のような token alias は使わず `style` 経由でのみ)。

## 7. Forms

### 7.0 Error state と SR 連携

入力 primitive (`Button` を除く form control: TextInput / TextArea / NativeSelect / FmtRadio / FmtCheck) は、`state="warn"` のような視覚的エラー表現と、screen reader 向けの aria 関連付けを **同時に satisfy する**。

- `aria-invalid` は **state ベース** で primitive 側が自動付与する (`state="warn"` のとき `aria-invalid="true"`、default のとき false / 未設定)
- `aria-describedby` は consumer 側 (`FormGroup` の `errorId` / `hintId` など) が渡せるよう prop を開ける
- error message を表示する側 (`FormGroup` の hint 領域や Callout) は **必ず id を持ち**、その id を input の `aria-describedby` に流す
- placeholder は色情報のみで状態を示さない (placeholder text を error message として使わない)

`FormGroup` 自身は `<fieldset>` + `<legend>` で実装し、`num` + `label` を `<legend>` 内に置く。これにより radio / checkbox 群が単一の質問グループとして screen reader に announce される。1 input (TextInput 等) を子に持つ場合も `<fieldset>` で囲んで問題ない。

placeholder の色は global stylesheet (`app/styles/tailwind.css`) で `::placeholder { color: var(--color-ink-soft) }` を一括指定し、surface (white) 上でコントラスト比 4.5:1 を満たす。

### 7.1 Button

5 種類 × 3 サイズの汎用ボタン。

```ts
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  kind?: "primary" | "secondary" | "danger" | "ghost" | "link"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  children: ReactNode
}
```

| kind | bg | color | border |
|---|---|---|---|
| primary | `brand` | `#fff` | 0 |
| secondary | `surface` | `ink` | `1px border-soft` |
| danger | `surface` | `red` | `1px red` |
| ghost | `transparent` | `brand-deep` | 0 |
| link | `transparent` | `brand` | 0, `padding: 0`, `weight 600` |

size:

| size | padding | font-size |
|---|---|---|
| sm | `px-3 py-1.5` | 13 (`text-[13px]`) |
| md | `px-4.5 py-2.25` | `text-fs-body` (14) |
| lg | `px-5.5 py-2.75` | 15 (`text-[15px]`) |

共通: `inline-flex items-center gap-1.5 rounded-button font-semibold font-sans cursor-pointer`。disabled 時 `cursor-not-allowed opacity-55`。

### 7.2 IconButton

icon-only の小型ボタン。`ariaLabel` 必須 (型レベルで強制)。

```ts
type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "aria-label"> & {
  ariaLabel: string
  children: ReactNode
  size?: number
}
```

class: `p-0 bg-transparent border-0 text-ink-mid cursor-pointer rounded-button inline-flex items-center justify-center` + `style={{ width: size, height: size }}` (default 26px)。

mobile touch target: WCAG 2.2 AA は最小 24×24px、AAA enhanced は 44×44px を推奨する。default size 26px は AA を満たすが、touch 主体の文脈 (mobile-first な画面、tap 連打が想定される UI) では consumer 側で `size={44}` を渡す。primitive 側の default を 44 に上げると desktop で密度が落ちるため、judgement は consumer に委ねる。

### 7.3 TextInput

汎用 text input。`<input type="text">` 系の thin wrapper。

```ts
type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "aria-label"> & {
  ariaLabel: string
  ariaDescribedby?: string
  state?: "default" | "warn"
  mono?: boolean
  width?: number
}
```

state:

- default: `border border-border-soft bg-surface text-ink`、`aria-invalid` 未設定
- warn: `border border-warn-border bg-warn-bg text-ink`、`aria-invalid="true"` を自動付与

`ariaDescribedby` を渡すと `aria-describedby` 属性に流す (`FormGroup` の hint / error 領域 id と紐付ける)。`mono` で `font-mono tracking-[0.02em]` を加える (DSL 入力など)。

class 共通: `text-fs-body py-2 px-3 rounded-button font-sans`。

### 7.4 TextArea

複数行入力。`TextInput` と同じ prop / state policy。

```ts
type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "aria-label"> & {
  ariaLabel: string
  ariaDescribedby?: string
  state?: "default" | "warn"
  mono?: boolean
  width?: number
}
```

class 共通: `block w-full text-fs-body py-2 px-3 rounded-button font-sans resize-none`。default `rows={3}`。

### 7.5 NativeSelect

OS native `<select>` のスタイル付きラッパー。`appearance: none` で chevron は自前 SVG。

```ts
type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "aria-label"> & {
  ariaLabel: string
  options: string[]
  width?: number
  state?: "default" | "warn"
}
```

state:

- default: `border border-border-soft bg-surface text-ink`
- warn: `border border-warn-border bg-warn-bg`、空 value 時 `text-ink-soft`

共通: `w-full appearance-none text-fs-body py-2 pl-3 pr-8 rounded-button outline-none cursor-pointer font-sans`。chevron は `absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none`、親に `relative` を付ける。

### 7.6 FormGroup

Modal 内の質問グループ。番号 + ラベル + 回答群を縦に並べる。`<fieldset>` + `<legend>` で質問群を semantic に閉じる。

```ts
type FormGroupProps = {
  num: string
  label: ReactNode
  optional?: boolean
  hint?: ReactNode
  hintId?: string
  children: ReactNode
}
```

骨格:

```
<fieldset className="mb-5 border-0 p-0 m-0" aria-describedby={hintId}>
  <legend className="flex items-baseline gap-2 mb-2 flex-wrap p-0">
    <span className="font-mono text-fs-micro font-bold text-brand-deep tracking-[0.04em] shrink-0">{num}</span>
    <span className="text-fs-body font-bold text-ink">{label}</span>
    {optional && <Tag size="sm">任意</Tag>}
    {hint !== undefined && (
      <span id={hintId} className="text-[11.5px] text-ink-mid">{hint}</span>
    )}
  </legend>
  <div className="flex flex-col gap-1">{children}</div>
</fieldset>
```

`hintId` を渡すと hint span に `id` を付け、`<fieldset aria-describedby>` で legend と hint を関連付ける。子の input primitive (TextInput / TextArea / NativeSelect) には `ariaDescribedby={hintId}` を流して読み上げ順を揃える。

### 7.7 FmtRadio / FmtCheck

Modal 内の radio / checkbox card。checked 時に `brand-softer` 背景 + `brand-light/50` border。

```ts
type FmtRadioProps = {
  name: string
  label: string
  sub?: string
  checked?: boolean
  value?: string
}

type FmtCheckProps = Omit<FmtRadioProps, "name"> & { name?: string }
```

class 骨格 (`FmtRadio`):

```
<label className={cn(
  "flex items-start gap-2.5 px-3 py-2 rounded-button cursor-pointer text-[13.5px] text-ink leading-snug border",
  checked ? "bg-brand-softer border-brand-light/50" : "bg-surface border-border-soft",
)}>
  <input type="radio" name={name} defaultChecked={checked} className="mt-1 shrink-0 accent-brand" />
  <span className="flex-1 min-w-0">
    <span className={checked ? "font-semibold" : "font-medium"}>{label}</span>
    {sub && <span className={cn("block text-[11.5px] mt-0.5 font-normal", checked ? "text-brand-deep" : "text-ink-mid")}>{sub}</span>}
  </span>
</label>
```

`FmtCheck` は `type="checkbox"` に置換するだけ。

## 8. Tags & Chips

### 8.1 Tag

非インタラクティブ label。content / source / status を 1 primitive で表現する。

```ts
type TagProps =
  | { kind?: "tag"; size?: "sm" | "md"; mono?: boolean; children: ReactNode }
  | { kind: "brand"; size?: "sm" | "md"; mono?: boolean; children: ReactNode }
  | { kind: "source"; name: "DDBJ" | "DBCLS"; size?: "sm" | "md"; mono?: boolean; children?: ReactNode }
  | { kind: "status"; tone: "critical" | "warning" | "success" | "info"; size?: "sm" | "md"; mono?: boolean; children: ReactNode }
```

discriminated union で `source` は `name` を、`status` は `tone` を要求する。

| kind / tone | bg | fg | border |
|---|---|---|---|
| tag | `surface-subtle` | `ink-mid` | `border-soft` |
| brand | `brand-soft` | `brand-deep` | none |
| source: DDBJ | `src-ddbj-soft` | `src-ddbj` | none |
| source: DBCLS | `src-dbcls-soft` | `src-dbcls` | none |
| status: critical | `critical-bg` | `critical-fg` | `critical-border` |
| status: warning | `warn-bg` | `warn-fg` | `warn-border` |
| status: success | `ok-bg` | `ok-fg` | `ok-border` |
| status: info | `brand-soft` | `brand-deep` | none |

共通: `inline-flex items-center rounded-tag font-bold tracking-[0.04em] whitespace-nowrap leading-tight`。size sm `px-2 py-px text-fs-micro`、md `px-2.5 py-0.5 text-[11.5px]`。

### 8.2 Chip

インタラクティブ pill。フィルター chip と example chip の 2 種。

```ts
type ChipPropsBase = {
  children: ReactNode
  kind?: "filter" | "example"
  mono?: boolean
  selected?: boolean
}
type ChipProps =
  | (ChipPropsBase & { as?: "a"; to: To; onClick?: never })
  | (ChipPropsBase & { as: "button"; onClick?: MouseEventHandler<HTMLButtonElement>; to?: never })
```

| kind / state | bg | fg | border |
|---|---|---|---|
| filter (default) | `surface-subtle` | `ink-mid` | `border-soft` |
| filter (selected) | `brand-soft` | `brand-deep` | `brand/35` |
| example | `surface-subtle` | `ink-mid` | `border-soft` |

共通: `inline-flex items-center gap-1 px-3 py-1 rounded-pill border text-[12.5px] font-medium no-underline cursor-pointer`。

`as="a"` は ナビゲーション (URL push) 用、`as="button"` は状態変更だけ (URL 不変) 用。

## 9. Facets

### 9.1 AppliedFilters

適用中の filter chip 一覧を sidebar TOP に並べる。

```ts
type AppliedFilter = { label: string; value: string; onClear?: () => void }
type AppliedFiltersProps = {
  applied: AppliedFilter[]
  onClearAll?: () => void
}
```

`applied` が空なら何も render しない。

### 9.2 FacetGroup

facet 単位の wrapper。group label + `FacetRow` の集まり + 任意の「+ さらに表示」 link + group ごとの「解除」 link。

```ts
type FacetGroupProps = {
  label: string
  appliedCount?: number
  onClear?: () => void
  showMore?: boolean
  showMoreLabel?: string
  children: ReactNode
}
```

### 9.3 FacetRow

facet 内の 1 行。checkbox or radio。

```ts
type FacetRowProps = {
  type?: "checkbox" | "radio"
  name?: string
  label: string
  count?: string | number
  defaultChecked?: boolean
  swatch?: string
  mono?: boolean
  compact?: boolean
  sub?: string
  onChange?: (checked: boolean) => void
}
```

`swatch` は左端の色付き 8×8 box (source 色等を表示)。`mono` で label を mono フォントに切替。

### 9.4 DateFacet

「すべて / 1年 / 5年 / 10年」 segmented quick range + collapsible FROM/TO。

```ts
type DateRangeKey = "all" | "1y" | "5y" | "10y"
type DateFacetProps = {
  label?: string
  active?: DateRangeKey
  appliedCount?: number
  onClear?: () => void
  onRangeChange?: (key: DateRangeKey) => void
  from?: string
  to?: string
  onFromChange?: (value: string) => void
  onToChange?: (value: string) => void
}
```

segmented button: active は `bg-brand-soft text-brand-deep border-brand/35`、inactive は `bg-transparent text-ink-mid border-border-soft`。

## 10. Callout

inline notice。3 tone (info / warn / ok)、icon なし。

```ts
type CalloutProps = {
  children: ReactNode
  tone?: "info" | "warn" | "ok"
}
```

| tone | bg | border | fg |
|---|---|---|---|
| info | `surface-subtle` | `border-soft` | `ink-mid` |
| warn | `warn-bg` | `warn-border` | `warn-fg` |
| ok | `ok-bg` | `ok-border` | `ok-fg` |

class: `mt-3 px-3.5 py-2.5 border rounded-card text-[13.5px] leading-relaxed`。

## 11. Modal

`Modal` (root) + `ModalHeader` + `ModalBody` + `ModalFooter` + `ModalPreview` + `PreviewCard` を `app/ui/modal.tsx` / `app/ui/modal-preview.tsx` に置く。

### 11.1 Modal

```ts
type ModalProps = {
  open: boolean
  onClose: () => void
  width?: number
  ariaLabelledby: string
  children: ReactNode
}
```

挙動:

- `open=false` のとき何も render しない (mount 状態は親が制御)
- Esc キーで `onClose` 発火
- overlay click で `onClose` 発火 (dialog 内部 click は `stopPropagation`)
- focus trap: open 時に dialog 内最初の focusable に focus 移動、Tab / Shift+Tab で dialog 内を循環、close 時に trigger 要素に focus 復元
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby={ariaLabelledby}`

focus trap は外部 dependency を増やさず自前実装する (focus 候補は `:not([disabled]):not([aria-hidden])` の `button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])`、Tab で末尾→先頭・Shift+Tab で先頭→末尾を巻き戻す)。

### 11.2 ModalHeader

```ts
type ModalHeaderProps = {
  eyebrowTag?: ReactNode
  eyebrowMeta?: ReactNode
  title: string
  titleId: string
  description?: string
  onClose: () => void
}
```

`titleId` は `Modal` の `ariaLabelledby` に渡す id と一致させる。

### 11.3 ModalBody

```ts
type ModalBodyProps = {
  children: ReactNode
  cols?: 1 | 2
  minHeight?: number
}
```

`cols === 2` のとき `flex` + `min-h-[460px]`。

### 11.4 ModalFooter

```ts
type ModalFooterProps = {
  status?: ReactNode
  actions: ReactNode
}
```

class: `px-5 py-3 border-t border-border-soft bg-surface-subtle flex justify-between items-center gap-2`。

### 11.5 ModalPreview / PreviewCard

2-col modal の右側 preview pane と、その中の 1 件カード。submit 系 modal で使う。

```ts
type ModalPreviewProps = {
  label: string
  children: ReactNode
  footnote?: ReactNode
}

type PreviewCardProps = {
  source: "DDBJ" | "DBCLS"
  db: string
  title: string
  body: string
  active?: boolean
}
```

## 12. Pagination

数字ボタン横並び + 前 / 次 / ellipsis。

```ts
type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  maxNumbers?: number
}
```

active button: `border-brand bg-brand text-white`、inactive: `border-border-soft bg-surface text-ink`、disabled: `text-ink-soft cursor-not-allowed opacity-55`。`aria-current="page"` を current に付与、前 / 次 button に `aria-label="前のページ" / "次のページ"`。

primitive はミニマル実装。`<<` / `>>` の chunk skip や URL query 連動は features 側で必要に応じて wrap する。

## 13. TextLink

内部 link (React Router `<Link>` 経由) と外部 link (`<a target="_blank">`) を一本化した primitive。

```ts
type TextLinkProps =
  | { to: To; external?: false; children: ReactNode }
  | { href: string; external: true; children: ReactNode }
```

外部 link は `target="_blank" rel="noopener noreferrer"` + `aria-label` に「(external link)」 を含める。視覚 indicator として右に小さい外向き矢印 icon を出す。

class: `text-brand font-semibold no-underline hover:underline`。

## 14. デザイントークン参照

`@theme` の token は `app/styles/tailwind.css` で確定する (color / typography / spacing / radius / shadow の SSOT)。Tailwind v4 は `@theme` 宣言から自動で utility class を生成する (`--color-brand` → `bg-brand` / `text-brand` / `border-brand`、`--spacing-section-lg` → `p-section-lg` / `m-section-lg`)。

primitive 内で direct 値を書くケース:

- 1px / 0.5px / 18px などの hairline、`@theme` で予約してない細部値 — `app/ui/` のみ許容
- `style={{ color, fontSize, maxWidth }}` で動的に渡される値 — `Label` の source 色や `SearchBox` の幅など、token 化しても消費側で逃げ道が要るケース

## 15. ESLint による物理強制

`eslint.config.ts` の以下が逸脱を検出する。

```ts
// app/{features,routes,content}/**/*.{ts,tsx} に対して (ui / shell は除外)
no-restricted-syntax:
  - Literal[value=/^#[0-9A-Fa-f]{3,8}$/]
  - JSXAttribute[name.name='className'] Literal[value=/\[(#...|...px|...rem|...em|...%)\]/]
react/forbid-elements:
  - button / a / input / select / textarea (primitive 経由を強制)

// app/shell/**/*.{ts,tsx} に対して (chrome レベル、arbitrary value 許容、生 hex のみ禁止)
no-restricted-syntax:
  - Literal[value=/^#[0-9A-Fa-f]{3,8}$/]
```

primitive 自体は `app/ui/` 配下なので除外される。`app/shell/` (Header / Footer / NotificationBar 等の chrome) も `react/forbid-elements` と arbitrary value 禁止から除外する (デザイン仕様上の細部値 — 14.5px nav / 17px logo / 18px divider など — を token 化すると tokens が肥大化するため)。`app/shell/` でも生 hex は禁止される (token 違反を防ぐ)。

## 16. 視覚確認

dev 環境 (および `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` の staging) で `/_design` route を生成する。`routes/_design/primitives.tsx` で 22 primitive を variant × size × state すべて並べ、`routes/_design/tokens.tsx` で全 token を一覧表示する。production build では `app/routes.ts` で除外し 404 にする。

## 17. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §3.3` | デザイントークンの物理強制 |
| `shell.md` | Header / Footer / NotificationBar / NewsAside / Breadcrumb / TranslationUnavailable |
| `i18n.md §5` | TranslationUnavailable バナーの仕様 |
