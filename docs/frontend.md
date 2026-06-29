# Frontend

フロントエンドの primitive デザインシステム (`app/ui/`) と、コンテンツ collection (`app/content/` + `app/lib/content/`) の SSOT。primitive の設計原則・横断ポリシー、コンテンツ collection の契約をこの順で扱う。

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

`app/ui/` 配下に primitive ファイルと icons (`app/ui/icons/`) を置き、`app/ui/index.ts` で re-export する。外部 module からは `import { Button, Tag, Modal } from "~/ui"` で参照する。`app/ui/` は他の zone を import せず (`architecture.md`)、内部の primitive 同士・util (`cn` helper や icon 集約) は `app/ui/` 配下で閉じる。`Header` のような chrome は `app/shell/` 側に置く。

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

- **Chrome** (`page.tsx` / `page-title.tsx` / `search-box.tsx`): ページ全体の wrapper、H1 + eyebrow、Top / Search / results で共通利用する一体型検索 input。`PageTitle` は左バーを持たない (左バーは `SectionHeading` の予約)。`SearchBox` は `trailing` slot (検索ボタン左の差し込み) と AI クエリビルダーの brand 着色を持ち、キーワード / AI クエリビルダー切替トグルをボックス内に納める。scope スロットを隠してもボックス高さは保ち、キーワード ⇄ AI クエリビルダーの切替で高さがガタつかない。`/search` は提案レビュー型の `SearchInputPanel`、top / results は生成→遷移型の `NavigableSearchInput` がこの `SearchBox` を包む (`search.md`)
- **Layout** (`section.tsx`): 垂直リズム + 中央寄せ + 横余白を担う wrapper。`padTop` / `padBottom` で上下 padding を個別に選ぶ (段階の token は `app/styles/tailwind.css` の `@theme` `--spacing-section-*` が SSOT)
- **Headings & Labels** (`section-heading.tsx` / `sidebar-heading.tsx` / `sidebar-group-label.tsx` / `label.tsx`): main column 用 `SectionHeading` は装飾の左バー付き、sidebar 用 `SidebarHeading` はバー無しで、main column と sidebar を視覚的に切り分ける規約。`Label` の `color` prop は token 表現外の動的色 (source palette 等) を受け取る逃げ道
- **Forms** (`button.tsx` / `icon-button.tsx` / `text-input.tsx` / `text-area.tsx` / `select.tsx` / `combobox.tsx` / `form-group.tsx` / `fmt-radio.tsx` / `fmt-check.tsx`): native `<button>` / `<input>` の thin wrapper、および native `<select>` を代替する custom popover の `Select` / `Combobox`。error state policy は次節:
  - `Select`: 固定リストから 1 つ選ぶ
  - `Combobox`: editable な派生。候補を前方/部分一致で絞りつつ、候補に無い値も自由入力で確定できる (facet 集計に出ない正当な値を排除しない、検索ビルダーの facet 値入力)。`value` と表示 `label` を分離でき organism の学名表示等に使う
  - `Select` / `TextInput` / `Combobox` は固定高さ variant を持ち query builder の行高を揃える
- **Tags & Chips** (`tag.tsx` / `chip.tsx` / `examples.tsx`): `Tag` は非インタラクティブ label、`Chip` はインタラクティブ pill。`Chip` は `as` で URL push (link) か状態変更 (button) かを切り替える。`Examples` は `例:` ラベル + Chip 群の共通行で、top hero / `/search` / results で共有する
- **Facets** (`applied-filters.tsx` / `facet-group.tsx` / `facet-row.tsx` / `date-facet.tsx`): sidebar facet UI。`DateFacet` は segmented quick range + collapsible FROM/TO
- **Callout** (`callout.tsx`): inline notice、3 tone (info / warn / ok)、`role="status" | "alert"` を consumer 側が制御
- **Modal** (`modal.tsx` / `modal-preview.tsx`): `Modal` (root) + `ModalHeader` / `ModalBody` / `ModalFooter` + `ModalPreview` / `PreviewCard` の家族。詳細は次節の Modal core を参照
- **その他** (`pagination.tsx` / `link-card.tsx` / `text-link.tsx` / `info-hint.tsx` / `segmented.tsx` / `stable-label.tsx`): pagination は数字ボタン + 前 / 次 / ellipsis のミニマル実装。`LinkCard` / `TextLink` は **内部 link (RR `<Link>`) と外部 link (`<a target="_blank">`) を 1 primitive に統一**、外部は `rel="noopener noreferrer"` を自動付与。`InfoHint` は ⓘ トリガで hover / focus / pin する tooltip (native `title` を使わない)、`Segmented` は 2 値以上の即時切替トグル (AND/OR・DSL/グラフ等、active を brand 塗り)、`StableLabel` は取り得る全ラベルの最大幅を確保してテキスト差し替え (検索 ⇄ 検索中…) でコントロールがリサイズしないようにする layout helper

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

## Content system

コンテンツは 2 系統で管理する: **Markdown ページ** (`page-contents/`) と **TypeScript collection** (`app/content/`)。

### Markdown ページ (`page-contents/`)

データベース解説、ポリシー、ガイド等の読み物コンテンツを素の Markdown で管理する。非エンジニアが編集できることを重視し、JSX や TypeScript の知識を不要にしている。

#### ディレクトリ構成と URL マッピング

`page-contents/<path>/index.md` → `/<path>` にマッピング。`index.en.md` が英語版。

```
page-contents/
  databases/
    bioproject/
      index.md          <- ja
      index.en.md       <- en
    dra/
      index.md
      index.en.md
  policy/               <- databases 以外も同じ仕組みで追加可能
    index.md
```

#### Frontmatter

ミニマル設計。コンテンツはすべて本文に Markdown で書く。

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| `title` | string | yes | ページタイトル（`<title>` タグ、ナビ生成用） |
| `description` | string | yes | 1 行説明（SEO・検索結果表示用） |

外部リンク、関連ページ、更新日等は frontmatter に入れない。外部リンクは本文に Markdown リンクで書き、更新日は git log から自動取得する（後述「lastUpdated の自動取得」）。

#### lastUpdated の自動取得

各 .md ファイルの最終更新日時は build 時に `git log -1 --format=%cI -- <file>` で取得し、`{ urlPath: ISO8601 }` の JSON を生成して `markdown-loader.ts` から合成する。`PageContent.lastUpdated?: string` として `getPageByPath()` 等の戻り値に乗る。

- 生成スクリプト: `scripts/gen-last-updated.ts` (`page-contents/` を walk して各 .md に `git log -1 --format=%cI` を実行)
- 出力: `app/lib/content/gen/last-updated.json` (gitignore 対象、build 成果物)
- 起動: `package.json` の `dev` / `build` の前段に `npm run gen:last-updated` を挟む
- CI: `.github/workflows/ci.yml` の `actions/checkout` に `fetch-depth: 0` を設定する (shallow clone では古いコミット履歴を引けない)
- fallback: git 失敗時は `lastUpdated` を `undefined` とする。UI 側は「更新日不明」として扱う

著者は frontmatter に日付を書かない (drift の温床になる)。git commit が日付の SSOT。

#### Markdown 処理パイプライン

`app/lib/content/markdown-pipeline.ts` が unified パイプラインを構成:

remark-parse → remark-gfm → remark-github-blockquote-alert → remark-rehype → rehype-slug → rehype-autolink-headings → rehype-external-links → rehype-highlight → rehype-stringify

対応する GFM 拡張: テーブル、取り消し線、タスクリスト、脚注、GitHub blockquote alerts (`> [!NOTE]` 等)。コードブロックはシンタックスハイライト付き (highlight.js)。見出しに自動で `id` とアンカーリンクを生成。外部リンクに `target="_blank" rel="noopener noreferrer"` を自動付与。

#### クライアントサイド拡張 (`useProseEnhance`)

`app/lib/content/use-prose-enhance.ts` が DOM 操作でコピーボタンと Mermaid レンダリングを注入:

- **コードブロック コピーボタン**: hover で右上にクリップボードアイコン表示。クリックでコピー、チェックマークにフィードバック
- **Mermaid ダイアグラム**: ` ```mermaid ` ブロックを検出し、mermaid.js を lazy load して SVG にレンダリング

#### ローダー

`app/lib/content/markdown-loader.ts` が `import.meta.glob` で `page-contents/` の `.md` ファイルを eager ロード。frontmatter を Zod 検証し、Markdown を HTML に変換して in-memory Map に格納。

公開 API: `getPageByPath(urlPath)` / `getPageBySlug(section, slug)` / `listPagesBySection(section)` / `listAllPages()` / `validateAllPages()`

#### i18n

`index.md` = 日本語 (デフォルト)、`index.en.md` = 英語。各ファイルはモノリンガル。`index.en.md` が存在しない場合、日本語にフォールバック + 翻訳未提供バナー表示。

#### スタイリング (`prose-bsi`)

`app/styles/tailwind.css` の `.prose-bsi` が Markdown HTML のスタイルを定義。`@tailwindcss/typography` の `prose` をベースに、BSI デザイントークンで上書き。`max-width` は `content-narrow` (880px) で中央揃え。

#### TOC 抽出と h2 アンカー URL

`app/lib/content/heading-extractor.ts` が Markdown AST から h2/h3 見出しを抽出し、`github-slugger` で `rehype-slug` と同一の ID を生成する。抽出結果は `PageContent.toc` に格納される。

**h2 単位の addressable URL**: 各 h2 見出しは `/<page>#<anchor>` の個別 URL を持ち、ナレッジベースの検索結果から直接ジャンプできる。anchor の slug 規約は `rehype-slug` + `github-slugger` (GitHub 風) で、本文 HTML の `<h2 id>` と TOC の `id` が一致することを `heading-extractor.ts` が保証する。

**sidebar への h2 統合**: h2 はナレッジベース sidebar の `#` トグルで展開表示される (後述「Sidebar (ナレッジベース統一)」)。h3 以下は本文ページ側に頼り、sidebar には載せない。各ページごとの折りたたみ式詳細目次 (旧 `ContentTocSidebar`) は撤去し、sidebar の tree に統合する。

#### コンテンツツリー

`app/lib/content/content-tree.ts` が `listAllPages()` からセクション別にグループ化したナビゲーションツリーを構築する。`_dev/` セクションは除外。ツリーは起動時に 1 度だけ計算されキャッシュされる。

**ノード種別** (= sidebar tree と sitemap 目次の共通モデル):

| 種別 | URL | 子ノード | 例 |
|---|---|---|---|
| `category` | 持たない (UI 上は描画されない) | dir / doc を束ねる | `databases` / `guides` / `policies` |
| `dir` | 持つ (`index.md` がページ実体、`.md` は URL から畳む) | doc を持てる | `/databases/bioproject` |
| `doc` | 持つ | 持たない | `/guides/getting-started` |

**設計原則**: 著者にカテゴリ付けを要求しない (frontmatter にタグを持たせない)。**フォルダ構造が唯一の分類軸**。`category` ノードは sidebar / 目次 UI で見出し行を描画せず、子を直接 flat に並べてグループ間は余白で区切る (情報密度を上げるため)。

#### 全文検索

`app/lib/content/search-index.ts` が MiniSearch でクライアントサイド全文検索インデックスを構築する。ja / en 別にインデックスを持ち、title (boost 3) > description (boost 2) > body (boost 1) でランク付け。prefix 検索と fuzzy 検索に対応。

**index の粒度**: ページ単位 doc と h2 セクション単位 doc を同一 index に混在させる (`kind: "page" | "section"` で識別)。

- page doc: `id = urlPath`、`title = frontmatter.title`、`body` = ページ全文の plain text
- section doc: `id = urlPath#anchor`、`title = h2 テキスト`、`pageTitle = 親 page の title`、`body` = h2 境界 (`^## ` 正規表現) で split した section 本文の plain text

検索結果は `kind` で 2 通りに render される。section hit は親ページタイトル + 見出しピル + section スニペットを 1 行にまとめ、`/page#anchor` に直接ジャンプする。1 ページあたり section hit は最良 score の 1 件に集約する。

**スニペット生成**: `buildSnippet(body, query)` がクエリ語の最初のヒット位置から前後 ~75 字を切り出し、ハイライトは UI 側の `<Mark>` primitive (`app/ui/mark.tsx`) で施す (dangerouslySetInnerHTML 不使用)。

#### ナレッジベース hub `/docs`

`/docs` がコンテンツのハブページ (タイトル: 「ナレッジベース」 / "Knowledge Base")。**全文検索 + 全ページツリー俯瞰 + 最近更新 + サイトマップ目次** を 1 ページに束ねる。pathless layout route (`app/routes/docs/layout.tsx`) が左サイドバーナビを提供し、`/docs` と `databases/:slug` を子ルートとして収容する。URL はフラットのまま (`/docs/` にネストしない)。`_dev/*` は layout の外に残る。

i18n namespace は `docs.*` (旧 `contents.*` から rename)、ja / en 同一キーセットの不変量は `i18n.md` 参照。

**メイン領域の構成 (縦)**:

1. PageTitle (`docs.title` = ナレッジベース、`docs.lead` = サイト全体の俯瞰文)
2. SearchBox (scope なし、placeholder = 「サイト内のドキュメントを全文検索（見出しも対象）」)
3. (mode = "search" の時のみ) 検索結果ブロック: 結果ヘッダ `「{query}」 の検索結果 {N} 件` + 「× 検索を閉じる」、結果リスト、補足文 (タイトル / 本文 / h2 を横断検索する旨)
4. 「最近更新したページ」 ブロック (top 5、`lastUpdated` 降順、常設)
5. 「目次 (サイトマップ)」 ブロック (`columns` レイアウト: 4 カラム grid、カテゴリごとに縦積み、常設)

**state 機械**: `mode = "map" | "search"` (`?q=` の有無で導出)。SearchBox 入力 → URL `?q=xxx` 更新 → search mode に切替。`× 検索を閉じる` で `?q=` を削除 → map mode に戻る。`?q=` で状態を URL に持つので **reload / shareable / browser back** が効く。検索結果ブロックが出ても「最近更新」「目次」 は消えない (hub としての一貫性)。

#### Sidebar (ナレッジベース統一)

全 content ページ (= `/docs` と `databases/:slug`) で共通の左サイドバーを使う。操作モデルは Confluence / Notion 型 (キャレットは展開専用、名前リンクは navigate + 自動展開):

| 要素 | 操作 | 結果 |
|---|---|---|
| キャレット `▸/▾` (dir 行先頭) | click | 展開 / 折りたたみのみ |
| ノード名リンク | click | そのページを開く + 自動展開 |
| `# {h2Count}` トグル (h2 を持つ dir / doc) | click | そのページの h2 一覧を行の下に inline 展開 |
| 見出し行 | click | `/path#anchor` に遷移 (同ページならスクロール) |

**設計の固定点**:

- `category` 行は **描画しない**。子をトップレベルに並べ、グループ間は余白だけで区切る
- フォルダ / ドキュメントのアイコンは使わない。種別はキャレットの有無で識別する
- ネスト表現は左の縦ガイドライン (`border-l border-border-soft`) で行う
- アクティブページ / アクティブ見出しは `border-l-2 border-brand bg-brand-soft text-brand-deep` でハイライト
- 上部にツリー内絞り込み入力 (placeholder「ツリー内を絞り込み」、200ms debounce)。マッチしないノードは隠す + マッチした doc の親 dir は自動展開して残す
- 上部の見出し「全ドキュメント」 + 右端に総ページ数 (`{count} ページ`)

旧 `ContentTocSidebar` (active page の h2/h3 詳細目次を別ブロックで描画) は撤去。h2 は `#` トグル経由で tree に統合済み、h3 以下は本文ページに頼る。

#### ルーティング詳細

- `app/routes.ts`: `route("docs", "routes/docs/index.tsx")` を pathless layout (`routes/docs/layout.tsx`) の子として登録
- 子ルートとして `databases/:slug` も同じ layout に収容 (URL はフラットのまま `/databases/:slug`)
- パンくず: `Home → ナレッジベース (/docs) → ページタイトル`。`breadcrumb.docs` i18n キー + `breadcrumbResolver: "docs-root"` でラベル解決
- `server/api/sitemap.ts` の `STATIC_PATHS` に `/docs` を含める (ハブ route 自体)。markdown content page (`/databases/bioproject` 等) は `listContentPaths()` が `page-contents/` から自動列挙する
- 末尾スラッシュは付けない (dir / doc 両方とも `/path` 形式)。`extractUrlPath` (`markdown-loader.ts`) の挙動と一致

#### バリデーション

`scripts/validate-content.ts` が `validateAllPages()` を呼び、frontmatter の Zod 検証を実行。`npm run validate:content` で dev / build の前段に走る。

### ServiceContent

BSI 内 navigation の Service tiles (トップ左 main の primary tiles) と submit feature の外部 CTA リンクを 1 collection に集約する。外部サービス一覧 (DDBJ / DBCLS の各サービス) は本 collection ではなく services mirror が SSOT (`services.md`)。

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
| `primary-service` | `order` (非負整数) | トップの Service tile grid (左 main 上段、BSI 内 navigation) |

`order` は表示順 (各カテゴリ内、手動管理)。primary-service は `service-icon.tsx` の SVG を `id` で引く。外部サービスの top page 掲載は collection ではなく services mirror の `featuredTop` で決まる (`services.md`)。

#### SubmitUsage

| フィールド | 型 | 備考 |
|---|---|---|
| `service` | submit `Service` enum | flow card / preview card で参照される |
| `externalUrl` | `{ ja, en }` URL (en は null 可) | 外部 CTA リンク先 |
| `source` | `"DDBJ" \| "DBCLS"` または null | tag 表示用 |
| `accessionPlaceholders` | 文字列配列 | step カード上の placeholder 例 |

`submit-only` の entry (humandbs / jpost / eva 等) は `top` を持たず、`link` も持たない (submit 外部 CTA でだけ参照される)。

### Loader 公開 API

2 つのローダーが共存する:

**`app/lib/content/markdown-loader.ts`** (Markdown ページ用):

- `getPageByPath(urlPath)` / `getPageBySlug(section, slug)`: 1 件取得
- `listPagesBySection(section)` / `listAllPages()`: 一覧
- `validateAllPages()`: Zod 検証

**`app/lib/content/content-tree.ts`** (ナビゲーションツリー):

- `getContentTree()`: セクション別にグループ化されたコンテンツツリー

**`app/lib/content/search-index.ts`** (全文検索):

- `searchContent(query, lang)`: MiniSearch による全文検索

**`app/lib/content/loader.ts`** (TypeScript collection 用):

- `getServiceById(id)` / `listServices()` / `listServicesByTopCategory(category)`: service 操作
- `getServiceBySubmit(service)`: submit Service enum から逆引き
- `validateAllServices()`: Zod 検証

CLI (`scripts/validate-content.ts`) は `validateAllPages` / `validateAllServices` / `validateSubmitRouting` を順に呼び、いずれかが失敗すれば `process.exit(1)` する。

### 起動時 fail-fast

`markdown-loader.ts` と `loader.ts` はそれぞれ `import.meta.glob` で対象ファイルを eager load し、Zod parse する。1 件でも parse 失敗があれば module top で throw し、import した時点で起動を止める。

`npm run dev` / `npm run start` / `npm run build` の前段で `npm run validate:content` を必ず通すことで、collection 不整合を起動前に検出する。

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

### TSX fragment スコープ (TypeScript collection)

`app/content/` 配下の TSX ファイル (`services/*.content.tsx` 等) に適用されるスコープ。Markdown ページ (`page-contents/`) には適用されない。

`content` zone は `ui` / `lib` / `schemas` / `content` を import 可。`features` / `shell` への import は禁止 (ESLint `no-restricted-paths` で物理強制)。

### Build と runtime の境界

| フェーズ | 何が起きるか |
|---|---|
| Build 時 | `validate:content` が Markdown ページ + service collection + submit-routing catalog を Zod parse、1 件でも失敗で fail |
| 起動時 | `markdown-loader.ts` / `loader.ts` が `import.meta.glob` で eager load + parse、1 件でも失敗で起動失敗 |
| Runtime | `getPageBySlug` / `getServiceById` 等は in-memory lookup (1 度だけ初期化) |

Runtime には Zod parse の overhead がない (起動時に終わっている)。

## テスト

### Unit

UI primitives:

- `vitest-axe` で各 primitive / shell component の `axe` violation 0 件を保証

Content system:

- Markdown ページ: frontmatter 検証、`getPageBySlug` の存在/不在、HTML 出力に見出しが含まれること
- Service collection: `validateAllServices` のエラー検出、`getServiceById` の存在/不在
- submit `Service` enum の全値が submit usage 付きの service entry を持つ不変量

### PBT

- shell が追加する全 i18n キーで ja / en のキーセット同一
- routes-helpers の path / id 対称性
- 任意の有効な `ServiceContent` 入力で Zod parse 成功、無効な組み合わせで必ず失敗
