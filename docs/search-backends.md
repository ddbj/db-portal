# 検索バックエンド

DDBJ Search API が束ねる 3 つのバックエンド（DDBJ Search の ES / ARSA / TXSearch）の詳細仕様。DB ポータルの UI 仕様は [search.md](./search.md)。

| バックエンド | 検索エンジン | 担当 DB |
|---|---|---|
| DDBJ Search | Elasticsearch | DRA, BioProject, BioSample, JGA, GEA, MetaboBank |
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
| `type` | `ddbj`（固定） | `taxonomy`（固定） |
| `title` | `Definition` | `scientific_name` |
| `organism` | `Organism` | `scientific_name` |
| `description` | `Definition` + `Organism` + `Division` 等を連結 | `common_name` + `rank` + `lineage` を連結 |
| `publishedAt` | `Date`（`YYYYMMDD` → ISO 8601） | なし（null） |

### クエリ変換

ポータル UI で受けるキーワードは [search.md のキーワード仕様](./search.md#キーワード検索仕様) に従って正規化:

- AND/OR は Solr/ES 共通（Lucene 由来）なので素通し
- フレーズ `"..."` も共通
- ワイルドカード `*` も共通
- ES の `keywordFields` 相当を Solr `qf`（edismax）で表現

**ARSA 向け qf 例:**

```
qf=AllText^0.1 PrimaryAccessionNumber^20 AccessionNumber^10 Definition^5 Organism^3 ReferenceTitle^2
```

**TXSearch 向け qf 例:**

```
qf=scientific_name^10 scientific_name_ex^20 common_name^5 synonym^3 japanese_name^5 text^0.1
```

### ページネーション

- **ES 側**: 既存の offset + cursor（PIT + search_after）をそのまま利用
- **Solr 側**: `start` + `rows` の offset ベースのみ。上位 10,000 件までサポート、それ以上は対象外（横断検索の UI 上限と整合）

### Distributed Search（ARSA）

Solr の `shards` パラメータに全 shard の URL を並べて 1 回で集約。自前 fan-out 実装は不要。

1. 環境ごとの shard 一覧を `config.py` で設定化（prod: 8 台、staging: 3 台）
2. `solr/client.py` が `shards` を自動付与
3. 返却された `numFound` と `docs` を統一スキーマに変換

### エラーハンドリング

- 横断検索は各バックエンド独立 → 部分成功を許容
- タイムアウト: バックエンド単位で個別設定（ES 60s、ARSA は Solr QTime が 1 秒台、TXSearch は 1-3 秒 → 10s 程度）
- エラー時: 該当 DB のヒット数を `null` で返却、UI で「取得失敗」表示

### キャッシュ候補

横断検索は同一キーワードの再利用が多い（ユーザが DB を切り替えるたびに同じ `q` を投げる）。count のみ先行 fetch → 詳細は DB 絞り込み時に個別 fetch する 2 段構成と、in-memory LRU or Redis キャッシュの検討余地あり。

## 未調査事項

実装進行に応じて必要になる確認項目:

- **ES と Solr の score 正規化**: 横断検索で並べる際の relevance 比較方法（現状は DB 単位に分けて表示するので不要？）
