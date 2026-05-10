# 登録ナビゲーション v2 (submit-alt)

DDBJ の複数 DB にまたがる登録フローを、研究者の **持っているデータ** を起点としたユースケース指向でガイドする仕様。`/submit` と並行して `/submit-alt` で提供する。

## 概要

研究者の動機（何を持っていて、何を登録したいか）から登録先の組み合わせ・必要な準備物・登録手順をガイドする。`/submit`（旧仕様、`docs/submit.md` 参照）との差分は以下:

- **新トップ階層の追加**: 「データ種別 Y/N の複数選択」を最初の判断レイヤーとして追加。研究者が自己認識ベースで持っているデータをチェックすることで、該当 leaf 集合が絞り込まれる。
- **Decision Tree の簡略化**: 中間ノード（生物種・規模など）の分岐を Detail Panel へ移行し、tree 全体を浅くする。ただし登録先システム・ワークフロー構造・必要準備物が違うものは引き続き分岐させる（leaf 統合判定基準は `/submit` と同じ）。
- **leaf の再構成**: variant 系を 3 leaf に集約、ヒトマイクロバイオーム制限と空間トランスクリプトームを新規追加。合計 33 leaf。
- **詳細パネルの情報強化**: BioProject Project Data type / BioSample Package / DRA submission type / experiment type / GEA submission type / Annotation 制約 を leaf 単位で表示。
- **パンくずリスト**: 新トップ選択 chip + tree 経路を併記。
- **内部/外部の色区分**: BSI/DDBJ 登録先と外部登録先を色 + アイコンで明示。

## ページ構成

`/submit-alt` は 4 セクションの縦構成。

```
+--- /submit-alt -----------------------------------------+
|  Section 1: 新トップ階層                                |
|    データ種別 Y/N 複数選択 + 横断属性「ヒト由来データ」 |
+---------------------------------------------------------+
|  Section 2: Use Case Cards (10 枚)                     |
+---------------------------------------------------------+
|  Section 3: Decision Tree (簡略化版)                   |
+---------------------------------------------------------+
|  Section 4: Detail Panel                               |
|    パンくず + 概要/具体 2 段階ドリルダウン              |
+---------------------------------------------------------+
```

各セクションは常時表示し、選択に応じてハイライトで状態変化する（詳細パネル展開時に他セクションが消えない）。

## 設計原則

### 役割分担

| セクション | 役割 |
|---|---|
| 新トップ階層 | 持っているデータの複数チェック（網羅的、絞り込み） |
| Use Case Cards | 研究テーマで一発入る（ショートカット） |
| Decision Tree | 網羅的な登録パターンの可視化（簡略化済み） |
| Detail Panel | 2 段階ドリルダウンの情報開示装置 |

研究者は以下 3 経路で詳細パネルへ到達する:

1. **新トップ階層 → 絞り込み**: データ種別を複数チェックして該当 leaf 集合を絞り込む
2. **Cards → 直行**: 研究テーマカードをクリックして tree 中間 node または leaf へ直行
3. **Tree → 順次降下**: tree を上から順に降りる（判断に迷う研究者向け）

新トップ階層・Cards・Tree は補完関係で両立する。

### tree の深さ

旧 `/submit` の深さ 2-7 から、生物種・規模など不要な中間ノード分岐を Detail Panel に移行することで簡略化する。tree を浅くしすぎると tree の意味がなくなるため、登録先システム・ワークフロー構造・必要準備物が違うものは引き続き分岐させる。

## Section 1: 新トップ階層

### データ種別（10 項目、Y/N 複数選択）

| 項目 | 主な対応 leaf |
|---|---|
| ヒト制限公開アクセス | leaf-01 |
| シーケンスリード | DRA を含む leaf 群（leaf-08, 11, 17, 20, 25 ほか） |
| ゲノム | 微生物 / 真核 / メタゲノムの assembly 系 leaf 群 |
| バリアント解析 | v01, v02, v03 |
| プロテオミクス | leaf-02 |
| EST 解析 | leaf-30, leaf-31 |
| Microarray | leaf-09 |
| 空間トランスクリプトーム | s01, s02 |
| メタボロミクス | leaf-03 |
| 小規模塩基配列 | leaf-10 |

### 横断属性

| 属性 | 用途 |
|---|---|
| ヒト由来データ Y/N | 他項目と組み合わせて使う（ゲノム × ヒト由来 + 制限 → JGA 系へ等） |

### マルチ選択時の UI 動作（4 パターン）

研究者が複数項目をチェックした場合、登録フローが 1 つにまとまるか別々になるかを動的に案内する。

| パターン | 内容 | 例 |
|---|---|---|
| 1. 同 submission 統合 | 1 つの登録フローに統合可能 | シーケンスリード + ゲノム → BP+BS+DRA+MSS |
| 2. BP/BS 共有 + 別 submission | 別フローだが BP/BS 共通 | ゲノム + メタボロミクス（D-way + MetaboBank） |
| 3. 完全独立（外部窓口） | BP/BS も別、外部のため共有不可 | 任意 + プロテオミクス（jPOST） |
| 4. JGA 一本化 | ヒト制限ありなら JGA に統合 | ヒト制限ゲノム + ヒト制限バリアント |

UI は「これらは別登録になります、BP/BS は共有可能です」のような案内を出す。

## Section 2: Use Case Cards (10 枚)

研究テーマでショートカットするカード。Section 1 の選択に応じてハイライトされる。

| # | カード | 主な leaf |
|---|---|---|
| 1 | 微生物ゲノム | leaf-16 〜 leaf-22 |
| 2 | 真核生物ゲノム | leaf-23 〜 leaf-31 |
| 3 | メタゲノム / MAG / SAG | leaf-11 〜 leaf-15, m06 |
| 4 | 遺伝子発現 | leaf-08, leaf-09 |
| 5 | 空間トランスクリプトーム | s01, s02 |
| 6 | 変異データ | v01, v02, v03 |
| 7 | プロテオミクス | leaf-02 |
| 8 | メタボロミクス | leaf-03 |
| 9 | 小規模塩基配列・PCR 産物 | leaf-10 |
| 10 | ヒト制限アクセス | leaf-01 |

カード表示順はゲノム系を先頭、ヒト制限アクセスを最後（データ種別ではなくアクセス制限属性のため）。

### カード refine の重点

- **メタゲノムカード**: m06（ヒトマイクロバイオーム制限）を追加表示し、「DRA のみ / DRA + MAG / TLS / TSA / ヒト制限」の選択を自明化する
- **遺伝子発現カード**: GEA submission type を 3 サブカテゴリ（Sequencing / Microarray / 10x Genomics Xenium）で構成
- **変異データカード**: v01-v03 の集約構造を反映し、詳細パネルでの登録先選択（JVar / EVA / dgVa / SRA-analysis / JGA-analysis / HumanDBs）に誘導
- **空間トランスクリプトームカード**: 新規追加

## Section 3: Decision Tree（簡略化版）

合計 33 leaf。新トップ階層が旧 tree の上層分岐を吸収することで、tree の深さと横の広がりを大幅に縮小する。

### 簡略化方針

旧 `/submit` の tree（深さ 2-7、中間 node 約 13 個）に対し、新トップ階層が以下の旧分岐を吸収することで tree を浅くする。

| 旧 /submit の分岐 | 新 /submit-alt での扱い |
|---|---|
| L1 ヒト制限判定 | 新トップ「ヒト制限公開アクセス」Y/N に吸収 |
| L2 計測モダリティ | 新トップ 10 項目 Y/N に吸収 |
| L3-seq 規模分岐 | 新トップ「小規模塩基配列」Y/N に吸収 |
| L4-seq 由来分岐 | 新トップ「メタゲノム関連」と「ゲノム」分岐で吸収 |
| L5-L6 生物カテゴリ | tree に残す（新 L1 相当） |
| L7 データ形式 | tree に残す（新 L2 相当） |

結果として新 tree は **depth 2-3**、中間 node は **5-6 個程度** に減少する。leaf 数は 31 → 33 に微増するが、tree の縦の深さと横の広がりは大幅に縮小する。

### 新 tree の構造

新トップ階層の選択（Section 1）に応じて該当起点配下が active 表示される。

```
[ゲノム] 起点:
  ├─ 真核
  │   ├─ Raw + アセンブリ → leaf-26
  │   ├─ アセンブリのみ → leaf-27
  │   ├─ Haplotype Raw + アセンブリ → leaf-28
  │   ├─ Haplotype アセンブリのみ → leaf-29
  │   ├─ TSA → leaf-23
  │   └─ TPA → leaf-24
  ├─ 原核
  │   ├─ Raw + アセンブリ → leaf-18
  │   └─ アセンブリのみ → leaf-19
  ├─ ウイルス
  │   ├─ Raw + アセンブリ → leaf-21
  │   └─ アセンブリのみ → leaf-22
  ├─ オルガネラ/プラスミド → leaf-16
  └─ メタゲノム
      ├─ MAG/Binned/SAG → leaf-13
      ├─ TLS → leaf-14
      ├─ TSA → leaf-15
      └─ ヒトマイクロバイオーム制限 → m06

[シーケンスリード] 起点:
  ├─ 真核 → leaf-25
  ├─ 原核 → leaf-17
  ├─ ウイルス → leaf-20
  └─ メタゲノム
      ├─ Raw → leaf-11
      └─ Primary → leaf-12

[バリアント解析] 起点:
  → v01（非ヒト） / v02（ヒト非制限） / v03（ヒト制限）

[空間トランスクリプトーム] 起点:
  → s01（非ヒト） / s02（ヒト制限）

[EST 解析] 起点:
  → leaf-30（小規模） / leaf-31（大規模）

[Microarray] 起点:               → leaf-09 (depth 0)
[プロテオミクス] 起点:           → leaf-02 (depth 0)
[メタボロミクス] 起点:           → leaf-03 (depth 0)
[小規模塩基配列] 起点:           → leaf-10 (depth 0)
[ヒト制限公開アクセス] 起点:     → leaf-01 (depth 0)
```

「ゲノム」と「シーケンスリード」を両方選択した場合、Raw + アセンブリ系の leaf（leaf-13 / leaf-18 / leaf-21 / leaf-26 / leaf-28）が強調表示される。

### マルチ選択時の tree 動作

| 状態 | tree 表示 |
|---|---|
| 全項目未選択 | tree 全体を通常表示（俯瞰モード） |
| 単一項目選択 | 該当起点配下の枝のみ active 表示、他は灰色化（folded） |
| 複数項目選択 | 該当枝の OR 合成。複数項目に該当する leaf は強調表示 |
| パンくず連動 | Section 1 の選択 chip + tree 経路をパンくずに反映 |

非該当の枝は**非表示にせず灰色化（folded）**で残すことで、「全体俯瞰したい」要望と「絞り込みたい」要望を両立する。

### 33 leaf 一覧

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
| BP+BS+DRA | BioProject + BioSample + DRA | leaf-11, leaf-17, leaf-20, leaf-25 |
| BP+BS+DRA(Analysis) | BioProject + BioSample + DRA（Analysis のみ） | leaf-12 |
| BP+BS+DRA+MSS | BioProject + BioSample + DRA + MSS | leaf-13, leaf-18, leaf-21, leaf-26 |
| BP+BS+DRA+MSS(TLS/TSA/Haplotype) | 同上、MSS data type 違い | leaf-14, leaf-15, leaf-23, leaf-28 |
| BP+BS+MSS | BioProject + BioSample + MSS | leaf-16, leaf-19, leaf-22, leaf-24, leaf-27, leaf-31 |
| BP+BS+MSS(Haplotype/TPA/EST) | 同上、MSS data type 違い | leaf-24, leaf-29, leaf-31 |

略語は `/submit` と同じ（BP = BioProject、BS = BioSample、DRA = DDBJ Sequence Read Archive、GEA = Genomic Expression Archive、MSS = Mass Submission System、NSSS = Nucleotide Sequence Submission System、JGA = Japanese Genotype-phenotype Archive）。

## Section 4: Detail Panel

### パンくずリスト

新トップ階層の選択（chip）と tree 経路を併記する:

```
[シーケンスリード ☑] [ゲノム ☑]   >   真核   >   Raw + アセンブリ
└─── 新トップ階層の選択（chip） ──┘   └────── tree 経路 ──────┘
```

新トップは複数選択なので chip で並べ、tree 経路を `>` 区切りで表示する。

### 2 段階ドリルダウン

- **概要レベル**: カード or 中間 node 選択時。ユースケース概要・3 層構造（該当時）・登録先分岐テーブル・共通の準備物・主要外部リンク。
- **具体レベル**: leaf 到達時。概要レベルに加えて、登録先・登録順序・具体的な準備物・leaf 固有補足・外部ツール/固有リンクを表示。

### 具体レベルの追加情報（軸補強）

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

### NSSS 制約（leaf-10 / leaf-30 の具体レベル）

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

### 各セクションの常時表示

各セクション（新トップ階層 / Cards / Tree / Detail Panel）は常時表示し、選択 → ハイライトで状態変化させる。詳細パネル展開時に他のセクションが消えないことで、選択した条件の中間経路の可視性を維持する。

## URL 設計

DB ポータル全体の URL 設計方針は `overview.md#url-設計` を参照。

### ページとレンダリング

| URL | 用途 | レンダリング |
|---|---|---|
| `/submit-alt` | 登録ナビゲーション v2 | プリレンダ |

### クエリパラメータ

| パラメータ | 値 | 用途 |
|---|---|---|
| `types` | カンマ区切りのデータ種別 ID | 新トップ階層 Y/N の選択 |
| `human` | `1` または省略 | 横断属性「ヒト由来データ」のフラグ |
| `for` | tree node ID（ケバブケース） | tree node を指定（旧 `/submit` と同じ） |

`types` の値は新トップ階層 10 項目に対応するケバブケース ID:

| 項目 | ID |
|---|---|
| ヒト制限公開アクセス | `human-restricted` |
| シーケンスリード | `sequence-read` |
| ゲノム | `genome` |
| バリアント解析 | `variation` |
| プロテオミクス | `proteomics` |
| EST 解析 | `est` |
| Microarray | `microarray` |
| 空間トランスクリプトーム | `spatial-transcriptomics` |
| メタボロミクス | `metabolomics` |
| 小規模塩基配列 | `small-sequence` |

### URL の組み合わせ

- `/submit-alt`: 初期状態（全セクション未選択）
- `/submit-alt?types=genome,sequence-read`: 新トップ階層で 2 項目選択（該当 leaf 群がハイライト）
- `/submit-alt?types=genome&for=eukaryote-raw-assembly`: 新トップ + 詳細 leaf 到達
- `/submit-alt?for=eukaryote-raw-assembly`: tree 経由で leaf へ直接到達
- `/submit-alt?types=genome&human=1`: ゲノム × ヒト由来

### canonical

`/submit-alt?...` の canonical はすべて `/submit-alt`。全バリエーションは同一コンテンツの断片表示であり、検索インデックスは `/submit-alt` に集約する。

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

UI テキスト（質問文、選択肢、カードタイトル、ボタン等）は `locales/ja.json`, `locales/en.json`。詳細パネル本文は言語別 TSX コンポーネント（例: `MicrobialGenomeDetail.ja.tsx`, `MicrobialGenomeDetail.en.tsx`）。

## 設計上の決定事項

- **新トップ階層**: データ種別 10 項目 + 横断属性「ヒト由来」を Y/N 複数選択。研究者の自己認識ベース。マルチ選択時は登録フローを 4 パターン（同 submission 統合 / BP/BS 共有 + 別 submission / 完全独立 / JGA 一本化）で動的案内する
- **Cards 数**: 9 → 10 枚（空間トランスクリプトームカード新設）
- **leaf 数**: 31 → 33（variant 集約 -1、ヒトマイクロバイオーム制限 +1、空間 Tx +2）
- **variant 集約の方針**: ヒト/非ヒト × 制限/非制限 の 3 区分で集約（v01-v03）。per-sample/aggregate と各登録先の選択は詳細パネル分岐に閉じる
- **空間 Tx leaf 構成**: 非ヒト（s01）と ヒト制限（s02）の 2 leaf。DB-2021 の詳細仕様確認後に統合判断する余地を残す
- **Decision Tree の深さ**: 簡略化するが浅くしすぎない方針。tree の俯瞰価値を残しつつ、不要な中間ノード分岐を Detail Panel に移行
- **詳細パネルの 2 段階ドリルダウン**: 維持。leaf 単位で軸補強情報を表示
- **内部/外部色区分**: 内部 = `emerald-500`、外部 = `amber-500` で一貫
- **画面構成**: 4 セクション縦構成、各セクション常時表示

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
