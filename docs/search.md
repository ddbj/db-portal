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

キーワードボックスは **自由文** (スペース / カンマ / クオート) として案内する。ddbj-search-api の文法は `field:value` (allowlist 制の Tier 1/2/3 フィールド) も解釈するが、portal の UI ではこれを宣伝しない。フィールドを限定した検索は Advanced builder の役割で、キーワードボックスは「おもな項目の全文検索」 に徹する。不明フィールド (`organism:` 等) や解釈できない構文を入れると `/db-portal/parse` が 400 を返すので、その入力はキーワードボックスを invalid 表示にして知らせる ([§ parse の失敗](#parse-の失敗))。

キーワード (free_text) が照合する **default field は 5 つ** (`identifier` / `title` / `name` / `description` / `organism.name`、ddbj-search-api `compile_free_text` の `_FREE_TEXT_DEFAULT_FIELDS`)。「すべての項目」 ではないので UI もそのように表示する (キーワード行に「おもな項目を全文検索」 + ⓘ で 5 field を明示)。portal は `keywordFields` 相当の絞り込みパラメタを送らない。

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

AI 検索アシスタントは「自然言語入力 → Advanced builder への提案 (新規生成 / 既存への融合)」 という UX を担う。提案はフルスペック DSL (`AND` / `OR` / `NOT` / グルーピング) を表す ParseNode AST。`/api/llm/health` で LLM availability を判定し、`unset` のときだけ UI を物理的に出さない。`unreachable` のときは UI を出して、送信時に SSE `event: error` 経路で失敗を通知する (`llm.md`)。

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

`/search` (ビルダー) も `?q=<DSL>` (+ `db`) で開くと loader が `GET /db-portal/parse` で AST 化し、`splitFreeText` で free_text を keyword 行に、残りを `toAdvanced` で Advanced builder に復元する (facet サイドバーは無いので構造化条件はすべてビルダー側)。db は scope に復元する。結果ページの `クエリビルダーで編集` がこの経路を使う。

`/search/results` route の loader が `?q=` を読み、`GET /db-portal/parse` で AST 化する。route component は AST を **3 つの面** に分解して state を再構築する: top-level の `free_text` (`splitFreeText`) → **キーワードボックス**、Sidebar facet で表現できる leaf (`splitForSidebar`) → **facet サイドバー**、残り → **保持する Advanced state** (`toAdvanced`)。Advanced state は results では UI を描かず、preview グラフでの可視化と再 serialize のために保持する。

表現できない構造 (たとえば `OR` を Sidebar facet 側に持たせる、など) は **保持 state 側に倒す**。Sidebar は単純な AND of equality / range のみを表す。

free_text node の扱いは経路で **非対称**:

- `/search` (cross-search ビルダー) では、上部キーワードボックスと双方向同期する **keyword 行** として Advanced builder に表示し、parse → merge した内容を live preview / URL に反映する。keyword の文字列自体は AST 化せず行に生表示し、AST は別経路 (`useCrossSearchSync`) で算出する (複合 DSL でも行表示が壊れない)。
- `/search/results` は `splitFreeText` で top-level free_text を取り出し **キーワードボックスに値だけ** (例 `human`) を出す。生 `?q=` 文字列は box に出さない。取り出した free_text は committed な keyword AST として live sync に畳み込むので、facet を編集しても free text は落ちない。OR/NOT に内包された free_text は保持 state 側に残る (Advanced builder が表現できないため `toAdvanced` で drop されるのは従来どおり)。

### parse の失敗

`/search` (検索ビルダ) でキーワードの parse が失敗したら (live sync / submit のどちらでも) results へ遷移させず、その場で直せるようにする:

- キーワードボックス自体を **invalid 表示** にし、box 下の構文ヒント (スペース=AND / カンマ=OR / `"…"`=フレーズ) を warn 色に切り替える (入力位置でのインライン検証)
- **クエリプレビューと同じ位置** を使い、エラーが無いときはクエリプレビュー、エラーが有るときは warn の `<Callout>` (構文エラー文言 + 右端に「再試行」)、という **排他** 表示にする
- 警告が出ている間は「この条件で検索」 button を disable にする (壊れたクエリでの実行・遷移を防ぐ)

system 側の serialize / 同期失敗 (ユーザーが直せない) は **この警告として出さない**。それらは sync chip のみが示し、表示中の検索結果は古いまま使える。生クエリを `?q=` に載せて results に飛ばすと再 parse で必ず失敗しユーザーが抜け出せないため、parse エラーは `/search` 内で完結させる。

`/search/results` のキーワードボックスでも、submit 時の keyword parse が失敗したらボックスを invalid 表示にし、box 直下に構文エラー文言を出す。遷移はせずその場で直せる。results / top の box は構文ヒント (スペース=AND 等) や AI モードの補助文を出さない (それらは `/search` ビルダーのみ)。

`/search/results` で URL の `?q=` を直接開いて `/db-portal/parse` が 400 を返した場合は、loader が `errorKey: "parse"` を data として返し、route component が warn の `<Callout>` (右端に「再試行」 = `navigate(0)` で再 loader) を描画する。throw / ErrorBoundary 経路は通らない。

API 接続失敗 (5xx / timeout) は TanStack Query retry policy で query 系は 2 回まで再試行される (`app/lib/query/client.ts`)。debounced serialize は `useMutation` なので retry なし (`mutations.retry: 0`)、失敗時に sync status chip が失敗を表示する。

## Advanced builder

### 状態モデル

ネストした group / condition の tree を持つ。

- **Condition**: 1 つの検索条件。親 group 内での結合子 (`AND` / `OR` / `NOT`) + field + op + value (op が範囲なら from / to)
- **Group**: 子を束ねる入れ物。親 group 内での結合子 + 子集合の内部結合 (`AND` / `OR`) + 子の配列
- **Root**: 最上位 group。combinator は無視、子の数 0 から可

group / root の結合は **`innerCombinator` を 1 つだけ** 選ぶ形に正規化する (Airtable / Notion 流の「1 group = 1 結合子」)。UI は group / root ごとに **`AND` / `OR` セグメントトグル** を 1 つ出す (root は子が 2 件以上のとき)。`AND` / `OR` の混在はネストした group で表現する。行間に連結語 (`かつ` / `または` 等) は **出さない** (縦幅肥大を避ける)。子は左のブランチガイド (縦線) で束ねて見せる。

各 condition の否定 (`NOT`) は **演算子 (述語) に統合** する。op の肯定形と否定形をペアで述語ドロップダウンに並べ (`を含む` / `を含まない`、`と一致` / `と一致しない` 等)、選択は (op, negated) に展開される。negated は AST 上 condition を `NOT` で包む。独立した「除外」トグルは持たない。**先頭行を含む全 condition が独立に否定可能** で、`ensureFirstCombinatorAnd` のような先頭固定はしない。group 自体の否定は group ヘッダの `NOT` トグルで表す。`combinator` の `AND` / `OR` 値は AST 上 `innerCombinator` に吸収されるため、condition / group の `combinator` が実際に担うのは **否定か否か** だけ (`NOT` か `AND`)。`/search` で keyword 行があるときは先頭の構造化条件が keyword と AND 結合し、削除も可能。SQL 由来の `WHERE` 表示は使わない。

field の取り得る値は **scope 依存** で、上部検索ボックスの DB scope セレクタが供給する。全 DB (cross) では cross-DB でも安全な Tier 1/2 のみ。単一 DB を選ぶと、その DB の Tier 3 field が候補に加わる (Solr backed の trad / taxonomy 専用 field は除く)。具体の field 一覧は `field-catalog.ts` の `CATALOG` / `fieldsForScope` (および `search-fields.md` の field 軸) を参照。scope を切り替えても既存 condition の field は dropdown に残し (非破壊)、scope 外の field は live sync が `field-not-available-in-cross-db` 等で invalid を知らせる。op の取り得る値は field の型ごとに制限される (date は範囲のみ、enum は完全一致のみ等。詳細は `search-fields.md` の DSL field type 規約)。コードは `field-catalog.ts` の `fieldsForScope` / `FIELD_OPS` が SSOT。

### reducer の責務

Advanced builder の state 遷移 (追加 / 削除 / 内部結合の AND・OR 切替 / 否定の AND・NOT 切替 / field・op・value・range 更新 / URL 復元時の root 置換 / 全消去) は `advanced/reducer.ts` が SSOT。action 名と効果の対応はコードを参照する。`combinator` が取り得る意味のある値は `AND` (否定なし) / `NOT` (否定) のみで、先頭 child を固定する処理は持たない (`### 状態モデル`)。

### 不変量 (PBT)

- 同じ id を 2 つ持つ node が同時に木に存在しない
- `clear` を 2 回呼ぶ結果は 1 回と同じ
- `removeNode` で root 以外の任意 node を消すと、残った木が valid AdvancedState になる
- 否定 (`combinator = NOT`) は op と独立に condition ごとに付き、先頭 condition にも付けられる (先頭固定はしない)
- 値域 (深さ) は UI 上 4 段を設計目安とするが reducer 側で制約しない

### AST 変換 (Advanced ↔ AST)

`fromAdvanced` (Advanced state → AST) と `toAdvanced` (AST → Advanced state) は `advanced/from-advanced.ts` / `advanced/to-advanced.ts` が SSOT。変換が満たす性質は下記 round-trip 不変量で固定する。規約として述べる要点:

- 空入力 (`value === ""`、range の from / to いずれか空) は無視し、子なし root は `identityAst` (空 AST) を返す
- `FreeText` は Advanced builder に載せない (Simple query / keyword 行が扱う)
- Advanced builder が表現できない構造 (OR/NOT に内包された free_text 等) は `toAdvanced` で drop し、保持 state 側に倒す (`### URL → state の復元`)

### round-trip 不変量 (PBT)

`toAdvanced(fromAdvanced(s))` は `canonicalize(s)` (空 condition / 空 range を除去した形) に等しい。逆方向 `fromAdvanced(toAdvanced(ast))` も `canonicalize(ast)` に等しい。

`canonicalize` は (a) 空 condition / 空 range を除去、(b) AND/OR の子 1 件は親に flatten、(c) 同 combinator の入れ子は flatten、の 3 操作。

### UI

Advanced builder の UI は state を受け取り、再帰的に ConditionRow / GroupRow を render する。

- ConditionRow: field 選択 + **述語選択** (op と否定をペアにした単一ドロップダウン: `を含む` / `を含まない` / `と一致` / `と一致しない` 等。日本語は助詞+動詞で `を含む` と対称にし、英語は自己説明的な `equals` / `does not equal` を採る) + value 入力 (text / date input 2 個 / facet combobox のいずれか) + 削除 (×)。独立した「除外」トグルは持たない。field ラベルは平易な日本語のみ (技術 field 名は query preview / DSL に出る)。Select と value 入力は同じ高さ variant で揃え、`[項目] [述語] [値]` が 1 行で日本語の一文として読み下せるようにする
- value 入力の出し分け: date field / `between` は FROM/TO の date input、選択中 scope で facet を持つ field ([§ Sidebar facet](#sidebar-facet) の facet 行と同じ判定 = `rowByDslField`) は **facet combobox** (pull-down + テキスト絞り込み)、それ以外は free text。facet combobox は候補から選べるが **editable** で、候補に無い値も自由入力できる (facet 集計に出ない正当な値を排除しない)。候補は scope の facet 集計から得る (件数付き、organism は学名表示で taxID を確定値にする)。集計が未取得 / 失敗のときは候補ゼロの combobox になり free text と同等に振る舞う
- GroupRow: brand バー + group ラベル + `AND` / `OR` トグル (`innerCombinator`) + 否定 (`NOT`) トグル + 内側の再帰描画 + 削除
- root も子が 2 件以上で `AND` / `OR` トグルを出す。行間に連結語 (`かつ` / `または`) は出さず、左ブランチガイドで束ねる
- keyword 行: 「おもな項目を全文検索」 と正直に表示し、ⓘ (`InfoHint`) のホバー / フォーカス / クリックで対象 5 field (`identifier` / `title` / `name` / `description` / `organism.name`) をツールチップ表示する。AI モードの検索ボックスと面色を揃える
- 末尾: 「+ 条件を追加」 / 「+ グループを追加」

入力は `app/ui/` primitive 経由 (Select / TextInput / Combobox / IconButton)。facetable な field の value 入力は editable な絞り込み combobox (`app/ui/combobox.tsx`) を使う。

facet 候補は `/search` でも scope の facet 集計を引いて供給する ([§ 候補値・件数の出所](#候補値件数の出所--api-facet-集計) と同じ集計)。Sidebar (`/search/results`) は検索ヒットに連動した `q` 付き集計だが、ビルダーは編集中で確定クエリが無いため **scope 全体 (match_all)** の集計を候補母集団にする。scope セレクタ切替で再取得し、cross は cross-search、単一 DB は db-search の facet を読む。

UI 上の最大ネスト深さは制約しないが、設計目安 4 段。

## Sidebar facet

結果ページ (`/search/results`) で **ユーザが直接フィルタを操作できる唯一の UI**。編集可能な Advanced builder は `/search` 側にしか無く、結果ページの右ペインは read-only のクエリプレビュー + AI アシスタントなので、scope 固有の絞り込みは Sidebar が担う。

### filter の 3 制御種別

Sidebar の各行はフィールドの値域に応じて 3 種類の制御で出し分ける。値域 (distinct 値数) は staging ES / Solr の実データを基準にする (固定の代表値羅列はしない。drift するため)。

| 制御 | 対象 | UI | AST へのマップ |
|---|---|---|---|
| **facet** | 低〜中カーディナリティの controlled-vocab | checkbox 複数 / radio + 件数 | `eq` (複数選択は `OR` 展開) |
| **text** | 高カーディナリティの自由文 / identifier | text input | `contains` (text) / `eq` (identifier) |
| **range** | 数値 / 日付 | FROM/TO (date はプリセット併設) | `between` |

種別の判定基準: distinct がおおむね 50 以下の controlled-vocab は facet、数百以上の自由文 (例: `host` は 13 万種超) は text、数値域は range。判定は各 field の distinct 件数の実測に従う。

### scope 別の filter 構成

scope (cross / 各 DB) ごとに出す行 (どの field を facet / text / range のどれで描き、どの DSL field を emit するか) は `facet-config.ts` の `SCOPE_FILTERS` が SSOT。field 軸 (各 field がどの scope で出るか) の対応は `search-fields.md` 参照。facet は ddbj-search-api の scope 別 facet 集合 (`db-portal-api-spec.md § scope 別 facet 集合`)、text / range は DSL allowlist (Tier 1/2/3) に対応する。Solr backed の trad / taxonomy では ARSA / TXSearch で degenerate する行を出さない (trad: organism / submitter、taxonomy: organism / submitter / date_published)。

行構成を貫く不変量:

- **Sidebar は AND of rows**: 各行は AND 結合のみ。OR / NOT を持てない ([§ AST 変換](#ast-変換-sidebar--ast))
- **cross は Tier 1/2 のみ**: cross sidebar には横断可の共通 field しか出さない (Tier 3 は `field-not-available-in-cross-db` で 400)
- **Solr scope は degenerate 行を出さない**: trad / taxonomy は ARSA / TXSearch で degenerate する行 (上記) を構成から除く

注意:

- **`studyType` の意味**: jga / metabobank の facet `studyType` は DSL `study_type` field (jga-study / metabobank の controlled-vocab) を指す。SRA の `libraryStrategy` (DSL `library_strategy`) とは **別 field** なので、`libraryStrategy` は sra scope、`studyType` (= `study_type`) は jga / metabobank scope でのみ出す (混同しない)。
- **cross で `type` を出さない理由**: `type` は DSL 上 Tier 3 (`type:<subtype>` は単一 DB 指定必須) で、cross の `q` に載せると `field-not-available-in-cross-db` で 400 になるため、cross の sidebar filter には出さない (subtype 絞り込みは DB scope セレクタで DB を選んでから行う)。API は cross で `facets=type` 集計自体は受け付けるが、portal は filter として再注入できないため要求しない。
- **`type` (subtype) facet は per-DB のみ**: sra (`sra-*` subtype) / jga (`jga-*` subtype) の scope で `type` facet を出し、bucket は subtype 名。`db=sra` / `db=jga` + `facets=type` が subtype 別件数を返す (ddbj-search-api 対応済み)。単一 subtype の bioproject / biosample / gea / metabobank では出さない (API も `facet-not-applicable` で 400)。
- **subtype scope (SRA)**: `libraryStrategy` / `librarySource` / `librarySelection` / `platform` / `libraryLayout` / `instrumentModel` / `libraryName` / `libraryConstructionProtocol` は sra-experiment、`analysisType` は sra-analysis、`geoLocName` / `collectionDate` / `derivedFromId` は sra-sample が持つ。`db=sra` は subtype 横断なので、対応しない subtype の doc では空 bucket になる (自然に脱落)。
- **`submitter` は facet でなく text**: `organization.name` は高 cardinality で facet 集計に向かず、API も submitter facet を提供しない (`db-portal-api-spec.md § scope 別 facet 集合`)。登録機関の絞り込みは cross + ES 6 DB で text 入力 (`submitter` の contains、UI ラベルは「登録機関」/ Organization)。Solr backed (trad / taxonomy) は degenerate のため出さない。
- **taxonomy の `organism` は出さない**: tax_id が doc 同一性で facet が degenerate (API も taxonomy facet を rank / kingdom のみに限定)。taxonomy の生物種軸は text 入力 (`species` / `commonName` 等) で扱う。
- **`organism` filter は taxID と学名の 2 系統**: organism facet (cross + ES 6 DB) は bucket チェックボックス (taxID = `organism_id`、件数付き、表示は学名ラベル) の上に Taxonomy ID text box を持つ。両者は同じ選択状態 (taxID 群) の双方向同期する別表現で、text box では bucket に現れない minor な taxID もカンマ区切りで直接入力できる (bucket 外の値も sidebar から指定可能にする)。これとは別軸で学名の contains 検索を `organismName` text 行 (cross + ES 6 DB + trad) として持つ。AST 上は facet/Taxonomy ID box が `organism_id`、text 行が `organism_name` を emit し、Taxonomy ID box は facet 選択の表示専用エディタで AST マッピングは facet 行のまま不変 (§ AST 変換)。
- **accessibility は 2 値 enum facet**: public-access / controlled-access。API の `_COMMON_FACET` で全 ES scope 集計可能なので、cross + ES 6 DB の sidebar に facet として出す (Solr trad / taxonomy は field 不在で出さない)。
- **共通 Tier 1/2 field の網羅追加**: cross + 全 ES scope に identifier (text, exact)・title・name・description・organismName・organization (= `submitter`) の text 行と dateModified / dateCreated の range 行を出す。publication (text) は merge される scope (biosample 除く) + cross に出す。keyword box / Advanced builder と重複する分は許容 (sidebar = `/search/results` で唯一編集できる filter のため、横断可 field も sidebar から到達できるようにする)。`organism_name` も横断可 field として sidebar に出すことで、`organism_name:…` の DSL が Advanced builder に落ちず sidebar の学名 text 行に round-trip する。

### 候補値・件数の出所 = API facet 集計

facet の候補値と件数は **ddbj-search-api の facet 集計を呼んで実データから得る** (NCBI 風に値 + 件数を出す)。portal 側の hardcoded 静的リストは持たない。理由:

- 中カーディナリティ field (`package` ≈ 200 種、`model` ≈ 250 種、`instrumentModel` ≈ 95 種、`rank` ≈ 48 種等) は静的リストで列挙しきれず、実データ追従もできない
- 極小 controlled-vocab (`objectType` 2 / `libraryLayout` 2 等) も、件数表示を揃えるため集計経路に一本化する
- facet count (値ごとの件数) は静的リストでは得られず、集計でのみ出せる (NCBI 風の「値 + 件数」表示の要件)

集計母集団は **self-exclusion** を使う。各 facet `F` の bucket は「`q` のうち `F` 自身に対応するフィルタだけを除外し、他の facet・free text・text 行・range 行・保持条件はすべて適用した集合」から計算する。hits（検索結果本体）は従来どおり `q` 全フィルタ適用のまま。これにより organism を選んでも organism の他候補が候補一覧に残り、続けて追加選択できる。accession 完全一致で suppressed が解禁される場合の母集団は hits と同一 `status_mode` にする (`/facets` のような public_only 固定にしない)。`organism` の bucket は taxID (`organism.identifier`) で集計し、`organism_id:<taxID>` として再注入する (表示は organism facet bucket の学名ラベル)。

### API 契約: `/db-portal/*` の facet 集計

`/db-portal/search` / `/db-portal/cross-search` は `facets` パラメタで `q` 連動の facet 集計をレスポンスに同梱する。raw spec は ddbj-search-api `docs/db-portal-api-spec.md § facet 集計` が SSOT。本書は portal 側の消費規約のみを扱う。

- **`facets`**: 集計する facet 名のカンマ区切り (省略時は集計なし)。portal は scope の filter 構成 (`SCOPE_FILTERS`) の facet 行に対応する名前を送る (accessibility は送らない)。scope 外の facet は 400 `facet-not-applicable`、allowlist 外の名前は 422
- **`facetsSize`**: bucket 上限 (1–1000、既定 100)。多値 facet (`package` / `model` / `rank` 等) の「もっと見る」で使う
- **`facetSelfExclude`**: `true` を送ると各 facet の集計母集団から自身のフィルタを除外する (self-exclusion)。portal は常に `true` で呼ぶ。cursor path では非適用 (cursor に焼き込んだ query を母集団にするため)
- **レスポンス `facets`** (`DbPortalFacets` = `Facets` 拡張): 各 facet が `{value, count}` 配列 (`organism` のみ `{value, count, label}`)。「集計対象外 = `null`」「0 件 = `[]`」。横断はトップレベル 1 セット (ES 6 DB union、organism / type のみ。trad / taxonomy は含まれない)
- **facet 名 → DSL field**: facet 名と再注入する DSL field 名が異なるものは API の再注入表に従う (`organism → organism_id`、`objectType → object_type`、`projectType → project_type`、`molecularType → molecular_type` 等)。portal の facet state はこのマッピングを持つ
- **集計失敗時**: API は `facets=null` を返し検索結果は 200 のまま。portal は facet 非表示で degrade する

### AST 変換 (Sidebar ⇄ AST)

`fromSidebar` の挙動:

- 各行を AND 結合する
- facet (複数選択可) は同 field の `eq` LeafValue 群を、複数なら `BoolOp(OR, [...])`、1 件なら単一 LeafValue にする (`organism` は taxID を載せる)
- text 行は値があるとき `contains` (text field) / `eq` (identifier field) の LeafValue にする
- range 行 (datePublished / sequenceLength) は FROM/TO 両方あるとき `between` LeafRange にする。date 行のプリセット (1y / 5y / 10y) は client の現在日から from/to を導出する ([§ date レンジの状態](#date-レンジの状態))
- scope (`options.db`) に応じて出す行を絞る。cross は Tier 1/2 のみ (Tier 3 を出すと `field-not-available-in-cross-db` で 400)、各 DB はその DB の Tier 1/2/3 のみ。Solr degenerate の行は生成しない
- どの行も未指定なら identityAst

`splitForSidebar` の挙動:

- URL 復元時、AST の top-level `BoolOp(AND)` の子から「現在の scope の Sidebar 行で表現できる leaf」 を抜き取り、残りを返す
- 抜き取り対象は scope の filter 構成に載る field の `eq` / `contains` LeafValue と `between` LeafRange。同 field の `eq` を集めた `BoolOp(OR, [...])` は facet の複数選択に畳んで拾い上げる
- 抜き取れない leaf / 異質な OR / NOT は Advanced builder 側に倒す
- root 自体が単独 leaf でも対象なら抜き取る (rest は identityAst)
- date 行の `between` は client の現在日基準でプリセット (1y / 5y / 10y) と照合し、一致すればプリセット選択として、一致しなければ custom レンジとして復元する。URL は絶対 between しか持たないため、この照合がプリセット選択をラウンドトリップ越しに保つ ([§ date レンジの状態](#date-レンジの状態))

### date レンジの状態

date 行 (datePublished / dateModified / dateCreated) は「すべて / 1年 / 5年 / 10年」のプリセットボタンと、FROM/TO date input を併せ持つ。内部状態は `active` (プリセット種別 or `custom`) + FROM/TO で表す。

| 状態 (`active`) | FROM/TO の値 | ボタンの選択表示 | emit | 日付指定の展開 |
|---|---|---|---|---|
| `all` | 空 | 「すべて」 | emit しない | 閉 |
| `1y` / `5y` / `10y` | 空 (表示時に現在日から算出) | 該当プリセット | 算出した between | 開 (算出値を表示) |
| `custom` | ユーザ入力 | どれも非選択 | 両方あるとき between | 開 |

- プリセットを選ぶと「日付指定」を自動展開し、算出した期間を FROM/TO に表示する (選択は保持)
- FROM/TO を手編集すると `custom` になり、プリセットの選択表示は外れる
- 「すべて」を選ぶと FROM/TO を空に戻す (フィルタ解除)
- プリセットの状態は FROM/TO を空で持ち、emit / 表示時に現在日から都度算出する (絶対日付を state に焼き込まない)

### UI

Sidebar は state から `app/ui/` の FacetGroup / FacetRow / TextInput / DateFacet を render する。

- AppliedFilters: 適用中の行を chip 化 (label + 値、× で個別解除、「すべて解除」 button で `clear`)
- facet 行: FacetGroup + FacetRow (checkbox / radio) + 件数。候補が多い field は折りたたみ、「もっと見る / 折りたたむ」で上限まで展開する。選択中の値は上限を超えても常に表示し、上限を超える候補は sidebar に出さず keyword / builder で扱う (折りたたみ / 展開の件数しきい値はコードが SSOT)
- text 行: ラベル + TextInput (1 行)
- range 行: date 行は「すべて / 1 年 / 5 年 / 10 年」プリセット + 「日付を指定」(FROM/TO date input) の組 ([§ date レンジの状態](#date-レンジの状態))、sequenceLength は数値 FROM/TO
- 出す行は scope の filter 構成 (`SCOPE_FILTERS`) に従う (Solr degenerate の行は描かない)

入力欄の focus 表現などの見た目は `app/ui/` primitive と `/_design` が SSOT。

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

`serialize` / `parse` は現在の **`db` scope を渡して呼ぶ** (per-DB は当該 DB、cross は省略)。per-DB facet は Tier 3 field (`object_type` 等) を emit するので、scope を渡さない (= cross 検証) と `field-not-available-in-cross-db` で 400 になり sync 失敗するため。loader の URL 復元 parse も同じ理由で `db` を渡す。

`/search` (cross-search ビルダー) はキーワードを含むため `useCrossSearchSync` を使う: keyword と構造化 AST をまとめて 700 ms debounce し、1 本の非同期チェーンで `parse → merge → serialize` する。keyword の parse 失敗は `parseError` (構文エラー) として `failed` 扱いにし、serialize 失敗とは区別する。request はキャンセルせず、単調増加トークンで古い応答を捨てる (`useDebouncedSerialize` と同じく非キャンセル)。

`/search/results` (cross-DB / per-DB) は `useDebouncedSerialize` を使い、`merge(committed keyword AST, 保持 advanced AST, facet AST)` を serialize する。committed keyword AST を畳むので facet 編集でも free text が保存される。キーワードボックスの submit はこの live sync とは別に、編集中の keyword を parse して同様に merge → serialize → `navigate` (push) する。

### sync-status

`SyncStatus` (`"idle" | "syncing" | "synced" | "failed"`) を SyncStatusChip で表示する。`syncing` / `failed` のときだけ chip を表示する (`synced` / `idle` は invisible)。chip は **状態を示すタグのみ** で操作は持たない。再試行はクエリプレビュー上の warn `<Callout>` 右端の「再試行」に集約する ([§ parse の失敗](#parse-の失敗))。

### 失敗時の挙動

- 表示中の検索結果は古い URL のまま (URL は書き換えない、古いままで使い続けられる)
- 検索実行 button は submit 時に `/db-portal/serialize` を直接呼ぶ。`/search` では parse 構文エラー表示中のみ button を disable にする。serialize / 同期失敗 (system 側、ユーザーが直せない) は警告も disable も伴わず、sync chip だけが示す
- `useDebouncedSerialize` は `useMutation` を使い、`mutations.retry: 0` で retry なし。1 回目の 5xx で `syncStatus = "failed"` になり chip が失敗を示す。同じ AST の再 dispatch は警告 `<Callout>` の「再試行」が行う

## 検索結果 UI

cross-DB / per-DB は **同じ 2 ペイン構造**で描く: 上部に太い検索 box (`NavigableSearchInput`)、その下に切替可能なクエリプレビュー (`SwitchableQueryPreview`) + SyncStatusChip、さらに下に `[ facet サイドバー | 結果 ]` の 2-col grid。結果領域だけが cross (`CrossResults`) と per-DB (`PerDbResults`) で切り替わる。

検索 box は results では `allowAppend` を有効にし、`appendCurrentAst` に現クエリ全体 (= `data.ast`) を渡す。キーワードボックスの submit は parse → 保持 state + facet と merge → serialize → `navigate` (push)。AI 生成は提案を見せず、検証済み AST を serialize して `navigate` (push) する (`new` は置換、`append` は server 融合済み)。検索 box 下の例 chip 行は top と `/search` (cross builder) のキーワード box にのみ出し (両者で同一 set・等幅表示)、results (cross / per-DB) では出さない。

送信ボタンは実行中ビジー表示にする: キーワード検索の解決中 (parse → serialize → navigate → loader、`useSearchPending` が `useNavigation` で追跡) は disable + 「検索中…」、AI 生成のストリーミング中は disable + 「生成中…」(停止ボタンは残す)。`/search` ビルダーの box submit も同じく検索を実行し (旧来は keyword をコミットするだけで無反応だった)、ビルダー下部の「検索」button と同じ `runSearch` を叩く。

`SwitchableQueryPreview` は committed クエリ (`data.q` / `data.ast`) を 2 つの view で映す: **DSL 文字列** (default) と、AI 提案と同じ read-only ビルダーグラフ (`ProposalConditions`)。`DSL / グラフ` の segmented トグルで切り替える。keyword でも facet でもない構造化条件 (OR / NOT 等) はここで閲覧でき、編集は AI の append か `/search` ビルダーで行う。preview には `コピー` / `クリア` (現 db を保ったまま q を空にして遷移) / `クエリビルダーで編集` の操作も置く。`クエリビルダーで編集` は現在の DSL と db を載せて `/search?q=<DSL>&db=<id>` へ遷移し、ビルダーを復元する。

(results / top の box には構文ヒントや AI モードの補助文は出さない。それらは `/search` ビルダー専用。)

### cross-DB 結果 (`/search/results?q=...`)

`GET /db-portal/cross-search?q=...&topHits=3` を route loader が呼ぶ (TanStack Query は使わない、SSR で完結)。レスポンスの `databases` 配列 (length 8、固定順) について **常にカードを 1 枚** 出す (0 件 DB も skip しない、相対的なヒット分布を見せる)。8 枚を一目で見渡せるよう、カードは縦に詰める (DB 説明文は持たず、上位 hit は 3 件まで)。

各カードの内容:

- title: i18n リソースの `search.scope.<db>`。同じ行の右端に「結果一覧 →」 link を並べる
- count: `count ?? 0`
- 上位 hit: 最大 3 件。accession + 日付 + title を出す。日付は datePublished → dateModified → dateCreated の fallback (per-DB 行と共通)
- 「結果一覧 →」: `/search/results?q=<DSL>&db=<id>` への TextLink (title と同じ行の右端)
- error フィールド (timeout 等の一時的な部分失敗) が立っているとき: count を出さず、一時障害メッセージ (`search.results.cross.error`) + 「再読み込み」 (`navigate(0)`、`search.results.cross.retry`) を表示する。error は恒久的な検索不可ではなく再読み込みで回復しうるため、「失敗」ではなく一時性が伝わる文言にする

`databases` は API 仕様で固定順 (`trad / sra / bioproject / biosample / jga / gea / metabobank / taxonomy`) で返るが、カードは portal 側で表示順 (`DDBJ (trad) / BioProject / BioSample / SRA / JGA / Taxonomy / GEA / MetaboBank`) に並び替えて出す (コードが SSOT、`cross-results.tsx` の `CARD_ORDER`)。

cross-DB でも左に Sidebar を出す。構成は cross scope の filter (organism / datePublished、[§ Sidebar facet](#sidebar-facet))。Tier 1 のみで Tier 3 は出さない (横断で `field-not-available-in-cross-db` になるため)。

Tier 2 fallback: optional field (title / description / datePublished 等) が `null` / `undefined` のとき、該当行を非表示にする (skeleton / placeholder を出さない)。「title なしの hit」 は 1 行で accession だけ表示する。

### per-DB 結果 (`/search/results?q=...&db=<id>`)

`GET /db-portal/search?q=...&db=<id>&page=N&perPage=M&sort=<sort>` を route loader が呼ぶ。

#### Layout (2-col)

cross-DB と同じ 2 ペイン (検索 box + preview は共通ヘッダ、[§ 検索結果 UI](#検索結果-ui))。専用の右ペイン (旧 3-col のクエリプレビュー + AI assistant) は持たない。それらの役割は共通ヘッダの太い box (AI モード) と切替可能 preview が担う。

| 列 | 幅 | 内容 |
|---|---|---|
| Sidebar | `--spacing-sidebar` token | `SidebarHeading` + `AppliedFilters` + scope の filter 構成 (facet / text / range 行) ([§ Sidebar facet](#sidebar-facet)) |
| Main | flex-1 | ResultsToolbar (件数 + sort + perPage + pagination) + ResultRow の区切り線リスト (ヘアライン区切り、カード枠・影なし) + ResultsToolbar (bottom pagination のみ) |

#### Result row

per-DB の 1 ヒットを、全 DB 共通の 4 段スケルトンで描く (カードではなく区切り線リスト)。DB 差は内部分岐 (`result-fields.ts` のマッピング) で表し、DB ごとにコンポーネントを分けない。

1. ID 行: identifier + datePublished + subtype/rank バッジ + controlled-access バッジ
2. title: リンク (なければ identifier)。外部 entry を新規タブで開く
3. excerpt: description を 2 行 clamp (description を持たない DB は出さない)
4. メタ行: 登録機関 (organization[0].name) → organism → DB 固有 chip

表示は「値があれば出す」。identifier 以外はすべて optional 扱いで、空 / null の field は描かない (skeleton / placeholder を出さない)。Tier 1 必須 field (identifier / type) は API 契約で常に非空なので portal 側で空チェックしない。

日付は datePublished → dateModified → dateCreated の順で最初に存在する値を出す (どれも無ければ日付を出さない)。順序は `resolveDate` に集約し、cross-DB の上位 hit と共用する。

detail link は hit の `url` ではなく identifier + 細粒度 `type` から自前生成する (API response 形が変わっても portal 側で URL を保証する):

| DB | URL |
|---|---|
| ES 6 DB | `https://ddbj.nig.ac.jp/search/entry/{type}/{identifier}` (`type` = `sra-analysis` 等の細粒度) |
| trad | `https://getentry.ddbj.nig.ac.jp/getentry?database=ddbj&accession_number={identifier}` |
| taxonomy | `https://ddbj.nig.ac.jp/tx_search/{identifier}?view=info` |

##### DB 別の表示 field

メタ行に出す DB 固有 field の規約 (値があるときだけ)。chip は値の語彙で 2 質感に分ける: controlled / identifier / numeric は mono の chip、submitter 自由記述 (free-form) は淡色の控えめ chip。

| DB | subtype/rank バッジ | organism | excerpt | DB 固有メタ (chip) |
|---|---|---|---|---|
| bioproject | Umbrella のとき | あれば | あり | projectType / relevance |
| biosample | — | あれば (主役) | あり | model / host / strain / isolate / geoLocName |
| sra | entity subtype | sample のみ | run 以外 | experiment: libraryStrategy / librarySource / platform / instrumentModel、analysis: analysisType、sample: geoLocName |
| jga | entity subtype | 出さない | あり (dac は無) | study: studyType、dataset: datasetType |
| gea | — | 出さない | あり | experimentType |
| metabobank | — | 出さない | あり | experimentType / studyType |
| trad | — | あれば | 無し (Solr が null) | molecularType / division / sequenceLength (bp) |
| taxonomy | rank | 出さない | 無し | commonName / japaneseName (title 補助) + lineage |

- organism は jga (常に Homo sapiens で識別力ゼロ) と taxonomy (organism = その taxon 自身) では出さない。
- free-form (experimentType / studyType / datasetType / host / strain / geoLocName 等) は submitter 自由記述で表記揺れが大きいため、見出しにせず控えめ chip に留める。
- controlled-access (実質 JGA のみ) は警告色バッジで示す。`status` / `accessibility` / `isPartOf` / `type` / `publication` / `grant` / `externalLink` / `dbXrefs` / `sameAs` / `distribution` / `properties` はリスト行に出さない (常時同値・冗長・詳細画面向き)。

#### Pagination

`app/ui/pagination.tsx` で `totalPages = Math.ceil(total / perPage)` を計算した offset pagination のみを使う。ES の `max_result_window` (10000 件) を超える page にユーザーが行ったとき、API が error を返す前提で UI は通常の数値 pagination をそのまま描画する。深部 page の cursor 切替 (search_after) は portal 側では実装していない。

### ResultsToolbar

- 左: 件数 (`<total> 件中 <start>-<end>`)
- 中: sort 切替 (`relevance` / `date_desc` / `date_asc`) + perPage 切替 (`20` / `50` / `100`)
- 右: pagination

ResultsToolbar は結果リストの上下に置く。上は件数 + sort + perPage + pagination、下は pagination のみ。

`hardLimitReached === true` のとき件数の横に ⓘ アイコン (`InfoHint`) を出し、hover / click で「上位 10,000 件まで表示しています」を tooltip 表示する (API 仕様、ES / Solr のハードリミット表示)。

### 結果領域の a11y

検索結果の更新は URL 駆動で起きる (search box submit / facet 操作 / pagination / sort)。screen reader user 向けに次を満たす:

- main 結果 wrapper (cross-DB / per-DB 共通) に `role="region"` + `aria-label={t("search.a11y.resultsRegion")}`
- 件数表示 (ResultsToolbar 左の `<total> 件中 <start>-<end>`) に `aria-live="polite"` + `aria-atomic="true"` を付け、loader 完了で件数が announce される
- 「結果なし」 / parse error / cross / db error の Callout には `aria-live="polite"`
- 「同期中」 / 「同期失敗」 を表す SyncStatusChip は視覚バッジのみで、現状 `role` / `aria-live` は付けていない (SR への announce は今後の改善余地。付けるなら chip か wrapper に `role="status"`)

assertive (`role="alert"` / `aria-live="assertive"`) は通常の検索結果更新では使わない (キーストロークごとに発火する debounce sync が SR を邪魔するため)。重大エラーの限定箇所のみ assertive に倒す。

## AI 検索アシスタント

### LLM availability

`/api/llm/health` を `useQuery` で取得し、`status` ごとに `ready` を導く (`app/features/search/assistant/llm-availability.ts`):

- `status === "ok"` → `ready: true`
- `status === "unset"` → `ready: false` (UI を物理的に出さない)
- `status === "unreachable"` → `ready: true` (UI を出して、送信時に SSE error 経路で fail を伝える)

`staleTime` は 5 分 (頻繁に poll しない)。

AI 補助は **top / cross-DB results / per-DB results / `/search`** の検索 box で表示する (`ready` のときだけトグルを出す)。経路で扱いが分かれる:

- **`/search`** (検索ビルダ): `SearchInputPanel`。提案を read-only カードで見せ、ユーザの「適用」で `replaceRoot`。
- **top / results** (`NavigableSearchInput`): 提案カードを出さず、生成された AST を serialize して即 `/search/results` へ遷移する。top は `new` 固定、results は `new` / `append` を選べる。

`/search` では統合入力 (`SearchInputPanel`) が 1 つの検索ボックスを キーワード / AI の両モードで使い回す。検索ボックス内の「検索」ボタンの左に「AI モード」トグル (pill 形・brand 着色で目立たせる) を置き、押すと AI モード (ボックスを brand 着色して明示)、再度押すと キーワードモードへ戻す (プロンプトと未確定の提案は破棄)。AI モードでは送信ボタンは「生成」になり、虫眼鏡アイコンは出さない (検索ではなく生成のため)。`ready === false` のときはトグル自体を出さず、キーワードモードに固定する。AI モードの入力 (自然文プロンプト) はキーワードとは独立した state で、モード切替時に引き継がない。dev server (vitest 以外) では LLM 未設定でも `ready: true` 扱いとし、生成はスタブ提案を返す (UI 確認用、`import.meta.env.DEV && MODE !== "test"` でゲート)。

### 生成モード (cross-search ビルダー)

AI モードには **新規生成 (new)** と **既存に追加 (append)** の 2 モードがあり、**生成 prompt がモードで変わりうるため生成前に選ぶ**。UI は検索ボックス左の scope 選択スロット (キーワードモードでは DB scope = 全データベース等) を AI モードでそのまま流用し、`新規生成 / 既存に追加` を選ばせる。入場時の default はビルダーの件数 (= keyword 行 0/1 + 構造化条件数) で決まる:

| 件数 | default | 既存に追加 |
|---|---|---|
| 1 以上 | append (既存に追加) | 選択可 |
| 0 | new (新規生成) | 一覧に残すが disable (追加先が無い) |

- **append**: 現在のビルダー DSL を `current` として送り、モデルが既存条件を保持したまま融合した完全な DSL を返す。反映は融合済み AST で組み直す (keyword は不変)
- **new**: `current` を送らず、提案だけの新規クエリにする。keyword も初期化する (「新規」 の意味を保つため)
- **例プロンプト chip**: new / append で別 set を出す (new = 一からのクエリを記述する例、append = 既存結果を絞る / 除外する例で NOT の使い方も示す)

提案カード (`ProposalConditions`、`assistant/proposal-conditions.tsx`) は ParseNode AST (フルスペック DSL) を **read-only 版のクエリビルダー** として描く。leaf 節はビルダーと同じ平易な日本語 (`項目` + `述語` + 値、例: 「学名 と一致 Homo sapiens」) で表示し、`fieldLabelKey` / `predicateLabelKey` をビルダーと共有する。生の `field op value` は見せない (allowlist 外 field のみ素の field 名を fallback)。`BoolOp` のネスト・否定 (AND/OR の演算子バッジ、値/範囲 leaf を包む NOT は否定述語に畳み、group / free_text を包む NOT は除外バッジで示す) の描画規則はコードが SSOT。

footer は **「再生成」** (同じプロンプトで再 `start`) + 反映ボタン。反映ボタンは選択中のモードに従う (new → 「この内容で置き換える」、append → 「クエリビルダーに追加」)。`/search` の統合入力と、results / top の切替可能プレビューが同じ `ProposalConditions` を使う (results / top は提案カードとしては出さず、preview のグラフ view としてのみ描く)。

### SSE 配線

`/api/llm/search-assistant` (server 側 endpoint、`llm.md`) に POST、SSE で event を受け取る:

- `event: message` → client では消費しない (delta は server 側で蓄積され `done` の完全な AST に集約される。client は生成途中の表示を持たない)
- `event: done` → data を ParseNode AST として受け取り proposal state に反映、state = "done" (BFF が `/db-portal/parse` で検証済みなので client での lift / 再 parse は不要)
- `event: error` → state = "error"、box 直下に inline エラー文言 (`search.assistant.generateError`) を出す (入力は保持)

`AbortController` で stop 可能 (stop すると state = "idle" に戻る)。SSE のため `response.body.getReader` で chunk を読み、`text/event-stream` フレーム境界 (`\n\n`) ごとに event を抽出する。

### 提案の反映

client は `event: done` で受け取った ParseNode AST をそのまま proposal state の SSOT とする (BFF 検証済み)。生成モードは **生成前** に決まり、融合は **モデル側** が行う:

- **append**: 送信時に現在のビルダー DSL を `current` として BFF に渡す。vLLM は既存条件を保持したまま新しい要求を融合した完全な DSL を返すので、AST には既存条件が内包される
- **new**: `current` を渡さない。vLLM は要求だけの新規 DSL を返す

反映は経路で分かれる:

- **`/search` (ビルダー)**: ユーザーの「適用」操作時に純粋関数 `toAdvanced(ast)` で root を組み直す (`replaceRoot`)。append の AST は既存条件を含むため client 側の graft は不要。**new** は keyword も初期化する。`current` は keyword 行 (free_text) を含まない構造化条件の DSL。
- **results / top**: 提案を見せず、`event: done` の AST を `serializeAstToDsl` で DSL 化して `/search/results` へ `navigate` する。loader が新 `?q=` を再 split して keyword / facet / 保持 state を組み直す。results の `current` (append) は **現クエリ全体** (keyword + facet + 構造化条件 = `data.ast`) で、free_text も含む。top は `new` 固定。

per-DB results の AI アシスタントの「やり直す」 button は textarea を空にして stream を `stop()` する (`state` は `streaming` → `idle`)。表示中の proposal は残るので、ユーザーが入力をやり直して再 generate するまで proposal カードは可視のまま。「再生成」 button は textarea のプロンプトを保ったまま同じ入力で再 `start` する。`/search` の統合入力では「AI モード」トグルの再押下が プロンプトと proposal を破棄して キーワードモードへ戻す役割を兼ねる。

## search 固有の primitive 事情

UI primitive の一覧と仕様は `frontend.md` (SSOT)。search が特別に必要とするものは:

- **Advanced builder の value 入力用** に `app/ui/text-input.tsx` を持つ (date input も `type="date"` の variant として同 primitive で扱う)
- **Sidebar facet** の `AppliedFilters` / `FacetGroup` / `FacetRow` / `DateFacet` を消費 (facet UI のドメインは search だが primitive 自体は `app/ui/` 側)
- **SearchBox** は Top / Search で共有 (`frontend.md` の Chrome カテゴリ)
