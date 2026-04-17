# 詳細パネル記述内容

登録ナビゲーション（`/submit`）の Detail Panel に表示する記述内容を定義する。ページ構成・Tree 分岐・URL 設計は [submit.md](./submit.md) を参照。

## テンプレート設計

Detail Panel の情報は 3 層で管理する。

### 3 層構造

| 層 | 単位 | 数 | 内容 | 表示タイミング |
|---|---|---|---|---|
| 概要レベル | カード | 9 | 概要文、3 層構造（該当時）、登録先分岐テーブル（leaf ナビ付き）、共通リンク | カード選択時（中間 node） |
| goal テンプレート | goal パターン | 6 | 登録の流れ（登録順序、各 DB の役割）、基本準備物、共通リンク | leaf 到達時（具体レベル） |
| leaf 差分 | leaf | 31 | BioSample パッケージ、MSS data type、固有ツール、固有補足、固有リンク | leaf 到達時（具体レベル） |

- **中間 node 選択時**: 概要レベルのみ表示
- **leaf 到達時**: 概要レベル + goal テンプレート（該当 goal） + leaf 差分（該当 leaf）を結合して表示

### goal テンプレート（6 パターン）

同一 goal を共有する leaf は「登録の流れ」「基本準備物」が共通。goal を 6 パターンに集約する。

| パターン | 該当 goal | 登録の流れ | 基本準備物 |
|---|---|---|---|
| **ゲノム系** | BP+BS+DRA+MSS, BP+BS+MSS, BP+BS+DRA, BP+BS+DRA(Analysis), BP+BS+DRA+MSS(Haplotype), BP+BS+MSS(Haplotype) | BioProject → BioSample → DRA → MSS（±DRA、±MSS を差分管理） | DDBJ Account, 公開鍵, 配列ファイル(FASTA), アノテーション(タブ区切り), NGS 生データ(FASTQ/BAM), MD5 |
| **GEA 系** | BP+BS+DRA+GEA, BP+BS+GEA | BioProject → BioSample → DRA → GEA（マイクロアレイは DRA なし） | DDBJ Account, 公開鍵, 解析済みデータ, 生データ(アレイ), MD5 |
| **NSSS** | NSSS | NSSS ログイン → Web フォーム入力 → 査定 | DDBJ Account, 塩基配列データ, アノテーション情報 |
| **MetaboBank 系** | BP+BS+MetaboBank | BioProject → BioSample → MetaboBank | DDBJ Account, 公開鍵, メタデータエクセル(IDF+SDRF), 生データ, 解析済みデータ, MAF, MD5 |
| **JGA 系** | JGA | DBCLS 提供申請 → JGA チーム案内 → メタデータ XML + データアップロード | DDBJ Account, DBCLS 提供承認, データファイル(BAM/FASTQ/VCF 等), JGA XML メタデータ |
| **外部** | jPOST, JVar SNP, JVar SV, EVA, dgVa | ポータルでは案内しない（外部リンクで誘導） | - |

### leaf 差分のカテゴリ

leaf ごとに goal テンプレートに追加される情報。以下のカテゴリで管理する。

| カテゴリ | 説明 |
|---|---|
| BioSample パッケージ | Microbe / MIGS / MIMAG / MISAG / Plant / Animal / Omics 等 |
| MSS data type | GNM / WGS / HTG / MAG / SAG / TLS / TSA / EST / TPA / MISC |
| BioProject 構成 | umbrella + Principal + Alternate（Haplotype 特有） |
| アノテーション方針 | DFAST 利用可 / 手動 / パイプライン依存 |
| 特殊 qualifier | metagenome_source / derived_from / environmental_sample 等 |
| 生物種詳細 | 動物/植物/菌類の BioSample パッケージ・qualifier 違い |
| アセンブリ完成度 | Finished(GNM) / Draft(WGS) / HTG(Phase 0/1/2) の MSS data type 選択 |
| 固有ツール | DFAST / DFAST_VRL 等 |
| 外部連携 | GISAID / Japan COVID-19 Open Data Consortium 等 |
| peer-reviewed 要件 | 論文発表必須（TPA 特有） |

## 記述方針

- 各パネルは「見出し構成 + 要点」のアウトラインで定義する。実際の文言は TSX コンポーネントで書く
- 記述深度はカードごとに調整する（ゲノム系は最も詳しく、外部リダイレクト系は概要 + 外部リンク中心）
- 内部用語（MSS / NSSS / WGS / HTG 等）は補足に留め、研究者の動機起点で表現する
- 原典は ddbj/www（`~/git/github.com/ddbj/www/`）。文言はそのまま流用しないが、情報は踏襲する

---

## 1. 微生物ゲノム

原典: `_ddbj/genome.md`, `_ddbj/mss.md`, `_dra/submission.md`, `_bioproject/submission.md`, `_biosample/submission.md`

### 概要

- 対象: 原核生物（細菌・古細菌）、ウイルス、ファージ、オルガネラ、プラスミド
- ゲノム登録は単一の行為ではなく、3 層のデータ（メタデータ / 生リード / アセンブリ配列）を登録する統合プロセスであることを明示する
- 原核生物ゲノムのアノテーションには DFAST（自動アノテーションパイプライン）が利用可能であることに触れる

### 登録先の組み合わせ

| 持っているデータ | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| 生リード + アセンブリ（原核） | `prokaryote-raw-assembly` | ゲノム系 | BP+BS+DRA+MSS |
| 生リード + アセンブリ（ウイルス） | `virus-raw-assembly` | ゲノム系 | BP+BS+DRA+MSS |
| 生リードのみ（原核） | `prokaryote-raw` | ゲノム系 | BP+BS+DRA |
| 生リードのみ（ウイルス） | `virus-raw` | ゲノム系 | BP+BS+DRA |
| アセンブリのみ（原核） | `prokaryote-assembly-only` | ゲノム系 | BP+BS+MSS |
| アセンブリのみ（ウイルス） | `virus-assembly-only` | ゲノム系 | BP+BS+MSS |
| オルガネラ / プラスミド | `organelle-plasmid` | ゲノム系 | BP+BS+MSS |

### leaf 差分

| leaf ID | BioSample パッケージ | MSS data type | 固有ツール | 固有補足 |
|---|---|---|---|---|
| `prokaryote-raw` | Microbe | - | - | - |
| `prokaryote-raw-assembly` | Microbe | GNM or WGS | DFAST | Finished/Draft で data type 選択 |
| `prokaryote-assembly-only` | Microbe | GNM or WGS | DFAST | Finished/Draft で data type 選択 |
| `virus-raw` | Virus | - | - | - |
| `virus-raw-assembly` | Virus | GNM / MISC | DFAST_VRL (SARS-CoV-2) | segment 対応; GISAID 連携 |
| `virus-assembly-only` | Virus | GNM / MISC | DFAST_VRL (SARS-CoV-2) | segment 対応; GISAID 連携 |
| `organelle-plasmid` | - | GNM | - | 染色体ゲノムとは別エントリ; BP/BS は染色体ゲノムと共有可 |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| D-way | https://ddbj.nig.ac.jp/D-way | BioProject / BioSample / DRA の登録 |
| MSS フォーム | https://mss.ddbj.nig.ac.jp/ | MSS 登録の申し込み |
| DFAST | https://dfast.ddbj.nig.ac.jp/ | 原核生物ゲノムの自動アノテーション |
| Genome Project のデータ登録 | https://www.ddbj.nig.ac.jp/ddbj/genome.html | ゲノム配列登録の詳細 |
| MSS の登録手順 | https://www.ddbj.nig.ac.jp/ddbj/mss.html | MSS 経由の登録手順 |
| DRA 登録 | https://www.ddbj.nig.ac.jp/dra/submission.html | DRA の登録手順 |
| BioProject 登録 | https://www.ddbj.nig.ac.jp/bioproject/submission.html | BioProject の登録手順 |
| BioSample 登録 | https://www.ddbj.nig.ac.jp/biosample/submission.html | BioSample の登録手順 |
| データのアップロード | https://www.ddbj.nig.ac.jp/upload.html | SFTP/SCP アップロード方法 |
| MSS チェックツール | https://www.ddbj.nig.ac.jp/ddbj/mss-tool.html | UME / Parser / transChecker |

---

## 2. 真核生物ゲノム

原典: `_ddbj/genome.md`, `_ddbj/transcriptome.md`, `_ddbj/haplotype.md`, `_ddbj/mss.md`

### 概要

- 対象: 動物・植物・菌類のゲノム配列、転写産物配列（TSA / EST）
- 微生物ゲノムと同じ 3 層構造（メタデータ / 生リード / アセンブリ）だが、アノテーションは手動またはパイプライン依存（DFAST は原核生物専用のため使えない）
- Haplotype（二倍体ゲノムの Principal / Alternate 区別）の特殊な BioProject 構成に触れる
- 転写産物配列（TSA: de novo transcriptome assembly）もこのカードで案内する

### 登録先の組み合わせ

| 持っているデータ | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| 生リード + ゲノムアセンブリ | `eukaryote-raw-assembly` | ゲノム系 | BP+BS+DRA+MSS |
| 生リードのみ | `eukaryote-raw` | ゲノム系 | BP+BS+DRA |
| ゲノムアセンブリのみ | `eukaryote-assembly-only` | ゲノム系 | BP+BS+MSS |
| Haplotype（生リード + アセンブリ） | `eukaryote-haplotype-raw-assembly` | ゲノム系 | BP+BS+DRA+MSS (Haplotype) |
| Haplotype（アセンブリのみ） | `eukaryote-haplotype-assembly-only` | ゲノム系 | BP+BS+MSS (Haplotype) |
| 転写産物アセンブリ（de novo） | `eukaryote-tsa` | ゲノム系 | BP+BS+DRA+MSS (TSA) |
| 第三者アノテーション | `eukaryote-tpa` | ゲノム系 | BP+BS+MSS (TPA) |
| 単発 cDNA（小規模 < 100 配列） | `eukaryote-est-small` | NSSS | NSSS |
| 単発 cDNA（大規模） | `eukaryote-est-large` | ゲノム系 | BP+BS+MSS (EST) |

### leaf 差分

| leaf ID | BioSample パッケージ | MSS data type | 固有補足 |
|---|---|---|---|
| `eukaryote-raw` | MIGS | - | - |
| `eukaryote-raw-assembly` | MIGS | GNM / WGS / HTG | 動物/植物/菌類で BioSample パッケージ・qualifier 分岐; Finished/Draft/HTG で data type 選択; locus_tag prefix 必須; Assembly Name 必須 |
| `eukaryote-assembly-only` | MIGS | GNM / WGS / HTG | 同上 |
| `eukaryote-haplotype-raw-assembly` | MIGS | GNM / WGS | BioProject: umbrella + Principal + Alternate の 3 つ; BioSample 共通; locus_tag prefix 共通（prefix/suffix で Haplotype 区別） |
| `eukaryote-haplotype-assembly-only` | MIGS | GNM / WGS | 同上 |
| `eukaryote-tsa` | MIGS | TSA | DRA 必須; biological feature は source + assembly_gap のみ基本 |
| `eukaryote-tpa` | - | TPA | peer-reviewed 発表必須; assembly / specialist_db のみ継続 |
| `eukaryote-est-small` | - | - | NSSS 経由; biological feature は source のみ |
| `eukaryote-est-large` | MIGS | EST | MSS 経由; biological feature は source のみ |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| D-way | https://ddbj.nig.ac.jp/D-way | BioProject / BioSample / DRA の登録 |
| MSS フォーム | https://mss.ddbj.nig.ac.jp/ | MSS 登録の申し込み |
| Genome Project のデータ登録 | https://www.ddbj.nig.ac.jp/ddbj/genome.html | ゲノム配列登録の詳細 |
| Transcriptome Project のデータ登録 | https://www.ddbj.nig.ac.jp/ddbj/transcriptome.html | 転写産物配列登録の詳細 |
| Haplotype | https://www.ddbj.nig.ac.jp/ddbj/haplotype.html | Haplotype 登録の詳細 |
| MSS の登録手順 | https://www.ddbj.nig.ac.jp/ddbj/mss.html | MSS 経由の登録手順 |
| DRA 登録 | https://www.ddbj.nig.ac.jp/dra/submission.html | DRA の登録手順 |
| データのアップロード | https://www.ddbj.nig.ac.jp/upload.html | SFTP/SCP アップロード方法 |

---

## 3. メタゲノム / MAG / SAG

原典: `_ddbj/metagenome-assembly.md`, `_ddbj/single-amplified-genome.md`, `_dra/submission.md`

### 概要

- 対象: 環境サンプル由来の配列（メタゲノム）、単一細胞ゲノム（SAG）、メタトランスクリプトーム
- メタゲノムプロジェクトは解析段階に応じて 4 区分: (1) 生リード → (2) プライマリーメタゲノム（未同定コンティグ）→ (3) Binned メタゲノム（分類群に帰属）→ (4) MAG（最高品質アセンブリ）
- BioSample が複雑: メタゲノムサンプル（環境由来）と仮想的な MAG/Binned サンプル（派生サンプル）を別々に登録する

### 登録先の組み合わせ

| 持っているデータ | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| 生リードのみ | `metagenome-raw` | ゲノム系 | BP+BS+DRA |
| 未同定コンティグ（Primary） | `metagenome-primary` | ゲノム系 | BP+BS+DRA (Analysis) |
| ゲノムビン（MAG / Binned / SAG） | `metagenome-genome-bin` | ゲノム系 | BP+BS+DRA+MSS |
| OTU プロファイル（TLS） | `metagenome-tls` | ゲノム系 | BP+BS+DRA+MSS (TLS) |
| メタトランスクリプトーム | `metagenome-tsa` | ゲノム系 | BP+BS+DRA+MSS (TSA) |

### leaf 差分

| leaf ID | BioSample パッケージ | MSS data type | 固有補足 |
|---|---|---|---|
| `metagenome-raw` | MIMS.me（環境サンプル） | - | 生物名: "xyz metagenome" |
| `metagenome-primary` | MIMS.me（環境サンプル） | - | DRA Analysis のみ（MSS 不要）; Analysis は ENA/NCBI と共有されない |
| `metagenome-genome-bin` | MIMAG(MAG) / MIGS(Binned) / MISAG(SAG) | MAG / WGS / SAG | MAG/Binned/SAG で BioSample パッケージ・data type 分岐; metagenome_source + derived_from 必須; MAG 品質指標（completeness, contamination）; GTDB 生物名変換 |
| `metagenome-tls` | MIMS.me | TLS | 16S rRNA 等の特定 locus を標的とした OTU 解析 |
| `metagenome-tsa` | MIMS.me | TSA | メタゲノム由来の転写産物アセンブリ; 真核 TSA と同じ登録先 |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| D-way | https://ddbj.nig.ac.jp/D-way | BioProject / BioSample / DRA の登録 |
| MSS フォーム | https://mss.ddbj.nig.ac.jp/ | MSS 登録の申し込み |
| メタゲノムアセンブリ | https://www.ddbj.nig.ac.jp/ddbj/metagenome-assembly.html | MAG / Binned 登録の詳細 |
| Single amplified genome | https://www.ddbj.nig.ac.jp/ddbj/single-amplified-genome.html | SAG 登録の詳細 |
| DRA 登録 | https://www.ddbj.nig.ac.jp/dra/submission.html | DRA の登録手順 |
| データのアップロード | https://www.ddbj.nig.ac.jp/upload.html | SFTP/SCP アップロード方法 |

---

## 4. 遺伝子発現（RNA-seq・アレイ）

原典: `_gea/submit-sequence.md`, `_gea/submit-array.md`, `_dra/submission.md`

### 概要

- 対象: 遺伝子発現プロファイリング（NGS ベースの RNA-seq、マイクロアレイ）
- GEA（Genomic Expression Archive）が発現データの登録先。主要科学雑誌は解析済みデータの GEO/ArrayExpress/GEA への登録を義務付けている
- 転写産物配列そのもの（TSA / EST）の登録は真核生物ゲノム / メタゲノムカードで案内する（このカードでは扱わない）

### 登録先の組み合わせ

| 計測手法 | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| NGS による RNA-seq | `expression-ngs` | GEA 系 | BP+BS+DRA+GEA |
| マイクロアレイ | `expression-array` | GEA 系 | BP+BS+GEA |

### leaf 差分

| leaf ID | 固有補足 |
|---|---|
| `expression-ngs` | GEA から DRA Submission を参照; single-cell RNA-seq は別ガイドあり |
| `expression-array` | DRA 不要; 生データ必須; Array Design アクセッション番号が必要; two-color は dual-channel のみ; Submission あたり Assay 数 1,000 件上限 |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| D-way | https://ddbj.nig.ac.jp/D-way | BioProject / BioSample / DRA / GEA の登録 |
| GEA シークエンスデータの登録 | https://www.ddbj.nig.ac.jp/gea/submit-sequence.html | GEA（NGS）登録手順 |
| GEA マイクロアレイデータの登録 | https://www.ddbj.nig.ac.jp/gea/submit-array.html | GEA（マイクロアレイ）登録手順 |
| DRA 登録 | https://www.ddbj.nig.ac.jp/dra/submission.html | DRA の登録手順 |
| Single-cell submission guide | https://www.ddbj.nig.ac.jp/gea/single-cell.html | single-cell RNA-seq の登録 |
| データのアップロード | https://www.ddbj.nig.ac.jp/upload.html | SFTP/SCP アップロード方法 |

---

## 5. 変異データ

原典: なし（外部リダイレクト系）。submit.md の Tree 分岐仕様を参照。

### 概要

- 対象: SNP / SV（構造変異）の登録
- DDBJ センター自体は変異データの登録を受け付けていない。ヒト / 非ヒト、SNP / SV の組み合わせに応じて外部サービスへ誘導する
- Callout で「外部サイトへ遷移します」を明示する

### 登録先の組み合わせ

| データ種別 | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| ヒト SNP / Indel（50 bp 以下） | `variation-human-snp` | 外部 | JVar SNP |
| ヒト SV（50 bp 超、構造変異） | `variation-human-sv` | 外部 | JVar SV |
| 非ヒト SNP / Indel | `variation-nonhuman-snp` | 外部 | EVA（EBI） |
| 非ヒト SV | `variation-nonhuman-sv` | 外部 | dgVa（EBI） |

### leaf 差分

外部リダイレクト系のため leaf 差分は最小。各 leaf は外部サービスの概要 1-2 文 + 外部リンクのみ。

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| JVar | https://www.ddbj.nig.ac.jp/jvar/index.html | ヒト変異データ（SNP / SV） |
| EVA | https://www.ebi.ac.uk/eva/ | 非ヒト SNP / Indel |
| dgVa | https://www.ebi.ac.uk/dgva/ | 非ヒト SV |

---

## 6. プロテオミクス

原典: なし（外部リダイレクト系）。submit.md の Tree 分岐仕様を参照。

### 概要

- 対象: タンパク質質量分析データ（LC-MS/MS、プロテオーム解析）
- DDBJ センター自体はプロテオミクスデータの登録を受け付けていない。jPOST に誘導する
- Callout で「外部サイトへ遷移します」を明示する

### 登録先の組み合わせ

| データ種別 | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| すべてのプロテオミクスデータ | `proteomics` | 外部 | jPOST |

### leaf 差分

外部リダイレクト系のため leaf 差分なし。jPOST は ProteomeXchange コンソーシアムの一員であり、登録データは PRIDE / MassIVE / iProX と相互参照される旨を概要で言及。

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| jPOST | https://jpostdb.org/ | プロテオミクスデータの登録・公開 |
| jPOST 登録ガイド | https://jpostdb.org/help/ | 登録手順の詳細 |

---

## 7. メタボロミクス

原典: `_metabobank/submission.md`

### 概要

- 対象: メタボロミクスデータ（LC-MS、GC-MS 等）
- MetaboBank に登録する。BioProject / BioSample と連携している
- メタデータはエクセル（IDF + SDRF 形式）、解析済みデータは MAF（Metabolite Assignment File）で登録する

### 登録先の組み合わせ

| データ種別 | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| メタボロミクスデータ | `metabolomics` | MetaboBank 系 | BP+BS+MetaboBank |

### leaf 差分

| leaf ID | BioSample パッケージ | 固有補足 |
|---|---|---|
| `metabolomics` | Omics | 非生物サンプルは NCBI Taxonomy metagenomes から選択; Study 分割（実験デザインが異なる場合）; EBI MetaboLights との交換は未実施 |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| MetaboBank 登録申し込み | https://docs.google.com/forms/d/1yrBo95x5leK9aEZImzT6Y5iVyzgwELCgFZtTU9paguU | 登録申し込みフォーム |
| MetaboBank 登録 | https://www.ddbj.nig.ac.jp/metabobank/submission.html | 登録手順の詳細 |
| BioProject 登録 | https://www.ddbj.nig.ac.jp/bioproject/submission.html | BioProject の登録手順 |
| BioSample 登録 | https://www.ddbj.nig.ac.jp/biosample/submission.html | BioSample の登録手順 |
| データのアップロード | https://www.ddbj.nig.ac.jp/upload.html | SFTP/SCP アップロード方法 |

---

## 8. 小規模塩基配列・PCR 産物

原典: `_ddbj/web-submission.md`, `submission.md`

### 概要

- 対象: 100 配列未満、500 kb 未満の小規模な塩基配列（16S rRNA、遺伝子クローン、論文 Figure 用配列等）
- NSSS（Nucleotide Sequence Submission System）で登録する。Web フォーム入力による簡便な登録システム
- BioProject / BioSample の登録は不要
- 大規模データ（100 配列超、500 kb 超、特殊種別）は MSS を使う旨を案内する

### 登録先の組み合わせ

| データ種別 | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| 小規模塩基配列 | `small-sequence` | NSSS | NSSS |

### leaf 差分

| leaf ID | 固有補足 |
|---|---|
| `small-sequence` | NSSS で登録できないデータ（EST/TSA/HTC/GSS/HTG/WGS/TLS/TPA、500 kb 以上、Feature 30 個以上、100 配列超）は MSS を案内; レプリコン全長規模は MSS; DBLINK が必要な場合は MSS; データ更新は DDBJ 更新依頼フォーム |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| NSSS（新規登録開始） | https://ddbj.nig.ac.jp/submission | NSSS での登録開始 |
| NSSS ヘルプ | https://www.ddbj.nig.ac.jp/ddbj/web-submission-help.html | 入力ガイド |
| 塩基配列の登録の前に | https://www.ddbj.nig.ac.jp/ddbj/submission.html | 登録前の準備 |
| MSS の登録手順 | https://www.ddbj.nig.ac.jp/ddbj/mss.html | 大規模データの場合 |
| VecScreen | http://ddbj.nig.ac.jp/vecscreen/ | ベクター配列の確認 |

---

## 9. ヒト制限アクセス

原典: `_jga/submission.md`

### 概要

- 対象: アクセス制限が必要な個人レベルの遺伝学的データ（GWAS 生データ、臨床ゲノム等）
- JGA（Japanese Genotype-phenotype Archive）に登録する
- **DBCLS（NBDC）への提供申請・承認が前提条件**。DBCLS で承認された連絡を JGA が受けた後に登録手順を案内する
- 制限公開（データ利用に DBCLS 承認が必要）と、論文公表までの一時的な非公開は異なる概念であることを明示する

### 登録先の組み合わせ

| データ種別 | leaf ID | goal テンプレート | 登録先 |
|---|---|---|---|
| 全てのヒト制限アクセスデータ | `human-restricted` | JGA 系 | JGA |

JGA は多様なデータ形式に対応: NGS（BAM / FASTQ）、アレイ（genotyping / SNP / 発現 / メチル化）、変異（VCF）、メタボロミクス、プロテオミクス等。

### leaf 差分

| leaf ID | 固有補足 |
|---|---|
| `human-restricted` | 論文引用は JGAS 番号推奨; VCF 等の解析データは Analysis に登録推奨; JGA Submission 単位で公開（公開時期が異なるデータは分割）; Reviewer access は JGA チームに連絡 |

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| DBCLS（NBDC ヒトデータベース） | https://humandbs.dbcls.jp/ | データ提供申請 |
| JGA 登録 | https://www.ddbj.nig.ac.jp/jga/submission.html | JGA 登録手順の詳細 |
| ヒトを対象とした研究データの登録について | https://www.ddbj.nig.ac.jp/policies.html#submission-of-human-data | ポリシー |
