# Search

検索機能の SSOT。`/search` (検索ビルダ) と `/search/results` (結果) の責務、3 経路 UI (Simple query / Advanced builder / Sidebar facet) を ParseNode (AST) に正規化する規則、`/db-portal/serialize` への debounce 呼び出し、cross-DB / per-DB の結果 UI、AI 検索アシスタントの方針を定義する。

AST grammar と DSL 文法は ddbj-search-api 側 docs (`/db-portal/{parse,serialize}` 仕様) を SSOT とする。本書は portal 側 UI 状態と API 呼び出し境界のみを扱う。

## 概念

### 2 つの検索モード

| モード | URL | 用途 |
|---|---|---|
| cross-DB | `/search/results?q=<DSL>` | 8 DB (`trad` / `sra` / `bioproject` / `biosample` / `jga` / `gea` / `metabobank` / `taxonomy`) を横断、ヒット数カード + 上位 hit list |
| per-DB | `/search/results?q=<DSL>&db=<id>` | 1 DB に絞り、record card list + pagination + 詳細 facet |

cross-DB は `GET /db-portal/cross-search`、per-DB は `GET /db-portal/search` を呼ぶ。両方とも query string `q` に DSL を載せる。

### キーワードの結合規則

検索語の結合は入力の区切り文字で決まる。portal は `keywordOperator` を送らず API default (`OR`) に従う。`keywordOperator` はカンマ区切りトークンの結合演算子であり、カンマは「いずれかに一致 (列挙)」 を意味する OR が自然なため、default のままで正しい。

- スペース区切り (`cancer mouse`) → AND (全語を含む)。`keywordOperator` とは無関係 (ddbj-search-api の DSL 文法が値内空白を AND 連結する)
- カンマ区切り (`cancer,mouse`) → OR (いずれかに一致)。`keywordOperator` の default
- クオート (`"Homo sapiens"`) → phrase 一致 (順序保持)
- DSL 内の明示的 `AND` / `OR` / `NOT` は `keywordOperator` と無関係

cross-DB から per-DB への遷移はカードの「結果一覧」link、per-DB から cross-DB に戻るのは scope selector で `<全データベース>` を選ぶ動作。

### 3 経路 UI と AST 正規化

ユーザは検索条件を次の 3 経路で組み立てる。各経路は内部状態を持ち、ParseNode (AST) に正規化される。

| 経路 | 内部状態 | AST 変換 |
|---|---|---|
| Simple query | SearchBox の文字列 | URL 経由で `GET /db-portal/parse` を呼んで AST 化 |
| Advanced builder | reducer 管理の condition/group tree | 純粋関数で AST に変換 |
| Sidebar facet | reducer 管理の facet state | 純粋関数で AST に変換 |

3 経路の AST は AND 結合関数で 1 つの ParseNode に畳む。これを `/db-portal/serialize` に投げて DSL を得る。

`/search` (cross-search ビルダー) では Simple query (キーワード) と AI アシスタントを 1 つの統合入力 (`SearchInputPanel`) に畳む。キーワードは Advanced builder の先頭に **keyword 行** として双方向同期して表示する (上部ボックス submit / keyword 行の編集のどちらからでも sync する)。キーワードの parse → merge → serialize は `useCrossSearchSync` が単一 debounce で行い、live preview / URL に反映する。上部ボックス submit はキービルダーへの集約のみで、cross-search の実行 (results への遷移) は「この条件で検索」 button が担う。

### portal 側に thin serializer を持たない

AST → DSL の文字列化は ddbj-search-api 側 `/db-portal/serialize` に委譲する。portal 側に grammar の薄い TS 実装を持たない。理由:

- grammar の二重保守を排除する
- precedence / quote / wildcard / range の規則を 1 箇所に集約する
- API 側のテスト (pytest + hypothesis) が grammar 検証の SSOT

portal 側に残るのは UI 状態固有の変換 (Advanced ↔ AST、Sidebar ↔ AST、AND merge) のみ。

### AI 検索アシスタントの位置付け

AI 検索アシスタントは「自然言語入力 → Advanced builder の差分提案」 という UX を担う。`/api/llm/health` で LLM availability を判定し、`unset` のときだけ UI を物理的に出さない。`unreachable` のときは UI を出して、送信時に SSE `event: error` 経路で失敗を通知する (`llm.md`)。

server 側 SSE 実装と prompt 設計は `llm.md` で扱う。本書では client 側 UI 配線のみ。

## URL 設計

### URL = 検索状態の SSOT

検索状態は **URL クエリパラメタが SSOT**。client state は URL から復元できる形に揃える。

| パラメタ | 値域 | 必須 | 意味 |
|---|---|---|---|
| `q` | DSL 文字列 (URI encoded) | × | 空のとき全件 (results 側は空 result を出す) |
| `db` | `trad` / `sra` / `bioproject` / `biosample` / `jga` / `gea` / `metabobank` / `taxonomy` | × | 不在で cross-DB、値ありで per-DB |
| `page` | 1+ の整数 | × | 不在は 1 |
| `perPage` | `20` / `50` / `100` | × | 不在は 20 |
| `sort` | `relevance` / `date_desc` / `date_asc` | × | 不在は `relevance` (API default) |

### URL 更新規則

- Advanced builder / Sidebar facet の変更 → debounce 700 ms → `/db-portal/serialize` → `?q=` を `replace` で更新 (履歴を汚さない)
- 検索ボタン / Enter → `push` (履歴に積む、戻るボタンで前の検索に戻れる)
- per-DB の `page` / `perPage` / `sort` 変更 → `replace`
- per-DB → cross-DB scope change → `?db=` を delete

### URL → state の復元

`/search/results` route の loader が `?q=` を読み、`GET /db-portal/parse` で AST 化する。AST を「Sidebar facet で表現できる leaf」 と「残り (Advanced builder 側に倒す部分)」 の 2 つに分解し、各 reducer の初期化関数で state を再構築する。

表現できない構造 (たとえば `OR` を Sidebar facet 側に持たせる、など) は **Advanced builder 側に倒す**。Sidebar は単純な AND of equality / range のみを表す。

free_text node の扱いは経路で **非対称**:

- `/search` (cross-search ビルダー) では、上部キーワードボックスと双方向同期する **keyword 行** として Advanced builder に表示し、parse → merge した内容を live preview / URL に反映する。keyword の文字列自体は AST 化せず行に生表示し、AST は別経路 (`useCrossSearchSync`) で算出する (複合 DSL でも行表示が壊れない)。
- `/search/results` の URL 復元 (`toAdvanced`) は free_text を Advanced builder に載せず drop し、SearchBox には URL `?q=` 文字列をそのまま表示する。

### parse の失敗

`/search` (検索ビルダ) で SearchBox を submit したとき、入力文字列の parse が失敗したら **results へ遷移せず `/search` 内に inline の `<Callout tone="warn">`** (構文エラー文言 + 構文ヒント) を出す。生クエリを `?q=` に載せて results に飛ばすと再 parse で必ず失敗しユーザーが抜け出せないため、その場で直せるようにする。

`/search/results` で URL の `?q=` を直接開いて `/db-portal/parse` が 400 を返した場合は、loader が `errorKey: "parse"` を data として返し、route component が inline の `<Callout tone="warn">` と「再試行」 button (`navigate(0)` で再 loader) を描画する。throw / ErrorBoundary 経路は通らない。

API 接続失敗 (5xx / timeout) は TanStack Query retry policy で query 系は 2 回まで再試行される (`app/lib/query/client.ts`)。debounced serialize は `useMutation` なので retry なし (`mutations.retry: 0`)、失敗時に sync status chip が `error` を表示する。

## Advanced builder

### 状態モデル

ネストした group / condition の tree を持つ。

- **Condition**: 1 つの検索条件。親 group 内での結合子 (`AND` / `OR` / `NOT`) + field + op + value (op が範囲なら from / to)
- **Group**: 子を束ねる入れ物。親 group 内での結合子 + 子集合の内部結合 (`AND` / `OR`) + 子の配列
- **Root**: 最上位 group。combinator は無視、子の数 0 から可

各 group の最初の child だけ UI で結合子ラベルを固定表示し、値は固定で `AND` 扱い。表示文言は: 入れ子 group の先頭は常に `WHERE`、root の先頭は keyword 行が無ければ `WHERE`・あれば `AND` (`/search` で keyword 行が WHERE の anchor を担うため、root 先頭の構造化条件は `AND` 表示になり、削除も可能)。この root 先頭の `AND` 化は root group のみで、入れ子 group には波及しない。

field の取り得る値 (`identifier` / `title` / `description` / `organism_id` / `organism_name` / `accessibility` / `date_published` / `date_modified` / `date_created` / `submitter` / `publication`) は cross-DB でも安全な Tier 1/2 のみを採る (ddbj-search-api allowlist 準拠)。op の取り得る値 (`eq` / `contains` / `wildcard` / `between`) は field ごとに制限される (`FIELD_OPS`、ddbj-search-api の演算子マトリクスに対応): date 系は `between` のみ、`identifier` / `organism_id` は `eq` / `wildcard`、text 系は `eq` / `contains`。コードが SSOT。新規追加時は AdvancedField / FIELD_OPS の値と prompt (`llm.md`) を同時更新する。

### reducer の責務

| action | 効果 |
|---|---|
| 追加系 (`addCondition` / `addGroup`) | 指定 group に新 condition / group を append |
| 削除 (`removeNode`) | id の node を木から外す。root は不可 |
| 結合子更新 (`updateCombinator` / `updateInnerCombinator`) | 各 node の combinator または group の内部 combinator を切替 |
| condition 更新 (`updateField` / `updateOp` / `updateValue` / `updateRange`) | field / op / value / range を変更。date field 切替時は op = `between` も自動切替 |
| 復元 (`replaceRoot`) | URL 復元時に root を新規 group で置換 |
| 全消去 (`clear`) | root を空に戻す |

reducer は immer を使わず手で immutable 更新する。

### 不変量 (PBT)

- 同じ id を 2 つ持つ node が同時に木に存在しない
- `clear` を 2 回呼ぶ結果は 1 回と同じ
- `removeNode` で root 以外の任意 node を消すと、残った木が valid AdvancedState になる
- 値域 (深さ) は UI 上 4 段を設計目安とするが reducer 側で制約しない

### AST 変換 (Advanced ↔ AST)

`fromAdvanced` の挙動:

- root の children を combinator ごとに見て、AND / OR / NOT を flatten した BoolOp を組む
- combinator 切替の境界で BoolOp が入れ子になる
- 子なし root は **identityAst** (空 AST) を返す
- condition は op に応じて LeafValue / LeafRange を作る (`eq` / `contains` / `wildcard` で LeafValue、`between` で LeafRange)
- 空入力 (`value === ""`、または range の from / to のいずれかが空) は無視する

`toAdvanced` の挙動:

- AST の構造を root group に再帰的に展開
- `FreeText` は Simple query 側に渡し、Advanced builder には載せない
- BoolOp は AdvancedGroup または「子の combinator を上書き」 に展開 (parent BoolOp(AND, [a,b]) → root group with innerCombinator=AND, children=[a,b] 等)
- 入れ子 BoolOp は子 AdvancedGroup として展開
- BoolOp(NOT, [a]) は子の `combinator = "NOT"` 設定として展開

### round-trip 不変量 (PBT)

`toAdvanced(fromAdvanced(s))` は `canonicalize(s)` (空 condition / 空 range を除去した形) に等しい。逆方向 `fromAdvanced(toAdvanced(ast))` も `canonicalize(ast)` に等しい。

`canonicalize` は (a) 空 condition / 空 range を除去、(b) AND/OR の子 1 件は親に flatten、(c) 同 combinator の入れ子は flatten、の 3 操作。

### UI

Advanced builder の UI は state を受け取り、再帰的に ConditionRow / GroupRow を render する。

- ConditionRow: combinator 選択 + field 選択 + op 選択 + value 入力 (text または date input 2 個) + 削除
- GroupRow: 左 4 px brand バー + group ラベル + innerCombinator selector + 内側の再帰描画 + 削除
- 末尾: 「+ 条件を追加」 / 「+ グループを追加」

入力は `app/ui/` primitive 経由 (Select / TextInput / IconButton)。Advanced builder の value 入力で text input が必要なため `app/ui/text-input.tsx` を新規追加する。

UI 上の最大ネスト深さは制約しないが、設計目安 4 段。

## Sidebar facet

### 状態モデル

| facet | 種類 | 有効モード |
|---|---|---|
| organisms | checkbox 複数 (値は taxID、表示は学名) | cross-DB + per-DB |
| submitters | checkbox 複数 | per-DB のみ |
| studyType | radio | per-DB SRA のみ |
| datePublished | プリセット (`all` / `1y` / `5y` / `10y`) + FROM/TO | cross-DB + per-DB |

reducer は各 facet を独立に更新する action (`toggleOrganism` / `toggleSubmitter` / `setStudyType` / `setDateRange` / `setDateFrom` / `setDateTo` / `clear` / `replace`) を持つ。

### AST 変換 (Sidebar → AST)

`fromSidebar` の挙動:

- 各 facet を AND 結合
- `organisms` は NCBI taxonomy ID を保持し、`organism_id:<taxID>` の LeafValue を生成する (UI 表示は学名ラベルだが AST / URL には taxID を載せる)。複数なら BoolOp(OR, [...]) で OR 展開、1 件なら単一 LeafValue
- `submitter` は Tier 2 field `submitter` にマップ (per-DB のみ)
- `studyType` は SRA-only の Tier 3 field `library_strategy` にマップ。cross-DB や他 DB では出さない (`field-not-available-in-cross-db` で 400 になるため、`options.db === "sra"` のときだけ生成)
- `datePublished.active === "all"` または from/to 両方空のとき何も出さない
- プリセット値 (1y / 5y / 10y) は client local time を基に from/to を導出して LeafRange に
- `setDateFrom` / `setDateTo` が呼ばれると `datePublished.active` は `"all"` に reset される (プリセット選択を解除し、FROM/TO 入力に切り替わる)
- どの facet も未指定なら identityAst
- options.db で per-DB 固有 facet (submitter) を有効化、studyType は SRA のときのみ

`splitForSidebar` の挙動:

- AST の trunk から「Sidebar facet に表現できる leaf」 を抜き取り、残りを返す
- 抜き取り対象は top-level BoolOp(AND) の子で、`LeafValue { field: "organism_id", op: "eq" }` / `LeafValue { field: "submitter", op: "eq" }` / `LeafValue { field: "library_strategy", op: "eq" }` / `LeafRange { field: "date_published" }` 等
- 同質な leaf 群 (organism のみ / submitter のみ) の `BoolOp(OR, [...])` は Sidebar の複数選択に拾い上げる (`collectOrOfFieldValues`)
- 抜き取れない leaf / 異質な OR / NOT は Advanced builder 側に倒す
- root 自体が単独 leaf でも対象なら抜き取る (rest は identityAst)

### UI

Sidebar は state から `app/ui/` の FacetGroup / FacetRow / DateFacet を render する。

- AppliedFilters: 適用中の facet を chip 化 (label + 値、× で個別解除、「すべて解除」 button で `clear`)
- FacetGroup organism: 全 12 organism + showMore (cross-DB / per-DB 共通)
- FacetGroup submitter: per-DB のみ
- FacetGroup studyType: per-DB のみ
- DateFacet: 「すべて / 1 年 / 5 年 / 10 年」 segmented + FROM/TO date input

facet 候補値 (organism / submitter 等の選択肢) は **hardcoded 静的リスト** (固定 12 organism / 主要 submitter)。API の aggregations endpoint は portal 側から呼ばない。

## AST merge

3 経路の AST を AND で結合する純粋関数 `mergeAstAnd` と空 AST `identityAst` を `app/features/search/ast/` に置く。

挙動:

- 全 nodes を flat な BoolOp(AND, [...]) に AND 結合
- 内側に既に BoolOp(AND, ...) があれば flatten (associative AND の正規化)
- nodes が空、または全部 identityAst なら identityAst を返す
- 単一の non-identity node はそのまま返す (BoolOp で包まない)

### PBT 不変量

- **結合律**: `merge(merge(a, b), c) ≡ merge(a, merge(b, c))` (canonicalize 後の構造比較)
- **単位元**: `merge(a, identityAst) ≡ a`、`merge(identityAst, a) ≡ a`
- **空消滅**: `merge() ≡ identityAst`
- **保存性**: `merge(a, b)` の rule 集合は `a` と `b` の rule 集合の和 (重複あり) に等しい
- **平坦化**: 結果が `BoolOp(AND, [...])` のとき、子要素に `BoolOp(AND, ...)` は現れない

`merge` は **冪等ではない** (同じ node を 2 回渡すと重複した child を持つ AND node が生成される)。UI 側で重複を除去する場合は呼び出し側の責務。等価判定は構造比較 (`astEquals`、JSON.stringify では union 子の順序問題で false negative が出る)。

## /db-portal/serialize 呼び出し

### debounce 700 ms

merged AST が変化したら 700 ms 待って `/db-portal/serialize` を呼ぶ。debounced ast が identityAst なら何もしない (URL の `?q=` を削除する場合は別 action)。成功で `navigate("/search/results?q=...", { replace: true })`、失敗で `syncStatus = "failed"`。

`/search` (cross-search ビルダー) はキーワードを含むため `useCrossSearchSync` を使う: keyword と構造化 AST をまとめて 700 ms debounce し、1 本の非同期チェーンで `parse → merge → serialize` する。keyword の parse 失敗は `parseError` (構文エラー) として `failed` 扱いにし、serialize 失敗とは区別する。request はキャンセルせず、単調増加トークンで古い応答を捨てる (`useDebouncedSerialize` と同じく非キャンセル)。per-DB / 構造化のみの経路は従来通り `useDebouncedSerialize`。

### sync-status

`SyncStatus` (`"idle" | "syncing" | "synced" | "failed"`) を SyncStatusChip で表示する。`syncing` / `failed` のときだけ chip を表示し、`failed` には「再試行」 link を添える。`synced` は通常 invisible (idle と同じ扱い、動的演出はしない)。

### 失敗時の挙動

- 表示中の検索結果は古い URL のまま (URL は書き換えない、古いままで使い続けられる)
- 検索実行 button は別経路で `/db-portal/serialize` を直接呼ぶため、debounce 失敗で button が disable されることはない
- `useDebouncedSerialize` は `useMutation` を使い、`mutations.retry: 0` で retry なし。1 回目の 5xx で `syncStatus = "failed"` になり、SyncStatusChip の「再試行」 button で同じ AST を再 dispatch する

## 検索結果 UI

### cross-DB 結果 (`/search/results?q=...`)

`GET /db-portal/cross-search?q=...&topHits=5` を route loader が呼ぶ (TanStack Query は使わない、SSR で完結)。レスポンスの `databases` 配列 (length 8、固定順) について **常にカードを 1 枚** 出す (0 件 DB も skip しない、相対的なヒット分布を見せる)。

各カードの内容:

- title: i18n リソースの `search.scope.<db>`
- description: 1 行 (i18n リソースの `search.descriptions.<db>`)
- count: `count ?? 0`、tabular-nums mono 26 px
- 上位 hit: 最大 5 件 (accession + title + datePublished)
- 「結果一覧 →」: `/search/results?q=<DSL>&db=<id>` への TextLink
- error フィールド (timeout 等) が立っているとき: count を `?` 表示 + 「再試行」 link

`databases` は API 仕様で固定順 (`trad / sra / bioproject / biosample / jga / gea / metabobank / taxonomy`)。portal 側で並び替えない。

Tier 2 fallback: optional field (title / description / datePublished 等) が `null` / `undefined` のとき、該当行を非表示にする (skeleton / placeholder を出さない)。「title なしの hit」 は 1 行で accession だけ表示する。

### per-DB 結果 (`/search/results?q=...&db=<id>`)

`GET /db-portal/search?q=...&db=<id>&page=N&perPage=M&sort=<sort>` を route loader が呼ぶ。

#### Layout (3-col)

| 列 | 幅 | 内容 |
|---|---|---|
| Sidebar | `--spacing-sidebar` (256 px) | `SidebarHeading` + `AppliedFilters` + `FacetGroup` × N + `DateFacet` |
| Main | flex-1 | ResultsToolbar (件数 + sort + perPage + pagination) + record card list + ResultsToolbar (bottom pagination のみ) |
| Right pane | `--spacing-right-pane` (280 px) | クエリプレビュー + AI assistant (LLM available 時) |

#### Result card

- 上 row: accession (mono brand-deep) + `·` + datePublished + 種類別 Tag (organism、SRA は libraryStrategy、BioProject は projectType (`string[]` を join 表示)、Trad は molecularType / division。per-DB により tag 種類差)
- title: 16 px bold
- excerpt: description / abstract (2 行 clamp)
- 下 row: 登録機関 (submitter / organization) を mono brand pill 風 Tag で

Tier 1 必須 field (identifier / type) は API 契約で常に非空。portal 側で空チェックを行わない (空が来たら API 側の不正データとして UI 上 broken な見た目で可視化される)。Tier 2 (study type / organization 等) は optional chaining で安全に扱い、値が空なら row 自体を非表示。

DB ごとの差分は内部分岐で表現する (DB ごとに `result-card-bioproject.tsx` のように分けない)。

#### Pagination

`app/ui/pagination.tsx` で `totalPages = Math.ceil(total / perPage)` を計算した offset pagination のみを使う。ES の `max_result_window` (10000 件) を超える page にユーザーが行ったとき、API が error を返す前提で UI は通常の数値 pagination をそのまま描画する。深部 page の cursor 切替 (search_after) は portal 側では実装していない。

### ResultsToolbar

- 左: 件数 (`<total> 件中 <start>-<end>`)
- 中: sort 切替 (`relevance` / `date_desc` / `date_asc`) + perPage 切替 (`20` / `50` / `100`)
- 右: pagination

ResultsToolbar は結果リストの上下に置く。上は件数 + sort + perPage + pagination、下は pagination のみ。

`hardLimitReached === true` のとき件数の横に Tag 「上位 10000 件まで」 を出す (API 仕様、ES / Solr のハードリミット表示)。

### 結果領域の a11y

検索結果の更新は URL 駆動で起きる (search box submit / facet 操作 / pagination / sort)。screen reader user 向けに次を満たす:

- main 結果 wrapper (cross-DB / per-DB 共通) に `role="region"` + `aria-label={t("search.a11y.resultsRegion")}`
- 件数表示 (ResultsToolbar 左の `<total> 件中 <start>-<end>`) に `aria-live="polite"` + `aria-atomic="true"` を付け、loader 完了で件数が announce される
- 「結果なし」 / parse error / cross / db error の Callout には `aria-live="polite"`
- 「同期中」 / 「同期失敗」 を表す SyncStatusChip は `role="status"` (= 暗黙の `aria-live="polite"`)

assertive (`role="alert"` / `aria-live="assertive"`) は通常の検索結果更新では使わない (キーストロークごとに発火する debounce sync が SR を邪魔するため)。重大エラーの限定箇所のみ assertive に倒す。

## AI 検索アシスタント

### LLM availability

`/api/llm/health` を `useQuery` で取得し、`status` ごとに `ready` を導く (`app/features/search/assistant/llm-availability.ts`):

- `status === "ok"` → `ready: true`
- `status === "unset"` → `ready: false` (UI を物理的に出さない)
- `status === "unreachable"` → `ready: true` (UI を出して、送信時に SSE error 経路で fail を伝える)

queryKey は `["llm-availability"]`、`staleTime` は 5 分 (頻繁に poll しない)。

`/search` (検索ビルダ) と per-DB results (`/search/results?db=<id>`) で表示する。cross-DB results (`/search/results` で `db` 未指定) では表示しない (AI 提案は Advanced builder への差分提案であり、cross-DB の表示文脈ではユーザの操作対象がないため)。

`/search` では統合入力 (`SearchInputPanel`) の中に AI を畳み込み、キーワードモードと AI モードを「AI モード」 トグルで切り替える。`ready === false` のときはトグル自体を出さず、キーワードモードに固定する。AI モードの textarea (自然文プロンプト) はキーワードとは独立した state で、モード切替時に引き継がない。

### 生成モード (cross-search ビルダー)

AI モードには **新規生成 (new)** と **既存に追加 (append)** の 2 モードがある。AI モード入場時の default はビルダーの件数 (= keyword 行 0/1 + 構造化条件数) で決まる:

| 件数 | default | append |
|---|---|---|
| 1 以上 | append (既存に追加) | 有効 |
| 0 | new (新規生成) | disable (追加先が無い) |

- **append**: 提案を現在の構造化条件に graft する (keyword は不変)
- **new**: 現在の構造化条件を破棄して提案だけにする。keyword も初期化する (「新規」 の意味を保つため)

### SSE 配線

`/api/llm/search-assistant` (server 側 endpoint、`llm.md`) に POST、SSE で event を受け取る:

- `event: message` → 累積バッファに delta を貯める (内部表示なし)
- `event: done` → data を `AssistantProposal` として parse して proposal state に反映、state = "done"
- `event: error` → state = "error"、toast を出す

`AbortController` で stop 可能 (stop すると state = "idle" に戻る)。SSE のため `response.body.getReader` で chunk を読み、`text/event-stream` フレーム境界 (`\n\n`) ごとに event を抽出する。

### 提案の反映

純粋関数で proposal を Advanced state に反映する。proposal.conditions の condition 化規則は共通:

- proposal.conditions を condition の配列に変換
- `proposal.combinator === "OR" && conditions.length > 1` のとき 1 つの group (innerCombinator=OR) で包んで append、それ以外は conditions を直接 append
- 各 condition の combinator は AND (先頭含めて、root に追加されるため)

cross-search ビルダーの統合入力では適用先を生成モードで分岐する: **append** は現在の root に graft、**new** は空 state から組み立て直し keyword も初期化する。per-DB results の AI アシスタントは append 相当の単一挙動。

「やり直す」 button は textarea を空にして stream を `stop()` する (`state` は `streaming` → `idle`)。表示中の proposal は残るので、ユーザーが入力をやり直して再 generate するまで proposal カードは可視のまま。

## search 固有の primitive 事情

UI primitive の一覧と仕様は `frontend.md` (SSOT)。search が特別に必要とするものは:

- **Advanced builder の value 入力用** に `app/ui/text-input.tsx` を持つ (date input も `type="date"` の variant として同 primitive で扱う)
- **Sidebar facet** の `AppliedFilters` / `FacetGroup` / `FacetRow` / `DateFacet` を消費 (facet UI のドメインは search だが primitive 自体は `app/ui/` 側)
- **SearchBox** は Top / Search で共有 (`frontend.md` の Chrome カテゴリ)
