# E2E Scenarios

Playwright を staging URL に対して回す。各シナリオはペルソナ / 前提 / 手順 / 期待 を持つ。

## Personas

| ID | 名前 | 認証 |
|---|---|---|
| P-ANON | 未認証ユーザー | なし |
| P-USER | 一般ユーザー (DDBJ Account login) | Keycloak JWT |

## Domains

| Domain | 接頭辞 | 説明 |
|---|---|---|
| TOP | `S-TOP` / `E-TOP` | トップページ |
| SEARCH | `S-SEARCH` / `E-SEARCH` | 検索ビルダ / 結果 |
| SUBMIT | `S-SUBMIT` / `E-SUBMIT` | 登録ナビ |
| NEWS | `S-NEWS` / `E-NEWS` | ニュース一覧 |
| SERVICES | `S-SERVICES` / `E-SERVICES` | サービス一覧 |
| AUTH | `S-AUTH` / `E-AUTH` | サインイン / サインアウト |
| LLM | `S-LLM` / `E-LLM` | AI アシスタント |
| CONTENT | `S-CONTENT` / `E-CONTENT` | データベース解説 |
| FLOW | `S-FLOW` / `E-FLOW` | 機能横断シナリオ |

## Search Domain

### S-SEARCH-01: トップ → /search → 検索実行

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済
- **手順**:
  1. `/` を開く
  2. ヘッダーの「検索」 ナビ link をクリック → `/search` へ遷移
  3. `role="search"` の検索ボックス内 `aria-label="検索キーワード"` の input に `cancer` を入力し、Enter (または submit button `検索`) で送信
- **期待**:
  - URL が `/search/results?q=cancer` に変わる (`buildResultsHref` の param 順は `q` → `db` → `page` → `perPage` → `sort`、default 値は省略)
  - `<html>` の `lang` が `ja`、`/search/results` route の `handle.titleSegments` 由来でタブタイトルに `Search` / `Results` が含まれる
- **備考**: `/search` の box submit は `runSearch` を経由し、keyword を parse → serialize → `navigate(push)` する。空入力での submit は `db` のみの `/search/results` に飛ぶ。

### S-SEARCH-02: cross-DB 結果のヒット数カードが 8 枚固定で描画

- **ペルソナ**: P-ANON
- **前提**: ddbj-search-api staging 到達可能
- **手順**:
  1. `/search/results?q=cancer` を直接開く
  2. `await page.waitForLoadState("networkidle")`
- **期待**:
  - `data-testid="db-card"` の `<article>` が **ちょうど 8 枚** 描画される (0 件 DB も skip しない、`cross-results.tsx` の `CARD_ORDER` 順 = `trad` / `bioproject` / `biosample` / `sra` / `jga` / `taxonomy` / `gea` / `metabobank`)
  - 各カードの `data-db` 属性が上記 8 slug を 1 つずつ持つ (重複なし)
  - 各カード見出し (`<h3>`) が `search.scope.<db>` ラベル (`DDBJ` / `BioProject` / …)
  - 各カードに `結果一覧` の `TextLink` が 1 つある
- **備考**: count 数値や上位 hit の中身検証は S-SEARCH-10 に分離。

### S-SEARCH-03: cross → per-DB 遷移と sidebar / 2 ペイン構造

- **ペルソナ**: P-ANON
- **前提**: `/search/results?q=cancer` を開いた状態
- **手順**:
  1. `data-db="bioproject"` カード内の `結果一覧` link をクリック
- **期待**:
  - URL が `/search/results?q=cancer&db=bioproject` に変わる
  - 左 sidebar (`<aside>`) に `search.facets.heading`(「絞り込み」)の `SidebarHeading` と、bioproject scope の filter 行 (`data-testid="facet-organism"` / `facet-objectType` / `text-organization` の facet/text 行と、Date First Published / Date Last Published / Date Submitted の date 行 — date 行は `DateFacet` で `data-testid` を持たないためラベルで参照。`range-*` testid は numberRange を持つ trad scope 専用で bioproject には無い) が描画される
  - main 結果領域に `role="region"` + `aria-label="検索結果"` (`search.a11y.resultsRegion`) の wrapper があり、`PerDbResults` の区切り線リストが入る
  - 上部に `NavigableSearchInput` の太い検索ボックス、その下に `SwitchableQueryPreview` (`search.preview.label`「クエリプレビュー」) が出る
  - **AI 検索アシスタント専用の右ペイン (region) は存在しない**。AI は検索ボックス内の「AI モード」 toggle に集約される (S-SEARCH-11 / E-SEARCH-03 参照)
- **備考**: 旧版が assert していた「右 pane に AI 検索アシスタント region」 は現行 UI に存在しないため削除。AI は box 内 toggle へ realign。

### S-SEARCH-04: Advanced builder → `?q=` 更新と検索実行 (Organism (TaxID) + Organism name の 2 条件)

- **ペルソナ**: P-ANON
- **前提**: `/search` を開く
- **手順**:
  1. 「+ 条件を追加」 (`search.builder.addCondition`) で条件行を 1 つ追加し、field セレクタ (`search.a11y.fieldSelector`「検索フィールド」) で `Organism (TaxID)` (`organism_id`、`search.facets.field.organism`)、述語セレクタ (`search.a11y.predicateSelector`「条件の演算子」) で `と一致` (`search.builder.predicate.eq`、identifier kind の default op)、値の Combobox (`search.builder.valuePlaceholder`「値を入力」) に taxID `9606` を入力 (organism facet の `Homo sapiens (9606)` 候補を選んでも可、いずれも taxID `9606` を commit する)
  2. もう一度「+ 条件を追加」 で 2 行目を追加し、field=`Organism name` (`organism_name`、`search.facets.field.organismName`)、述語=`を含む` (`search.builder.predicate.contains`、text kind)、値の TextInput (`値を入力`) に `Homo sapiens` を入力
  3. ライブプレビュー (`QueryPreview`) に DSL が反映されるのを待つ (debounce 700 ms)
  4. ページ下部の `この条件で検索` (`search.actions.submit`) button をクリック
- **期待**:
  - 入力確定後、debounce 700 ms 以内に `/db-portal/serialize` が呼ばれ、`QueryPreview` の `<code>` (`aria-label="クエリプレビュー"`) の DSL に `organism_id:9606` (identifier 行は taxID を emit) と `organism_name:`（text 行は学名文字列を emit) の双方が含まれる
  - `この条件で検索` クリックで `/search/results?q=...` に `navigate(push)` され、`?q=` の DSL に `organism_id` 条件と `organism_name` 条件が両方乗る
  - serialize / parse は scope (`db`) を渡して呼ばれる (cross では `db` 省略)
- **備考**: identifier field (Organism (TaxID), `organism_id`, 述語 `と一致`) は値を facet aggregation backed の Combobox で受け taxID を commit、text field (Organism name, `organism_name`, 述語 `を含む`) は値を素の TextInput で受け文字列を emit する。両 field kind を 1 シナリオで往復させ、value 入力 affordance (combobox vs text) と emit される DSL field (`organism_id:` vs `organism_name:`) の差を同時に固定する。Combobox は editable なので候補が無くても taxID 直接入力で commit できる。DSL 文字列の正確な形は serialize API (ddbj-search-api 側) が SSOT。

### S-SEARCH-05: Sidebar facet トグル → `?q=` 即時更新 (replace)

- **ペルソナ**: P-ANON
- **前提**: `/search/results?q=cancer&db=bioproject` を開き、`networkidle` まで待つ
- **手順**:
  1. `data-testid="facet-organism"` 内の bucket checkbox (`role="checkbox"`、いずれかの学名ラベル) を 1 つ check する
- **期待**:
  - URL の `?q=` が更新され、`q` に `cancer` と `organism_id:<taxID>` の双方が含まれる (facet トグルは `sync.flush()` で即時 serialize される)
  - `db=bioproject` は保持され、`page` は default の 1 に戻る (`buildResultsHref` が `page: DEFAULT_PAGE` を渡す)
  - facet トグルの navigation は `{ replace: true }` なので、ブラウザ戻るで 1 つ前 (facet 未選択) には戻らず、`cancer` 検索前まで戻る
- **備考**: facet 集計は `facetSelfExclude=true` で取得されるため、organism を 1 つ選んでも他候補が候補一覧に残る。

### S-SEARCH-06: URL `?q=` からのキーワードボックス復元

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/search/results?q=organism_id%3A9606%20AND%20date_published%3A%5B2022-01-01%20TO%202024-12-31%5D&db=bioproject` を直接開く
- **期待**:
  - loader が `db=bioproject` scope を渡して `/db-portal/parse` し AST 化、route が `splitFreeText` / `splitForSidebar` / `toAdvanced` の 3 面に分解する
  - `SwitchableQueryPreview` の DSL view の `<code>` (`aria-label="クエリプレビュー"`) に復元された DSL が表示される
  - main の `role="region"`「検索結果」 内に per-DB record list が描画される (parse error Callout は出ない)
- **備考**: free_text (キーワード) の box への復元は本シナリオ、sidebar facet / date 行の選択状態復元は S-SEARCH-09 に分離。

### S-SEARCH-07: per-DB の pagination / perPage / sort が実 `/db-portal/search` 契約を通る

- **ペルソナ**: P-ANON
- **前提**: `/search/results?q=cancer&db=bioproject` を開き、`networkidle` まで待つ。`PerDbResults` の件数表示 (`aria-live="polite"` / `aria-atomic="true"` の `<p>`、明示 `role` 属性は持たないので aria-live か可視テキストで参照) が `N 件中 1-20` 形式で出ていること
- **手順**:
  1. ResultsToolbar の `1 ページあたり` (`search.results.perPage.label`) の `Select` で `50` を選ぶ
  2. 件数表示が再計算されるのを待つ
  3. `並び替え` (`search.results.sort.label`) の `Select` で `新しい順` (`date_desc`) を選ぶ
  4. pagination の「次へ」 でページ 2 に進む
- **期待**:
  - perPage 変更後 URL に `perPage=50` が乗り (default 20 のときは省略される)、件数表示の range が `1-50` 相当に再計算される (`rangeSummary` = `{{total}} 件中 {{start}}-{{end}}`)。page は 1 にリセット
  - sort 変更後 URL に `sort=date_desc` が乗る (default `relevance` のときは省略)、page は 1 にリセット
  - 次へクリックで URL に `page=2` が乗り、件数表示の `start` が `51`(perPage=50 時) になる
  - これらの遷移は `{ replace: false }` (`handlePageChange` 系は replace を付けない) なので戻るで前ページに戻れる
- **備考**: `page` / `perPage` / `sort` は loader → `dbSearch` → API へ素通しされる。API が param 名や sort enum を別名で期待し始めた等の契約破綻は統合経路でのみ検出できる。

### S-SEARCH-08: クエリビルダーで編集: results → `/search?q=&db=` の db scope parse 往復

- **ペルソナ**: P-ANON
- **前提**: per-DB の Tier 3 field を含む DSL を直接開く。`/search/results?q=object_type%3A%22BioProject%22%20AND%20cancer&db=bioproject` を開き `networkidle` まで待つ (parse error Callout が出ず結果が描画されること)
- **手順**:
  1. `SwitchableQueryPreview` の `クエリビルダーで編集` (`search.preview.edit`) button をクリック
- **期待**:
  - URL が `/search?q=...&db=bioproject` に遷移する (`buildSearchHref` は `q` → `db` の順)
  - `/search` loader が `db=bioproject` scope を渡して parse するため、Tier 3 field (`object_type`) を含んでいても parse は成功し、`AdvancedBuilder` に条件が復元される
  - `search.errors.querySyntax`(「クエリを解析できませんでした。構文を確認してください。」) の warn Callout が **出ない**
  - keyword 行に `cancer` が復元される (`splitFreeText`)
- **備考**: db を渡さず cross で parse すると Tier 3 field が `field-not-available-in-cross-db` で 400 になる。loader が scope を渡していることをこの往復が固定する。

### S-SEARCH-09: URL 復元で sidebar facet / date レンジが選択済みで描かれ per-DB list が出る

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/search/results?q=organism_id%3A9606%20AND%20date_published%3A%5B2022-01-01%20TO%202024-12-31%5D&db=bioproject` を直接開き `networkidle` まで待つ
- **期待**:
  - `splitForSidebar` が `organism_id` leaf を facet 行に、`date_published` between を date 行に抜き取る
  - `data-testid="facet-organism"` 内で taxID `9606` に対応する bucket checkbox が `checked` (bucket に無い場合も Taxonomy ID text box (`aria-label="Taxonomy ID"`) に `9606` が表示される)
  - Date First Published (`search.facets.field.datePublished`) の date 行が `custom` レンジで `2022-01-01` / `2024-12-31` を FROM/TO に表示する (`DateFacet` に `appliedCount=1` が渡り `FacetGroup` ヘッダーに `解除` button が出る)。date レンジは `FacetPanel` の `applied[]` (facet/text/numberRange のみ) に含まれないため `AppliedFilters` には chip が出ない
  - main の `role="region"`「検索結果」 内に per-DB record list が描画される
- **備考**: URL は絶対 between しか持たないため、プリセット (1y/5y/10y) と一致しなければ `custom` 扱いで復元される。S-SEARCH-06 がキーワード box 復元のみだったのを sidebar 面へ拡張。

### S-SEARCH-10: cross-DB カードの count 数値と上位 hit が実 API データで描画される

- **ペルソナ**: P-ANON
- **前提**: ddbj-search-api staging 到達可能
- **手順**:
  1. `/search/results?q=cancer` を開き `networkidle` まで待つ
- **期待**:
  - 少なくとも 1 枚の `data-testid="db-card"` で、`aria-label="ヒット件数"` (`search.results.cross.countAria`) の要素が数値テキスト (`toLocaleString("en-US")` 形式、`?` でない) を持つ
  - その count を持つカードのいずれかで、上位ヒット (`search.results.cross.topHits`「上位ヒット」セクション) に最低 1 件の hit があり、`target="_blank"` + `rel="noopener noreferrer"` の外部 link (accession identifier または title) が `entryHref(hit)` で生成された URL を href に持つ (ES 6 DB は `https://ddbj.nig.ac.jp/search/entry/...`、trad は `getentry.ddbj.nig.ac.jp`、taxonomy は `ddbj.nig.ac.jp/tx_search/...`)
  - hit が 0 件のカードは `search.results.cross.noTopHits`(「上位ヒットはありません」) を表示する (count は引き続き数値)
- **備考**: count / hits の response 形が変わると黙って `?` / 空になるため、数値と外部 link の実在を統合経路で固定する。`error` フィールドが立ったカードは count を出さず一時障害メッセージになる (E-SEARCH-02 と同経路の部分失敗)。

### S-SEARCH-11: per-DB results の AI append 生成が現クエリを保持して navigate する

- **ペルソナ**: P-USER
- **前提**: `page.route` で `/api/llm/health`=ok と `/api/llm/search-assistant` の SSE (`event: done`、organism_name leaf) を mock 固定し、`/search/results?q=cancer&db=bioproject` を開く
- **手順**:
  1. 検索ボックス内 (`role="search"`) の `AI モード` (`search.assistant.enterMode`) toggle button (`aria-pressed="false"`) をクリック → `aria-pressed="true"` になり box が AI tone に変わる
  2. AI モードの scope セレクタ (`search.assistant.modeGroupLabel`「生成モード」) で `既存に追加` (`search.assistant.modeAppend`) が選択可能であること (append は `appendCurrentAst = data.ast` が non-identity のとき有効)
  3. `aria-label="AI 検索アシスタントへの入力"` の input に `2023 年以降に公開されたものに限定する` と入力し、Enter で送信 (NavigableSearchInput の AI モード送信ボタンは `search.a11y.submit`「検索」、生成中のみ「生成中…」)
  4. `page.waitForResponse((r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200)` で SSE 完了を待つ
- **期待**:
  - `event: done` 後、生成された AST を `serializeAstToDsl` (scope=`bioproject`) で DSL 化し `/search/results` へ `navigate(push)` する
  - 遷移後の `?q=` に元の `cancer` (free_text) が **残ったまま**、新条件 (`date_published` 等) が AND 追加されている (append は server 側で `current = data.ast` に融合される)
  - `db=bioproject` は保持される
- **備考**: vLLM の生成揺れ/timeout を除くため SSE を mock 固定する (health-gate skip なし)。append 融合 → serialize (実 `/db-portal/serialize`) → navigate は実物を通す。`/search` (replaceRoot 経路) の生成は別コードパスで、results の append→serialize→loader 再 split を踏むのは本シナリオのみ。

### E-SEARCH-01: 不正 DSL の URL で parse 失敗 Callout

- **ペルソナ**: P-ANON
- **前提**: なし (server / API は通常運転)
- **手順**:
  1. `/search/results?q=organism%3A%5B%5B` (`organism:[[` の URL 化、invalid) を直接開く
- **期待**:
  - loader が `/db-portal/parse` の 400 を catch し `errorKey: "parse"` を data で返す (throw / ErrorBoundary 経路は通らない)
  - `tone="warn"` + `role="status"` の `Callout` に `search.errors.parseFailure`(「URL のクエリを解析できませんでした」) が表示される
  - Callout 右端に `search.sync.retry`(「再試行」) button があり、クリックで `navigate(0)` (再 loader) する
- **備考**: 再現方法 = URL を直接組み立てて navigation (`notes.md §7`)。旧版の「ErrorBoundary か Callout」「クエリビルダーで編集 link で戻る」 は実装と不一致 (現行は warn Callout + 再試行のみ) のため realign。

### E-SEARCH-02: cross-search 5xx で横断検索失敗 Callout

- **ペルソナ**: P-ANON
- **カバレッジ**: e2e 対象外。cross-search は SSR route loader が upstream を server-side fetch するため、browser の `page.route()` では upstream 5xx を注入できず、失敗経路を e2e で再現できない。loader の error 分岐は unit/msw で固定する。
- **担保**: `tests/unit/routes/search-results.loader.test.ts` の `crossSearch_networkError_returnsCrossErrorKey` が、`/db-portal/cross-search` 500 → loader が `params.db === null` 経路で catch し `errorKey: "cross"` を返すことを assert。UI 側の warn `Callout` + 再試行 button の描画は E-SEARCH-01 (parse 失敗 Callout) と共通経路。
- **備考**: cross = `crossSearchFailure` / db = `dbSearchFailure` の文言出し分けは E-SEARCH-04 と対で固定。

### E-SEARCH-03: LLM unset で AI モード toggle が非表示

- **ペルソナ**: P-ANON
- **前提**: `page.route()` で `/api/llm/health` を `{ status: "unset" }` に差し替える (`notes.md §7`、staging で再現できないため intercept)
- **手順**:
  1. `/search` を開く
  2. `/search/results?q=cancer&db=bioproject` を開く
- **期待**:
  - 両画面とも、検索ボックス内に `AI モード` (`search.assistant.enterMode`) toggle button (`aria-pressed` を持つ button) が **0 件** (`useLlmAvailability` が `ready: false` を返し `aiToggle` が `undefined` になる)
  - キーワードモードの検索ボックス (`aria-label="検索キーワード"` input) は通常通り使え、エラーバナーや placeholder は出ない
- **備考**: 旧版の「AI 検索アシスタント セクションが DOM に描画されない (`null` return)」 は、現行は独立 region ではなく box 内 toggle の非表示 (`aiToggle === undefined`) に realign。`unreachable` のときは toggle を出し、送信時に SSE error で fail を伝える (`ready: true`)。

### E-SEARCH-04: per-DB search 5xx で errorKey:db の Callout (cross とは別文言)

- **ペルソナ**: P-ANON
- **カバレッジ**: e2e 対象外。per-DB search も SSR route loader が server-side fetch するため、`page.route()` で 5xx を注入できない (E-SEARCH-02 と同じ理由)。
- **担保**: `tests/unit/routes/search-results.loader.test.ts` の `dbSearch_networkError_returnsDbErrorKey` が、`/db-portal/search` 500 → loader が `params.db !== null` 経路で `errorKey: "db"` を返すことを assert。
- **備考**: cross (E-SEARCH-02) と db を対で固定することで、loader の三項分岐 `params.db === null ? "cross" : "db"` の逆転 / 文言入れ替わり (`crossSearchFailure` ⇄ `dbSearchFailure`) regression を unit 層で検出する。

## Submit Domain

登録ナビは前段 2 問 (Q1 登録種別 / Q2 生物ドメイン) のカスケードでファイル種別ボタンを enable し、追加した行から登録フロー (FlowOverview + FlowStepCards) を導出する。Q1 は初期値 `public`、Q2 は初期値 `null`。`allowedRepos = Q1.repos ∩ Q2.repos` が空 (Q2 未選択時) の間は全ファイル種別ボタンが disabled。行詳細は live-commit (保存ボタン無し)、行削除は確認ダイアログ無しで即時。

主要 selector:

| 要素 | selector |
|---|---|
| Q1 radiogroup | `role="radiogroup"` aria-label `登録種別` |
| Q2 radiogroup | `role="radiogroup"` aria-label `生物ドメイン` |
| ファイル種別ボタン | `role="button"` aria-label `{label} ({EXT})` (例 `配列リード (FASTQ)`) |
| テーブル行 | `[data-testid="file-row"][data-entry-id]` |
| 公開区分 select | `role="combobox"` aria-label `公開区分` (行内) |
| 行削除 | `role="button"` aria-label `行を削除` |
| 詳細項目 | `[data-testid="detail-item"][data-entry-id]` |
| フロー俯瞰 | `[data-testid="flow-overview"]` 内 `role="button"` aria-label `登録ステップに移動: {service}` |
| フローカード | `[data-testid="flow-step"][data-service]` |
| 外部誘導 CTA | カード内 `role="button"` name `登録サイトを開く` |
| 確認事項バナー | `submit.validations.heading` 見出しの領域 |

### S-SUBMIT-01: /submit 初期表示 (Q2 未選択で全ボタン disabled)

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済
- **手順**:
  1. `/submit` を開く
- **期待**:
  - ヘッダー nav `登録` が active (`aria-current="page"`)
  - PageTitle `登録ナビゲーション` が `<h1>` として描画される
  - Q1 radiogroup (`登録種別`) で `公開データの登録` が選択済 (初期値 `public`)、Q2 radiogroup (`生物ドメイン`) はいずれも未選択
  - ファイル種別ボタンが 11 個描画され (`配列リード (FASTQ)` `FASTA 塩基配列 (FASTA)` `配列アノテーション (GFF)` `バリアント (VCF)` `発現マトリクス (TSV)` `マイクロアレイ発現 (CEL)` `空間トランスクリプトーム (TSV)` `空間画像 (TIFF)` `質量分析 (mzML)` `NMR (nmrML)` `代謝物アサインメント (TSV)`)、**全て disabled** (`disabled` 属性あり)
  - 空テーブルに `上のボタンからファイル種別を追加してください` が表示される
  - 登録フロー section に `ファイルを追加すると、ここに登録フローが表示されます` が表示される (`[data-testid="flow-step"]` は 0 件、`[data-testid="flow-overview"]` は描画されない)
  - 確認事項バナー (`確認事項が N 件あります`) は描画されない

### S-SUBMIT-02: Q2 選択後の配列リードで BioProject/BioSample/DRA が組まれる

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示 (Q1=`公開データの登録`)
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択
  2. enable された `配列リード (FASTQ)` ボタンをクリック
- **期待**:
  - `[data-testid="file-row"]` が 1 件追加され、ファイル名セルに自動採番 `read-001.fastq` (read-only、`font-mono`)、公開区分セルに `公開` (Q1=public の default) が表示される
  - 登録フローに `[data-testid="flow-step"]` が 3 件、`data-service` が依存順で `bioproject` → `biosample` → `dra` の順に並ぶ
  - `bioproject` / `biosample` カードの role tag は `随伴`、`dra` カードの role tag は `登録先`
  - `dra` カードに DDBJ source tag と `登録サイトを開く` ボタンがあり、クリックで `target=_blank` の新規ウィンドウ (`window.open`) が開く (新規 page イベントを観測)
  - `[data-testid="flow-overview"]` に 3 ステーションが描画される

### S-SUBMIT-03: 同一 Q1/Q2 下の混在行で複数 destination が並ぶ

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択
  2. `配列リード (FASTQ)` を 2 回、`バリアント (VCF)` を 1 回、`発現マトリクス (TSV)` を 1 回クリック (計 4 行)
- **期待**:
  - `[data-testid="file-row"]` が 4 件、ファイル名は `read-001.fastq` / `read-002.fastq` / `var-001.vcf` / `mtx-001.tsv`
  - 登録フローに `bioproject` 1 件 + `biosample` 1 件 (organism 別に分裂しない、各 1 件のみ) が随伴し、destination として `dra` (配列リード) / `eva` (非ヒト variant) / `gea` (発現マトリクス) のカードが描画される
  - `[data-testid="flow-step"]` の `bioproject` / `biosample` がそれぞれ 1 件だけであることを確認 (`Umbrella BioProject` のような集約カードは存在しない)
  - 入力状況 (TagProgress) は全行を母数 (`total`) にカウントし、詳細質問を持たない種別 (配列リード・バリアント・発現マトリクス) は設定するものが無いため自動的に configured 扱いになる (`{configured} / {total}` 表示)。この構成では `total=4` / `configured=4` で `4 / 4` と表示される
  - `データ詳細` section (`submit.detail.heading` SectionHeading + TagProgress + DataDetailPanel) は `total > 0` のため表示される。ただし詳細質問を持つ行が無いので DataDetailPanel は `[data-testid="detail-item"]` を 1 件も描画せず、`追加の詳細設定が必要なファイルはありません` (`submit.detail.empty`) の info callout のみを表示する

### S-SUBMIT-04: open / restricted の分岐 (Q1/Q2 と行 access)

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト` を選択 (Q1 は `公開データの登録` のまま)
  2. `配列リード (FASTQ)` を 2 回クリック (2 行追加、access default は `公開`)
  3. 1 件目の行の公開区分 combobox (`公開区分`) を `制限公開` に変更、2 件目は `公開` のまま
- **期待**:
  - 1 件目 (制限公開 ∧ Q2=ヒト) は JGA scope に入り `data-service="jga"` カードが、2 件目 (公開) は `data-service="dra"` カードが両方描画される
  - 制限公開ヒトの Policy 申請・承認は `data-service="humandbs"` カードの note (`submit.jga.policyApplication` / `submit.jga.nbdcPolicy` 由来、独自ポリシーは DBCLS 登録で JGAP を発行する旨) に表示される (jga-submission recipe が JGA ルーティング時に humandbs ステップを生成し、Policy 文言はそこへ集約する。jga カード自体は `submit.jga.dataset.intro` のみ)
  - 同一 entry が JGA と DRA の両方の scope に出ないこと (1 件目は jga カードの対象ファイルにのみ、2 件目は dra カードの対象ファイルにのみ現れる)
- **備考**: Q1=`公開データの登録` でも行 access を `制限公開` にできるが、JGA 分岐の起点は `access=restricted ∧ Q2=human`。S-SUBMIT-09 は同じ JGA 経路を Q1=`制限公開データを含む登録` 起点で前提ゲートまで含めて検証する。

### S-SUBMIT-05: live-commit 詳細パネルで配列ペアを設定する

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択
  2. `FASTA 塩基配列 (FASTA)` を 1 回、`配列アノテーション (GFF)` を 1 回クリック (`seq-001.fasta` / `ann-001.gff` の 2 行)
  3. データ詳細 section の `配列アノテーション` の `[data-testid="detail-item"]` 内で、`配列ペア` ラジオを選択 (live-commit、保存ボタンは無い)
  4. 出現した `ペアにする配列` Select で `seq-001.fasta` を選択
- **期待**:
  - 詳細パネルは常時展開で、保存ボタンや modal dialog は存在しない (radio change が即時に state へ反映)
  - `配列ペア` 選択直後、`ペアにする配列` Select が `warn` 状態で出現し、placeholder `配列を選択` を持つ
  - FASTA を相方に選ぶと、annotation の詳細項目が `設定済み` (success tone) になり、FASTA 行は相方として annotation 側で管理されるため `[data-testid="detail-item"]` から消える
  - `配列アノテーション` を `単独アノテーション` に戻すと、ペアが解消され FASTA 行が再び単独 (`single` group) として `[data-testid="detail-item"]` に復帰する

### S-SUBMIT-06: 行削除でフローカードが減る (確認ダイアログ無し)

- **ペルソナ**: P-ANON
- **前提**: Q2=`ヒト以外の真核生物` で `配列リード (FASTQ)` 1 件 + `発現マトリクス (TSV)` 1 件を追加済
- **手順**:
  1. テーブル最後の行 (`mtx-001.tsv`) の `行を削除` ボタンをクリック
- **期待**:
  - 確認 dialog (`role="dialog"`) は一切出現しない (即時削除)
  - `[data-testid="file-row"]` が 2 → 1 件に減る
  - 登録フローから `data-service="gea"` カードが消え、残るのは配列リード由来の `bioproject` / `biosample` / `dra`
  - 空グループはドロップされ、dangling-group-id の確認事項は出ない

### S-SUBMIT-07: カスケードの enable/disable 遷移

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示 (Q1=`公開データの登録`、Q2 未選択)
- **手順**:
  1. Q2 未選択の状態で `配列リード (FASTQ)` ボタンの `disabled` を確認し、disabled tip (`title`) が `登録種別を選択してください` であることを確認
  2. Q2 radiogroup で `ヒト以外の真核生物` を選択
  3. Q1 radiogroup を `制限公開データを含む登録` に変更
- **期待**:
  - 手順 1 時点で 11 ボタンすべて disabled
  - 手順 2 後、`配列リード (FASTQ)` `バリアント (VCF)` `発現マトリクス (TSV)` 等が enabled になる (Q1=public ∩ Q2=eukaryote の allowedRepos に candidateRepos が交わる種別)
  - 手順 3 後 (Q1=restricted、repos={jga})、Q2 radiogroup の `ヒト以外の真核生物` `原核生物` `ファージ・ウイルス` `環境サンプル` が disabled になり (tip = `選択した登録種別では、この生物ドメインは登録先を持ちません`)、JGA を持つ `ヒト` のみ enable のまま残る。Q2=`ヒト以外の真核生物` は無効化されたため自動的に未選択へ戻り、全ファイル種別ボタンが再び disabled になる (tip = `登録種別を選択してください`)

### S-SUBMIT-08: 質量分析の proteomics → jPOST / metabolomics → MetaboBank の外部分岐

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択
  2. `質量分析 (mzML)` を 1 回クリック (`ms-001.mzML`)
  3. データ詳細 section の `質量分析` 詳細項目で `プロテオミクス` を選択 (live-commit)
  4. 同詳細項目で `メタボロミクス` に切り替える
- **期待**:
  - 手順 3 後、`data-service="jpost"` カードが destination として描画され、role tag `外部登録先`、note 文 `submit.jpost.proteomics` 由来 (プロテオミクスは jPOST に登録する旨) が出る
  - 手順 4 後、jpost カードが消え `data-service="metabobank"` カードに切り替わる
  - いずれの構成でも `bioproject` / `biosample` の随伴カードが各 1 件描画される

### S-SUBMIT-09: 制限公開ヒトで JGA + humandbs 前提ゲート、随伴抑制

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q1 radiogroup で `制限公開データを含む登録` を選択
  2. Q2 radiogroup で `ヒト` を選択 (他の Q2 は disabled、`ヒト` のみ選択可)
  3. enable された `配列リード (FASTQ)` をクリック (`read-001.fastq`、access default は Q1=restricted により `制限公開`)
- **期待**:
  - 追加行の公開区分セルが `制限公開` (Q1=restricted の default 注入)
  - 登録フローに `data-service="humandbs"` カード (role tag `申請窓口`、note に NBDC ヒトデータベースでの Policy 申請・承認の旨) と `data-service="jga"` カード (role tag `登録先`) が描画され、依存順で humandbs が jga より前に並ぶ
  - `data-service="bioproject"` / `data-service="biosample"` カードが描画されない (jga-submission recipe が既定 companion を抑制)

### S-SUBMIT-10: 複数行追加後の即時削除でカードが連動する

- **ペルソナ**: P-ANON
- **前提**: Q2=`ヒト以外の真核生物` で `配列リード (FASTQ)` を 2 件追加済 (`read-001.fastq` / `read-002.fastq`)
- **手順**:
  1. 2 件目の行 (`read-002.fastq`) の `行を削除` ボタンをクリック
- **期待**:
  - `role="dialog"` は出現せず即時に行が削除される
  - `[data-testid="file-row"]` が 2 → 1 件
  - 残った 1 行から `bioproject` / `biosample` / `dra` カードが引き続き描画され、各カードの対象ファイルブロックに `read-001.fastq` のみが現れる (`read-002.fastq` は消える)

### S-SUBMIT-11: 配列ペアの相方変更と解消のライフサイクル

- **ペルソナ**: P-ANON
- **前提**: Q2=`ヒト以外の真核生物`、`FASTA 塩基配列 (FASTA)` 2 件 (`seq-001.fasta` / `seq-002.fasta`) と `配列アノテーション (GFF)` 1 件を追加済
- **手順**:
  1. `配列アノテーション` 詳細項目で `配列ペア` を選択
  2. `ペアにする配列` Select で `seq-001.fasta` を選択
  3. 同 Select で `seq-002.fasta` に変更
  4. `配列アノテーション` 詳細項目を `単独アノテーション` に戻す
- **期待**:
  - 手順 2 後、`seq-001.fasta` が相方になり詳細パネルから消え、annotation は `設定済み`
  - 手順 3 後、`seq-002.fasta` が新しい相方になり、`seq-001.fasta` は単独 group に戻って `[data-testid="detail-item"]` に再出現する
  - 手順 4 後、ペアが完全に解消され `seq-001.fasta` / `seq-002.fasta` がともに単独 group として詳細パネルに並び、annotation 行が `配列ペア` の相方を持たない状態 (Select は warn) に戻る
- **備考**: `ペアにする配列` の候補は live state の `single` group の FASTA 行から動的に構成されるため、相方の付け替え・解消は描画上の候補リストとも整合する。

### S-SUBMIT-12: Q1 変更で既存行が前提矛盾になり確認事項に出る

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト` を選択 (Q1 は `公開データの登録`)
  2. `発現マトリクス (TSV)` をクリック (`mtx-001.tsv`、destination は `gea`)
  3. Q1 radiogroup を `制限公開データを含む登録` に変更
- **期待**:
  - Q1=restricted (repos={jga}) では Q2=`ヒト` は引き続き enable のまま (human が jga を含むため自動クリアされない)
  - 既存の発現マトリクス行は削除されずテーブルに残る (`[data-testid="file-row"]` 1 件)
  - `allowedRepos = {jga}` に対し発現マトリクスの candidateRepos=`[gea]` が交わらないため、`発現マトリクス (TSV)` ボタンが disabled になる (tip = `選択した登録種別と生物ドメインの組み合わせでは、登録先がありません`)
  - 確認事項バナー (`確認事項が N 件あります`) に `登録前提と矛盾する種別の行があります` (precondition-conflict) が表示される

### S-SUBMIT-13: FlowOverview のステーションクリックで該当カードへスクロール

- **ペルソナ**: P-ANON
- **前提**: Q2=`ヒト以外の真核生物` で `配列リード (FASTQ)` を 1 件追加済 (`bioproject` / `biosample` / `dra` の 3 ステーション)
- **手順**:
  1. `[data-testid="flow-overview"]` 内の `dra` ステーション (`role="button"` aria-label `登録ステップに移動: DRA`) をクリック
- **期待**:
  - `data-service="dra"` の `[data-testid="flow-step"]` カードが viewport 内にスクロールイン (`scrollIntoView`、`expect(card).toBeInViewport()`)
- **備考**: スクロール挙動は DOM 上の実描画でしか検証できないため e2e 専用。staging で常時再現可能。

### E-SUBMIT-01: 未設定の詳細行が notify Tag と warning tone で示される

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択
  2. `空間トランスクリプトーム (TSV)` をクリック (`spt-001.tsv`、platform 未選択)
- **期待**:
  - テーブル行のファイル名脇に `未設定` の warning Tag が表示される (platform を選ぶまで)
  - データ詳細パネルの該当 `[data-testid="detail-item"]` が warning tone (`未設定`)
  - 確認事項バナー (`確認事項が N 件あります`) は描画されない。spatial-transcriptomics は platform 未選択でも常時 GEA にルーティングされ、`selectValidations` の 3 種別 (precondition-conflict / no-destination-service / dangling-group-id) のいずれにも該当しないため `validations` が空になる
- **備考**: ファイル名は自動採番された read-only 表示で、行内に生物 selector やファイル名入力欄は存在しない (warn 配色の input という旧 UI は無い)。未設定 detail の検出は行レベルの notify (warning Tag) と detail-item の warning tone のみで、未設定 detail を確認事項バナーに集約する validation 種別は存在しない。

### E-SUBMIT-03: 100 行追加でも UI が応答する

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択 (`配列リード (FASTQ)` ボタンが enabled になる)
  2. `配列リード (FASTQ)` ボタンを 100 回連続クリック
- **期待**:
  - `[data-testid="file-row"]` が 100 件描画される (`toHaveCount(100)`、virtualization 無しの素の DOM、横スクロール許容)
  - 100 行に対し `bioproject` / `biosample` / `dra` のカードが描画され、`dra` カードの対象ファイルブロックが 100 ファイルを保持する
  - 操作後もページが操作可能 (例: 最後に追加した行の `行を削除` ボタンが反応し、行数が 99 に減る)
- **備考**: リリース時点で性能チューニングはしないため fps の数値目標は置かず、`toHaveCount` の timeout 内描画とクリック反応で応答性を確認する。

### E-SUBMIT-04: spatial-transcriptomics の platform 未確定で no-destination 相当を確認

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. Q2 radiogroup で `ヒト以外の真核生物` を選択
  2. `空間トランスクリプトーム (TSV)` を 1 件追加 (platform 未選択)
  3. データ詳細パネルで `Visium` を選択 (live-commit) して充足させる
- **期待**:
  - platform 未選択の間は該当行のファイル名脇 / 詳細項目が `未設定` (warning Tag / warning tone) になる (destination は GEA が常時確定するため確認事項バナーは描画されない)
  - `Visium` 選択後、`未設定` Tag が消え `設定済み` になり、`data-service="gea"` カードと (Sequencing 系のため) `data-service="dra"` カードの 2 段が描画される
- **備考**: spatial-transcriptomics の DRA+GEA 2 段は recipe 由来。Visium/Stereo-seq は Sequencing 系で DRA を伴い、Xenium/MERFISH は GEA のみ (`submit.detail.options.spatialTranscriptomics` の sub 説明に対応)。

### E-SUBMIT-05: 削除後の連番ギャップで自動採番が衝突しない

- **ペルソナ**: P-ANON
- **前提**: Q2=`ヒト以外の真核生物`
- **手順**:
  1. `配列リード (FASTQ)` を 3 回クリック (`read-001.fastq` / `read-002.fastq` / `read-003.fastq`)
  2. `read-002.fastq` の行の `行を削除` をクリック
  3. `配列リード (FASTQ)` を再度 1 回クリック
- **期待**:
  - 手順 2 後、`[data-testid="file-row"]` は `read-001.fastq` / `read-003.fastq` の 2 件
  - 手順 3 後に追加される行のファイル名が `read-004.fastq` (既存 max=3 の +1、削除で空いた 002 を再利用せず衝突しない)
  - `[data-testid="file-row"]` が 3 件で、ファイル名がすべて一意
- **備考**: ファイル名は種別ごとに `{prefix}-{NNN}.{ext}` で max+1 採番される (3 桁ゼロ埋め)。削除でギャップが生じても max ベースで採番するため一意性が保たれる。


## News Domain

### S-NEWS-01: /news で一覧と 4 facet グループが表示される

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済、`/api/news` が cache active で 200 を返す
- **手順**:
  1. `/news` を開く
- **期待**:
  - PageTitle に「お知らせ・ニュース」が表示される
  - 左 sidebar が `section[aria-label="絞り込み"]` として描画され、FacetGroup ラベル「種別」「ソース」「年」「サービス」の 4 グループが並ぶ (年 / サービスは cache に実出現があるときのみ)
  - main 上部に `aria-live="polite"` の count 行があり、`1–20 / <total> 件` 形式 (en-dash 区切り、mono) を表示する
  - 一覧に少なくとも 1 件の `NewsRow` (date / title / source Tag / category Tag) が描画される
  - エラーバナー (`p[role="alert"]`) は出ない

### S-NEWS-02: facet 選択が URL params と AppliedFilters chip に反映される

- **ペルソナ**: P-ANON
- **前提**: `/api/news` を fixture (data-release 3 件 [うち 2 件 2024 / 1 件 2023] + announcement 1 件) に `page.route` で固定し `/news` を開く
- **手順**:
  1. 「種別」グループの「データ公開」FacetRow checkbox を ON にする
  2. 「年」グループの「2024」FacetRow checkbox を ON にする
- **期待**:
  - URL が `/news?category=data-release&year=2024` に更新される (category=NewsCategory enum 値、year は数値、複数値時は category は alphabet 昇順 / year は降順で `,` 連結)
  - 遷移は `navigate(..., { replace: true })` なので履歴が積まれない (戻るで `/news` 直前ページに戻る)
  - AppliedFilters に chip が 2 つ表示される (「種別: データ公開」「年: 2024」)
  - 各 chip の解除ボタンで対応 facet が外れ、URL から該当 param が消える
- **備考**: fixture 固定で 2024 年 facet / データ公開 種別 facet の実出現を保証する (データ依存 skip なし)。chip ラベルの値は ja の category label (`データ公開`) であり URL 値 (`data-release`) とは異なる。

### S-NEWS-03: トップで featured が NotificationBar に stack 表示される

- **ペルソナ**: P-ANON
- **前提**: `/api/news` を fixture (featured 2 件 + 非 featured 1 件) に `page.route` で固定し `/` を開く
- **手順**:
  1. `/` を開く
- **期待**:
  - ページ上部に `section[role="region"][aria-label="重要なお知らせ"]` が描画される
  - その中に featured item ごとの `article[aria-label="<title>"]` が `publishedAt` 降順 (新しい順) に縦 stack される
  - 各 article に「重要」critical Tag、`publishedAt` の日付、title、`external` の「詳細」TextLink (`newsItemUrl` が `url[lang] ?? url.ja ?? url.en` で URL を解決できる場合に表示)、「通知を閉じる」IconButton が含まれる
  - `featured===false` の item は描画されない
- **備考**: fixture 固定で featured 2 件を保証する (データ依存 skip なし)。featured 0 件時に bar が描画されないこと、および実 mirror → global.yml → bar の貫通は S-NEWS-06 が担保する。

### S-NEWS-04: トップ右 aside に最新ニュースと「すべて見る」リンク

- **ペルソナ**: P-ANON
- **前提**: `/api/news` が 1 件以上を返す
- **手順**:
  1. `/` を開く
- **期待**:
  - 右 aside (`aside`、見出し「お知らせ」) に最新ニュースの compact list が `publishedAt` 降順で表示される
  - aside ヘッダに `/news` へ遷移する「すべて見る」TextLink がある
  - 「すべて見る」クリックで `/news` に navigation する

### S-NEWS-05: facet 絞り込みで実 result set・range・chip が変化する (staging 実データ)

- **ペルソナ**: P-ANON
- **前提**: `/news` を開く、`/api/news` が複数 category を含む実データを返す
- **手順**:
  1. count 行の `<total>` 値 (絞り込み前の総件数) を記録する
  2. 「種別」グループの「データ公開」FacetRow を ON にする
  3. count 行の新しい `<total>` 値を記録する
  4. 「データ公開」FacetRow を OFF に戻す
- **期待**:
  - 手順 2 の後、count 行の総件数が手順 1 より厳密に減少する (≤ 元の値、かつ data-release 件数 < 全件であれば <)
  - 表示中の全 `NewsRow` が「データ公開」category Tag を持つ
  - AppliedFilters に chip が 1 つ表示される (「種別: データ公開」)
  - 手順 4 の後、count 行の総件数が手順 1 の値に復元され、AppliedFilters が消える
- **備考**: URL param の変化だけでなく client 側 `applyFilter` の結果集合が実際に絞り込まれることを検証する (URL のみを見る S-NEWS-02 を補完)。data-release が 0 件の言語/期間では別の実在 category で代替する。

### S-NEWS-06: featured が mirror → global.yml → NotificationBar まで貫通する

- **ペルソナ**: P-ANON
- **前提**: staging の ddbj/www mirror が同期済で、`top_news` whitelist に該当する item が存在する
- **手順**:
  1. `GET /api/news?lang=ja` を直接叩き、`featured===true` の item 集合とその title / publishedAt を取得する
  2. `/` を開く
- **期待**:
  - NotificationBar (`section[role="region"][aria-label="重要なお知らせ"]`) 内の `article[aria-label]` の title 集合が、手順 1 で得た featured item の title 集合と一致する
  - bar の並び順が `publishedAt` 降順である
  - featured 化されていない同名 title が `/news` の通常 row としてのみ現れ、NotificationBar には出ない (featured と category が独立軸であることの確認)
- **備考**: git mirror + normalize + pairing + `featured.ts` の whitelist 突合という統合経路を検証する。news ドメインで唯一 `/api/news` を mock しない実データシナリオ。whitelist 該当 featured が 0 件の期間も skip せず、その場合は「NotificationBar が描画されない」ことを貫通の一部として assert する。

### S-NEWS-07: /news 一覧が date 降順で、pagination が URL に反映される

- **ペルソナ**: P-ANON
- **前提**: `/api/news` を fixture (25 件、publishedAt 厳密降順) に `page.route` で固定し `/news` を開く
- **手順**:
  1. 1 ページ目の `NewsRow` の日付列を上から順に読み取る
  2. count 行の range 表示を確認する
  3. Pagination の「次のページ」を click する
  4. 2 ページ目の日付列を読み取る
- **期待**:
  - 1 ページ目に最大 20 行 (`NEWS_PAGE_SIZE`) が描画される
  - 日付が上から下へ非増加 (newest 順、`sort` default = newest)
  - count 行が `1–20 / <total> 件` を表示する
  - 「次のページ」click で URL が `/news?page=2` に更新され、2 ページ目に続く 20 行が描画される
  - 2 ページ目の先頭行の日付 ≤ 1 ページ目の末尾行の日付
- **備考**: `?page=1` は URL に出力されない (serialize が page>1 のときだけ付与)。

### S-NEWS-08: 言語切替 (cookie) で ja/en pairing と fallback が反映される

- **ペルソナ**: P-ANON
- **前提**: `/news` を ja で開く、ja/en 双方を持つ item と片言語のみの item が cache に存在する
- **手順**:
  1. `/news` を開き、ある `NewsRow` の ja title と外部リンク href を記録する
  2. `/news?lang=en` を開く
  3. 同一 item の表示を確認する
- **期待**:
  - 手順 2 で root loader が `?lang=` を削って 302 redirect し、`Set-Cookie: db_portal_lang=en` を発行する (redirect 後の URL は `/news`、`/en/news` 等の prefix は付かない)
  - 以降の internal link / 再読込でも en が cookie で維持される
  - en title を持つ item は en title と en 外部 URL を表示する (en URL のパターンは source 依存: DDBJ ソースは `https://www.ddbj.nig.ac.jp/news/en/<slug>-e.html`、DBCLS ソースは `https://dbcls.rois.ac.jp/en/<y>/<mo>/<d>/<title>.html`。source Tag に応じて使い分ける)
  - en title が空の item は ja title に fallback し (`newsItemTitle` 契約)、外部リンクは存在する言語側の URL を指す
  - en title を持たない item は en 一覧の絞り込み (title 非空判定) から外れることがある
- **備考**: `?lang=en` query → 302 + cookie の i18n モデル (URL prefix なし) を前提とする。en 対訳の有無は実データ依存で、en title を持つ既知 item が存在する期間に実行する。

### S-NEWS-09: トップ aside の件数が NEWS_LIMIT と一致する

- **ペルソナ**: P-ANON
- **前提**: `/api/news` が 5 件以上を返す
- **手順**:
  1. `/` を開く
  2. 右 aside (見出し「お知らせ」) の row 数を数える
  3. 「すべて見る」をクリックする
- **期待**:
  - aside の row 数がちょうど 5 件 (`NEWS_LIMIT`) である
  - 5 件が `publishedAt` 降順で並ぶ
  - 「すべて見る」click で `/news` に navigation する
- **備考**: aside の上限は `NEWS_LIMIT=5` (`app/shell/news-aside.tsx`)。返却件数が 5 未満のときは全件表示となり、件数一致は「min(total, 5)」で判定する。

### E-NEWS-01: /api/news が 200 空配列でも UI が崩れない

- **ペルソナ**: P-ANON
- **前提**: `page.route()` で `**/api/news` を 200 + `[]` に差し替える (cache 未 active 相当)
- **手順**:
  1. `/news` を開く
- **期待**:
  - PageTitle「お知らせ・ニュース」が描画される
  - 一覧 0 件の空状態メッセージ「条件に一致するお知らせはありません」(SearchIcon 付き) が表示される
  - count 行が「全 0 件」を表示する
  - `p[role="alert"]` のエラーバナーは出ない
- **備考**: `/api/news` は cache 未 active 時に常に 200 + `[]` を返す (5xx を表に出さない)。server 側 mirror 障害の検証は unit + msw 側を主とする (notes.md §7)。

### E-NEWS-02: NotificationBar の dismiss が reload を跨いで sessionStorage で保持される

- **ペルソナ**: P-ANON
- **前提**: `/api/news` を fixture (featured 3 件) に `page.route` で固定 (新規 context も同 fixture を route する)、sessionStorage clear 済
- **手順**:
  1. `/` を開き、featured bar が 2 件以上見えることを確認する
  2. 1 件目の bar の「通知を閉じる」IconButton を click する
  3. `/` を reload する
  4. 新しい browser context (sessionStorage 空) で `/` を開く
- **期待**:
  - 手順 2 の直後、閉じた bar (`article`) だけが即時に消え、他の bar は表示が継続する
  - 閉じた id が sessionStorage key `dbPortal.notificationBar.dismissed` に文字列配列として保存される
  - 手順 3 の reload 後も閉じた bar は再表示されず、残りの bar は表示される (SSR shell hydration → client rehydrate のタイミングを跨いで保持)
  - 手順 4 の新 context では sessionStorage が空のため、閉じた bar も含めて全 featured bar が再表示される
- **備考**: dismiss + sessionStorage の往復は unit でも検証するが、本シナリオは実 shell の hydration 順序を跨いだ回帰 (jsdom unit が隠す効果順) を捕捉する。fixture 固定で featured 3 件を保証する (データ依存 skip なし)。

## Services Domain

### S-SERVICES-01: /services で一覧表示と facet group

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済 (services cache が active = `/api/services` が非空配列を返す)
- **手順**:
  1. `/services` を開く
- **期待**:
  - `getByRole("heading", { name: /サービス|Services/i, level: 1 })` が表示される (PageTitle = `<h1>`)
  - facet サイドバー (`<section aria-label="絞り込み">` / en は `Refine`) が表示され、その中に種別 (category) と ソース (source) の 2 FacetGroup が存在する
  - service row の link が 1 件以上描画される (`getByRole("link")` で name アルファベット昇順の先頭サービス、external link)
- **備考**: 実 cache の live データに対して client 側 `ServiceList.parse` (`app/lib/api/services.ts`) が通ることを貫通確認する。server 正規化出力に新必須フィールドや未知 enum 値が混ざると `fetchServices` で throw し、hand-built fixture を使う unit では捕捉できない回帰をここで検出する。

### S-SERVICES-02: facet で絞り込み、URL に反映

- **ペルソナ**: P-ANON
- **前提**: `/services` を開く (cache に source=dbcls / category=search の item が少なくとも 1 件存在)
- **手順**:
  1. `/services` を開く
  2. 種別 facet の `getByRole("checkbox", { name: /検索|Search/i })` を check
  3. ソース facet の `getByRole("checkbox", { name: "DBCLS" })` を check
- **期待**:
  - URL が `/services?source=dbcls&category=search` に更新される (params は `source` → `category` の順、各 param 値は alphabet sort)
  - 一覧が source=dbcls かつ category=search の item に絞り込まれる (各 service row の source Tag が `DBCLS`)
  - AppliedFilters に「適用中 · 2」が表示され、`aria-label` が `種別: 検索 を解除` / `ソース: DBCLS を解除` (en は `Type: Search を解除` / `Source: DBCLS を解除` 形。` を解除` サフィックスは `applied-filters.tsx` でハードコードされ未翻訳) の解除 button が 2 件描画される。テストは exact 一致でなく前方部分 (`/種別: 検索/` 等) で照合する
  - facet toggle は `navigate(..., { replace: true })` なので履歴が積まれない (ブラウザ戻るで `/services` 初期画面に戻らず直前ページに戻る)
- **備考**: route-level wiring (`handleFacetChange` → `serializeServicesFacetState` → navigate → `parseServicesFacetState` → `applyFilter`) を実データで貫通する。pure-function の serialize/parse 単体テストでは i18n ラベル不一致や query 文字列の取り違えを捕捉できない。

### S-SERVICES-03: トップに featuredTop の services list

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済 (services cache が active)
- **手順**:
  1. `/` を開く
- **期待**:
  - `getByRole("heading", { name: /サービス|Services/i, level: 2 })` の services セクション (`SectionHeading as="h2"`) が表示される
  - セクション内に featuredTop の service link が list (`<ul>`) で並ぶ。DDBJ whitelist 由来の名前 (`BioProject` / `BioSample` / `DDBJ` / `JGA` / `DRA` / `GEA` / `MetaboBank` / `TogoVar-repository` のいずれか) と、DBCLS の `Togo` prefix link (例 `getByRole("link", { name: /^Togo/ })`) がともに 1 件以上含まれる
  - セクション見出し脇に `getByRole("link", { name: /すべて見る|View all/i })` があり `href="/services"` を指す
  - facet / pagination / sort toolbar はこのセクションに描画されない (top は全件 fetch を client で `featuredTop` 絞り込みした単純 list)
- **備考**: top の FeaturedServices は `/services` と同じ query key (`["services"]`) を共有し client 側で `featuredTop === true` を絞る。whitelist / Togo prefix が upstream 名と drift するとセクションが無言で空になるため、`/` 上でこれらの row が実際に描画されることを固定する。

### E-SERVICES-01: /api/services 200 空配列でも UI 崩れない

- **ペルソナ**: P-ANON
- **前提**: `page.route("**/api/services", ...)` で status 200 / body `[]` を返すように network intercept (cold start や mirror 未同期で cache が空配列を返す状態を再現)
- **手順**:
  1. 上記 route mock を設定する
  2. `/services` を開く
- **期待**:
  - 一覧 0 件でも `getByRole("heading", { name: /サービス|Services/i, level: 1 })` が描画される
  - 空状態メッセージ `条件に一致するサービスはありません` / `No services match the selected filters` (`services.list.empty`) が表示される
  - `role="alert"` の error banner (`services.list.error`) は描画されない (空 cache を error として扱わない)
  - facet サイドバーの種別 / ソース FacetGroup は値が無いため描画されない (`options.categories` / `options.sources` が空)
- **備考**: notes.md §7 に従い `page.route()` で再現する staging 不可分シナリオ。空状態 (plain `<p>`、alert 無し) と取得失敗 (`role="alert"`) を取り違える回帰を区別して固定する。


## Auth Domain

### S-AUTH-01: 未認証で Header に「ログイン」 link

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済 (cookie / storage は `beforeEach` で clear 済)
- **手順**:
  1. `/` を開く
- **期待**:
  - `GET /api/me` が 401 で `{ error: "unauthorized" }` を返し、`Cache-Control: no-store` ヘッダを持つ
  - Header 右に「ログイン」 link (`getByRole("link", { name: "ログイン" })`) が表示される
  - その `href` が `/api/auth/login?return_to=%2F` (現在 path を `return_to` に持つ `buildLoginUrl(pathname)` の結果)
  - 「ログアウト」 link は存在しない

### S-AUTH-02: ログイン済 Header に user 名 + 「ログアウト」 link

- **ペルソナ**: P-USER
- **前提**: `auth.setup.ts` が生成した storage state を読み込んだ `user` project context
- **手順**:
  1. `/` を開く
- **期待**:
  - `GET /api/me` が 200 で `{ user: { sub, name, email } }` を返す
  - Header 右の link (`getByRole("link")`) に test user 名 (`ts-db-portal-dev` に対応する `name`) と `· ログアウト` テキストが表示される
  - その `href` が `/api/auth/logout?return_to=%2F` (`buildLogoutUrl(pathname)` の結果)
  - 「ログイン」 link は存在しない

### S-AUTH-03: ログアウトで Header が「ログイン」 に戻る

- **ペルソナ**: P-USER (login 済)
- **前提**: `/` を開き、Header に user 名 + 「ログアウト」 link が表示済
- **手順**:
  1. Header の「ログアウト」 link をクリック
  2. Keycloak の `end_session` → `/api/auth/logout-callback` のリダイレクトチェーンを完走させる
- **期待**:
  - 最終的に `return_to` の `/` に着地する
  - reload 後の `GET /api/me` が 401 を返す
  - Header 右に「ログイン」 link (`getByRole("link", { name: "ログイン" })`) が再表示される
  - user 名 / 「ログアウト」 link は表示されない
- **備考**: 期待される end_session 302 とクッキー失効の詳細は S-AUTH-06 で精査する。本シナリオは UI レベルの round-trip 確認に限定する。

### S-AUTH-04: `/api/auth/login` が Keycloak authorize URL に 302

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済
- **手順**:
  1. `request` (リダイレクト追従なし、`maxRedirects: 0` 相当) で `GET /api/auth/login?return_to=/databases/bioproject` を実行
- **期待**:
  - status が 302
  - `Location` ヘッダの origin が Keycloak realm (`https://idp-staging.ddbj.nig.ac.jp`)、path が `/realms/master/protocol/openid-connect/auth`
  - query が `response_type=code`、`code_challenge_method=S256`、非空の `code_challenge`、`scope=openid profile email`、`client_id=db-portal-dev` (staging は dev と同じ realm の `db-portal-dev` client を共用する。`DB_PORTAL_KEYCLOAK_CLIENT_ID=db-portal-dev`)、`/api/auth/callback` で終わる `redirect_uri`、非空の `state` を持つ
  - レスポンスに `Set-Cookie: sid=...` が含まれない (この時点では session 未発行)
- **備考**: `state` / `code_verifier` は pending store に 10 分 TTL で保存される (`PENDING_TTL_MS`)。authorize URL 自体に `code_verifier` は載らない (PKCE)。

### S-AUTH-05: Keycloak login 往復で sid cookie 発行と returnTo 着地

- **ペルソナ**: P-USER
- **前提**: `DB_PORTAL_E2E_USER_PASSWORD` が設定済。staging Keycloak が到達可能
- **手順**:
  1. `loginViaKeycloak(page, "/databases/bioproject")` で `/api/auth/login?return_to=/databases/bioproject` から Keycloak ログインフォーム (`#username` / `#password` / `#kc-login`) を経由する
  2. `/api/auth/callback` のレスポンスを `waitForResponse` で捕捉する
- **期待**:
  - 最終 URL が `/databases/bioproject` で終わる
  - callback レスポンスの `Set-Cookie` が `sid=` を含み、`HttpOnly`、`Secure`、`SameSite=Lax`、`Path=/` 属性を全て持つ (staging は https origin のため `Secure` が付く)
  - その後の `GET /api/me` が 200 で `{ user: { sub, name, email } }` を返し、`Cache-Control: no-store` を持つ
  - Header に test user 名が表示される
- **備考**: `Secure` 属性は https origin (staging) でのみ検証可能。dev (`DB_PORTAL_ENV=dev`) では `isSecureRuntime` が false になるため、本シナリオは staging 限定。

### S-AUTH-06: `/api/auth/logout` が end_session_endpoint に 302 し session を破棄

- **ペルソナ**: P-USER (login 済)
- **前提**: S-AUTH-05 等で sid cookie を持つ login 済 context
- **手順**:
  1. `request` (リダイレクト追従なし) で `GET /api/auth/logout?return_to=/` を実行
  2. 続いて `/api/auth/logout-callback` までのリダイレクトチェーンを完走させる
- **期待**:
  - logout レスポンスが 302、`Location` の origin が Keycloak realm (`https://idp-staging.ddbj.nig.ac.jp`)、path が `/realms/master/protocol/openid-connect/logout`
  - query が `id_token_hint`、`client_id=db-portal-dev` (staging は dev と同じ realm の `db-portal-dev` client を共用する。`DB_PORTAL_KEYCLOAK_CLIENT_ID=db-portal-dev`)、`/api/auth/logout-callback` で終わる (URL エンコードされた `return_to=/` を含む) `post_logout_redirect_uri` を持つ
  - チェーン完走後、`/api/auth/logout-callback` のレスポンスが `Set-Cookie: sid=; Max-Age=0`(`HttpOnly`/`SameSite=Lax`/`Path=/`) を返す
  - その後の `GET /api/me` が 401 を返す
- **備考**: session が無い状態で `/api/auth/logout` を叩いた場合は Keycloak へ飛ばず、cookie clear + `return_to` への 302 のみとなる (routes.ts の no-session 分岐)。本シナリオは session を持つ正常系に限定する。

### E-AUTH-01: callback で state 不一致 (CSRF / replay 防御)

- **ペルソナ**: P-ANON
- **前提**: pending store に存在しない state を使う
- **手順**:
  1. `request` (リダイレクト追従なし) で `GET /api/auth/callback?code=x&state=evil` を実行 (攻撃者が用意した URL を被害者に踏ませる想定を URL 直接組み立てで再現)
- **期待**:
  - status が 400、body が `{ error: "invalid_state" }`
  - `take("evil")` が pending store に該当無しで失敗するため token 交換に進まない
  - レスポンスに `Set-Cookie: sid=...` が含まれない
- **備考**: notes.md §7 に従い URL を直接組み立てて再現する (server / Keycloak は通常運転)。

### E-AUTH-03: callback で code / state 欠落 → invalid_request

- **ペルソナ**: P-ANON
- **前提**: code または state を欠いた callback URL を直接組み立てる
- **手順**:
  1. `request` (リダイレクト追従なし) で `GET /api/auth/callback?state=onlystate` を実行
  2. 別途 `GET /api/auth/callback?code=onlycode` を実行
- **期待**:
  - いずれも status が 400、body が `{ error: "invalid_request" }`
  - pending store の lookup (`take`) に到達する前に弾かれるため、`invalid_state` ではなく `invalid_request` が返る
  - どちらのレスポンスにも `Set-Cookie: sid=...` が含まれない
- **備考**: notes.md §7 に従い URL を直接組み立てて再現する。`invalid_request` (param 欠落) と `invalid_state` (E-AUTH-01) の分岐が別コードであることを固定する。

### E-AUTH-04: server 側 session 失効で `/api/me` が 401、Header が「ログイン」 に戻る

- **ペルソナ**: P-USER
- **前提**: server 側 session store に存在しない sid を cookie に持たせる
- **手順**:
  1. `context.addCookies` で `sid` を store に無いランダム UUID (例: `crypto.randomUUID()`) に差し替える
  2. `GET /api/me` を実行
  3. `/` を reload する
- **期待**:
  - `GET /api/me` が 401 で `{ error: "unauthorized" }` を返す (`sessionStore.get(sid)` が `undefined`)
  - reload 後の Header 右に「ログイン」 link (`getByRole("link", { name: "ログイン" })`) が表示される
  - user 名 / 「ログアウト」 link は表示されない
- **備考**: 実装には access/refresh token も token refresh path も無く、session は in-memory の sliding TTL (`DB_PORTAL_AUTH_SESSION_TTL_SECONDS`、staging 既定 1800 秒) のみ。`/api/me` は Keycloak に問い合わせない。staging では TTL 経過を待たず、store に無い sid を crafted cookie で与えて失効状態を再現する (notes.md §7 の state mismatch 方式)。


## LLM Domain

AI 補助は独立した region ではなく、検索ボックス内の「AI モード」トグル (`search.assistant.enterMode`、`aria-pressed` を持つ Button) として実装されている。トグルは `/api/llm/health` の状態に応じて `useLlmAvailability` でゲートされ、`unset` のとき非表示、`ok` / `unreachable` のとき表示される (`app/features/search/assistant/llm-availability.ts`)。

入口コンポーネントは 2 系統:

- `/search` の `SearchInputPanel`: 生成結果を in-place の proposal `<section>` で見せ、Apply で Advanced builder に反映する。
- トップ (`/`) / 結果 (`/search/results`) の `NavigableSearchInput`: proposal を出さず、`event: done` の AST を serialize して `/search/results?q=<DSL>` に遷移する。

AI 入力欄は `textbox` で accessible name は `search.a11y.assistantInput` (`AI 検索アシスタントへの入力` / `AI search assistant input`)。送信ボタンのラベルは入口で異なる: `/search` の `SearchInputPanel` は AI モードで `search.assistant.generateShort` (`生成` / `Generate`)、トップ (`/`) / 結果 (`/search/results`) の `NavigableSearchInput` は AI モードでも `search.a11y.submit` (`検索` / `Search`) のまま (idle 時)。どちらも生成中は `search.assistant.generating` (`生成中…` / `Generating…`) になる。`NavigableSearchInput` 文脈では送信ボタンのラベルに依存せず AI 入力欄で Enter 送信するのが堅牢。エラーは toast ではなく、`NavigableSearchInput` のみ inline の `<p role="alert">` (`search.assistant.generateError`) で表示する。`SearchInputPanel` は error 表示を持たず、AI モードのまま proposal が出ないだけ (keyword には戻らない)。

### S-LLM-01: /search で AI モード生成 → proposal が in-place 表示される

- **ペルソナ**: P-USER
- **前提**: `page.route` で `/api/llm/health`=ok と `/api/llm/search-assistant` の SSE (`event: done`) を mock 固定する
- **手順**:
  1. `/search` を開く
  2. 検索ボックス右端の「AI モード」 button (`aria-pressed="false"`) をクリック
  3. AI 入力欄 (`getByRole("textbox", { name: /AI 検索アシスタントへの入力|AI search assistant input/ })`) に `human breast cancer rna-seq from 2023` を入力
  4. 送信ボタン (AI モードでは `生成` / `Generate`) をクリック
- **期待**:
  - 「AI モード」 button が `aria-pressed="true"` に変わり、ボックスが AI tone (`tone="ai"`) になる
  - `/api/llm/search-assistant` への POST が `200` を返し、`Content-Type: text/event-stream` で SSE が流れる (`event: message` 連続 → `event: done`)
  - 生成中は送信ボタンが `生成中…` / `Generating…` になり、「提案の生成を停止」 button (`search.a11y.assistantStop`) が表示される
  - 完了後、proposal `<section>` (`getByRole("region", { name: /AI による生成結果|AI-generated query/ })`、見出しは `h2`) が描画され、`ProposalConditions` に条件が並ぶ
  - 「クエリビルダーに追加」 / 「この内容で作成」 button と「再生成」 button が表示される
- **備考**: SSE を mock 固定するため vLLM 非依存で決定的 (health-gate skip なし)。SearchInputPanel は `done` で proposal を in-place 描画する (NavigableSearchInput と違い navigate しない)。

### S-LLM-02: /api/llm/health が ok のとき AI モードトグルが表示される

- **ペルソナ**: P-ANON
- **前提**: `/api/llm/health` が `{status:"ok",model}` を返す環境
- **手順**:
  1. `/api/llm/health` を直接叩いてレスポンスを確認する
  2. `/search` を開く
- **期待**:
  - `/api/llm/health` が `200` で `{ status: "ok", model: <string> }` を返し、`Cache-Control: no-store` ヘッダが付く
  - 検索ボックス内に「AI モード」 button (`getByRole("button", { name: /AI モード|AI mode/ })`、初期 `aria-pressed="false"`) が `visible`
  - 押下すると `aria-pressed="true"` に変わり、AI 入力欄が現れる
- **備考**: health-gated。staging vLLM 到達時のみ `ok` になる。到達不可時は E-LLM-04 の `unreachable` パスで表示確認する。

### S-LLM-03: /search の proposal を Apply → Advanced builder が再構築される

- **ペルソナ**: P-ANON
- **前提**: `page.route` で `/api/llm/health`=ok と SSE (`event: done`、organism_name leaf) を mock 固定。`/search` を開き、Advanced builder は空 (keyword 行なし、`root.children` 0 件) の初期状態
- **手順**:
  1. 「AI モード」 button をクリックして AI モードに入る
  2. AI 入力欄に `Homo sapiens single cell published between 2022 and 2024` を入力し、`生成` をクリック
  3. proposal `<section>` が表示されるのを待つ
  4. 「この内容で作成」 button (`search.assistant.applyReplace`、空 builder なので生成モードは `new`) をクリック
- **期待**:
  - 生成モードが `new` のため、scope セレクタの「既存に追加」 (`search.assistant.modeAppend`) は `disabledScopeOptions` で無効表示
  - `event: done` の AST が `dispatch({ type: "replaceRoot" })` で Advanced builder に反映され、proposal が条件として並んだ通りに builder 行が描画される
  - Apply 後、モードが keyword に戻り (「AI モード」 button が `aria-pressed="false"`)、AI 入力欄が消える
  - keyword 行は `new` モードのためクリアされる
- **備考**: SSE を mock 固定するため決定的 (health-gate skip なし)。done AST は固定値だが、行の存在・件数 (`>= 1`) と builder への反映有無のみ assert し、特定 field/value への厳密一致は assert しない (mock 値に過度に結合しない)。

### E-LLM-01: health=unreachable のとき AI モードトグルは表示される (送信時のみ失敗)

- **ペルソナ**: P-ANON
- **前提**: `page.route("**/api/llm/health", ...)` で `{ status: "unreachable", reason: "status 503" }` を返すよう intercept (staging で vLLM 停止を再現できないため、notes.md §7 のとおり health レスポンスを route mock で差し替える)
- **手順**:
  1. `/search` を開く
- **期待**:
  - `llmAvailabilityFromHealth` が `unreachable` → `ready: true` を返すため、「AI モード」 button (`getByRole("button", { name: /AI モード|AI mode/ })`) が `visible`
  - 送信前にエラーバナーや placeholder は出ない (機能は表示されたまま)
  - トグルを押して AI モードに入り送信すると `event: error` 経路で失敗が通知される (詳細は E-LLM-03)
- **備考**: `unset` との差を E-LLM-04 で区別する。route mock は外部境界 mock の一種で、staging 再現不可の health 状態のみ許容 (notes.md §7)。

### E-LLM-02: SSE 切断で inline alert + 入力欄保持

- **ペルソナ**: P-ANON
- **前提**: `page.route("**/api/llm/health", ...)` で `{status:"ok",model:"e2e"}`、`page.route("**/api/llm/search-assistant", ...)` で `event: error` を 1 件流して接続を閉じる SSE レスポンスを返す
- **手順**:
  1. `/search/results?q=cancer&db=bioproject` を開く (NavigableSearchInput がマウントされる)
  2. 「AI モード」 button をクリック
  3. AI 入力欄に `breast cancer rna-seq` を入力し、Enter で送信 (NavigableSearchInput の送信ボタンは `search.a11y.submit`「検索」、生成中のみ「生成中…」)
- **期待**:
  - `useAssistantStream` が `event: error` を受信し state が `error` になる
  - ボックス直下に inline の `<p role="alert">` が現れ、文言が `search.assistant.generateError` (`クエリの生成に失敗しました。入力を変えて再試行してください。` / `Could not generate a query...`)
  - AI 入力欄に `breast cancer rna-seq` が残る (内容ロストしない)
  - `/search/results` から遷移しない (URL 不変)
  - toast component は DOM に存在しない (実装に toast は無い)
- **備考**: `page.route()` で response を途中切断する (notes.md §7 の E-LLM-02 再現方法)。NavigableSearchInput のみ inline alert を描画する (SearchInputPanel は error 表示を持たず、AI モードのまま proposal を出さないだけ; keyword には戻らない)。

### E-LLM-03: event:error が UI に inline alert として届き入力が保持される

- **ペルソナ**: P-ANON
- **前提**: `page.route` で health=`{status:"ok",model:"e2e"}`、`/api/llm/search-assistant` を `200 text/event-stream` で `: stream-open` → `event: error\ndata: {"code":"upstream-disconnect","message":"stream interrupted"}` を流すレスポンスに固定
- **手順**:
  1. `/` を開く (トップ hero の NavigableSearchInput)
  2. 「AI モード」 button をクリックして AI モードに入る
  3. AI 入力欄に `single cell human pancreas` を入力し、Enter で送信 (NavigableSearchInput の送信ボタンは `search.a11y.submit`「検索」、生成中のみ「生成中…」)
- **期待**:
  - SSE は `200` だが `event: error` を含むため state が `error` に遷移し、proposal は出ず `/search/results` へ遷移しない (URL は `/`)
  - inline `<p role="alert">` が `search.assistant.generateError` の文言で表示される
  - AI 入力欄に `single cell human pancreas` が残る
  - `getByRole("status")` 等の toast 系要素が存在しないこと (docs の「toast」記述に反し実機は inline alert)
- **備考**: docs/llm.md は error 時「toast」と記すが実装は inline alert で入力を保持する。本シナリオは inline alert と入力保持を SSOT として固定する。

### E-LLM-04: unset と unreachable のゲーティング差 (unset で非表示、unreachable で表示)

- **ペルソナ**: P-ANON
- **前提**: `page.route("**/api/llm/health", ...)` を status ごとに差し替える
- **手順**:
  1. health=`{status:"unset"}` に固定して `/search` を開く
  2. health=`{status:"unreachable",reason:"status 503"}` に差し替えて `/search` を reload する
- **期待**:
  - `unset` のとき「AI モード」 button が DOM に存在しない (`getByRole("button", { name: /AI モード|AI mode/ }).count()` が `0`)。`useLlmAvailability` が `ready: false` を返すため `aiToggle` が `undefined`
  - `unset` のときエラーバナーや placeholder は出ず、検索ボックスは通常の keyword 入力として機能する
  - `unreachable` のとき同 button が `visible` (`ready: true`)
- **備考**: 既存の region 名 locator では両状態を区別できなかった。トグルの有無で `unset` (非表示) と `unreachable` (表示) の契約差を直接検証する。

### E-LLM-05: top/results で done が proposal を出さず /search/results に遷移する

- **ペルソナ**: P-ANON
- **前提**: `page.route` で health=`{status:"ok",model:"e2e"}`、`/api/llm/search-assistant` を複数の `event: message` delta + `event: done\ndata: <AST JSON>` を流す `200` SSE に固定。AST は `{"op":"contains","field":"organism_name","value":"Homo sapiens"}` 相当
- **手順**:
  1. `/` を開く
  2. 「AI モード」 button をクリックし、AI 入力欄に `human samples` を入力して Enter で送信 (NavigableSearchInput の送信ボタンは `search.a11y.submit`「検索」、生成中のみ「生成中…」)
- **期待**:
  - 生成中は送信ボタンが `生成中…` になり、`event: message` delta が来ても proposal `<section>` (`AI による生成結果`) は描画されない (NavigableSearchInput は preview を持たない)
  - `event: done` 受信後、`/db-portal/serialize` で AST を DSL に直し、URL が `/search/results?q=<serialized DSL>` に遷移する (`q` パラメータが非空)
  - 遷移後 AI 入力欄はクリアされ、モードは keyword に戻る
- **備考**: SearchInputPanel (S-LLM-03) の in-place Apply とは別の done パス。serialize は `/db-portal/serialize` への到達が必要なため、health route-mock 時も ddbj-search-api staging 到達を前提とする。

### E-LLM-06: 429 rate_limited が SSE 開始前に返り、UI がエラー affordance を出す

- **ペルソナ**: P-ANON
- **前提**: `page.route` で health=`{status:"ok",model:"e2e"}`、`/api/llm/search-assistant` を `429` JSON `{ "error": "rate_limited", "axis": "ip" }` + `Retry-After: 30` を返すよう固定 (SSE は開かない)
- **手順**:
  1. `/search/results?q=cancer` を開く
  2. 「AI モード」 button → AI 入力欄に `lung cancer` を入力 → Enter で送信 (NavigableSearchInput の送信ボタンは `search.a11y.submit`「検索」、生成中のみ「生成中…」)
- **期待**:
  - レスポンスが `429`、`Retry-After: 30`、body `{ error: "rate_limited", axis: "ip" }`、`Content-Type` は `text/event-stream` ではない
  - `useAssistantStream` は `!response.ok` で state を `error` にするため、ボックス直下に inline `<p role="alert">` (`search.assistant.generateError`) が出る
  - AI 入力欄に `lung cancer` が残り、`/search/results` から遷移しない
- **備考**: docs/llm.md は 429 時「toast 『しばらくしてから再試行してください』」と記すが、実機 client は SSE 非開始の `!response.ok` を一般 error 扱いし inline alert を出す。本シナリオは実機挙動 (inline alert・入力保持) を固定する。サーバ実 429 (per-IP 60/min・per-session 30/min) は in-memory fixed-window のため staging で人為再現しにくく route mock で代替する (notes.md §5.2 / §7)。

### E-LLM-07: PII を含む prompt でも done が返り、proposal に redaction マーカーが出ない

- **ペルソナ**: P-USER
- **前提**: `page.route` で `/api/llm/health`=ok と SSE (`event: done`) を mock 固定する
- **手順**:
  1. `/search` を開き「AI モード」に入る
  2. AI 入力欄に email / 電話番号を含む文 (例: `contact me at user@example.com about human cancer rna-seq`) を入力し `生成` をクリック
- **期待**:
  - PII を含む prompt でも生成は完了し (mock SSE が `event: done` を返す)、proposal `<section>` が描画される
  - proposal の描画テキストに `[REDACTED_EMAIL]` / `[REDACTED_PHONE]` 等の redaction マーカーが含まれない (redaction は server log 専用で UI には出ない)
- **備考**: SSE を mock 固定 (health-gate skip なし)。redaction の masking 自体は `server/llm/redaction` の unit / PBT で担保し、本 e2e は mock done を描画した proposal に `[REDACTED*]` が混ざらない UI 経路のみを確認する低優先シナリオ。S-LLM-01 の happy path と大きく重なる。


## Top Domain

### S-TOP-01: ja トップ訪問で hero + service tile + FeaturedServices + NewsAside が表示

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済、`/api/services` / `/api/news` 到達可能
- **手順**:
  1. `/` を訪問
- **期待**:
  - `<html lang="ja">`
  - Hero に `<SearchBox size="lg">` の検索入力 1 件、placeholder が「キーワード、accession、学名で検索」
  - example chip 5 件 (`BRCA1` / `SARS-CoV-2` / `"Oryza sativa"` / `"Cyprinus carpio"` / `PRJDB10452`) が表示され、chip クリックで入力欄に値が入る
  - example 行末に「詳細条件で検索」 TextLink、href が `/search`
  - ServiceGrid に primary-service の Service tile が 6 件 (`<ul>` 内の `role="listitem"` (`<li>`) が 6、各 `<li>` 内に LinkCard。`getByRole("listitem")` が 6 を返す)
  - 「サービス」 SectionHeading + FeaturedServices リストに 1 件以上の row、見出し横に「すべて見る」 link (href `/services`)
  - 右 aside の NewsAside に news 5 件 (NEWS_LIMIT)、「すべて見る」 link (href `/news`)
  - Breadcrumb nav は描画されない (`useBreadcrumb` が Home のみで 0 件 → null)
- **備考**: FeaturedServices / NewsAside の件数は live mirror データ駆動。タイル 6 件は content collection (`top.category === "primary-service"`) で固定。

### S-TOP-02: `?lang=en` でクッキー切替し en 文言・stable URL を確認

- **ペルソナ**: P-ANON
- **前提**: lang cookie 未設定の fresh context
- **手順**:
  1. `/?lang=en` を訪問
- **期待**:
  - root loader が 302 redirect を返し、`lang` param を除去した `/` に着地する (最終 URL は `/`、`/en` prefix は付かない)
  - `Set-Cookie: db_portal_lang=en` が発行され、属性 `SameSite=Lax` / `Path=/` / `Max-Age=31536000` / `Secure` (staging は secure runtime)
  - `<html lang="en">`
  - Hero placeholder が「Search by keyword, accession, or organism」、advanced link テキストが「Advanced search」 (href `/search`、prefix なし)
  - 「Services」 SectionHeading、view-all テキストが「View all」 (href `/services`)
  - NewsAside view-all (href `/news`)、いずれの内部リンクも `/en` prefix を含まない
- **備考**: 言語切替は cookie ベース (`db_portal_lang`)。URL prefix (`/en`) は存在しない。cookie 設定後は param なしで `/` を再訪問しても en が維持される。

### S-TOP-03: hero keyword 検索 (scope=all) で `/search/results?q=` に遷移

- **ペルソナ**: P-ANON
- **前提**: `/` を訪問、scope dropdown は default の「全データベース」 (`search.scope.all`)
- **手順**:
  1. hero の検索入力に `cancer` と入力
  2. Enter で submit (または検索ボタン click)
- **期待**:
  - URL が `/search/results?q=cancer` に変わる (`db` param は付かない、scope=all は `scopeKeyToDbSlug` が null を返すため)
  - cross-DB 検索結果領域が表示される (`role="region"` aria-label「検索結果」 = `search.a11y.resultsRegion`、内部に `data-testid="db-card"` の per-DB カード。`search.results.cross.heading`「横断検索結果」 は i18n に定義はあるがどの component も描画しないため見出しテキストでは照合しない)
- **備考**: 値は `value.trim()` されて `buildResultsHref` に渡る。先頭末尾の空白は除去される。

### S-TOP-04: cookie 維持された en セッションでトップ再訪問が en を保持

- **ペルソナ**: P-ANON
- **前提**: 直前に `/?lang=en` を訪問し `db_portal_lang=en` cookie を保持した context
- **手順**:
  1. `lang` param なしで `/` を訪問
- **期待**:
  - 302 redirect は発生しない (param が無いため)、`<html lang="en">` のまま render
  - Hero placeholder「Search by keyword, accession, or organism」、ServiceGrid / FeaturedServices / NewsAside がすべて en 文言
  - 新たな `Set-Cookie` は発行されない (cookie 既存)
- **備考**: S-TOP-02 が「初回切替 (param → cookie)」、本シナリオは「cookie 持続による維持」 を検証する。両者を同 spec 内で連続実行する場合は cookie state を引き継ぐ。

### S-TOP-05: 6 service tile と live services-mirror の FeaturedServices が描画

- **ペルソナ**: P-ANON
- **前提**: portal staging 起動済、`/api/services` (services mirror BFF) 到達可能
- **手順**:
  1. `/` を訪問
  2. FeaturedServices の `/api/services` レスポンス完了を待つ (`waitForResponse` で status 200)
- **期待**:
  - ServiceGrid に 6 件の service-tile LinkCard が visible (`role="listitem"` 6 件)
  - 各 tile は内部 Link または `target="_blank"` の外部 anchor として描画
  - 「サービス」 SectionHeading が表示され、FeaturedServices リストが 1 件以上の row を持つ (空にならない)
  - 各 featured row は名前 (url あり時は external TextLink、url なし時はプレーン span) を持ち、localized name の昇順 (`localeCompare("en", { sensitivity: "base" })`)
  - 見出し横の「すべて見る」 link href が `/services`
- **備考**: featured 件数は mirror の `featuredTop` フラグ駆動で固定値ではない。`/api/services` が schema / `featuredTop` 契約を破ると本シナリオで empty リストとして検出される (unit は mock のため検出不可)。

### S-TOP-06: DB scope 選択時の hero 検索が `db=` を results URL に伝播

- **ペルソナ**: P-ANON
- **前提**: `/` を訪問
- **手順**:
  1. hero の scope dropdown を開き「BioProject」 を選択
  2. 検索入力に `cancer` と入力
  3. submit
- **期待**:
  - URL が `/search/results?q=cancer&db=bioproject` に変わる (scope label → `ScopeKey` → `scopeKeyToDbSlug` → `buildResultsHref` の chain)
  - per-DB (bioproject) の検索結果が表示される
- **備考**: scope=all のとき `db` param が落ちる挙動 (S-TOP-03) との対で、scope 非 all のときの `db` 伝播を固定する。

### E-TOP-01: News mirror 未準備でも top が崩れず render

- **ペルソナ**: P-ANON
- **前提**: `page.route()` で `/api/news` を空配列 `[]` に差し替える (mirror 起動前を再現)
- **手順**:
  1. `/` を訪問
- **期待**:
  - NewsAside が empty 状態 (空メッセージ相当) で描画される
  - Hero の検索入力 / ServiceGrid の 6 tile / FeaturedServices セクションは通常通り render される
  - エラーバナー (`role="alert"`) は出ない
- **備考**: staging で mirror 空を再現できないため `page.route()` で `/api/news` を境界 mock する (notes.md §7)。BFF の本物契約破壊は unit + msw 側で主に検証。

### E-TOP-02: LLM unavailable のとき hero に AI モードトグルが現れない

- **ペルソナ**: P-ANON
- **前提**: `/api/llm/health` が `{ status: "unset" }` を返す環境 (`DB_PORTAL_LLM_BASE_URL` 未設定)、staging で再現できない場合は `page.route()` で `/api/llm/health` を `{ status: "unset" }` に差し替える
- **手順**:
  1. `/` を訪問
- **期待**:
  - hero に keyword 検索入力のみが表示され、「AI モード」 トグルボタン (`aria-pressed` を持つ Button) が DOM に存在しない (`useLlmAvailability().ready === false`)
  - placeholder は keyword 用「キーワード、accession、学名で検索」 のまま
  - エラーバナー / placeholder メッセージは出ない (機能の存在自体を隠す)
- **備考**: `ready` は health `ok` / `unreachable` で true、`unset` で false。staging が `ok` 固定の場合は `page.route()` で health を `unset` に固定して再現する (health-gated)。

### E-TOP-03: hero AI モード generate → serialize → 結果ページ遷移

- **ペルソナ**: P-USER
- **前提**: `page.route` で `/api/llm/health`=ok と SSE (`event: done`) を mock 固定。ddbj-search-api `/serialize` + 検索は実物 (到達可能)
- **手順**:
  1. `/` を訪問
  2. hero の「AI モード」 トグル (`aria-pressed=false`) を click → `aria-pressed=true` に変わる
  3. AI 入力欄に `human breast cancer rna-seq from 2023` と入力
  4. submit
  5. SSE 完了 (`/api/llm/search-assistant` response 200) と `/serialize` 呼び出しを待つ
- **期待**:
  - 生成された AST が `serializeAstToDsl` で DSL 化され、`/search/results?q=<非空 DSL>` に navigate する (top では proposal は表示せず直接遷移)
  - scope が非 all の場合は `&db=<slug>` も付く
  - 検索結果が表示される
- **備考**: vLLM 生成は mock 固定 (health-gate skip なし) だが、done AST → ddbj-search-api `/serialize` → 非空 DSL → navigate → 結果領域は実物を通すため、LLM 出力を serializer に渡す契約 (portal で唯一の経路) は引き続き e2e で検証する。serialize 失敗時に top に留まる分岐 (`search.end()`) は staging では再現困難のため unit で吸収。

## Content (Databases) Domain

### S-CONTENT-01: /databases/bioproject ja 表示と breadcrumb

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済、cookie 未設定 (default lang ja)
- **手順**:
  1. `/databases/bioproject` を訪問
- **期待**:
  - `<html lang="ja">`
  - `<h1>BioProject</h1>` (level 1) + description subtitle
  - 本文 Section に body[ja] が描画される
  - Breadcrumb nav (`aria-label` = `a11y.breadcrumbNav`) の `<ol>` は **ちょうど 2 セグメント**: 先頭が `ホーム` link (`href="/"`)、末尾が `aria-current="page"` の span `BioProject`。`データベース` の中間セグメントは存在しない (flat route 構成のため、`databases` breadcrumbI18nKey を持つ親 route が無い)
  - 関連データベース section (見出し `関連データベース`) に `BioSample` の TextLink (`href="/databases/biosample"`) が 1 件
  - 外部リンク section (見出し `外部リンク`) に `NCBI BioProject` / `EBI BioStudies` / `DDBJ BioProject 公式ページ` の 3 link
  - 最終更新 row に `最終更新` Tag + `<time dateTime="2026-05-25T00:00:00Z">` の可視テキスト `2026年5月25日`

### S-CONTENT-02: ?lang=en で /databases/bioproject の en 表示

- **ペルソナ**: P-ANON
- **前提**: cookie 未設定 (lang cookie が無い初期状態)
- **手順**:
  1. `/databases/bioproject?lang=en` を訪問
- **期待**:
  - root loader が `?lang=en` を検出 → `lang` param を削除した URL `/databases/bioproject` へ HTTP 302 redirect
  - redirect レスポンスに `Set-Cookie: db_portal_lang=en` (`SameSite=Lax`、`Path=/`、`Max-Age=31536000`、staging では `Secure` 付き)
  - redirect 先で `<html lang="en">`
  - `<h1>BioProject</h1>` + en description、本文 Section に body[en]
  - Breadcrumb は 2 セグメント `Home` link (`href="/"`) → `aria-current="page"` span `BioProject`。URL / 内部 link に `/en` prefix は付かない (`/en` route は存在しない)
  - 関連データベース見出しが `Related databases`、外部リンク見出しが `External links`、最終更新ラベルが `Last updated` で、`<time>` の可視テキストが `May 25, 2026` (en-US locale)
  - `data-testid="translation-unavailable"` 要素が 0 件 (handle.i18n.en === "complete")
- **備考**: 言語選択は cookie 永続。redirect 後に同一 context で `/databases/biosample` を訪問しても (`?lang` 無し) cookie により en 表示が維持されることを確認してもよい

### S-CONTENT-03: /databases/biosample ja 表示

- **ペルソナ**: P-ANON
- **前提**: cookie 未設定 (default lang ja)
- **手順**:
  1. `/databases/biosample` を訪問
- **期待**:
  - `<h1>BioSample</h1>` (level 1) + body[ja]
  - 本文に SAMD アクセッション説明テキスト (`/SAMD/` に一致する可視テキスト) が含まれる
  - 関連データベース section に `BioProject` の TextLink (`href="/databases/bioproject"`)
  - 外部リンク section に `NCBI BioSample` / `EBI BioSamples` / `DDBJ BioSample 公式ページ` の 3 link
  - 最終更新 row の `<time dateTime="2026-05-25T00:00:00Z">` 可視テキストが `2026年5月25日`

### S-CONTENT-04: 実 route 構成どおりの breadcrumb chain

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/databases/bioproject` を訪問
  2. 同一 context で `/databases/bioproject?lang=en` を訪問 (302 redirect 後 `/databases/bioproject`)
- **期待**:
  - ja: breadcrumb nav の `<li>` が **正確に 2 件**。`getByRole("link", { name: "ホーム" })` の `href="/"`、最後のセグメントが `getByRole` で取得できない `aria-current="page"` span `BioProject`。`データベース` テキストを含む `<li>` は **存在しない**
  - en: 同様に 2 件で `Home` link (`href="/"`) → `aria-current="page"` span `BioProject`。`Databases` の中間セグメントは存在しない
  - いずれも leaf は link ではなく span (`aria-current="page"`) として描画され、クリック不能
- **備考**: `databases` の中間 breadcrumb を将来導入する場合は本シナリオの期待値 (2 → 3 セグメント) を更新する。breadcrumb の i18n key 自体 (`breadcrumb.databases` = `データベース` / `Databases`) は存在するが、現 route 構成ではどの match もこの key を breadcrumbI18nKey として宣言していないため描画されない

### S-CONTENT-05: データベース詳細の document title が reverse-breadcrumb

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/databases/bioproject` を訪問し `page.title()` を取得
  2. `/databases/bioproject?lang=en` を訪問し (redirect 後) `page.title()` を取得
- **期待**:
  - 両方とも document title が `BioProject | Databases | BSI` (leaf-first reverse-breadcrumb + brand `BSI`)
  - title は lang に依存せず英語固定 (ja 訪問でも `データベース` ではなく `Databases`、brand は常に `BSI`)
- **備考**: ここでの `Databases` は title resolver (`database-content` → `["Databases", db.title.en]`) 由来であり、S-CONTENT-04 の breadcrumb に中間セグメントが無いこととは独立。title resolver と breadcrumb resolver は別系統

### S-CONTENT-06: 外部リンクの属性と最終更新日の locale 整形

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/databases/bioproject` を訪問
  2. `/databases/bioproject?lang=en` を訪問 (redirect 後)
- **期待**:
  - 外部リンク section の 3 link がそれぞれ `target="_blank"` かつ `rel` に `noopener` と `noreferrer` を含む。href は順に `https://www.ncbi.nlm.nih.gov/bioproject/` / `https://www.ebi.ac.uk/biostudies/` / `https://www.ddbj.nig.ac.jp/bioproject/index.html`
  - ja: `<time dateTime="2026-05-25T00:00:00Z">` の可視テキストが `2026年5月25日` (ja-JP `toLocaleDateString`)
  - en: 同 `<time>` の `dateTime` が `2026-05-25T00:00:00Z` のまま、可視テキストが `May 25, 2026` (en-US)
- **備考**: 不正な lastUpdated 文字列に対する raw-iso fallback (formatDate の NaN 分岐) は実コンテンツに存在しないため component 単体テスト側で固定する

### E-CONTENT-01: 未知 slug で 404

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/databases/unknown-slug` を訪問 (URL を直接 navigation。server / API は通常運転)
- **期待**:
  - HTTP 404 (loader が `getDatabaseBySlug` undefined で `throw new Response("Not Found", { status: 404 })`)
  - root ErrorBoundary が not-found 表示 (`<h1>` が `/ページが見つかりません|not found/i` に一致)
  - トップへ戻る link が表示される

### E-CONTENT-02: 翻訳未完成バナー — e2e 取り下げ

`TranslationUnavailable` バナーは route handle の `i18n.en` が `"missing"` / `"partial"` のときだけ描画される。`$slug.tsx` は全 slug に `handle.i18n.en = "complete"` を hardcode しており、出荷済みの bioproject / biosample も ja/en 完訳のため、実データベース route にバナー描画経路が存在しない (= e2e で再現できる状態を作れない)。バナーのロジック (`role="status"` / `aria-live="polite"` / `translationUnavailable.title` / `description` / `POST /api/set-lang` の switch button) は synthetic handle を用いた `tests/unit/shell/translation-unavailable.test.tsx` で担保する。未翻訳データベースが追加され handle が `partial` / `missing` に下がった時点で e2e 化を再検討する。


## Flow (cross-cutting) Domain

ドメイン横断のユーザージャーニーと、どの単一ドメインも所有しないサイト全体の不変量 (i18n / a11y / SEO エンドポイント / 汎用 404) を扱う。各ページを単独で検証するドメイン spec では構造的に観測できない、ルーター・URL state・session cookie・lang cookie の伝播を貫通で確認する。

### S-FLOW-01: 検索 → DB 解説ページ → browser back で q= 保持

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済、ddbj-search-api staging 到達可能
- **手順**:
  1. `/` を開く
  2. Hero の SearchBox に `cancer` と入力し submit → `/search/results?q=cancer` に遷移
  3. BioProject のクロス DB カード (`[data-testid="db-card"][data-db="bioproject"]`) の「結果一覧」 (`search.results.cross.viewAll`) link をクリック → `/search/results?q=cancer&db=bioproject` に遷移
  4. `/databases/bioproject` を開く (per-DB 結果カードとコンテンツ route は loader を共有しないクロスドメインのホップ)
  5. ブラウザの戻る (`page.goBack()`) を実行
- **期待**:
  - 手順 2 後、URL が `/search/results?q=cancer`、クロス DB ヒット数カード群が描画される
  - 手順 3 後、URL が `/search/results?q=cancer&db=bioproject`、per-DB record card list が表示される
  - 手順 4 後、`<h1>BioProject</h1>` (コンテンツ解説) と Breadcrumb `ホーム > BioProject` (flat route のため中間 `データベース` segment は無い) が表示される
  - 手順 5 後、URL が `/search/results?q=cancer&db=bioproject` に戻り、`?q=cancer` が保持された状態で per-DB 結果が復元される (ScrollRestoration により再 fetch 後も結果が描画される)
- **備考**: 検索結果取得を含むため `waitForLoadState("networkidle")` を併用し、検索系の待機 timeout は 15-20 秒まで許容する (notes.md §4.1)。

### S-FLOW-02: login → /submit → logout で Header が各遷移を反映

- **ペルソナ**: P-USER
- **前提**: `DB_PORTAL_E2E_USER_PASSWORD` が設定済 (Keycloak `staging` realm の `ts-db-portal-dev`)。本シナリオは login 動作を画面から実行するため、storage state を読まない fresh context で起動する (`test.beforeEach` で `clearCookies` + storage clear)
- **手順**:
  1. fresh context で `/submit` を開く
  2. Header 右の「ログイン」 (`auth.login` = "ログイン") link をクリック → Keycloak へ
  3. Keycloak のログインフォームに e2e テストユーザーの認証情報を入力して submit
  4. portal に戻ったら Header に user 名 + 「ログアウト」 が表示されることを確認
  5. Header の「ログアウト」 (`auth.logout`) link をクリックして Keycloak の logout を経由する
- **期待**:
  - 手順 1 時点で `/api/me` が 401、Header 右に「ログイン」 link (href は `buildLoginUrl("/submit")` = `/api/auth/login?return_to=%2Fsubmit`)
  - 手順 2 で `/api/auth/login` → Keycloak authorization URL に 302
  - 手順 3-4 後、callback で token 交換が成功し `Set-Cookie: sid=...; HttpOnly; SameSite=Lax` が発行され、`return_to` の `/submit` に戻る。`/api/me` が 200 で user 情報を返し、Header 右に user 名 + 「ログアウト」 (href は `buildLogoutUrl("/submit")` = `/api/auth/logout?return_to=%2Fsubmit`)
  - 手順 5 後、`/api/auth/logout` → Keycloak `end_session_endpoint` 経由で `/api/auth/logout-callback` に戻り、session 削除 + `Set-Cookie: sid=; Max-Age=0`。`/api/me` が再び 401、Header 右が「ログイン」 link に戻る
- **備考**: session cookie の navigations をまたいだ伝播は貫通でしか観測できない。Keycloak refresh token Idle (30 分) 超過で失敗するため、長時間放置後は再実行する (notes.md §3.3)。

### S-FLOW-03: サイト横断 i18n 一貫性 (?lang=en → cookie 永続、/en prefix 不在)

- **ペルソナ**: P-ANON
- **前提**: fresh context (lang cookie 未設定)。`DB_PORTAL_DEFAULT_LANG` は `ja` (staging default)
- **手順**:
  1. `/?lang=en` を開く
  2. 続けて `/search`、`/news`、`/services`、`/databases/bioproject` を順に開く (クエリ無し)
  3. Header の言語切替ボタン (`a11y.languageSwitcher` = "言語切替") をクリックして `ja` に戻す
- **期待**:
  - 手順 1 で 302 redirect により `lang` param が除去され、最終 URL は `/` (prefix 無し)。`<html lang="en">`。`Set-Cookie: db_portal_lang=en; Path=/; SameSite=Lax; Max-Age=31536000; Secure`
  - 手順 2 の全 route で `<html lang="en">` が維持され、URL に `/en` prefix が一切付かない (`/search`、`/news`、`/services`、`/databases/bioproject` のまま)。Header nav が英語表記 (`nav.search` = "Search"、`nav.submit` = "Submit")
  - 内部リンク (Header nav、Breadcrumb、関連 DB の TextLink) の href がいずれも `/en` prefix を含まない
  - 手順 3 で `/api/set-lang` に POST → 303 (`Location` は Referer)、`Set-Cookie: db_portal_lang=ja; ...`。リロード後 `<html lang="ja">`、Header nav が日本語 (`nav.search` = "検索")
- **備考**: routes.ts に `/en` route は存在しない (lang は cookie + `?lang=` のみ)。この不変量を 1 シナリオで横断的に固定し、`/en` prefix 前提の stale 記述を 1 箇所で排除する。

### S-FLOW-04: Header nav の aria-current と SkipLink キーボード a11y

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/search` を開く
  2. ページ最上部から `Tab` を 1 回押下し、最初のフォーカス可能要素 (SkipLink) にフォーカスを移す
  3. `Enter` を押下して SkipLink を実行する
  4. `/submit` を開いて nav の active 状態を確認する
- **期待**:
  - 手順 1 で Header の「検索」 nav link (`nav.search`) が `aria-current="page"` を持ち、「登録」 link は `aria-current` を持たない (computeActiveNav が `/search` → search)
  - 手順 2 で `<a href="#main">` の SkipLink (`a11y.skipToContent` = "メインコンテンツへスキップ") が `focus:not-sr-only` で可視化され、フォーカスを得る
  - 手順 3 後、フォーカスが `<main id="main">` に移動する (`document.activeElement` の id が `main`、または URL hash が `#main`)
  - 手順 4 で `/submit` では「登録」 link (`nav.submit`) が `aria-current="page"` を持ち、「検索」 link は持たない。`/` (トップ) では検索・登録のどちらも `aria-current` を持たない (computeActiveNav が null)
  - 「About us」 (`nav.about`) は外部 `<a target="_blank">` で、内部 nav の active 判定対象外 (`aria-current` を持たない)
- **備考**: アクセシビリティ landmark とキーボード nav はサイト全体の横断要件で、実ブラウザでしか検証できない。

### E-FLOW-01: robots.txt / sitemap.xml エンドポイントの content-type と実 slug 反映

- **ペルソナ**: P-ANON
- **前提**: staging (`DB_PORTAL_ENV` は production 以外)。robots は production と非 production で内容が分岐する
- **手順**:
  1. `page.request.get("/robots.txt")` で取得する
  2. `page.request.get("/sitemap.xml")` で取得する
- **期待**:
  - `/robots.txt`: HTTP 200、`content-type` が `text/plain` を含む。本文に `User-agent: *` を含む。production では `Sitemap: <origin>/sitemap.xml` 行を含み、非 production (staging) では `Disallow: /` を含む
  - `/sitemap.xml`: HTTP 200、`content-type` が `application/xml` を含む。`<urlset>` 配下に `app/content/databases` の実 slug を反映した `/databases/bioproject?lang=ja` および `?lang=en` の `<loc>` を含み、各 `<url>` が `<xhtml:link rel="alternate" hreflang="ja|en|x-default">` の 3 alternates を持つ。静的 path (`/`、`/search`、`/submit`、`/news`) も ja/en 2 件ずつ含む
- **備考**: 純関数 (`renderRobotsTxt` / `buildSitemapEntries` / `renderSitemapXml`) は unit + pbt 済だが、express handler の wiring・content-type・`listDatabaseSlugs` の実ファイルシステム読み取りは served エンドポイントを叩かないと検証できない。robots の production 分岐 (`Sitemap:` 行) は production deploy でのみ確認可能で、staging では `Disallow: /` 側を確認する (production 側は production smoke test で確認、定義のみ until production)。

### E-FLOW-02: 未知のトップレベル route で汎用 404 ErrorBoundary

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/totally-unknown` を直接 navigation する (URL を直接組み立て、server / API は通常運転)
- **期待**:
  - HTTP 404 (routes.ts に catch-all / splat route が無いため、React Router の no-match → root ErrorBoundary の `not-found` kind に解決される)
  - `role="alert"` の ErrorPage が描画され、`PageTitle` に `errors.notFound.title` (= "ページが見つかりません") が表示される
  - 「トップへ戻る」 (`errors.notFound.backToTop`) の TextLink が `/` を href に持ち、Header / SkipLink を含む app shell ごと描画される (ErrorBoundary が ShellLayout でラップされる)
- **備考**: E-CONTENT-01 (`/databases/unknown-slug`) は `$slug` loader が `Response(404)` を投げる別経路。本シナリオは loader を持たない no-match 経路を分離して固定し、root ErrorBoundary の 404 マッピング回帰を検出する。
