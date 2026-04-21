# 検索バックエンド

DDBJ Search API が束ねる 3 つのバックエンド（DDBJ Search の ES / ARSA / TXSearch）の詳細仕様。DB ポータルの UI 仕様は [search.md](./search.md)。

| バックエンド | 検索エンジン | 担当 DB |
|---|---|---|
| DDBJ Search | Elasticsearch | SRA, BioProject, BioSample, JGA, GEA, MetaboBank |
| ARSA | Apache Solr 4.4.0 | DDBJ (Trad) |
| TXSearch | Apache Solr 4.4.0 | Taxonomy |

DDBJ Search API は FastAPI で実装された Elasticsearch 向け API を拡張し、ARSA / TXSearch を proxy する形で全バックエンドを統一スキーマで返す（ソース: [ddbj/ddbj-search-api](https://github.com/ddbj/ddbj-search-api)）。

## DDBJ Search（Elasticsearch / 既存 API）

### エンドポイント

- 本番 API: `https://ddbj.nig.ac.jp/search/api`
- レスポンス: JSON

| メソッド | パス | ルーター |
|---|---|---|
| GET | `/entries/` | `routers/entries.py` (`_list_all_entries`) |
| GET | `/entries/{type}/` | `routers/entries.py` (`_make_type_search_handler`) |
| GET | `/entries/{type}/{id}` | `routers/entry_detail.py` |
| GET | `/entries/{type}/bulk` | `routers/bulk.py` |
| GET | `/facets` | `routers/facets.py` |
| GET | `/dblink/**` | `routers/dblink.py` |
| GET | `/service-info` | `routers/service_info.py` |

### 対応タイプ

`bioproject`, `biosample`, `sra-submission`, `sra-study`, `sra-experiment`, `sra-run`, `sra-sample`, `sra-analysis`, `jga-study`, `jga-dataset`, `jga-dac`, `jga-policy`

GEA / MetaboBank は未対応（インデックス追加が必要）。

### 検索パラメータ

| パラメータ | 説明 |
|---|---|
| `keywords` | 検索語（カンマ区切り、引用符でフレーズ） |
| `keywordFields` | 検索対象フィールド（identifier, title, name, description） |
| `keywordOperator` | AND / OR（デフォルト AND） |
| `organism` | NCBI Taxonomy ID |
| `datePublishedFrom/To` | 公開日範囲（ISO 8601） |
| `dateModifiedFrom/To` | 更新日範囲（ISO 8601） |
| `sort` | `{field}:{direction}` |
| `page` | ページ番号（1 始まり） |
| `perPage` | 1-100（デフォルト 10） |
| `cursor` | 深いページング用（10,000 件超） |

### 内部実装

- **クエリビルダ**: `es/query.py` の `build_search_query()` が `multi_match` を生成。phrase は `type: "phrase"`、AND/OR は `bool.must` / `bool.should` + `minimum_should_match`
- **横断検索**: 単一 ES index `entries` に全タイプを投入済み → multi-index query ではなく、**同一 index への単一クエリ**
- **カーソル**: `cursor.py` が ES PIT (`_pit`) + `search_after` を HMAC-SHA256 署名付き Base64 JSON でエンコード
- **ソート tiebreaker**: `build_sort_with_tiebreaker()` が `identifier` を追加

### 共通結果フィールド

`identifier`, `type`, `title`, `organism`, `description`, `publishedAt`, `relatedObjects`

スキーマは `schemas/common.py` の `EntryListItem`（`extra="allow"` で DB 別追加フィールドを受ける）。

### DB 別の追加フィールド

- **BioProject**: `projectType`, `organization`, `publication`, `grant`, `externalLink`
- **BioSample**: `attributes`（key-value 一覧）
- **SRA**: `libraryDescriptor`, `platform`
- **JGA**: controlled-access ラベル

### 設定

`config.py`。環境変数は `DDBJ_SEARCH_API_` 接頭辞:

- `es_url`（デフォルト `http://localhost:9200`）
- `es_timeout`（デフォルト 60s）
- `url_prefix`（デフォルト `/search/api`）

## ARSA

DDBJ (Trad) の塩基配列アノテーションを格納する検索エンジン。

### コンテナ構成

データ分散型 shard。1 エントリはいずれか 1 台にのみ存在。

| 環境 | ホスト | Web UI (tomcat) | Solr shard |
|---|---|---|---|
| prod | a011 | `a011:51181` | `a011:51981` 〜 `a011:51988`（8 台） |
| staging | a012 | `a012:51181` | `a012:51981` 〜 `a012:51983`（3 台） |

a012 から a011 への HTTP は疎通する。外部公開 REST API（WABI ARSA）は廃止済みだが、内部ネットワークから Solr に直接 HTTP で問い合わせて JSON を取得できる。

### Distributed Search（実測 OK）

Solr の `shards` パラメータで全 shard を集約できる。proxy 側で自前 fan-out を実装する必要はない。

```bash
curl 'http://a011:51981/solr/select?q=*:*&rows=0&wt=json&shards=a011:51981/solr,a011:51982/solr,a011:51983/solr,a011:51984/solr,a011:51985/solr,a011:51986/solr,a011:51987/solr,a011:51988/solr'
# → numFound: 295,193,072（prod 全件）
```

### 検索対象データ

DDBJ 最新リリース + 新着データのアノテーション/アセンブル済み塩基配列。**WGS・TSA の一部・MGA・DRA は対象外**。

- **Datasource**: `DDBJ`, `Patent_AA`
- **Division**: `PAT`, `EST`, `GSS`, `CON`, `TSA`, `VRL`, `INV`, `ENV`, `PLN`, `VRT`, `BCT`, `STS`, `HUM`, `MAM`, `ROD`, `HTC`, `SYN`, `PRI`, `HTG`, `PHG`, `UNA`
- **MolecularType**: `DNA`, `mRNA`, `RNA`, `cRNA`, `rRNA`, `tRNA`, `PRT` ほか

### スキーマフィールドと analyzer

**uniqueKey**: `PrimaryAccessionNumber`

全フィールドに `_regex` サフィックス版（正規表現検索用）が存在し、`copyField` で自動複写される。

| 分類 | フィールド | 型 |
|---|---|---|
| 全文 | `AllText` | `text_all` |
| 識別子 | `PrimaryAccessionNumber`, `AccessionNumber`, `_version_` | `text_st` / `string` / `long` |
| 生物情報 | `Organism`, `Organism_facet`, `Lineage` | `text_st` / `string` / `string` |
| メタデータ | `Datasource`, `Division`, `MolecularType`, `MolecularForm`, `SequenceLength`, `Date`, `State`, `Datatype`, `Keyword` | `string`（多くは string） |
| 記述 | `Definition`, `Comment` | `text_st` |
| 参考文献 | `ReferenceAuthor`, `ReferenceTitle`, `ReferenceJournal`, `ReferencePubmedID` | `text_st` |
| Feature | `Feature`, `FeatureQualifier`, `FeatureQualifier_unseparated` | `text_st` |
| 正規表現用 | `*_regex` | `text_lower` |

**analyzer 定義:**

- `text_all`（`AllText`）: `PatternTokenizer [a-zA-Z0-9]+|[^a-zA-Z0-9\s]` → `LowerCaseFilter`。英数字単位の粗いトークナイズ。ステミング・ストップワードなし
- `text_st`（`Organism`, `Definition`, 参考文献など）: Lucene `StandardAnalyzer`。標準的な英語トークナイズ + ステミングなし + ストップワード有
- `text_lower`（`*_regex`）: パターン全体を 1 トークン化（`.*` group 0）+ `LowerCaseFilter`。正規表現・ワイルドカードマッチ用

### 動作検証済み機能（実測）

- **`edismax` 利用可**: `qf` での boost 指定、`maxScore` と `score`（`fl=score`）取得可能
- **`sort` 動作**: uniqueKey `PrimaryAccessionNumber` でソート可
- **`cursorMark` は未対応**: Solr 4.4.0 は 2014 年リリースで `cursorMark` は 4.7+（`nextCursorMark` が返らない）。offset ベース（`start` + `rows`）で上位 10,000 件までは問題なく取得可。10,001 件目以降のページングは対象外とする
- **facet 動作**: `facet=true&facet.field=Division` で件数取得可
- **`/elevate`, `/spell`, `/terms`, `/tvrh`** も利用可能（今回の用途では未使用）

### クエリ例

```bash
# 単一 shard 検索
curl 'http://a011:51981/solr/select?q=Organism:Bacteria&rows=1&wt=json'

# edismax + qf boost + score
curl 'http://a011:51981/solr/select' \
  --data-urlencode 'q=xylanase' \
  --data-urlencode 'defType=edismax' \
  --data-urlencode 'qf=AllText^0.1 Definition^5 Organism^10' \
  --data-urlencode 'fl=PrimaryAccessionNumber,Organism,score' \
  --data-urlencode 'rows=10' \
  --data-urlencode 'wt=json'

# 全 shard 集約
curl 'http://a011:51981/solr/select?q=human&rows=10&wt=json&shards=a011:51981/solr,a011:51982/solr,...,a011:51988/solr'
```

### 制限

- Solr 4.4.0（2014 年リリース）。単純移行不可、再インデックスに数ヶ月要するため更新は棚上げ
- 現行 UI の表示上限: 10,000 件、ダウンロード上限: 3,000 エントリ/リクエスト
- **cursorMark 未対応** → ポータル側も 10,000 件上限で揃える（10,001 件目以降は対象外）
- 公式仕様書なし
- クエリ構文リファレンス: [Apache Solr 4.4 Reference Guide](https://archive.apache.org/dist/lucene/solr/ref-guide/apache-solr-ref-guide-4.4.pdf)

### インデックス更新

日次バッチ運用と推定（8 shard が並列で同時 commit）。proxy 実装は「少なくとも 1 日 1 回リフレッシュされる」前提で扱う。

### Quick Search / Advanced Search（現行 UI）

現行 UI の Advanced Search フィールドは、ARSA スキーマのフィールドに 1 対 1 で対応する。ポータル側では Advanced Search 相当の UI は出さない方針（[search.md](./search.md) 参照）だが、バックエンド側では同等のフィールド指定クエリ（`Organism:human` 等）を受け付ける。

## TXSearch

NCBI Taxonomy を格納する検索エンジン。

### コンテナ構成

| 環境 | エンドポイント |
|---|---|
| a012 | `http://localhost:32005/solr-rgm/`（同ホスト内のみ） |

a012 の localhost 限定。外部公開ポートなし。proxy は a012 上もしくは a012 に到達可能なネットワーク内で動かす必要がある（インフラ側で後ほど検討）。

### コア

| コア名 | 用途 |
|---|---|
| `collection1` | デフォルト、未使用（空） |
| `ncbi_taxonomy` | NCBI Taxonomy データ本体（約 270 万件） |

### スキーマフィールドと analyzer

**uniqueKey**: `tax_id`

| 分類 | フィールド | 型 |
|---|---|---|
| 識別子 | `tax_id`, `_version_`, `_root_` | `string` / `long` / `string` |
| 名称（トークナイズ） | `scientific_name`, `common_name`, `synonym`, `acronym`, `anamorph`, `teleomorph`, `authority`, `blast_name`, `equivalent_name`, `in_part`, `includes`, `misnomer`, `misspelling`, `type_material` | `text_general` |
| 名称（完全一致） | `*_ex` サフィックス版（`scientific_name_ex` 等） | `string` |
| 日本語 | `japanese_name`, `japanese_name_ex` | `text_cjk` / `string` |
| 全文 | `text` | `text_general`（termVectors 有） |
| 階級 | `rank`, `superkingdom`, `kingdom`, `phylum`, `class`, `order`, `family`, `genus`, `species`, `subspecies`, `varietas`, `forma`, `strain` ほか約 50 種 | `string` |
| 分類メタ | `lineage`, `lineage_data`, `division_code`, `genetic_code_id`, `mt_genetic_code_id`, `for_sort` | 主に `string`、`lineage` のみ `text_general` |

**analyzer 定義:**

- `text_general`: index 時は `StandardTokenizer` + `StopFilter` + `LowerCaseFilter`。query 時は同上 + **`SynonymFilter`（同義語展開、`synonyms.txt`）**
- `text_cjk`（`japanese_name`）: `StandardTokenizer` + `CJKWidthFilter` + `LowerCaseFilter` + `CJKBigramFilter` → 日本語 bigram インデックス

### 動作検証済み機能（実測）

- **`edismax` 動作**: `qf=scientific_name^5 common_name^20 text^0.1`、`score` 取得可（`human` 検索で `numFound: 5358`, `maxScore: 13.52`）
- **synonyms.txt は Solr サンプルのデフォルトのまま**（`GB,gib,gigabyte`、`Television,TV` 等のテスト用エントリのみ）→ SynonymFilter は有効だが Taxonomy 用の実用的な同義語は未登録。実質 synonym 展開は効いていない
- **`japanese_name` フィールド有** → 和名検索対応の余地（ポータルの i18n と親和）

### クエリ例

```bash
curl 'http://localhost:32005/solr-rgm/ncbi_taxonomy/select' \
  --data-urlencode 'q=scientific_name:"Homo sapiens"' \
  --data-urlencode 'defType=edismax' \
  --data-urlencode 'qf=scientific_name^5 common_name^20 text^0.1' \
  --data-urlencode 'sort=score desc' \
  --data-urlencode 'rows=1000' \
  --data-urlencode 'wt=json'
```

対応するクエリ表現:

- `human AND lineage:Mammalia`
- `human AND rank:subspecies`
- `human AND NOT(lineage:Eukaryota)`
- `tax_id:9606`
- `scientific_name:"Homo sapiens"`
- `scientific_name_ex:"Homo sapiens"`（拡張名含む）

### エントリ詳細（現行 UI）

- Tree 画面（デフォルト）: lineage パンくず + 子 taxon テーブル
- Info 画面 (`?view=info`): 全フィールド表示
- 子 taxon 取得: `/{taxId}/getChildren`（JSON API）

### 制限

- 現行 UI の検索結果上限: **1,000 件**（scientific_name 昇順、ソート変更不可）
- Solr 自体の制限ではないため、proxy 側で緩和可能
- ARSA と同じく Solr 4.4.0 → cursorMark 未対応（deep paging 不可。ただし Taxonomy は 270 万件で全件列挙しないので実用上問題なし）

### インデックス更新

日次バッチ運用と推定（ARSA と同じ夜間バッチ列で続けて実行されているとみられる）。

## proxy 実装方針

### 拡張ポイント

既存 `ddbj_search_api/es/` の構造を踏襲し、`solr/` 階層を新設:

```
ddbj_search_api/
├── es/
│   ├── client.py       # httpx 非同期クライアント
│   └── query.py        # multi_match クエリビルダ
├── solr/               # 新規
│   ├── client.py       # Solr HTTP クライアント（shards パラメータ対応）
│   ├── query.py        # Solr クエリビルダ（edismax + qf）
│   └── mappers.py      # Solr doc → EntryListItem 変換
└── routers/
    ├── entries.py      # 既存（ES）
    └── ...             # entries.py の _do_search を抽象化し、type に応じて ES/Solr ルーティング
```

### 統一スキーマへの変換

各バックエンドの結果を共通スキーマ（`identifier`, `type`, `title`, `organism`, `description`, `publishedAt`）にマッピング:

| 共通フィールド | ARSA | TXSearch |
|---|---|---|
| `identifier` | `PrimaryAccessionNumber` | `tax_id` |
| `type` | `trad`（固定） | `taxonomy`（固定） |
| `title` | `Definition` | `scientific_name` |
| `organism` | `Organism` | `scientific_name` |
| `description` | `Definition` + `Organism` + `Division` 等を連結 | `common_name` + `rank` + `lineage` を連結 |
| `publishedAt` | `Date`（`YYYYMMDD` → ISO 8601） | なし（null） |

### クエリ変換

ポータル UI で受けるキーワードは [search.md のキーワード仕様](./search.md#キーワード検索仕様) に従って正規化する。シンプル検索ボックスと Advanced Search で別経路を持つ。

#### シンプル検索ボックスからの入力

proxy 層で次の手順で正規化する:

1. 入力から `"..."` で囲まれたフレーズトークンを先に切り出す（未閉じのクォートは、末尾まで閉じられなかった場合は無視してリテラル扱いする）
2. 残りをスペース区切りでトークン化
3. **記号を含むトークン**（下記の「記号判定文字集合」のいずれかを含む）はフレーズトークンとして扱う
4. 全トークンを AND 結合して各バックエンドへ送る

**記号判定文字集合**: `-` `/` `.` `+` `:` `*` `?` `(` `)` `[` `]` `{` `}` `^` `~` `!` `|` `&` `\`

上記は Lucene メタ文字のスーパーセット。ユーザが意図して打った記号も、誤ってキー押下した記号も、全てフレーズ化経由で逃がすことで Solr edismax の演算子誤解釈リスクを除去する。

**実測による裏付け**（ARSA staging 3 shard、`defType=edismax&qf=AllText+Definition+Organism`）:

| クエリ | クォートなし numFound | クォート付き numFound | 考察 |
|---|---|---|---|
| `HIF-1` | 266,142,806（全件） | 15,050 | `-` が NOT 演算子として解釈され結果が壊れる |
| `BRCA1/2` | 266,142,806（全件） | 32 | `/` も特殊解釈 |
| `E. coli` | 266,142,806（全件） | 10,713,921 | `.` も同様 |

自動フレーズ化しないと Solr 側で結果が実用不能になることが確定。仕様書の方針は実測で裏付けられている。

**フレーズ内部の扱い**:

- フレーズ内のダブルクォート `"` はユーザ入力として受け付けない（クォート解析で消費される）
- フレーズ内のバックスラッシュ `\` は Solr/ES 送信時に `\\` にエスケープ
- 上記以外のメタ文字はクォート内では演算子として解釈されないためエスケープ不要

**非フレーズトークン（記号を含まない）の扱い**:

- 定義上 Lucene メタ文字を含まないため追加処理は不要
- ただし ES の `simple_query_string` などメタ文字扱いする経路は使わず、`multi_match(type: phrase)` に直接渡す（type: phrase は単語 1 語の場合は実質 match と同等に動く）

各バックエンドでの実装:

| バックエンド | 実装 |
|---|---|
| ES | 全トークンを `multi_match(type: phrase, fields: [...])` に変換し `bool.must` で AND 結合。`simple_query_string` や `query_string` は使わない |
| ARSA (Solr) | edismax。全トークンを `"..."` でクォートして `q` に連結。`qf` でフィールド boost |
| TXSearch (Solr) | edismax。同上 |

シンプル検索ボックスでは `AND`/`OR`/`NOT`・括弧・ワイルドカード・フィールド指定は解釈しない（入力されても記号判定経由でフレーズ化 → リテラル扱い）。意図した Boolean 演算・ワイルドカード・フィールド指定は Advanced Search で提供する。

#### Advanced Search からの入力

Advanced Search（GUI クエリビルダ）が生成したクエリは [URL DSL 形式](./search.md#advanced-search-の-url-形式) で受け取り、proxy 層でパースして以下の **ツリー型構造化 JSON** に展開する。

```json
{
  "db": "bioproject",
  "query": {
    "op": "AND",
    "rules": [
      { "field": "organism", "op": "eq", "value": "Homo sapiens" },
      { "field": "date", "op": "between", "from": "2020-01-01", "to": "2024-12-31" },
      {
        "op": "OR",
        "rules": [
          { "field": "title", "op": "contains", "value": "cancer" },
          { "field": "title", "op": "contains", "value": "tumor" }
        ]
      }
    ]
  }
}
```

##### スキーマ仕様

**ノード（`op` が `AND` / `OR` / `NOT`）**:

- `op`: `AND` / `OR` / `NOT`
- `rules`: 子ノード / leaf の配列。`NOT` は 1 件のみ
- ネスト深さ上限 5（DoS 対策）

**leaf（`op` が比較演算子）**:

| `op` | 必須フィールド | 用途 |
|---|---|---|
| `eq` | `value` | 完全一致（`identifier` / Lucene `term`） |
| `contains` | `value` | フレーズ含有（ES `match_phrase` / Solr フレーズクエリ） |
| `starts_with` | `value` | 前方一致 |
| `wildcard` | `value` | `*` `?` を含むワイルドカード |
| `between` | `from`, `to` | 範囲（`date` 等） |
| `gte` | `value` | 以上 |
| `lte` | `value` | 以下 |

**フィールド allowlist（ポータル共通語彙）**:

- **Tier 1**: `identifier` / `title` / `description` / `organism` / `date_published` / `date_modified` / `date_created` / `date`
- **Tier 2**: `submitter` / `publication`
- **Tier 3**: 単一 DB 指定時のみ有効。DB ごとの詳細は [共通のフィールド対応](#共通のフィールド対応) 参照

横断モード（`db` 未指定）では Tier 3 フィールドを含む DSL は **400 エラー**（`code: FIELD_NOT_AVAILABLE_IN_CROSS_DB`。詳細は [エラーレスポンス](#エラーレスポンス) 参照）。

`organism` は学名・Taxonomy ID 両対応（ES の `organism.name` / `organism.identifier` 両方に OR で query を投げる）。

`date` は展開エイリアス: `date:[A TO B]` は `date_published:[A TO B] OR date_modified:[A TO B] OR date_created:[A TO B]` に展開。

バックエンド固有名（`PrimaryAccessionNumber` / `scientific_name` 等）は受け付けない。共通語彙からバックエンドフィールドへの 1:N マッピングは [共通のフィールド対応](#共通のフィールド対応) を参照。

##### 値のバリデーション

proxy 層でパース直後・allowlist 検証と同じタイミングで値を検証する。違反は 400 + `application/problem+json`（詳細は [エラーレスポンス](#エラーレスポンス) 参照）。

| 項目 | ルール | 違反時の `code` |
|---|---|---|
| 日付 | ISO 8601 `YYYY-MM-DD` 厳密一致。正規表現 `^\d{4}-\d{2}-\d{2}$` + `datetime.fromisoformat` で妥当性検証 | `INVALID_DATE_FORMAT` |
| 空文字列 | `field:""` および `field:`（値欠落）は拒否。`NOT` の単独使用も拒否 | `MISSING_VALUE` |
| フィールドと演算子の組み合わせ | [search.md の演算子マトリクス](./search.md#演算子とフィールドの組み合わせ) に違反するものを拒否（例: `date:cancer*`、`identifier:[a TO b]`） | `INVALID_OPERATOR_FOR_FIELD` |
| ネスト深さ | AND / OR / NOT のノード深さ 5 まで | `NEST_DEPTH_EXCEEDED` |
| 未知フィールド | allowlist 外（例: `PrimaryAccessionNumber`、`foo`） | `UNKNOWN_FIELD` |
| 横断モードで Tier 3 | `db` 未指定時に Tier 3 フィールドを使用 | `FIELD_NOT_AVAILABLE_IN_CROSS_DB` |

**エスケープ規則（Lucene 標準）:**

- クォート内（`"..."`）でエスケープが必要なのは `\"` と `\\` のみ。他の Lucene メタ文字（`+` `-` `(` `)` `[` `]` `{` `}` `^` `~` `*` `?` `:` `/` `&&` `||` `!`）はクォート内では無害
- クォート外の値（`field:word` のような非フレーズトークン）にはメタ文字を**含めない**。含まれていた場合は構文エラー（`UNEXPECTED_TOKEN`）。GUI は常に記号含みの値をクォート付きで出力するため、この制約は URL 直編集ユーザ向け
- ワイルドカード `*` / `?` は `wildcard` 演算子のみで使用可。クォート内ではリテラル扱い

##### パーサ実装

**採用: [Lark](https://github.com/lark-parser/lark) の LALR(1) モードで Lucene サブセット文法を自前で定義する。**

proxy 層は以下の 3 段階で DSL を処理する:

1. **パース**: Lark が DSL 文字列 → AST に変換。`UnexpectedToken` / `UnexpectedCharacters` で `line` / `column` / `token` を取得可能
2. **allowlist 検証（visitor）**: AST を走査し、フィールド名 allowlist と Tier 制約（横断モード / 単一 DB）、演算子適合、値のバリデーション、ネスト深さをチェック
3. **JSON 構築**: 検証済み AST を [スキーマ仕様](#スキーマ仕様) のツリー型 JSON にシリアライズ

**文法スケッチ（`advanced_search.lark`）:**

```lark
start: or_expr

or_expr: and_expr (OR and_expr)*
and_expr: not_expr (AND not_expr)*
not_expr: NOT? atom
atom: field_clause | "(" or_expr ")"
field_clause: FIELD ":" value

value: PHRASE | RANGE | WILDCARD | DATE | WORD

PHRASE: /"(?:[^"\\]|\\.)*"/
RANGE: "[" /[^\s\]]+/ /\s+TO\s+/ /[^\s\]]+/ "]"
WILDCARD: /[A-Za-z0-9_][A-Za-z0-9_]*[*?][A-Za-z0-9_*?]*/
DATE: /\d{4}-\d{2}-\d{2}/
FIELD: /[a-z_]+/
WORD: /[^\s:()\[\]"{}^~*?]+/
AND: "AND"
OR: "OR"
NOT: "NOT"

%ignore /\s+/
```

上記はスケッチ。実装時は `date` の RANGE 内検証、Lucene 標準のエスケープ処理（`PHRASE` の `\\.`）、単語トークンの重複定義回避などを詰める。

**他の選択肢を採用しなかった理由:**

| 候補 | 評価 | 不採用理由 |
|---|---|---|
| [Luqum](https://github.com/jurismarches/luqum)（Lucene 専用、PLY ベース、ES 変換付き） | 成熟・活発（1.0.0 / 2025-02、Python 3.10+） | (1) Lucene 全機能を parse してしまい、boost `^` / fuzzy `~` / 正規表現なども AST に入る → ポータル採用構文に絞るための後段 validator が必要で二段構えになる。(2) Solr edismax 向け変換は標準機能になく visitor を自前で書く。(3) ES 変換もポータル共通語彙→バックエンド固有名のマッピングで visitor を書き換える必要がある。(4) PLY の `LRParser` はスレッドセーフでない（FastAPI の同期 endpoint で `asyncio.to_thread` 経由使用時に罠になり得る） |
| pyparsing（パーサコンビネータ、Lucene grammar の例あり） | エラー位置情報は良質 | パフォーマンスが Lark LALR に劣る。文法宣言が Python コード内に埋まり、仕様書と文法ファイルの二重管理になる |
| 自作 recursive descent | 採用構文なら 200 行程度で書ける | エラー位置の取得・テストのカバレッジを自前で担保する必要がありメンテコストが高い |

**Lark 採用の利点:**

- 文法を `.lark` ファイルに宣言的に書ける（仕様書の生きたドキュメントとして機能）
- Lucene 全機能に引きずられない（boost / fuzzy / 正規表現は文法に含めず、含まれていれば `UNEXPECTED_TOKEN`）
- AST → ES / Solr 両方への visitor を同じ出発点から書ける
- エラー位置（`line` / `column` / `token`）を `UnexpectedToken` から直接取得できる
- hypothesis での PBT（Property-Based Testing）がしやすい（文法からサンプル生成する補助も書ける）
- 依存が軽い（Lark 単体、PLY 不要）

##### エラーレスポンス

ddbj-search-api の既存エラー形式（[RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807) / RFC 9457 Problem Details、`application/problem+json`、`ddbj_search_api/main.py` の `_problem_json()`）をそのまま踏襲する。db-portal 特有の情報は RFC の拡張メンバー機構で追加する。

**ベース（既存 ddbj-search-api 踏襲）:**

```json
{
  "type": "https://ddbj.nig.ac.jp/problems/invalid-dsl",
  "title": "Invalid Advanced Search DSL",
  "status": 400,
  "detail": "unknown field 'foo' at column 15. allowed: identifier, title, description, organism, ...",
  "instance": "/db-portal/search",
  "timestamp": "2026-04-16T12:34:56Z",
  "requestId": "8f4e2d1a-...",
  "code": "UNKNOWN_FIELD",
  "position": { "line": 1, "column": 15, "length": 3 }
}
```

**拡張メンバー（db-portal 固有）:**

- `code`: machine-readable なエラーコード（下表）
- `position`: DSL 文字列中のエラー位置（`line` は常に 1 で固定、`column` は 1 始まり、`length` はトークン長）

**`type` の URI 規約**: `https://ddbj.nig.ac.jp/problems/<slug>` 形式。`slug` は `code` を kebab-case 化したもの（`UNKNOWN_FIELD` → `unknown-field`）。将来 `type` URL でエラー種別のドキュメントページを配信する余地を残す。

**エラーコード一覧:**

| `code` | HTTP | 発生条件 |
|---|---|---|
| `UNEXPECTED_TOKEN` | 400 | DSL 構文エラー（Lark `UnexpectedToken` / `UnexpectedCharacters`）。非対応構文（boost `^` / fuzzy `~` / 正規表現 `/.../`）もここに該当 |
| `UNKNOWN_FIELD` | 400 | allowlist 外のフィールド名 |
| `FIELD_NOT_AVAILABLE_IN_CROSS_DB` | 400 | 横断モード（`db` 未指定）で Tier 3 フィールドを使用 |
| `INVALID_DATE_FORMAT` | 400 | 日付値が `YYYY-MM-DD` 形式でない |
| `INVALID_OPERATOR_FOR_FIELD` | 400 | フィールドに対して不正な演算子（例: `date:cancer*`、`identifier:[a TO b]`） |
| `NEST_DEPTH_EXCEEDED` | 400 | AND / OR / NOT のネスト深さが 5 を超過 |
| `MISSING_VALUE` | 400 | `field:""`、`field:` のように値が空・欠落 |
| `INVALID_QUERY_COMBINATION` | 400 | `q` と `adv` を同時指定（`/db-portal/*` 全体で共通） |

**UI の扱い:**

- シンプル検索結果ページ / Advanced Search 結果ページは `detail` をそのまま `Callout type="error"` に出す
- `position` があれば Advanced Search ページの DSL プレビューに下線を引いて誘導する（実装は将来拡張、`code`-based のハンドリングでの分岐余地を残すため仕様として定義だけしておく）
- 将来 `code` ベースで i18n（日本語メッセージ差し替え）を行う余地を残す

##### バックエンド変換

- **ES**: ツリーをそのまま `bool` クエリに変換。leaf は `term`（`eq`） / `match_phrase`（`contains`） / `prefix`（`starts_with`） / `wildcard`（`wildcard`） / `range`（`between` / `gte` / `lte`）にマッピング
- **Solr**: ツリーを edismax の `q` 文字列に再帰的に展開（`(Organism:"Homo sapiens" AND Date:[20200101 TO 20241231])` 形式）。`uf` パラメータでフィールド名を allowlist 制御する

シンプル検索とバックエンドパーサを揃える（どちらも edismax）ほうがテスト・運用コストが低い。edismax は `q` 内でフィールド指定・Boolean・範囲検索・ワイルドカードを解釈できるため、標準 Lucene パーサに切り替える必要はない。

#### 共通のフィールド対応

ポータル UI（特に Advanced Search のフィールドプルダウン）にはこの**ポータル共通語彙**のみを露出し、バックエンド固有のフィールド名は隠蔽する。[search.md の Advanced Search フィールド構成](./search.md#フィールド構成3-層) の 3 層に沿ってマッピングを整理する。

##### Tier 1: 全 DB 横断で使える（即実装可能）

| ポータル概念 | ES (entries) | ARSA | TXSearch |
|---|---|---|---|
| `identifier` | `identifier`（keyword） | `PrimaryAccessionNumber` / `AccessionNumber` | `tax_id` |
| `title` | `title`, `name` | `Definition` | `scientific_name` / `scientific_name_ex` / `common_name` / `japanese_name` |
| `description` | `description` | `AllText` / `ReferenceTitle` / `Comment` | `text` / `synonym` |
| `organism` | `organism.name`（学名）/ `organism.identifier`（Taxonomy ID） | `Organism` / `Lineage` | （Taxonomy 自体のため N/A） |
| `date_published` | `datePublished` | `Date` | N/A |
| `date_modified` | `dateModified` | N/A（ARSA にはない） | N/A |
| `date_created` | `dateCreated` | N/A | N/A |
| `date`（OR） | `datePublished` OR `dateModified` OR `dateCreated` | `Date`（単一） | N/A |

**バックエンドごとの制約:**
- ARSA: `Date` フィールドは 1 種類のみ。DDBJ/GenBank flatfile の LOCUS 行に出る日付に相当し、仕様上は「最終更新日」（most recent update date）。未更新レコードでは公開日と一致するため、ポータルでは **公開日相当**（`date_published`）にマッピングする。`date_modified` / `date_created` / `date`（OR）指定時はユーザーに「このフィールドは Trad では使用できません」の警告を出し、その条件を無視（or エラー）。実測では ARSA `Date=20050411` が `getentry` が返す LOCUS 行 `11-APR-2005` と一致することを確認済み
- TXSearch: Taxonomy は日付概念がないため、`date_*` 系は全て N/A。日付条件が含まれる Advanced Search は Taxonomy で常に 0 件（or エラー）

##### Tier 2: 横断で使えると嬉しい（converter 側で正規化が必要）

**方針（大枠）**: 各 DB の該当箇所から converter 側で値を抽出し、統一的な **top-level keyword フィールド**（`submitter` / `publicationId`）として ES に投入する。検索時は単一フィールドへのクエリで全 DB 横断可能にする。詳細・converter 側の残課題は [Tier 2 正規化](#tier-2-正規化submitter--publicationid) 参照。

DSL 側の allowlist 名（ポータル共通語彙）と ES 内部フィールド名は一致しない項目がある。DSL → ES の変換は proxy 側で行う。

| ポータル共通語彙（DSL） | ES フィールド名 | 抽出元（DB 別） |
|---|---|---|
| `submitter` | `submitter` | BioProject: `organization.name`（既存 nested）/ SRA: `properties.SUBMISSION.center_name` / JGA: `properties.STUDY_ATTRIBUTES[TAG="Submitting organization"].VALUE` / BioSample: `properties.BioSample.center_name` / Trad: N/A（ARSA） |
| `publication` | `publicationId` | BioProject: 既存 `publication.id` / SRA: `properties.STUDY_LINKS` の PMID / JGA: `properties.PUBLICATIONS[].id` / Trad: ARSA `ReferencePubmedID` / BioSample: N/A |

##### Tier 3: 単一 DB 選択時のみ（DB 特化）

| DB | ポータル概念 | バックエンドフィールド | 実装状況 |
|---|---|---|---|
| SRA / GEA | `library_strategy` | `properties.EXPERIMENT_SET.EXPERIMENT.DESIGN.LIBRARY_DESCRIPTOR.LIBRARY_STRATEGY` | **要 parse** |
| SRA / GEA | `library_source` | 同上 `.LIBRARY_SOURCE` | **要 parse** |
| SRA / GEA | `library_layout` | 同上 `.LIBRARY_LAYOUT` | **要 parse** |
| SRA / GEA | `platform` | `properties.EXPERIMENT_SET.EXPERIMENT.PLATFORM.*`（ILLUMINA / PACBIO_SMRT 等） | **要 parse** |
| SRA / GEA | `instrument_model` | 同上 `.INSTRUMENT_MODEL` | **要 parse** |
| BioSample | `geo_loc_name` / `collection_date` / `host` / `disease` / `tissue` / `env_biome` 等 | `attributes[harmonized_name=X].content`（nested） | ES 既存。UI で `harmonized_name` を指定。top-level 昇格は将来 |
| BioProject | `project_type` | `objectType` | ES 既存 |
| BioProject | `grant_agency` | `grant.agency.name` | ES 既存（nested） |
| Trad | `division` / `molecular_type` / `sequence_length` / `datatype` / `keyword` | `Division` / `MolecularType` / `SequenceLength` / `Datatype` / `Keyword` | ARSA 既存 |
| Trad | `feature_gene_name` / `reference_author` / `reference_journal` | `FeatureQualifier` / `ReferenceAuthor` / `ReferenceJournal` | ARSA 既存 |
| Taxonomy | `rank` / `lineage` / `kingdom` / `phylum` / `class` / `order` / `family` / `genus` / `species` | TXSearch 同名フィールド | TXSearch 既存 |
| Taxonomy | `common_name` / `japanese_name` / `synonym` | TXSearch 同名フィールド | TXSearch 既存 |
| JGA | `study_type` | `properties.DESCRIPTOR.STUDY_TYPE[]` | **要 parse** |
| JGA | `grant_agency` | `properties.GRANTS[].AGENCY` | **要 parse** |
| JGA | `principal_investigator` | `properties.STUDY_ATTRIBUTES[TAG="Principal Investigator"].VALUE` | **要 parse** |
| JGA | `submitting_organization` | `properties.STUDY_ATTRIBUTES[TAG="Submitting organization"].VALUE` | **要 parse** |

**BioSample attributes の型扱い（脚注）**: `attributes[harmonized_name=X].content` は ES に **string** として格納される。日付型の harmonized_name（代表: `collection_date`）に対して Advanced Search の範囲演算子（`between` / `gte` / `lte`）を使うには、converter 側で日付正規化（ISO 8601）と ES mapping の `date` 型化が必要。インターナルリリース / ファーストリリースでは **全 harmonized_name を文字列扱い**（`contains` / `equals` / `starts_with` / `wildcard`）とし、範囲検索対応は top-level 昇格（将来拡張）とあわせて検討する。

##### シンプル検索用 qf 設定

シンプル検索ボックスからの入力はフィールド指定がないため、各バックエンドで以下の qf を全文検索として使う:

**ARSA 向け qf:**

```
qf=AllText^0.1 PrimaryAccessionNumber^20 AccessionNumber^10 Definition^5 Organism^3 ReferenceTitle^2
```

**TXSearch 向け qf:**

```
qf=scientific_name^10 scientific_name_ex^20 common_name^5 synonym^3 japanese_name^5 text^0.1
```

ES 側は `multi_match` の `fields` パラメータで `title^5 name^5 description organism.name^3 identifier^10` 相当の重み付けを適用する。

#### 日本語入力の扱い

TXSearch の `japanese_name`（CJK bigram analyzer）・BioProject の日本語タイトル等、日本語データが含まれる可能性がある。日本語入力の扱い方針:

- シンプル検索ボックスでは日本語トークンもスペース区切り AND で扱う（記号を含まなければ通常のトークンとしてフレーズ化せずに送る）
- 自動フレーズ化の判定（記号判定文字集合）に日本語句読点は含めない
- TXSearch への qf には `japanese_name^5` を含めて和名検索を有効化
- ES `entries` は standard analyzer 前提で日本語は Unicode word split 頼み。精度は限定的で、kuromoji 導入は再インデックスを伴う将来課題

#### 現状 analyzer の前提（確認済み）

ES の index 構成はコード調査で以下が確定した（[ddbj-search-converter](https://github.com/ddbj/ddbj-search-converter) の `ddbj_search_converter/es/index.py` および `es/mappings/*` の読み込み結果）:

- **`entries` は alias**。実 index は `bioproject` / `biosample` / `sra-submission` ほか SRA 6 種 / `jga-study` ほか JGA 4 種の計 **12 個**。alias 定義は `es/index.py` の `ALIASES["entries"] = list(ALL_INDEXES)`
- 運用は **Blue-Green alias swap 方式**。物理 index は `{logical-name}-{YYYYMMDD}` 形式（例: `bioproject-20260413`）。alias は `_aliases` API で atomic に張り替える
- 全 mapping で text フィールドに `analyzer` 未指定 → ES デフォルトの **standard analyzer** が適用される
- index template / component template は不使用
- ES イメージは `docker.elastic.co/elasticsearch/elasticsearch:8.17.1` 公式イメージ。kuromoji / sudachi / ICU プラグイン未導入

**analyzer 変更は行わない方針で確定**。理由:

- 通常のフレーズ検索（`"Homo sapiens"`・`"breast cancer"` 等）は standard analyzer で問題なく動作することを実測で確認済み（ES staging `multi_match type=phrase` でヒット数正常）
- 記号含みトークンも `"HIF-1"` で 614 件ヒットするなど検索自体は動く。ただし `HIF-1` と `HIF 1` は同じトークン列（`hif` + `1`）になるためスコア上区別できない
- 区別が必要な稀なケースは Advanced Search の `identifier` フィールド完全一致（`keyword` 型、`HIF-1` 等はそのまま格納、`term` クエリで一致）で救う
- `word_delimiter_graph` 導入は (1) 生物ドメイン向けパラメータチューニングに実ログが必要、(2) 全 12 index の再インデックス（BioSample 10 億件等）コストが大、(3) 検索クエリ側も `bool(must+should)` に拡張が必要、で効果に対して労力が過大と判断
- 日本語データは実績上ほぼ含まれないため kuromoji も不要

standard analyzer の既知の制約（許容するもの）:

- `HIF-1` と `HIF 1` はシンプル検索ボックス経由では区別不能（Advanced Search の identifier 完全一致で救う）
- 日本語は Unicode word split のみで精度は限定的（ただし日本語データはほぼなく実害なし）

### ページネーション

- **ES 側**: 既存の offset + cursor（PIT + search_after）をそのまま利用
- **Solr 側**: `start` + `rows` の offset ベースのみ。上位 10,000 件までサポート、それ以上は対象外（横断検索の UI 上限と整合）

### Distributed Search（ARSA）

Solr の `shards` パラメータに全 shard の URL を並べて 1 回で集約。自前 fan-out 実装は不要。

1. 環境ごとの shard 一覧を `config.py` で設定化（prod: 8 台、staging: 3 台）
2. `solr/client.py` が `shards` を自動付与
3. 返却された `numFound` と `docs` を統一スキーマに変換

### 横断検索の統合設計

ポータルの横断検索（全 DB のヒット数サマリーを表示）は count 先行の 2 段構成とする。

#### 並列実行

- 3 並列を `asyncio.gather` で発火: (1) ES 単一クエリで ES 管轄 DB 全部、(2) ARSA、(3) TXSearch
- ES は単一 index `entries` に全タイプが投入済みなので、aggregation でタイプ別 count を 1 回で取得できる
- 各バックエンドは独立に実行し、他の結果を待たない

#### タイムアウト（初期値）

| バックエンド | 個別タイムアウト | 根拠 |
|---|---|---|
| ES | 10s | 既存 API の 60s は bulk 等を含む上限。横断検索は count のみで軽いため 10s に絞る |
| ARSA | 15s | prod 8 shard で実測: cold cache で `Homo sapiens` 5.6s / `human` 2.2s、warm cache は 10ms 以下。自動フレーズ化されたクォート付き `"HIF-1"` は cold 6.7s。15s あれば全ケース収まる |
| TXSearch | 5s | 実測 1-3 秒 |
| 横断検索全体 | 20s | 全 `gather` 完了を待つ上限。超過分は該当バックエンドを `null` として返す |

これらは**初期値**。運用後に実ログのレイテンシ分布を見て調整する。

**ARSA レイテンシ実測記録（prod 8 shard、全件 295,193,072、3 回連続実行）:**

| クエリ | cold (1 回目) | warm (2 回目) | warm (3 回目) | numFound |
|---|---|---|---|---|
| `human` | 2.16s | 8ms | 8ms | 50,263,991 |
| `cancer` | 0.72s | 7ms | 6ms | 11,350,219 |
| `xylanase` | 0.16s | 7ms | 7ms | 23,798 |
| `Homo sapiens` | **5.59s** | 7ms | 6ms | 47,094,384 |
| `BRCA1` | 0.13s | 7ms | 6ms | 14,942 |
| `"HIF-1"`（クォート付き） | **6.67s** | 15ms | 7ms | 15,096 |
| `HIF-1`（クォートなし、破損） | **16.81s** | 14ms | 8ms | 295,193,072（全件） |

条件: `defType=edismax&qf=AllText+Definition+Organism&rows=0`、8 shard fan-out

重要観察:

- warm cache はクエリ種別を問わず 10ms 台 → キャッシュヒット率が支配要因
- cold cache でも適切に発行されたクエリは 0.1s〜6.7s に収まる
- **クォートなし `HIF-1` は `-` が NOT 演算子として誤解釈され全件スキャン（16.8s）** → proxy 側で自動フレーズ化を徹底すれば回避できる。シンプル検索ボックスの記号自動フレーズ化方針が改めて正当化される
- staging 3 shard（`Homo sapiens` 8.67s）より prod 8 shard（5.59s）の方が速い。prod の物理リソースが豊富なため

#### Solr cold cache 対策（warming）

cold cache と warm cache のレイテンシ差は 100〜1000 倍。対策方針:

- **インターナルリリース / ファーストリリース**: 何もしない。タイムアウト 15s で cold も収まるため実害小。インデックス再オープン直後の最初の数クエリだけ体感で遅い
- **負荷状況に応じて追加**: ddbj-search-api に warming タスクを入れる（起動時 + 1 時間おき等で代表語 20-30 ワード程度を ARSA / TXSearch に事前発行）
- ARSA / TXSearch 自体の `solrconfig.xml`（`firstSearcher` / `newSearcher`）は別チーム管轄・レガシー構成のため触らない

#### 部分失敗ポリシー

横断検索は各バックエンド独立で、部分成功を許容する。UI 側の 3 状態表示（loading / success / error）は [search.md の loading / error 状態](./search.md#loading--error-状態) を参照。レスポンスは DB 単位の構造で返す:

```json
{
  "databases": [
    { "db": "bioproject", "count": 1234, "error": null },
    { "db": "trad", "count": null, "error": "timeout" },
    { "db": "taxonomy", "count": 5678, "error": null }
  ]
}
```

- `count`: 成功時は件数、失敗時は `null`
- `error`: `null` / `"timeout"` / `"upstream_5xx"` / `"connection_refused"` / `"unknown"` のいずれか
- HTTP ステータス: いずれか 1 つ以上成功していれば 200 OK を返す。全バックエンド失敗のみ 502 を返す
- UI 側で `error != null` の DB カードに「取得失敗 / 再試行」ボタンを出す
- ES 障害時は 6 DB が同時 `null` になるが、仕様上は 200 OK。UI はマクロ障害を検知するため、全 `null` に近い割合なら「検索が不安定です」バナー等の表示を検討する（UI design で詰める）

#### 2 段構成（count 先行 + 詳細 fetch）

1. 横断検索エンドポイント（`/search?q=...`）: 各 DB の count のみ取得。`rows=0` / `size=0` で軽量化
2. DB 指定検索エンドポイント（`/search?q=...&db=...`）: 該当 DB の結果リストを取得

これにより横断検索のレイテンシを低く保ち、ユーザが DB をクリックしたときだけ詳細を fetch する。

#### score 正規化

横断検索は DB ごとに独立して結果を表示するため、ES と Solr の relevance score を横串で比較する必要はない。各エンジン内の score でソートし、DB カード単位で件数を表示する。

### キャッシュ

- in-memory LRU（`cachetools.TTLCache` 等）で横断検索の count レスポンスをキャッシュ
- キー: 正規化済みクエリ文字列
- TTL / maxsize は初期値として **TTL 1 時間 / maxsize 1000** で運用開始（インデックス更新が日次バッチなので TTL に余裕あり、maxsize は同時アクセスユーザ数の想定と FastAPI プロセスのメモリフットプリントから決めた仮置き）。運用後にヒット率とメモリ使用量を見て調整
- Redis は運用構成上不要（FastAPI 単一プロセス想定）

### 既存 API との関係（ポータル用 endpoint の名前空間分離）

DDBJ Search API は元々 ddbj-search の front 向けに作られている。`/search` 等の既存 endpoint に ARSA / TXSearch 連携や本 docs の正規化処理を混ぜると ddbj-search front の挙動を壊すリスクがある。

**ポータル用エンドポイントは `/db-portal/*` 名前空間に独立して新設し、既存 endpoint には一切手を加えない方針で確定。**

#### endpoint 設計

```
GET /db-portal/search?q=<keyword>             # 横断シンプル検索（count のみ、3 並列 fan-out）
GET /db-portal/search?q=<keyword>&db=<id>     # DB 指定シンプル検索（結果リスト）
GET /db-portal/search?adv=<dsl>              # 横断 Advanced Search（count のみ、3 並列 fan-out）
GET /db-portal/search?adv=<dsl>&db=<id>       # DB 指定 Advanced Search（結果リスト）
```

- `q`（シンプル検索）と `adv`（Advanced Search の DSL 文字列、[search.md の URL 形式](./search.md#advanced-search-の-url-形式) 参照）はどちらか必須。両方同時指定は 400
- `db` 未指定 + `q` のみ = 横断シンプル検索 count、`db` 指定 = 結果リスト
- `db` 未指定 + `adv` のみ = 横断 Advanced Search count。Tier 1 / Tier 2 フィールドのみ許可。Tier 3 を含む場合は 400
- ページネーション（`page` / `perPage` / `cursor` / `sort`）は両モード共通
- ポータル UI の `/search` URL とこの endpoint が 1:1 対応するので見通しがいい

#### 設計理由

1. **既存クライアント保護**: ddbj-search front は既存 endpoint をそのまま使い続けられる。リグレッションリスクゼロ
2. **設計の自由度**: 新規 endpoint なので後方互換に縛られず、本 docs 方針（自動フレーズ化・3 並列 fan-out・count 先行 2 段構成・部分失敗ポリシー）を素直に実装できる
3. **責務が明確**: 既存 `/search` =「ES 単体への薄いラッパー」、新 `/db-portal/*` =「ARSA / TXSearch / ES を束ねる proxy」。性質が異なるものを endpoint 名前空間で区別
4. **deprecate 判断を将来に分離可能**: ddbj-search front がポータルに完全統合された時点で旧 endpoint 単位で deprecate できる。今は触らない
5. **コード分離が素直**: FastAPI router を `db_portal_router` で分離、`solr/` 依存は新 router のみ。共通ロジック（query 正規化・mapper）はライブラリ層で吸収

#### 既存パラメータの扱い

`keywords`（カンマ区切り + 引用符）・`keywordFields`・`keywordOperator=AND|OR` は既存 endpoint で維持。**触らない・deprecate しない**。将来 ddbj-search front がポータルに統合された時点で改めて判断する。

## Properties parse の拡張計画

現状の ES mapping では各 DB の `properties` フィールドが `{type: object, enabled: false}` のため、元データ（XML / JSON）の詳細メタデータは**検索不可**（mapping 定義は [ddbj-search-converter の es/mappings/common.py](https://github.com/ddbj/ddbj-search-converter/blob/main/ddbj_search_converter/es/mappings/common.py)）。以下のユースケースは `properties` を parse してフラット化したフィールドを mapping に追加することで実現する。

実装は ddbj-search-converter 側で XML/JSON の parse 処理を拡張し、フラット化したキーを ES ドキュメントに追加して再インデックスする。

### Tier 2 正規化（submitter / publicationId）

Advanced Search の Tier 2 共通語彙（`submitter` / `publication`）を全 DB 横断で使えるようにするため、**top-level keyword フィールド**として統一名を追加する（現状 BioProject 以外は ES に該当フィールドなし）。

**大枠方針**（converter 側で最終詳細を検討中）:

| ポータル共通語彙（DSL） | 追加フィールド（ES） | 型 | 用途 |
|---|---|---|---|
| `submitter` | `submitter` | keyword（配列可） | 投稿者 / 投稿機関名。`submitter:"東大"` / `submitter:"National Cancer Center"` 等のクエリで横断検索可能 |
| `publication` | `publicationId` | keyword（配列可） | 関連論文の PubMed ID。`publication:"12345"` で完全一致検索 |

**各 DB での抽出ルール:**

| DB | `submitter` の抽出元 | `publicationId` の抽出元 |
|---|---|---|
| BioProject | 既存 `organization.name`（role フィルタ後）→ top-level に昇格 | 既存 `publication.id` → top-level に昇格 |
| SRA | `properties.SUBMISSION.center_name` | `properties.STUDY_LINKS.XREF_LINK[DB="PubMed"].ID` 等 |
| JGA | `properties.STUDY_ATTRIBUTES[TAG="Submitting organization"].VALUE` | `properties.PUBLICATIONS[].id` |
| BioSample | `properties.BioSample.center_name` | N/A（BioSample に該当情報なし） |
| Trad | ARSA のため proxy 側で対応（top-level 不要） | ARSA の `ReferencePubmedID` を proxy 側でマップ |

**検索挙動:**

- `submitter:"..."` → 全 DB の top-level `submitter` に対して `match` / `wildcard` クエリ
- `publication:"..."` → 全 DB の top-level `publicationId` に対して完全一致
- Trad は proxy 側で ARSA のフィールドにマップ（top-level フィールドは不要）

**converter 側の残課題（db-portal では未決、実装者判断）:**

- BioProject の Organization をすべて拾うか、特定の role（`submitter` / `owner` 等）に絞るか
- SRA の PubMed ID の抽出対象（`STUDY_LINKS` / `EXPERIMENT_LINKS` / `SAMPLE_LINKS` のどれを見るか、複数見るか）
- 元構造（nested）と別に top-level に持つことで発生する index サイズ増加の許容範囲
- `submitter` の正規化（表記ゆれ対策: 「東京大学」「東大」「Univ. of Tokyo」等）の有無

### SRA / GEA: 技術起点検索（UC4）

SRA の ES mapping は common のみ。重要メタデータは全て properties に埋もれている。

**ユースケース例:**
- 「Illumina NovaSeq で取った RNA-Seq データを探す」
- 「PacBio long-read シーケンス」
- 「paired-end リードのみ」
- 「単細胞 RNA-Seq（scRNA-Seq）」

**parse 対象と追加フィールド:**

| 追加フィールド（ES） | parse 対象 path（properties 配下） | 値の例 |
|---|---|---|
| `libraryStrategy` | `EXPERIMENT_SET.EXPERIMENT.DESIGN.LIBRARY_DESCRIPTOR.LIBRARY_STRATEGY` | WGS / WXS / RNA-Seq / ChIP-Seq / MeDIP-Seq |
| `librarySource` | 同上 `.LIBRARY_SOURCE` | GENOMIC / TRANSCRIPTOMIC / METAGENOMIC |
| `librarySelection` | 同上 `.LIBRARY_SELECTION` | Random / PCR / Hybrid Selection |
| `libraryLayout` | 同上 `.LIBRARY_LAYOUT` | SINGLE / PAIRED |
| `platform` | `EXPERIMENT_SET.EXPERIMENT.PLATFORM.*`（親キー） | ILLUMINA / LS454 / PACBIO_SMRT / OXFORD_NANOPORE |
| `instrumentModel` | 同上 `.INSTRUMENT_MODEL` | NovaSeq 6000 / MiSeq / HiSeq / PromethION |

**Analysis 側:**
- `analysisType`: `ANALYSIS_SET.ANALYSIS.ANALYSIS_TYPE`（REFERENCE_ALIGNMENT / SEQUENCE_VARIATION 等）

### JGA: 研究プロジェクト横断検索（UC2 / UC6 / UC10 / UC11）

JGA の ES mapping は共通フィールドのみで、全メタデータが properties に入っている。**parse しないと Advanced Search が事実上機能しない**。

**ユースケース例:**
- 「東大 A ラボの JGA Study」（UC2）
- 「PMID 12345 関連の JGA」（UC6）
- 「乳がん関連の JGA Study」（UC10）
- 「AMED 助成の JGA」（UC11）

**parse 対象と追加フィールド:**

| 追加フィールド（ES） | parse 対象 path（properties 配下） |
|---|---|
| `studyType[]` | `DESCRIPTOR.STUDY_TYPE[]`（existing_study_type / new_study_type 属性） |
| `studyAbstract` | `DESCRIPTOR.STUDY_ABSTRACT`（text） |
| `principalInvestigator` | `STUDY_ATTRIBUTES[TAG="Principal Investigator"].VALUE` |
| `submittingOrganization` | `STUDY_ATTRIBUTES[TAG="Submitting organization"].VALUE` |
| `nbdcNumber` | `STUDY_ATTRIBUTES[TAG="NBDC Number"].VALUE` |
| `grantAgency[]` | `GRANTS[].AGENCY`（abbr 属性） |
| `grantId[]` | `GRANTS[].grant_id`（属性） |
| `publicationId[]` | `PUBLICATIONS[].id`（属性） |

### BioSample: 地理・環境・疾患（UC8 / UC10）

BioSample は既に `attributes`（nested）で key-value 形式のメタデータを検索可能。UI 側で `attributes.harmonized_name` を指定すれば UC8 / UC10 を実現できるため、parse は必須ではない。

現状で検索可能な代表的 `harmonized_name`:

- `geo_loc_name`: 地理的位置（country / region）
- `collection_date`: 採集日
- `isolation_source`: 分離源
- `host`: 宿主生物
- `disease`: 疾患名
- `tissue`: 組織
- `cell_type`: 細胞タイプ
- `env_biome` / `env_feature` / `env_material`: 環境メタゲノム
- `lat_lon`: 緯度経度

**将来検討（top-level 昇格）:** 頻出する harmonized_name は top-level の専用フィールドに昇格（例: `sampleGeoLocName` で直接検索可能に）すると UX が上がる。ただし BioSample は 10 億件規模で再インデックスコストが大きいため、**将来課題**。

### 実装タイミング

| parse 対象 | タイミング | 根拠 |
|---|---|---|
| Tier 2 正規化（`submitter` / `publicationId`） | **ファーストリリース** | Advanced Search の Tier 2 共通語彙を横断検索で使うため必須。BioProject は既存フィールドの昇格のみ、SRA / JGA / BioSample は properties parse を伴う |
| SRA の library / platform / instrument | **ファーストリリース** | UC4（技術起点）は研究者の頻出ユースケース。converter の XML parse 拡張で対応可能 |
| JGA の全フィールド | **ファーストリリース** | parse なしでは JGA の Advanced Search が機能しない。データ量も小さく再インデックスコスト低 |
| BioSample の top-level 昇格 | **将来拡張** | 10 億件規模の再インデックスコスト大。harmonized_name 指定で当面代替 |
