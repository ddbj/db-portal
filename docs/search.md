# 検索

## 概要

DB ポータルは DDBJ の各データベースに対する統合的な検索入口を提供する。ユーザーには DB 名を提示し、バックエンドの検索エンジンの違いは吸収する。

検索は 2 層構成:

1. **横断検索**: 全 DB に対してキーワード検索し、DB ごとのヒット数サマリーを表示
2. **DB 指定検索**: 特定の DB に絞った検索結果リストを表示

DB 個別のファセット検索は設けない。

## DB 一覧

ポータルの検索対象とする DB:

| DB | 正式名称 | 対象データ | INSDC 対応 |
|---|---|---|---|
| DDBJ | DNA DataBank of Japan | アノテーション/アセンブル済み塩基配列 | GenBank / ENA / DDBJ |
| DRA | DDBJ Sequence Read Archive | 生シークエンスデータ | SRA |
| BioProject | - | プロジェクトメタデータ | INSDC BioProject |
| BioSample | - | 生物学的サンプル情報 | INSDC BioSample |
| JGA | Japanese Genotype-phenotype Archive | ヒトの遺伝型・表現型（メタデータのみ検索可能） | - |
| GEA | Genomic Expression Archive | 機能ゲノミクスデータ（RNA-seq, ChIP-Seq 等） | - |
| MetaboBank | MetaboBank | メタボロミクスデータ | - |
| Taxonomy | INSDC Taxonomy | 生物分類 | INSDC 共有 |

### スコープ外とした DB

| DB | 理由 |
|---|---|
| AGD | Controlled access。研究者間共有に限定されており、ポータルでの検索対象外 |
| TogoVar-repository | DBCLS の TogoVar で検索可能。DDBJ 検索エンジンのカバー外 |
| DDBJ-LD | RDF / SPARQL。キーワード検索の対象として適さない |
| Pathogens Portal | 独立ポータル (pathogens.jp) として運用中 |
| DTA (Trace Archive) | 閉鎖済み |

## 検索エンジンと DB の対応

横断検索 API は DDBJ Search API を拡張して、各検索エンジンを束ねるプロキシとして機能する（Search API は別リポジトリで開発）。

将来的には全 DB を DDBJ Search のインデックスに統合する方針。ARSA・TXSearch は REST API (JSON) を公開しておらず、ソースコードも非公開のため、ポータルから直接呼び出せない。

| バックエンド検索エンジン | 検索対象 DB | 備考 |
|---|---|---|
| DDBJ Search | DRA, BioProject, BioSample, JGA, GEA, MetaboBank | GEA・MetaboBank はインデックス追加が必要 |
| DDBJ Search (予定) | DDBJ（塩基配列）, Taxonomy | 現行は ARSA・TXSearch が担当。インデックス追加が必要 |

ユーザーには検索エンジン名を見せない。DB セレクタには DB 名のみを表示し、Search API が適切にルーティングする。

```
ユーザー操作          Search API 内部
─────────          ──────────
DB セレクタ          Elasticsearch インデックス
├── DDBJ        →   ddbj（要構築）
├── DRA         →   sra-*
├── BioProject  →   bioproject
├── BioSample   →   biosample
├── JGA         →   jga-*
├── GEA         →   gea（要構築）
├── MetaboBank  →   metabobank（要構築）
└── Taxonomy    →   taxonomy（要構築）
```

## 検索フロー

```
[トップページ] キーワード入力 + DB セレクタ
  |
  v
[/search?q=xxx] 横断検索結果
  ├── DB ごとのヒット数サマリー
  └── 各 DB の結果リストへのリンク
  |  (DB をクリック)
  v
[/search?q=xxx&db=yyy] DB 指定検索結果
  ├── 統一的な簡易リスト表示
  └── 各レコードの外部詳細ページへのリンク
  |  (レコードをクリック)
  v
[外部] 各 DB の既存詳細ページ
```

### Accession 入力時の挙動

Accession（例: `PRJDB12345`）も通常のキーワードとして全文検索される。特別な判定ロジックは設けない。検索結果の中で identifier に完全一致するレコードがあれば、UI 上で目立たせる（Featured result）。

### 横断検索結果の DB 表示順序

ヒット数降順。ユーザーにとって結果が多い DB を上に表示する。

## キーワード検索仕様

| 項目 | 仕様 |
|---|---|
| スペース区切り | AND（`human genome` = `human AND genome`） |
| Boolean 演算子 | AND / OR（大文字で記述）。NOT は将来対応 |
| フレーズ検索 | ダブルクォート `"Homo sapiens"` で完全一致 |
| ワイルドカード | `*` で 0 文字以上の置換（例: `PRJDB*`） |
| 大文字小文字 | 区別なし |
| フィールド指定検索 | 第一段階では対応しない。将来 Advanced Search として対応 |
| 自動用語展開 (ATM) | 対応しない（DDBJ には MeSH 等の用語辞書がない） |

Elasticsearch の standard analyzer によるトークナイズがベース。

## ページネーション仕様

| 項目 | 仕様 |
|---|---|
| デフォルト件数 | 20 件 |
| 件数選択肢 | 20 / 50 / 100 |
| 方式 | offset-based（上限 10,000 件）+ cursor-based（10,000 件超） |
| ソート | Relevance（デフォルト）/ Date 新しい順 / Date 古い順 |

DDBJ Search API の既存ページネーション方式をそのまま利用する。

## URL 設計

| ページ | URL |
|---|---|
| 横断検索結果 | `/search?q=xxx` |
| DB 指定検索結果 | `/search?q=xxx&db=yyy` |

`db` パラメータの値:

| 値 | DB |
|---|---|
| `ddbj` | DDBJ |
| `dra` | DRA |
| `bioproject` | BioProject |
| `biosample` | BioSample |
| `jga` | JGA |
| `gea` | GEA |
| `metabobank` | MetaboBank |
| `taxonomy` | Taxonomy |

## 参考: NCBI Entrez / EBI Search の UX パターン

### NCBI Entrez

- **トップページ**: DB セレクタ（ドロップダウン、~30 DB）+ テキストボックス。"All Databases" がデフォルト
- **横断検索結果** (`/search/all/?term=xxx`): "Results found in N databases"。カテゴリ別（Literature, Genes, Proteins, Genomes, Clinical, PubChem）に DB 名 + ヒット数を一覧表示。特に関連性の高い結果は Featured result として目立たせる
- **DB 個別結果** (`/gene/?term=xxx`): DB 固有の UI。左サイドバーにファセットフィルタ

### EBI Search

- **トップページ**: カテゴリセレクタ（DB 名ではなくデータタイプで分類）+ テキストボックス
- **横断検索結果** (`/ebisearch/search?db=allebi&query=xxx`): 左サイドバーにカテゴリ別ヒット数ツリー。メインにカテゴリ別の上位結果を表示

### DB ポータルへの適用

- NCBI の「DB 名 + ヒット数」方式を採用（DB 数が 8 と少ないため、EBI のようなカテゴリ階層は不要）
- NCBI の Featured result（Accession マッチ時の強調表示）を採用
- ファセット検索は設けない（NCBI の DB 個別ファセットに相当する機能はスコープ外）

## NCBI / EBI との DB 対応表

| DDBJ | NCBI | EBI |
|---|---|---|
| DDBJ | Nucleotide | ENA |
| DRA | SRA | ENA |
| BioProject | BioProject | BioStudies |
| BioSample | BioSample | BioSamples |
| JGA | dbGaP | EGA |
| GEA | GEO DataSets / GEO Profiles | ArrayExpress |
| MetaboBank | - | MetaboLights |
| Taxonomy | Taxonomy | Taxonomy |

## 現行検索エンジンの仕様

各検索エンジンの現行仕様を記録する。DDBJ Search にインデックスを統合する際の参考とする。

### DDBJ Search

- ソースコード: [ddbj/ddbj-search-api](https://github.com/ddbj/ddbj-search-api) (FastAPI + Elasticsearch)
- API: `https://ddbj.nig.ac.jp/search/api`
- レスポンス: JSON

#### API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/entries/` | 全タイプ横断検索 |
| GET | `/entries/{type}/` | タイプ別検索 |
| GET | `/entries/{type}/{id}` | エントリ詳細 |
| GET | `/entries/{type}/{id}.json` | 完全 JSON (dbXrefs 全件) |
| GET | `/entries/{type}/{id}.jsonld` | JSON-LD 形式 |
| GET | `/facets` | ファセット集計 |

#### 検索パラメータ

| パラメータ | 説明 |
|---|---|
| `keywords` | 検索語 (カンマ区切り、引用符でフレーズ) |
| `keywordFields` | 検索対象フィールド (identifier, title, name, description) |
| `keywordOperator` | AND / OR (デフォルト AND) |
| `organism` | NCBI Taxonomy ID |
| `datePublishedFrom/To` | 公開日範囲 (ISO 8601) |
| `dateModifiedFrom/To` | 更新日範囲 (ISO 8601) |
| `sort` | `{field}:{direction}` |
| `page` | ページ番号 (1 始まり) |
| `perPage` | 1-100 (デフォルト 10) |
| `cursor` | 深いページング用 (10,000 件超) |

#### 対応タイプ (12 種)

`bioproject`, `biosample`, `sra-submission`, `sra-study`, `sra-experiment`, `sra-run`, `sra-sample`, `sra-analysis`, `jga-study`, `jga-dataset`, `jga-dac`, `jga-policy`

#### 結果フィールド (共通)

identifier, type, title, organism, description, published at, related objects

#### DB 別の追加情報

- **BioProject**: project type, parentBioProjects, childBioProjects, organization, publication, grant, external link
- **BioSample**: attributes (key-value 一覧)
- **SRA (sra-run 等)**: library descriptor, platform
- **JGA**: controlled-access ラベル

### ARSA

- ソースコード: 非公開
- URL: `https://ddbj.nig.ac.jp/arsa/`
- レスポンス: HTML のみ (REST API なし)
- バックエンド: Lucene / Solr
- インフラ: 172.19.15.11:51181 (a011)

#### 検索対象データ

DDBJ 最新リリース + 新着データのアノテーション/アセンブル済み塩基配列。WGS, TSA の一部, MGA, DRA は検索不可。

#### Quick Search

Lucene クエリ構文: AND/OR/NOT、ワイルドカード (`*`, `?`)、フレーズ検索 (`"..."`)、正規表現 (`/.../`)、範囲検索 (`[* TO 500]`)、フィールド指定 (`Organism:human`)。

#### Advanced Search フィールド

| フィールド | 型 |
|---|---|
| Primary Accession Number | テキスト |
| Accession Number | テキスト |
| Sequence Length | 範囲 (from-to) |
| Molecular Type | 選択 (DNA, RNA, cRNA, mRNA, rRNA, tRNA, PRT) |
| Molecular Form | 選択 (circular, linear) |
| Division | 選択 (BCT, CON, ENV, EST, GSS, HTC, HTG, HUM, INV, MAM, PAT, PHG, PLN, PRI, ROD, STS, SYN, TSA, UNA, VRL, VRT) |
| Date | 範囲 (from-to) |
| Definition | テキスト |
| Keyword | テキスト |
| Organism | テキスト |
| Lineage | テキスト |
| Reference Authors | テキスト |
| Reference Title | テキスト |
| Reference Journal | テキスト |
| Reference PubmedID | テキスト |
| Comment | テキスト |
| Features | Feature Key / Qualifier Name / Qualifier Value |
| All Text | テキスト |

#### 結果フィールド

PrimaryAccessionNumber, Definition, SequenceLength, MolecularType, Organism

#### ファセット

Division (BCT, CON, ENV 等 21 種)、Organism

#### 制限

- 表示上限: 10,000 件
- ダウンロード上限: 3,000 エントリ / リクエスト

### TXSearch

- ソースコード: 非公開
- URL: `https://ddbj.nig.ac.jp/tx_search/`
- レスポンス: HTML のみ (検索結果の JSON API なし、`/{taxId}/getChildren` のみ JSON)
- バックエンド: Solr (standard query parser)
- インフラ: 172.19.15.12:32005 (a012)

#### 検索仕様

デフォルトで部分一致 (Solr トークナイズ)。以下のフィールドを横断検索:

tax_id, scientific_name, common_name, synonym, acronym, anamorph, teleomorph, authority, blast_name, equivalent_name, in_part, includes, misnomer, misspelling, type_material, lineage, rank

フィールド指定: `scientific_name:(Homo sapiens)`, `tax_id:9606`。完全一致: `_ex` サフィックス (`scientific_name_ex:"Homo sapiens"`)。ワイルドカード (`*`, `?`)、AND/OR/NOT 対応。

#### 結果フィールド

scientific_name, tax_id, rank, division_code, genetic_code_id, mt_genetic_code_id, common_name, authority, lineage

#### エントリ詳細 (`/{taxId}`)

Tree 画面 (デフォルト): lineage パンくず + 子 taxon テーブル。Info 画面 (`?view=info`): 全フィールド表示。

#### 制限

- 検索結果上限: **1,000 件** (scientific_name 昇順、ソート変更不可)

## 未決事項

- [ ] DDBJ Search への DDBJ（塩基配列）インデックス追加（別リポ側）
- [ ] DDBJ Search への Taxonomy インデックス追加（別リポ側）
- [ ] DDBJ Search への GEA インデックス追加（別リポ側）
- [ ] DDBJ Search への MetaboBank インデックス追加（別リポ側）
- [ ] ARSA / TXSearch のソースコード・インフラ調査
