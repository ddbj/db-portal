# 検索

DDBJ の各データベースに対する統合検索の仕様。横断検索 + DB 指定検索の 2 層構成で、各検索エンジンの違いは DDBJ Search API で吸収する。

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
| DDBJ (Trad) | DNA DataBank of Japan（Traditional Annotation） | アノテーション/アセンブル済み塩基配列 | GenBank / ENA / DDBJ |
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

バックエンドの扱いは 2 種類に分かれる:

- **ES インデックス**: DDBJ Search が管理する Elasticsearch インデックスに実データを投入して検索する方式
- **Proxy**: 既存の検索エンジン（ARSA / TXSearch）を Search API 経由で呼び出す方式。内部ネットワークから Solr に直接 HTTP クエリを投げて JSON を取得する（詳細は [search-backends.md](./search-backends.md)）

DDBJ (Trad) と Taxonomy は ES インデックスを新たに構築せず、ARSA / TXSearch をそのまま proxy する方針。

| 方式 | バックエンド | 検索対象 DB | 備考 |
|---|---|---|---|
| ES index | DDBJ Search | DRA, BioProject, BioSample, JGA, GEA, MetaboBank | GEA・MetaboBank はインデックス追加が必要 |
| Proxy | ARSA | DDBJ (Trad) | 8 shard に fan-out して結果マージ |
| Proxy | TXSearch | Taxonomy | 単一コア (ncbi_taxonomy) に edismax クエリ |

ユーザーには検索エンジン名も方式も見せない。DB セレクタには DB 名のみを表示し、Search API が適切にルーティングする。

```
ユーザー操作          Search API 内部
─────────          ──────────
DB セレクタ
├── DDBJ (Trad) →   ARSA (Solr proxy, 8 shard fan-out)
├── DRA         →   ES: sra-*
├── BioProject  →   ES: bioproject
├── BioSample   →   ES: biosample
├── JGA         →   ES: jga-*
├── GEA         →   ES: gea（要構築）
├── MetaboBank  →   ES: metabobank（要構築）
└── Taxonomy    →   TXSearch (Solr proxy)
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
| 方式 | offset-based（上限 10,000 件）+ cursor-based（10,000 件超、ES バックエンドのみ） |
| ソート | Relevance（デフォルト）/ Date 新しい順 / Date 古い順 |

DDBJ Search API の既存ページネーション方式をそのまま利用する。ES バックエンドは PIT + `search_after` で 10,000 件超の deep paging を提供。Solr バックエンド（ARSA / TXSearch）は Solr 4.4 の制約で cursor 非対応のため offset ベースの上位 10,000 件までサポート、それ以上は対象外。

## URL 設計

| ページ | URL |
|---|---|
| 横断検索結果 | `/search?q=xxx` |
| DB 指定検索結果 | `/search?q=xxx&db=yyy` |

`db` パラメータの値:

| 値 | DB |
|---|---|
| `ddbj` | DDBJ (Trad) |
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
| DDBJ (Trad) | Nucleotide | ENA |
| DRA | SRA | ENA |
| BioProject | BioProject | BioStudies |
| BioSample | BioSample | BioSamples |
| JGA | dbGaP | EGA |
| GEA | GEO DataSets / GEO Profiles | ArrayExpress |
| MetaboBank | - | MetaboLights |
| Taxonomy | Taxonomy | Taxonomy |

## バックエンド

各検索エンジンの詳細仕様（接続情報、スキーマ、クエリ、proxy 実装方針、未調査事項）は [search-backends.md](./search-backends.md) に集約。
