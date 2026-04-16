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

- **BioProject**: `projectType`, `parentBioProjects`, `childBioProjects`, `organization`, `publication`, `grant`, `externalLink`
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

**フィールド allowlist（ポータル共通語彙）**: `identifier` / `title` / `description` / `organism` / `date`。※ `organism` の型（学名受けか NCBI Taxonomy ID 受けか）は未決

バックエンド固有名（`PrimaryAccessionNumber` / `scientific_name` 等）は受け付けない。共通語彙からバックエンドフィールドへの 1:N マッピングは [共通のフィールド対応](#共通のフィールド対応) を参照。

##### バックエンド変換

- **ES**: ツリーをそのまま `bool` クエリに変換。leaf は `term`（`eq`） / `match_phrase`（`contains`） / `prefix`（`starts_with`） / `wildcard`（`wildcard`） / `range`（`between` / `gte` / `lte`）にマッピング
- **Solr**: ツリーを edismax の `q` 文字列に再帰的に展開（`(Organism:"Homo sapiens" AND Date:[20200101 TO 20241231])` 形式）。`uf` パラメータでフィールド名を allowlist 制御する

シンプル検索とバックエンドパーサを揃える（どちらも edismax）ほうがテスト・運用コストが低い。edismax は `q` 内でフィールド指定・Boolean・範囲検索・ワイルドカードを解釈できるため、標準 Lucene パーサに切り替える必要はない。

#### 共通のフィールド対応

ポータル UI（特に Advanced Search のフィールドプルダウン）にはこの**ポータル共通語彙**のみを露出し、バックエンド固有のフィールド名は隠蔽する。各バックエンドに振り分ける際の 1:N マッピングは以下のとおり。

| ポータル概念 | ES (entries) | ARSA qf | TXSearch qf |
|---|---|---|---|
| identifier | `identifier`（keyword） | `PrimaryAccessionNumber^20 AccessionNumber^10` | `tax_id^20` |
| title / name | `title`, `name` | `Definition^5 Organism^3` | `scientific_name^10 scientific_name_ex^20 common_name^5 japanese_name^5` |
| description | `description` | `AllText^0.1 ReferenceTitle^2` | `text^0.1 synonym^3` |

**ARSA 向け qf 例:**

```
qf=AllText^0.1 PrimaryAccessionNumber^20 AccessionNumber^10 Definition^5 Organism^3 ReferenceTitle^2
```

**TXSearch 向け qf 例:**

```
qf=scientific_name^10 scientific_name_ex^20 common_name^5 synonym^3 japanese_name^5 text^0.1
```

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
GET /db-portal/search?q=<keyword>             # 横断検索（count のみ、3 並列 fan-out）
GET /db-portal/search?q=<keyword>&db=<id>     # DB 指定検索（結果リスト）
GET /db-portal/search?adv=<dsl>&db=<id>       # Advanced Search（結果リスト）
```

- `q`（シンプル検索）と `adv`（Advanced Search の DSL 文字列、[search.md の URL 形式](./search.md#advanced-search-の-url-形式) 参照）はどちらか必須。両方同時指定は 400
- `db` 未指定 + `q` のみ = 横断検索 count、`db` 指定 = 結果リスト
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
