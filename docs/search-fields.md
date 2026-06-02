# Search fields

ES に実在する field (ddbj-search-converter の mapping) を起点に、各層の対応を一覧する地図。`search.md` (UI 状態と API 呼び出し境界) を field 軸で補完する。

詳細 SSOT は各層のコード:

- ES の型 (実際に index に入っている field): ddbj-search-converter `es/mappings/`
- DSL allowlist (field / tier / 演算子): ddbj-search-api `search/dsl/allowlist.py`
- REST `/entries` の term / text 区分: ddbj-search-api `es/query.py` (`_TERM_FILTER_FIELDS` / `_TEXT_MATCH_FIELDS`)
- Sidebar filter 行: `app/features/search/sidebar/facet-config.ts`
- Advanced builder の field (scope 別カタログ): `app/features/search/advanced/field-catalog.ts` (`fieldsForScope` / `FIELD_OPS`)
- 検索結果リストの表示 field (per-DB の見せ方 / detail link 生成): `app/features/search/results/result-fields.ts` (規約は `search.md` § Result row)

## 前提構造

検索対象は **ES 6 DB** (bioproject / biosample / sra / jga / gea / metabobank、物理 14 index = sra-\* 6 + jga-\* 4 を含む) と **Solr 2 DB** (trad = ARSA / taxonomy = TXSearch)。後者は converter の ES mapping 外で、field は ARSA / TXSearch schema が持つ。本書の ES 対応表は ES 6 DB を対象とする。

field は **全 DB 共通** (converter common mapping) と **DB ごと** (type-specific mapping) に分かれる。

検索の 3 面と、各面がどの field を扱うか:

| 面         | UI / 経路                                                    | 対象 field                                                             | scope 依存                  |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------- |
| query      | keyword box の free_text                                     | 既定 5 field (identifier / title / name / description / organism.name) | なし                        |
| filter (1) | Advanced builder (`/search`)                                 | 共通 field + 選択中 DB scope の DBごと field                           | あり (scope セレクタで切替) |
| filter (2) | Sidebar (`/search/results`)                                  | cross = 共通の一部 / per-DB = 共通 + その DB の DBごと field           | あり                        |
| facet      | `/db-portal/{search,cross-search}` の `facets` 集計 (opt-in) | 集計は常に keyword field                                               | あり                        |

「filter」は 2 つの別 UI である (Advanced builder = `/search` のみの OR / NOT / グルーピング可エディタ、Sidebar = `/search/results` の AND of rows)。どちらも scope に応じて field 候補が変わる (cross = 共通 Tier1/2、単一 DB = 共通 + その DB の DBごと field)。scope 切替の挙動・live sync・field 候補の供給規則は `search.md` § Advanced builder / § Sidebar facet を参照。

## 全 DB 共通 field

ES common mapping (全 type に merge) 起点。「横断」= cross-DB の `q` に載せられるか (DSL Tier1/2 = 可、Tier3 = per-DB のみ)。

op / type は DSL field type から機械導出する ([§ DSL field type 規約](#dsl-field-type-規約))。どの scope の Sidebar / facet にどの field が出るかは `facet-config.ts` (`SCOPE_FILTERS`) が SSOT で、その表示規則は `search.md` § scope 別の filter 構成 を参照。

| ES field (type)                                    | DSL field             | 横断   | 備考 (条件付き merge / subtype 所在) |
| -------------------------------------------------- | --------------------- | ------ | ------------------------------------ |
| identifier (keyword)                               | `identifier`          | ○      | —                                    |
| name (text+keyword)                                | `name`                | ○      | keyword box 既定 field の 1 つ       |
| title (text)                                       | `title`               | ○      | keyword box 既定 field の 1 つ       |
| description (text)                                 | `description`         | ○      | keyword box 既定 field の 1 つ       |
| organism.identifier (keyword)                      | `organism_id`         | ○      | —                                    |
| organism.name (text+keyword)                       | `organism_name`       | ○      | keyword box 既定 field の 1 つ       |
| accessibility (keyword)                            | `accessibility`       | ○      | —                                    |
| datePublished (date)                               | `date_published`      | ○      | —                                    |
| dateModified (date)                                | `date_modified`       | ○      | —                                    |
| dateCreated (date)                                 | `date_created`        | ○      | —                                    |
| organization.name (nested text)                    | `submitter`           | ○      | —                                    |
| publication.title (nested text)                    | `publication`         | ○      | bioproject / sra 全 / gea / metabobank / jga-study にのみ merge |
| grant.title (nested text)                          | `grant_title`         | per-DB | bioproject / jga-study にのみ merge  |
| grant.agency.name (2-level nested)                 | `grant_agency`        | per-DB | bioproject / jga-study にのみ merge  |
| externalLink.label (nested)                        | `external_link_label` | per-DB | bioproject / 全 jga にのみ merge     |
| type (keyword)                                     | `type`                | per-DB | subtype 識別子 (例 `sra-experiment` / `jga-dataset`) |
| isPartOf (keyword)                                 | —                     | —      | 粗い DB 区分。絞り込みは scope selector が担う (filter 非対象) |
| status (keyword)                                   | —                     | —      | router が内部注入 (parameter 非露出) |
| url / properties / dbXrefs / distribution / sameAs | —                     | —      | `index:False` / `enabled:False` で検索対象外 |

## DB ごと field (ES 6 DB)

DSL field type (enum / text / identifier) から op を機械導出する ([§ DSL field type 規約](#dsl-field-type-規約))。enum / text の区分は REST `/entries` の term / text 区分に従う。どの scope の Sidebar / facet にどの field が出るかは `facet-config.ts` (`SCOPE_FILTERS`) が SSOT で、その表示規則は `search.md` § scope 別の filter 構成 を参照。

| DB         | ES field (type)                                  | DSL field                                        | type       | subtype 所在    |
| ---------- | ------------------------------------------------ | ------------------------------------------------ | ---------- | --------------- |
| bioproject | objectType (keyword)                             | `object_type`                                    | enum       | —               |
|            | projectType (text+keyword)                       | `project_type`                                   | text       | —               |
|            | relevance (keyword)                              | `relevance`                                      | enum       | —               |
| biosample  | package.name (keyword)                           | `package`                                        | enum       | —               |
|            | model (keyword)                                  | `model`                                          | enum       | —               |
|            | host (text+keyword)                              | `host`                                           | text       | —               |
|            | strain / isolate (text)                          | `strain` / `isolate`                             | text       | —               |
|            | geoLocName / collectionDate (text)               | `geo_loc_name` / `collection_date`               | text       | —               |
|            | derivedFrom.identifier (nested keyword)          | `derived_from_id`                                | identifier | —               |
| sra        | type (keyword)                                   | `type`                                           | enum       | —               |
|            | libraryStrategy (text+keyword)                   | `library_strategy`                               | enum       | sra-experiment  |
|            | librarySource (text+keyword)                     | `library_source`                                 | enum       | sra-experiment  |
|            | librarySelection (text+keyword)                  | `library_selection`                              | enum       | sra-experiment  |
|            | libraryLayout (text+keyword)                     | `library_layout`                                 | enum       | sra-experiment  |
|            | platform (text+keyword)                          | `platform`                                       | enum       | sra-experiment  |
|            | instrumentModel (text+keyword)                   | `instrument_model`                               | enum       | sra-experiment  |
|            | analysisType (text+keyword)                      | `analysis_type`                                  | enum       | sra-analysis    |
|            | libraryName / libraryConstructionProtocol (text) | `library_name` / `library_construction_protocol` | text       | sra-experiment  |
|            | geoLocName / collectionDate (text)               | `geo_loc_name` / `collection_date`               | text       | sra-sample      |
|            | derivedFrom.identifier (nested keyword)          | `derived_from_id`                                | identifier | sra-sample      |
| jga        | type (keyword)                                   | `type`                                           | enum       | —               |
|            | studyType (text+keyword)                         | `study_type`                                     | enum       | —               |
|            | datasetType (text+keyword)                       | `dataset_type`                                   | enum       | —               |
|            | vendor (text+keyword)                            | `vendor`                                         | text       | —               |
| gea        | experimentType (text+keyword)                    | `experiment_type`                                | enum       | —               |
| metabobank | studyType (text+keyword)                         | `study_type`                                     | enum       | —               |
|            | experimentType (text+keyword)                    | `experiment_type`                                | enum       | —               |
|            | submissionType (text+keyword)                    | `submission_type`                                | enum       | —               |

- `type` は subtype 識別子。SRA subtype = sra-submission / sra-study / sra-experiment / sra-run / sra-sample / sra-analysis、JGA subtype = jga-study / jga-dataset / jga-policy / jga-dac。`db=sra` / `db=jga` は subtype 横断なので、対応しない subtype の doc では空 bucket になり自然に脱落する。
- trad / taxonomy (Solr) の field は ARSA / TXSearch schema を参照 (本書の ES 対応表の対象外)。

## DSL field type 規約

DSL `field:value` の演算子は field type から導出される (`allowlist.py` の `OPERATOR_BY_KIND`):

| field type | 取り得る演算子      | 意味                              |
| ---------- | ------------------- | --------------------------------- |
| identifier | eq / wildcard       | keyword 完全一致 / ワイルドカード |
| enum       | eq                  | keyword (`.keyword`) 完全一致     |
| text       | contains / wildcard | analyzed な match_phrase          |
| date       | between / eq        | 範囲 / 単日                       |
| number     | between / eq        | 数値範囲 / 単値                   |

controlled-vocab 系を enum (term) にするか text (match) にするかは、**通常 search API (`/entries`) の term / text 区分に合わせる** (REST が SSOT): REST が `.keyword` で term filter する field は DSL enum、`match` する field は DSL text。どの field がどちらかは ddbj-search-api `es/query.py` (`_TERM_FILTER_FIELDS` / `_TEXT_MATCH_FIELDS`) を参照。

この区分は **facet bucket の再注入の正しさ**に直結する。facet 集計は常に keyword field (`.keyword`) で行うので bucket 値は exact。これを filter に再注入するとき、enum field は `eq` で完全一致するが、text field は `contains` (analyzed match_phrase) になり結果が広がりうる (bucket 件数 ⊆ 検索結果件数)。Sidebar facet 行の op はこの区分に従う (enum = eq / text = contains)。`vendor` は REST が text のため facet だが op = contains となり、この非対称が残る (完全一致したい場合は値を quote して phrase 化)。

## 表示規則

scope (cross / 各 DB) ごとにどの field を Advanced builder / Sidebar / facet に出すか、facet 集計の opt-in、Solr backed (trad / taxonomy) の degenerate 行の扱いは `search.md` § Advanced builder / § Sidebar facet / § scope 別の filter 構成 を参照。本書は ES field → DSL field の写像に専念する。
