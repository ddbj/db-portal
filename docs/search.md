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

| UI ラベル | `db` 値 | 正式名称 | 対象データ | INSDC 対応 |
|---|---|---|---|---|
| Trad (Annotated Sequences) | `trad` | DDBJ Traditional Annotation | DDBJ が MSS / NSSS 経由で受領したアノテーション/アセンブル済み塩基配列（DDBJ 固有分のみ、GenBank / ENA ミラーは含まず）+ Patent 由来のアミノ酸配列 | INSDC 塩基配列 DB の DDBJ 拠出分 |
| SRA | `sra` | Sequence Read Archive | 生シークエンスデータ（DDBJ DRA + NCBI SRA + EBI ENA を横断） | INSDC Read Archive 全体 |
| BioProject | `bioproject` | - | プロジェクトメタデータ | INSDC BioProject |
| BioSample | `biosample` | - | 生物学的サンプル情報 | INSDC BioSample |
| JGA | `jga` | Japanese Genotype-phenotype Archive | ヒトの遺伝型・表現型（メタデータのみ検索可能） | - |
| GEA | `gea` | Genomic Expression Archive | 機能ゲノミクスデータ（RNA-seq, ChIP-Seq 等） | - |
| MetaboBank | `metabobank` | MetaboBank | メタボロミクスデータ | - |
| Taxonomy | `taxonomy` | INSDC Taxonomy | 生物分類 | INSDC 共有 |

※ Trad の検索は ARSA（Solr）を backend とする。ARSA の検索インデックスは WGS・TSA の一部・MGA・DRA（生リード）を含まない（[search-backends.md の ARSA](./search-backends.md#arsa) 参照）。MSS / NSSS 経由で登録された全データが検索可能なわけではない点に注意。

### スコープ外とした DB

| DB | 理由 |
|---|---|
| AGD | Controlled access。研究者間共有に限定されており、ポータルでの検索対象外 |
| TogoVar-repository | DBCLS の TogoVar で検索可能。DDBJ 検索エンジンのカバー外 |
| DDBJ-LD | RDF / SPARQL。キーワード検索の対象として適さない |
| Pathogens Portal | 独立ポータル (pathogens.jp) として運用中 |
| DTA (Trace Archive) | 閉鎖済み |

## 検索エンジンと DB の対応

横断検索 API は DDBJ Search API を拡張して、各検索エンジンを束ねる proxy として機能する（Search API は別リポジトリで開発）。

バックエンドの扱いは 2 種類に分かれる:

- **ES インデックス**: DDBJ Search が管理する Elasticsearch インデックスに実データを投入して検索する方式
- **proxy**: 既存の検索エンジン（ARSA / TXSearch）を Search API 経由で呼び出す方式。内部ネットワークから Solr に直接 HTTP クエリを投げて JSON を取得する（詳細は [search-backends.md](./search-backends.md)）

Trad と Taxonomy は ES インデックスを新たに構築せず、ARSA / TXSearch をそのまま proxy する方針。

| 方式 | バックエンド | 検索対象 DB | 備考 |
|---|---|---|---|
| ES index | DDBJ Search | SRA, BioProject, BioSample, JGA, GEA, MetaboBank | GEA・MetaboBank はインデックス追加が必要 |
| proxy | ARSA | Trad | 8 shard に fan-out して結果マージ |
| proxy | TXSearch | Taxonomy | 単一コア (ncbi_taxonomy) に edismax クエリ |

ユーザーには検索エンジン名も方式も見せない。DB セレクタには DB 名のみを表示し、Search API が適切にルーティングする。

```
ユーザー操作          Search API 内部
─────────          ──────────
DB セレクタ
├── Trad (Annotated Sequences) →   ARSA (Solr proxy, 8 shard fan-out)
├── SRA                        →   ES: sra-*
├── BioProject                 →   ES: bioproject
├── BioSample                  →   ES: biosample
├── JGA                        →   ES: jga-*
├── GEA                        →   ES: gea（要構築）
├── MetaboBank                 →   ES: metabobank（要構築）
└── Taxonomy                   →   TXSearch (Solr proxy)
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
  ├── カードリスト形式（NCBI Entrez 風）
  │     各カード: accession / title / description / organism / DB 固有メタデータ / 関連 DB リンク
  └── タイトルクリックで外部詳細ページへ遷移（target="_blank"）
  |  (タイトルをクリック)
  v
[外部] 各 DB の既存詳細ページ
```

### Accession 入力時の挙動

Accession（例: `PRJDB12345`）も通常のキーワードとして全文検索される。特別な判定ロジックは設けず、relevance score 上位に来ることで救う。

### 横断検索結果の DB 表示順序

ヒット数降順。ユーザーにとって結果が多い DB を上に表示する。`count` が `null`（取得失敗）の DB はヒット 0 件相当として末尾にまとめて表示する。

## キーワード検索仕様

シンプル検索ボックスと Advanced Search（クエリビルダ）の 2 層構成。複雑な構文はシンプル検索ボックスに詰め込まず、Advanced Search に分離する。

方針の根拠:

- NN/g: トップはシンプル、Advanced は別ページに退避。「ほとんどのユーザは Boolean 構文を使えない」
- Jansen/Spink の検索ログ研究: Boolean 演算子を書くユーザは 8-10%、うち 26% は誤用
- PubMed 実ログ: 研究者も初心者と同じ振る舞い（数キーワードを打ってタイトルをスキャン）
- EBI Search / ENA は 2019 年以降、Advanced Search ページを GUI Query Builder に置き換え済み
- 業界に「単一ボックス構文の標準」は存在しない（EBI Search = スペース AND、BioSamples = スペース OR、Entrez = 大文字 Boolean 強制など分散）

### シンプル検索ボックス

トップページとヘッダに常駐する単一テキストボックス。

| 項目 | 仕様 |
|---|---|
| スペース区切り | 暗黙 AND |
| フレーズ検索 | `"Homo sapiens"`（ダブルクォートで完全一致） |
| 記号を含む識別子 | `HIF-1`・`BRCA1/2`・`CD4+`・`E. coli` 等、Lucene メタ文字等の記号を含むトークンは自動でフレーズクエリ化する（主に Solr edismax の演算子誤解釈回避が目的。記号判定文字集合の詳細は [search-backends.md のクエリ変換](./search-backends.md#クエリ変換) を参照） |
| 大文字小文字 | 区別なし |
| Boolean 演算子 `AND`/`OR`/`NOT` | 非対応（リテラル扱い）。Advanced Search に誘導 |
| 括弧 `()` グループ化 | 非対応（リテラル扱い）。Advanced Search に誘導 |
| ワイルドカード `*`/`?` | 非対応（リテラル扱い）。Advanced Search に誘導 |
| フィールド指定 `field:value` | 非対応（`:` はリテラル扱い）。Advanced Search に誘導 |
| ファジー `~` | 非対応（EBI Search と同じくパフォーマンス理由でブロック） |
| Accession 自動判定 | なし。通常の全文検索で relevance score 上位に来ることを期待 |
| 自動用語展開 (ATM) | 対応しない（DDBJ には MeSH 等の統制語彙がない） |

「非対応」はユーザ入力にこれらの文字が含まれていても**エラーにはせず、通常の検索語として扱う**（Lucene 演算子として解釈しない）という意味。意図的に使いたい場合は Advanced Search を使う。

#### 記号を含むトークンの自動フレーズ化

主目的は **Solr edismax が `-` `+` `:` `(` `)` `&&` `||` などを演算子として誤解釈することを回避**すること（フレーズ化してクォート内に入れば演算子扱いされない）。ES 側では同様の誤解釈リスクは `bool` + `multi_match(type: phrase)` 構成で元々起きないため、以下の処理は主に Solr バックエンド向けの保護である。

proxy 層でユーザ入力を次のように正規化する:

1. 入力から `"..."` で囲まれたフレーズトークンを先に切り出す
2. 残りをスペース区切りでトークン化
3. Lucene メタ文字等の記号を含むトークンは、内部的にフレーズクエリとして扱う（Solr ではクォート済み文字列として `q` に渡す、ES では `match_phrase` に渡す）。記号判定文字集合の定義は [search-backends.md のクエリ変換](./search-backends.md#クエリ変換) を参照
4. 全トークンを AND 結合して各バックエンドへ

**ES 側の補足**: standard analyzer 前提では `HIF-1` は `hif` + `1` に分解されるため、フレーズ化しても `HIF 1` と `HIF-1` はスコア上区別できない（両方同等ヒット）。`HIF-1` と完全一致したい場合は Advanced Search の `identifier` フィールド完全一致を使う。

**Solr 側の補足**: ARSA の `text_all` (PatternTokenizer `[a-zA-Z0-9]+|[^a-zA-Z0-9\s]`) は `-` `/` 等もトークン化するため、フレーズクエリで `HIF` `-` `1` の連続位置を要求でき、誤ヒットが減る可能性がある（実測は未調査事項）。TXSearch は standard tokenizer なので ES と同じ挙動。

完全一致 identifier 検索が必要なケースは Advanced Search の `identifier` フィールド完全一致で救う方針で確定。ES analyzer の再設計（`word_delimiter_graph` + `preserve_original` 等への入れ替え + 再インデックス）は対応しない: 自動フレーズ化 + Advanced Search で実用上の精度は確保できており、analyzer を全 DB で揃え直すコスト（再インデックス・既存 API への影響・ユースケースごとの最適解の分散）に見合うリターンがない。Lucene メタ文字の具体的なエスケープ契約は [search-backends.md のクエリ変換](./search-backends.md#クエリ変換) に記述する。

### Advanced Search

別ページ（`/advanced-search`）に配置する GUI クエリビルダ（PubMed Advanced / ENA Advanced 型）。

DB ポータルの存在意義は「横断検索」なので、**Advanced Search も横断検索を許可する**。以下 2 モードを切り替え:

- **全データベース（横断）**: 全 DB に共通のフィールドのみ利用可（Tier 1 / 一部 Tier 2）
- **単一 DB**: その DB で使える全フィールド（Tier 3 の DB 特化フィールドも含む）

生成クエリは DSL 文字列としてプレビュー表示し、URL（`adv=` パラメータ）にも載せてブックマーク可能にする。バックエンド固有名（`PrimaryAccessionNumber`・`scientific_name` 等）はユーザに見せない。

#### フィールド構成（3 層）

共通語彙を 3 層に整理する。各層のバックエンドマッピングは [search-backends.md の共通のフィールド対応](./search-backends.md#共通のフィールド対応) を参照。

**Tier 1: 全 DB 横断で使える（即実装可能）**

| 共通語彙 | 用途 | 対応 DB |
|---|---|---|
| `identifier` | アクセッション完全一致・前方一致・ワイルドカード | 全 DB |
| `title` | タイトル / 名称 | 全 DB |
| `description` | 記述 | 全 DB |
| `organism` | 生物種（学名・Taxonomy ID 両対応） | Taxonomy 除く全 DB |
| `date_published` | 公開日 | Taxonomy 除く全 DB |
| `date_modified` | 更新日 | 同上 |
| `date_created` | 作成日 | 同上 |
| `date` | 「いずれかの日付」（上 3 種の OR 範囲検索） | 同上 |

**Tier 2: 横断で使えると嬉しい（一部 DB は API 拡張必要）**

| 共通語彙 | 即使える DB | 要拡張 DB |
|---|---|---|
| `submitter` | BioProject（`organization.name`） | SRA / JGA / BioSample / GEA / MetaboBank（center_name 等の正規化が必要） |
| `publication` | BioProject（`publication.id`）、Trad（`ReferencePubmedID`） | JGA / SRA（properties parse が必要） |

DSL 側の allowlist 名（共通語彙）と、converter が ES に投入する top-level フィールド名は一致しない項目がある。`publication` は ES フィールド名 `publicationId` にマップされる。変換は proxy 側で行い、ユーザには DSL 語彙のみ露出する。詳細は [search-backends.md の Tier 2 共通のフィールド対応](./search-backends.md#tier-2-横断で使えると嬉しいconverter-側で正規化が必要) を参照。

**Tier 3: 単一 DB 選択時のみ利用可（DB 特化）**

| DB | フィールド例 | 備考 |
|---|---|---|
| SRA / GEA | `library_strategy`, `library_source`, `library_layout`, `platform`, `instrument_model` | SRA は properties parse 必要（詳細は [search-backends.md](./search-backends.md#共通のフィールド対応)） |
| BioSample | `geo_loc_name`, `collection_date`, `host`, `disease`, `tissue`, `env_biome` 等 | `attributes.harmonized_name` ベース。代表属性の top-level 昇格は将来検討 |
| BioProject | `project_type`, `grant_agency` | — |
| Trad | `division`, `molecular_type`, `sequence_length`, `feature_gene_name`, `reference_journal` | ARSA の既存スキーマで検索可 |
| Taxonomy | `rank`, `lineage`, `kingdom`, `phylum`, `class`, `order`, `family`, `genus`, `species`, `common_name`, `japanese_name` | TXSearch の既存スキーマで検索可 |
| JGA | `study_type`, `grant_agency`, `principal_investigator`, `submitting_organization` | 全て properties parse 必要 |

#### 日付フィールド

`date` は DDBJ Search API の ES mapping にある `dateCreated` / `dateModified` / `datePublished` に対応する 3 フィールド + 「いずれか」の 4 形態で扱う:

- **DSL**: `date_published:[2020-01-01 TO 2024-12-31]` / `date_modified:[...]` / `date_created:[...]` / `date:[...]`（3 種の OR）
- **UI**: date フィールド行にサブセレクタ「公開日 / 更新日 / 作成日 / いずれか」を出す
- **入力**: ISO 8601（`YYYY-MM-DD`）の DatePicker。演算子は `between` / `gte` / `lte` / `eq`

##### バックエンド別の制約と UI 挙動

ARSA（Trad）は `Date` フィールドが 1 種類のみ（DDBJ/GenBank flatfile の LOCUS 行の日付 = 最終更新日相当。未更新レコードでは公開日と一致するためポータルでは公開日扱いにマッピング）、TXSearch（Taxonomy）は日付概念そのものがない（詳細は [search-backends.md の共通のフィールド対応](./search-backends.md#共通のフィールド対応) 参照）。

| 状況 | date サブセレクタの UI 挙動 | 内部処理 |
|---|---|---|
| 単一 DB = Trad | 「公開日」のみ選択可。他のサブ選択肢（更新日 / 作成日 / いずれか）は**非活性化** + tooltip「Trad では公開日のみ利用可」 | `date_published` を ARSA の `Date` にマップ |
| 単一 DB = Taxonomy | date フィールド自体を**非活性化** + tooltip「Taxonomy は日付検索に非対応」 | N/A |
| 単一 DB = その他（ES 管轄） | 全選択肢（公開日 / 更新日 / 作成日 / いずれか）活性 | 対応する ES date フィールドに `range` クエリ |
| 横断モード（全データベース） | 全選択肢を活性のまま表示 | ES 管轄 DB は正常動作。Trad は `date_modified` / `date_created` / `date`（OR） 指定時に `date_published` で代替評価（ベストエフォート）。Taxonomy は date 条件含みの結果を常に 0 件扱い |

**設計判断の根拠:**

- 単一 DB 時は「できないものは見せない」: ユーザーが明示的にその DB を選んでいるので、使えない選択肢を隠す方が誤解を避けられる
- 横断時は「最大公約数を許す」: 他 DB で使える条件を封じると横断検索の価値が落ちる。Trad だけベストエフォートで代替評価し、UI に警告は出さない（他 DB では正常動作するため）

#### 演算子とフィールドの組み合わせ

GUI セレクタはフィールドの型に応じて選べる演算子を動的にフィルタする:

| フィールド型 | 利用可能な演算子 |
|---|---|
| 識別子（`identifier`） | `equals` / `starts_with` / `wildcard` |
| テキスト（`title` / `description` / `submitter` / `publication` 等） | `contains` / `equals` / `starts_with` / `wildcard` |
| 生物種（`organism`） | `equals` / `contains`（学名・Taxonomy ID どちらでも） |
| 日付（`date_*`） | `between` / `gte` / `lte` / `equals` |
| 数値（`sequence_length` 等） | `between` / `gte` / `lte` / `equals` |
| 列挙値（`library_strategy` / `platform` / `rank` 等） | `equals` / `not_equals`（プルダウン選択） |

#### レイアウト

```
┌─ /advanced-search ─────────────────────────────────────┐
│  詳細検索                                                │
│                                                        │
│  Database                                              │
│  ○ 全データベース（横断）                                  │
│  ○ [ BioProject ▼ ]                                    │
│                                                        │
│  検索条件                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │        [Title     ▼][contains ▼][__________]   │   │
│  │ [AND▼] [Organism  ▼][equals   ▼][__________] [✕]│   │
│  │ [OR ▼] [Date ▼ 公開日▼][between ▼][__ 〜 __] [✕]│   │
│  │                                                  │   │
│  │ [+ 条件を追加]                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  クエリプレビュー                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ title:"cancer" AND organism:"Homo sapiens"      │   │
│  │   AND date_published:[2020-01-01 TO 2024-12-31] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  Examples                                              │
│  [ヒトの最新 BioProject] [BRCA1 関連の SRA]              │
│                                                        │
│                                            [ 検索 ]    │
└────────────────────────────────────────────────────────┘
```

- 1 行目には演算子ドロップダウンを置かない（最初の条件に AND/OR は不要）
- 2 行目以降の先頭に `AND` / `OR` / `NOT`
- 各行に削除ボタン（✕）
- 「+ 条件を追加」で行追加（ネスト深さ上限 5、[search-backends.md のスキーマ仕様](./search-backends.md#スキーマ仕様) 参照）
- フィールド型に応じて入力 UI が切り替わる（テキスト / DatePicker / 列挙値プルダウン）
- クエリプレビューの挙動は [クエリプレビュー](#クエリプレビュー) 参照

#### クエリプレビュー

プレビュー欄は **read-only**。ユーザは DSL 文字列を直接編集できない。

- **表示**: GUI の条件変更に合わせてリアルタイムに DSL 文字列を再生成
- **テキスト選択**: 可能（手動コピーにも対応）
- **[コピー] ボタン**: プレビュー欄右上に配置。クリップボードに DSL 文字列をコピー
- **編集**: 不可（構文エラーは GUI 側では原理的に発生しないため、エラー表示も不要）

**編集不可とする根拠:**

- クライアント側に独自パーサを実装しない原則（[GUI ↔ DSL の方向性](#gui--dsl-の方向性) 参照）と整合。編集可にすると DSL バリデータ/パーサがクライアントにも必要になり SSOT が崩れる
- 編集した DSL を GUI state に戻す経路も必要になり複雑化
- URL バー（`adv=...`）を直接編集する手段は残るため、上級者の逃げ道は確保

**コピーボタンの想定ユースケース:**

- 論文 Methods への検索クエリ引用（再現性担保、NCBI PubMed / ENA の利用者が実際にやる用途）
- Search API への curl 等での移植（同一 DSL を `?adv=...` で受ける前提、ENA Portal API 相当）
- URL 全体のブックマーク・他者への共有は URL コピーで別途まかなう（DSL 単独コピーの主用途は「論文引用 + API 移植」の 2 つに絞られる）

#### ユーザー動線

```
トップ/ヘッダー「詳細検索」リンク
  → /advanced-search（DB 未選択 = 全データベースが初期選択）

横断検索結果ページの DB カード
  → 「この DB で詳細検索」ボタン
  → /advanced-search?db=xxx（DB 選択済み）

DB 指定検索結果ページ
  → 「詳細検索で絞り込む」リンク
  → /advanced-search?db=xxx&...（将来拡張: 現在のクエリも引き継ぐ）
```

#### DB 切り替え時の条件引き継ぎ

DB 切り替え時、Tier ごとに条件の扱いが異なる:

| 遷移 | Tier 1 条件 | Tier 2 条件 | Tier 3 条件 |
|---|---|---|---|
| 全 DB → 単一 DB | 保持 | 保持 | その DB の Tier 3 を新規追加可能に |
| 単一 DB A → 単一 DB B | 保持 | 保持 | DB A の Tier 3 は削除 |
| 単一 DB → 全 DB | 保持 | 保持 | 削除 |

**Tier 3 条件が存在する状態で DB を切り替える場合の UI:**

- Tier 3 条件がない場合: 即座に切り替え。確認不要
- Tier 3 条件がある場合: DB セレクタ直下にインラインの `Callout type="warning"` を表示し、削除される条件を列挙して確認を求める

```
┌─ Callout type="warning" ──────────────────────────────────────┐
│ ⚠ データベースを切り替えると、以下の {現在の DB 名} 固有の        │
│ 条件が削除されます:                                              │
│   • project_type = "Genome sequencing"                         │
│   • grant_agency contains "JSPS"                               │
│ [切り替える]  [キャンセル]                                       │
└───────────────────────────────────────────────────────────────┘
```

- **モーダルダイアログは使わない**。条件の一覧をその場で確認できるインライン Callout で十分
- **削除される条件を列挙** してユーザーが何を失うか明示する
- **[切り替える]**（`Button variant="secondary" size="sm"`）: DB を切り替え、Tier 3 条件を削除
- **[キャンセル]**（`Button variant="ghost" size="sm"`）: DB セレクタを元の値に戻す

#### GUI ↔ DSL の方向性

**ファーストリリースまでは GUI → DSL 単方向のみをサポートする。** URL 直編集で到達した `/search?adv=...` は検索結果を返すが、Advanced Search ページに戻った際に GUI へ条件を復元することはしない（DSL プレビュー欄に文字列を表示するのみ）。

**根拠:** パーサをサーバ（FastAPI）とクライアント（TypeScript）の両方に実装すると等価性を担保するテストコストが高く、両実装がズレるリスクがある。Single Source of Truth は **サーバ側の Lark パーサに一本化**する。

**将来拡張の責任分界:** 逆パーサ（DSL → GUI）を導入する場合は、サーバに `GET /db-portal/parse?adv=...` 等の endpoint を追加し、パース結果の構造化 JSON を返す。クライアントは JSON を GUI state に流し込むだけで、TypeScript 側に独自パーサは実装しない。これによりパーサは常にサーバ側の 1 箇所に限定される。

#### 将来拡張

- 履歴（Search History）・Saved Search の DDBJ Account 連携による永続化
- 「Copy as API Request」（ENA の curl 出力機能相当）
- フィールドのオートコンプリート（organism の学名、library_strategy の候補等）
- DSL → GUI 逆パーサ（サーバ endpoint 経由、上記「GUI ↔ DSL の方向性」参照）
- BioSample の attributes 代表属性の top-level 昇格

### シンプル検索ボックスの UI 補助

NN/g は「シンプル検索ボックスは何ができるか伝わらない」問題も指摘している。ユーザが迷わないよう以下を合わせて提供する:

- **プレースホルダ**: `例: "Homo sapiens" BRCA1` のようにフレーズと通常語の併記例を出す
- **検索ボックス下の small text**: 「スペース区切りで AND 検索。`"..."` でフレーズ検索。AND/OR/NOT や絞り込み検索は [詳細検索](#)」
- **Examples チップ**: 代表的なクエリ（accession 例・学名例・研究テーマ例）をクリックで入力できるチップを数個配置
- **オートサジェスト**（将来）: Taxonomy（学名/一般名/和名）・既知 accession・過去検索から候補を出す

具体的なプレースホルダ文言と Examples の一覧は UI design で詰める。

### 段階的な積み上げ

- **インターナルリリース**:
  - シンプル検索ボックス本番稼働。Trad / Taxonomy は ARSA / TXSearch proxy で本番データを返す。GEA / MetaboBank は ES インデックス接続済み
  - Advanced Search は **Tier 1 フィールド（共通語彙 8 種: `identifier` / `title` / `description` / `organism` / `date_published` / `date_modified` / `date_created` / `date`）のみ動作**。横断 / 単一 DB いずれも Tier 1 の範囲で実検索可能。ES 既存フィールドにそのまま対応するため新規 parse 不要
- **ファーストリリース**:
  - Advanced Search の **Tier 2 フィールド**（`submitter` / `publication`）対応。BioProject は ES の既存 nested フィールドを利用、SRA / JGA は properties parse が前提
  - **Tier 3 フィールド** の段階追加。SRA の `library_strategy` / `platform` / `instrument_model`（properties parse）、Taxonomy の `rank` / `lineage`（TXSearch 既存）、Trad の `division` / `sequence_length`（ARSA 既存）など
- **将来拡張**:
  - 履歴・Saved Search・API Export・オートサジェスト
  - BioSample の attributes 代表属性を top-level フィールドに昇格（`geo_loc_name` / `host` / `disease` 等）
  - ES analyzer 再設計（kuromoji / word_delimiter_graph 等）

## 検索結果 UI

### Advanced Search の条件サマリ表示

`/search?adv=...` で到達した検索結果ページは、ヘッダのシンプル検索ボックスの位置を **Advanced Search 条件サマリチップ**に差し替えて表示する。DSL 文字列をそのまま検索ボックスに入れる UI は採らない。

**根拠:** DSL を検索ボックスに表示すると「この検索ボックスに Lucene 構文を打てば検索できる」という誤ったメンタルモデルをユーザに学習させる。シンプル検索ボックスは暗黙 AND のフリーテキスト入口に徹し、Advanced Search 条件は別 UI で明示的に扱う。

**レイアウト:**

```
┌─ ヘッダー ───────────────────────────────────────────────────┐
│ [🔍 BioProject で絞り込み中: title:"cancer" AND organism:... │
│   (他 2 条件)] [編集] [✕ クリア]                              │
└──────────────────────────────────────────────────────────────┘
```

**サマリ文言の生成ルール:**

| 条件数 | 表示 |
|---|---|
| 1〜2 条件 | DSL をそのまま短縮（例: `title:"cancer" AND organism:"Homo sapiens"`）。50 文字超で末尾を `...` に省略 |
| 3 条件以上 | `title:"cancer" 他 N 条件`（最初の 1 条件 + 残り件数） |
| 単一 DB 指定時 | プレフィックスに `{DB UI ラベル} で絞り込み中: ` を付与（例: `BioProject で絞り込み中:`） |
| 横断モード（`db` 未指定） | プレフィックスに `全データベースで絞り込み中: ` を付与 |

**操作:**

- **[編集] ボタン**: `/advanced-search?db=xxx&adv=<現在の DSL>` に遷移。GUI に条件を戻す（将来拡張 = DSL → GUI 逆パーサ導入後に有効化。インターナルリリースでは DSL プレビュー欄に文字列表示のみ）
- **[✕ クリア] ボタン**: `adv` を解除して `/search` にリダイレクト（`db` も解除）。シンプル検索ボックスが再表示される
- サマリチップ自体にはクリックアクションは割り当てない（[編集] / [✕] の 2 アクションに絞る）

**シンプル検索との関係:**

`adv` と `q` は排他（[/search のクエリパラメータ](#search-のクエリパラメータ) 参照）。サマリチップが出ている状態でユーザが新規にシンプル検索を行うには:

1. **[✕ クリア]** を押して `adv` を解除し、シンプル検索ボックスに戻す
2. 新しいキーワードを入力して検索

ヘッダには常時シンプル検索ボックスかサマリチップのどちらか一方のみが表示される（両方を同時に出さない）。

### ヒット件数表示

横断検索結果・DB 指定検索結果のいずれも、**ヒット件数を目立つ位置に必ず表示する**。ユーザは「何件見つかったか」を真っ先に知りたいため、結果リストの上部・DB タブの横などに件数バッジを配置する。

- 横断検索: DB カードに件数を大きく表示（`noindex` なのでクロール負荷は気にせず同期取得）
- DB 指定検索: 「全 X 件中 N-M 件を表示」形式でページネーション近傍に置く
- 10,000 件超で cursor 非対応（Solr バックエンド）の場合は「10,000 件以上」と表記し、正確な件数は出さない
- ES バックエンドで `track_total_hits` により正確な件数が取れるケースでも、上限を超える場合は「X 件以上（正確な件数は絞り込みを推奨）」と表記する

### 10,000 件超のハンドリング

| バックエンド | 件数表示 | ページ送り |
|---|---|---|
| ES（`sra`/`bioproject`/`biosample`/`jga`/`gea`/`metabobank`） | 正確な件数 | 10,000 件までは `page` ベース、超過時は cursor-based |
| Solr（Trad / Taxonomy） | 10,000 件以上の場合「10,000 件以上」と表記 | 10,000 件まで。500 ページ目（`perPage=20` 換算）でページャは無効化 |

Solr バックエンド（Trad / Taxonomy）で件数が 10,000 以上のとき、ページャの直下に `Callout type="info"` を出す:

- **文言**: 「表示できる検索結果は 10,000 件までです。キーワードを追加するか、詳細検索で絞り込んでください。」
- **CTA**: 「詳細検索を開く」（`TextLink` で `/advanced-search` へ遷移。DB が選択済みなら `?db=xxx` 引き継ぎ）
- **タイプ**: `info`（システム上の制約であり error ではないため）
- **表示条件**: `db` が `trad` または `taxonomy` かつ件数が 10,000 以上

ES バックエンドは cursor-based で全件走査できるため、10,000 件超でも Callout は出さない。件数表示は正確な値（例「全 45,678 件」）のまま。ただし非常に大量のヒット時（例 100 万件超）は絞り込みを促す別の案内を将来検討。

### loading / error 状態

横断検索は部分失敗許容（[search-backends.md の部分失敗ポリシー](./search-backends.md#部分失敗ポリシー) 参照）のため、UI も DB カード単位で 3 状態を扱う:

| 状態 | 表示 |
|---|---|
| loading | DB 名は即表示、件数欄のみ `Skeleton`（`role="status"` 付き、幅 `w-24` / 高さ `h-8` 程度）でプレースホルダ化 |
| success（`count != null`） | 件数 + DB 詳細へのリンク |
| error（`count = null` + `error != null`） | 「取得できませんでした」テキスト + **再試行ボタン**（`Button variant="secondary" size="sm"`）+ エラー種別を small text で補足 |

#### Skeleton 形状の根拠

DB 名は静的情報なので先に描画し、件数欄だけ Skeleton にする。カード全体を Skeleton にすると「何が読み込まれているか」が伝わらず、8 DB に問い合わせている文脈が失われる。DB 名を先に出すことで「各 DB に並列で問い合わせている」進行状況が視覚化される。

#### エラー種別の補足テキスト

各 DB カードのエラー表示に以下の短文を添える:

| `error` 値 | 表示テキスト |
|---|---|
| `timeout` | タイムアウト |
| `upstream_5xx` | サーバーエラー |
| `connection_refused` | 接続エラー |
| `unknown` | 不明なエラー |

#### 段階表示（progressive rendering）

3 並列 fan-out のうち先に返ってきた DB から順に表示する（全バックエンドの完了を待たない）。TanStack Query の `useQueries` で 3 本独立に fetch し、各 DB カードがそれぞれの状態を持つ。

#### 全体バナーの出し分け

個別 DB カードのエラー表示に加えて、マクロ障害を検知するための全体バナーを以下の閾値で出す:

| 条件 | 表示 |
|---|---|
| 全 DB error（8/8） | `Callout type="error"` + `role="alert"`: **「検索サービスに接続できません。しばらくしてからもう一度お試しください。」** + 再試行ボタン |
| 半数以上 error（4〜7/8） | `Callout type="warning"`: **「一部の検索サービスが不安定です。」** + 個別カードにもエラー表示 |
| 半数未満 error（1〜3/8） | 全体バナーなし。個別カードのみにエラー表示 |

閾値を 4/8（半数）にする根拠: ES 障害時は 6 DB 同時 `null` になるパターンが最大のリスク。半数以上なら「システム的な問題」として全体バナーで伝える価値がある。1〜2 DB の個別障害（例: ARSA だけダウン）はカード単位で十分で、全体バナーを出すと過剰。

### DB 指定検索結果のカードリスト

DB 指定検索結果（`/search?q=xxx&db=yyy`）は **テーブルではなくカードリスト形式** で表示する。NCBI Entrez の DB 指定検索結果と同じアプローチで、Google 検索結果のような縦積みリストとする。

**根拠:** テーブル形式は列数が多いと横スクロールが発生し、DB ごとに列構成が変わる場合に統一が難しい。カードリスト形式なら DB ごとにメタデータ行の内容を自然に変えられ、タイトルやアクセッションのような長い文字列も折り返して表示できる。

#### カードの共通構造

各結果カードは以下の要素で構成する:

```
┌──────────────────────────────────────────────────────────────┐
│ PRJDB12345                                  2024-03-15       │  L1: accession + 日付
│ Human Gut Microbiome Analysis in Japanese Cohort             │  L2: title（リンク）
│ Comprehensive metagenomic analysis of gut microbiota...      │  L3: description（あれば）
│ Homo sapiens (9606)                                          │  L4: organism
│ Project type: Genome sequencing · Organization: DDBJ         │  L5: DB 固有メタデータ
│ [BioSample] [SRA]                                            │  L6: 関連 DB リンク
└──────────────────────────────────────────────────────────────┘
```

| 行 | 内容 | 表示ルール |
|---|---|---|
| L1 | `identifier`（左寄せ）+ `publishedAt`（右寄せ） | 必須。日付は `YYYY-MM-DD` 形式。日付なし（Taxonomy 等）の場合は右側を空欄 |
| L2 | `title`（外部詳細ページへのリンク） | 必須。最も視覚的に目立つ要素（`font-medium text-lg`）。2 行まで表示し、溢れは `...` で省略 |
| L3 | `description` | あれば表示、なければ省略。1 行 truncate + `...`。`title` と同一内容の場合は非表示 |
| L4 | `organism`（学名 + Taxonomy ID） | あれば表示。Taxonomy DB では `scientific_name` が `title` と重複するため非表示 |
| L5 | DB 固有メタデータ | DB ごとに異なる。下表参照 |
| L6 | 関連 DB へのリンク | `relatedObjects` から生成。あれば表示 |

#### DB 別メタデータ（L5）

| DB | 表示内容 | フィールド | 備考 |
|---|---|---|---|
| BioProject | Project type, Organization | `projectType`, `organization` | ES 既存 |
| BioSample | （インターナルリリースではなし） | — | 将来: 代表 attributes（`geo_loc_name` 等）を表示 |
| SRA | （インターナルリリースではなし） | — | 将来: platform, library strategy（要 parse） |
| JGA | （インターナルリリースではなし） | — | 将来: study type（要 parse） |
| Trad | Division | ARSA `Division` | ARSA 既存 |
| Taxonomy | Rank, Common name, Japanese name | TXSearch 既存 | Taxonomy は `organism` 行（L4）を非表示 |
| GEA | （インターナルリリースではなし） | — | ES インデックス追加後に検討 |
| MetaboBank | （インターナルリリースではなし） | — | ES インデックス追加後に検討 |

#### 関連 DB リンク（L6）

`relatedObjects` から関連するレコードへのリンクを生成する。NCBI BioSample の結果に `[BioProject] [SRA] [dbGaP]` リンクが出るのと同じパターン。

- 関連 DB 名を `Badge` またはインラインリンクで表示（例: `BioProject: PRJDB12345`）
- リンク先は db-portal 内の検索（`/search?q=<accession>&db=<related_db>`）。外部詳細ページへの直リンクでもよい（実装時に決定）
- `relatedObjects` が空の場合は L6 行自体を非表示

#### ページ全体のレイアウト

```
┌─ ヘッダ ─────────────────────────────────────────────────────┐
│ [🔍 human                                        ] [Search]   │
└──────────────────────────────────────────────────────────────┘

  全 189,923 件中 1〜20 件を表示    ソート: [関連度 ▾]  表示: [20件 ▾]

  ┌─ 結果カード ×20 ──────────────────────────────────────────┐
  │  ...                                                       │
  └──────────────────────────────────────────────────────────┘

  [< 前へ]  1 / 9,497 ページ  [次へ >]
```

- **ツールバー**（結果リスト上部）: 件数表示 + ソートセレクト + 表示件数セレクト
- **ファセットフィルタ**（サイドバー）: インターナルリリースでは実装しない。Advanced Search に分離済み。将来拡張の余地として左サイドバーの領域を確保しておく（現時点ではレイアウト上は 1 カラム）

#### カードクリック時の遷移

タイトル（L2）のリンクは **外部の既存詳細ページ** へ `target="_blank"` で遷移する。db-portal 内に詳細ページは設けない（各 DB の既存 UI を活用する）。

## ページネーション仕様

| 項目 | 仕様 |
|---|---|
| デフォルト件数 | 20 件 |
| 件数選択肢 | 20 / 50 / 100 |
| 方式 | offset-based（上限 10,000 件）+ cursor-based（10,000 件超、ES バックエンドのみ） |
| ソート | Relevance（デフォルト）/ Date 新しい順 / Date 古い順 |

DDBJ Search API の既存ページネーション方式をそのまま利用する。ES バックエンドは PIT + `search_after` で 10,000 件超の deep paging を提供。Solr バックエンド（ARSA / TXSearch）は Solr 4.4 の制約で cursor 非対応のため offset ベースの上位 10,000 件までサポート、それ以上は対象外。

## URL 設計

DB ポータル全体の URL 設計方針は [overview.md#url-設計](./overview.md#url-設計) を参照。検索系のページ・パラメータは本節で定義する。

### ページ

| ページ | URL | レンダリング |
|---|---|---|
| 横断検索結果（シンプル） | `/search?q=xxx` | CSR |
| DB 指定検索結果（シンプル） | `/search?q=xxx&db=yyy` | CSR |
| Advanced Search UI | `/advanced-search` | SSR |
| 横断 Advanced Search 結果 | `/search?adv=<encoded-dsl>` | CSR |
| DB 指定 Advanced Search 結果 | `/search?adv=<encoded-dsl>&db=yyy` | CSR |

`/search` は SSR でシェル HTML（meta / canonical / ナビゲーション）のみを返し、検索結果データは CSR で TanStack Query 経由に取得する構成。根拠: (1) 検索クエリはユーザー固有で SEO 対象ではない（`noindex`）。(2) proxy バックエンド（ARSA / TXSearch）のレイテンシが読めないため loader で await すると TTFB が悪化する。SSR は URL から決まる部分（meta / 正規化リダイレクト）のみに限定。(3) DB ごとに独立した `useQuery` を発行することで progressive rendering（先に返った DB から順次表示）が自然に成立する。

### `/search` のクエリパラメータ

| パラメータ | 値 | デフォルト（省略時） |
|---|---|---|
| `q` | 検索文字列（URL エンコード） | `adv` とどちらか 1 つは必須。両方未指定なら `/` に 301 リダイレクト |
| `adv` | Advanced Search の DSL 文字列（[Advanced Search の URL 形式](#advanced-search-の-url-形式) 参照） | `q` とどちらか 1 つは必須 |
| `db` | 下記の DB 識別子 | 未指定 = 横断検索 |
| `page` | 1 以上の整数 | `1` |
| `perPage` | `20` / `50` / `100` | `20` |
| `sort` | `relevance` / `date_desc` / `date_asc` | `relevance` |
| `cursor` | opaque 文字列（ES deep paging、10,000 件超） | なし |

**`q` と `adv` の排他**: 同一 URL に両方指定された場合は 400 エラー（API）/ 優先警告（UI）。混ぜると DSL セマンティクスが曖昧になるため。

#### 正規化ルール

デフォルト値と同じパラメータは URL から自動で省く。例えば `?q=xxx&page=1&sort=relevance` は `?q=xxx` に正規化する。canonical URL と共有 URL を短く保つため。

パラメータの順序も固定する（canonical 化）: `q` → `db` → `page` → `perPage` → `sort` → `cursor` → `adv`。

#### CSR 上での正規化実装

`/search` は CSR（サーバサイドで URL を書き換えられない）のため、正規化はクライアントで行う:

- 初回描画直後、URL を正規化し `history.replaceState` で履歴エントリを増やさずに書き換える（`navigate(canonicalUrl, { replace: true })` 相当）
- ユーザ操作（ページ送り・ソート変更等）による URL 更新は `pushState` で履歴に積む（戻るボタンで前状態へ戻せる）
- 初期 HTML（SSR が返す骨組み）には `<meta name="robots" content="noindex, follow">` を常に埋め込む。正規化前の非正規 URL でもクロールは抑止する
- canonical link（`<link rel="canonical">`）はクライアント側でクエリ確定後に React Router の `meta` 関数から出力する

### `db` パラメータの値

`db` パラメータの値・UI 表示ラベルは [DB 一覧](#db-一覧) を参照。バックエンドの対応は [検索エンジンと DB の対応](#検索エンジンと-db-の対応) を参照。

命名方針:

- `trad`: 「DDBJ」ブランド名と DB 名の衝突を避け、Traditional Annotation の略称として短く表す識別子
- `sra`: ES index が `sra-*` で INSDC 全 read archive を収容している実態を反映。`dra` にすると「DDBJ の DRA を検索」という誤ったメンタルモデルを助長するため採らない
- その他（`bioproject` / `biosample` / `taxonomy`）: 元々 INSDC 共通名称なので DDBJ/NCBI/EBI 間で衝突なし
- `jga` / `gea` / `metabobank`: DDBJ 固有 DB なのでそのまま

UI 表示ラベルは [DB 一覧](#db-一覧) のテーブルの値をそのまま使う（`Trad (Annotated Sequences)` / `SRA` / `BioProject` / `BioSample` / `JGA` / `GEA` / `MetaboBank` / `Taxonomy`）。Trad だけ補足を添える理由は、単独の「Trad」が何のデータか直感的に伝わらないため（Traditional Annotation の略で、DDBJ 固有の概念）。SRA と対比して「アノテーション付き配列（Trad）」vs「生リード（SRA）」の違いが一目で分かるようにする。SRA は INSDC 共通名称として世界的に通用するため追加補足は付けない（UI に `DRA` 選択肢が出ない以上、SRA / DRA 関係をツールチップで説明すると逆に「DRA というのもあるのか？」と余計な混乱を招くため）。

### canonical / noindex

| ケース | canonical | robots |
|---|---|---|
| `/search?q=xxx&db=bs` | 自身（デフォルト値省略後） | `noindex, follow` |
| `/search?q=xxx&page=2&sort=relevance` | `/search?q=xxx&page=2` | `noindex, follow` |
| `/search`（`q` / `adv` 両方なし） | `/` に 301 リダイレクト | - |
| `/advanced-search` | `/advanced-search` | `index, follow` |

`/search` を `noindex` にする理由: (1) 検索結果はユーザー固有で SEO インデックスに入れる価値が低い。(2) クローラによる不要な負荷（proxy バックエンドへの fan-out）を避ける。

### URL 互換性ポリシー

以下を公約する:

- ルートパス `/search`, `/advanced-search` は変えない
- `db` の値（`trad` / `sra` / `bioproject` / `biosample` / `jga` / `gea` / `metabobank` / `taxonomy`）は変えない
- パラメータ名（`q`, `db`, `page`, `perPage`, `sort`, `cursor`, `adv`）は変えない

将来の拡張で新パラメータが追加される可能性はあるが、既存パラメータの意味・値を破壊しない。廃止する場合は 301 redirect で旧 URL → 新 URL に誘導する。

### Advanced Search の URL 形式

`adv` パラメータに **Lucene 風軽量 DSL の文字列**を 1 本で載せる。base64(JSON) や個別パラメータ展開（`f1=...&op1=AND&v1=...`）は採らない。

例:

```
/search?db=bioproject&adv=organism%3A%22Homo+sapiens%22+AND+date%3A%5B2020-01-01+TO+2024-12-31%5D+AND+(title%3Acancer+OR+title%3Atumor)
```

URL デコード後:

```
organism:"Homo sapiens" AND date:[2020-01-01 TO 2024-12-31] AND (title:cancer OR title:tumor)
```

#### 採用構文

| 構文 | 例 | 意味 |
|---|---|---|
| `field:value` | `organism:human` | フィールド指定（単語） |
| `field:"phrase"` | `organism:"Homo sapiens"` | フィールド指定（フレーズ） |
| `field:[a TO b]` | `date:[2020-01-01 TO 2024-12-31]` | 範囲（包含） |
| `field:value*` | `title:cancer*` | ワイルドカード（前方一致） |
| `AND` / `OR` / `NOT` | `a AND b` | Boolean（大文字必須） |
| `(...)` | `(a OR b) AND c` | グルーピング |

- フィールド名はポータル共通語彙のみ allowlist。バックエンド固有名（`PrimaryAccessionNumber` 等）は受け付けない
  - **Tier 1**: `identifier` / `title` / `description` / `organism` / `date_published` / `date_modified` / `date_created` / `date`
  - **Tier 2**: `submitter` / `publication`
  - **Tier 3**: 単一 DB 指定時のみ有効。DB ごとのフィールド一覧は [Advanced Search のフィールド構成](#フィールド構成3-層) を参照
  - `organism` は学名・Taxonomy ID 両対応（ES の `organism.name` / `organism.identifier` 両方に query を投げる）
  - `date` はエイリアス: `date_published` / `date_modified` / `date_created` の OR 範囲検索に展開
- **横断モード**（`db` 未指定）では Tier 1 / Tier 2 のみ使用可。Tier 3 フィールドを含む DSL は 400 エラー
- パース: server 側で DSL → 構造化 JSON（[search-backends.md の Advanced Search API 契約](./search-backends.md#advanced-search-からの入力)）→ ES / Solr へ
- GUI 入力 → DSL 文字列生成（単方向）。逆パーサ（DSL → GUI）は将来拡張（[GUI ↔ DSL の方向性](#gui--dsl-の方向性) 参照）

#### 値のバリデーション

パーサ・allowlist 検証・値の形式チェックはサーバ側（DDBJ Search API の `/db-portal/*` endpoint）で一元的に行う。実装詳細・エラーコード定義は [search-backends.md の値のバリデーション](./search-backends.md#値のバリデーション) および [エラーレスポンス](./search-backends.md#エラーレスポンス) を参照。

ユーザ側から見た主要ルール:

| 項目 | ルール |
|---|---|
| 日付 | ISO 8601 `YYYY-MM-DD` 厳密一致（例: `2024-12-31`）。`YYYYMMDD`・`2024/12/31` 等は不可 |
| 空値 | `field:""` / `field:` は不可 |
| エスケープ | クォート内（`"..."`）は `\"` と `\\` のみエスケープ必須。その他の Lucene メタ文字はクォート内では無害。クォート外の値（`field:word` のような非フレーズ）にはメタ文字を含めない（含めたい場合はクォートで囲む） |
| ワイルドカード | `*` `?` は `field:value*` / `field:value?` 形式でのみ有効。クォート内ではリテラル扱い |
| 非対応構文 | boost `^`・fuzzy `~`・正規表現 `/.../` は構文エラー（将来拡張の余地として予約） |

GUI クエリビルダは常に上記ルールに準拠する DSL を生成する。違反が出るのは URL 直編集ユーザのみ。

**横断 Advanced Search の URL 例:**

```
/search?adv=title%3Acancer+AND+organism%3A%22Homo+sapiens%22+AND+date_published%3A%5B2020-01-01+TO+2024-12-31%5D
```

デコード後:

```
title:cancer AND organism:"Homo sapiens" AND date_published:[2020-01-01 TO 2024-12-31]
```

`db` が未指定なので横断検索結果（DB カード一覧）にヒット数を表示する。

#### 採用根拠（業界デファクト）

NCBI PubMed・EBI Search・ENA Portal API の 3 大サービス全てが「単一 query パラメータに DSL 文字列を載せる」方式で一致している。base64 や個別パラメータ展開を採用している先行例は見つからない。構文そのものは各サービスで異なるが、いずれも単一文字列の DSL を URL 1 本に載せる点は共通。

| サービス | パラメータ | 構文 |
|---|---|---|
| NCBI PubMed | `?term=...` | 独自記法（`cancer[Title]` の `term[fieldtag]` ブラケット。Lucene とは別系統） |
| EBI Search | `?query=...` | Apache Lucene query syntax |
| ENA Portal API | `?query=...` | SQL 風 `field="value"` + 関数記法 |

DDBJ ポータルは「単一パラメータに DSL 文字列を載せる」点を 3 社共通の業界デファクトとして踏襲しつつ、構文は EBI Search 流の Lucene query syntax（フィールド区切り `:`、範囲 `[a TO b]`）を採用する。ドメイン固有関数（ENA `tax_eq` 等）は将来拡張余地として予約し、初期実装には含めない。boost 記法 `^` も GUI クエリビルダから生成しないため初期は非対応。

**参考文献**:

- [PubMed Advanced Search Help](https://pubmed.ncbi.nlm.nih.gov/help/) — `term` パラメータ・`[fieldtag]` 記法
- [EBI Search REST API](https://www.ebi.ac.uk/ebisearch/documentation/rest-api) — `query` パラメータに Apache Lucene query syntax
- [ENA Advanced Search Documentation](https://ena-docs.readthedocs.io/en/latest/retrieval/programmatic-access/advanced-search.html) — `query` パラメータに `field="value"` + 関数記法
- [ENA Portal API Swagger](https://www.ebi.ac.uk/ena/portal/api/swagger-ui/index.html)
- [The EBI search engine: EBI search as a service (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5570174/)

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
- Featured result（Accession マッチ時の強調表示）は採用しない。通常の relevance score 上位で救う
- ファセット検索は設けない（NCBI の DB 個別ファセットに相当する機能はスコープ外）

## NCBI / EBI との DB 対応表

| DDBJ | NCBI | EBI |
|---|---|---|
| Trad | Nucleotide | ENA |
| SRA | SRA | ENA |
| BioProject | BioProject | BioStudies |
| BioSample | BioSample | BioSamples |
| JGA | dbGaP | EGA |
| GEA | GEO DataSets / GEO Profiles | ArrayExpress |
| MetaboBank | - | MetaboLights |
| Taxonomy | Taxonomy | Taxonomy |

## バックエンド

各検索エンジンの詳細仕様（接続情報、スキーマ、クエリ、proxy 実装方針、未調査事項）は [search-backends.md](./search-backends.md) に集約。
