# UI Primitives

`app/ui/` 配下の primitive の **設計原則** と **横断ポリシー** をまとめる。本書は API カタログではない: 各 primitive の Props 型 / variant 値 / class 構成は実装と `/_design` route が SSOT であり、本書は値を二重に書かない。

## デザインシステム SSOT

| 種類 | SSOT | 補足 |
|---|---|---|
| トークン値 (color / font / spacing / radius / shadow / tracking / leading) | `app/styles/tailwind.css` の `@theme` block | Tailwind v4 が utility class を自動生成。値の重複定義を避けるため、本書では数値リテラルを再掲しない |
| primitive 実装 | `app/ui/*.tsx` のコード | Props 型、Variant 切替、class 構造はコードが最終形態 |
| primitive 使い方ガイド (本書) | `docs/ui-primitives.md` | 設計原則 / 横断ポリシー / 視覚カタログの入口 |
| 視覚カタログ | `/_design` route (`app/routes/_design/`) | 全 primitive を variant × state で並べる。production build では除外 |
| 物理強制 | `eslint.config.ts` | 生 hex / arbitrary value / 生 HTML / zones の lint ルール |

トークン名 (`brand`, `fs-h2`, `section-md`, `tracking-tag`, `leading-snug` …) と意味の対応は `app/styles/tailwind.css` のコメントを参照する。本書では token 名で primitive の class を語り、px 値は書かない。

## 設計原則

### トークン参照のみ

`@theme` で定義された token (`brand` / `ink` / `border-soft` / `radius-card` …) を Tailwind utility class (`bg-brand` / `text-ink` / `rounded-card` …) で参照する。`app/{features,routes,content}/` 配下で次は ESLint で物理禁止される (`architecture.md`):

- 生 hex literal (`"#6F4392"` のような文字列)
- arbitrary Tailwind value (`bg-[#6F4392]` / `text-[14px]` / `p-[3px]`)

`app/ui/` と `app/shell/` は arbitrary value を許容するが、生 hex は禁止される。新しい色や spacing が必要になったら、まず `@theme` に token を追加してから token utility 経由で参照する。0.5px 刻みのような半端値は token に置かない (drift の温床)。

### `className` prop を外から受けない

各 primitive は `className?` を **受けない**。variant を表現するには `kind` / `tone` / `size` / `mono` などの semantic prop を追加する。これにより:

- 利用側がデザインを破る class を注入できない
- token を経由しない色 / spacing が漏れ込まない
- ESLint の生 hex / arbitrary value 禁止が確実に効く

レイアウト微調整は wrapper を 1 段被せるか、`Section` / `flex` 等のレイアウト primitive を組み合わせて表現する。

### アクセシビリティを primitive 側で完結

操作可能要素は native `<button>` / `<a>` / `<input>` / `<select>` で実装する (div / span に `role` を後付けしない)。各 primitive で次を保証する:

- focus 表現は global `:focus-visible` (`@theme` の `--color-focus` yellow ring) を経由するだけ。各 primitive は focus 用 class を書かない
- icon-only button は `ariaLabel` 必須 (型レベルで強制)
- `aria-disabled` を `disabled` HTML 属性と lockstep
- 装飾 SVG は `aria-hidden="true"`、機能 SVG は親 `<button aria-label>` に内包
- modal は `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- table は `<caption className="sr-only">` + `<th scope="col" / scope="row">`

色だけで意味を伝えない: status critical / warning は text label + icon / shape を併用する。

### zones

`app/ui/` は他の zone を import しない (`architecture.md`)。`app/ui/` 内部の primitive 同士は import 可。util (`cn` helper や icon 集約) も `app/ui/` 配下に置く。

## ファイル構成

`app/ui/` 配下に primitive ファイル (`button.tsx` / `tag.tsx` / `modal.tsx` 等) と icons (`app/ui/icons/`) を置き、`app/ui/index.ts` で re-export する。外部 module からは `import { Button, Tag, Modal } from "~/ui"` で参照する。 `Header` / `Footer` のような chrome は `app/shell/` 側 (`docs/shell.md`)。

## 共通規約

### variant prop の表現

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

### state 網羅

各 primitive で次の state を必ず実装 + テストする:

- default
- hover (clickable な場合; ホバーで色変化はしない、bundle 仕様)
- focus (global `:focus-visible` の yellow ring を頼る)
- disabled (`aria-disabled="true"` + `disabled` HTML 属性 + opacity 0.55 + `cursor-not-allowed`)
- checked / selected (該当 primitive)
- loading (該当 primitive)

### forward 不可

`forwardRef` を必要に応じて使う (Modal の focus trap で trigger ref を返すケースなど)。`...rest` の spread は許容するが、`className` だけは pick して破棄する。

## primitive カテゴリ

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

## Forms: error state と SR 連携

入力 primitive (`Button` を除く form control: TextInput / TextArea / NativeSelect / FmtRadio / FmtCheck) は、`state="warn"` のような視覚的エラー表現と、screen reader 向けの aria 関連付けを **同時に satisfy する**:

- `aria-invalid` は **state ベース** で primitive 側が自動付与する (`state="warn"` のとき `aria-invalid="true"`、default のとき false / 未設定)
- `aria-describedby` は consumer 側 (`FormGroup` の `errorId` / `hintId` など) が渡せるよう prop を開ける
- error message を表示する側 (`FormGroup` の hint 領域や Callout) は **必ず id を持ち**、その id を input の `aria-describedby` に流す
- placeholder は色情報のみで状態を示さない (placeholder text を error message として使わない)

`FormGroup` 自身は `<fieldset>` + `<legend>` で実装し、`num` + `label` を `<legend>` 内に置く。これにより radio / checkbox 群が単一の質問グループとして screen reader に announce される。1 input (TextInput 等) を子に持つ場合も `<fieldset>` で囲んで問題ない。

placeholder の色は global stylesheet (`app/styles/tailwind.css`) で `::placeholder { color: var(--color-ink-soft) }` を一括指定し、surface (white) 上でコントラスト比 4.5:1 を満たす。

`IconButton` の default size は AA 基準を満たす 26px。touch 主体の文脈 (mobile-first 画面、tap 連打が想定される UI) では consumer 側で `size={44}` を渡す。

## Modal: core 挙動

`Modal` (root) の挙動は code に書きにくい横断ポリシーなのでここで固定する:

- `open=false` のとき何も render しない (mount 状態は親が制御)
- Esc キーで `onClose` 発火 (`closeOnEscape={false}` で無効化)
- overlay click で `onClose` 発火 (dialog 内部 click は伝播停止扱い、pointerdown / click を組合せて drag-out closure を防ぐ。`closeOnOverlay={false}` で無効化)
- focus trap: open 時に dialog 内最初の focusable に focus 移動、Tab / Shift+Tab で dialog 内を循環、close 時に trigger 要素に focus 復元
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby={ariaLabelledby}` + `aria-describedby={ariaDescribedby}` (渡された場合)
- `width` の default は 820、`maxWidth` は `calc(100% - 64px)` で viewport を超えないようにする
- open 時に `document.body.style.overflow = "hidden"` で背景スクロールを抑止し、close 時に復元する

focus trap は外部 dependency を増やさず自前実装する (focus 候補は `:not([disabled]):not([aria-hidden])` の `button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])`、Tab で末尾→先頭・Shift+Tab で先頭→末尾を巻き戻す)。

`ModalPreview` は `<aside>` で render し、`flex-[0_0_44%]` で 2-col modal 内の右 44% 幅を取る (`ModalBody cols={2}` と組合わせる)。 submit 系 modal で「保存したら出る FlowStep」 を予測表示する用途。

## デザイントークン参照

token 値の SSOT は `app/styles/tailwind.css` の `@theme` block。Tailwind v4 が `@theme` 宣言から utility class を自動生成する (`--color-brand` → `bg-brand` / `text-brand` / `border-brand`、`--spacing-section-md` → `p-section-md` / `m-section-md`、`--text-fs-h2` → `text-fs-h2`、`--tracking-tag` → `tracking-tag`、`--leading-snug` → `leading-snug`、`--radius-card` → `rounded-card`、`--shadow-card` → `shadow-card`)。

token の使い分けは `app/styles/tailwind.css` のコメントに添える (値の隣で意味を語る、本書では数値を再掲しない)。新しい色や spacing が必要になったら、まず `@theme` に token を追加し、コメントで意図を書く。半端値 (14.5px / 13.5px のような 0.5px 刻み) は drift の温床なので置かない。

`app/ui/` 内で arbitrary value を書くケース:

- 1px / 3px などの hairline・accent ライン (`border-l-[3px]` 等) で、token 化する価値が薄い細部値
- 1 箇所限定の layout 値 (`PageTitle` subtitle の `max-w-[1100px]`、`SearchBox` scope の `min-w-[140px]`、`ModalPreview` の `flex-[0_0_44%]` など)
- `style={{ color, fontSize, maxWidth }}` で動的に渡される値

`app/shell/` でも次は許容: vh / rem 単位 (`min-h-[60vh]` / `max-w-[10rem]` 等、`@theme` で表現しづらい単位)。

「複数箇所で同じ値が出てきた」 「サイズ感を全体で揃えたい」 と感じたら `@theme` に token を追加して移行する。

## ESLint による物理強制

逸脱検出は `eslint.config.ts` が SSOT:

- `app/{features,routes,content}/`: 生 hex / arbitrary value 禁止、`react/forbid-elements` で生 `button` / `a` / `input` / `select` / `textarea` 禁止 (primitive 経由を強制)
- `app/{ui,shell}/`: 細部値 / vh / rem を許容、生 hex のみ禁止

## 視覚確認

dev 環境 (および `DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` の staging) で `/_design` route を生成する。`routes/_design/primitives.tsx` で全 primitive を variant × size × state すべて並べ、`routes/_design/tokens.tsx` で全 token を一覧表示する。production build では `app/routes.ts` で除外し 404 にする。
