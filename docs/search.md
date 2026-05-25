# Search

検索機能の SSOT。`/search` (検索ビルダ) と `/search/results` (結果) の責務、3 経路 UI (Simple query / Advanced builder / Sidebar facet) を ParseNode (AST) に正規化する規則、`/db-portal/serialize` への debounce 呼び出し、cross-DB / per-DB の結果 UI、AI 検索アシスタントの雛形を定義する。

AST grammar と DSL 文法は ddbj-search-api 側 docs (`/db-portal/{parse,serialize}` 仕様) を SSOT とする。本書は portal 側 UI 状態と API 呼び出し境界のみを扱う。

## 1. 概念

### 1.1 2 つの検索モード

| モード | URL | 用途 |
|---|---|---|
| cross-DB | `/search/results?q=<DSL>` | 8 DB (`trad` / `sra` / `bioproject` / `biosample` / `jga` / `gea` / `metabobank` / `taxonomy`) を横断、ヒット数カード + 上位 hit list |
| per-DB | `/search/results?q=<DSL>&db=<id>` | 1 DB に絞り、record card list + pagination + 詳細 facet |

cross-DB は `GET /db-portal/cross-search`、per-DB は `GET /db-portal/search` を呼ぶ (`app/lib/api/search.ts`)。両方とも query string `q` に DSL を載せる。

cross-DB から per-DB への遷移はカードの「結果一覧」link、per-DB から cross-DB に戻るのは scope selector で `<全データベース>` を選ぶ動作。

### 1.2 3 経路 UI と AST 正規化

ユーザは検索条件を次の 3 経路で組み立てる。各経路は内部状態を持ち、「ParseNode (AST)」 に正規化される (`app/lib/api/search-types.ts` の `ParseNode` alias)。

| 経路 | 内部状態 | AST 変換 |
|---|---|---|
| Simple query | `SearchBox` の文字列 | URL 経由で `GET /db-portal/parse` を呼んで AST 化 |
| Advanced builder | `AdvancedState` (reducer 管理) | `fromAdvanced(state)` で AST |
| Sidebar facet | `FacetState` (reducer 管理) | `fromSidebar(state)` で AST |

3 経路の AST は `mergeAstAnd(simple, advanced, sidebar)` で **AND 結合** して 1 つの ParseNode に畳む。これを `/db-portal/serialize` に投げて DSL を得る。

### 1.3 portal 側に thin serializer を持たない

AST → DSL の文字列化は ddbj-search-api 側 `/db-portal/serialize` に委譲する。portal 側に grammar の薄い TS 実装を持たない。理由 (`architecture.md §7.1`):

- grammar の二重保守を排除する
- precedence / quote / wildcard / range の規則を 1 箇所に集約する
- API 側のテスト (pytest + hypothesis) が grammar 検証の SSOT

portal 側に残るのは UI 状態固有の変換 (`fromAdvanced` / `toAdvanced` / `fromSidebar` / `split` / `mergeAstAnd`) のみ。

### 1.4 AI 検索アシスタントの位置付け

AI 検索アシスタントは「自然言語入力 → Advanced builder の差分提案」 という UX を担う。`/api/llm/health` で LLM availability を判定し、status が `"ok"` 以外なら UI を物理的に出さない (`architecture.md §7.4`、LLM 未到達でもエラーバナーは出さない)。

server 側 SSE 実装と prompt 設計は本書のスコープ外 (`docs/llm.md` で扱う、本リリース時点では client 側 UI 配線のみ)。

## 2. URL 設計

### 2.1 URL = 検索状態の SSOT

検索状態は **URL クエリパラメタが SSOT**。client state は URL から復元できる形に揃える。

| パラメタ | 値域 | 必須 | 意味 |
|---|---|---|---|
| `q` | DSL 文字列 (URI encoded) | × | 空のとき全件 (results 側は空 result を出す) |
| `db` | `trad` / `sra` / `bioproject` / `biosample` / `jga` / `gea` / `metabobank` / `taxonomy` | × | 不在で cross-DB、値ありで per-DB |
| `page` | 1+ の整数 | × | 不在は 1 |
| `perPage` | `20` / `50` / `100` | × | 不在は 20 |
| `sort` | `relevance` / `date_desc` / `date_asc` | × | 不在は `relevance` (API default) |

### 2.2 URL 更新規則

- Advanced builder / Sidebar facet の変更 → debounce 700 ms → `/db-portal/serialize` → `?q=` を `navigate(..., { replace: true })` で更新 (履歴を汚さない)
- 検索ボタン / Enter → `navigate(...)` で push (履歴に積む、戻るボタンで前の検索に戻れる)
- per-DB の `page` / `perPage` / `sort` 変更 → `?page=N` を replace
- per-DB → cross-DB scope change → `?db=` を delete

### 2.3 URL → state の復元

`app/routes/search-results/route.tsx` の loader が `?q=` を読み、`GET /db-portal/parse` で AST 化する。AST を `splitForSidebar` で **「Sidebar facet で表現できる leaf」 と「残り (Advanced builder 側に倒す部分)」 の 2 つに分解** し、各 reducer の `init` 関数で state を再構築する。

`split` で表現できない構造 (たとえば `OR` を Sidebar facet 側に持たせる、など) は **Advanced builder 側に倒す**。Sidebar は単純な AND of equality / range のみを表す。

free_text node は Advanced builder には載せず (Simple query との混在を避ける)、SearchBox には URL `?q=` 文字列をそのまま表示する形に揃える。

### 2.4 URL parse の失敗

`/db-portal/parse` が 400 (`invalid-dsl` 等) を返した場合、loader は throw する。route の ErrorBoundary が「URL のクエリを解析できません」 エラーバナーを表示し、「クリア」 button で `?q=` を削除した状態に戻す。

API 接続失敗 (5xx / timeout) は `app/lib/query/client.ts` の TanStack Query retry policy で 2 回まで再試行され、それでも失敗すれば同様に ErrorBoundary に流れる。

## 3. Advanced builder

### 3.1 状態

`app/features/search/advanced/reducer.ts` で管理。

```ts
type AdvancedNodeId = string  // crypto.randomUUID() 由来の安定 id

type AdvancedCombinator = "AND" | "OR" | "NOT"

type AdvancedField =
  | "organism"
  | "identifier"
  | "title"
  | "description"
  | "date_published"
  | "date_modified"
  | "date_created"

type AdvancedOp = "eq" | "contains" | "wildcard" | "between"

type AdvancedCondition = {
  kind: "condition"
  id: AdvancedNodeId
  combinator: AdvancedCombinator  // 親 group 内での結合子
  field: AdvancedField
  op: AdvancedOp
  value: string                   // op = "between" 以外で使う
  from: string                    // op = "between" のとき YYYY-MM-DD
  to: string                      // op = "between" のとき YYYY-MM-DD
}

type AdvancedGroup = {
  kind: "group"
  id: AdvancedNodeId
  combinator: AdvancedCombinator  // 親 group 内での結合子
  innerCombinator: "AND" | "OR"   // 子の結合 (NOT は単項なので OR / AND のみ)
  children: AdvancedNode[]
}

type AdvancedNode = AdvancedCondition | AdvancedGroup

type AdvancedState = {
  root: AdvancedGroup             // 最上位 group (combinator は無視される)
}
```

`combinator` (各 node が持つ「親の中での結合子」) が UI の `NativeSelect` で `WHERE / AND / OR / NOT` から選ばれる。root 直下の最初の node だけ `WHERE` 表示で値は `combinator = "AND"` 固定。

### 3.2 reducer action

| action | payload | 効果 |
|---|---|---|
| `addCondition` | `{ parentId, position? }` | 末尾 (`position` 未指定) または指定位置に新 condition を追加 |
| `addGroup` | `{ parentId, position? }` | 同上、新 group を追加 |
| `removeNode` | `{ id }` | id の node を木から外す。root は不可 |
| `updateCombinator` | `{ id, combinator }` | combinator を変更。root 直下の先頭は変えられない |
| `updateInnerCombinator` | `{ id, innerCombinator }` | group の `innerCombinator` を変更 |
| `updateField` | `{ id, field }` | condition の field を変更。date field に切り替えた場合 op = `between` も自動切替 |
| `updateOp` | `{ id, op }` | condition の op を変更 |
| `updateValue` | `{ id, value }` | condition の value を変更 |
| `updateRange` | `{ id, from?, to? }` | condition の from / to を変更 |
| `replaceRoot` | `{ root }` | URL 復元時の差し替え。root を新規 group で置換 |
| `clear` | — | root を空に戻す (子なし) |

reducer は immer を使わず手で immutable 更新する (子配列の slice + spread)。

### 3.3 不変量

PBT (`tests/pbt/features/search/advanced-reducer.pbt.test.ts`) で固定する:

- 各 action は idempotent ではないが、`clear` を 2 回呼ぶ結果は 1 回と同じ
- 同じ id を 2 つ持つ node が同時に木に存在しない
- group の `children.length >= 0`、中身は最大深さ N (UI 上 N=4 程度を想定、値域は制約しない)
- `removeNode` で root 以外の任意 node を消すと、残った木が valid AdvancedState になる

### 3.4 AST 変換

#### `fromAdvanced(state)`

```ts
fromAdvanced({ root }: AdvancedState): ParseNode
```

- root の children を AdvancedCombinator ごとに見て、AND / OR / NOT を flatten した BoolOp を組む
- combinator 切替の境界で BoolOp が入れ子になる
- 子なしの root は **identityAst** (空 AST) を返す
- condition は op に従って LeafValue / LeafRange を作る (op = `eq` / `contains` / `wildcard` で LeafValue、`between` で LeafRange)
- `value === ""` の condition は無視する (空入力をクエリに混ぜない)
- range で from / to のどちらかが空なら無視 (両方揃ったときだけ AST を出す)

#### `toAdvanced(ast)`

```ts
toAdvanced(ast: ParseNode): AdvancedState
```

- root に `AdvancedGroup` を 1 つ用意し、ast の構造を再帰的に展開する
- `FreeText` は Simple query 側 (本 reducer 外) に渡し、Advanced builder 側には載せない
- LeafValue / LeafRange は AdvancedCondition に変換
- BoolOp は AdvancedGroup または「子の combinator を上書き」 の形に展開
  - parent BoolOp(AND, [a, b]) → root group with innerCombinator=AND, children=[a, b] (combinator AND/AND)
  - parent BoolOp(OR, [a, b]) → root group with innerCombinator=OR, children=[a, b] (combinator OR/OR)
  - 入れ子 BoolOp → 子 AdvancedGroup
  - BoolOp(NOT, [a]) → AdvancedCondition / AdvancedGroup の `combinator = "NOT"` 設定

#### round-trip 不変量 (PBT)

任意の `AdvancedState` について `toAdvanced(fromAdvanced(s)) ≡ canonicalize(s)` (空 condition / 空 range を除去した形) が成り立つ。逆方向 `fromAdvanced(toAdvanced(ast)) ≡ canonicalize(ast)` も成り立つ。

`canonicalize` は (a) 空 condition / 空 range を除去、(b) AND/OR の子 1 件は親に flatten、(c) 同 combinator の入れ子は flatten、の 3 操作。

### 3.5 UI

`app/features/search/advanced/builder.tsx` が `AdvancedState` を受け取り、再帰的に `ConditionRow` / `GroupRow` を render する。

- ConditionRow: combinator (`NativeSelect`) + field (`NativeSelect`) + op (`NativeSelect`) + value (text or date `<input>` 2 個 / range 用の専用 wrapper) + × (`IconButton`)
- GroupRow: 左 3 px brand バー + `Tag kind="brand"` "グループ" + innerCombinator selector + 内側の再帰描画 + × (`IconButton`)
- 末尾: `Button` "+ 条件を追加" / "+ グループを追加"

input は `~/ui` の primitive 経由。value 用 text input は `~/ui/native-select.tsx` の隣に追加する新 primitive `TextInput` で受ける (本書 §9 参照)。

UI 上の最大ネスト深さは制約しないが、設計目安 4 段。4 段を超える木が生成された場合の表示崩れは保留 (UX 試行で確認)。

## 4. Sidebar facet

### 4.1 状態

`app/features/search/sidebar/facet-state.ts` で管理。

```ts
type DateRangeKey = "all" | "1y" | "5y" | "10y"

type FacetState = {
  organisms: string[]                       // checkbox 複数
  submitters: string[]                      // checkbox 複数
  studyType: string | null                  // radio
  sampleCount: { min: number | null; max: number | null }  // per-DB のみ
  datePublished: {
    active: DateRangeKey
    from: string                            // YYYY-MM-DD
    to: string                              // YYYY-MM-DD
  }
}
```

reducer action は `setOrganisms` / `toggleOrganism` / `setSubmitters` / `setStudyType` / `setSampleCount` / `setDateRange` / `setDateFromTo` / `clear` / `replace`。

cross-DB mode では `organisms` と `datePublished` のみが有効 (per-DB に依存しない 2 facet)。per-DB mode で残りの facet が enable される。

### 4.2 AST 変換

#### `fromSidebar(state, options)`

```ts
fromSidebar(state: FacetState, options: { db?: string }): ParseNode
```

- 各 facet を AND 結合
- `organisms.length > 1` のとき `BoolOp(OR, [{ field: organism, op: "eq", value }, ...])` で OR 展開
- `organisms.length === 1` は単一 `LeafValue`
- `studyType` (per-DB) は API 側 field 名にマップ (例: `bioproject` なら `library_strategy` 等、ddbj-search-api allowlist 準拠)
- `datePublished.active === "all"` または `from === "" && to === ""` のとき何も出さない
- `datePublished.active` がプリセット値 (1y / 5y / 10y) のとき、client local time を基に from / to を導出して LeafRange を作る
- どの facet も未指定なら identityAst を返す
- options.db で per-DB 固有 facet (sampleCount / studyType / submitter) を有効化

#### `splitForSidebar(ast)`

```ts
splitForSidebar(ast: ParseNode): { sidebar: FacetState; rest: ParseNode }
```

- AST の trunk から「Sidebar facet に表現できる leaf」 を抜き取り、残りを `rest` に返す
- 抜き取り対象: top-level BoolOp(AND) の子で、`LeafValue { field: "organism", op: "eq" }` / `LeafValue { field: "library_strategy", op: "eq" }` / `LeafRange { field: "date_published" }` 等
- 抜き取れない leaf / BoolOp(OR/NOT) は `rest` に残す (= Advanced builder 側に倒す)
- root 自体が単独 leaf でも対象なら抜き取る (rest は identityAst)

### 4.3 UI

`app/features/search/sidebar/facet-panel.tsx` で `FacetState` から `~/ui` の `FacetGroup` / `FacetRow` / `DateFacet` を render する。

- `AppliedFilters`: 適用中の facet を chip 化 (label + 値、× で個別解除、「すべて解除」 button で `clear`)
- `FacetGroup organism`: 全 12 organism + showMore (cross-DB / per-DB 共通)
- `FacetGroup submitter`: per-DB のみ
- `FacetGroup studyType`: per-DB のみ
- `DateFacet`: 「すべて / 1 年 / 5 年 / 10 年」 segmented + FROM/TO date input

facet 候補値 (organism / submitter 等の選択肢) は **本書段階では hardcoded 静的リスト** (API の aggregations endpoint 実装は本リリース範囲外、候補値は固定 12 organism / 主要 submitter で用意)。

## 5. AST merge

### 5.1 mergeAstAnd

```ts
mergeAstAnd(...nodes: ParseNode[]): ParseNode
```

`app/features/search/ast/merge.ts`。

挙動:

- 全 `nodes` を flat な BoolOp(AND, [...]) に AND 結合
- 内側に既に BoolOp(AND, ...) があれば flatten (associative AND の正規化)
- `nodes` が空、または全部 identityAst なら identityAst を返す
- 単一の non-identity node はそのまま返す (BoolOp で包まない)

### 5.2 identityAst

```ts
identityAst: ParseNode = { op: "AND", rules: [] }
```

「空 AST」 を表す。`mergeAstAnd` の単位元、reducer の初期値。

### 5.3 PBT 不変量

`tests/pbt/features/search/merge-laws.pbt.test.ts`:

- **結合律**: `merge(merge(a, b), c) ≡ merge(a, merge(b, c))` (canonicalize 後の構造比較)
- **単位元**: `merge(a, identityAst) ≡ a` / `merge(identityAst, a) ≡ a`
- **空消滅**: `merge() ≡ identityAst`
- **保存性**: `merge(a, b)` の rule 集合は `a` と `b` の rule 集合の和 (重複あり) に等しい
- **平坦化**: `merge(...)` の結果が `BoolOp(AND, [...])` のとき、子要素に `BoolOp(AND, ...)` は現れない

`merge` は **冪等ではない** (同じ node を 2 回渡すと重複した child を持つ AND node が生成される)。UI 側で重複を除去する場合は呼び出し側の責務 (Advanced / Sidebar / Simple の各経路で重複入力が起きないこと)。等価判定は構造比較 (`astEquals`、JSON.stringify では union 子の順序問題で false negative が出る)。

## 6. /db-portal/serialize 呼び出し

### 6.1 debounce 700 ms

`app/features/search/debounce/use-debounced-value.ts` で `useDebouncedValue<T>(value, ms)` を提供。700 ms 待って value を更新する standard pattern。

`app/features/search/debounce/debounced-serialize.ts` の `useDebouncedSerialize(ast)` が:

1. `useDebouncedValue(ast, 700)` で debounced ast を取得
2. debounced ast が identityAst なら何もしない (URL の `?q=` を削除する場合は別 action)
3. それ以外なら `serializeAst({ ast })` を `useMutation` 経由で呼ぶ
4. 成功で `navigate("/search/results?q=...", { replace: true })`
5. 失敗で `syncStatus = "failed"`

### 6.2 sync-status

`useDebouncedSerialize` が返す `status: SyncStatus` (`"idle" | "syncing" | "synced" | "failed"`) と `retry` 関数を、`app/features/search/sync-status.tsx` の `SyncStatusChip` component が表示用に消費する。

`syncing` / `failed` のときだけ chip を表示する。`synced` は通常 invisible (idle と同じ扱い、sync 直後 1 秒だけ "synced" を表示するなどの動的演出はしない)。

`failed` chip には「再試行」 link を添え、押下で `useDebouncedSerialize` の `retry()` を呼ぶ。

### 6.3 失敗時の挙動

- 表示中の検索結果は古い URL のまま (URL は書き換えない、古いままで使い続けられる)
- 検索実行 button (`<Button>` の Submit) は別経路で `/db-portal/serialize` を直接呼ぶため、debounce 失敗で button が disable されることはない
- 5xx は TanStack Query retry policy で 2 回まで自動再試行 (`app/lib/query/client.ts`)、それでも失敗で syncStatus = "failed"

## 7. 検索結果 UI

### 7.1 cross-DB 結果 (`/search/results?q=...`)

`app/features/search/results/cross-results.tsx`。

`GET /db-portal/cross-search?q=...&topHits=5` を loader / TanStack Query で呼ぶ。レスポンス `DbPortalCrossSearchResponse` は `databases` 配列 (length 8、固定順)。

#### 描画

各 DB について **常にカードを 1 枚** 出す (0 件 DB も skip しない、相対的なヒット分布を見せる)。

- title: i18n リソースの `search.scope.<db>`
- description: 1 行 (i18n リソースの `search.descriptions.<db>`)
- count: `count ?? 0`、`tabular-nums` mono 26 px
- 上位 hit: `hits` (最大 5 件)
  - row: accession (mono brand-deep) + title (1 行) + datePublished (mono)
- 右上 `<TextLink>`: 「結果一覧 →」 で `/search/results?q=<DSL>&db=<id>` へ
- error フィールド (timeout 等) が立っているとき: count を `?` 表示 + 「再試行」 link

#### 順序

`DbPortalCrossSearchResponse.databases` は API 仕様で固定順 (`trad / sra / bioproject / biosample / jga / gea / metabobank / taxonomy`)。portal 側で並び替えない。

#### Tier 2 fallback

`DbPortalLightweightHit` の optional field (title / description / datePublished 等) が `null` / `undefined` のとき、該当行を非表示にする (skeleton / placeholder を出さない)。「title なしの hit」 は 1 行で accession だけ表示する。

### 7.2 per-DB 結果 (`/search/results?q=...&db=<id>`)

`app/features/search/results/per-db-results.tsx`。

`GET /db-portal/search?q=...&db=<id>&page=N&perPage=M&sort=<sort>` を loader / TanStack Query で呼ぶ。レスポンス `DbPortalSearchResponse` は `hits` 配列と `hardLimitReached` / `page` / `perPage` / `nextCursor` / `hasNext`。

#### Layout (3-col)

| 列 | 幅 | 内容 |
|---|---|---|
| Sidebar | `--spacing-sidebar` (220 px) | `SidebarHeading` + `AppliedFilters` + `FacetGroup` × N + `DateFacet` |
| Main | flex-1 | ResultsToolbar (件数 + sort + pagination) + record card list + ResultsToolbar (bottom pagination) |
| Right pane | `--spacing-right-pane` (280 px) | クエリプレビュー + AI assistant (LLM available 時) |

#### Result card

`app/features/search/components/result-card.tsx` (DB ごとに `result-card-bioproject.tsx` 等は分けない、DB 毎の差分は内部分岐で表現)。

- 上 row: accession (mono brand-deep) + `·` + datePublished (mono) + `<Tag>` study type / `<Tag>` organism (per-DB により tag 種類差)
- title: 16 px bold
- excerpt: description / abstract (2 行 clamp)
- 下 row: 登録機関 (submitter / organization) + mono `<Tag kind="brand">` で chip-pill 風

Tier 1 必須 field (identifier / type) は API 契約で常に非空。portal 側で空チェックは行わず、そのまま render する (空が来たら API 側の不正データとして UI 上 broken な見た目で可視化される)。Tier 2 (study type / organization 等) は optional chaining (`record.organization?.[0]?.name`) で安全に扱い、値が空なら row 自体を非表示。

#### Pagination

`~/ui/pagination.tsx` を使う。cursor mode (ES backed: sra / bioproject / biosample / jga / gea / metabobank) では `page` 値が `null` で返る可能性があるため、`page === null && hasNext` のとき次のページボタンだけ active にして、prev は disable / 数値ボタンは hide。Solr backed (trad / taxonomy) は通常の page-based pagination。

### 7.3 ResultsToolbar

- 左: 件数 (`<total> 件中 <start>-<end>`)
- 中: sort `<NativeSelect>` (`relevance` / `date_desc` / `date_asc`)
- 右: pagination

`hardLimitReached === true` のとき件数の横に `<Tag>` 「上位 10000 件まで」 を出す (API 仕様、ES / Solr のハードリミット表示)。

### 7.4 結果領域の a11y

検索結果の更新は URL 駆動で起きる (search box submit / facet 操作 / pagination / sort)。screen reader user 向けに次を満たす:

- main 結果 wrapper (cross-DB / per-DB 共通) に `role="region"` + `aria-label={t("search.a11y.resultsRegion")}` を付ける
- 件数表示 (ResultsToolbar の左、`<total> 件中 <start>-<end>`) に `aria-live="polite"` + `aria-atomic="true"` を付け、loader 完了で更新されたタイミングで件数が announce される
- 「結果なし」 / parse error / cross / db error の `Callout` には `aria-live="polite"` を付け、結果領域内の状態変化を伝える
- 「同期中」 / 「同期失敗」 を表す `SyncStatusChip` は `role="status"` (= 暗黙の `aria-live="polite"`) を付与

assertive (`role="alert"` / `aria-live="assertive"`) は通常の検索結果更新では使わない (キーストロークごとに発火する debounce sync が SR を邪魔するため)。重大エラーの限定箇所のみ assertive に倒す。

## 8. AI 検索アシスタント

### 8.1 LLM availability

`app/features/search/assistant/llm-availability.ts`:

```ts
useLlmAvailability(): { ready: boolean; reason?: string }
```

`/api/llm/health` を `useQuery` で取得。`LlmHealth.status === "ok"` のとき `ready: true`、それ以外 (`"unset"` / `"unreachable"`) で `ready: false` + reason 文字列。

queryKey は `["llm", "health"]`、staleTime は 5 分 (頻繁に poll しない)。

### 8.2 表示条件

`app/features/search/assistant/assistant.tsx` の component:

- `ready: false` のとき `null` を return (UI を物理的に出さない、エラーバナーも出さない)
- `ready: true` のとき textarea + Examples chip + 「提案を生成」 button + 提案表示エリアを描画

`/search` (検索ビルダ) と per-DB results (`/search/results?db=<id>`) で表示する。cross-DB results (`/search/results` で `db` 未指定) では表示しない (AI 提案は Advanced builder への差分提案であり、cross-DB の表示文脈ではユーザの操作対象がないため)。

### 8.3 SSE 配線

`app/features/search/assistant/prompt-client.ts`:

```ts
type AssistantProposal = {
  combinator: "AND" | "OR"
  conditions: { field: AdvancedField; op: AdvancedOp; value: string }[]
}

useAssistantStream(input: string): {
  start: () => void
  stop: () => void
  state: "idle" | "streaming" | "done" | "error"
  proposal: AssistantProposal | null
}
```

`/api/llm/search-assistant` (server 側 endpoint、本リリーススコープ外で server 側本実装は別途) に POST、SSE で event を受け取る:

- `event: token` → 表示はしない (内部受信のみ)
- `event: proposal` → `AssistantProposal` の JSON を受け取り `proposal` state を更新
- `event: done` → state = "done"
- `event: error` → state = "error" + toast

`AbortController` で `stop` 可能。client 側 fetch は wrapper として `buildRequestInit` を経由する (`app/lib/api/client.ts`)、ただし SSE のため `response.body.getReader()` で chunk を読む。

### 8.4 提案の反映

`proposal.state === "done"` で「クエリビルダーに追加」 button を押下すると、`AdvancedState` の root に新 group を append する `applyProposal(state, proposal)` を呼ぶ:

```ts
applyProposal(state: AdvancedState, proposal: AssistantProposal): AdvancedState
```

- proposal.conditions を AdvancedCondition の配列に変換
- proposal.combinator === "OR" なら 1 つの AdvancedGroup (innerCombinator=OR) で包んで root に append、AND なら conditions を直接 root に append
- 各 condition の combinator は AND (先頭含めて、root に追加されるため)

「やり直す」 button は textarea をクリアし proposal を `null` にする。

## 9. portal が依存する `app/ui/` primitive

本書実装で消費する primitive。本リリース時点で `app/ui/` に存在する。

| primitive | 用途 |
|---|---|
| `SearchBox` | Simple query + scope selector |
| `Section` / `Page` / `PageTitle` | レイアウト |
| `SectionHeading` / `SidebarHeading` / `SidebarGroupLabel` / `Label` | 見出し / ラベル |
| `Button` / `IconButton` | アクション |
| `NativeSelect` | combinator / field / op / sort selector |
| `Chip` | examples chip / facet chip |
| `Tag` | source tag / status tag / brand pill |
| `AppliedFilters` / `FacetGroup` / `FacetRow` / `DateFacet` | Sidebar facet |
| `Pagination` | per-DB results |
| `TextLink` | 「結果一覧 →」 / 「すべて見る」 link |
| `Callout` | エラーバナー |

### 9.1 新規 primitive

Advanced builder の value 入力で text input が必要。`app/ui/text-input.tsx` を新規追加し、`NativeSelect` と同じ tokens で実装する。

```ts
type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "aria-label"> & {
  ariaLabel: string
  state?: "default" | "warn"
}
```

`/_design/primitives` に variant 一覧を追加する (`docs/ui-primitives.md §15`)。

date input も TextInput の variant (`type="date"`) で扱う。

## 10. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §7.1` | 検索データフロー全体像 |
| `api-types.md §3` | `ParseNode` alias と Input / Output 切り替え |
| `api-types.md §5` | `apiGet` / `apiPost` operation 型補完 |
| `ui-primitives.md` | 本書で消費する primitive 仕様 |
| `shell.md §2` | Header の `active="search"` 判定 |
| `i18n.md §5` | 翻訳 fallback (TranslationUnavailable バナー) |
