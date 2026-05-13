# 登録ナビゲーション v2 (`/submit-alt`)

DDBJ の複数 DB にまたがる登録フローを、研究者の **持っているデータ** を起点としたユースケース指向でガイドする仕様。`/submit` (v1) と並行して `/submit-alt` (v2) で提供する。

> v1 並走中: Decision Tree 起点の従来仕様 ([submit.md](./submit.md)) と評価並走中。トップ導線・本流選択は未確定。

## 概要

研究者の動機（何を持っていて、何を登録したいか）から登録先の組み合わせ・必要な準備物・登録手順をガイドする。v1（[submit.md](./submit.md)）との差分は以下:

- **質問ウィザード (Q&A) を唯一の導線にする**: Q1「持っているファイル」(複数選択) → Q2「対象生物」(単一選択) → 条件付き Q3-Q9 の多段質問で leaf を絞り込む。研究者の自己認識（手元のファイル形式 + 対象生物）から登録先に辿り着く。Decision Tree / Use Case Cards は v2 では持たない。
- **leaf の再構成**: variant 系を 3 leaf に集約、ヒトマイクロバイオーム制限と空間トランスクリプトームを新規追加、ヒト × 非制限の Raw/アセンブリ leaf を 3 件新規追加（旧仕様の穴を埋める）。合計 36 leaf。
- **詳細パネルの情報強化**: BioProject Project Data type / BioSample Package / DRA submission type / experiment type / GEA submission type / Annotation 制約 を leaf 単位で表示。
- **パンくずリスト**: Q&A の回答経路 (Q1 chip + Q2 + 条件付き Q) を chip で表示する。
- **内部/外部の色区分**: BSI/DDBJ 登録先と外部登録先を色 + アイコンで明示。

## ページ構成

`/submit-alt` は 3 セクションの縦構成。

```
+--- /submit-alt -----------------------------------------+
|  Section 1: 質問ウィザード (Q&A)                       |
|    Q1 持物 (8 種、複数) + Q2 生物 (6 種、単一) +        |
|    条件付き Q3-Q9                                       |
+---------------------------------------------------------+
|  Section 2: Breadcrumb (Q&A 回答 chip)                 |
+---------------------------------------------------------+
|  Section 3: Detail Panel                               |
|    leaf 一意化後の登録先・準備物・手順                 |
+---------------------------------------------------------+
```

全セクションが常時表示。Q&A の回答進行に応じて Detail Panel の内容が動的に更新される。候補が複数残る間は「候補があります」相当のプロンプトが表示され、leaf が一意に決まると詳細パネルが leaf 詳細に切り替わる。

## 設計原則

### 役割分担

| セクション | 役割 | 表示 |
|---|---|---|
| 質問ウィザード (Q&A) | データ起点で leaf を絞り込む多段質問（唯一の導線） | 常時表示 |
| Breadcrumb | Q&A 回答の chip 表示。chip × クリックで該当回答を解除 | chip がある時のみ表示 |
| Detail Panel | leaf 一意化時の詳細表示 / 未一意化時の候補プロンプト | 常時表示 |

研究者は Q&A の質問に順番に答えることで leaf に到達する。Q1 + Q2 が必須、Q3〜Q9 は前段の回答に応じて条件付きで出現し、必要な質問にすべて答えると leaf が一意に決まる。

## Section 1: 質問ウィザード (Q&A)

研究者の自己認識（手元のファイル形式 + 対象生物）から leaf を絞り込む多段質問形式。**Q1 + Q2 が必須**、**Q3〜Q9 は前段の回答に応じて条件付きで出現**する。leaf が一意に決まった時点で Detail Panel に内容が反映される。

### Q1. 何のファイル/データを持っていますか？（複数選択、必須）

ファイル形式ベース。研究者の自己認識の起点。ラベルは研究者が「自分のはこれだ」と即答できる具体的な日本語表記にする。

| 値 | 表示ラベル（日本語） | ファイル例 | 主な leaf |
|---|---|---|---|
| `sequence-read` | 配列リード（NGS / 長鎖シーケンサ） | FASTQ / BAM | leaf-08, 11, 12, 17, 20, 25, 32 |
| `assembled` | 組み立て済み配列（アセンブリ） | FASTA / アセンブリ | leaf-13-16, 18, 19, 21-29, 31, 33, 34 |
| `annotation` | 配列に対する遺伝子アノテーション | GFF / GenBank flat | leaf 分岐に効かない（注 1） |
| `variation` | 変異情報 | VCF / TSV | v01, v02, v03 |
| `expression-array` | マイクロアレイ発現データ | CEL / iDAT | leaf-09 |
| `expression-matrix` | RNA-seq 発現マトリクス（カウント表 / TPM / FPKM） | counts.tsv / TPM.tsv | leaf-08（`sequence-read` と併せて選択） |
| `mass-spec` | 質量分析データ（プロテオ or メタボ） | mzML / RAW | leaf-02, leaf-03（Q7 で区別） |
| `spatial-tx` | 空間トランスクリプトーム | 10x Xenium / Visium | s01, s02 |

注 1: `annotation` は研究者の自己認識として選択肢に残すが、leaf 分岐ロジックには影響しない。`assembled` 系 leaf に到達した時に詳細パネルで「アノテーションも一緒に MSS へ提出可能」と案内する。

注 2: `expression-array`（マイクロアレイ）は単独で leaf-09 に到達する。`expression-matrix`（RNA-seq マトリクス）は通常 `sequence-read` と併用され、その場合に leaf-08 (BP+BS+DRA+GEA) に到達する。`expression-matrix` 単独選択は実態として稀（マトリクスだけ持っていてリードは未公開、というケース）で、その場合は leaf-09 に統合扱いで案内する。

### Q2. データの対象生物は？（単一選択、必須）

「ヒト」を独立軸として扱う（ヒト由来データの登録は他生物と分岐ルールが大きく異なるため）。

| 値 | 内容 | 主な leaf |
|---|---|---|
| `human` | ヒトサンプル | leaf-01, v02, v03, m06, s02, ヒト配列リード/アセンブリ |
| `eukaryote` | ヒト以外の真核生物（動物・植物・菌類） | leaf-23 〜 leaf-31, s01 |
| `prokaryote` | 原核生物（細菌・古細菌） | leaf-17, 18, 19 |
| `virus` | ウイルス（ファージ含む） | leaf-20, 21, 22 |
| `metagenome` | メタゲノム / 環境試料（種を特定しない混合） | leaf-11 〜 15, m06 |
| `organelle-plasmid` | オルガネラ・プラスミド | leaf-16 |

### Q3. アクセス制限（条件付き）

**発火条件**: `Q2 = human`

| 値 | 内容 | 行き先 |
|---|---|---|
| `open` | 一般公開できる | v02（ヒト公開バリアント）、ヒト Raw リード/アセンブリ系 leaf |
| `restricted` | 同意範囲内のみ（NBDC 承認要） | leaf-01, v03, m06, s02 |

### Q4. アセンブリの由来（条件付き）

**発火条件**: `Q1 に assembled を含む`

| 値 | 内容 | 行き先 |
|---|---|---|
| `primary` | 自分が新規に決定したデータ | 通常のアセンブリ系 leaf |
| `tpa` | 第三者が公開した配列を利用 | leaf-24 (eukaryote-tpa) |

### Q5. 規模（条件付き）

**発火条件**: `Q1 = {sequence-read, assembled} のみ` かつ `Q2 ∈ {prokaryote, eukaryote, virus, organelle-plasmid}`

| 値 | 内容 | 行き先 |
|---|---|---|
| `small` | 100 配列以下、各配列 100bp〜500kb | leaf-10 (NSSS small-sequence)、leaf-30 (EST 小規模) |
| `normal` | 通常規模 | 通常の MSS / DRA 系 leaf |

### Q6. 特殊形式（条件付き、複数選択）

**発火条件**: `Q1 に assembled を含み Q2 ∈ {human, eukaryote, metagenome}`

選択肢は Q2 に応じて動的に絞り込まれる。

| 値 | 内容 | 表示条件 (Q2) | 行き先 |
|---|---|---|---|
| `haplotype` | Haplotype phased アセンブリ | human, eukaryote | leaf-28, leaf-29 |
| `tsa` | Transcriptome Shotgun Assembly | eukaryote, metagenome | leaf-23 (真核), leaf-15 (メタ) |
| `tls` | Targeted Locus Sequence | metagenome | leaf-14 |
| `mag-sag` | MAG / SAG / Binned | metagenome | leaf-13 |
| `est` | EST | eukaryote | leaf-30, leaf-31 (規模で分岐) |
| `none` | どれにも該当しない | 全条件 | 通常の Raw+Asm / Asm-only 系 leaf |

### Q7. 質量分析の種別（条件付き）

**発火条件**: `Q1 に mass-spec を含む`

| 値 | 行き先 |
|---|---|
| `proteomics` | leaf-02 (jPOST) |
| `metabolomics` | leaf-03 (BP+BS+MetaboBank) |

### Q8. メタゲノムデータの種別（条件付き）

**発火条件**: `Q1 に sequence-read を含み Q2 = metagenome`（assembled も含む場合は Q6 で分岐するので Q8 は非表示）

| 値 | 内容 | 行き先 |
|---|---|---|
| `raw` | Raw リード（FASTQ） | leaf-11 |
| `primary` | 一次解析結果（taxonomy profile / アバンダンス表など） | leaf-12 |

### Q9. ヒト試料がメタゲノム由来か？（条件付き）

**発火条件**: `Q2 = human` かつ `Q3 = restricted` かつ `Q1 に sequence-read または assembled を含む`

ヒトマイクロバイオーム制限のケース（m06）を leaf-01 と区別するための質問。

| 値 | 内容 | 行き先 |
|---|---|---|
| `yes` | ヒト由来のマイクロバイオーム（口腔・腸内など） | m06 (human-microbiome-restricted) |
| `no` | ヒト本体のデータ（ゲノム・トランスクリプトーム等） | leaf-01 (human-restricted) |

### 質問の表示・進行

- Q1 と Q2 は常時表示（必須）。Q3〜Q9 は発火条件を満たした時のみ表示される（未表示 = 該当 leaf に分岐がない、または前段未回答）
- 回答途中でも候補 leaf 群が Detail Panel に「候補があります」プロンプトとして表示される
- 必要な質問に全て答えると leaf が一意に決まり、Detail Panel に詳細が表示される
- 答えの組み合わせで leaf が一意化されないケース（例: assembled + eukaryote + primary + normal + Q6=none で leaf-26/leaf-27 のいずれか）は、追加で「配列リードもセットで持っているか」を Q1 のチェックで判定する（leaf-26 = リード+アセンブリ、leaf-27 = アセンブリのみ）

### マルチ選択時の登録フロー案内（Q&A 完了前）

Q1 + Q2 が回答済みで Q3-Q8 を埋めている途中の段階で、現時点の選択が複数登録先にまたがる場合に「これらは別登録になります」のような案内を Callout で表示する（旧 `MultiSelectGuidance` 相当）。

| パターン | 判定条件 (Q1, Q2, Q3 ベース) | 内容 | 例 |
|---|---|---|---|
| 1. 同 submission 統合 | 単一 submission に収まる組み合わせ | 1 つの登録フローに統合可能 | sequence-read + assembled × prokaryote → BP+BS+DRA+MSS |
| 2. BP/BS 共有 + 別 submission | mass-spec=metabolomics + 他 | BP/BS 共有しつつ別 submission | assembled + mass-spec(metabo) → D-way + MetaboBank |
| 3. 完全独立（外部窓口） | mass-spec=proteomics or variation×非 human-restricted | BP/BS も別、外部のため共有不可 | mass-spec(proteo) → jPOST／variation×eukaryote → EVA/dgVa |
| 4. JGA 一本化 | Q2=human ∧ Q3=restricted | JGA に統合 | restricted human の任意組み合わせ |

判定優先順位: 4 → 3 → 2 → 1。

### Q1〜Q8 → leaf マッピング表

研究者の回答（Q1-Q9 の組み合わせ）が、36 leaf のどれに到達するかを定義する。「—」はその質問が発火しない / 該当 leaf 識別に使わない。

| leaf (legacy ID) | Q1 持物 (含むべき値) | Q2 生物 | Q3 公開 | Q4 由来 | Q5 規模 | Q6 形式 | Q7 質量 | Q8 メタ | Q9 メタ由来 |
|---|---|---|---|---|---|---|---|---|---|
| leaf-01 | sequence-read OR assembled | human | restricted | — | — | — | — | — | no |
| leaf-02 | mass-spec | 任意 | — | — | — | — | proteomics | — | — |
| leaf-03 | mass-spec | 任意 | — | — | — | — | metabolomics | — | — |
| v01 | variation | eukaryote / prokaryote / virus / metagenome | — | — | — | — | — | — | — |
| v02 | variation | human | open | — | — | — | — | — | — |
| v03 | variation | human | restricted | — | — | — | — | — | — |
| leaf-08 | sequence-read + expression-matrix | 任意 | — | — | — | — | — | — | — |
| leaf-09 | expression-array（sequence-read を含まない） | 任意 | — | — | — | — | — | — | — |
| leaf-10 | assembled | prokaryote / eukaryote / virus / organelle-plasmid | — | primary | small | none | — | — | — |
| leaf-11 | sequence-read | metagenome | — | — | — | — | — | raw | — |
| leaf-12 | sequence-read | metagenome | — | — | — | — | — | primary | — |
| leaf-13 | sequence-read + assembled | metagenome | — | primary | — | mag-sag | — | — | — |
| leaf-14 | sequence-read + assembled | metagenome | — | primary | — | tls | — | — | — |
| leaf-15 | sequence-read + assembled | metagenome | — | primary | — | tsa | — | — | — |
| m06 | sequence-read OR assembled | human | restricted | — | — | — | — | — | yes |
| leaf-16 | assembled | organelle-plasmid | — | primary | — | — | — | — | — |
| leaf-17 | sequence-read（assembled を含まない） | prokaryote | — | — | — | — | — | — | — |
| leaf-18 | sequence-read + assembled | prokaryote | — | primary | normal | none | — | — | — |
| leaf-19 | assembled（sequence-read を含まない） | prokaryote | — | primary | normal | none | — | — | — |
| leaf-20 | sequence-read（assembled を含まない） | virus | — | — | — | — | — | — | — |
| leaf-21 | sequence-read + assembled | virus | — | primary | normal | none | — | — | — |
| leaf-22 | assembled（sequence-read を含まない） | virus | — | primary | normal | none | — | — | — |
| leaf-23 | sequence-read + assembled | eukaryote | — | primary | — | tsa | — | — | — |
| leaf-24 | assembled | eukaryote | — | tpa | — | none | — | — | — |
| leaf-25 | sequence-read（assembled を含まない） | eukaryote | — | — | — | — | — | — | — |
| leaf-26 | sequence-read + assembled | eukaryote | — | primary | normal | none | — | — | — |
| leaf-27 | assembled（sequence-read を含まない） | eukaryote | — | primary | normal | none | — | — | — |
| leaf-28 | sequence-read + assembled | eukaryote | — | primary | — | haplotype | — | — | — |
| leaf-29 | assembled（sequence-read を含まない） | eukaryote | — | primary | — | haplotype | — | — | — |
| leaf-30 | assembled | eukaryote | — | — | small | est | — | — | — |
| leaf-31 | assembled | eukaryote | — | — | normal | est | — | — | — |
| leaf-32 (new: `human-raw-open`) | sequence-read（assembled を含まない） | human | open | — | — | — | — | — | no |
| leaf-33 (new: `human-raw-assembly-open`) | sequence-read + assembled | human | open | primary | — | none | — | — | no |
| leaf-34 (new: `human-assembly-only-open`) | assembled（sequence-read を含まない） | human | open | primary | — | none | — | — | no |
| s01 | spatial-tx | eukaryote / prokaryote / virus / metagenome / organelle-plasmid | — | — | — | — | — | — | — |
| s02 | spatial-tx | human | restricted | — | — | — | — | — | — |

#### マッピング上の補足

- **Q1 は複数選択**: 「sequence-read + assembled」のように 2 つチェックされた場合、Raw+Assembly 系 leaf に到達する。片方しかチェックされていない場合は Raw のみ / Asm のみの leaf に到達する
- **leaf-08 vs leaf-09**: 別 Q1 値で明確に区別。`expression-array` = マイクロアレイ → leaf-09。`expression-matrix` + `sequence-read` = RNA-seq → leaf-08
- **`expression-matrix` 単独**: 仕様上は leaf-09 に統合扱いで案内（マトリクスだけ単独提出のケースは GEA 側でマイクロアレイ扱いと同等の処理）
- **`annotation` は leaf 分岐に効かない**: 研究者の自己認識として選択可能だが、leaf 到達には影響しない。詳細パネルで MSS への付随ファイルとして案内
- **m06 と leaf-01 の判定 (Q9)**: Q2=human + Q3=restricted の段階では未確定。Q9（メタゲノム由来？）で明確に分岐する
- **ヒト × 非制限の Raw/アセンブリ leaf を新設**: leaf-32 / leaf-33 / leaf-34 を新規追加（旧仕様の穴を埋める）。BS Package で Human を扱う、DRA / MSS の通常フローを使う。最終的に JGA 移行が必要かどうかは詳細パネルで案内

## Section 2: leaf 仕様一覧

合計 36 leaf。Q&A の回答から到達する leaf の SSOT として、leaf ID / URL ID / 登録先ゴールを下記に列挙する（コード側 SSOT は `src/lib/mock-data/submit-alt-tree/leafGoals.ts`）。

### 旧 `/submit` からの整理方針

旧 `/submit` の tree（深さ 2-7、中間 node 約 13 個）の分岐軸は、すべて Q&A の質問軸に吸収する。

| 旧 /submit の分岐 | 新 /submit-alt での扱い |
|---|---|
| L1 ヒト制限判定 | Q2=human + Q3 (open/restricted) に吸収 |
| L2 計測モダリティ | Q1 (持物 8 種) に吸収 |
| L3-seq 規模分岐 | Q5 (規模 small/normal) に吸収 |
| L4-seq 由来分岐 | Q1 (sequence-read / assembled の組み合わせ) + Q8 (raw/primary) に吸収 |
| L5-L6 生物カテゴリ | Q2 (生物 6 種) に吸収 |
| L7 データ形式 | Q6 (特殊形式) に吸収 |

leaf 数は 31 → 36 に増加（variant 集約 -1、ヒトマイクロバイオーム制限 +1、空間 Tx +2、ヒト × 非制限 Raw/Asm 系 +3）。

### 36 leaf 一覧

#### ヒト制限・外部リダイレクト系

| leaf ID | URL ID | ゴール |
|---|---|---|
| leaf-01 | `human-restricted` | JGA |
| leaf-02 | `proteomics` | jPOST |

#### 変異データ系（旧 4 leaf を 3 leaf に集約）

| leaf ID | URL ID | 内容 | 詳細パネルでの登録先選択 |
|---|---|---|---|
| v01 | `variation-nonhuman` | 変異 × 非ヒト | EVA / dgVa（SNP/SV で分岐） |
| v02 | `variation-human-open` | 変異 × ヒト 非制限 | JVar SNP / JVar SV / SRA-analysis |
| v03 | `variation-human-restricted` | 変異 × ヒト 制限 | JGA-analysis / HumanDBs |

per-sample / aggregate の解像度は v02 / v03 の詳細パネル内で分岐する。

#### メタボ・発現・小規模系

| leaf ID | URL ID | ゴール |
|---|---|---|
| leaf-03 | `metabolomics` | BP+BS+MetaboBank |
| leaf-08 | `expression-ngs` | BP+BS+DRA+GEA |
| leaf-09 | `expression-array` | BP+BS+GEA |
| leaf-10 | `small-sequence` | NSSS |

#### メタゲノム系（既存 5 + 新規 m06）

| leaf ID | URL ID | ゴール |
|---|---|---|
| leaf-11 | `metagenome-raw` | BP+BS+DRA |
| leaf-12 | `metagenome-primary` | BP+BS+DRA(Analysis) |
| leaf-13 | `metagenome-genome-bin` | BP+BS+DRA+MSS |
| leaf-14 | `metagenome-tls` | BP+BS+DRA+MSS(TLS) |
| leaf-15 | `metagenome-tsa` | BP+BS+DRA+MSS(TSA) |
| m06 | `human-microbiome-restricted` | JGA-analysis / HumanDBs |

#### 微生物ゲノム系

| leaf ID | URL ID | ゴール |
|---|---|---|
| leaf-16 | `organelle-plasmid` | BP+BS+MSS |
| leaf-17 | `prokaryote-raw` | BP+BS+DRA |
| leaf-18 | `prokaryote-raw-assembly` | BP+BS+DRA+MSS |
| leaf-19 | `prokaryote-assembly-only` | BP+BS+MSS |
| leaf-20 | `virus-raw` | BP+BS+DRA |
| leaf-21 | `virus-raw-assembly` | BP+BS+DRA+MSS |
| leaf-22 | `virus-assembly-only` | BP+BS+MSS |

#### 真核ゲノム系

| leaf ID | URL ID | ゴール |
|---|---|---|
| leaf-23 | `eukaryote-tsa` | BP+BS+DRA+MSS(TSA) |
| leaf-24 | `eukaryote-tpa` | BP+BS+MSS(TPA) |
| leaf-25 | `eukaryote-raw` | BP+BS+DRA |
| leaf-26 | `eukaryote-raw-assembly` | BP+BS+DRA+MSS |
| leaf-27 | `eukaryote-assembly-only` | BP+BS+MSS |
| leaf-28 | `eukaryote-haplotype-raw-assembly` | BP+BS+DRA+MSS(Haplotype) |
| leaf-29 | `eukaryote-haplotype-assembly-only` | BP+BS+MSS(Haplotype) |
| leaf-30 | `eukaryote-est-small` | NSSS(EST) |
| leaf-31 | `eukaryote-est-large` | BP+BS+MSS(EST) |

#### 空間トランスクリプトーム系（新規 2 leaf）

| leaf ID | URL ID | ゴール |
|---|---|---|
| s01 | `spatial-tx-nonhuman` | BP+BS+GEA(Xenium) |
| s02 | `spatial-tx-restricted` | JGA-analysis（DB-2021 詳細確認後に s01 と統合判断する余地を残す） |

#### ヒト × 非制限の Raw / アセンブリ系（新規 3 leaf）

旧仕様の穴（ヒト × Q3=open の Raw/Asm ケースに対応 leaf がない）を埋めるため新設。BS Package で Human を扱いつつ、DRA / MSS の通常公開フローを使う。詳細パネルで「最終的に JGA に移行する必要がないか」を案内する。

| leaf ID | URL ID | ゴール |
|---|---|---|
| leaf-32 | `human-raw-open` | BP+BS+DRA |
| leaf-33 | `human-raw-assembly-open` | BP+BS+DRA+MSS |
| leaf-34 | `human-assembly-only-open` | BP+BS+MSS |

### ゴール一覧

| ゴール | 登録先 | 該当 leaf |
|---|---|---|
| JGA | JGA | leaf-01 |
| jPOST | jPOST（外部） | leaf-02 |
| BP+BS+MetaboBank | BioProject + BioSample + MetaboBank | leaf-03 |
| EVA | European Variation Archive（外部、EBI） | v01（非ヒト SNP/Indel） |
| dgVa | Database of Genomic Variants archive（外部、EBI） | v01（非ヒト SV） |
| JVar SNP / JVar SV | JVar（DDBJ 運営） | v02 |
| SRA-analysis | DRA Analysis | v02 |
| JGA-analysis | JGA 内 Analysis | v03, m06, s02 |
| HumanDBs | HumanDBs（NBDC） | v03, m06 |
| BP+BS+DRA+GEA | BioProject + BioSample + DRA + GEA | leaf-08 |
| BP+BS+GEA | BioProject + BioSample + GEA | leaf-09 |
| BP+BS+GEA(Xenium) | BioProject + BioSample + GEA（10x Genomics Xenium） | s01 |
| NSSS | DDBJ NSSS 経由 | leaf-10, leaf-30 |
| BP+BS+DRA | BioProject + BioSample + DRA | leaf-11, leaf-17, leaf-20, leaf-25, leaf-32 |
| BP+BS+DRA(Analysis) | BioProject + BioSample + DRA（Analysis のみ） | leaf-12 |
| BP+BS+DRA+MSS | BioProject + BioSample + DRA + MSS | leaf-13, leaf-18, leaf-21, leaf-26, leaf-33 |
| BP+BS+DRA+MSS(TLS/TSA/Haplotype) | 同上、MSS data type 違い | leaf-14, leaf-15, leaf-23, leaf-28 |
| BP+BS+MSS | BioProject + BioSample + MSS | leaf-16, leaf-19, leaf-22, leaf-24, leaf-27, leaf-31, leaf-34 |
| BP+BS+MSS(Haplotype/TPA/EST) | 同上、MSS data type 違い | leaf-24, leaf-29, leaf-31 |

略語は `/submit` と同じ（BP = BioProject、BS = BioSample、DRA = DDBJ Sequence Read Archive、GEA = Genomic Expression Archive、MSS = Mass Submission System、NSSS = Nucleotide Sequence Submission System、JGA = Japanese Genotype-phenotype Archive）。

## Section 3: Detail Panel

### パンくずリスト

Q&A の回答経路（Q1〜Q9 の chip）を chip で並べる。各 chip の × ボタンで該当回答を解除できる。

```
[配列リード ☑] [アセンブリ ☑] [真核 ☑] [Primary ☑] [通常規模 ☑] [どれにも該当しない ☑]
```

回答が 1 つも入っていない時は Breadcrumb 自体を非表示にする。

### 表示モード

- **未一意化**: leaf が一意に決まっていない時。「Q&A に答えると詳細が表示されます」または「候補があります」プロンプトを表示する。
- **leaf 一意化**: leaf が決まった時。leaf 詳細（登録先・登録順序・準備物・固有補足・外部リンク）と軸補強情報を表示する。

### leaf 一意化時の追加情報（軸補強）

leaf 単位で以下を表示する。

| 軸 | 内容 |
|---|---|
| BioProject Project Data type | 13 種から該当を表示（Genome Sequencing / Metagenome / Variation / Transcriptome or Gene Expression / Proteome / Phenotype and Genotype / Epigenomics / Exome / Map / Clone Ends / Random Survey / Targeted Locus / Other） |
| BioSample Package | 22 種（Standard 11 + Pathogen 2 + MIxS 9）から該当を表示 |
| DRA Library Source | 9 種（GENOMIC / GENOMIC SINGLE CELL / TRANSCRIPTOMIC / TRANSCRIPTOMIC SINGLE CELL / METAGENOMIC / METATRANSCRIPTOMIC / SYNTHETIC / VIRAL RNA / OTHER） |
| DRA Library Strategy | 30+ 種から代表選択 + Other |
| DRA Instrument | リスト形式で補助表示 |
| GEA Submission Type | Sequencing / Microarray / 10x Genomics Xenium |
| MetaboBank Submission Type | LC-MS / LC-DAD-MS / GC-MS / GCGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS / MSI / NMR（leaf-03 のみ） |
| Annotation ファイル制約 | MSS data type 別、qualifier 制約等 |
| JGA 登録オブジェクト | Study / Sample / Experiment / Data / Analysis / Dataset / Policy（leaf-01, v03, m06, s02 で関連分を表示） |

### NSSS 制約（leaf-10 / leaf-30）

NSSS で受付可能な範囲:

- 配列長: 100 bp 以上 〜 500 kb 未満（最小 100 bp は 2021/6 以降の制約）
- 配列数: 100 配列以下
- Feature 数: 1 配列あたり 30 features 未満
- 形式: FASTA / multi-FASTA
- 受付しない種別: EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA（→ MSS へ）
- 染色体を join した配列は不可（各染色体は独立に登録）

## UI 詳細

### 内部 vs 外部の色区分

| 区分 | 色（Tailwind） | アイコン | 該当登録先 |
|---|---|---|---|
| 内部（BSI/DDBJ） | `emerald-500` 系 | DDBJ ロゴ | DRA / GEA / MSS / NSSS / JGA / MetaboBank / JVar |
| 外部 | `amber-500` 系 | 外部リンクアイコン | jPOST / EVA / dgVa / HumanDBs（NBDC） |

カード / leaf カード / 詳細パネル内のリンク全てに一貫適用する。デザインシステムに「内部/外部バッジ」コンポーネントを追加する（`.claude/docs/design-system.md` 参照）。

### 各セクションの表示制御

| セクション | 表示 |
|---|---|
| 質問ウィザード (Q&A) | 常時表示 |
| Breadcrumb | Q&A 回答 chip がある時のみ表示 |
| Detail Panel | 常時表示。leaf 一意化前は候補プロンプト、一意化後は leaf 詳細 |

## URL 設計

`/submit-alt` は常に裸の `/submit-alt` で動作する。クエリパラメータ・履歴連携は持たず、Q&A 状態はコンポーネント内 `useState` で保持する。canonical は `/submit-alt`。

## 実装関連

### 軸補強情報の SSOT

`src/lib/mock-data/submit-alt-tree/masters.ts`（新規）に以下マスタを定義する:

- BioProject Project Data type 一覧
- BioSample Package 一覧
- DRA Library Source / Library Strategy / Instrument 一覧
- GEA Submission Type 一覧
- MetaboBank Submission Type 一覧

leaf 定義（`leafDetails.ts` 等）からマスタを参照キーで引く。

### i18n

UI テキスト（質問文、選択肢、ボタン等）は `locales/ja.json`, `locales/en.json`。詳細パネル本文は言語別 TSX コンポーネント（例: `MicrobialGenomeDetail.ja.tsx`, `MicrobialGenomeDetail.en.tsx`）。

## 設計上の決定事項

- **質問ウィザード (Q&A) が唯一の導線**: Q1 (持物 8 種、複数選択、必須) + Q2 (生物 6 種、単一選択、必須) + 条件付き Q3〜Q9 の多段で leaf を一意化する。Decision Tree / Use Case Cards は v2 では持たない
- **旧 DataTypeSelector (10 項目チェック) は廃止**: data type 10 種は Q1 (8 種) × Q2 (6 種) の組に再マップする
- **横断属性「ヒト由来」は廃止**: ヒト関連の分岐は Q2 = human + Q3 (open/restricted) に一本化する
- **leaf 数**: 31 → 36（variant 集約 -1、ヒトマイクロバイオーム制限 +1、空間 Tx +2、ヒト × 非制限 Raw/Asm 系 +3）
- **variant 集約の方針**: ヒト/非ヒト × 制限/非制限 の 3 区分で集約（v01-v03）。per-sample/aggregate と各登録先の選択は詳細パネル分岐に閉じる
- **空間 Tx leaf 構成**: 非ヒト（s01）と ヒト制限（s02）の 2 leaf。DB-2021 の詳細仕様確認後に統合判断する余地を残す
- **詳細パネルの 1 段階表示**: leaf 一意化時に詳細を出す単純構造。中間ノード概要は廃止
- **内部/外部色区分**: 内部 = `emerald-500`、外部 = `amber-500` で一貫
- **画面構成**: 3 セクション縦構成（Q&A / Breadcrumb / Detail Panel）。全て常時表示
- **URL 連携の廃止**: Q&A 状態はコンポーネント内 `useState` で保持する。URL クエリパラメータ・履歴連携は持たない
- **leaf マッピングの SSOT**: `src/lib/mock-data/submit-alt-tree/leafQAMapping.ts` の `LEAF_QA_CONDITIONS` が Q1〜Q9 → leaf の決定ルール

## コンテンツ原典

ddbj/www の以下のファイルを原典とする。文言はそのまま流用しないが、情報は踏襲する。

| 原典 | 参照先 |
|---|---|
| `_ddbj/data-categories.md` | MSS data type |
| `_ddbj/genome.md`, `_ddbj/transcriptome.md`, `_ddbj/haplotype.md` | ゲノム / TSA / Haplotype |
| `_ddbj/metagenome-assembly.md`, `_ddbj/single-amplified-genome.md` | MAG / Binned / SAG |
| `_ddbj/tls.md`, `_ddbj/tsa.md`, `_ddbj/est.md`, `_ddbj/tpa.md` | TLS / TSA / EST / TPA |
| `_ddbj/submission.md`, `_ddbj/mss.md`, `_ddbj/web-submission.md`, `_ddbj/web-submission-help.md` | NSSS / MSS |
| `_dra/submission.md` | DRA |
| `_bioproject/submission.md`, `_bioproject/project-info.md` | BioProject |
| `_biosample/submission.md`, `_biosample/overview.md` | BioSample |
| `_gea/submit-sequence.md`, `_gea/submit-array.md` | GEA |
| `_jga/submission.md` | JGA |
| `_metabobank/submission.md` | MetaboBank |
| [DDBJ FAQ](https://www.ddbj.nig.ac.jp/faq/en/index-e.html) | NSSS 制約 |
