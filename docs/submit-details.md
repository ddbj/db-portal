# 詳細パネル記述内容

登録ナビゲーション（`/submit`）の Detail Panel に表示する詳細パネルの記述内容を定義する。ページ構成・フロー分岐・URL 設計は [submit.md](./submit.md) を参照。

## 記述方針

- 各パネルは「見出し構成 + 要点」のアウトラインで定義する。実際の文言は TSX コンポーネントで書く
- 記述深度はカードごとに調整する（ゲノム系は最も詳しく、外部リダイレクト系は概要 + 外部リンク中心）
- 内部用語（MSS / NSSS / WGS / HTG 等）は補足に留め、研究者の動機起点で表現する
- 原典は ddbj/www（`~/git/github.com/ddbj/www/`）。文言はそのまま流用しないが、情報は踏襲する

## パネル共通構造

各パネルは以下の構造を持つ。

1. **概要**: ユースケースの説明（1-2 段落）
2. **登録先の組み合わせ**: 持っているデータに応じた登録先の分岐（テーブル）
3. **登録の流れ**: 各 DB の役割と登録ステップの概要
4. **準備物**: 登録に必要なアカウント・ファイル・ID 等
5. **補足**: 特殊ケース、注意事項（カードによっては省略）
6. **リンク**: 既存システムへのリンク、ddbj.nig.ac.jp の参考資料

---

## 1. 微生物ゲノム

原典: `_ddbj/genome.md`, `_ddbj/mss.md`, `_dra/submission.md`, `_bioproject/submission.md`, `_biosample/submission.md`

### 概要

- 対象: 原核生物（細菌・古細菌）、ウイルス、ファージ、オルガネラ、プラスミド
- ゲノム登録は単一の行為ではなく、3 層のデータ（メタデータ / 生リード / アセンブリ配列）を登録する統合プロセスであることを明示する
- 原核生物ゲノムのアノテーションには DFAST（自動アノテーションパイプライン）が利用可能であることに触れる

### 登録先の組み合わせ

| 持っているデータ | 登録先 | 補足 |
|---|---|---|
| 生リード + アセンブリ配列 | BioProject + BioSample + DRA + DDBJ (Trad)（MSS 経由） | 最も一般的なゲノム登録パターン |
| 生リードのみ | BioProject + BioSample + DRA | アセンブリが未完了の場合 |
| アセンブリ配列のみ | BioProject + BioSample + DDBJ (Trad)（MSS 経由） | 既存の生リードを参照する場合など |
| 小規模（100 配列未満・500 kb 未満） | DDBJ (Trad)（NSSS 経由） | BioProject / BioSample 不要 |

### 登録の流れ

3 層構造を軸に説明する。

```
Layer 1: メタデータ  → BioProject + BioSample（D-way で登録）
Layer 2: 生リード    → DRA（D-way で登録、データは SFTP/SCP でアップロード）
Layer 3: アセンブリ  → DDBJ (Trad)（MSS フォームで登録）
```

各 DB の役割:

- **BioProject**: 研究プロジェクトの登録。プロジェクトの目的・対象生物種などのメタデータを管理する
- **BioSample**: 生物学的な試料（サンプル）の登録。サンプルの属性（生物種、採取場所、培養条件等）を管理する。Microbe パッケージを使用
- **DRA**: NGS 生リードの登録。Experiment（実験条件）と Run（データファイル）を登録する
- **DDBJ (Trad) / MSS**: アセンブリ配列の登録。配列ファイル（FASTA）+ アノテーションファイルを MSS フォーム経由で送付し、DDBJ キュレーターの査定を受ける

登録順序: BioProject → BioSample（locus_tag prefix 取得含む）→ DRA / MSS（並行可能）

### 準備物

- **DDBJ Account**: D-way / MSS フォームへのログインに必要
- **公開鍵**: SCP/SFTP でのデータアップロードに必要（DRA の大容量データ、MSS の大容量ファイル送付時）
- **配列ファイル（FASTA 形式）**: アセンブリ配列
- **アノテーションファイル（タブ区切り）**: Feature / Qualifier 情報。原核生物ゲノムは DFAST で自動生成可能
- **NGS 生データファイル**: FASTQ / BAM 等（DRA 登録時）
- **MD5 チェックサム**: データファイルの整合性検証用（DRA 登録時）

### 補足

- **ウイルス / ファージ**: ゲノムが小規模で Finished level に到達しやすい。segment 対応が必要な場合がある。BioProject / BioSample は不要（MISC 区分で登録）
- **オルガネラ / プラスミド**: 染色体ゲノムとは別エントリとして登録する（WGS には含めない）。BioProject / BioSample は単体では不要だが、染色体ゲノムと同一菌株なら同一 BioProject / BioSample を共有する
- **DFAST（原核生物ゲノム）**: DDBJ Fast Annotation and Submission Tool。原核生物ゲノムの自動アノテーションパイプライン。DFAST で解析 → MSS 登録ファイルを自動生成 → MSS フォームから投入、の流れを推奨
- **SARS-CoV-2**: DFAST_VRL（ウイルス向け DFAST）が利用可能
- **アセンブリレベル**: WGS（ドラフト）/ HTG（BAC/YAC クローンのドラフト）/ Finished level（染色体全長相当）で MSS の登録区分が変わる

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

| 持っているデータ | 登録先 | 補足 |
|---|---|---|
| 生リード + ゲノムアセンブリ | BioProject + BioSample + DRA + DDBJ (Trad)（MSS 経由） | WGS / HTG / Finished level |
| 生リードのみ | BioProject + BioSample + DRA | |
| ゲノムアセンブリのみ | BioProject + BioSample + DDBJ (Trad)（MSS 経由） | WGS / HTG / Finished level |
| Haplotype（生リード + アセンブリ） | BioProject (umbrella + Principal + Alternate) + BioSample + DRA + DDBJ (Trad)（MSS 経由） | BioProject が 3 つ必要 |
| Haplotype（アセンブリのみ） | BioProject (umbrella + Principal + Alternate) + BioSample + DDBJ (Trad)（MSS 経由） | |
| 転写産物アセンブリ（de novo transcriptome） | BioProject + BioSample + DRA + DDBJ (Trad)（MSS 経由、TSA 区分） | DRA 必須 |
| 単発 cDNA 配列（Sanger シングルパス） | BioProject + BioSample + DDBJ (Trad)（MSS 経由、EST 区分） | 100 配列未満なら NSSS も可 |

### 登録の流れ

微生物ゲノムと同じ 3 層構造。各 DB の役割は共通（BioProject / BioSample / DRA / MSS）。以下の相違点を明示する:

- **BioSample パッケージ**: MIGS（Genomic Sequences）を使用
- **アセンブリレベルの区分**: WGS（ドラフト）/ HTG（BAC/YAC/fosmid クローンのドラフト、PHASE 0/1/2）/ Finished level（染色体全長相当）で MSS の登録種別が変わる
- **アノテーション**: 全長規模のゲノムで新規性の高い種の場合、最低 1 ゲノムにアノテーション記載が必要。locus_tag prefix は BioSample 登録時に取得

### 準備物

微生物ゲノムと共通（DDBJ Account / 公開鍵 / 配列ファイル / アノテーションファイル / NGS 生データ / MD5）。以下を追加:

- **locus_tag prefix**: アノテーション記載時に必須。BioSample 登録時に取得
- **Assembly Name**: 真核生物のゲノムエントリでは ST_COMMENT に必須

### 補足

- **Haplotype**: Principal / Alternate の 2 系統を別 BioProject として登録し、umbrella BioProject でまとめる。BioSample は共通。locus_tag prefix も共通（タグの prefix/suffix で Haplotype を区別: 例 A1C_p00001 / A1C_a00001）
- **TSA（Transcriptome Shotgun Assembly）**: de novo transcriptome assembly。DRA 登録が必須。source と assembly_gap 以外の biological feature は任意
- **EST（Expressed Sequence Tags）**: Sanger シングルパス cDNA。source 以外の biological feature は記載不可。新規登録はほぼゼロだが制度上は継続中
- **TPA（Third Party Data）**: assembly / specialist_db のみ継続（experimental / inferential は 2025/01 で新規受付終了）。peer-reviewed 発表が必須
- **HTG（High Throughput Genomic Sequences）**: BAC/YAC/fosmid クローンのドラフト。PHASE 0/1/2 で進行度を示す

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
- (1)-(3) は DRA、(4) の MAG は DDBJ (Trad) / MSS で登録する
- BioSample が複雑: メタゲノムサンプル（環境由来）と仮想的な MAG/Binned サンプル（派生サンプル）を別々に登録する

### 登録先の組み合わせ

| 持っているデータ | 登録先 | 補足 |
|---|---|---|
| 生リード + アセンブリ（MAG / Binned / Primary / TLS / SAG / メタトランスクリプトーム TSA） | BioProject + BioSample + DRA + DDBJ (Trad)（MSS 経由） | DRA 登録は原則必須 |
| 生リードのみ | BioProject + BioSample + DRA | |
| アセンブリのみ | BioProject + BioSample + DDBJ (Trad)（MSS 経由） | |

### 登録の流れ

メタゲノム特有のポイントを軸に説明する:

- **BioProject**: メタゲノム/環境サンプルプロジェクトとして登録。生物名は "xyz metagenome"（例: soil metagenome）
- **BioSample（環境サンプル）**: MIxS MIMS.me パッケージ。生物名は "xyz metagenome"
- **BioSample（MAG/Binned 用）**: MIMAG パッケージ。仮想的な派生サンプルとして別途登録。metagenome_source と derived_from 属性が必須。生物名は uncultured を冠さない分類群名
- **BioSample（SAG 用）**: MISAG パッケージ。metagenome や uncultured を冠した生物名は使えない
- **DRA**: 生リードは Run、プライマリー/Binned アセンブリは Analysis に登録
- **DDBJ (Trad) / MSS**: MAG は ENV division のゲノムエントリとして登録。/metagenome_source, /environmental_sample, /isolation_source, /isolate が必須

登録順序: BioProject → BioSample（環境サンプル + MAG/Binned/SAG 用）→ DRA → MSS（MAG のみ）

### 準備物

微生物ゲノムと共通の項目に加えて:

- **MAG 品質指標**: completeness、contamination 等（DRA Analysis の Attributes に記載）
- **metagenome_source**: メタゲノムの由来を示す "xyz metagenome" 名
- **derived_from**: 派生元の BioSample アクセッション番号

### 補足

- **MAG 品質基準**: [Bowers et al. (2017)](https://www.nature.com/articles/nbt.3893) の基準を参照。completeness と contamination で品質を評価
- **Binned メタゲノム vs MAG**: Binned は分類群に帰属されたアセンブリ全体、MAG はその中で最高品質のもの。DRA Analysis vs DDBJ (Trad) で登録先が異なる
- **SAG（Single Amplified Genome）**: 一細胞を単離・全ゲノム増幅。コンタミネーションに注意。/note="single amplified genome" を記載。複数細胞の co-assembly も可能
- **GTDB 生物名の変換**: GTDB が割り当てた生物名が NCBI Taxonomy に未登録の場合、対応する NCBI Taxonomy 名に変換して登録する
- **DRA Analysis の制約**: Analysis は ENA/NCBI と共有されない。DDBJ Search でインデックスされず、ftp 公開のみ
- **メタトランスクリプトーム TSA**: メタゲノム由来の転写産物アセンブリ。真核生物ゲノムカードの TSA と同じ登録先（DRA + MSS、TSA 区分）

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

| 計測手法 | 登録先 | 補足 |
|---|---|---|
| NGS による RNA-seq | BioProject + BioSample + DRA + GEA | GEA から DRA を参照する |
| マイクロアレイ | BioProject + BioSample + GEA | DRA 不要 |

### 登録の流れ

- **BioProject**: 研究プロジェクトの登録
- **BioSample**: サンプルの登録
- **DRA（NGS の場合のみ）**: 生リードの登録。GEA 登録時に DRA Submission を参照する
- **GEA**: 発現データの登録。メタデータは IDF（Investigation Description Format）+ SDRF（Sample and Data Relationship Format）で構成

GEA 登録の流れ:
1. D-way で新規 Submission 作成（Sequencing / Microarray を選択）
2. 解析済みデータファイルをアップロード
3. DRA Submission を選択（NGS の場合）
4. BioProject / BioSample を選択
5. IDF を入力（プロトコール、文献情報、データファイル形式）
6. SDRF テンプレートをダウンロード → 必要項目を追加 → アップロード
7. 検証処理 → アクセッション番号発行

### 準備物

- **DDBJ Account**: D-way へのログインに必要
- **公開鍵**: データアップロードに必要
- **解析済みデータファイル**: サンプルごとの解析済みファイル（登録を強く推奨）
- **生データファイル**: マイクロアレイの場合は生データも必須
- **MD5 チェックサム**: データファイルの整合性検証用
- **NGS 生データ（RNA-seq の場合）**: DRA に登録済み、または同時に登録
- **Array Design アクセッション番号（マイクロアレイの場合）**: ArrayExpress / GEA に登録済みのアレイデザイン。未登録の場合は新規登録

### 補足

- **single-cell RNA-seq**: [Single-cell submission guide](https://www.ddbj.nig.ac.jp/gea/single-cell.html) を参照
- **マイクロアレイとシークエンシングの混在**: 同一 Submission にまとめられない。Submission を分ける
- **two-color マイクロアレイ**: GEA は dual-channel のみサポート。チャンネル別ファイルの場合は GEA チームに連絡
- **Submission あたりの上限**: SDRF Assay 数 1,000 件。超える場合は Submission を分割

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

原典: なし（外部リダイレクト系）。submit.md のフロー分岐仕様を参照。

### 概要

- 対象: SNP / SV（構造変異）の登録
- DDBJ センター自体は変異データの登録を受け付けていない。ヒト / 非ヒト、SNP / SV の組み合わせに応じて外部サービスへ誘導する
- Callout で「外部サイトへ遷移します」を明示する

### 登録先の組み合わせ

| データ種別 | 登録先 | 備考 |
|---|---|---|
| ヒト SNP / Indel（50 bp 以下） | JVar SNP | DDBJ 運営 |
| ヒト SV（50 bp 超、構造変異） | JVar SV | DDBJ 運営 |
| 非ヒト SNP / Indel | EVA（European Variation Archive） | EBI 運営 |
| 非ヒト SV | dgVa（Database of Genomic Variants archive） | EBI 運営 |

### 登録の流れ

各外部サービスの概要を 1-2 文で説明し、外部リンクへ誘導する。詳細な登録手順はポータルでは提供しない。

### 準備物

ポータルでは案内しない（各外部サービスのドキュメントを参照）。

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| JVar | https://www.ddbj.nig.ac.jp/jvar/index.html | ヒト変異データ（SNP / SV） |
| EVA | https://www.ebi.ac.uk/eva/ | 非ヒト SNP / Indel |
| dgVa | https://www.ebi.ac.uk/dgva/ | 非ヒト SV |

---

## 6. ヒト制限アクセス

原典: `_jga/submission.md`

### 概要

- 対象: アクセス制限が必要な個人レベルの遺伝学的データ（GWAS 生データ、臨床ゲノム等）
- JGA（Japanese Genotype-phenotype Archive）に登録する
- **DBCLS（NBDC）への提供申請・承認が前提条件**。DBCLS で承認された連絡を JGA が受けた後に登録手順を案内する
- 制限公開（データ利用に DBCLS 承認が必要）と、論文公表までの一時的な非公開は異なる概念であることを明示する

### 登録先の組み合わせ

| データ種別 | 登録先 |
|---|---|
| 全てのヒト制限アクセスデータ | JGA |

JGA は多様なデータ形式に対応: NGS（BAM / FASTQ）、アレイ（genotyping / SNP / 発現 / メチル化）、変異（VCF）、メタボロミクス、プロテオミクス等。

### 登録の流れ

1. DBCLS にデータ提供を申請し、承認を受ける
2. JGA チームから登録手順の案内を受ける
3. メタデータを XML で作成（Study / Sample / Experiment / Data / Analysis / Dataset / Policy）
4. データファイルをアップロード
5. JGA チームが査定 → アクセッション番号発行

JGA メタデータオブジェクト:
- **Study**: 研究概要、タイトル、アブストラクト
- **Sample**: 各サンプル（一般的に個人に対応）
- **Experiment**: 実験セットアップ（NGS 実験のみ）
- **Data**: NGS データファイルと Experiment の関係
- **Analysis**: アレイデータ、解析結果（VCF 等）
- **Dataset**: Data / Analysis をまとめる単位。利用制限ポリシーが異なるデータは Dataset を分ける
- **Policy**: データ利用制限ポリシー

### 準備物

- **DDBJ Account**
- **DBCLS 提供承認**: 提供申請 ID（例: J-DS000001-001）
- **データファイル**: BAM / FASTQ / VCF / アレイデータ等
- **メタデータ**: JGA XML スキーマに準拠

### 補足

- **論文引用**: JGAS（Study）番号の引用を推奨
- **Analysis の登録推奨**: データの再利用性・再現性のため、VCF 等の解析データを Analysis に登録することを推奨
- **公開単位**: JGA Submission 単位で公開。公開時期が異なるデータは Submission を分ける
- **Reviewer access**: 非公開データを査読者に提供したい場合は JGA チームに連絡

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| DBCLS（NBDC ヒトデータベース） | https://humandbs.dbcls.jp/ | データ提供申請 |
| JGA 登録 | https://www.ddbj.nig.ac.jp/jga/submission.html | JGA 登録手順の詳細 |
| ヒトを対象とした研究データの登録について | https://www.ddbj.nig.ac.jp/policies.html#submission-of-human-data | ポリシー |

---

## 7. メタボロミクス

原典: `_metabobank/submission.md`

### 概要

- 対象: メタボロミクスデータ（LC-MS、GC-MS 等）
- MetaboBank に登録する。BioProject / BioSample と連携している
- メタデータはエクセル（IDF + SDRF 形式）、解析済みデータは MAF（Metabolite Assignment File）で登録する

### 登録先の組み合わせ

| データ種別 | 登録先 |
|---|---|
| メタボロミクスデータ | BioProject + BioSample + MetaboBank |

### 登録の流れ

1. DDBJ Account 取得、公開鍵登録
2. MetaboBank 登録申し込みフォームで申し込み → 担当者が個別案内
3. BioProject 登録
4. BioSample 登録（Omics パッケージ）
5. メタデータエクセル（IDF + SDRF）を記入
6. データファイル準備（生データ + 解析済みデータ + MAF）
7. SCP/SFTP でアップロード（metabobank ディレクトリ）

### 準備物

- **DDBJ Account**: 登録に必要
- **公開鍵**: SCP/SFTP アップロードに必要
- **メタデータエクセル**: 実験種別ごとのテンプレート（IDF + SDRF）
- **生データファイル**: 測定機器の出力
- **解析済みデータファイル**
- **MAF（Metabolite Assignment File）**: 同定・推定された化合物情報（強く推奨、必須ではない）
- **MD5 チェックサム**: データファイルの整合性検証用

### 補足

- **BioSample パッケージ**: Omics パッケージを使用。非生物サンプルの場合は NCBI Taxonomy metagenomes から適切な生物名を選択（例: blank sample, food metagenome）
- **Study 分割**: 実験デザインが異なるデータは Study を分ける。関連する Study は同一 BioProject でまとめる
- **EBI MetaboLights とのデータ交換**: 現在は行っていない

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

| データ種別 | 登録先 | 補足 |
|---|---|---|
| 小規模塩基配列 | DDBJ (Trad)（NSSS 経由） | BioProject / BioSample 不要 |

### 登録の流れ

1. DDBJ Account で NSSS にログイン
2. Web フォームで塩基配列とアノテーションを入力
3. DDBJ で査定 → アクセッション番号発行

### 準備物

- **DDBJ Account**: NSSS へのログインに必要
- **塩基配列データ**: 登録する配列（ベクター・アダプター配列は除去済みであること）
- **アノテーション情報**: 生物名、Feature / Qualifier 等

### 補足

- **NSSS で登録できないデータ**: EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA、1 配列 500 kb 以上、1 配列あたり Feature 30 個以上、合計 100 配列超 → MSS を案内
- **レプリコン全長規模の配列**: ゲノム / 染色体 / オルガネラゲノム / ウイルスゲノム / プラスミド → NSSS では登録不可、MSS を案内
- **BioProject / BioSample 連携が必要な場合**: DBLINK 記載が必要なケース（メタゲノム解析、標的遺伝子の関連付け等）→ MSS を案内
- **データ更新**: 登録済みデータの修正は NSSS ではなく [DDBJ 更新依頼フォーム](https://forms.gle/mcQaJshvAKRdggz16) から依頼

### リンク

| リンク先 | URL | 用途 |
|---|---|---|
| NSSS（新規登録開始） | https://ddbj.nig.ac.jp/submission | NSSS での登録開始 |
| NSSS ヘルプ | https://www.ddbj.nig.ac.jp/ddbj/web-submission-help.html | 入力ガイド |
| 塩基配列の登録の前に | https://www.ddbj.nig.ac.jp/ddbj/submission.html | 登録前の準備 |
| MSS の登録手順 | https://www.ddbj.nig.ac.jp/ddbj/mss.html | 大規模データの場合 |
| VecScreen | http://ddbj.nig.ac.jp/vecscreen/ | ベクター配列の確認 |
