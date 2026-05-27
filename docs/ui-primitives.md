# UI Primitives

`app/ui/` 配下の primitive 仕様。本書はデザインシステムの「使い方ガイド」 (入口) として位置付けられ、値の SSOT は `app/styles/tailwind.css` の `@theme` block、primitive 実装の SSOT は `app/ui/*.tsx` のコード本体に置く。

## 0. デザインシステム SSOT

| 種類 | SSOT | 補足 |
|---|---|---|
| トークン値 (color / font / spacing / radius / shadow / tracking / leading) | `app/styles/tailwind.css` の `@theme` block | Tailwind v4 が utility class を自動生成。値の重複定義を避けるため、本書では数値リテラルを再掲しない |
| primitive 実装 | `app/ui/*.tsx` のコード | Props 型、Variant 切替、class 構造はコードが最終形態 |
| primitive 使い方ガイド (本書) | `docs/ui-primitives.md` | 各 primitive の Props / Variant / 使い分けの説明 |
| 視覚カタログ | `/_design` route (`app/routes/_design/`) | 全 primitive を variant × state で並べる。production build では除外 |
| 物理強制 | `eslint.config.ts` | 生 hex / arbitrary value / 生 HTML / zones の lint ルール |

トークン名 (`brand`, `fs-h2`, `section-md`, `tracking-tag`, `leading-snug` …) と意味の対応は `app/styles/tailwind.css` のコメントを参照する。本書では token 名で primitive の class を語り、px 値は書かない。

## 1. 設計原則

### 1.1 トークン参照のみ

`@theme` で定義された token (`brand` / `ink` / `border-soft` / `radius-card` …) を Tailwind utility class (`bg-brand` / `text-ink` / `rounded-card` …) で参照する。`app/{features,routes,content}/` 配下で次は ESLint で物理禁止される (`architecture.md §3.3`):

- 生 hex literal (`"#6F4392"` のような文字列)
- arbitrary Tailwind value (`bg-[#6F4392]` / `text-[14px]` / `p-[3px]`)

`app/ui/` と `app/shell/` は arbitrary value を許容するが、生 hex は禁止される (shell は logo の `text-fs-h2` 等は token 経由、ただし vh / rem 単位など token 化に向かない細部値は許容)。新しい色や spacing が必要になったら、まず `@theme` に token を追加してから token utility 経由で参照する。0.5px 刻みのような半端値は token に置かない (drift の温床)。

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
├── text-input.tsx              TextInput
├── text-area.tsx               TextArea
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
├── link-card.tsx               LinkCard
├── text-link.tsx               TextLink (内部 link / 外部 link)
└── icons/                      機能アイコン (chevron / close / search / globe / user / external / info)
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
- eyebrow: `text-fs-label text-brand font-bold uppercase tracking-eyebrow font-mono mb-2`
- H1: `text-fs-h1 font-extrabold text-ink leading-tight tracking-h1 m-0`
- subtitle: `text-fs-body text-ink-mid leading-relaxed mt-2.5 max-w-[1100px]`

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

size 別の寸法は `app/ui/search-box.tsx` の `sizeClass` map が SSOT。input / scope / button それぞれの padding-y と font は同 map で variant ごとに切替える (整数値の Tailwind utility のみ、半端値は使わない)。

class 骨格:

- 外周 form: `bg-surface border border-border-strong rounded-card flex items-stretch overflow-hidden shadow-card`
- scope: `flex items-center gap-2 px-3 text-ink font-bold border-r border-border-soft min-w-[140px]` + size 別 `py-* text-fs-*`
- input: `flex-1 min-w-0 border-0 bg-transparent text-ink font-sans caret-ink leading-tight` + size 別 `py-* text-fs-*`
- button: `bg-brand text-white border-0 font-bold cursor-pointer hover:bg-brand-deep leading-none` + size 別 `px-* text-fs-body`

`maxWidth` は `style={{ maxWidth }}` で渡す (token に縛らないレイアウト変数)。検索ボタンは disabled 化しない (常に submit 可能)。

## 5. Layout

### 5.1 Section

ページ内 section の垂直リズム + 中央寄せ + 横余白を担う wrapper。

```ts
type SectionPad = "none" | "sm" | "mid" | "block" | "md" | "lg"

type SectionProps = {
  children: ReactNode
  padTop?: SectionPad
  padBottom?: SectionPad
  padY?: "sm" | "md" | "lg"
  maxWidth?: number
}
```

`SectionPad` → spacing token マッピング (`app/styles/tailwind.css` の `@theme` block が SSOT):

| key | utility | 主用途 |
|---|---|---|
| `none` | `pt-0` / `pb-0` | 隣接 section との直結 |
| `sm` | `pt-section-sm` / `pb-section-sm` | 行間レベルの狭い区切り |
| `mid` | `pt-section-mid` / `pb-section-mid` | 標準より少し詰めたい |
| `block` | `pt-section-block` / `pb-section-block` | ニュース 1 列カード等のブロック |
| `md` | `pt-section-md` / `pb-section-md` | 標準 (default) |
| `lg` | `pt-section-lg` / `pb-section-lg` | hero / 大見出し |

`padY` を渡すと上下同値、`padTop` / `padBottom` を個別指定すると上下を非対称に組める (例: hero 直下の section で `padTop="none"` だけ消す)。default は `padY` が未指定なら `md`、`padTop` / `padBottom` がそれぞれ未指定なら `padY` 由来値にフォールバックする。

class 骨格:

```
<section className="px-page-gutter [pt-* pb-*]">
  <div className="max-w-content-max mx-auto">{children}</div>
</section>
```

`maxWidth` を渡したときだけ内側 div に `style={{ maxWidth }}` で上書きする。

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

`count` は `text-fs-label text-ink-soft` で数字を表示する。`countSuffix` が渡されたときだけ「{count} {countSuffix}」のように半角スペース 1 個挟んで suffix を後置する (ja は `t("common.countSuffix")` で `件`、en は `items`)。`count` が `undefined` のときは何も表示しない (空状態のセクションで「0 件」 を出さない選択も可能)。

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

heading: `text-fs-h3 font-bold text-ink m-0 tracking-h3 leading-tight`。

### 6.3 SidebarGroupLabel

sidebar 内の facet グループ label。mono small-caps。`FacetGroup` 内部から呼ぶ。

```ts
type SidebarGroupLabelProps = {
  children: ReactNode
  action?: ReactNode
}
```

label: `text-fs-label font-bold text-ink-mid tracking-label`。

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

class: `font-mono font-bold uppercase tracking-label text-ink-mid text-fs-label`。`color` / `size` を渡したときは `style={{ color, fontSize: size }}` で上書きする (`color` 値は token utility が表現できない動的色 — 例: source palette — を許容するための逃げ道。`color="brand"` のような token alias は使わず `style` 経由でのみ)。

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
type SizedButtonKind = "primary" | "secondary" | "danger" | "ghost"
type SizedButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  kind?: SizedButtonKind
  size?: "sm" | "md" | "lg"
  block?: boolean
  disabled?: boolean
  children: ReactNode
}
type LinkButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  kind: "link"
  size?: never
  block?: never
  disabled?: boolean
  children: ReactNode
}
type ButtonProps = SizedButtonProps | LinkButtonProps
```

`block` を渡すと `w-full justify-start text-left` が加わり、grid cell や stacked layout の中で全幅ボタンとして並べられる (`FileTypeGrid` での grid cell が代表例)。`kind="link"` には `block` を渡せない (link は padding 0 で全幅化する意味が無いため型レベルで禁止)。

| kind | bg | color | border |
|---|---|---|---|
| primary | `brand` | `#fff` | 0 |
| secondary | `surface` | `ink` | `1px border-soft` |
| danger | `surface` | `red` | `1px red` |
| ghost | `transparent` | `brand-deep` | 0 |
| link | `transparent` | `brand` | 0, `padding: 0`, `font-semibold` |

size (`NativeSelect` / `TextInput` / `TextArea` と high さを揃えた、整数 px の Tailwind 標準スケール):

| size | padding | font |
|---|---|---|
| sm | `px-3 py-1.5` | `text-fs-body-sm` |
| md | `px-4 py-2` | `text-fs-body` |
| lg | `px-6 py-3` | `text-fs-body` |

共通: `inline-flex items-center gap-1.5 rounded-button font-semibold font-sans cursor-pointer leading-none`。disabled 時 `cursor-not-allowed opacity-55`。

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

`ariaDescribedby` を渡すと `aria-describedby` 属性に流す (`FormGroup` の hint / error 領域 id と紐付ける)。`mono` で `font-mono tracking-mono` を加える (DSL 入力など)。

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
export type NativeSelectOption = string | { value: string; label: string }

type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "aria-label" | "aria-describedby" | "aria-invalid"
> & {
  ariaLabel: string
  ariaDescribedby?: string
  options: readonly NativeSelectOption[]
  width?: number
  state?: "default" | "warn"
}
```

state:

- default: `border border-border-soft bg-surface text-ink`、`aria-invalid` 未設定
- warn: `border border-warn-border bg-warn-bg`、空 value 時 `text-ink-soft`、`aria-invalid="true"` を自動付与

共通: `w-full appearance-none text-fs-body py-2 pl-3 pr-8 rounded-button cursor-pointer font-sans`。chevron は `absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-mid`、親に `relative inline-block` を付ける (`width` 未指定時は `width: "auto"`)。

`options` は文字列配列でも、`{ value, label }` の object 配列でもよい (label と value を分けたいときに後者を使う)。`ariaDescribedby` を渡すと `aria-describedby` 属性に流す (`FormGroup` の hint / error 領域 id と紐付ける)。

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
    <span className="font-mono text-fs-micro font-bold text-brand-deep tracking-tag shrink-0">{num}</span>
    <span className="text-fs-body font-bold text-ink">{label}</span>
    {optional && <Tag size="sm">任意</Tag>}
    {hint !== undefined && (
      <span id={hintId} className="text-fs-micro text-ink-mid">{hint}</span>
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
  label: ReactNode
  sub?: ReactNode
  value?: string
  checked?: boolean
  defaultChecked?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement>
}

type FmtCheckProps = Omit<FmtRadioProps, "name"> & { name?: string }
```

class 骨格 (`FmtRadio`):

```
<label className={cn(
  "flex items-start gap-2.5 px-3 py-2 rounded-button cursor-pointer text-fs-body-sm text-ink leading-snug border",
  checked ? "bg-brand-softer border-brand-light/50" : "bg-surface border-border-soft",
)}>
  <input type="radio" name={name} defaultChecked={checked} className="mt-1 shrink-0 accent-brand" />
  <span className="flex-1 min-w-0">
    <span className={checked ? "font-semibold" : "font-medium"}>{label}</span>
    {sub && <span className={cn("block text-fs-micro mt-0.5 font-normal", checked ? "text-brand-deep" : "text-ink-mid")}>{sub}</span>}
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

共通: `inline-flex items-center rounded-tag font-bold tracking-tag whitespace-nowrap leading-snug`。size sm `px-2 py-px text-fs-micro`、md `px-2.5 py-0.5 text-fs-micro` (font は同じ、padding で差別化)。

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

共通: `inline-flex items-center gap-1 px-3 py-1 rounded-pill border text-fs-label font-medium no-underline cursor-pointer`。

`as="a"` は ナビゲーション (URL push) 用、`as="button"` は状態変更だけ (URL 不変) 用。

## 9. Facets

### 9.1 AppliedFilters

適用中の filter chip 一覧を sidebar TOP に並べる。

```ts
export type AppliedFilter = { label: string; value: string; onClear?: () => void }
type AppliedFiltersProps = {
  applied: readonly AppliedFilter[]
  onClearAll?: () => void
  clearAllLabel?: string
}
```

`applied` が空なら何も render しない。`clearAllLabel` の default は `"すべて解除"` (i18n を流したいときは consumer 側で渡す)。

### 9.2 FacetGroup

facet 単位の wrapper。group label + `FacetRow` の集まり + 任意の「+ さらに表示」 link + group ごとの「解除」 link。

```ts
type FacetGroupProps = {
  label: string
  appliedCount?: number
  onClear?: () => void
  showMore?: boolean
  showMoreLabel?: string
  onShowMore?: () => void
  children: ReactNode
}
```

`showMoreLabel` の default は `"+ さらに表示"`。`appliedCount > 0 && onClear` を渡したとき右上に「解除」 link が出る。

### 9.3 FacetRow

facet 内の 1 行。checkbox or radio。

```ts
type FacetRowProps = {
  type?: "checkbox" | "radio"
  name?: string
  label: ReactNode
  count?: string | number
  defaultChecked?: boolean
  checked?: boolean
  swatch?: string
  mono?: boolean
  compact?: boolean
  sub?: ReactNode
  value?: string
  onChange?: ChangeEventHandler<HTMLInputElement>
}
```

`swatch` は左端の色付き 8×8 box (source 色等を表示)。`mono` で label を mono フォントに切替。`compact` を渡すと縦 padding が `py-0.5` に縮む (sidebar 密度を上げたい時)。`checked` (controlled) と `defaultChecked` (uncontrolled) のどちらかで初期 / 制御状態を渡す。`onChange` は native input change event をそのまま受ける。

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
  role?: "status" | "alert" | "note"
}
```

| tone | bg | border | fg |
|---|---|---|---|
| info | `surface-subtle` | `border-soft` | `ink-mid` |
| warn | `warn-bg` | `warn-border` | `warn-fg` |
| ok | `ok-bg` | `ok-border` | `ok-fg` |

class: `px-3.5 py-2.5 border rounded-card text-fs-body-sm leading-relaxed`。consumer 側で垂直リズムを制御するため上下 margin は持たない。

`role` を渡したときは `<div role={role}>` (`"status" | "alert" | "note"`) で出力する。送信失敗の警告等で SR に即座にアナウンスしたい場面では `role="alert"`、操作完了 / 状態変化の通知では `role="status"` を渡す (装飾のみなら未指定)。

## 11. Modal

`Modal` (root) + `ModalHeader` + `ModalBody` + `ModalFooter` + `ModalPreview` + `PreviewCard` を `app/ui/modal.tsx` / `app/ui/modal-preview.tsx` に置く。

### 11.1 Modal

```ts
type ModalProps = {
  open: boolean
  onClose: () => void
  width?: number
  ariaLabelledby: string
  ariaDescribedby?: string
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  children: ReactNode
}
```

挙動:

- `open=false` のとき何も render しない (mount 状態は親が制御)
- Esc キーで `onClose` 発火 (`closeOnEscape={false}` で無効化)
- overlay click で `onClose` 発火 (dialog 内部 click は伝播停止扱い、pointerdown / click を組合せて drag-out closure を防ぐ。`closeOnOverlay={false}` で無効化)
- focus trap: open 時に dialog 内最初の focusable に focus 移動、Tab / Shift+Tab で dialog 内を循環、close 時に trigger 要素に focus 復元
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby={ariaLabelledby}` + `aria-describedby={ariaDescribedby}` (渡された場合)
- `width` の default は 820、`maxWidth` は `calc(100% - 64px)` で viewport を超えないようにする
- open 時に `document.body.style.overflow = "hidden"` で背景スクロールを抑止し、close 時に復元する

focus trap は外部 dependency を増やさず自前実装する (focus 候補は `:not([disabled]):not([aria-hidden])` の `button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])`、Tab で末尾→先頭・Shift+Tab で先頭→末尾を巻き戻す)。

### 11.2 ModalHeader

```ts
type ModalHeaderProps = {
  eyebrowTag?: ReactNode
  eyebrowMeta?: ReactNode
  title: ReactNode
  titleId: string
  description?: ReactNode
  onClose: () => void
  closeLabel?: string
  as?: "h2" | "h3"
}
```

`titleId` は `Modal` の `ariaLabelledby` に渡す id と一致させる。`as` の default は `"h2"`、`closeLabel` の default は `"閉じる"` (X icon button の `aria-label`)。

### 11.3 ModalBody

```ts
type ModalBodyProps = {
  children: ReactNode
  cols?: 1 | 2
  minHeight?: number
}
```

`cols === 2` のとき `flex` を付け、`style={{ minHeight }}` で最小高さを与える (default 460)。

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
  label: ReactNode
  children: ReactNode
  footnote?: ReactNode
}

type PreviewCardProps = {
  source: "DDBJ" | "DBCLS"
  db: string
  title: ReactNode
  body: ReactNode
  active?: boolean
}
```

`ModalPreview` は `<aside>` で render し、`flex-[0_0_44%]` で 2-col modal 内の右 44% 幅を取る (`ModalBody cols={2}` と組合わせる)。`bg-surface-subtle` + 左境界 `border-l border-border-soft` で本体と分離する。`PreviewCard` の `active` default は `true`、`active === false` のとき `opacity-50` で副カード扱いに落とす。

## 12. Pagination

数字ボタン横並び + 前 / 次 / ellipsis。

```ts
type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  maxNumbers?: number
  ariaLabel?: string
  prevLabel?: string
  nextLabel?: string
  jumpToLastLabel?: (n: number) => string
}
```

active button: `border-brand bg-brand text-white`、inactive: `border-border-soft bg-surface text-ink`、disabled: `text-ink-soft cursor-not-allowed opacity-55`。`aria-current="page"` を current に付与、前 / 次 button に `aria-label={prevLabel}` / `aria-label={nextLabel}` を流す。`maxNumbers` を超えるとき末尾ジャンプ (`…` + `totalPages` button) を出し、その button の `aria-label` には `jumpToLastLabel(totalPages)` を渡す。

label 系の default は英語 (`"Pagination"` / `"Previous page"` / `"Next page"` / `"Jump to page n"`)。日本語表示する画面では consumer 側で i18n を経由して上書きする (`a11y.paginationNav` / `paginationPrev` / `paginationNext` / `paginationJumpToLast`)。

primitive はミニマル実装。`<<` / `>>` の chunk skip や URL query 連動は features 側で必要に応じて wrap する。

## 13. LinkCard

カード全体が 1 つの link として振る舞う wrapper。内部 link (RR `<Link>` 経由) と外部 link (`<a target="_blank">`) を一本化する。カード内コンテンツ (icon + title + description 等) は consumer 側で組み立てて children に渡す。

```ts
type LinkCardBase = {
  children: ReactNode
}

type LinkCardProps =
  | (LinkCardBase & { to: To; external?: false; href?: never })
  | (LinkCardBase & { href: string; external: true; to?: never })
```

class: `block bg-surface border border-border-soft rounded-card text-ink no-underline hover:shadow-card-hover transition-shadow`。`shadow-card-hover` は hover で立ち上げる影。外部 link は `target="_blank" rel="noopener noreferrer"` を自動付与する (sr-only な「(external link)」 ラベルは持たない: カード内側に視覚 indicator を置くのが consumer 側の責務 — `ExternalIcon` 等を children 内に配置する)。

## 14. TextLink

内部 link (React Router `<Link>` 経由) と外部 link (`<a target="_blank">`) を一本化した primitive。

```ts
type TextLinkBase = {
  children: ReactNode
  weight?: "normal" | "semibold" | "bold"
}

type TextLinkProps =
  | (TextLinkBase & { to: To; external?: false; href?: never })
  | (TextLinkBase & { href: string; external: true; to?: never })
```

外部 link は `target="_blank" rel="noopener noreferrer"` + 末尾に `<ExternalIcon size={12} aria-hidden />` + sr-only な `<span>(external link)</span>` を添えて SR に外部 link であることを伝える。

class: `text-brand no-underline hover:underline inline-flex items-center gap-1` + `weight` 由来の `font-normal` / `font-semibold` / `font-bold` (default `semibold`)。

## 15. デザイントークン参照

token 値の SSOT は `app/styles/tailwind.css` の `@theme` block。Tailwind v4 が `@theme` 宣言から utility class を自動生成する (`--color-brand` → `bg-brand` / `text-brand` / `border-brand`、`--spacing-section-md` → `p-section-md` / `m-section-md`、`--text-fs-h2` → `text-fs-h2`、`--tracking-tag` → `tracking-tag`、`--leading-snug` → `leading-snug`、`--radius-card` → `rounded-card`、`--shadow-card` → `shadow-card`)。

token の使い分けは `app/styles/tailwind.css` のコメントに添える (値の隣で意味を語る、本書では数値を再掲しない)。新しい色や spacing が必要になったら、まず `@theme` に token を追加し、コメントで意図を書く。半端値 (14.5px / 13.5px のような 0.5px 刻み) は drift の温床なので置かない。

primitive 内で arbitrary value を書くケース (`app/ui/` のみ許容):

- 1px / 3px などの hairline・accent ライン (`border-l-[3px]` 等) で、token 化する価値が薄い細部値
- 1 箇所限定の layout 値: 例
  - `PageTitle` subtitle の `max-w-[1100px]` (`content-max` 1180 より 80px 短く、行長を抑える意図)
  - `SearchBox` scope の `min-w-[140px]` / listbox の `min-w-[220px]` (dropdown 内に閉じた layout)
  - `ModalPreview` の `flex-[0_0_44%]` (2-col modal 右 pane)
- `style={{ color, fontSize, maxWidth }}` で動的に渡される値 (`Label` の source 色、`SearchBox` の `maxWidth` 等)

`app/shell/` でも次は許容 (`@theme` で表現しづらい単位):

- vh / rem 単位: `min-h-[60vh]` (main の最小高さ) / `max-w-[10rem]` (LoginButton username 表示の上限)

「複数箇所で同じ値が出てきた」 「サイズ感を全体で揃えたい」 と感じたら `@theme` に token を追加して移行する。逆に「ここでしか使わないが、現場の文脈で 1180 だと余りすぎる」 のような judgement は token 化せず arbitrary で残す。

## 16. ESLint による物理強制

`eslint.config.ts` の以下が逸脱を検出する。

```ts
// app/{features,routes,content}/**/*.{ts,tsx} に対して (ui / shell は除外)
no-restricted-syntax:
  - Literal[value=/^#[0-9A-Fa-f]{3,8}$/]
  - JSXAttribute[name.name='className'] Literal[value=/\[(#...|...px|...rem|...em|...%)\]/]
react/forbid-elements:
  - button / a / input / select / textarea (primitive 経由を強制)

// app/{ui,shell}/**/*.{ts,tsx} に対して (細部値 / vh / rem 許容、生 hex のみ禁止)
no-restricted-syntax:
  - Literal[value=/^#[0-9A-Fa-f]{3,8}$/]
```

primitive 自体 (`app/ui/`) と chrome (`app/shell/`) は arbitrary value から除外する。`app/ui/` は 3px brand bar や 9999 px radius のような細部値、`app/shell/` は `min-h-[60vh]` / `max-w-[10rem]` のような token 化に向かない単位 (vh / rem) を許容する。両 zone とも生 hex は禁止 (token を経由しない色を防ぐ)。

## 17. 視覚確認

dev 環境 (および `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` の staging) で `/_design` route を生成する。`routes/_design/primitives.tsx` で全 primitive を variant × size × state すべて並べ、`routes/_design/tokens.tsx` で全 token を一覧表示する。production build では `app/routes.ts` で除外し 404 にする。

## 18. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §3.3` | デザイントークンの物理強制 |
| `shell.md` | Header / Footer / NotificationBar / NewsAside / Breadcrumb / TranslationUnavailable |
| `i18n.md §5` | TranslationUnavailable バナーの仕様 |
