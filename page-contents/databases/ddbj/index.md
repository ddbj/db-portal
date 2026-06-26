---
title: DDBJ
description: DDBJ はアノテーション付き塩基配列の INSDC データベースです。Web 入力の NSSS と一括登録の MSS の 2 つの窓口を持ち、登録 entry は INSDC で日次共有されます。
---

## DDBJ とは

DDBJ は、INSDC (DDBJ / NCBI GenBank / EBI ENA) を構成するアノテーション付き塩基配列データベースです。登録 entry は flat file 形式に整形され、INSDC 3 機関で日次に交換・公開されます。

塩基配列の登録窓口として 2 系統を用意しています。

| 窓口 | 用途 |
| --- | --- |
| [NSSS](#nsss) (DDBJ Nucleotide Sequence Submission System) | Web フォームから小規模・通常エントリ向けに登録 |
| [MSS](#mss) (Mass Submission System) | FASTA + アノテーション TSV のファイル送付で大規模・全長レプリコン・BioProject/BioSample 連携データを登録 |

シークエンサ生 reads は本データベースでは扱わず、[DRA](/databases/dra) に登録します。

> [!NOTE]
> どちらの窓口を使うべきか分からない場合は [登録ナビ](/submit) でデータ種別を選ぶと案内されます。

## 受け付けるデータ

INSDC の **division** (HUM / PRI / ROD / MAM / VRT / INV / PLN / BCT / VRL / PHG / ENV / SYN) と **data category** の組み合わせで区分されます。MSS submission 時に選択できる data type は次の通りです。

| Data type | 内容 |
| --- | --- |
| WGS | Whole Genome Shotgun (draft genome) |
| GNM | Finished level genome sequence, non-WGS |
| MAG | Metagenome-Assembled Genome |
| SAG | Single Amplified Genome |
| TLS | Targeted Locus Study (16S rRNA など特定 locus を標的とした bulk) |
| HTG | High Throughput Genomic Sequences |
| TSA | Transcriptome Shotgun Assembly |
| HTC | High Throughput cDNA Sequences |
| EST | Expressed Sequence Tags |
| GSS | Genome Survey Sequences |
| TPA | Third Party Data |
| MISC | 上記以外 (オルガネラゲノム単体、プラスミド単体、ウイルス・ファージゲノム単体など) |

NSSS で扱うのは「通常エントリ」(cDNA / ゲノム断片 / 16S rRNA など、レプリコン未満の標準的な配列) のみです。

## MSS

Mass Submission System (MSS) は、比較的大規模な塩基配列データをファイル送付で登録するサービスです。NSSS で対応できない以下のケースを引き受けます。

- **特殊データ種別**: EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA
- **規模**: 1 配列が 500 kb 以上 / 1 配列の Feature が 30 以上 / 合計 100 配列超 のいずれか
- **全長レプリコン**: finished / draft によらず、ゲノム / 染色体 / オルガネラゲノム / ウイルス・ファージゲノム・segment / プラスミド全長
- **BioProject / BioSample 連携必須**: メタゲノム (MAG / SAG)、環境プロファイル、登録予定 / 登録済みの全長規模ゲノムと同一菌株由来の配列、原核生物 16S rRNA 報告など

申込み窓口は <https://mss.ddbj.nig.ac.jp/> です。アップロードはブラウザ、SFTP、もしくは [DFAST](https://dfast.ddbj.nig.ac.jp/) の job ID 指定で行います。10 GB を超える場合は SCP/SFTP を使用します。

### ファイル形式 (MSS)

- **配列ファイル**: FASTA 類似のテキスト。`>` から始まるヘッダ + 塩基配列、エントリ区切りは `//`。エントリ名は半角英数 32 文字以内・ユニークで、space / `"` / `=` / `|` / `>` / `[]` / `\` は使用不可。末端の `n` は除去します。拡張子は `.fasta` / `.seq.fa` / `.fa` / `.fna` / `.seq` のいずれか。
- **アノテーションファイル**: タブ区切り 5 列 (Entry / Feature / Location / Qualifier / Value)。拡張子は `.ann` / `.annt.tsv` / `.ann.txt`。COMMON セクション (SUBMITTER / REFERENCE / DATE / DBLINK など) と各エントリの Biological Features (source / CDS / rRNA / tRNA / ncRNA など) を記載します。Qualifier に `/` プレフィックスは付けません。
- **AGP ファイル**: CON エントリ専用。**新規の CON 登録は受付終了**しています。

> [!WARNING]
> ファイル名にマルチバイト文字 / スペース / バッククォート / `<>` / `()` を含めないでください。電子メール添付での送付は非推奨で、MSS form 経由で upload します。

## NSSS

NSSS (DDBJ Nucleotide Sequence Submission System) は、Web ブラウザでアノテーション付き塩基配列を登録するシステムです。MSS の対象外となる小規模 / 通常エントリ向けの窓口で、初学者にも勧められています。

- 入口: <https://www.ddbj.nig.ac.jp/ddbj/web-submission.html>
- 新規登録開始: <https://ddbj.nig.ac.jp/submission>
- ヘルプ: <https://www.ddbj.nig.ac.jp/ddbj/web-submission-help.html>
- 推奨ブラウザ: Google Chrome / Microsoft Edge / Mozilla Firefox

新規登録専用で、修正・更新は受け付けません (アクセッション取得済みデータの修正は [DDBJ 更新依頼フォーム](https://forms.gle/mcQaJshvAKRdggz16) を使用)。TPA-Exp / TPA-Inf は 2025 年 1 月以降 NSSS では登録できず、TPA:assembly は MSS を使用します。

各ページで Next ボタンをクリック後にブックマークすると、ブックマークから submission を再開できます。

## MSS と NSSS の使い分け

NSSS と MSS は INSDC への登録窓口の振り分けで、最終的な出力先 (INSDC flat file) は同じです。

| 軸 | NSSS が適切 | MSS が適切 |
| --- | --- | --- |
| 種別 | 通常エントリ (cDNA、ゲノム断片、16S rRNA 単発、ベクター配列など) | EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA |
| 規模 | 1 配列 < 500 kb、Feature < 30、合計 < 100 配列 | 1 配列 ≥ 500 kb、Feature ≥ 30、または合計 100 配列超 |
| 完成度 | 単独配列 / 部分配列 | レプリコン全長 (完成ゲノム、染色体、オルガネラ、プラスミド、ウイルス・ファージゲノム / segment) |
| 連携 | BioProject / BioSample 連携は任意 | BioProject / BioSample 連携が必須 (メタゲノム、TPA、同一菌株関連付け、原核生物 16S rRNA 報告など) |

迷う場合は NSSS を優先し、上記いずれかに該当する場合のみ MSS を選びます。

## 登録の流れ

### MSS

1. **DDBJ アカウント作成 / D-way login**。
2. 必要に応じて **BioProject ID** / **BioSample ID** / **locus_tag prefix** を先行取得。
3. **FASTA + アノテーション TSV** を作成 (原核ゲノムは [DFAST](https://dfast.ddbj.nig.ac.jp/) で自動生成可能)。
4. ローカルで **UME / Parser / transChecker** でフォーマットと CDS 翻訳を検証。
5. [MSS form](https://mss.ddbj.nig.ac.jp/) からログインしてファイルを upload → **Mass-ID** (例 `[DDBJ:NSUB000001]`) が発行されメール通知。
6. DDBJ キュレータが INSDC 規範に従い査定 → メールで修正依頼・確認。
7. 確定後、**アクセッション番号**をコンタクトパーソンへメール通知。
8. **公開予定日** (即時または hold) に従い release され、INSDC 全体へ配信。

### NSSS

1. **DDBJ アカウント作成 / D-way login**。
2. ベクター / アダプタ由来の配列を [VecScreen](http://ddbj.nig.ac.jp/vecscreen/) などで除去。
3. <https://ddbj.nig.ac.jp/submission> から **Create new submission** で開始。
4. Web フォームに登録者・REFERENCE・配列・Feature/Qualifier を入力 (Submission ID で中断・再開可)。
5. キュレータ査定 → アクセッション番号をメール通知 → 公開予定日に release。

## 事前準備

- **DDBJ アカウント** (D-way)。SCP/SFTP 転送には公開鍵の登録が必要。
- **コンタクトパーソン情報** (氏名 / 所属 / 住所 / 電話)。連絡途絶を避けるため複数名 (実作業者 + 研究指導者) を強く推奨します。
- ゲノム規模・メタゲノム・TPA など連携必須ケースは [BioProject ID](/databases/bioproject) と [BioSample ID](/databases/biosample) を事前取得。
- アノテーションに `locus_tag` を含める場合、BioSample 登録時に **locus_tag prefix** を予約 (取得後の変更不可)。
- **公開予定日** (即時公開 / hold) を決定。
- MSS のローカル検証ツール:
  - **UME** (フォーマット + CDS 翻訳、Windows / Linux / macOS)
  - **Parser** (フォーマット、Linux)
  - **transChecker** (CDS 翻訳、Linux)

> [!IMPORTANT]
> MSS で同一 Submission にまとめられるのは「コンタクトパーソン / データ種別 / 公開予定日」が同一の場合のみです。条件が異なるデータは別 Submission に分けてください。

## アクセッション番号

| 区分 | 書式 | 例 |
| --- | --- | --- |
| 単一エントリ (旧書式) | アルファベット 1 + 数字 5 | `A12345` |
| 単一エントリ (conventional) | アルファベット 2 + 数字 6 | `AB123456` |
| 単一エントリ (拡張) | アルファベット 2 + 数字 8 | `AB12345678` |
| WGS / TSA / TLS | アルファベット 4 + 数字 8〜10 | `BAAA01000000` (master) / `BAAA01000001`〜 (contig) |
| WGS / TSA / TLS (新書式) | アルファベット 6 + 数字 9〜11 | `ABCDEF010123456` |
| MGA | アルファベット 5 + 数字 7+ | `ABCDE1234567` |
| protein_id | アルファベット 3 + 数字 5 または 7 | `ABC12345` / `ABC1234567` |
| BioProject | `PRJDB` + 数字 | `PRJDB12345` |
| BioSample | `SAMD` + 数字 8 桁 | `SAMD00000001` |

登録中の識別子は **Mass-ID** (例 `[DDBJ:NSUB000001]`)、NSSS では **Submission ID** で、確定後のアクセッション番号はキュレーション完了時にコンタクトパーソンへメール通知されます。

## メタゲノム (MAG / SAG)

メタゲノム由来データは [ENV division](https://www.ddbj.nig.ac.jp/ddbj/env.html) にゲノムエントリとして登録します。BioProject / BioSample の事前登録と、INSDC で定められた qualifier の付与が必須で、登録窓口は MSS です。

### MAG (Metagenome-Assembled Genome)

- BioSample は **MIMAG** パッケージを選択し、`uncultured` を冠さない MAG 由来生物名を記入。`metagenome_source` 属性 (例 `soil metagenome`) と `derived_from` で由来メタゲノムサンプルを参照。
- source feature に `/metagenome_source`、`/environmental_sample`、`/isolation_source`、`/isolate`、`/organism`、`/mol_type="genomic DNA"` が必須。
- `/strain` は使用不可。宿主情報は `/host` に書きます。
- `/organism` に `metagenome` や `uncultured` を含む生物名は不可。
- ST_COMMENT に **Assembly Method** / **Genome Coverage** / **Sequencing Technology** (真核なら **Assembly Name** も) を記載。

### SAG (Single Amplified Genome)

- BioSample は **MISAG** パッケージを選択。
- source feature に `/note="single amplified genome"`、`/isolation_source` が必須。
- 複数細胞の co-assembly は `/note` に明記し、BioSample の `derived_from` で結合元サンプルを参照。

## ハプロタイプ assembly

二倍体ゲノムを Principal / Alternate の 2 ハプロタイプに分けて登録する場合、以下の 3 層構造を取ります。

| 層 | 役割 |
| --- | --- |
| Principal BioProject | 主ハプロタイプの登録単位 |
| Alternate BioProject | 副ハプロタイプの登録単位 |
| Umbrella BioProject | 上記 2 つを束ねる親プロジェクト |

- ST_COMMENT に `Diploid :: Principal haplotype` または `Diploid :: Alternate haplotype` を記載します。
- BioSample は両ハプロタイプで共通のものを参照します (パッケージは MIGS)。
- 区別名は Principal/Alternate、Haplotype 1/2、Maternal/Paternal のいずれかを登録者が選択します。
- [Umbrella BioProject](/databases/bioproject#umbrella-bioproject) には [DRA](/databases/dra) の生 reads プロジェクトも束ねることができます。

## TPA (Third Party Annotation)

TPA は他者が公開済みのプライマリエントリに対し、第三者がアセンブルまたは (再)アノテーションを行ったデータです。登録窓口は MSS のみで、NSSS では扱えません。

> [!WARNING]
> 2025 年 1 月以降、DDBJ が受け付けるのは **TPA:assembly のみ** です。TPA:experimental / TPA:inferential / TPA:specialist_db の新規登録は休止しています。

主な制約:

- プライマリエントリが INSDC に登録済みであること (TPA 登録時点で非公開でも、TPA 公開時には取得可能であること)。
- アセンブル配列の生成が **peer-reviewed journal** での peer-review 対象であること。
- TPA とプライマリ配列の不一致は **5 % 以内**。
- 引用元プライマリが存在しない領域 (gap) は **50 bp 以下**。
- 全長規模アセンブル (TPA-WGS など) では BioProject / BioSample 登録が必須。

## 関連リソース

### 公式ドキュメント

- DDBJ MSS: <https://www.ddbj.nig.ac.jp/ddbj/mss.html>
- DDBJ NSSS: <https://www.ddbj.nig.ac.jp/ddbj/web-submission.html>
- 塩基配列の登録 (submission top): <https://www.ddbj.nig.ac.jp/ddbj/submission.html>
- 登録ファイル形式 (FASTA + annotation TSV): <https://www.ddbj.nig.ac.jp/ddbj/file-format.html>
- データの種類: <https://www.ddbj.nig.ac.jp/ddbj/data-categories.html>
- INSDC accession numbers: <https://www.ddbj.nig.ac.jp/insdc/accessions.html>

### サブトピック別ガイド

- Metagenome assembly (MAG): <https://www.ddbj.nig.ac.jp/ddbj/metagenome-assembly.html>
- Single Amplified Genome (SAG): <https://www.ddbj.nig.ac.jp/ddbj/single-amplified-genome.html>
- Haplotype assembly: <https://www.ddbj.nig.ac.jp/ddbj/haplotype.html>
- TPA: <https://www.ddbj.nig.ac.jp/ddbj/tpa.html>
- Finished level genome: <https://www.ddbj.nig.ac.jp/ddbj/finished_level_genome.html>

### ツール

- UME (フォーマット + CDS 翻訳チェック): <https://www.ddbj.nig.ac.jp/ddbj/ume.html>
- Parser (フォーマット): <https://www.ddbj.nig.ac.jp/ddbj/parser.html>
- transChecker (CDS 翻訳): <https://www.ddbj.nig.ac.jp/ddbj/transchecker.html>
- DFAST (原核ゲノム自動アノテーション): <https://dfast.ddbj.nig.ac.jp/>

### 関連サービス

- [BioProject](/databases/bioproject) - プロジェクト登録 ([Umbrella BioProject](/databases/bioproject#umbrella-bioproject))
- [BioSample](/databases/biosample) - サンプル情報登録
- [DRA](/databases/dra) - NGS raw reads 登録
