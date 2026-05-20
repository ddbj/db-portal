# 登録ナビゲーション v3 — Tag Taxonomy

[`docs/submit-alt3.md`](./submit-alt3.md) (本体) のサブ仕様。本体 §5 の **3 階層 tag 表現** (列 / chip / Step カード pulldown) を controlled vocabulary レベルで SSOT 化する。

クロスリファレンス:

- TypeScript 型 (`FileEntry` 列フィールド / `ChipTag` / `FlowStep.intraDbInputs`) → [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.2 / §4.5 / §4.6
- 各軸を確定する Q&A (per-cell 編集 + modal) → [`submit-alt3-modals.md`](./submit-alt3-modals.md)
- Tag から Step 列を生成するルール → [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md)

## 5.1 テーブル列 (Cross-DB Tag、per-cell 編集)

本体 §5.1 のテーブル直接列。UI に表示するのは **「種別 / 組織 / 公開可否」の 3 列**。`data-form` 軸は **内部 state には保持するが UI 列としては非表示** (理由は表の下に記載)。未設定 cell は ⚠ で警告表示。

| 列 | UI 表示 | 値 | 主な決定 UI | 登録先振り分けへの影響 |
|---|---|---|---|---|
| **kind** (ButtonType) | **表示**、編集不可 | 9 種 (`sequence-read` / `assembled` / `annotation` / `variation` / `phenotype` / `expression-array` / `expression-matrix` / `mass-spec` / `spatial-tx`) | ボタン押下時に確定 (行ごとに固定、書き換え不可) | Step 振り分けの最上位識別子。`BUTTON_META.defaultDataForm` を介して `data-form` の初期値も決定 |
| **organism** | **表示**、テーブル cell 編集 | `human` / `human-microbiome` / `eukaryote` / `prokaryote` / `virus` / `metagenome` / `organelle-plasmid` | テーブル cell 編集 (デフォルト = 直前の行と同じ値) | `metagenome` → MIxS BS Package / MSS ENV。`organelle-plasmid` → MSS specialized。`human` / `human-microbiome` + `restricted` → JGA 集約 (本体 §6.4)。複数値混在は許容 (本体 §5.1) で、Section B に組織別の Step が並ぶ |
| **access** | **表示**、テーブル cell 編集 | `open` / `restricted` | テーブル cell 編集 | `restricted` + `organism ∈ {human, human-microbiome}` → JGA 集約。混在は許容、open 行 → DRA / restricted 行 → JGA に分岐 (本体 §6.3) |
| **data-form** | **非表示** (内部のみ) | `raw` / `assembled` / `analysis-output` / `matrix` / `annotation` / `mass-spec` / `phenotype` | ButtonType ごとに default が決まる (`BUTTON_META.defaultDataForm`)、UI からの上書きは無し | `raw` → DRA Run。`assembled` → MSS / NSSS。`analysis-output` → DRA Analysis。`matrix` → GEA processed。`annotation` → MSS 付随。`mass-spec` → MetaboBank / jPOST。`phenotype` → JGA Dataset。Rule 6 / 8 / 13 が内部 state を参照する |

`organism` / `access` は per-cell に独立に編集できる。組み合わせで Section B の Step 列が再生成される (例: open + human → DRA Run、restricted + human → JGA、open + metagenome → DRA + MSS-MAG/SAG)。

**data-form を UI 列にしない理由**: ButtonType と default `data-form` の関係は実質 1:1 (`sequence-read` → `raw`、`assembled` → `assembled` 等。`raw` は `sequence-read` + `expression-array` の 2 ボタンで共有、`matrix` は `expression-matrix` + `spatial-tx` で共有) で、典型ケースでユーザーが per-cell に書き換える必要がほぼ無い。代わりに「種別」列で ButtonType の短縮名を表示すれば、行の意味づけは直感的に分かる。`data-form` 自体は Rule 6 / 8 / 13 の Step 振り分けロジックが内部 state を参照し続けるため、UI に出さなくても登録経路の決定は変わらない。

## 5.2 行内 chip 10 軸 (Cross-DB Tag non-grouping、modal 確定)

本体 §5.2 の行内 chip。ファイル種別に紐づき、列にすると他種別の行で空が増える軸。Group 構造が表現する情報 (pair-end / 10x / multiplex / two-color / hybrid / imaging MS / MAG-SAG chain / JGA Dataset / single-color microarray 等) は **chip に重複させない**。

「7 軸 + 従属 3 軸」の構成。従属 3 軸 (`tpa-subtype` / `haplotype-naming` / `spatial-platform`) は主軸の値があるときのみ表示する従属関係を持つ。

| Chip 軸 | 値 | 表示契機 | Step 列への影響 | chip クリック編集 UX |
|---|---|---|---|---|
| `assembly-form` | `wgs` / `gnm` / `tsa` / `tls` / `est` / `mag` / `sag` / `htg` / `htc` / `gss` / `syn` / `misc` / `ask` (13 種、ddbj/www `_ddbj/data-categories.md` 11 種 + GSS / SYN 拡張) | + 組み立て済み配列 modal の「アセンブリ種別」確定時 | MSS data type を決定。`mag` / `sag` は MAG/SAG chain の派生 BS 生成 | **modal 再オープン** (Group 構造を伴う再確定が必要) |
| `provenance` | `third-party` (一次は default 扱いなので chip 表示なし) | + 組み立て済み配列 / + 遺伝子アノテーション modal で「第三者再解析」選択時のみ | TPA 経路 (MSS-TPA、Rule 7a)。TPA サブタイプは下記の従属 chip `tpa-subtype` 軸 | **modal 再オープン** (`FileGroup.referenceMeta` の参照元 accession + DOI/PubMed ID 再入力が必要) |
| `variation-form` | `per-sample` / `aggregate` | + 変異情報 modal で確定 | per-sample + open → DRA Analysis。per-sample + restricted (human) → JGA Analysis。aggregate + open (human) → TogoVar-repository | **inline pulldown** (値域 2 種、構造変化なし) |
| `variation-type` | `snp-indel` / `sv` / `cnv` | + 変異情報 modal で確定 | 非ヒト: snp-indel → EVA、sv/cnv → dgVa。ヒト open: snp-indel → TogoVar SNP、sv/cnv → TogoVar SV | **inline pulldown** (値域 3 種、構造変化なし) |
| `haplotype-mode` | `phased` (yes 時のみ表示) | + 組み立て済み配列 modal で「Haplotype phased」選択時 | BP Step が 1 → 複数 (Principal BP / Alternate BP / DRA 用 BP + Umbrella BP) に分岐。ddbj/www `_ddbj/haplotype.md` | **modal 再オープン** (命名規則の選択が必要、Rule 11c → `haplotype-naming` 従属軸を更新) |
| `functional-genomics` | `yes` (= GEA) / `wgs-target` / `tsa-target` / `metagenome-target` / `variation-target` / `wes-target` / `other` | + 配列リード modal の Q1 / Q2 への回答結果 (`assembled` ButtonType は §5.2.2 で自動推測) | `yes` → GEA Step を生成。それ以外は主要 DB を分岐 (`wgs-target` → MSS-WGS、`tsa-target` → MSS-TSA、`metagenome-target` → MSS-MAG/SAG/ENV、`variation-target` → TogoVar / EVA / dgVa、`wes-target` → DRA Run のみ) | **inline pulldown** (値域 7 種、ユーザー上書きで manual override flag 保持、§5.2.2) |
| `mass-spec-domain` | `proteomics` / `metabolomics` / `imaging` | + 質量分析 modal の選択結果 | `proteomics` → jPOST 外部リダイレクト。`metabolomics` → MetaboBank。`imaging` → MetaboBank imaging stream | **modal 再オープン** (Group 構造 (imaging-ms Group) と MetaboBank Submission Type が連動) |
| `tpa-subtype` (従属) | `tpa-assembly` / `tpa-specialist-db` (Rule 7a。`tpa-experimental` / `tpa-inferential` は 2025/01 より受付停止のため値域外) | `provenance=third-party` 同行確定時のみ表示 | MSS Step の DEFINITION 行 prefix と KEYWORDS 自動付与に直結。`tpa-specialist-db` は DDBJ で受付しないため案内 only Step | **inline pulldown** (値域 2 種) |
| `haplotype-naming` (従属) | `principal-alternate` / `haplotype-1-2` / `maternal-paternal` (Rule 11c) | `haplotype-mode=phased` 同行確定時のみ表示 | Step MSS の ST_COMMENT 文字列と Step BP のタイトル/バッジに反映 | **inline pulldown** (値域 3 種) |
| `spatial-platform` (従属) | `visium` / `xenium` / `merfish` / `stereo-seq` / `slide-seq` / `geomx` / `other` (Rule 4d) | ButtonType=`spatial-tx` 行で + 空間 Tx modal 確定時のみ表示 | GEA Submission Type を Sequencing / Microarray に振り分け、Array Design pulldown 値を切替 | **inline pulldown** (値域 7 種、Stereo-seq / Slide-seq / GeoMx は要問い合わせ案内) |

### 5.2.1 ButtonType ごとの chip 既定値

modal 確定時に自動付与される chip 値。+ 配列リード以外は ButtonType + modal 質問で確定するため、per-row で chip 軸の Q&A は不要。

| ButtonType | `functional-genomics` 既定 | `assembly-form` | `variation-form` / `variation-type` | `mass-spec-domain` | 根拠 |
|---|---|---|---|---|---|
| `expression-array` | **`yes` 固定** | — | — | — | microarray は functional genomics の定義 (ddbj/www `_gea/index.md`) |
| `expression-matrix` | **`yes` 固定** | — | — | — | matrix は functional genomics processed data の代表 |
| `spatial-tx` | **`yes` 固定** | — | — | — | Visium / Xenium / MERFISH 等の空間 Tx は functional genomics |
| `annotation` | **`other` 固定** | — | — | — | annotation は MSS / GenBank flat に閉じ、GEA 経路を通らない |
| `variation` | **`variation-target` 固定** | — | modal で確定 | — | variation は GEA でなく TogoVar / EVA / dgVa |
| `phenotype` | **`other` 固定** | — | — | — | 表現型単独は JGA Dataset 直行、GEA 経路を通らない |
| `mass-spec` | **`other` 固定** | — | — | modal で確定 | `mass-spec-domain` 軸で完結 |
| `assembled` | **`assembly-form` から自動推測** (§5.2.2) | modal で確定 | — | — | + 組み立て済み配列 modal のアセンブリ種別が `assembly-form` を決定し、それが `functional-genomics` も自動決定 |
| `sequence-read` | **Q&A で確定** | — | — | — | + 配列リード modal Q1 / Q2 で確定 (本体 §3 / [modals](./submit-alt3-modals.md)) |

つまり `functional-genomics` の Q&A は **+ 配列リード modal にのみ存在し、他 8 modal は ButtonType + modal の構造的質問で chip 値が自動確定**。

### 5.2.2 `assembly-form` → `functional-genomics` 自動推測マッピング

`assembled` ButtonType では + 組み立て済み配列 modal で確定した `assembly-form` 値から chip `functional-genomics` を自動推測する。`assembly-form` を変更したときに自動的に `functional-genomics` も更新される。

| `assembly-form` | `functional-genomics` 自動値 | 根拠 |
|---|---|---|
| `wgs` / `gnm` / `htg` | `wgs-target` | ゲノム配列・完成ゲノム・高処理ゲノム (`_ddbj/wgs.md`, `_ddbj/finished_level_genome.md`, `_ddbj/htg.md`) |
| `tsa` / `htc` / `est` | `tsa-target` | transcriptome / 高処理 cDNA / EST (`_ddbj/tsa.md`, `_ddbj/htc.md`, `_ddbj/est.md`) |
| `mag` / `sag` | `metagenome-target` | metagenome 由来 derived BS chain (`_ddbj/metagenome-assembly.md`, `_ddbj/single-amplified-genome.md`) |
| `tls` / `gss` / `syn` / `misc` / `ask` | `other` | TLS (16S/COI) は metagenome 限定でない、GSS / SYN / Curator 判断は variation 範囲外 |

ユーザーがテーブル上で chip を直接編集して上書き可能 (例: TLS で metagenome-target に修正)。Rule 14 (Step カード入力との整合チェック、[`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md)) はこの自動推測値とユーザー意図の差異を warning で通知する。

**自動推測値 vs ユーザー編集の優先順位**: ユーザーが手動編集すると **manual override flag** を内部保持し、自動推測値より優先する。modal を再オープンして `assembly-form` を変更しても、manual override 中の `functional-genomics` は再計算されない (ユーザー意図保護)。manual override をリセットしたい場合は chip クリック編集 UI の「自動推測に戻す」操作で flag をクリアできる。

manual override flag は次のいずれの初期値も対象とする:

- + 組み立て済み配列 modal の `assembly-form` 自動推測 (§5.2.2 表)
- + 配列リード modal Q1 (= yes / Q2 回答) で確定した `functional-genomics` 値 ([`submit-alt3-modals.md`](./submit-alt3-modals.md) §+ 配列リード)
- §5.2.1 表の「固定値」(`expression-array` / `expression-matrix` / `spatial-tx` の `yes` 固定、`annotation` / `phenotype` の `other` 固定、`variation` の `variation-target` 固定): これらをユーザーが上書きすると **Rule 14 と同じ枠で「ButtonType の typical 値と異なる」warning** を表示する (acknowledged 可能、上書き値は保持)。

`functional-genomics` 以外の chip 軸 (`assembly-form` / `provenance` / `variation-form` / `variation-type` / `mass-spec-domain` / `haplotype-mode` / `spatial-platform` / `tpa-subtype` / `haplotype-naming`) は **modal 確定値の単純上書き** で manualOverride flag は持たない (modal で再確定するか、tags.md §5.2 「chip クリック編集 UX」の inline pulldown / modal 再オープンのいずれかで編集)。

## 5.3 Step カード pulldown (Intra-DB Tag、Service 確定後)

本体 §5.3。テーブル列 / chip で Service が決まった後、その Step カード内で表示される pulldown 群。Service 確定までは表示されない。controlled vocabulary は ddbj/www 各 SSOT を継続利用する。

| Pulldown | 値域 | 出現 Step | 出典 |
|---|---|---|---|
| BP Project data type | 13 種 (Genome Sequencing / Clone Ends / Epigenomics / Exome / Map / Metagenome / Phenotype and Genotype / Proteome / Random Survey / Targeted Locus / Transcriptome or Gene Expression / Variation / Other) | Step BioProject | `_bioproject/project-info.md` |
| BP Project type | 2 種 (Primary BioProject / Umbrella BioProject) | Step BioProject | `_bioproject/submission.md` |
| BP Sample scope | 6 種 (Monoisolate / Multiisolate / Multi-species / Environment / Synthetic / Other) | Step BioProject | `_bioproject/project-info.md` |
| BP Material | 7 種 (Genome / Partial Genome / Transcriptome / Reagent / Proteome / Phenotype / Other) | Step BioProject | `_bioproject/project-info.md` |
| BP Capture | 6 種 (Whole / Clone Ends / Exome / Targeted Locus/Loci / Random Survey / Other) | Step BioProject | `_bioproject/project-info.md` |
| BP Methodology | 4 種 (Sequencing / Array / Mass Spectroscopy / Other) | Step BioProject | `_bioproject/project-info.md` |
| BP Objective | 11 種 (Raw Sequence Reads / Sequence / Analysis / Assembly / Annotation / Variation / Epigenetic Markers / Expression / Maps / Phenotype / Other) | Step BioProject | `_bioproject/project-info.md` |
| BS Package | 22 種。内部キーと SSOT 表示名 (`_biosample/sample-info.md`) の対応:<br>**Standard 11**: `sars-cov-2-cl` (= `SARS-CoV-2: clinical or host-associated`) / `sars-cov-2-wwsurv` (= `SARS-CoV-2: wastewater surveillance`) / `microbe` (= `Microbe`) / `model-organism-or-animal` / `metagenome-or-environmental` / `invertebrate` / `human` / `plant` / `viral` / `beta-lactamase` / `omics`<br>**Pathogen 2**: `pathogen-cl` (= `Pathogen: clinical or host-associated`) / `pathogen-env` (= `Pathogen: environmental/food/other`)<br>**MIxS 9**: `migs-ba` / `migs-eu` / `migs-vi` / `mims-me` / `mimag` / `misag` / `mimarks-specimen` / `mimarks-survey` / `miuvig`<br>Environmental package は MIxS 各パッケージの sub-selector で 22 種に含めない。必須属性: `geo_loc_name` / `collection_date`。本 docs では SSOT 表示名で記述し、内部値域 (controlled vocabulary keys) は上記 kebab-case を採用 | Step BioSample | `_biosample/sample-info.md`, `_biosample/overview.md` |
| DRA Library Source | 9 種 (GENOMIC / GENOMIC SINGLE CELL / TRANSCRIPTOMIC / TRANSCRIPTOMIC SINGLE CELL / METAGENOMIC / METATRANSCRIPTOMIC / SYNTHETIC / VIRAL RNA / OTHER) | Step DRA | `_dra/metadata.md` |
| DRA Library Strategy | 35 種 + `Other` (計 36 値): WGS / WGA / WXS / WCS / CLONE / POOLCLONE / CLONEEND / FINISHING / AMPLICON / Targeted-Capture / RAD-Seq / Reduced Representation / RNA-Seq / miRNA-Seq / ncRNA-Seq / ssRNA-seq / EST / FL-cDNA / CTS / ChIP-Seq / MNase-Seq / DNase-Hypersensitivity / Bisulfite-Seq / MRE-Seq / MeDIP-Seq / MBD-Seq / FAIRE-seq / NOMe-Seq / Hi-C / ChIA-PET / Tethered Chromatin Conformation Capture / ATAC-seq / RIP-Seq / Tn-Seq / SELEX / Synthetic-Long-Read + `Other` (RIP-Seq は CLIP-Seq / HITS-CLIP / PAR-CLIP を包含) | Step DRA | `_dra/metadata.md` |
| DRA Library Selection | 29 種: RANDOM / PCR / RANDOM PCR / RT-PCR / HMPR / MF / repeat fractionation / size fractionation / MSLL / cDNA / cDNA_randomPriming / cDNA_oligo_dT / PolyA / Oligo-dT / Inverse rRNA / ChIP / MNase / DNAse / Hybrid Selection / Reduced Representation / Restriction Digest / 5-methylcytidine antibody / MBD2 protein methyl-CpG binding domain / CAGE / RACE / MDA / padlock probes capture method / other / unspecified | Step DRA | `_dra/metadata.md` |
| DRA Layout | 2 種: single / paired | Step DRA | `_dra/metadata.md` |
| DRA Run File Type | 5 種: fastq / hdf5 / bam / tab / reference_fasta | Step DRA | `_dra/metadata.md` |
| DRA Analysis Type | 3 種: De Novo Assembly / Sequence Annotation / Abundance Measurement | Step DRA-Analysis | `_dra/metadata.md` |
| DRA Instrument | Platform + Model (Illumina HiSeq / NovaSeq / NextSeq / MiSeq、PacBio Sequel II、Oxford Nanopore MinION/PromethION 等) | Step DRA | `_dra/metadata.md` |
| GEA Submission Type | 2 種: Sequencing / Microarray (Xenium / MERFISH は Microarray の Array Design として吸収、Visium は Sequencing。同 Submission に Microarray と Sequencing を混在させられない) | Step GEA | `_gea/submit-sequence.md` / `_gea/submit-array.md` |
| GEA Experiment Type | 40 種 (EFO accession 付き、`_gea/experiment-types.md` SSOT)。代表 sequencing: RNA-seq of coding RNA (EFO_0003738) / RNA-seq of non coding RNA (EFO_0003737) / RNA-seq of coding RNA from single cells (EFO_0005684) / methylation profiling by HTS (EFO_0002761) / Bisulfite-seq (EFO_0003753) / ChIP-seq (EFO_0002692) / ATAC-seq (EFO_0007045) / Hi-C (EFO_0007693) / CLIP-seq (EFO_0003143) / DNA-seq (EFO_0002693) など。代表 microarray: transcription profiling by array (EFO_0002768) / ChIP-chip by array (EFO_0002760) / genotyping by array (EFO_0002767) / methylation profiling by array (EFO_0002759) など。代表 classical: transcription profiling by MPSS / SAGE / RT-PCR、metabolomic profiling (EFO_0000752)、proteomic profiling by mass spectrometer (EFO_0002766) | Step GEA | `_gea/experiment-types.md` |
| GEA Material Type | 7 種: total RNA / polyA RNA / cytoplasmic RNA / nuclear RNA / genomic DNA / protein / other | Step GEA (SDRF) | `_gea/submit-sequence.md` / `_gea/submit-array.md` / `_gea/metadata.md` |
| GEA Label (Microarray のみ) | biotin / Cy3 / Cy5 / 等の標識化合物 | Step GEA (Microarray SDRF) | `_gea/submit-array.md` |
| GEA Technology Type | array assay / sequencing assay (Submission Type に自動連動) | Step GEA (SDRF、自動入力) | `_gea/submit-array.md` / `_gea/submit-sequence.md` |
| MetaboBank Submission Type | 11 種: LC-MS / LC-DAD-MS / GC-MS / GCGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS / MSI / NMR (`mass-spec-domain ∈ {metabolomics, imaging}` の場合に表示) | Step MetaboBank | `_metabobank/submission.md` |
| MSS data type | 11 種: WGS / GNM / MAG / SAG / TLS / HTG / TSA / HTC / EST / MISC / ASK。Haplotype は WGS / GNM の派生 (ST_COMMENT で識別)、TPA は `provenance=third-party` + 従属 chip `tpa-subtype` の組合せ | Step MSS | `_ddbj/data-categories.md`, `_ddbj/haplotype.md` |
| MSS entry route | 2 種: `mss` (FTP / 直接登録) / `nsss` (Nucleotide Sequence Submission System、Web 登録)。`intraDbInputs.entryRoute` で保持、NSSS 経由時は Step notes に NSSS 制約 (下記) を案内する。**PoC は Step MSS カード上の pulldown でユーザーが明示選択**、generateFlowCard 側の自動推測デフォルト値は `assembly-form ∈ {wgs, gnm, mag, sag, tsa, tls, est, htg, htc}` または file size 大 (PoC では未判定) → `mss`、それ以外 → `nsss`。NSSS 制約 (`_ddbj/web-submission.md` SSOT): (a) 配列長 **100 bp 以上 〜 500 kb 未満** (100 bp 下限は 2021/6 以降、`_faq/restricton-seq-length.md`)、(b) 配列数 **100 以下**、(c) 1 配列あたり Feature 数 **30 未満**、(d) 受付しない種別: **EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA** (これらは MSS へ)、(e) **染色体を join した配列は不可** (各染色体は独立 entry に分解)。NSSS 選択時は (a)-(c) のいずれの上限超過も Rule 14 と同型の warning として Step カードに表示し、(d) に該当する `assembly-form` を持つ行が含まれる場合は warning + 自動的に entry route を `mss` に推奨する | Step MSS | `_ddbj/web-submission.md`, `_faq/restricton-seq-length.md` |
| MSS INSDC/TPA サブタイプ | 2 種 (現受付中): `tpa-assembly` (= `TPA:assembly`) / `tpa-specialist-db` (= `TPA:specialist_db`)。**2025年1月より `TPA:experimental` / `TPA:inferential` は登録受付停止**。`tpa-specialist-db` は DDBJ で受付しない (案内のみ)。`tpa-assembly` の有効 data type は WGS / MAG / TSA / TLS の 4 種。PoC ではテーブル上の従属 chip `tpa-subtype` 軸として保持し、Step MSS の DEFINITION prefix / KEYWORDS 自動付与のキーとして読む | Step MSS (`provenance=third-party` 時のみ表示、chip 軸と同期) | `_ddbj/tpa.md`, `/news/ja/2024-09-05.html` |
| MSS DIVISION | 17 種 PoC 対象 (HUM / PRI / ROD / MAM / VRT / INV / PLN / BCT / VRL / PHG = 生物由来 10 種 + ENV / SYN + EST / TSA / GSS / HTC / HTG)。組織列 7 値 → DIVISION のマッピングは §5.6.1 (PoC は backend taxonomy 解決を持たない簡略マッピングを採用)。値域全体は 21 種 (`_ddbj/flat-file.md` SSOT、HUM/PRI/ROD/MAM/VRT/INV/PLN/BCT/VRL/PHG/PAT/ENV/SYN/EST/TSA/GSS/HTC/HTG/STS/UNA/CON) だが `PAT` (特許機関経由) / `STS` / `UNA` / `CON` は PoC 対象外 | Step MSS (補助 pulldown) | `_ddbj/flat-file.md`, `_ddbj/data-categories.md` |
| MSS KEYWORDS / DATATYPE | INSDC FF メタフィールド (TPA 系 prefix 4 種 + HTG phase 3 種 + INSDC methodological keywords) | Step MSS (補助 notes、自動付与中心) | `_ddbj/file-format.md`, INSDC methodological keywords |
| Annotation / Feature 制約 | MSS data type 別の qualifier 制約 (mandatory / forbidden / recommended) | Step MSS (詳細補助) | `_ddbj/qualifiers.md` |
| JGA 準備物チェックリスト | 単一 `jga` ServiceKind の Step カードは PoC では **notes-only**、JGA 8 オブジェクト (Submission / Study / Sample / Experiment / Data / Analysis / Dataset / Policy) を 1 Step に集約 ([`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 6 共通)。XSD 準拠の pulldown / 入力欄は db-portal 側に持たず、JGA システム側で記入すべき項目を notes 箇条書きで案内 (Rule 6a / 6b / 6c の発火条件に応じて段階的に表示) | `jga` Step (notes) | `_jga/submission.md`、`https://github.com/ddbj/pub/tree/master/docs/jga` |

### 5.3.1 `functional-genomics ≠ yes` 時の Step pulldown 振り分け

| `functional-genomics` 値 | 出現する Step / pulldown |
|---|---|
| `wgs-target` | MSS Step (data type = WGS、`assembly-form=wgs` chip 既定) |
| `tsa-target` | MSS Step (data type = TSA、`assembly-form=tsa` chip 既定) |
| `metagenome-target` | MSS Step (data type ∈ {ENV, MAG, SAG}) |
| `variation-target` | TogoVar-repository (内部 Step、emerald-500) / EVA / dgVa (外部 Step、amber-500、案内のみ) を行の organism / access / variation-type に応じて生成 |
| `wes-target` | DRA Run のみ (関連 DB は研究内容次第) |
| `other` / 適用外 | ButtonType と他 chip 軸で自動決定 |

## 5.4 使い分けルール (列 / chip / pulldown)

判定基準 (本体 §5 と整合):

1. **テーブル列** (per-cell 編集): 全 ButtonType 共通で値があり、行間比較・一括編集が有用な Cross-DB Tag。3 軸固定 (organism / access / data-form)。
2. **行内 chip** (modal 確定): ファイル種別に紐づき、登録先 Service の集合 / 順序が変わる Cross-DB Tag だが、列にすると他種別で空が増えるもの。Group 構造で表現される情報 (pair-end / 10x / multiplex 等) は chip に含めない。**UI 表示は ButtonType の default 値と一致する chip を隠し、default からの逸脱だけを表示** する (本体 §5.2 「表示方針」 / 実装 `defaultPayload.ts` `DEFAULT_CHIP_VALUES`)。内部 state には全 chip を保持し Step 生成ロジックが参照する。
3. **Step カード pulldown** (Service 確定後): 値が変わっても Step 列の Service 集合は変わらないが、その Step 内の入力テンプレートが変わる Intra-DB Tag。Step カードを開いた中でのみ表示。

「chip 軸として持つか」と「UI に表示するか」は別判定:

- 軸として持つかは「Step 列の Service 集合 / 順序を変える」で従来通り判定 (主軸 7 + 従属 3 軸の構成は変えない)
- UI 表示は「default 値と異なるか」で別判定。default と一致する chip は **内部 state にはあるが画面には出ない**。これにより典型ケース (`assembled` = WGS、`sequence-read` = pair-end + GEA、`variation` = per-sample + snp-indel など) はテーブル右側が空欄となり、MAG / SAG / TPA / haplotype phased / SV / CNV / Xenium 等の非典型だけが chip で目立つ

境界事例:

- **MSS data type (WGS / TSA / TPA / ...)**: いずれも MSS Step に行くため Step 列は変わらない → **pulldown**。ただし TPA は `provenance=third-party` chip と組合せて取扱う。
- **TPA サブタイプ (`tpa-assembly` / `tpa-specialist-db`)**: いずれも MSS Step 内に閉じるが、DEFINITION 行 prefix と KEYWORDS の自動付与 (Rule 13) に直結し、`tpa-specialist-db` は受付しない案内 only Step に降格するなど Step 構造を変える → **従属 chip** (`provenance=third-party` 時のみ表示)。
- **per-sample / aggregate VCF (`variation-form`)**: per-sample → JGA Analysis (restricted human) or DRA Analysis (open)、aggregate → TogoVar (open human) or JGA Analysis (restricted human) と Step 列が変わる → **chip**。
- **`variation-type` (snp-indel / sv / cnv)**: 非ヒトで EVA vs dgVa が分岐、ヒト open で TogoVar SNP vs SV が分岐 → **chip**。
- **`haplotype-mode` (`phased`)**: BP Step が 1 → 複数 (Principal / Alternate / DRA 用 + Umbrella) に増え Step 列構成が変わる → **chip**。命名規則は MSS の ST_COMMENT / BP Title を切替えるため従属 chip `haplotype-naming` で表現。
- **`functional-genomics`**: 値によって GEA Step の有無 / 主要 DB が変わる (本体 §5.2 / 表 5.3.1) → **chip**。
- **`spatial-platform`**: ButtonType=`spatial-tx` 内で GEA Submission Type (Sequencing / Microarray) と DRA 二段の要否が切り替わる → **従属 chip** (Rule 4d)。
- **TogoVar-repository**: internal Step (badgeKind=internal、Rule 4 / Rule 12)、`eva` / `dgva` は external Step。表記揺れ防止のため本 docs では「TogoVar (内部)」「EVA (外部)」「dgVa (外部)」と統一する。

## 5.5 アクセッション prefix 一覧

Step カードに表示する accession 例示用。`FlowStep.issuedAccessionTypes` (配列) の controlled vocabulary は実装フェーズで `as const` 型として固定する。同 Step で複数 prefix を発行する DRA (Run + Experiment) や Haplotype の MSS (Principal + Alternate) は配列を 2 要素以上で持つ。

完全 SSOT 確定済み (11 体系):

| Service | 発行 prefix | 体系・出典 |
|---|---|---|
| `umbrella-bioproject` / `primary-bioproject` | `PRJDB` | Umbrella / Primary 共通。Haplotype 時は 4 BP 構成 (Principal / Alternate / DRA 用 / Umbrella) (`_bioproject/submission.md`, `_ddbj/haplotype.md`) |
| `biosample` | `SAMD` | 8 桁、例 `SAMD00000001` (`_biosample/submission.md`) |
| `dra` (Run / Experiment) | `DRR` (Run) / `DRX` (Experiment) | 1 Experiment = 1 BP + 1 BS。同 Submission 内で `DRA` (Submission) / `DRP` (Study) / `DRS` (Sample) も併発行 (INSDC SRA prefix SSOT: `_insdc/prefix.md`、書式: 3 文字 + 6 桁以上、例 `DRR000001`) |
| `dra` (Analysis) | `DRZ` | Analysis 単位 (`_dra/submission.md`、`_insdc/prefix.md`) |
| `mss` | INSDC 二文字 + 数字 (例 `AB######` 直接登録 / `AP######` ゲノムプロジェクト / `BA######` CON / `LC######` 直接登録)、大規模は INSDC 4 文字 (例 `BAAA-BZZZ` general WGS / `IAAA-IZZZ` TSA / `TAAA-TZZZ` TLS / `EAAA-EZZZ` TPA-WGS / `YAAA-YZZZ` TPA-TSA / `ZAAA-ZZZZ` TPA-TLS) | `_insdc/prefix.md`, `_insdc/accessions.md` |
| `gea` | `E-GEAD-n` (Experiment) / `A-GEAD-n` (Array Design) | 例 `E-GEAD-369`, `A-GEAD-246` (Xenium), `A-GEAD-247` (MERFISH) (`_gea/overview.md`, `_gea/spatial-gene-expression.md`) |
| `metabobank` | `MTBKS` (Study、桁数固定なし。`_metabobank/submission.md` 例は `MTBKS1` / `MTBKS1000`)。`FlowStep.issuedAccessionTypes` 上は `"MTBKSn"` (連番) と表示し桁数 placeholder にしない | 例 `MTBKS1` (`_metabobank/submission.md`)。Run / Analysis レベル prefix は MetaboBank 仕様上存在しない |
| `jga` (8 prefix を 1 Step に集約) | `JGA` (Submission, 6 桁) / `JGAS` (Study, 6 桁) / `JGAN` (Sample, 9 桁) / `JGAX` (Experiment, 9 桁) / `JGAR` (Data, 9 桁) / `JGAZ` (Analysis, 9 桁) / `JGAD` (Dataset, 6 桁) / `JGAP` (Policy, 6 桁)。`generateFlowCard` は単一 `jga` ServiceKind の Step 1 枚に集約し、`issuedAccessionTypes` 配列に 8 prefix を並べる (`dra` の Run+Experiment+Analysis 集約と同型、[`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.6) | `_jga/submission.md` |
| `togovar` (4 種) | `dstd` (Study, SNP/SV 共通) / `dss` (SNP variant) / `dssv` (SV variant call) / `dsv` (SV variant region) | `_togovar/submission.md`, `_togovar/metadata.md`。SNP ≤50 bp、SV >50 bp (CNV 含む)。BP + BS 登録必須 |
| `humandbs` (外部) | `hum######` 系 | NBDC ヒトデータ共有方針 (`_jga/submission.md` §データの公開) |

外部 Service の参考 prefix (リダイレクトのみで `issuedAccessionTypes` は空配列):

- `jpost`: `JPST` 系
- `eva`: `PRJEB` 系
- `dgva`: `estd###` (Study) / `nstd###` (NCBI dbVar 互換)

## 5.6 INSDC FF メタフィールド (DIVISION / KEYWORDS) の自動付与

MSS Submission の INSDC フラットファイルに記載される DIVISION / DATATYPE / KEYWORDS は DDBJ 側で自動付与が基本で、PoC UI でユーザーに明示入力させない。MSS Step カードの補助 pulldown には推測値を表示し、登録者が確認するだけに留める。

### 5.6.1 DIVISION 自動推測

ddbj/www `_ddbj/flat-file.md` で値域 21 種完全 SSOT (`_ddbj/data-categories.md` は新規受付可能な 16 種の subset)。PoC で対象とするのは新規受付可能な 16 種。`PAT` (特許機関経由、本体 §7.3) / `STS` / `UNA` / `CON` は PoC 対象外。

PoC は backend に NCBI Taxonomy 解決を持たないため、本表の「organism (NCBI Taxonomy ID) → 系統分類」は **テーブル列 `organism` の 7 値 → DIVISION の簡略マッピング** で代替する。詳細な taxonomy 同定 (PRI / ROD / MAM の細分など) は本番フェーズで backend 解決と併せて精緻化する (open-questions §10.2)。

`TSA` は `_ddbj/flat-file.md` L.170 で DIVISION として独立に存在 (transcriptome shotgun assemblies、再構成された mRNA 配列)。`assembly-form=tsa` 行は DIVISION=TSA + DATATYPE=TSA の組合せで MSS Step に降りる。

PoC の `organism` 7 値 → DIVISION の簡略マッピング:

| `organism` 列値 | DIVISION 既定 | 補助 pulldown で切替可能な値 |
|---|---|---|
| `human` | `HUM` | (なし、固定) |
| `eukaryote` | `MAM` (デフォルト、ユーザー側 sample で選択) | `PRI` / `ROD` / `VRT` / `INV` / `PLN` |
| `prokaryote` | `BCT` | (なし、固定) |
| `virus` | `VRL` | `PHG` (bacteriophage の場合) |
| `metagenome` | `ENV` | (なし、固定) |
| `human-microbiome` | `ENV` (`environmental_sample` qualifier 必須) | (なし、固定)。**access=restricted の human-microbiome は Rule 6 で MSS Step が抑制されるため DIVISION 設定は無効** (JGA chain に集約)。open の human-microbiome のみ DIVISION=ENV が有効 |
| `organelle-plasmid` | (生物由来の DIVISION + specialized MSS routing) | sample の親生物に依存 |

| 自動推測ロジック | DIVISION 値 | 確定 chip / 入力 | 出典 |
|---|---|---|---|
| 列 `organism` → 上記簡略マッピング | `HUM` / `PRI` / `ROD` / `MAM` / `VRT` / `INV` / `PLN` / `BCT` / `VRL` / `PHG` (生物由来 10 種) | テーブル列 `organism` + Step MSS 補助 pulldown で確認 / 切替 | `_ddbj/data-categories.md` L.25「由来する生物の系統分類に基づいて自動的に DIVISION に振り分けられます」, `_ddbj/flat-file.md` |
| `organism ∈ {metagenome, human-microbiome}` + `provenance ≠ third-party` | `ENV` | 列 organism + 列 data-form (analysis-output / assembled) で確定。MSS Step カード補助フィールドで `environmental_sample` qualifier 入力必須を案内 | `_ddbj/data-categories.md` L.40-47、`_ddbj/qualifiers.md` `environmental_sample` |
| `assembly-form=est` | `EST` | + 組み立て済み配列 modal のアセンブリ種別で EST 選択 | `_ddbj/data-categories.md`, `_ddbj/est.md` (EST は常に MSS、experiment-scale 不問) |
| `assembly-form=tsa` | `TSA` (DIVISION) + DATATYPE=`TSA` | + 組み立て済み配列 modal で「Transcriptome assembly (TSA)」選択 | `_ddbj/flat-file.md` L.170, `_ddbj/tsa.md` |
| `assembly-form=tls` | DIVISION は生物由来 10 種から推測 (TLS は DIVISION でなく **DATATYPE 値**、`_ddbj/flat-file.md` L.381 の Bulk sequence data 系列) + DATATYPE=`TLS` | + 組み立て済み配列 modal で「16S/COI などマーカー (TLS)」選択 | `_ddbj/data-categories.md`, `_ddbj/tls.md` |
| `assembly-form ∈ {wgs, gnm}` | 生物由来 10 種 (organism で自動振り分け) | + 組み立て済み配列 modal の data type pulldown | `_ddbj/data-categories.md`, `_ddbj/wgs.md`, `_ddbj/finished_level_genome.md` |
| `assembly-form ∈ {mag, sag}` | `ENV` (metagenome 系) | + 組み立て済み配列 modal で MAG / SAG 選択 + 列 organism = metagenome | `_ddbj/metagenome-assembly.md`, `_ddbj/single-amplified-genome.md` |
| `assembly-form=htg` / `htc` | `HTG` / `HTC` (HTG は phase0/1/2 を KEYWORDS 行に記載) | + 組み立て済み配列 modal の data type pulldown | `_ddbj/data-categories.md`, `_ddbj/htg.md`, `_ddbj/htc.md`, `_ddbj/flat-file.md` |
| `assembly-form=gss` | `GSS` (Genome Survey Sequence) | + 組み立て済み配列 modal の「Genome Survey (GSS)」選択 (本体 §7.1 PoC 拡張) | `_ddbj/flat-file.md`, `_ddbj/data-categories.md` |
| `assembly-form=syn` | `SYN` (合成配列) | + 組み立て済み配列 modal の「合成配列 (SYN)」選択 (本体 §7.1 PoC 拡張) | `_ddbj/data-categories.md`, `_ddbj/flat-file.md` |
| `assembly-form ∈ {misc, ask}` | DIVISION は生物由来 10 種から推測 (MISC / ASK は DIVISION でなく **DATATYPE 値**、Curator 判断待ち fallback) + DATATYPE=`MISC` / `ASK` | + 組み立て済み配列 modal の data type pulldown「その他」 | `_ddbj/data-categories.md` |

ButtonType (9 種) ↔ DIVISION マッピングの詳細は [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) に集約。

### 5.6.2 KEYWORDS の controlled vocabulary

INSDC エントリの `KEYWORDS` 行は、TPA 系 (`_ddbj/tpa.md`) の自動付与 DEFINITION prefix 4 種 (`TPA:` / `TPA:assembly.` / `TPA:experimental.` / `TPA:inferential.`、ただし `experimental` / `inferential` は 2025 年 1 月以降受付停止) と HTG phase (`HTG_PHASE0` / `HTG_PHASE1` / `HTG_PHASE2`) を除いて、外部 SSOT [INSDC agreed methodological keywords](https://insdc.org/submitting-standards/methodological-keywords/) を参照する。

PoC 方針:

- 自動付与: TPA 系と HTG phase
- 残りの methodological keywords (例 `Targeted Locus Study (TLS)` / `GSS` 等) は MSS Step カード補助フィールドで「INSDC methodological keywords を参照して任意追加」と案内、controlled vocabulary 化は実装フェーズに残す
- DATATYPE は `assembly-form` chip から自動推測 (WGS / TSA / TLS / EST 等)
