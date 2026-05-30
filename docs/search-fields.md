# Search fields

ES に実在する field (ddbj-search-converter の mapping) を起点に、各層の対応を一覧する地図。`search.md` (UI 状態と API 呼び出し境界) を field 軸で補完する。

詳細 SSOT は各層のコード:

- ES の型 (実際に index に入っている field): ddbj-search-converter `es/mappings/`
- DSL allowlist (field / tier / 演算子): ddbj-search-api `search/dsl/allowlist.py`
- REST `/entries` の term / text 区分: ddbj-search-api `es/query.py` (`_TERM_FILTER_FIELDS` / `_TEXT_MATCH_FIELDS`)
- Sidebar filter 行: `app/features/search/sidebar/facet-config.ts`
- Advanced builder の field: `app/features/search/types.ts` (`ADVANCED_FIELDS` / `FIELD_OPS`)

## 前提構造

検索対象は **ES 6 DB** (bioproject / biosample / sra / jga / gea / metabobank、物理 14 index = sra-\* 6 + jga-\* 4 を含む) と **Solr 2 DB** (trad = ARSA / taxonomy = TXSearch)。後者は converter の ES mapping 外で、field は ARSA / TXSearch schema が持つ。本書の ES 対応表は ES 6 DB を対象とする。

field は **全 DB 共通** (converter common mapping) と **DB ごと** (type-specific mapping) に分かれる。

検索の 3 面と、各面がどの field を扱うか:

| 面 | UI / 経路 | 対象 field | scope 依存 |
|---|---|---|---|
| query | keyword box の free_text | 既定 5 field (identifier / title / name / description / organism.name) | なし |
| filter (1) | Advanced builder (`/search`) | **全 DB 共通 field のみ** | なし (cross / per-DB とも同一) |
| filter (2) | Sidebar (`/search/results`) | cross = 共通の一部 / per-DB = 共通 + その DB の DBごと field | あり |
| facet | `/db-portal/{search,cross-search}` の `facets` 集計 (opt-in) | 集計は常に keyword field | あり |

「filter」は 2 つの別 UI である。Advanced builder は OR / NOT / グルーピングを表せる共通 field 専用エディタ (`/search` のみ)。Sidebar は AND of rows で、scope に応じて DBごと field を出す (`/search/results` で唯一の編集可能 filter)。**DBごと field の絞り込みは Sidebar が担い、Advanced builder には出さない** (per-DB で Tier3 を builder に載せると cross 復帰時に検証不能になるため)。

## 全 DB 共通 field

ES common mapping (全 type に merge) 起点。「横断」= cross-DB の `q` に載せられるか (DSL Tier1/2 = 可、Tier3 = per-DB のみ)。

| ES field (type) | DSL field | 横断 | Advanced builder | Sidebar | facet |
|---|---|---|---|---|---|
| identifier (keyword) | `identifier` | ○ | ○ (eq / wildcard) | — | — |
| name (text+keyword) | `name` | ○ | ○ (eq / contains) | — | — |
| title (text) | `title` | ○ | ○ (eq / contains) | — | — |
| description (text) | `description` | ○ | ○ (eq / contains) | — | — |
| organism.identifier (keyword) | `organism_id` | ○ | ○ (eq / wildcard) | facet (全 ES DB) | organism |
| organism.name (text+keyword) | `organism_name` | ○ | ○ (eq / contains) | text (trad のみ) | (organism の label) |
| accessibility (keyword) | `accessibility` | ○ | ○ (eq) | — | — |
| datePublished (date) | `date_published` | ○ | ○ (between) | range (全 scope) | — |
| dateModified (date) | `date_modified` | ○ | ○ (between) | — | — |
| dateCreated (date) | `date_created` | ○ | ○ (between) | — | — |
| organization.name (nested text) | `submitter` | ○ | ○ (eq / contains) | text (6 ES DB) | — |
| publication.title (nested text) | `publication` | ○ | ○ (eq / contains) | — | — |
| grant.title (nested text) | `grant_title` | per-DB | — | text (bioproject / jga) | — |
| grant.agency.name (2-level nested) | `grant_agency` | per-DB | — | text (bioproject / jga) | — |
| externalLink.label (nested) | `external_link_label` | per-DB | — | text (bioproject / jga) | — |
| type (keyword) | `type` | per-DB | — | facet (sra / jga) | type (sra / jga) |
| isPartOf (keyword) | — | — | — | — | — |
| status (keyword) | — | — | — | — | — |
| url / properties / dbXrefs / distribution / sameAs | — | — | — | — | — |

注:

- `name` は keyword box の既定 5 field の 1 つ。field 指定検索 (`name:...`) と builder 行も持つ。
- `type` は subtype 識別子 (例 `sra-experiment` / `jga-dataset`)。`isPartOf` は粗い DB 区分で、DB の絞り込みは scope selector が担う (filter には出さない)。
- `status` は router が内部注入する (parameter として露出しない)。`url` / `properties` / `dbXrefs` / `distribution` / `sameAs` は `index:False` / `enabled:False` で検索対象外。
- `grant` は bioproject / jga-study、`externalLink` は bioproject / 全 jga、`publication` は bioproject / sra 全 / gea / metabobank / jga-study にのみ merge される条件付き共通 field。

## DB ごと field (ES 6 DB)

DSL type は REST `/entries` の term / text 区分に合わせる ([§ DSL field type 規約](#dsl-field-type-規約))。Sidebar op は DSL type に従う (enum / identifier → eq、text → contains)。

| DB | ES field (type) | DSL field | DSL type | Sidebar (kind / op) | facet |
|---|---|---|---|---|---|
| bioproject | objectType (keyword) | `object_type` | enum | facet / eq | objectType |
| | projectType (text+keyword) | `project_type` | text | text / contains | projectType |
| | relevance (keyword) | `relevance` | enum | facet / eq | relevance |
| biosample | package.name (keyword) | `package` | enum | facet / eq | package |
| | model (keyword) | `model` | enum | facet / eq | model |
| | host (text+keyword) | `host` | text | text / contains | host |
| | strain / isolate (text) | `strain` / `isolate` | text | text / contains | — |
| | geoLocName / collectionDate (text) | `geo_loc_name` / `collection_date` | text | text / contains | — |
| | derivedFrom.identifier (nested keyword) | `derived_from_id` | identifier | text / eq | — |
| sra | type (keyword) | `type` | enum | facet / eq | type |
| | libraryStrategy (text+keyword) | `library_strategy` | enum | facet / eq | libraryStrategy |
| | librarySource (text+keyword) | `library_source` | enum | facet / eq | librarySource |
| | librarySelection (text+keyword) | `library_selection` | enum | facet / eq | librarySelection |
| | libraryLayout (text+keyword) | `library_layout` | enum | facet / eq | libraryLayout |
| | platform (text+keyword) | `platform` | enum | facet / eq | platform |
| | instrumentModel (text+keyword) | `instrument_model` | enum | facet / eq | instrumentModel |
| | analysisType (text+keyword) | `analysis_type` | enum | facet / eq | analysisType |
| | libraryName / libraryConstructionProtocol (text) | `library_name` / `library_construction_protocol` | text | text / contains | — |
| | geoLocName / collectionDate (text) | `geo_loc_name` / `collection_date` | text | text / contains | — |
| | derivedFrom.identifier (nested keyword) | `derived_from_id` | identifier | text / eq | — |
| jga | type (keyword) | `type` | enum | facet / eq | type |
| | studyType (text+keyword) | `study_type` | enum | facet / eq | studyType |
| | datasetType (text+keyword) | `dataset_type` | enum | facet / eq | datasetType |
| | vendor (text+keyword) | `vendor` | text | text / contains | vendor |
| gea | experimentType (text+keyword) | `experiment_type` | enum | facet / eq | experimentType |
| metabobank | studyType (text+keyword) | `study_type` | enum | facet / eq | studyType |
| | experimentType (text+keyword) | `experiment_type` | enum | facet / eq | experimentType |
| | submissionType (text+keyword) | `submission_type` | enum | facet / eq | submissionType |

- `type` facet は subtype の絞り込み。SRA subtype = sra-submission / sra-study / sra-experiment / sra-run / sra-sample / sra-analysis、JGA subtype = jga-study / jga-dataset / jga-policy / jga-dac。`type` field 自体は common だが、subtype が複数ある sra / jga の per-DB でのみ facet として出す。
- sra の subtype 別 field 所在: `library_*` / `platform` / `instrument_model` は sra-experiment、`analysis_type` は sra-analysis、`geo_loc_name` / `collection_date` / `derived_from_id` は sra-sample。`db=sra` は subtype 横断なので、対応しない subtype の doc では空 bucket になり自然に脱落する。
- trad / taxonomy (Solr) の field は `facet-config.ts` の該当 scope と ARSA / TXSearch schema を参照。

## DSL field type 規約

DSL `field:value` の演算子は field type から導出される (`allowlist.py` の `OPERATOR_BY_KIND`):

| field type | 取り得る演算子 | 意味 |
|---|---|---|
| identifier | eq / wildcard | keyword 完全一致 / ワイルドカード |
| enum | eq | keyword (`.keyword`) 完全一致 |
| text | contains / wildcard | analyzed な match_phrase |
| date | between / eq | 範囲 / 単日 |
| number | between / eq | 数値範囲 / 単値 |

controlled-vocab 系を enum (term) にするか text (match) にするかは、**通常 search API (`/entries`) の term / text 区分に合わせる** (REST が SSOT):

- REST term (`.keyword`) → DSL enum: `library_strategy` / `library_source` / `library_selection` / `library_layout` / `platform` / `instrument_model` / `analysis_type` / `study_type` / `dataset_type` / `experiment_type` / `submission_type` / `relevance` / `package` / `model` / `object_type` / `type`
- REST text (match) → DSL text: `project_type` / `host` / `strain` / `isolate` / `geo_loc_name` / `collection_date` / `library_name` / `library_construction_protocol` / `vendor`

この区分は **facet bucket の再注入の正しさ**に直結する。facet 集計は常に keyword field (`.keyword`) で行うので bucket 値は exact。これを filter に再注入するとき、enum field は `eq` で完全一致するが、text field は `contains` (analyzed match_phrase) になり結果が広がりうる (bucket 件数 ⊆ 検索結果件数)。Sidebar facet 行の op はこの区分に従う (enum = eq / text = contains)。`vendor` は REST が text のため facet だが op = contains となり、この非対称が残る (完全一致したい場合は値を quote して phrase 化)。

## cross / per-DB の表示規則

- **Advanced builder** (`/search`): 全 scope で共通 field のみ (横断可 = Tier1/2)。scope で field 集合を変えない。
- **Sidebar cross** (`/search/results`、db 未指定): 横断可の field だけ。organism (facet) + datePublished (range)。Tier3 を載せると cross の `q` で弾かれるため出さない。
- **Sidebar per-DB** (`/search/results?db=<id>`): 共通 (organism / submitter / datePublished 等) + その DB の DBごと field。sra / jga は subtype を絞る `type` facet を含む。
- **facet 集計**: scope の facet 行に対応する名前を `facets` param で要求する (opt-in)。cross は横断 facet (organism)、per-DB は共通 + その DB の type-specific facet + `type` (sra / jga)。
- Solr backed の trad / taxonomy では degenerate する行を出さない (trad: organism / submitter、taxonomy: organism / submitter / datePublished)。
