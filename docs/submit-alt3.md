# 登録ナビゲーション v3 (`/submit-alt3`)

`/submit-alt3` の broad な設計をまとめた本体 document、最上位 SSOT。実装の細部 (型定義 / controlled vocabulary の値域 / 個別ルール / SSOT 突合の経緯) は同名のサブファイル群 (`submit-alt3-data-model.md` / `submit-alt3-tags.md` / `submit-alt3-modals.md` / `submit-alt3-flow-rules.md` / `submit-alt3-open-questions.md`) に分けて格納する。サブファイルの記述が本 document と矛盾する場合、本 document を優先する。

`/submit` (v1, Decision Tree + Use Case Cards) / `/submit-alt` (v2, Q&A wizard) と並走評価中。トップ導線・本流選択は別途。

---

## 1. 狙い

DDBJ の登録ナビゲーションには既に 2 つの実装案がある。

- `/submit` (v1): DB ごとの Decision Tree と Use Case Cards
- `/submit-alt` (v2): Q&A wizard で 36 個の leaf に絞り込む

v1 は「自分のデータがどの DB か」を最初に当てさせる方式、v2 は「自分の研究はどういう性質か」を Q&A で答えさせる方式。どちらも **抽象的な自己認識** をユーザーに要求している。

v3 の狙いはここを変えること。研究者は手元に **ファイル** を持っている (FASTQ、FASTA、VCF、CEL、mzML、AGP、GFF、表現型 table、…)。これをそのままテーブルに並べてもらい、各ファイルの属性 (組織 / 公開可否 / データ形態 など) を per-cell で編集してもらう。テーブルの状態が確定するほど、ポータル側は **「あなたの登録は次の順序で進めてください」** を詳細化していく。

```
v1: 「自分のデータの DB は?」を当てる
v2: 「自分の研究の性質は?」を Q&A で答える
v3: 「手元のファイルをテーブルに並べる」と「未設定の cell が警告される」
     → 埋めるほど「登録フローカード」が詳細化される
```

テーブル中心の設計の利点:

- 研究を抽象化して語る必要がない (具体物 = ファイルが起点)
- 複数 DB にまたがる登録 (BioProject + BioSample + DRA + MSS など) が一画面で見える
- Excel/Google Sheets 的な編集体験 (paste、行コピー、cell 編集) が自然
- 何が不足しているかが視覚的に分かる (未設定セルの警告マーク)
- **混在ケース** (1 研究内で複数生物 / 一部 open + 一部 restricted、host-pathogen / multi-modal 解析など) を素直に表現できる

「拡張子だけで登録先が決まる」わけではない (FASTA はアセンブリか TSA か EST か TPA か annotation 付きか、で行き先が変わる)。**ユーザーに考えさせる cell の値そのものが tag 付け** であり、これが v3 の本質的価値。

---

## 2. ユーザー操作の流れ

画面は縦に 3 セクション。テーブルと登録フローカードが常時並列で見える。

```
+--- /submit-alt3 -----------------------------------------------------------------+
|  Section C: ヘッダ                                                              |
|    ファイル数 / Group 数 / 想定登録先 (例: BP+BS+DRA+JGA+MSS)                   |
+---------------------------------------------------------------------------------+
|  Section A: ファイルテーブル                                                    |
|                                                                                 |
|  [+ 配列リード]          [+ 組み立て済み配列]       [+ 遺伝子アノテーション]    |
|  [+ 変異情報]            [+ 表現型データ]            [+ マイクロアレイ発現]     |
|  [+ RNA-seq マトリクス]  [+ 質量分析]                [+ 空間トランスクリプトーム]|
|                                                                                 |
|  +------------------+------------+------------+----------+--------------------+|
|  | ファイル          | 生物       | 公開       | データ形態| tag chip          ||
|  +------------------+------------+------------+----------+--------------------+|
|  | ↳ Group: pair-end (host_R1 + R2)                                           ||
|  |   host_R1.fastq    | human    | restricted | raw      |                    ||
|  |   host_R2.fastq    | human    | restricted | raw      |                    ||
|  | ↳ Group: pair-end (pathogen_R1 + R2)                                       ||
|  |   pathogen_R1.fq   |prokaryote| open       | raw      |                    ||
|  |   pathogen_R2.fq   |prokaryote| open       | raw      |                    ||
|  | meta.fastq         | ⚠未設定  | open       | raw      |                    ||
|  | assembly.fa        |prokaryote| open       | 組立済   | [wgs]              ||
|  | variants.vcf       |prokaryote| open       | 解析出力 | [aggregate][snp]   ||
|  | pheno_table.tsv    | human    | restricted | 表現型   |                    ||
|  +------------------+------------+------------+----------+--------------------+|
+---------------------------------------------------------------------------------+
|  Section B: 登録フローカード (host-pathogen 混在 + JGA 集約モード)              |
|    [Step 1: Primary BioProject (pathogen, Bacteria)]     → PRJDB#####           |
|    [Step 2: BioSample × N (pathogen 行)]                 → SAMD#####            |
|    [Step 3: DRA Run (pathogen open 行)]                  → DRR#####             |
|    [Step 4: MSS WGS (assembly.fa)]                       → INSDC prefix         |
|    [Step 5: DBCLS 事前申請 (host 用、外部、案内のみ)]                           |
|    [Step 6-12: JGA chain (Submission / Study / Sample × N /                     |
|       Experiment / Data / Dataset / Policy、host + phenotype 集約)]             |
|    ⚠ meta.fastq の生物が未設定のため Library Source 未確定                       |
+---------------------------------------------------------------------------------+
```

この画面例は典型ケースを 1 つ示したもの。実際の Step 構成は混在パターンによって動的に変わる (詳細は [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 1-15)。たとえば host-pathogen が無く `human` 単独で全行 `open` なら Umbrella BP は出ず、Primary BP は 1 個のまま。

初期表示 (ファイル 0 個):

- Section A はボタン群と空のテーブル (列ヘッダのみ) を表示
- Section B は「ファイル種別ボタンを押してテーブルにファイルを追加してください」placeholder
- ファイル種別ボタンが押された瞬間から Section B が動き出す

操作の典型的な順序:

1. ボタンを押してファイルをテーブルに追加する。1 回の押下で 1 行 (または複数行 = Group) が append される。**この時点で列の値はほぼ空欄** で警告マーク (⚠) が並ぶ
2. ボタン押下時の modal は **最小限の質問だけ** (例: pair-end か single-end か、MAG-SAG どっちか、合成配列か GSS か) で、grouping と構造的属性を確定するためだけのもの。組織 / 公開可否 / library strategy などの tag はテーブルに移ってから per-cell で埋める
3. テーブル上で per-cell に組織 / 公開可否 / データ形態 を編集していく。同じ値が連続するなら「上の行と同じ」がデフォルト候補として提案される
4. 各行の右側には modal で確定した「非 grouping」属性が **chip** として並ぶ (アセンブリ種別 / 第三者 / variation-type / functional-genomics 系など)。pair-end / 10x / multiplex のような grouping 由来の情報は Group ヘッダ + indent で表現するため chip にしない
5. cell が埋まるほど Section B の Step カードが詳細化される。未設定 cell は警告マークが付き、Step カードにも「⚠ X 列が未設定のため Y Step は未確定」と表示される
6. 行をコピー / 削除 / 一括編集することで、大量ファイルを効率的に扱える
7. tag の組み合わせが変わるたびに Step カード列は自動再生成される

途中で「やり直す」「ファイル削除」「tag 上書き」した場合も Section B は即座に追従する。テーブルが完全に埋まれば Step カード列も完全 = 登録準備が整った状態になる。

---

## 3. ファイルの種類 (ボタン群)

ボタンは **テーブルに行を追加するため** のもので、ファイルの **初期種別** を決める。9 種を 3×3 grid で配置する。

```
[+ 配列リード]          [+ 組み立て済み配列]       [+ 遺伝子アノテーション]
[+ 変異情報]            [+ 表現型データ]            [+ マイクロアレイ発現]
[+ RNA-seq マトリクス]  [+ 質量分析]                [+ 空間トランスクリプトーム]
```

| ボタン | 取り扱うファイル例 | データ形態列 (§5.1) の初期値 |
|---|---|---|
| **+ 配列リード** | FASTQ (single-end / pair-end / 10x / multiplex)、BAM、HDF5 | `raw` |
| **+ 組み立て済み配列** | FASTA (WGS / 完成ゲノム / TSA / TLS / EST / MAG / SAG / GSS / 合成配列 SYN)、AGP | `assembled` |
| **+ 遺伝子アノテーション** | GFF / GFF3、GenBank flat (第三者アノテーション含む) | `annotation` |
| **+ 変異情報** | VCF (per-sample / 集約)、reference FASTA | `analysis-output` |
| **+ 表現型データ** | 表現型・臨床情報の table / TSV / CSV (配列なし、JGA Dataset 想定) | `phenotype` |
| **+ マイクロアレイ発現** | CEL、iDAT、IDF/SDRF、Xenium / MERFISH 出力 | `raw` |
| **+ RNA-seq 発現マトリクス** | 発現マトリクス、IDF/SDRF | `matrix` |
| **+ 質量分析** | mzML、vendor RAW、imzML+ibd、ピークリスト、MAF | `mass-spec` |
| **+ 空間トランスクリプトーム** | Visium / Xenium / MERFISH / Stereo-seq / Slide-seq / GeoMx 出力 | `matrix` |

ボタン押下時の modal は **grouping の確定と構造的属性だけに使う**。例:

- **+ 配列リード**: pair-end / single-end / 10x / multiplex / Hybrid Assembly のいずれか
- **+ 組み立て済み配列**: アセンブリ種別 = WGS / 完成ゲノム (GNM) / TSA / TLS / EST / MAG / SAG / HTG / HTC / GSS / 合成配列 (SYN) / その他 (MISC, ASK)、Haplotype phased か、アノテーションファイルも同時に持つか
- **+ マイクロアレイ発現**: single-color / two-color、two-color の場合 Cy3 / Cy5 のファイル、MAGE-TAB IDF + SDRF も添付するか
- **+ 表現型データ**: 対象 BioSample との紐付け、JGA Dataset を構成するか

modal で確定すべきこと: **ファイル間の関係性 (= grouping)** とアセンブリ種別のような **後から table で変えにくい構造的属性**。
modal で確定しないこと: 組織 / 公開可否 / library strategy などの **table で per-cell に編集できる tag**。

ボタンに含めない (= modal 内部 / 別経路で扱う) もの:

- BioProject / BioSample / JGA Submission などの **上位メタデータ** は Step カード側で扱う (手元にファイルとして持っていない)
- IDF/SDRF (MAGE-TAB)、MAF、reference FASTA などの **付随メタデータ** は対応する主要ボタンの modal で「メタデータも添付」サブ選択で吸収する
- 特許配列 (PAT) は特許機関 (JPO/EPO/USPTO/KIPO) 経由で DDBJ に取り込まれる構造のため、ポータルからの登録対象外 (§7 参照)

---

## 4. grouping のしかた

ファイルは 1 行 1 ファイルが基本だが、**複数ファイルがセットで意味を持つケース** は Group としてまとめる。Group はテーブル上で indent と共通の Group ヘッダで視覚化する。データモデル上は単独行も `single` Group を必ず 1 つ持ち、複数ファイルが意味を持つときだけ下表の Group 化単位に切り替わる ([`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.3 `GroupType`)。

### 4.1 主な Group 化の単位 (`single` を除く)

| Group | ファイル構成 | グルーピングのトリガ |
|---|---|---|
| pair-end Run | R1 + R2 FASTQ | + 配列リード modal で「pair-end」選択時 |
| 10x Run | I1 / R1 / R2 (場合により I2) FASTQ | + 配列リード modal で「10x 系」選択時 |
| multiplex / pooled Run | **事前 demultiplex 済みの per-sample FASTQ 群** (元の barcode-sample 対応表は Library Construction Protocol に自由記述) | + 配列リード modal で「multiplex / pooled 構成」選択時。1 Group = N per-sample FASTQ + N BioSample |
| Hybrid Assembly | 異 instrument の Run 群 (各 Run = 別 Experiment、同 BioSample 配下) | + 配列リード modal で「複数機器」選択時 |
| アセンブリ + アノテーション | FASTA + GFF | + 組み立て済み配列 + + 遺伝子アノテーション併用時に手動関連付け |
| Two-color microarray | Cy3 / Cy5 ペア | + マイクロアレイ発現 modal で「two-color」選択時 |
| MAGE-TAB セット | matrix + IDF + SDRF | + マイクロアレイ / + RNA-seq マトリクス / + 空間 Tx modal で「メタデータも添付」選択時 |
| Imaging MS セット | imzML + ibd (+ 画像) | + 質量分析 modal で「imaging MS」選択時 |
| 変異 + 参照 | VCF + reference FASTA | + 変異情報 modal で「reference FASTA を一緒に登録」選択時 |
| MAG / SAG derived chain | 派生 BioSample のチェーン | + 組み立て済み配列 modal で MAG / SAG 選択時 (派生 BS Step が自動展開) |
| JGA Dataset | 配列リード / 変異 / 表現型の組合せを Dataset として束ねる | + 表現型データ modal で JGA Dataset 選択時、または事後にテーブル上で複数行を Dataset としてまとめる |

### 4.2 grouping を modal で決める理由

- ファイル関係性 (どの R1 とどの R2 が pair か) はテーブルの行配置では表現しきれない (cell 編集とは別次元)
- 漏れが発生しにくい (ファイル追加と grouping が同じ操作で完結)
- テーブル上では Group ヘッダ + indent で視覚的にまとまる
- 後から「これとこれは pair-end」を行選択で指定する UI は採用しない (実装複雑 / 漏れやすい)

### 4.3 modal とテーブルの境界

- **modal で決める**: ファイル間の関係性 (pair / 10x / multiplex / two-color / hybrid / MAGE-TAB / imaging MS / 変異+参照 / MAG-SAG chain / JGA Dataset)、構造的なアセンブリ種別 (assembly-form 13 種、サブファイル `submit-alt3-tags.md` §5.2)、ファイル名
- **テーブルで決める**: 組織 / 公開可否 / data-form (raw / 解析出力 / 行列) / provenance (一次 / 第三者) / 変異の形態 / library strategy / Package など、tag 系全般

### 4.4 1 file = 1 sample 原則

DDBJ の登録仕様は「**1 file = 1 BioSample = 1 organism = 1 access**」に分解された状態で受け付けるよう設計されている。

- **multiplex / pooled FASTQ は事前 demultiplex 必須**、per-sample FASTQ に分解して登録する (バーコード対応表は Library Construction Protocol に自由記述、DDBJ FAQ `metadata-of-multiplexed-samples`)
- **複数 sample のリードを混合してアセンブルしたゲノム** は派生 BioSample (`derived_from` 属性) で表現、ファイル自体は 1 つの混合 sample に対応 (`_biosample/overview.md`)
- **メタゲノム** は 1 file 内に多様な微生物が含まれても、登録上の organism は `metagenome` という単一の taxonomy 値で抽象化される (`_biosample/overview.md` MIxS.me、`_dra/metadata.md` METAGENOMIC)
- **JGA 対象** (個人識別子を含むデータ) かどうかは file 単位で決まり、1 file 内での open / restricted 混在は想定されていない (混在する場合は事前に分解されている前提)

このため、テーブルの列で per-file に organism / 公開可否 / データ形態 を 1 値ずつ持つモデルが DDBJ 規程と整合する。1 file 内で値が分かれるパターンは登録前に分解されている前提で、ポータル側ではそれを受け取って表現するだけで十分。

---

## 5. tagging のしかた

modal で確定する質問は性質によって 3 種類に分かれる。**質問の答え (= tag) は、その性質に応じて異なる UI 表現で現れる**。

| 質問の性質 | 答えの意味 | UI 上の表現 |
|---|---|---|
| **DB を跨ぐかを決める質問** | Cross-DB Tag (どの DB に登録するかが変わる) | テーブルの **列** または 行内 **chip** (§5.1 / §5.2) |
| **Group 構造を決める質問** | grouping (どのファイル群が 1 つの登録単位か) | Group ヘッダ + indent + 行構成で表現 (chip では重複表示しない、§4) |
| **DB 内の細部を決める質問** | Intra-DB Tag (登録先 DB が決まってから選ぶ controlled vocabulary) | Step カード内の **pulldown** (テーブルには出さない、§5.3) |

つまり tag chip / 列に現れるのは **「DB を跨ぐかどうかを決める質問の答え」** のみ。DB 内の細部は Step カードに閉じ、Group 構造は構造そのもので表現する。

Cross-DB Tag を **列にするか chip にするか** は UX の都合で振り分ける: ほぼ全種別のファイルが値を持ち、行間比較や一括編集が有用な軸は列、ファイル種別に紐づき列にすると空が増える軸は chip。

### 5.1 テーブルの列で表現する Cross-DB Tag (3 軸)

行間で値が異なり、行間比較と一括編集が有用な軸:

| 列 | 値の例 | 役割 |
|---|---|---|
| 組織 | human / human-microbiome / 真核 / 原核 / virus / metagenome / オルガネラ・プラスミド (7 種) | 混在ケースで行ごとに異なる、共通系統判定や Step 振り分けに必要。`human-microbiome` (ヒト由来メタゲノム) は restricted 時 JGA 集約対象 (§6.4) |
| 公開可否 | open / restricted | 混在ケースで行ごとに異なる、DRA vs JGA の Step 振り分けに直結 |
| データ形態 | raw / 組み立て済み / 解析出力 / 行列 / アノテーション / 質量分析 / 表現型 | ButtonType + modal で初期確定、行間比較が有用 |

これら 3 列は **per-cell に編集可能**。同じ値が連続する場合は「直前の行と同じ」がデフォルト候補として提案される。値が変わると Section B の Step カードが再生成される。

混在は許容される。1 研究内で human / mouse の混在、open / restricted の混在は現実的にあり得る (`_bioproject/project-info.md` で複数生物 BP は共通系統で対応)。混在がある場合、Section B には tag 組合せごとに異なる Step が並ぶ (例: DRA Step + JGA Step が並列)。

### 5.2 行内 tag chip で表現する Cross-DB Tag

ファイル種別に紐づき、列にすると他種別の行で空が増える軸。テーブル右側の chip 列にまとめて表示する。

**原則: Group 構造そのものが表現する情報は chip にしない**。pair-end / single-end / 10x / multiplex / two-color microarray / imaging MS / hybrid assembly / MAG-SAG chain / JGA Dataset / single-color microarray などは Group ヘッダ + indent + 行構成で表現されるため、chip で重複表示しない。

chip として残すのは **modal で確定する「非 grouping」属性** (= Group 構造を見ても分からない、ファイル内容や Q&A 回答に由来する属性) の **主軸 7 + 従属 3 = 計 10 軸** (詳細値域は [`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.2):

| Chip 軸 | 値の例 | 表示契機 |
|---|---|---|
| アセンブリの形態 (`assembly-form`) | WGS / GNM / TSA / TLS / EST / MAG / SAG / HTG / HTC / GSS / SYN / MISC / ASK (13 種) | + 組み立て済み配列 modal の「アセンブリ種別」確定時 |
| provenance | 第三者再解析 | + 組み立て済み配列 / + 遺伝子アノテーション modal で「第三者」選択時のみ表示 (一次データは default なので chip 表示しない) |
| variation-form | per-sample / aggregate | + 変異情報 modal で確定 |
| variation-type | SNP/Indel / SV / CNV | + 変異情報 modal で確定 |
| haplotype-mode | yes (haplotype phased) | + 組み立て済み配列 modal で haplotype phased 選択時のみ |
| functional-genomics 系 | yes (= GEA に登録) / wgs-target / tsa-target / metagenome-target / variation-target / wes-target / other | + 配列リード modal の Q1 / Q2 への回答結果 |
| mass-spec-domain | proteomics / metabolomics / imaging | + 質量分析 modal の選択結果 |
| `tpa-subtype` (従属) | tpa-assembly / tpa-specialist-db | provenance=third-party と同行に並ぶときだけ表示 |
| `haplotype-naming` (従属) | principal-alternate / haplotype-1-2 / maternal-paternal | haplotype-mode=phased と同行に並ぶときだけ表示 |
| `spatial-platform` (従属) | visium / xenium / merfish / stereo-seq / slide-seq / geomx / other | ButtonType=`spatial-tx` の行だけ表示 |

chip は **テーブル行の右側にまとめて表示** する。行内で「この行はこういう属性が付いている」が一目で見えれば十分。chip を直接クリックすると変更可能 (アセンブリの形態のように modal 確定値は modal 再オープン、他は inline 編集)。

### 5.3 Step カード内の pulldown (Intra-DB Tag)

登録先 DB が決まってから、その DB の入力フォーム内で選ぶ値。テーブルには出さず、Section B の Step カードを開いた中で見える:

- **DRA**: Library Strategy / Library Selection / Library Source / Instrument
- **BioSample**: Package (Human / Microbe / Plant / MIxS / Pathogen など)
- **GEA**: Experiment Type (Sequencing / Microarray / Classical assay 配下の細目)
- **MetaboBank**: Submission Type (LC-MS / GC-MS / NMR / MSI など)
- **MSS**: DIVISION / DATATYPE / KEYWORDS (基本的に DDBJ 側で自動付与され、Step カードでは確認のみ)

理由:

- テーブルの列を増やしすぎない (テーブルは Cross-DB tag 中心、Intra-DB は Service 確定後に提示)
- Step カード = 「その DB の登録フォーム」という対応関係が明確になる
- 値が変わっても Step 列の構成は変わらない (DB そのものは確定済み)

### 5.4 cell 編集の補助 UX

- **デフォルト提案**: 同じ値が連続する場合、新しい行に追加された cell には「直前の行と同じ」がデフォルト候補として提案される
- **一括編集**: 複数行を選択して一括で組織 / 公開可否を変更可能
- **警告マーク**: 未設定 cell は ⚠ アイコンを表示、Section B の Step カードでも「⚠ X 列が未設定のため Y Step は未確定」と連動表示
- **整合性チェック**: 例えば Library Strategy = WGS なのに data-form = matrix のような矛盾は警告として強調表示 (誤りを修正しやすくする)
- **並び順**: default は追加順、Group メンバは Group ヘッダ直後に固定される。列ヘッダクリックでソート可能 (組織 / 公開可否 / データ形態)。drag-and-drop 並び替えは PoC 範囲外 (本番フェーズで検討、§7.2)

---

## 6. 登録フローの提示の仕方

Section B には Step カードが縦に並ぶ。各 Step カードは「DDBJ ポータルの 1 つの DB への 1 つの登録操作」を表す。

### 6.1 Step カードの構成要素

- **Step タイトル** (例: Umbrella BioProject 登録、Primary BioProject 登録、DRA Run 登録、JGA Dataset 登録)
- **対象ファイル一覧** (Section A のテーブル行と双方向リンク、対象行をハイライトできる)
- **入力フィールド** (intra-DB pulldown + テキスト入力)
- **依存 accession** (前段 Step で取得した accession への参照)
- **発行 accession** の型 (例: `PRJDB#####`、`DRR#####`、`SAMD00000000`)
- **内部 / 外部 Service の色バッジ**
- **Step ノート** (補足情報、規程参照リンク、事前申請要件など)
- **未確定警告** (テーブルに未設定 cell があり、その Step の入力が決まらない場合)

### 6.2 色区分

| 区分 | 色 | アイコン | 該当 Service (`ServiceKind`) |
|---|---|---|---|
| 内部 (BSI / DDBJ) | emerald-500 | DDBJ ロゴ | `umbrella-bioproject` / `primary-bioproject` / `biosample` / `dra` / `mss` / `gea` / `metabobank` / `togovar` / JGA 8 種 (`jga-submission` / `jga-study` / `jga-sample` / `jga-experiment` / `jga-data` / `jga-analysis` / `jga-dataset` / `jga-policy`) |
| 外部 | amber-500 | 外部リンクアイコン | `dbcls-application` (DBCLS / NBDC 提供申請) / `jpost` / `eva` / `dgva` / `humandbs` |

`NSSS` (Nucleotide Sequence Submission System、ウェブ登録系) は MSS の登録経路の 1 つで、PoC では独立した Service にせず `mss` ServiceKind の `intraDbInputs.entryRoute = "mss" | "nsss"` 区別で表現する (`_ddbj/web-submission.md` の経路区分、`_faq/restricton-seq-length.md` の 100 bp 下限などはこのフラグから派生して案内する)。

Warning UI で使用する `amber-500` (Rule 14b) は外部 Service バッジと色が被るため、warning 枠線は `rose-500` 系を採用する。色用法の詳細は `.claude/docs/design-system.md` で SSOT 化。

### 6.3 Step カードの並び順と分岐

依存関係から自動で決まる。

- **Umbrella BioProject Step** (任意): 複数の独立した研究単位が並立する場合 (host-pathogen / multi-modal 研究) に上位の統括 Project として生成される。テーブル行群を解析して「複数の primary BP に分離すべき」と判定した場合に Section B のトップに提案される
- **Primary BioProject Step**: 登録単位の起点。1 研究 = 1 primary BP が基本だが、host-pathogen のような場合は複数 primary BP に分かれ、Umbrella BP が上位にぶら下がる
- **BioSample Step**: BioProject の次。テーブル行ごとに sample が違うなら BS が複数生成される。組織別に異なる Package が選ばれる
- **DRA / GEA / MSS / MetaboBank / TogoVar / JGA Data などの Step**: BS の次に並ぶ
- **混在ケースでは Step が分岐**: 例えば open 行が DRA Run / restricted 行が JGA Data に振り分けられ、Section B は両方の Step を並列に表示する
- **外部 Service Step** (jPOST / EVA / dgVa / HumanDBs) は「リンクと案内」のみで、入力フォームは出さない

### 6.4 特殊な集約モード

- **JGA 集約モード**: ヒト個人レベル + 制限公開のテーブル行は、通常 (BP + BS + DRA など) の Step 列ではなく JGA 単体の Step 列に集約される。DBCLS 事前申請 + 提供申請グループの subgrp ID が前提となるため Step カードのノートで明示
- **JGA Dataset (phenotype-only 含む)**: 配列なしの表現型データのみ、もしくは配列 + 表現型を束ねた登録単位として JGA Dataset Step が生成される。表現型 table 単独でも JGA Dataset として登録できる
- **TPA 経路**: 第三者再アセンブル / 第三者アノテーションの行は、TPA 規範 (peer reviewed publication 必須) を Step カードで案内
- **混合 BioSample**: 複数 sample のリードを混合してアセンブルした場合は、`derived_from` 属性で元 sample を列挙する派生 BioSample Step が生成される
- **multiplex / pooled Run**: 事前 demultiplex 済みの per-sample FASTQ 群 + N BioSample の構造を Step カードで表現 (BS Step が複数 + DRA Run Step が N、barcode-sample 対応表は Library Construction Protocol 入力欄で記述)

---

## 7. PoC スコープと範囲外

### 7.1 PoC で扱う

- 9 個のファイル追加ボタン (§3)
- ボタン押下時の grouping + 構造的属性を確定するための modal (最小限の質問)
- Section A のテーブル + per-cell 編集 + 警告マーク + デフォルト提案 + 整合性チェック
- テーブル列 3 軸 (組織 / 公開可否 / データ形態) + 行内 tag chip + Step カード内 pulldown の 3 階層 tag 表現
- Section B の登録フローカード列の動的生成
- **混在ケース** (1 研究内で複数組織 / 一部 open + 一部 restricted) の自然な表現
- **Umbrella BioProject + 複数 primary BP** の 2 段構造 (host-pathogen / multi-modal 研究での自動提案)
- **multiplex / pooled Run** (事前 demultiplex 済み per-sample FASTQ + N BioSample) の表現
- **phenotype-only** データの JGA Dataset 経路
- **GSS / SYN** を + 組み立て済み配列 modal の「アセンブリ種別」サブ選択で吸収
- 内部 / 外部 Service の色バッジ
- 主要な grouping パターン (pair-end / 10x / multiplex / two-color / MAGE-TAB / hybrid assembly / imaging MS / 変異+参照 / MAG-SAG derived chain / JGA Dataset)
- 第三者アノテーション / TPA / TogoVar-repository / JGA 集約モードの基本フロー
- **Pathogen 系 BS Package 4 + Viral デフォルト** (`pathogen-cl` / `pathogen-env` / `sars-cov-2-cl` / `sars-cov-2-wwsurv` の 4 Pathogen 系 Package と、病原ウイルス時の `viral` Package デフォルトからの切替) のユーザー明示選択 UX (Step BS カード上の補助 Q&A、詳細は [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 3a)
- **日英 i18n** (UI コピー + controlled vocabulary の両言語対応、PoC リリース時に両言語版を同時に提供)

#### 7.1.1 Rule 単位の PoC 対応マッピング

[`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) の Rule 1-15 と本セクションの PoC スコープの対応:

| Rule | 内容 | PoC 対応 |
|---|---|---|
| Rule 1 | Primary BioProject Step | ◯ PoC |
| Rule 2 | Umbrella BioProject Step | ◯ PoC |
| Rule 3 | BioSample Step + Package | ◯ PoC |
| Rule 3a | Pathogen 系 4 Package + Viral デフォルト切替の明示選択 UX | ◯ PoC |
| Rule 4 | 列ごとの主要 Step 振り分け | ◯ PoC |
| Rule 4a | GEA raw / processed 二段 | ◯ PoC |
| Rule 4b | `functional-genomics ≠ yes` 時の振り分け | ◯ PoC |
| Rule 4c | MetaboBank Study レベル accession | ◯ PoC |
| Rule 4d | 空間 Tx 未収録プラットフォーム | ◯ PoC (Step カードで案内のみ) |
| Rule 5 | 混合ケース Step 分岐 | ◯ PoC |
| Rule 6 | JGA 集約モード (Rule 6a / 6b / 6c) | ◯ PoC |
| Rule 6c | phenotype-only Sample-Dataset 直結 chain | ◯ PoC |
| Rule 7a | DDBJ TPA (再アセンブル) | ◯ PoC |
| Rule 7b | GEA / MetaboBank Third-party reanalysis | ◯ PoC (チーム事前確認状態の UI まで) |
| Rule 7c | Third-party annotation | △ PoC (notes-only Step、prefix 自動付与しない方針、§7.2 で本番再検討) |
| Rule 8 | MAG / SAG derived chain | ◯ PoC |
| Rule 9 | multiplex Run | ◯ PoC |
| Rule 10 | phenotype / JGA Dataset | ◯ PoC |
| Rule 11 | Haplotype phased | ◯ PoC |
| Rule 12 | 外部 Service Step | ◯ PoC |
| Rule 13 | MSS 補助フィールド (DIVISION / DATATYPE / KEYWORDS notes) | ◯ PoC (controlled vocabulary 化は本番送り) |
| Rule 14 | Step カード入力との chip 整合チェック | ◯ PoC (warning UI + 3 種操作 + acknowledged) |
| Rule 15 | Hybrid Assembly Run group | ◯ PoC |

「◯」= PoC で実装、「△」= 限定的に PoC で表現するが本番フェーズで再検討、「×」= PoC 対象外。

### 7.2 PoC では扱わない (本番フェーズで対応)

- **ファイル実体のアップロード** (PoC はファイル名を仮名で扱う)
- **下書きの永続化 / 後追い登録 / リアルタイム検証**
- **アクセシビリティ / モバイルレイアウト**
- **トップページからの本流導線判断** (v1 / v2 / v3 の 3 並走、最終的にどれを採用するかは別途)
- **大量ファイル (数千行) のテーブル性能チューニング** (PoC は数十行スケール)

### 7.3 DDBJ ポータルの対象外 (ヘルプから案内のみ)

- **特許配列 (PAT)**: 特許機関 (JPO / EPO / USPTO / KIPO) から DDBJ に直接フィードされる構造で、研究者がポータルから登録する経路は存在しない。「自分のデータは PAT として登録するの?」と迷うユーザーには、ヘルプリンクから特許機関への出願案内のみを提示する

### 7.4 PoC が満たすべき品質

- 主要な登録ケース (raw 配列 / 組み立て / 変異 / 発現 / 質量分析 / 表現型) について、テーブルへのファイル追加から Step カード列の詳細化までの一連の体験が動く
- 混在ケース (host-pathogen / ヒト+環境メタゲノム / open+restricted / multi-modal) が破綻なく表現できる
- 1 file = 1 sample 原則 (§4.4) に沿った分解前のデータ (multiplex / pooled FASTQ) について、ユーザーが「事前 demultiplex が必要」と気付けるよう modal とヘルプで案内する
- v2 が扱っていたケース集合のうち、典型的なものは v3 でも表現可能であることを確認する (網羅性の完全一致は目標としない)
- 内部 / 外部色区分とアイコンが、現行 DDBJ サイトの UI 規約と整合する
- 日本語版と英語版の両方が動作する (controlled vocabulary は英語キー固定、表示は i18n 経由)

---

## 参考: 詳細サブファイル

実装着手時に参照する細部資料。本 document の合意後に、これらの内容を実装に落とし込む。

| サブファイル | 内容 |
|---|---|
| [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) | ButtonType (9 種) / FileEntry (列 3 軸 + chip) / FileGroup / ChipTag / Submission (Umbrella BP + 複数 primary BP 対応) / FlowCard / FlowStep の TypeScript 型 + 実装ヒント |
| [`submit-alt3-tags.md`](./submit-alt3-tags.md) | 3 階層 tag 表現の SSOT (テーブル列 3 軸 / 行内 chip 10 軸 (主 7 + 従属 3) / Step カード pulldown) + アクセッション prefix + INSDC DIVISION 自動推測 + KEYWORDS controlled vocabulary |
| [`submit-alt3-modals.md`](./submit-alt3-modals.md) | 9 種ボタンの modal Q&A 詳細 (grouping + 構造的属性確定のみ) + Group カード UI |
| [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) | Step カード生成ルール (Primary BP / Umbrella BP / BS / 列ごとの主要 Step 振り分け / 混合 Step 分岐 / JGA 集約 / TPA 系 / MAG-SAG chain / multiplex / phenotype / haplotype / 外部 Service / Step 入力整合チェック) + 代表例 6 種 |
| [`submit-alt3-open-questions.md`](./submit-alt3-open-questions.md) | 本番フェーズ残課題 (UI / UX / 実装 / 個別 SSOT 補完) + コンテンツ原典カタログ |
