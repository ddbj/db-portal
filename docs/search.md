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
  ├── 統一的な簡易リスト表示
  └── 各レコードの外部詳細ページへのリンク
  |  (レコードをクリック)
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
| 記号を含む識別子 | `HIF-1`・`BRCA1/2`・`CD4+`・`E. coli` 等、記号（`-` `/` `.` `+` `:`）を含むトークンは自動でフレーズクエリ化する（主に Solr edismax の演算子誤解釈回避が目的。詳細は下記） |
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
3. 記号（`-` `/` `.` `+` `:`）を含むトークンは、内部的にフレーズクエリとして扱う（Solr ではクォート済み文字列として `q` に渡す、ES では `match_phrase` に渡す）
4. 全トークンを AND 結合して各バックエンドへ

**ES 側の補足**: standard analyzer 前提では `HIF-1` は `hif` + `1` に分解されるため、フレーズ化しても `HIF 1` と `HIF-1` はスコア上区別できない（両方同等ヒット）。`HIF-1` と完全一致したい場合は Advanced Search の `identifier` フィールド完全一致を使う。

**Solr 側の補足**: ARSA の `text_all` (PatternTokenizer `[a-zA-Z0-9]+|[^a-zA-Z0-9\s]`) は `-` `/` 等もトークン化するため、フレーズクエリで `HIF` `-` `1` の連続位置を要求でき、誤ヒットが減る可能性がある（実測は未調査事項）。TXSearch は standard tokenizer なので ES と同じ挙動。

完全一致 identifier 検索が必要なケースは Advanced Search の `identifier` フィールド完全一致で救う方針で確定。ES analyzer の再設計（`word_delimiter_graph` + `preserve_original` 等への入れ替え + 再インデックス）は対応しない: 自動フレーズ化 + Advanced Search で実用上の精度は確保できており、analyzer を全 DB で揃え直すコスト（再インデックス・既存 API への影響・ユースケースごとの最適解の分散）に見合うリターンがない。Lucene メタ文字の具体的なエスケープ契約は [search-backends.md のクエリ変換](./search-backends.md#クエリ変換) に記述する。

### Advanced Search

別ページに配置する GUI クエリビルダ（PubMed Advanced / ENA Advanced 型）。

- DB（Data type）選択を最初に置く
- フィールドプルダウン + 演算子（AND/OR/NOT）+ 入力欄の 1 行単位で条件を追加
- フィールドプルダウンには**ポータル共通語彙のみ**を出し、バックエンド固有のフィールド名（`PrimaryAccessionNumber`・`scientific_name` 等）はユーザに見せない（共通語彙と DB 別フィールドのマッピングは [search-backends.md の共通のフィールド対応](./search-backends.md#共通のフィールド対応) に記載）
- 生成クエリは検索ボックス文字列として可視化し、URL パラメータにも載せてブックマーク可能にする
- 対応機能: `AND`/`OR`/`NOT`・括弧グルーピング・ワイルドカード・フィールド指定・範囲検索・`identifier` 完全一致
- 履歴（Search History）・Saved Search は DDBJ Account 連携で永続化（将来拡張）
- 将来的には「Copy as API Request」（ENA の curl 出力機能相当）を検討

### シンプル検索ボックスの UI 補助

NN/g は「シンプル検索ボックスは何ができるか伝わらない」問題も指摘している。ユーザが迷わないよう以下を合わせて提供する:

- **プレースホルダ**: `例: "Homo sapiens" BRCA1` のようにフレーズと通常語の併記例を出す
- **検索ボックス下の small text**: 「スペース区切りで AND 検索。`"..."` でフレーズ検索。AND/OR/NOT や絞り込み検索は [詳細検索](#)」
- **Examples チップ**: 代表的なクエリ（accession 例・学名例・研究テーマ例）をクリックで入力できるチップを数個配置
- **オートサジェスト**（将来）: Taxonomy（学名/一般名/和名）・既知 accession・過去検索から候補を出す

具体的なプレースホルダ文言と Examples の一覧は UI design で詰める。

### 段階的な積み上げ

- **インターナルリリース**: シンプル検索ボックス本番稼働。Trad / Taxonomy は ARSA / TXSearch proxy で本番データを返す。GEA / MetaboBank は ES インデックス接続済み。Advanced Search は UI のみ先行
- **ファーストリリース**: Advanced Search 動作（フィールド選択・AND/OR/NOT・URL 共有）
- **将来拡張**: 履歴・Saved Search・API Export・オートサジェスト・ES analyzer 再設計など

## 検索結果 UI

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

10,000 件目で止まるバックエンドでは、ページャの下に「10,000 件を超える結果は表示できません。キーワードを絞り込むか、Advanced Search をご利用ください」の案内を Callout で出す。

### loading / error 状態

横断検索は部分失敗許容（search-backends.md 参照）のため、UI も DB カード単位で 3 状態を扱う:

| 状態 | 表示 |
|---|---|
| loading | Skeleton（`role="status"` 付き）で件数欄をプレースホルダ化 |
| success（`count != null`） | 件数 + DB 詳細へのリンク |
| error（`count = null` + `error != null`） | 「取得に失敗しました」バッジ + 再試行ボタン。エラー種別（`timeout` / `upstream_5xx` 等）は tooltip や detail 領域で補足 |

段階表示（progressive rendering）: 3 並列 fan-out のうち先に返ってきた DB から順に表示する（全バックエンドの完了を待たない）。TanStack Query の `useQueries` で 3 本独立に fetch し、各 DB カードがそれぞれの状態を持つ。

全 DB が error の場合は上部に「検索が一時的に利用できません」ロールアラートを出し、再試行 CTA を置く。

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
| 横断検索結果 | `/search?q=xxx` | CSR |
| DB 指定検索結果 | `/search?q=xxx&db=yyy` | CSR |
| Advanced Search UI | `/advanced-search` | プリレンダ |
| Advanced Search 結果 | `/search?adv=<encoded-query>&db=yyy`（検討中） | CSR |

`/search` を CSR にする根拠: (1) 検索クエリはユーザー固有で SEO 対象ではない（`noindex`）。(2) proxy バックエンド（ARSA / TXSearch）のレイテンシが読めず SSR TTFB が悪化するリスク。(3) TanStack Query のキャッシュ戦略と相性が良い。

### `/search` のクエリパラメータ

| パラメータ | 値 | デフォルト（省略時） |
|---|---|---|
| `q` | 検索文字列（URL エンコード） | 必須。空なら `/` にリダイレクト |
| `db` | 下記の DB 識別子 | 未指定 = 横断検索 |
| `page` | 1 以上の整数 | `1` |
| `perPage` | `20` / `50` / `100` | `20` |
| `sort` | `relevance` / `date_desc` / `date_asc` | `relevance` |
| `cursor` | opaque 文字列（ES deep paging、10,000 件超） | なし |
| `adv` | Advanced Search の構造化クエリ（形式は別途詰める） | なし |

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

| 値 | UI 表示ラベル | バックエンド実態 |
|---|---|---|
| `trad` | Trad (Annotated Sequences) | ARSA（Datasource = `DDBJ`, `Patent_AA`。DDBJ が MSS / NSSS 経由で受領した Traditional Annotation 形式の塩基配列 + Patent 由来のアミノ酸配列。GenBank / ENA のミラーは含まない） |
| `sra` | SRA | ES `sra-*`（INSDC 共通 read archive: DDBJ DRA + NCBI SRA + EBI ENA を全て含む） |
| `bioproject` | BioProject | ES（INSDC BioProject 全体） |
| `biosample` | BioSample | ES（INSDC BioSample 全体） |
| `jga` | JGA | ES（DDBJ 固有） |
| `gea` | GEA | ES（DDBJ 固有、インデックス追加要） |
| `metabobank` | MetaboBank | ES（DDBJ 固有、インデックス追加要） |
| `taxonomy` | Taxonomy | TXSearch（INSDC 共通 NCBI Taxonomy） |

命名方針:

- `trad`: 「DDBJ」ブランド名と DB 名の衝突を避け、Traditional Annotation の略称として短く表す識別子
- `sra`: ES index が `sra-*` で INSDC 全 read archive を収容している実態を反映。`dra` にすると「DDBJ の DRA を検索」という誤ったメンタルモデルを助長するため採らない
- その他（`bioproject` / `biosample` / `taxonomy`）: 元々 INSDC 共通名称なので DDBJ/NCBI/EBI 間で衝突なし
- `jga` / `gea` / `metabobank`: DDBJ 固有 DB なのでそのまま

UI 表示ラベルは上記テーブルの値をそのまま使う（`Trad (Annotated Sequences)` / `SRA` / `BioProject` / `BioSample` / `JGA` / `GEA` / `MetaboBank` / `Taxonomy`）。Trad だけ補足を添える理由は、単独の「Trad」が何のデータか直感的に伝わらないため（Traditional Annotation の略で、DDBJ 固有の概念）。SRA と対比して「アノテーション付き配列（Trad）」vs「生リード（SRA）」の違いが一目で分かるようにする。SRA は INSDC 共通名称として世界的に通用するため追加補足は付けない（UI に `DRA` 選択肢が出ない以上、SRA / DRA 関係をツールチップで説明すると逆に「DRA というのもあるのか？」と余計な混乱を招くため）。

### canonical / noindex

| ケース | canonical | robots |
|---|---|---|
| `/search?q=xxx&db=bs` | 自身（デフォルト値省略後） | `noindex, follow` |
| `/search?q=xxx&page=2&sort=relevance` | `/search?q=xxx&page=2` | `noindex, follow` |
| `/search`（q なし） | `/` に 301 | - |
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

- フィールド名はポータル共通語彙のみ allowlist（`identifier` / `title` / `description` / `organism` / `date`）。バックエンド固有名（`PrimaryAccessionNumber` 等）は受け付けない
- パース: server 側で DSL → 構造化 JSON（[search-backends.md の Advanced Search API 契約](./search-backends.md#advanced-search-からの入力)）→ ES / Solr へ
- GUI 入力 → DSL 文字列生成（単方向）。URL を直接編集したユーザーのために GUI 復元用の逆パーサも提供

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
