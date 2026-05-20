# 登録ナビゲーション v3 — 登録フローカード生成ロジック

[`docs/submit-alt3.md`](./submit-alt3.md) (本体) のサブ仕様。Section A のテーブル (列 + chip + Group) から Section B の Step 列を動的合成するロジック。SSOT は本ファイル + `src/lib/mock-data/submit-alt3/flowGeneration.ts` (新設予定) に置く。

クロスリファレンス:

- 入力 `Submission` モデルと出力 `FlowCard` / `FlowStep` の型 → [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.4 / §4.6
- GroupType ↔ BS 集約ルール → [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.3.1
- 列 / chip / pulldown の値域と振り分け影響 → [`submit-alt3-tags.md`](./submit-alt3-tags.md)
- 各 modal で確定する chip → [`submit-alt3-modals.md`](./submit-alt3-modals.md)
- Rule × PoC 対応マッピング → 本体 §7.1.1

純粋関数 `generateFlowCard(submission: Submission): FlowCard` で実装する。Submission 内に派生マップ (`bsToGroupIds` / `bpToBsIds`) は持たず、`BioSampleDraft.sourceGroupIds` 等の正準フィールドから都度算出する。

## 8.1 生成ルール

### Rule 1: Primary BioProject Step

研究単位ごとに 1 primary BP を生成する。混在ケース (本体 §5.1 で許容) では tag 組合せで研究単位を判定し、必要なら複数 primary BP に分割する (Rule 2 で Umbrella BP に統括される)。

```
service: "primary-bioproject"
issuedAccessionTypes: ["PRJDB#####"]
upstreamStepIds: []
```

Project data type は ButtonType / 列 organism / data-form / chip から推測。同 BP に複数行が紐づくとき、各行から候補値を求めた後、以下の優先順序で BP に 1 値を確定する (純粋関数化のため、上から順に最初にマッチした条件を採用):

1. `variation` ButtonType がある → **Variation**
2. `mass-spec` ButtonType がある + `mass-spec-domain=proteomics` → **Proteome**
3. `mass-spec` ButtonType がある + `mass-spec-domain ∈ {metabolomics, imaging}` → **Other** (MetaboBank 専用)
4. `phenotype` ButtonType のみ → **Phenotype and Genotype**
5. `expression-array` / `expression-matrix` / `spatial-tx` ButtonType がある → **Transcriptome or Gene Expression**
6. chip `functional-genomics=metagenome-target` (data-form=raw / assembled 不問) → **Metagenome**
7. data-form=assembled + chip `assembly-form ∈ {tsa, htc, est}` → **Transcriptome or Gene Expression**
8. data-form=assembled + chip `assembly-form=tls` → **Targeted Locus**
9. data-form=assembled + chip `assembly-form=gss` → **Random Survey**
10. data-form=assembled + chip `assembly-form ∈ {wgs, gnm, htg}` → **Genome Sequencing**
11. data-form=raw + chip `functional-genomics=wes-target` → **Exome**
12. data-form=raw + organism ∈ {prokaryote, eukaryote, virus, organelle-plasmid, human, metagenome} → **Genome Sequencing** (metagenome は 6 で先に拾われる)
13. 上記いずれでもない (`syn` / `misc` / `ask` / unknown 等) → **Other**

混在ケース (host-pathogen のように複数 organism 系統が並立) では Step を 2 つ以上に分割 (Rule 5)。例: human host + microbe pathogen → primary BP × 2 (Mammalia 系 / Bacteria 系)。

**対象行 0 個のケース**: Rule 6 集約で全行 restricted human / human-microbiome の場合、Rule 1 は Step を生成しない (`Submission.primaryBioProjects` が空配列、§4.4.1)。

### Rule 2: Umbrella BioProject Step (複数 primary BP 統括時)

`primaryBioProjects.length >= 2` の場合、Section B のトップに Umbrella BP Step を生成する。Umbrella は非公開化不可、Primary は Hold 可 (本体 §6.3、ddbj/www `_bioproject/submission.md`)。

```
service: "umbrella-bioproject"
issuedAccessionTypes: ["PRJDB#####"]
upstreamStepIds: []
notes: ["host-pathogen / multi-modal 研究のため上位 Umbrella を提案"]
```

発火条件:

- 列 organism に明確に異なる系統が混在 (例: Mammalia + Bacteria, Eukaryote + Virus)
- haplotype-mode=phased で Principal BP + Alternate BP の 2 系統が並立
- 複数の独立した研究目的が同 Submission 内に存在

Umbrella BP が生成された場合、各 primary BP の `upstreamStepIds` に Umbrella BP の Step id が追加される (accession 未発行時は仮 ID 参照、§4.6)。

### Rule 3: BioSample Step

GroupType 別の集約ルールに従って BS を生成する (詳細表は [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.3.1):

- `single` / `pair-end` / `10x` / `pacbio-hdf5` / `two-color` / `hybrid` / `imaging-ms` / `assembly-annotation` → Group 全体で 1 BS
- `multiplex` → per-sample FASTQ 行ごとに 1 BS (N メンバ → N BS)
- `variation-ref` (variation-form=per-sample) → per-sample VCF 行ごとに 1 BS。`variation-ref` (variation-form=aggregate) → 1 BS
- `mage-tab` → Group 内 raw / processed の sample 集合ごとに 1 BS
- `mag-sag-chain` → 段階別に複数 BS (raw + primary が 1 BS、binned + MAG/SAG は派生 BS × N、Rule 8c の derived_from 連鎖)
- `jga-dataset` → JGA Sample (個人単位、Rule 6a の per-row 集約)
- Haplotype phased (assembly-annotation / single 等の上に乗る) → 共通 BS 1 個 (Principal / Alternate / DRA 用 BP の参照先共通、Rule 11a)

各 BS の Package はテーブル列 organism から推測 (ddbj/www `_biosample/overview.md` + `_biosample/sample-info.md` の 22 種 SSOT)。内部キー (kebab-case、tags.md §5.3) と SSOT 表示名は併記:

| 列 organism | BS Package デフォルト (内部キー / 表示名) | 代替 (Step BS pulldown で切替) | 補足 |
|---|---|---|---|
| `human` | `human` / `Human` (Standard) | — | ヒト試料は Standard Human Package |
| `human-microbiome` | `mims-me` / `MIMS.me` (MIxS) | `migs-ba` / `mimarks-survey` 等 | ヒト由来でもメタゲノム由来は MIxS。Rule 6 (JGA 集約) 発火時は BS Step は JGA Sample に置き換え |
| `eukaryote` (non-human) | `model-organism-or-animal` / `Model organism or animal` | `plant` / `invertebrate` / `pathogen-cl` (寄生虫など病原真核) | 動植物・モデル生物は分類で複数候補。**動物 / 植物 / 菌類で qualifier 系が分岐** する (動物=`breed` / `strain` / `isolate`、植物=`cultivar` / `ecotype`、菌類=`strain` / `isolate`)。`microbe` Package も真核菌類 (酵母など) で利用可。病原性の真核生物は `Pathogen: clinical or host-associated` も選択肢 |
| `prokaryote` | `microbe` / `Microbe` (Standard) | `pathogen-cl` / `pathogen-env` / `beta-lactamase` | 培養細菌・古細菌。公衆衛生に関わる病原菌は Pathogen 系を選択 |
| `virus` | `viral` / `Viral` (Standard) | `sars-cov-2-cl` / `sars-cov-2-wwsurv` / `pathogen-cl` (病原ウイルス) | 病気に直接関係しないウイルスのみ Viral。病原ウイルスは `Pathogen: clinical or host-associated`、SARS-CoV-2 は専用 Package (ddbj/www `_biosample/overview.md`) |
| `metagenome` | `mims-me` / `MIMS.me` (MIxS) | `mimag` (MAG) / `misag` (SAG) / `mimarks-survey` (marker gene survey) / `mimarks-specimen` (specimen marker) | Rule 8 MAG/SAG chain で段階分け |
| `organelle-plasmid` | (専門 MSS routing) | — | オルガネラ・プラスミドは MSS specialized 経路 |

#### Rule 3a: Pathogen 系 4 Package + Viral デフォルト切替のユーザー明示選択 UX

organism 列だけでは決まらない **Pathogen 系 4 Package + Viral デフォルト** (内部キー: `pathogen-cl` / `pathogen-env` / `sars-cov-2-cl` / `sars-cov-2-wwsurv` の 4 Pathogen 系 + 病原ウイルス判定時に `viral` デフォルトから上記への切替) は Step BS カード上で **ユーザーが明示選択** する。デフォルト Package (上表) に対する切替フローを下記とする。

1. **virus / prokaryote / eukaryote 行ごとに Step BS カードに Q&A プロンプト** を出す:

   ```
   このサンプルは公衆衛生に関わる病原体ですか?
   (o) いいえ (デフォルト Package を使用)
   ( ) はい — Pathogen 系 Package へ切替
   ```

2. **「はい」選択時の補助 Q&A** (organism 値で分岐):

   - **organism=virus + 病原性 yes**:
     ```
     SARS-CoV-2 ですか?
     (o) いいえ → Package=Pathogen.cl
     ( ) はい (臨床/宿主由来) → Package=SARS-CoV-2.cl
     ( ) はい (廃水サーベイランス) → Package=SARS-CoV-2.wwsurv
     ```
   - **organism=prokaryote + 病原性 yes**:
     ```
     検体由来は?
     (o) 臨床検体 / 宿主由来 → Package=Pathogen.cl
     ( ) 環境 / 食品 / その他 → Package=Pathogen.env
     ```
   - **organism=eukaryote + 病原性 yes** (寄生虫など): `Pathogen.cl` を提示

3. **逆方向のヒント**: organism=virus でデフォルト `Viral` を選択中の Step BS カードに「**病原性 SARS-CoV-2 / 病原ウイルスは Pathogen.cl または SARS-CoV-2.cl/wwsurv** を使ってください」という controlled vocabulary 由来の info notes を表示する (ddbj/www `_biosample/overview.md` line 73 「病気に直接関係しないウイルス。病原ウイルスには Pathogen: clinical or host-associated を使います」の規程準拠)。

4. **organism / Package 整合性ヒント**:
   - `Pathogen.cl` / `Pathogen.env` 選択時は organism が `virus` / `prokaryote` / `eukaryote` (病原真核) のいずれか
   - `SARS-CoV-2.cl` / `SARS-CoV-2.wwsurv` 選択時は organism=`virus` で固定 (mismatch なら Rule 14 と同様の warning)

Step BS カードでの選択結果は Step 列の他 Step (DRA / MSS / GEA 等) には影響しない (Package は Step BS 内の controlled vocabulary、Rule 4 の振り分けは列 organism / access / data-form で決まる)。

必須属性 (`_biosample/overview.md`): `geo_loc_name` / `collection_date`。提供不可な場合は INSDC missing value reporting に従う。

```
service: "biosample"
issuedAccessionTypes: ["SAMD#####"]
upstreamStepIds: [<primary-bp Step の id>]
```

### Rule 4: 列 (organism / access / data-form) + ButtonType ごとの主要 Step 振り分け

per-row で列値 + ButtonType + chip の組合せから Step を生成する。混在は許容、tag 組合せが変わる行ごとに分岐する。

`generateFlowCard` の判定は `FileEntry.buttonType` を主要キーの 1 つとして使う (data-form 初期値が ButtonType で決まるため両者は強相関だが、ユーザーが data-form を per-cell 編集できる以上、最終振り分けは ButtonType + data-form + chip 値の組合せで決まる)。

判定の優先順序 (純粋関数として一意化のため):

1. **Rule 6 集約モード判定**: `organism ∈ {human, human-microbiome}` + `access=restricted` の行は Rule 6a / 6b の JGA chain (`jga-*` ServiceKind) に振り分け、本表の通常分岐は適用しない
2. **ButtonType=`mass-spec`**: 行の `mass-spec-domain` chip 値で `jpost` / `metabobank` 振り分け (本表内)、他 Rule の判定対象外
3. **ButtonType=`variation`**: `variation-form` / `variation-type` + organism + access の組合せで `dra` / `togovar` / `eva` / `dgva` 振り分け (本表内)
4. **ButtonType=`spatial-tx`**: 従属 chip `spatial-platform` で `gea` Sequencing / Microarray 振り分け (Rule 4d)
5. **ButtonType=`expression-array` / `expression-matrix`** + `functional-genomics=yes` 固定: `gea` 振り分け
6. **ButtonType=`assembled` / `annotation`**: `provenance=third-party` なら Rule 7 系、それ以外は MSS 系
7. **ButtonType=`sequence-read`** + chip `functional-genomics` 値で分岐 (本表 / Rule 4b)
8. **ButtonType=`phenotype`**: Rule 10 (JGA Dataset or BS 属性)

本表は Rule 6 集約対象外の行に対する分岐 (= JGA 集約から外れる open 行 or 非 human 行):

| 行の列値 / chip | functional-genomics 制約 | 追加 Step | 依存 |
|---|---|---|---|
| data-form=raw (sequencing 系) | `yes` | `gea` (Submission Type=Sequencing) + `dra` (Run) | BP + BS + DRA |
| data-form=raw (microarray) | `yes` | `gea` (Submission Type=Microarray) | BP + BS (DRA 不要) |
| data-form=raw | `wgs-target` / `tsa-target` / `metagenome-target` | `dra` (Run) + 対応 MSS Step (Rule 4b) | BP + BS |
| data-form=raw | `variation-target` / `wes-target` / `other` | `dra` (Run) のみ | BP + BS |
| data-form=analysis-output | (任意) | `dra` (Analysis) | BP + BS + DRA Run (任意) |
| data-form=assembled | `functional-genomics ≠ yes` (= `wgs-target` / `tsa-target` / `metagenome-target` 等) | `mss` (Rule 4b 細分) | BP + BS (+ DRA Run if raw also present) |
| data-form=matrix | `yes` | `gea` | BP + BS |
| data-form=matrix | `functional-genomics ≠ yes` | (発生しない、`expression-matrix` / `spatial-tx` ButtonType は `functional-genomics=yes` 固定。`assembled` ButtonType でユーザーが手動で data-form=matrix に変更した不整合は Rule 14 warning) | — |
| data-form=annotation + provenance=primary | (任意、自動 `other`) | (独立 Step なし、`assembly-annotation` Group の FASTA 側 MSS Step に統合) | MSS Step (アセンブリ側) |
| data-form=annotation + provenance=third-party | (任意、自動 `other`) | Rule 7c (MSS-TPA annotation、PoC は notes-only Step) | BP + BS |
| spatial-tx + 従属 chip `spatial-platform=visium` / `stereo-seq` / `slide-seq` | `yes` (自動) | `gea` (Sequencing) + `dra` (Run) | BP + BS + DRA |
| spatial-tx + 従属 chip `spatial-platform=xenium` / `merfish` | `yes` (自動) | `gea` (Microarray、Array Design 指定、Rule 4d) | BP + BS (DRA 不要) |
| spatial-tx + 従属 chip `spatial-platform=geomx` + `FileGroup.referenceMeta.geomxReadout="ngs"` | `yes` (自動) | `gea` (Sequencing) + `dra` (Run) | BP + BS + DRA |
| spatial-tx + 従属 chip `spatial-platform=geomx` + `FileGroup.referenceMeta.geomxReadout="ncounter"` | `yes` (自動) | `gea` (Microarray) | BP + BS (DRA 不要) |
| chip mass-spec-domain ∈ {metabolomics, imaging} | (任意) | `metabobank` | BP + BS |
| chip mass-spec-domain=proteomics | (任意) | `jpost` (外部、BP は jPOST 側で管理) | (依存なし、Rule 1 の Primary BP 生成も抑制) |
| chip variation-form=per-sample + 非 JGA 集約対象 | `variation-target` (自動) | `dra` (Analysis) | BP + BS |
| chip variation-form=aggregate + organism=human + access=open + chip variation-type=snp-indel | `variation-target` (自動) | `togovar` (内部、SNP ≤50 bp、`dstd` Study + `dss` Variant) | BP + BS |
| chip variation-form=aggregate + organism=human + access=open + chip variation-type ∈ {sv, cnv} | `variation-target` (自動) | `togovar` (内部、SV >50 bp、`dstd` + `dssv` + `dsv`) | BP + BS |
| variation + organism ∉ {human, human-microbiome} + chip variation-type=snp-indel | `variation-target` (自動) | `eva` (外部、案内 only) | BP + BS |
| variation + organism ∉ {human, human-microbiome} + chip variation-type ∈ {sv, cnv} | `variation-target` (自動) | `dgva` (外部、案内 only) | BP + BS |
| data-form=phenotype + open or 非 human | `other` (自動) | (独立 Step なし、BS 属性として吸収、Rule 10b) | BP + BS |

#### Rule 4a: GEA の raw / processed 二段構造

`gea` Step が追加される場合 (Submission Type=Sequencing)、その前段に必ず `dra` (Run) Step が存在する (`_gea/submit-sequence.md` SSOT)。Microarray / Xenium はこの限りでなく、raw が array-image / Spaceranger 出力 で GEA に直接登録される。

#### Rule 4b: chip `functional-genomics ≠ yes` のときの GEA Step 抑制

chip `functional-genomics ≠ yes` の場合、data-form が raw / matrix でも GEA Step は生成しない。代わりに値に応じて主要 DB Step を生成する:

| chip `functional-genomics` 値 | 追加 Step | 依存 |
|---|---|---|
| `wgs-target` | `mss` (data type=WGS) | BP + BS + DRA Run |
| `tsa-target` | `mss` (data type=TSA) | BP + BS + DRA Run |
| `metagenome-target` | `mss` (data type ∈ {ENV, MAG, SAG}) | BP + BS + DRA Run |
| `variation-target` | ButtonType で挙動が分岐 (下記の注記) | BP + BS (+ DRA Run / Analysis ButtonType に応じて) |
| `wes-target` | `dra` (Run) のみ (関連 DB は研究内容次第) | BP + BS |
| `other` | `dra` (Run) + DDBJ チーム相談 notes | BP + BS |

**`variation-target` の ButtonType 別挙動**:

- **ButtonType=`variation`** (VCF 行): `togovar` (内部) / `eva` / `dgva` (外部) のいずれかに振り分け (chip `variation-form` / 列 organism / chip `variation-type` で確定、Rule 4 本表)。BP + BS + 当該 Step が並ぶ
- **ButtonType=`sequence-read`** + Q1=no Q2=「変異情報 (variation / CNV)」 (raw FASTQ で variation 解析が目的): `dra` (Run) のみ生成。`togovar` / `eva` / `dgva` は生成しない (raw 配列単体では variation DB に登録できない、解析結果 VCF は別行で + 変異情報 ButtonType として追加する想定)。Step DRA カード notes に「解析結果 VCF を別途 + 変異情報で追加し、TogoVar / EVA / dgVa Step に流す」案内
- **ButtonType=`assembled`** + chip `variation-target` 手動上書き (稀): generateFlowCard は警告のみ (Rule 14 と同様 warning「assembled + variation-target は通常想定外」)、`dra` Step は生成しない

`wes-target` も同様に ButtonType=`sequence-read` の Q2 由来。WES (Whole Exome Sequencing) は raw FASTQ を DRA Run に登録するだけで、解析結果 (gene variant) は別行で variation ButtonType として追加する。

#### Rule 4c: MetaboBank accession 仕様 (Study レベルのみ)

`metabobank` Step (chip `mass-spec-domain ∈ {metabolomics, imaging}` 行) の accession 型は **Study レベル `MTBKSn` のみ** (ddbj/www `_metabobank/submission.md` §アクセッション番号 SSOT。「Study に対して以下の形式のアクセッション番号が発行されます: MTBKSn (例 MTBKS1)」)。

```
service: "metabobank"
issuedAccessionTypes: ["MTBKSn"]
upstreamStepIds: [<primary-bp Step の id>, <biosample Step の id>]
```

- **MetaboBank には Run / Analysis レベル accession は存在しない**。複数の測定 (LC-MS / GC-MS / NMR 等) を含む研究は **Study を分けて登録** し、関連 Study は BioProject でまとめる (`_metabobank/submission.md` line 45 SSOT、「実験デザインが異なるデータは Study を分けて登録します。関連する Study は BioProject でまとめます。例 BioProject PRJDB100 - MTBKS1000 (LC-MS), MTBKS1001 (GC-MS)」)
- `Comment[MetaboBank accession]` は SDRF / IDF に `MTBKSn` を MetaboBank 側で記入する仕様 (`_metabobank/metadata.md` line 48-49)
- 関連 DB (MB:MTBKS / Metabolonote:SE 等) への参照は `Comment[Related accession]` フィールドで `DB:ID` 形式で記述

#### Rule 4d: 空間 Tx 未収録プラットフォームの Array Design 経路

`spatial-tx + Stereo-seq / Slide-seq / GeoMx` の場合、ddbj/www `_gea/spatial-gene-expression.md` に専用 Array Design (A-GEAD-XXX) の SSOT 記載がない。PoC では Step GEA カードに以下を表示:

- **Submission Type 暫定値** (ddbj/www `_gea/spatial-gene-expression.md` に記載なし、PoC 暫定):
  - Stereo-seq → Sequencing (sequencing-based のため、Visium と同じ二段)
  - Slide-seq → Sequencing
  - GeoMx → NGS readout なら Sequencing、nCounter readout なら Microarray
- **Array Design**: 「未収録」表示 + 「新規 Array Design 登録は DDBJ Contact 経由」案内
- **DDBJ Contact URL**: [`https://www.ddbj.nig.ac.jp/contact-ddbj-e.html`](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) を Step カード notes に表示 (新規 Array Design 登録は ADF ファイルを GEA submission directory にアップロード、`_gea/adf-e.md` 参照)
- **代替案内**: 画像データなどで GEA 受入不可となる場合は **Generalist archive** (Zenodo / Figshare 等) を案内 (`_gea/spatial-gene-expression.md` MERFISH 記述「画像ファイルおよび .vzg ファイルは GEA でアーカイブできない、Generalist archive 推奨」と同型運用)

### Rule 5: 混合ケース Step 分岐

本体 §5.1 / §6.3 で混在許容。1 研究内で行ごとに列 / chip 値が異なる場合、Section B には tag 組合せごとに異なる Step が並列で表示される。

**primary BP 数の判定ロジック**:

1. テーブル全行の `organism` 値を集合化 (organism 7 種のうち実際に存在するもの)
2. 集合が単一 (例: 全行 `human`) → primary BP は 1 個
3. 集合が複数 (例: `human` + `prokaryote`) → 系統距離が大きい (Mammalia + Bacteria、Eukaryote + Virus 等) と判定される組合せは **organism 値ごとに primary BP を分割**
4. 系統距離が小さい (例: `eukaryote` 内で human + mouse) は 1 BP で共通系統対応 (ddbj/www `_bioproject/project-info.md` で複数生物 BP は共通系統で対応)
5. primary BP が 2 個以上に分かれた場合は Rule 2 (Umbrella BP) が自動発火

| `organism` 値の混在 | 系統距離 | primary BP 数 |
|---|---|---|
| 単一値 (例: 全行 human、全行 prokaryote) | — | 1 |
| `human` + `eukaryote` (mouse 等) | 真核同士で近い | 1 (共通系統 = Mammalia / Eukaryote) |
| `human` + `human-microbiome` | host-microbiome 並立 | 2 (Mammalia + Bacteria 系) |
| `eukaryote` + `prokaryote` | 真核 + 原核 | 2 |
| `eukaryote` + `virus` | 真核 + ウイルス (host-pathogen) | 2 |
| `prokaryote` + `virus` | 原核 + ウイルス | 2 |
| `human` + `prokaryote` (host-pathogen) | Mammalia + Bacteria | 2 |
| `metagenome` + 任意の単一 organism | 環境 + 単一生物 (混合 / 派生研究) | 2 |
| `organelle-plasmid` + 任意の organism | オルガネラ MSS specialized + 本体 organism | 2 |

加えて、**chip `haplotype-mode=phased`** がある場合は Rule 11a の通り Principal BP / Alternate BP / DRA 用 BP の最大 3 個に分かれ、Umbrella BP が自動発火する。

例 (host-pathogen 研究):

- 行 1-3: organism=human + access=restricted + data-form=raw (host)
- 行 4-6: organism=prokaryote + access=open + data-form=raw (pathogen)

→ Section B:

```
Step 0: Umbrella BioProject (host-pathogen 統括、Rule 2)
Step 1: Primary BioProject (Mammalia)              — host 系用
Step 2: Primary BioProject (Bacteria)              — pathogen 系用
Step 3: JGA Sample × 3                              — host (restricted human)
Step 4: BioSample × 3                               — pathogen (open prokaryote)
Step 5: JGA Data (host raw)                         — Rule 6 集約
Step 6: DRA Run (pathogen raw)                      — Rule 4
```

例 (混合公開可否):

- 行 1: organism=mouse + access=open
- 行 2: organism=human + access=restricted

→ mouse 用 primary BP 1 個 + DRA Run (open mouse) + JGA chain (restricted human、BP / BS 抑制)。Rule 5 + Rule 6 組合せに従い primary BP 数判定は open 行集合 (= mouse 1 行) のみで評価されるため、primary BP は 1 個、Umbrella BP は出ない。

### Rule 6: JGA 集約モード (restricted human / human-microbiome)

`organism ∈ {human, human-microbiome}` + `access=restricted` の行が 1 件でもある場合、それらの行に関連する Step を JGA 系に集約する。`human-microbiome` を含めるのは DDBJ FAQ の「ヒト由来メタゲノム = JGA 対象」規程に従う (ddbj/www `_jga/submission.md`)。

#### Rule 6 前提: DBCLS 事前申請 + 提供申請グループ

ddbj/www `_jga/submission.md` + `_jga/group.md` + `_jga/submission-step.md` SSOT。JGA は単独では登録できず、**DBCLS (Database Center for Life Science) の NBDC ポリシー下で承認された利用制限ポリシー** が前提。

申請システム: `https://humandbs.ddbj.nig.ac.jp/nbdc/application/`。申請単位は **「提供申請グループ」** (DDBJ アカウントをメンバーとするグループ、subgrp ID 例 `subgrp5352` が割り振られる、研究代表者 + 登録実務担当者を含む)。

PoC では Step 0 として外部リダイレクト (申請システム URL) の notes-only Step を生成する。HumanDBs データ閲覧側のリンクは `https://humandbs.dbcls.jp/`。

#### Rule 6 共通: JGA Step カードの「外部誘導」方針 + 単一 Step 集約 (PoC)

JGA は **D-way ではなく独自の申請・登録系統**である (`_jga/submission.md` / `_jga/submission-step.md` SSOT)。承認後の実体は (1) NBDC 申請システム (`https://humandbs.ddbj.nig.ac.jp/nbdc/application/`) + (2) 承認後に sftp / WinSCP で JGA サーバへ直接 upload + (3) JGA 独自 XML スキーマ (`https://github.com/ddbj/pub/tree/master/docs/jga`) という構成で、db-portal が同じ UI を再実装する経路は PoC スコープ外。

さらに JGA 8 オブジェクト (Submission / Study / Sample / Experiment / Data / Analysis / Dataset / Policy) は **すべて同一の JGA 申請管理システム 1 箇所** で登録するため、Step を 8 枚に並べる必然性はない。`dra` Step が Run + Experiment + Analysis を 1 Step に集約しているのと同じ方針で、PoC では **JGA も単一 `jga` ServiceKind 1 Step に集約する**:

- `serviceUrl`: JGA 案内ページ (`https://www.ddbj.nig.ac.jp/jga/submission.html`)
- `notes`: JGA 8 オブジェクトの準備物チェックリスト (Submission / Study / Sample / Experiment / Data / Analysis / Dataset / Policy) を Rule 6a / 6b / 6c の発火条件に応じて段階的に表示
- `intraDbInputs`: 空 `{}` (XSD 準拠の pulldown / 入力欄は持たない、`serviceDrafts["step-jga"]` は採番されない)
- `issuedAccessionTypes`: 8 prefix (`JGA######` / `JGAS######` / `JGAN#########` / `JGAX#########` / `JGAR#########` / `JGAZ#########` / `JGAD######` / `JGAP######`) を `dra` Step と同型の配列で 1 枚に並べる
- `targetGroupIds` / `targetFileIds`: Rule 6 集約対象の全行 / 全 Group を 1 Step に集約
- `upstreamStepIds`: `["step-dbcls-application"]`
- `warnings`: 通常通り (テーブル未設定 cell / Rule 14 chip 整合の警告も従来通り表示)
- `badgeKind`: `internal` (DDBJ 運営、本体 §6.2)

XSD フィールド mapping を Step カード上で扱う本格実装、および 8 Step に再分割する必要性は本番フェーズで再評価する (open-questions §10.2 / §10.4 参照)。

`dbcls-application` (Step 0) はもともと `external` badgeKind + notes-only であり (本体 §6.2)、これは現状維持。

#### Rule 6a: Sample-Experiment-Data チェーン (raw 配列データ系)

raw 配列 (dataForm=raw) を含むケース。単一 `jga` Step の notes に以下 6 オブジェクトの準備物チェックリストを乗せる (Submission / Study / Sample / Experiment / Data / Dataset / Policy)。実体は JGA 申請管理システム側で順に登録:

```
Step 0: DBCLS 事前申請 + ポリシー承認  (service=dbcls-application、外部、notes のみ)
Step 1: JGA                            (service=jga、notes-only、issuedAccessionTypes に 8 prefix を並べる)
  notes (Rule 6a 発火時):
    - jgaPrep.overview
    - jgaPrep.submission  → JGA######          (Submission 1 件)
    - jgaPrep.study       → JGAS######         (Study 1 件)
    - jgaPrep.sample      → JGAN######### × N  (個人ごと、JGA システム側で N 件登録)
    - jgaPrep.experiment  → JGAX######### × N  (Experiment、JGA システム側で記入)
    - jgaPrep.data        → JGAR######### × N  (raw 配列ファイル単位、sftp/WinSCP で upload)
    - jgaPrep.dataset     → JGAD######         (Dataset、束ねる Sample / Data の一覧を準備)
    - jgaPrep.policy      → JGAP######         (Policy、subgrp ID + DAC / DUO)
```

**JGA Sample 数 N の決まり方** (本体 §4.4「1 file = 1 sample 原則」と整合)。db-portal は N を厳密に計算せず、jgaPrep.sample notes に「個人ごとに 1 Sample。実体は JGA システム側で N 件登録」と汎用案内するに留める:

- raw 配列ありの典型ケース: BioSample 数の決定ルール ([`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.3.1) と同じ N に相当 (Group 1 個 → 1 個人 → 1 JGA Sample、multiplex は per-sample FASTQ ごとに 1)
- per-sample VCF / 個別 array / 個別 metabolomics: 行ごとに 1 JGA Sample
- aggregate VCF / 集計 array: Section A から N が一意に決まらない
- phenotype-only Dataset (Rule 6c 経路): pheno.tsv の中身を解析しないと N が決まらない

N 個別の入力フィールドや「JGA Sample #1 / #2 / ... / #N」リスト UI は db-portal 側で持たない (実体は JGA システム上で完結)。

#### Rule 6b: Sample-Analysis チェーン (集計 / array / variation / metabolomics / proteomics)

raw 配列以外は Experiment / Data を介さず Analysis に直接登録できる。Sample-Analysis セットは 2 形態 (`_jga/submission.md` §「Analysis のみの登録」):

| 形態 | 対応関係 | 主な対象 |
|---|---|---|
| Sample-Analysis 1:1 | 1 Sample = 1 Analysis | per-sample VCF / 個別 array / 個別 metabolomics |
| Sample 集計 Analysis | 複数 Sample = 1 Analysis | aggregate VCF / 集計 array / 統合解析 (JGA チーム事前連絡必須) |

単一 `jga` Step の notes に Rule 6a の準備物に加えて Analysis の準備物を足す:

```
Step 0: DBCLS 事前申請 + ポリシー承認  (service=dbcls-application、外部、notes のみ)
Step 1: JGA                            (service=jga、notes-only)
  notes (Rule 6b 発火時、Rule 6a と排他ではなく追加):
    - jgaPrep.overview
    - jgaPrep.submission / jgaPrep.study / jgaPrep.sample
    - (Rule 6a 発火時のみ) jgaPrep.experiment / jgaPrep.data
    - jgaPrep.analysis                                            → JGAZ######### × N
    - rule06b.analysisNotes (1 Analysis = 1 VCF、aggregate は JGA チーム事前連絡)
    - jgaPrep.dataset / jgaPrep.policy
```

raw 配列と Analysis が混在する場合は Rule 6a + Rule 6b の notes が両方乗る (1 Step に集約された notes リスト)。

#### Rule 6c: Sample-Dataset 直結チェーン (phenotype-only Dataset)

配列なしの表現型 table 単独 (ButtonType=`phenotype` のみ、`jga-dataset` Group 内に他の配列 / 変異行を含まない) で Rule 10a 経路に乗ったケース。Experiment / Data / Analysis をスキップし、Sample → Dataset を直結する第三の chain (ddbj/www `_jga/submission.md` 「JGA はサンプルに関連した表現型 (phenotype) 情報も Analysis にアーカイブしています」規程と、本体 §6.4 phenotype-only Dataset 規定の組合せ)。単一 `jga` Step の notes から Experiment / Data / Analysis 系を抑制し、phenotype-only 専用 notes を追加する:

```
Step 0: DBCLS 事前申請 + ポリシー承認  (service=dbcls-application、外部、notes のみ)
Step 1: JGA                            (service=jga、notes-only)
  notes (Rule 6c 発火時):
    - jgaPrep.overview
    - jgaPrep.submission / jgaPrep.study / jgaPrep.sample
    - (experiment / data / analysis は抑制)
    - jgaPrep.dataset
    - rule06c.phenotypeOnlyDataset (Sample → Dataset 直結の案内)
    - jgaPrep.policy
    - rule10c.jgaSampleNotes + DDBJ Contact + DBCLS application URL (個人特定判定が不明な時の Curator 相談案内)
```

raw 配列 / 変異と phenotype を束ねる通常 Dataset (例: pheno.tsv + sample_R1/R2.fastq + variants.vcf を 1 Dataset に集約) は Rule 6a / 6b の jga Step に jgaPrep.dataset を含む通常 notes セットが乗り、Rule 6c には該当しない (Rule 6c は phenotype-only 限定で、experiment/data/analysis notes が抑制されるケース)。

#### Rule 6 共通: 全 Service Step の抑制と公開連動

restricted human / human-microbiome 行に対しては以下を抑制:

- BP / BS Step (JGA 側で Study / Sample が独立メタデータとして完結)
- DRA-Run / DRA-Analysis (JGA Data / JGA Analysis で代替)
- GEA Step (spatial-tx restricted ケースも JGA Analysis に集約)
- **MSS Step (PoC スコープ): 完全抑制** — restricted human の assembled (data-form=assembled / chip `assembly-form ∈ {wgs, gnm, tsa, ...}`) は MSS でなく JGA Analysis に集約する。INSDC は restricted データを受けない仕様 (公開前提) のため、restricted human assembled は JGA chain 内で完結する。Haplotype phased (chip `haplotype-mode=phased`) + restricted human の場合も同様で、Rule 11 の 4 BP 構造 (Principal / Alternate / DRA 用 / Umbrella) は **発火しない** (`primary-bioproject` Step は restricted 行集合に対して常に抑制、Rule 6 + Rule 5 組合せ規程と整合)。本番フェーズで「個人ゲノム de novo アセンブリの controlled-access INSDC submission 経路」を ddbj/www / INSDC 側で再確認し、必要なら MSS 並走モードを追加する (open-questions §10.1 参照)
- MetaboBank Step (metabolomics + `organism ∈ {human, human-microbiome}` + restricted は JGA Analysis に集約)
- TogoVar / EVA / dgVa Step (variation の restricted ケースは JGA Analysis に集約)

JGA に集約しないのは外部 jPOST のみ (jPOST は BP / BS を jPOST 側で管理)。

公開は HumanDBs (NBDC ヒトデータベース) で **hum 番号** の専用サイトが公開されたタイミング (ddbj/www `_jga/submission.md` §データの公開)。

混在ケースでは restricted 行群と open 行群が別 Step として並列表示される (Rule 5)。

#### Rule 6 + Rule 5 の組合せ (open + restricted human / human-microbiome 混在)

同一研究内に `organism ∈ {human, human-microbiome}` で `open` 行 + `restricted` 行が混在する場合、Rule 5 の primary BP 数判定は **open 行の集合に対してのみ評価** する。理由: restricted 行は Rule 6 で BP / BS Step を抑制し JGA chain が独立 hierarchy を持つため、`primary-bioproject` Service の発火対象から外れる。

判定例:

- 全行 `human` で open 3 / restricted 5: primary BP は **1 個** (open 3 行用 + 共通 Mammalia 系統)、加えて JGA chain (restricted 5 行用)
- `human` open + `prokaryote` open + `human` restricted: 系統距離大 (Mammalia + Bacteria) で primary BP **2 個**、加えて Umbrella BP + JGA chain (restricted human 用)
- 全行 `human` restricted: primary BP **0 個** (JGA chain のみ)

Rule 2 (Umbrella BP) も同じ open 行集合に対して評価する。JGA chain (restricted) は Umbrella BP の統括対象外。

### Rule 7: TPA / Third-party 系の二系統

chip `provenance=third-party` のとき、ファイル種別と「再アセンブル」か「再解析」かで分岐 (ddbj/www `_ddbj/tpa.md` + `_gea/third-party-reanalysis.md` + `_metabobank/third-party-reanalysis.md` SSOT)。

#### Rule 7a: DDBJ TPA (組み立て済み配列の再アセンブル)

chip `assembly-form ∈ {wgs, gnm, tsa, tls, htg, htc, est, mag, sag, ...}` + `provenance=third-party`:

- MSS Step の data type は通常通り (例: TPA-WGS = WGS + third-party + INSDC/TPA `assembly`)
- INSDC/TPA サブタイプ pulldown を Step カードに表示: `TPA:assembly` / `TPA:specialist_db` (2 種、`TPA:experimental` / `TPA:inferential` は 2025 年 1 月以降登録受付停止)
- 引用するプライマリーエントリの accession (INSDC primary, または DRA SRR) を notes / 入力欄に明記
- BP + BS 登録必須
- TPA-WGS は BioSample 登録時に locus_tag prefix を申請。Step BS カードに「locus_tag_prefix 申請フォーム ([DDBJ 登録窓口](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) 経由)」リンク + 「取得済み prefix 入力欄」を表示、ユーザーが取得後にテキスト入力。詳細は ddbj/www `_ddbj/locus_tag.md` 参照
- FF KEYWORDS に `Third Party Data; TPA; TPA:assembly.` 等が自動付与
- DEFINITION 行 prefix の SSOT 4 種 (`_ddbj/tpa.md` line 77、現受付中は 2 種):
  - `TPA_asm:` (TPA:assembly、現受付中)
  - `TPA:` (TPA:specialist_db、現受付中、DDBJ では受付しない → 案内のみ)
  - `TPA_exp:` (TPA:experimental、2025/01 より受付停止)
  - `TPA_inf:` (TPA:inferential、2025/01 より受付停止)
- `TPA:assembly` の有効 data type は 4 種に限定: WGS / MAG / TSA / TLS (ddbj/www `_ddbj/tpa.md`)

PRIMARY ブロック / COMMENT 行記載 (`_ddbj/tpa.md` line 65-69):

- 引用したアクセッション番号は COMMENT 行または PRIMARY ブロックに記載
- 引用元プライマリーエントリと結果としてアセンブルされた配列の領域対応を PRIMARY ブロックに記載可
- 引用元プライマリーエントリが存在しない領域は **50 bp より長い範囲であってはならない**

#### Rule 7b: GEA / MetaboBank Third-party reanalysis

chip `provenance=third-party` の processed data (matrix / mass-spec) は、DDBJ TPA でなく主要 DB に **条件付き受入** (ddbj/www `_gea/third-party-reanalysis.md` + `_metabobank/third-party-reanalysis.md` 同型規程)。

受入条件 (両方必須、Step カード notes に明示):

1. 再解析の内容についての査読論文が公開されていること (= 査読論文で再解析の内容とアクセッション番号を公表することが登録の目的)
2. 参照している元データ (fastq / mzML 等) が GEA / INSDC / MetaboBank 等の主要な公共データベースで公開されていること

登録経路: 元データを自身で再登録する必要はない。GEA / MetaboBank チームへ事前問い合わせが必要 (MetaboBank の場合は **DDBJ お問い合わせフォーム** [`https://forms.gle/zV4cYCnRCefd4FSz9`](https://forms.gle/zV4cYCnRCefd4FSz9) で「問い合わせ先：MetaboBank」を選択、ddbj/www `_metabobank/third-party-reanalysis.md` 規程準拠)。

Step カード必須入力 (両 Service 共通):

- PubMed ID / DOI (査読論文公開済みのもの。プレプリント不可)
- 参照元 accession (元データの MetaboBank / GEA / INSDC アクセッション、複数可)
- チーム事前確認状態 dropdown (`未確認` / `確認済み`)
- 「チーム事前確認状態」が `確認済み` 以外のとき Step 提出をブロック (Submit ボタン disabled + tooltip「チーム事前確認が必要です。リンク先のお問い合わせフォームから連絡してください」)
- MetaboBank の場合: お問い合わせフォーム URL `https://forms.gle/zV4cYCnRCefd4FSz9` を Step カードに案内リンクとして表示
- GEA の場合: GEA チームへの連絡経路は ddbj/www `_gea/third-party-reanalysis.md` 規程確認 (実装フェーズで具体 URL 確定)

参考: NCBI GEO Third-party reanalysis type / DDBJ TPA との比較は ddbj/www `_metabobank/third-party-reanalysis.md` の「関連サイト」リンクを Step カード notes でも案内。

#### Rule 7c: Third-party annotation (PoC は notes-only Step)

`provenance=third-party` + 遺伝子アノテーション (data-form=annotation)。`TPA:inferential` / `TPA:experimental` が 2025/01 より登録受付停止のため (`/news/ja/2024-09-05.html`、`_ddbj/tpa.md`)、PoC では DEFINITION 行 prefix を **自動付与しない** notes-only Step を生成する:

- + 遺伝子アノテーション modal の「既存公開配列の第三者アノテーション」選択 + 参照元 accession + DOI/PubMed ID 入力 (`FileGroup.referenceMeta` に格納)
- MSS Step は **notes-only Step** として生成 (`service: "mss"`、`intraDbInputs.curatorReviewRequired: true`)
- Step カード notes に以下を表示:
  - 「2025/01 より `TPA:inferential` / `TPA:experimental` の登録受付は停止しています」
  - 「Third-party annotation の登録経路は DDBJ Curator への事前相談が必要です」
  - [DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) リンク
  - peer reviewed publication 必須条件 (ddbj/www `_ddbj/assembly.md` L.148 引用)
- ユーザー入力欄: Curator 相談結果メモ + 確定登録経路 (自由記述)
- PoC では Step を Submit 不可状態に保つ (`warnings` に「Curator 事前相談が完了するまで送信できません」)

本番フェーズで `_ddbj/tpa.md` を再確認し、annotation 単独の TPA 経路が独立に維持されている場合は Rule 7c を「自動付与あり」モードに再開する (open-questions §10.4 参照)。

#### Rule 7 まとめ

| 入力 (chip / data-form) | 出口 Step |
|---|---|
| third-party + assembled (data-form) | Rule 7a: MSS-TPA + INSDC/TPA サブタイプ pulldown (TPA:assembly 4 data type 制約適用) |
| third-party + matrix / mass-spec | Rule 7b: GEA / MetaboBank Third-party reanalysis (条件付き、チーム問い合わせ) |
| third-party + annotation | Rule 7c: MSS-TPA annotation (PoC は notes-only Step、Curator 事前相談必須、prefix 自動付与なし) |
| third-party + raw | 通常 Rule 4 (DRA Run、元データ accession を引用 / 重複登録不可 notes) |

### Rule 8: MAG / SAG derived chain

chip `assembly-form ∈ {mag, sag}` + GroupType=`mag-sag-chain` (ddbj/www `_ddbj/metagenome-assembly.md` + `_ddbj/single-amplified-genome.md` + `_biosample/overview.md` §派生サンプル SSOT)。

INSDC のメタゲノム配列は **4 段階** に区分される (ddbj/www `_ddbj/metagenome-assembly.md`):

1. **生リード**: DRA Run、organism = `*** metagenome`、BS=MIMS.me または Metagenome or environmental
2. **プライマリーメタゲノム** (分類群未同定の assembled contigs): DRA Analysis、BS は (1) と共通 MIMS.me
3. **Binned メタゲノム** (分類群帰属済): DRA Analysis、BS=MIMAG (派生 BS、生物名は帰属生物名で `metagenome` を含まない)
4. **MAG** (高品質 Binned): DDBJ MSS (data type=MAG、DIVISION=ENV)、BS=MIMAG (派生 BS、生物名は帰属生物名)

SAG (Single Amplified Genome) は別経路 (ddbj/www `_ddbj/single-amplified-genome.md`):

- **一細胞**: 各細胞 1 BS=MISAG、生物名は同定生物名 (uncultured / metagenome を含まない)
- **複数細胞 co-assembly**: 派生 BS=MISAG、`derived_from = "SAMD00192892-SAMD00192901"` 形式で結合元 SAG BS を範囲指定

#### Rule 8a: Step 構造 (MAG 経路)

`mag-sag-chain` Group の FileRole に応じて Step を多段生成 (例: raw reads + primary contigs + binned + MAG fasta):

```
Step 1: Primary BioProject (Project data type=Metagenome)              → PRJDB#####
Step 2: BioSample (Package=MIMS.me、organism="xyz metagenome")          → SAMD##### (raw metagenome BS)
Step 3: BioSample (Package=MIMAG、生物名=帰属生物名、derived_from=Step 2) → SAMD##### (Binned/MAG 用派生 BS)
Step 4: DRA Run (raw reads)                                              → DRR##### (BP=Step 1, BS=Step 2)
Step 5: DRA Analysis (primary contigs、Type=De Novo Assembly)             → DRZ##### (BP=Step 1, BS=Step 2)
Step 6: DRA Analysis (Binned contigs、Type=Sequence Annotation)           → DRZ##### (BP=Step 1, BS=Step 3)
Step 7: MSS (data type=MAG、DIVISION=ENV)                                → INSDC prefix (BP=Step 1, BS=Step 3)
```

`mag-sag-chain` Group のメンバが少ない場合は対応する Step のみ生成 (raw + MAG fasta のみなら Step 4 と Step 7、primary contigs なしなら Step 5 省略)。生リードが Group に含まれない場合でも DRA Run の登録は原則として必須 (ddbj/www `_ddbj/metagenome-assembly.md`)、Step 4 を notes-only Step として表示し外部での raw 登録の有無を確認するよう促す。

**raw 未提出時の notes-only Step UX**: Step 4 (DRA Run) を notes-only として表示し、Step カード内に以下の選択肢を提示。選択結果は `mag-sag-chain` Group の `FileGroup.referenceMeta` に保存する (`rawStatus` / `externalRawAccession` / `notes`):

| Step カード UI ラベル | `referenceMeta.rawStatus` | 追加で保存される値 | Step 4 の挙動 |
|---|---|---|---|
| 外部で raw 登録済み | `"external"` | `externalRawAccession` (既発行の INSDC SRA accession `DRR` / `SRR` / `ERR`) | dependency 解決済み、後段 Step (Step 5-7) を有効化 |
| 未登録 / 後ほど登録予定 | `"pending"` | `notes` (自由記述) | warning 状態のまま「登録後に accession 入力」を促す。後段 Step は dependency 未解決のまま (ユーザーが本 Step を再訪して accession 入力するまで Submit 不可) |
| 外部 DB に raw を登録予定 (DDBJ 外) | `"external-db"` | `notes` (外部 DB 名 + accession 自由記述) | 「DDBJ チーム相談 ([DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html))」リンク表示。後段 Step は notes 記入完了で dependency 解決扱い (DDBJ チーム判断による正式運用は本番フェーズで再確認) |

`rawStatus` が未設定の場合は Step 4 を warning 状態で表示し、3 択のいずれかを選ぶよう促す。

#### Rule 8b: Step 構造 (SAG 経路)

一細胞 / 複数細胞 co-assembly の判別を + 組み立て済み配列 modal で確定する (PoC 開放):

```
SAG 一細胞 (modal で「単一細胞」選択)
- BS=MISAG × N (各細胞 1 BS、生物名=同定生物名)
- MSS Step N 個 (各 1 BS に対応)

SAG 複数細胞 co-assembly (modal で「複数細胞 co-assembly」選択)
- BS=MISAG × N (各細胞 1 BS、生物名=同定生物名) + 派生 BS=MISAG × 1 (co-assembly 用、derived_from=元 BS 範囲)
- MSS Step 1 個 (派生 BS 参照)
- MSS の /note に `single amplified genome` と `co-assembly of N single-cell amplified genomes` を記載 (`_ddbj/single-amplified-genome.md`)
```

#### Rule 8c: BS 派生サンプルの `derived_from` 属性

`mag-sag-chain` Group では BS Step 間に `derived_from` 関係を自動生成し、Step BS カードに `derived_from` 属性 pulldown を表示 (ddbj/www `_biosample/overview.md` §派生サンプル SSOT):

- 派生先 BS Step に `derived_from` 属性 (元 BS のアクセッション番号、カンマ/ハイフン区切り) を自動入力
- 元 BS が複数の場合: `SAMD00000001,SAMD00000002` または範囲 `SAMD00000008-SAMD00000100`
- ユーザーが派生 BS Step で `derived_from` 値を編集可能 (アクセッション取得前は仮 ID 参照、取得後に自動置換)
- 派生 BS の生物名は元 BS と別 (元=`xyz metagenome`、派生=帰属生物名)。Step BS カードの組合せ警告で「派生 BS の生物名は MAG/SAG の帰属生物名にしてください」案内

#### Rule 8d: Section A での `mag-sag-chain` Group 視覚化 UI

`mag-sag-chain` Group のテーブル表示は **段階を示す indent** + **`derived_from` の方向矢印** で構造化する:

```
+------------------+------------+----------+-------------------+-------------+
| ファイル          | 生物       | 公開     | データ形態         | chip        |
+------------------+------------+----------+-------------------+-------------+
| ↳ Group: mag-sag-chain (4 段、metagenome → MAG)                         |
|   ▸ raw 段階                                                              |
|     meta_R1.fastq | metagenome | open     | raw               |             |
|     meta_R2.fastq | metagenome | open     | raw               |             |
|   ▸ primary 段階 (↑ 派生元: raw メンバ)                                  |
|     contigs.fa    | metagenome | open     | analysis-output   |             |
|   ▸ binned 段階 (↑ 派生元: primary)                                       |
|     binned.fa     | <生物名>   | open     | analysis-output   |             |
|   ▸ MAG 段階 (↑ 派生元: binned)                                            |
|     mag_001.fa    | <生物名>   | open     | assembled         | [mag]       |
+------------------+------------+----------+-------------------+-------------+
```

- 各段階を `▸ ラベル` でセクション化、行は indent
- 段階間の派生関係を「↑ 派生元: X」テキスト + 矢印アイコンで表示
- Section B の Step BS カード (派生 BS) に対応する `mag-sag-chain` Group 行をクリックでハイライト (双方向リンク)
- `derived_from` 属性は Step BS カードで自動入力 + 編集可能、アクセッション仮 ID 表示はテーブル上の段階ラベルから参照

### Rule 9: multiplex Run (per-sample FASTQ + N BS)

GroupType=`multiplex` (本体 §4.1 / §4.4、事前 demultiplex 済み per-sample FASTQ):

- N per-sample FASTQ → N BS + N DRA Run の Step 構造
- Step DRA カードに「barcode-sample 対応表は Library Construction Protocol 入力欄で記述」notes (`_dra/metadata.md` で Library Construction Protocol は DRA Experiment 側のフィールド、BS Step ではない)
- Group ヘッダで multiplex Group とラベル表示 (テーブル上 chip にしない)

**barcode-sample 対応表入力 UX** (Step DRA カード):

- 各 per-sample FASTQ 行に対応する Library Construction Protocol 自由記述欄に、ユーザーが TSV 貼付 (textarea で `barcode<TAB>sample_id` の N 行) もしくは N 行の表形式 UI で入力可能
- Group 共通の対応表として 1 度だけ入力し、Group 内の N Experiment へ自動配布する案も本番フェーズで検討 (open-questions §10.1)
- 各 Sample / Experiment へ対応する barcode 部分のみ自動抜粋して Library Construction Protocol 欄へ複写

pool のまま追加しようとした場合は + 配列リード modal でエラー (本体 §4.4、DDBJ FAQ `metadata-of-multiplexed-samples` 参照)。

### Rule 10: phenotype / JGA Dataset

ButtonType=`phenotype` または GroupType=`jga-dataset`。phenotype データの登録経路は access (open / restricted) と organism (human 系か否か) で大きく分岐する。

#### Rule 10a: restricted phenotype → JGA Dataset 経路

access=restricted + organism ∈ {human, human-microbiome} の phenotype 行は Rule 6 集約モードに乗る:

- 配列なしの表現型 table 単独でも JGA Dataset として登録可能 (本体 §6.4)
- 配列 / 変異 / 表現型を束ねた Dataset の場合、`jga-dataset` Group 内の対象行を含む Dataset Step を生成
- JGA Dataset Step は JGA Submission 配下 (Rule 6a / 6b の Sample-Experiment-Data / Sample-Analysis チェーンに付属)
- ddbj/www `_jga/submission.md` line 107 「JGA はサンプルに関連した表現型 (phenotype) 情報も Analysis にアーカイブしています」規程準拠

#### Rule 10b: open phenotype → BS サンプル属性 経路

access=open または organism ∉ {human, human-microbiome} の phenotype 行は BS のサンプル属性として登録する:

- ddbj/www `_biosample/overview.md` §ヒトサンプル「個人特定可能な情報を除去」前提
- phenotype TSV/CSV の各列を BS Step カードのサンプル属性 (`tissue` / `age` / `clinical_diagnosis` / 自由属性等) にマッピング
- 独立した phenotype Step は生成せず、BS Step カードに「表現型 table 取込」UI (各列 → BS 属性のマッピング) を提供
- 関連する配列 / 変異 / matrix データがある場合、それらの主要 DB Step (DRA / MSS / GEA / TogoVar 等) は Rule 4 通常経路で生成、phenotype は BS 属性として共通参照される

#### Rule 10c: 個人特定情報の判定 UX

+ 表現型データ modal で「**個人特定可能な情報を含みますか?**」(yes / no) を確認:

- **yes** → access=restricted を自動設定 (列 access が編集可能なまま、警告 chip 表示)。Rule 10a 経路
- **no** → BS 属性として登録 (Rule 10b)。テーブル列 access はユーザーが open / restricted を選択
- **不明** (判定困難) → 安全側として access=restricted を暫定設定 (columnSource=auto) + Rule 10a 経路に乗せつつ、**Rule 6a で生成される JGA Sample Step (`service=jga-sample`)** の notes に [DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) + [DBCLS 提供申請システム](https://humandbs.ddbj.nig.ac.jp/nbdc/application/) URL を表示 (Rule 6 で BS Step は抑制されるため BS Step ではなく JGA Sample Step に提示)。相談結果に応じてユーザーが access 列を `open` に編集すると generateFlowCard が再評価し Rule 10b 経路の BS Step に切替わる

ddbj/www `_biosample/overview.md` 「登録者の責任において、適用される法律や指針に従い、由来個人を直接特定できるような情報を取り除いてください」規程に基づく自己申告ベース UX。

### Rule 11: Haplotype phased

chip `haplotype-mode=phased` (ddbj/www `_ddbj/haplotype.md` SSOT)。INSDC では BioProject と BioSample の組合せでアセンブリを管理するため、Haplotype ごとにユニークになるよう BioProject を分割する。

Haplotype は MSS data type 11 種に含まれず、WGS 派生として ST_COMMENT で識別する。

#### Rule 11a: 4 BP Step 構造 (典型ケース: Principal + Alternate)

Step 列の物理順序 (Section B 表示):

```
Step 0: Umbrella BioProject                    → PRJDB#####  (Rule 2 自動発火)
Step 1: Primary BioProject (Principal)          → PRJDB#####
Step 2: Primary BioProject (Alternate)          → PRJDB#####
Step 3: Primary BioProject (DRA 用)             → PRJDB#####  (両 Haplotype 由来リード混在時のみ)
Step 4: BioSample (共通、Package=MIGS.eu / MIGS.ba / MIGS.vi) → SAMD#####  (Haplotype 専用上書き、organism で MIGS バリアント選択。Rule 3 デフォルトより優先)
Step 5: DRA Run                                  → DRR#####    (BP=Step 3 + BS=Step 4 参照)
Step 6: MSS (Principal haplotype)                → INSDC prefix (BP=Step 1 + BS=Step 4 参照)
Step 7: MSS (Alternate haplotype)                → INSDC prefix (BP=Step 2 + BS=Step 4 参照)
```

- **Step 0 (Umbrella BP)**: Step 1 / 2 / 3 を統括。Umbrella 登録時の Private comments to DDBJ staff 欄に配下 BP のアクセッション + 区別 (例 `PRJDB1 Principal, PRJDB2 Alternate, PRJDB3 DRA`) を記入する案内 notes を表示 (ddbj/www `_ddbj/haplotype.md` §BioProject 規程)
- **Step 1 / 2 (Principal / Alternate BP)**: 各 BP の Title に Haplotype フェーズ情報を記載 (例 `Principal haplotype` / `Primary haplotype` / `Alternate haplotype`)。命名規則は Rule 11c で選択
- **Step 3 (DRA 用 BP)**: 両 Haplotype 由来のリードが混在している場合のみ生成 (純 short-read で Principal/Alternate 区別なしの raw データを表現)。Principal/Alternate 別々にリードを区別済みなら不要
- **Step 4 (BS)**: 1 つの共通 BioSample。Package は Rule 3 のデフォルト (eukaryote → Model organism or animal 等) を **Haplotype 専用に上書き**して MIGS バリアント (organism で eukaryote → `migs-eu`、prokaryote → `migs-ba`、virus → `migs-vi`) を選択する。理由: Haplotype phased アセンブリは MIxS-compliant な genome metadata を要求するため (ddbj/www `_ddbj/haplotype.md` §BioSample 規程準拠)。Principal / Alternate / DRA 用 BP が同じ BioSample を参照
- **Step 5 (DRA Run)**: Step 3 の BP + Step 4 の BS を参照
- **Step 6 / 7 (MSS)**: 各 MSS Step に ST_COMMENT pulldown を表示
  - Step 6 (Principal): `Genome-Assembly-Data ST_COMMENT: Diploid :: Principal haplotype`
  - Step 7 (Alternate): `Genome-Assembly-Data ST_COMMENT: Diploid :: Alternate haplotype`
- アノテーション付きの場合は Principal / Alternate で **共通の locus_tag_prefix** を BS Step 4 の `locus_tag_prefix` 属性に記入する案内 (ddbj/www `_ddbj/haplotype.md` §BioSample)。タグ内で Haplotype 区別を行う運用 (例 `A1C_p00001` (Principal) / `A1C_a00001` (Alternate))

#### Rule 11b: 視覚化 UI 指針

- Section B では Step 0 (Umbrella) を最上位、Step 1 / 2 / (3) を縦に並べ Step 1 / 2 を indent + 共通アイコン (Haplotype を示すラベル) でグルーピング表示
- Step 6 / 7 (MSS) も同様に共通アイコンで Principal / Alternate を並列表示
- 各 Step カードのヘッダにバッジ表示: `Principal` / `Alternate` / `DRA-Read` / `Umbrella` / `Shared BioSample`
- 複数 Haplotype セット (例 生物種 A / B / C で各 2 Haplotype) の場合、各セットを Group ヘッダで折りたたみ可能にし、Umbrella BP は共通でひとつ生成

#### Rule 11c: Haplotype 命名規則の選択 UX

+ 組み立て済み配列 modal で `Haplotype phased` 選択時に下記命名規則を問う (ddbj/www `_ddbj/haplotype.md` §naming SSOT):

```
Haplotype の命名規則は?
(o) Principal / Alternate (どちらかの品質が優れている場合)
( ) Haplotype 1 / Haplotype 2 (品質が同等の場合、3 つ以上は Haplotype 3 / 4 ...)
( ) Maternal / Paternal (由来親が分かっている場合)
```

選択結果が Step 1 / 2 / ... の Title / バッジ表示 + Step MSS の ST_COMMENT 文字列に反映される (例 `Diploid :: Haplotype 1` / `Diploid :: Maternal haplotype`)。

locus_tag prefix は全 phase で共通の単一 prefix を BioSample 登録時に申請し、Step MSS では **prefix + phase 別 suffix** で Principal / Alternate (もしくは 1 / 2、Maternal / Paternal) を区別する運用に合わせる (ddbj/www `_ddbj/haplotype.md`)。例: prefix `A1C` の場合、`A1C_p00001` = Principal locus、`A1C_a00001` = Alternate locus、`A1C_h1_00001` = Haplotype 1 locus、`A1C_m00001` = Maternal locus。Step MSS カードの locus_tag プレースホルダはこの命名規則を初期表示する。

#### Rule 11d: 複数 Haplotype セット (3 セット以上)

例: 生物種 A / B / C の Haplotype 3 セット → 各セット用 BP × N セット + 共通 Umbrella BP (1 つ):

- 各セット (生物種ごと) に Rule 11a の Step 1-7 構造を生成
- Umbrella BP Step は 1 つ (全セット共通)
- BS は各セットごとに別 BS (各セットの生物種が異なる前提)、各セット内で Principal / Alternate は共通 BS

### Rule 12: 外部 Service Step

`service ∈ {dbcls-application, jpost, eva, dgva, humandbs}` の Step は:

- `badgeKind=external` (本体 §6.2、amber-500 + 外部リンクアイコン)
- 「外部のため別途手続き」notes
- 該当外部 DB / 申請システムのリンクを表示:
  - `dbcls-application` → [DBCLS 提供申請システム](https://humandbs.ddbj.nig.ac.jp/nbdc/application/) (Rule 6 Step 0)
  - `humandbs` → [HumanDBs 閲覧](https://humandbs.dbcls.jp/) (公開後の hum 番号参照)
  - `jpost` / `eva` / `dgva` → 該当 DB 公式 URL
- 入力フォームは出さない (リダイレクトのみ)
- `issuedAccessionTypes` は空配列、`upstreamStepIds` も空

### Rule 13: MSS Step の補助フィールド (INSDC FF / Annotation 制約)

MSS / NSSS Step が生成された場合、Step カード内に補助 pulldown / notes として:

| 補助フィールド | 出現契機 | 内容 |
|---|---|---|
| INSDC/TPA サブタイプ pulldown | chip provenance=third-party 選択時のみ | TPA:assembly / TPA:specialist_db (2 種、Rule 7a の data type 4 種制約と連動) |
| DIVISION pulldown | MSS / NSSS 全 case | デフォルト値は organism + chip assembly-form + provenance から自動推測 ([`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.6) |
| DATATYPE pulldown | MSS / NSSS 全 case | chip assembly-form から自動推測。MSS data type pulldown 値域は ddbj/www `_ddbj/data-categories.md` SSOT 11 種 (WGS / GNM / TSA / TLS / EST / MAG / SAG / HTG / HTC / MISC / ASK)。`assembly-form ∈ {gss, syn}` の場合は MSS data type pulldown に該当値がないため DIVISION 側 (GSS / SYN、`_ddbj/flat-file.md`) に直接振り分け、DATATYPE は `WGS` (gss) もしくは `MISC` (syn) を default 提示し DDBJ Curator 判断を待つ |
| KEYWORDS notes | TPA 系 (Rule 7a) と HTG phase (HTG_PHASE0/1/2) は自動付与、それ以外は [INSDC methodological keywords](https://insdc.org/submitting-standards/methodological-keywords/) (~40 種、controlled vocabulary、廃止項目あり / 公式 version 管理なし) の参照案内のみ | ddbj/www `_ddbj/flat-file.md` |
| Annotation / Feature 制約 notes | MSS data type 別の qualifier 制約 (mandatory / forbidden / recommended) | ddbj/www `_ddbj/qualifiers.md` |

DIVISION 自動推測のロジック詳細は [`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.6.1。ユーザーが補助 pulldown でデフォルト値と異なる選択をした場合は Rule 14 と同様の warning 表示。

**KEYWORDS の controlled vocabulary 化判断**: PoC は外部 SSOT [INSDC methodological keywords](https://insdc.org/submitting-standards/methodological-keywords/) の参照案内のみ (TextField + 外部リンク + 例示)。本番フェーズで `as const` 化を再判断する場合の判断材料:

- メリット: 型安全 + pulldown 化 + 廃止項目の警告表示
- デメリット: INSDC 側で項目追加 / 廃止された際の追従コスト (公式 version 管理がないため定期的に外部 SSOT 差分検出が必要)
- 推奨運用: PoC ログから KEYWORDS 入力エラー / typo 率を観測し、エラー率が高ければ controlled vocabulary 化を優先 (`_ddbj/flat-file.md` で参照されている TPA 系 / HTG phase は既に Rule 13 で自動付与化済み、残り 30+ 種が `as const` 化候補)

### Rule 14: Step カード入力による chip 整合チェック

Step カードに Library Strategy / Library Source / DDBJ データタイプ等を入力した時点で、chip 値との整合性を自動チェックする (PoC スコープ)。

#### Rule 14a: 整合チェックのロジック

| Step カード入力 | 推測される chip / 列 | 既存値との関係 |
|---|---|---|
| Library Strategy ∈ {WGS, WGA, WCS, WXS, Synthetic-Long-Read} | chip functional-genomics ∈ {wgs-target, wes-target} | mismatch なら warning |
| Library Strategy ∈ {RNA-Seq, ssRNA-seq, ncRNA-Seq, FL-cDNA, EST, CTS} | chip functional-genomics ∈ {yes, tsa-target} | mismatch なら warning |
| Library Strategy ∈ {ChIP-Seq, ATAC-seq, Bisulfite-Seq, Hi-C, MeDIP-Seq, MNase-Seq, MBD-Seq, MRE-Seq, FAIRE-seq, RIP-Seq, ChIA-PET, DNase-Hypersensitivity, Tethered Chromatin Conformation Capture, NOMe-Seq} | chip functional-genomics=yes | mismatch なら warning (CLIP-Seq / HITS-CLIP / PAR-CLIP は RIP-Seq に包含、tags.md §5.3) |
| Library Strategy=AMPLICON + Library Source=METAGENOMIC | chip functional-genomics=metagenome-target | TLS 16S/COI を想定、mismatch なら warning |
| Library Strategy=Targeted-Capture | chip functional-genomics ∈ {wes-target, wgs-target} | 候補が複数あるため info のみ (warning なし) |
| Library Strategy=Other | chip functional-genomics 全値 | チェック対象外 (silent、warning も info も出さない、ユーザーが意図的に Other を選んでいるため) |
| Library Source=METATRANSCRIPTOMIC | chip functional-genomics ∈ {yes, tsa-target, metagenome-target} | 候補が複数あるため info のみ (warning なし、Step カードに「metatranscriptome は tsa-target / metagenome-target / GEA のいずれかに該当します」notes 表示) |
| Library Source=SYNTHETIC | chip functional-genomics=other (sequence-read ButtonType では `assembly-form` chip は付かないため Library Source からの assembly-form 推測は行わない) | mismatch なら info notes 「合成配列の read library は GEA / TPA など通常経路に該当しません。Step MSS カードで適切な DATATYPE を選択してください」 |
| DDBJ データタイプ ∈ {WGS, GNM} | chip assembly-form ∈ {wgs, gnm} + chip functional-genomics=wgs-target | mismatch なら warning |
| DDBJ データタイプ ∈ {TSA, HTC} | chip assembly-form ∈ {tsa, htc} + chip functional-genomics=tsa-target | mismatch なら warning |
| DDBJ データタイプ ∈ {MAG, SAG} | chip assembly-form ∈ {mag, sag} + chip functional-genomics=metagenome-target | mismatch なら warning |
| DDBJ データタイプ ∈ {MISC, ASK} | chip functional-genomics=other | info notes「DDBJ チームへの事前相談が推奨されます」 (warning なし) |

Library Strategy 36 値域のうち上表 + `Other` で言及されていないもの (CLONE / POOLCLONE / CLONEEND / FINISHING / Reduced Representation / RAD-Seq / Targeted-Capture / Tn-Seq / SELEX / miRNA-Seq) は warning 対象外 (silent、推測キーが複数すぎて自動判定不能)。本番フェーズで利用ログから整合チェック範囲を再判断 (open-questions §10.2)。

実装方針 (全 case 共通):

- chip / 列はユーザー意図を尊重し、Step カード入力からの自動切替はしない (Rule 13 補助 pulldown も同じ方針)
- 整合 (match) → silent (もしくは Step カード入力欄横の控えめなチェックマーク)
- 不整合 (mismatch) → warning bar 表示 + 3 種操作

#### Rule 14b: warning UI と 3 種操作

warning bar の構造:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠ 不整合の可能性                                                     │
│ <warning メッセージ (Rule 14c 参照)>                                 │
│ [chip を修正]  [Step 入力を変更]  [無視 (上級者向け)]                  │
└─────────────────────────────────────────────────────────────────────┘
```

- **配置**: 不整合を検出した Step カード入力欄 (Library Strategy / Library Source / DDBJ データタイプ 等) の直下、rose-500 系の枠線で控えめに表示 (外部 Service バッジの amber-500 と区別、本体 §6.2)
- **dismiss**: ユーザーが「無視」を選択すると warning bar は閉じ、当該 chip+Step 入力組合せに `acknowledged` フラグを付与。同組合せの再表示は抑止 (chip / Step 入力のどちらかが変わったら再評価)
- **状態追跡**: 各 warning に一意 ID (例 `step:dra-3:library_strategy:WGS|chip:functional-genomics:yes`) を付け、ユーザーの選択履歴を保存。下書き永続化対応時に復元可能 (本番フェーズ §10.1 の下書き永続化と連動)

3 種操作の挙動:

| 操作 | 効果 | 推奨ケース |
|---|---|---|
| **chip を修正** | テーブル該当行の chip 軸へフォーカス + 修正候補値 (Rule 14a 表の「推奨 chip」) を提案 | Step 入力が正しく、chip 設定が誤っている場合 (例: WGS Strategy 指定で chip functional-genomics=yes を `wgs-target` に直す) |
| **Step 入力を変更** | Step カード入力欄へフォーカス + ddbj/www 由来の controlled vocabulary tooltip を表示 (例: WGS の代わりに RNA-Seq を選択) | chip が正しく、Step 入力が誤りの場合 |
| **無視 (上級者向け)** | warning bar を閉じる + `acknowledged` フラグ保存。Step カード上の状態は「⚠ 不整合 (確認済み)」と小さく表示 | DDBJ Curator 判断待ち / INSDC controlled vocabulary の境界ケース / 既存登録の慣習を再現したい場合 |

#### Rule 14c: warning メッセージ文言一覧

各 mismatch ケースの warning 文言を以下に固定する (英語版は i18n キー `flowGen.rule14.warning.<caseKey>` で並走):

| ケース | warning 文言 (ja) | i18n key |
|---|---|---|
| Library Strategy WGS 系 + chip functional-genomics=yes | `Library Strategy「{strategy}」は WGS 系ですが、chip functional-genomics が「yes (GEA 登録)」になっています。chip を「wgs-target」/「wes-target」に修正するか、Step 入力を RNA-Seq 系などに変更してください。` | `flowGen.rule14.warning.wgs_vs_genomicsYes` |
| Library Strategy RNA-Seq 系 + chip functional-genomics ∉ {yes, tsa-target} | `Library Strategy「{strategy}」は RNA-Seq 系ですが、chip functional-genomics が「{currentChip}」になっています。chip を「yes (GEA 登録)」または「tsa-target」に修正するか、Step 入力を WGS 系などに変更してください。` | `flowGen.rule14.warning.rnaseq_vs_chip` |
| Library Strategy エピジェネティクス系 (ChIP-Seq / ATAC-seq / ...) + chip functional-genomics ≠ yes | `Library Strategy「{strategy}」はエピジェネティクス系の解析で、通常 GEA 登録となります。chip functional-genomics を「yes」に修正することを推奨します。` | `flowGen.rule14.warning.epigenetics_vs_chip` |
| Library Strategy=AMPLICON + Library Source=METAGENOMIC + chip functional-genomics ≠ metagenome-target | `AMPLICON × METAGENOMIC の組合せは TLS (16S/COI マーカー遺伝子) を想定しますが、chip functional-genomics が「{currentChip}」になっています。chip を「metagenome-target」に修正することを推奨します。` | `flowGen.rule14.warning.amplicon_metagenomic` |
| DDBJ データタイプ WGS/GNM + chip assembly-form 不一致 | `DDBJ データタイプ「{dataType}」と chip assembly-form「{currentForm}」が一致しません。chip を「wgs」/「gnm」に修正するか、Step 入力を「{currentForm}」に対応するデータタイプに変更してください。` | `flowGen.rule14.warning.mss_wgs_assemblyForm` |
| DDBJ データタイプ TSA/HTC + chip assembly-form 不一致 | 同上 (WGS/GNM 版と同型、データタイプと assembly-form 値を差し替え) | `flowGen.rule14.warning.mss_tsa_assemblyForm` |
| DDBJ データタイプ MAG/SAG + chip assembly-form 不一致 | 同上 | `flowGen.rule14.warning.mss_magsag_assemblyForm` |
| DDBJ データタイプ MISC/ASK | (info notes) `データタイプ「{dataType}」を選択中です。DDBJ チームへの事前相談が推奨されます。` | `flowGen.rule14.info.mss_misc_ask` |

placeholder (`{strategy}` / `{dataType}` / `{currentChip}` / `{currentForm}`) には実際の値を i18n フォーマット関数で埋め込む (`useTranslation().t()` 経由)。controlled vocabulary 値そのもの (例: `Synthetic-Long-Read`) は英語キー固定で日本語訳しない (ddbj/www が controlled vocabulary を英語キーで管理しているため)。

### Rule 15: Hybrid Assembly Run group

GroupType=`hybrid` (本体 §4.1、[`submit-alt3-modals.md`](./submit-alt3-modals.md) §7.4):

DRA データモデル上、1 Experiment = 1 library + 1 instrument の制約 (`_dra/metadata.md` Experiment 定義)。Hybrid Assembly では異 instrument の Run を 1 Experiment にまとめられないため、**同 BioSample 配下に複数 Experiment + 複数 Run** を生成する。

- N 個の Run (各 instrument 別) → N 個の Experiment + N 個の Run。BS は 1 個 (全 Experiment が同 BioSample を参照)
- BP も 1 個 (全 Experiment が同 BioProject を参照)
- 各 Step DRA カードに「Hybrid Assembly Group: 相手側 Experiment への参照」notes
- Library Name に Hybrid Assembly 識別子を含める運用案内 (例: `<project>_hybrid_short` / `<project>_hybrid_long`)
- 合成された assembly のファイルがテーブルに存在する場合 (data-form=assembled / chip `assembly-form=wgs` 等)、別途 MSS Step または DRA Analysis Step を Rule 4 経由で生成し、Step カード notes で「Hybrid Assembly 由来 (Step X / Step Y の Run を統合)」と参照
- 合成 assembly が未登録の場合 (raw のみ提出) は MSS / DRA Analysis Step を生成せず、Step DRA カード notes に「Hybrid Assembly: assembly fasta をテーブル追加するか、外部で公開予定の旨を記載してください」を表示

**Hybrid Assembly Group 内の access 整合性**: Hybrid Assembly は同 BioSample 配下に複数 Experiment を持つ構造のため、Group 内メンバの access (open / restricted) は **一致している必要がある**。混在 (例: short-read open + long-read restricted) の場合は以下の対応を取る:

- Group 内メンバの access 不一致を検出 → Step カード上に warning 表示 (`Hybrid Assembly の short-read と long-read で access が異なります。1 BS 内で混在は登録仕様上できないため、Group 解除して別 BS として登録するか、access を統一してください`)
- ユーザーは (a) Group を Ungroup して各 Run を独立した Experiment + 独立した BS として再構成する、(b) access 列を統一する、の二者択一

**Hybrid Assembly + Rule 6 集約モードの干渉**: Hybrid Assembly Group の全メンバが `organism ∈ {human, human-microbiome}` + `access=restricted` の場合、Rule 6a に集約され下記の構造になる:

- BP / BS / DRA-Experiment / DRA-Run / MSS は全て抑制 (Rule 6 共通)
- 代わりに JGA chain 内で **同 JGA Sample 配下に複数 JGA Experiment + 複数 JGA Data** が生成される (Rule 15 の「1 BS + 複数 Experiment + 複数 Run」構造を JGA Sample + 複数 JGA Experiment + 複数 JGA Data として写像)
- 合成 assembly fasta は Rule 6 共通の MSS 抑制ルール (PoC) に従い、JGA Analysis に集約
- Hybrid Assembly Group 識別子 (Library Name の `_hybrid_short` / `_hybrid_long`) は JGA Experiment の自由記述フィールドに記載 (案内 notes で表示)

Hybrid Assembly Group メンバが open + restricted で organism 混在 (例: pathogen short-read open + host long-read restricted) は登録仕様上不可能 (1 BS = 1 organism 制約)、上記 access 不一致と同様の warning + Ungroup 案内で対応。

ddbj/www に Hybrid Assembly 専用の明示規範はない (BioNano hybrid assembly の datafile 仕様のみ `_dra/datafile-e.md` に記載) が、DRA データモデルの「1 Experiment = 1 instrument」制約と BioSample 多重参照可能性から上記構造が正当。

## 8.1.A Service 単位 merge ポリシー (Phase 3 後処理)

Rule 1-15 は per-row / per-group / per-stage の判定で複数の Step を生成する。同一 ServiceKind に対して複数の Step が並ぶケース (例: BS が GroupType 別に N 個、MSS が fasta ファイル別に N 個) では、利用者から見ると登録単位は「1 つの DDBJ DB への 1 つの登録操作」のため、Step を 1 枚に集約して segment 単位で対象ファイル / 派生関係 / Step 入力を開示する。

### 適用タイミング

`generateFlowCard` orchestrator の Phase 3 で `applyRule13Auxiliary` → `applyRule14Consistency` → `applyRule15Notes` を実行した後、`enrichExternalServiceSteps` の前に `mergeStepsByMergeKey` を適用する。Rule 13-15 が per-segment 単位で warning / note を付与した後に merge することで、warning ID は segmentId に紐づいて安定化する。

### merge 条件

`step.service` と `step.mergeKey` の両方が一致する Step を 1 つの Step に畳む。

- `mergeKey` は Rule 側で `createStep({ mergeKey })` 経由で明示する (`src/lib/submit-alt3/rules/shared.ts`)
- デフォルト値は `service` 文字列。`mergeKey` を渡さない Rule (Rule 1 / 2 / 3 / 4 / 6 / 7 / 10 / 12) の Step は同 ServiceKind 内で全て 1 枚に集約される
- merge 後の `FlowStep` は `segments[]` を持ち、merge 前 Step を `FlowStepSegment` 配列として保持する。Step.id は最古 (sort 済みの先頭) segment の id を継承
- `targetGroupIds` / `targetFileIds` / `upstreamStepIds` / `notes` / `warnings` は union (dedupe)。`intraDbInputs` は merge 後トップでは空 `{}` とし、各 segment 側に実値を保持
- `length === 1` の場合は `segments` を未設定のまま温存 (後方互換)

### 例外仕様 (意図的に分離を維持する Rule)

以下の Rule は「per-origin で Step を維持する」ことが仕様要件のため、異なる `mergeKey` を仕込んで畳まれないようにする。命名規約は [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.6.1 を参照:

- **Rule 9 multiplex**: per-sample FASTQ 行ごとに DRA Run Step を維持する仕様 (Rule 3 で「per-sample FASTQ → 1 BS」と整合)。`mergeKey = "dra:multiplex:" + fileId` で per-file 維持
- **Rule 11 haplotype phased**: Principal / Alternate / DRA-shared の phase 別 BP と phase 別 MSS は登録先 INSDC prefix が異なるため、phase 別の Step を維持する必要がある。`mergeKey = service + ":haplotype:" + phase`
- **Rule 8 MAG-SAG chain**: raw / primary / binned / MSS / 派生 BS の stage 別 Step を維持し、`derived_from` chain を Step カード列で可視化する仕様。`mergeKey = service + ":magsag:" + stage`

### 適用後の例

§8.2 の例 7 (Hybrid Assembly、BS×3 + DRA×2 + MSS) は merge 後に BS 1 segments=3 / DRA 1 segments=2 / BP 1 / MSS 1 = 4 Step に集約される。例 9 (haplotype phased) は phase 別 `mergeKey` により 4 BP + 1 BS + 1 DRA + 2 MSS = 8 Step が維持される。例 6 (multiplex) は per-file `mergeKey` により BP + BS + DRA Run × N = 2+N Step が維持される。

## 8.2 例

### 例 1: prokaryote raw + assembly (混在なし)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| sample_R1.fastq | prokaryote | open | raw | (pair-end Group) |
| sample_R2.fastq | prokaryote | open | raw | (pair-end Group) |
| assembly.fa | prokaryote | open | assembled | [wgs] |

生成 `FlowCard`:

```
Step 1: Primary BioProject (Project data type=Genome Sequencing) → PRJDB#####
Step 2: BioSample (Package=Microbe)                              → SAMD#####
Step 3: DRA Run (pair-end Group)                                  → DRR#####
   Library Source=GENOMIC, Library Strategy=WGS
Step 4: MSS (data type=WGS)                                       → INSDC 二文字 prefix
```

### 例 2: human restricted raw + per-sample VCF (JGA 集約)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| sample_R1.fastq | human | restricted | raw | (pair-end Group) |
| sample_R2.fastq | human | restricted | raw | (pair-end Group) |
| variants.vcf | human | restricted | analysis-output | [per-sample][snp-indel] |

生成 `FlowCard` (Rule 6a + Rule 6b 併走、ServiceKind 8 分解):

```
Step 0: DBCLS 事前申請 + ポリシー承認 (service=dbcls-application、外部、notes のみ)
Step 1: JGA Submission   (service=jga-submission)  → JGA######
Step 2: JGA Study        (service=jga-study)       → JGAS######
Step 3: JGA Sample × N   (service=jga-sample)      → JGAN######### (各個人、N Step)
Step 4: JGA Experiment   (service=jga-experiment)  → JGAX#########  (raw 配列用)
Step 5: JGA Data         (service=jga-data)        → JGAR#########  (raw)
Step 6: JGA Analysis     (service=jga-analysis)    → JGAZ#########  (per-sample VCF)
Step 7: JGA Dataset      (service=jga-dataset)     → JGAD######
Step 8: JGA Policy       (service=jga-policy)      → JGAP######
```

### 例 3: metagenome MAG chain (Rule 8)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| meta_R1.fastq | metagenome | open | raw | (pair-end Group + mag-sag-chain Group) |
| meta_R2.fastq | metagenome | open | raw | 同上 |
| binned.fa | metagenome | open | analysis-output | (mag-sag-chain Group) |
| mag_001.fa | metagenome | open | assembled | [mag] (mag-sag-chain Group) |

生成 `FlowCard`:

```
Step 1: Primary BioProject (Project data type=Metagenome)
Step 2: BioSample (Package=MIMS.me、raw metagenome)
Step 3: BioSample (Package=MIMAG、derived_from Step 2)
Step 4: DRA Run (meta_R1 + meta_R2)
   Library Source=METAGENOMIC, Library Strategy=WGS
Step 5: DRA Analysis (binned.fa)
Step 6: MSS (data type=MAG、mag_001.fa)
   DIVISION=ENV (自動推測)
```

### 例 4: host-pathogen 混合 (Umbrella BP、Rule 2 + Rule 5)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| host_R1.fastq | human | restricted | raw | (pair-end Group) |
| host_R2.fastq | human | restricted | raw | (pair-end Group) |
| pathogen_R1.fastq | prokaryote | open | raw | (pair-end Group) |
| pathogen_R2.fastq | prokaryote | open | raw | (pair-end Group) |
| pathogen_assembly.fa | prokaryote | open | assembled | [wgs] |

生成 `FlowCard` (Rule 5+Rule 6 組合せ: primary BP 数判定は open 行集合 = pathogen のみで評価 → primary BP 1 個、Umbrella BP 不発、host 系は JGA chain に集約):

```
[pathogen 系、Rule 4 通常経路]
Step 1: Primary BP (pathogen、Project data type=Genome Sequencing) → PRJDB#####
Step 2: BioSample (Package=Microbe)                     → SAMD#####
Step 3: DRA Run (pathogen_R1 + R2)                       → DRR#####
Step 4: MSS (data type=WGS、pathogen_assembly.fa)        → INSDC prefix

[host 系、Rule 6a 集約]
Step 5: DBCLS 事前申請 + ポリシー承認  (service=dbcls-application、外部)
Step 6: JGA Submission                  (service=jga-submission)  → JGA######
Step 7: JGA Study                       (service=jga-study)       → JGAS######
Step 8: JGA Sample × N                  (service=jga-sample)      → JGAN#########
Step 9: JGA Experiment                  (service=jga-experiment)  → JGAX#########
Step 10: JGA Data                       (service=jga-data)        → JGAR#########
Step 11: JGA Dataset                    (service=jga-dataset)     → JGAD######
Step 12: JGA Policy                     (service=jga-policy)      → JGAP######
```

なお、もし host_R1/R2 が `human-microbiome` のような open + 共通生物群でも primary BP が 1 個に縮約される (Rule 5 で `eukaryote/Mammalia` 系統に統合)、その場合は Umbrella BP も不発。Umbrella BP が発火するのは「open 行集合内で **系統距離大** が 2 種類以上 (例: open mouse + open prokaryote)」のとき (Rule 5 表)。

### 例 5: phenotype-only Dataset (Rule 10)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| pheno.tsv | human | restricted | phenotype | (jga-dataset Group) |

生成 `FlowCard` (ServiceKind 8 分解、Rule 10a の phenotype-only Dataset 経路):

```
Step 0: DBCLS 事前申請 + ポリシー承認 (service=dbcls-application、外部、notes のみ)
Step 1: JGA Submission                       (service=jga-submission)  → JGA######
Step 2: JGA Study                            (service=jga-study)       → JGAS######
Step 3: JGA Sample × N (表現型 table の行数 分) (service=jga-sample)    → JGAN#########
Step 4: JGA Dataset (phenotype-only)         (service=jga-dataset)     → JGAD######
Step 5: JGA Policy                           (service=jga-policy)      → JGAP######
```

### 例 6: multiplex Run (Rule 9)

入力テーブル:

| ファイル | organism | access | data-form | chip | Group |
|---|---|---|---|---|---|
| sample01.fastq | prokaryote | open | raw | — | multiplex |
| sample02.fastq | prokaryote | open | raw | — | multiplex |
| sample03.fastq | prokaryote | open | raw | — | multiplex |

(pool のまま追加しようとすると + 配列リード modal でエラー、事前 demultiplex 必須を案内)

生成 `FlowCard`:

```
Step 1: Primary BP                                                → PRJDB#####
Step 2: BioSample × 3 (sample01 / 02 / 03、Package=Microbe)        → SAMD##### × 3
Step 3: DRA Run × 3 (各 per-sample FASTQ)                          → DRR##### × 3
   Library Construction Protocol notes: barcode-sample 対応表
```

### 例 7: Hybrid Assembly (Rule 15)

入力テーブル:

| ファイル | organism | access | data-form | chip | Group |
|---|---|---|---|---|---|
| short_R1.fastq | prokaryote | open | raw | (pair-end Group) | hybrid (short-read 役) |
| short_R2.fastq | prokaryote | open | raw | (pair-end Group) | hybrid (short-read 役) |
| longread.fastq | prokaryote | open | raw | — | hybrid (long-read 役) |
| assembly.fa | prokaryote | open | assembled | [wgs] | (single Group) |

生成 `FlowCard` (Rule 15 + Rule 4):

```
Step 1: Primary BioProject (Project data type=Genome Sequencing)   → PRJDB#####
Step 2: BioSample (Package=Microbe)                                 → SAMD#####
Step 3: DRA Experiment + Run (short-read pair-end Group)            → DRX##### + DRR#####
   Library Source=GENOMIC, Library Strategy=WGS, Instrument=Illumina (例)
   Library Name=<project>_hybrid_short (Hybrid Assembly 識別子の運用案内)
   notes: Hybrid Assembly Group メンバ。相手側 Experiment は Step 4。合成 assembly は Step 5
Step 4: DRA Experiment + Run (long-read Group)                      → DRX##### + DRR#####
   Library Source=GENOMIC, Library Strategy=WGS, Instrument=PacBio Sequel / Oxford Nanopore (例)
   Library Name=<project>_hybrid_long
   notes: Hybrid Assembly Group メンバ。相手側 Experiment は Step 3。合成 assembly は Step 5
Step 5: MSS (data type=WGS、assembly.fa)                            → INSDC 二文字 prefix
   notes: Hybrid Assembly 由来 (Step 3 + Step 4 の Run を統合)
```

### 例 8: variation aggregate (open human、TogoVar SNP、Rule 4)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| pop_variants.vcf | human | open | analysis-output | [aggregate][snp-indel] |

生成 `FlowCard` (Rule 4 表「variation-form=aggregate + organism=human + access=open + variation-type=snp-indel → togovar (SNP)」):

```
Step 1: Primary BioProject (Project data type=Variation)             → PRJDB#####
Step 2: BioSample (Package=Human)                                    → SAMD#####
   notes: aggregate VCF の対象 sample 集合代表 BS (集合 sample は TogoVar Study 内で扱う)
Step 3: TogoVar Study (内部、SNP ≤50 bp)                              → dstd### + dss###
   notes: BP + BS 登録必須 (`_togovar/submission.md` SSOT)。Excel テンプレート (TogoVar_v1.4.xlsx) で SNP variant 表を準備
```

`variation-type=sv` / `cnv` の場合は Step 3 が `dstd### + dssv### + dsv###` (TogoVar SV) になる。

### 例 9: Haplotype phased (Rule 11、Principal + Alternate)

入力テーブル (raw リードは Principal / Alternate に分けず両 Haplotype 由来混在で 1 セット、assembly fasta は phase 別に 2 ファイル):

| ファイル | organism | access | data-form | chip | Group |
|---|---|---|---|---|---|
| reads_R1.fastq | eukaryote | open | raw | — | (pair-end Group、両 Haplotype 由来リード混在) |
| reads_R2.fastq | eukaryote | open | raw | — | (pair-end Group、両 Haplotype 由来リード混在) |
| primary.fa | eukaryote | open | assembled | [wgs][phased] (haplotype-naming=principal-alternate) | (assembly-annotation Group #1) |
| alternate.fa | eukaryote | open | assembled | [wgs][phased] (haplotype-naming=principal-alternate) | (assembly-annotation Group #2) |

生成 `FlowCard` (Rule 11a 4 BP 構造 + Rule 2 Umbrella BP 自動発火):

```
Step 0: Umbrella BioProject                              → PRJDB#####  (Rule 2 自動、Private comments to DDBJ staff に配下 BP 区別を記載)
Step 1: Primary BioProject (Principal)                    → PRJDB#####
   Title: Principal haplotype
Step 2: Primary BioProject (Alternate)                    → PRJDB#####
   Title: Alternate haplotype
Step 3: Primary BioProject (DRA 用、両 Haplotype 由来リード混在時のみ生成、本例では生成) → PRJDB#####
Step 4: BioSample (共通、Package=MIGS.eu、organism=eukaryote)  → SAMD#####
   notes: Principal / Alternate / DRA 用 BP が同じ BioSample を参照、locus_tag_prefix は共通
Step 5: DRA Run (reads_R1 + R2)                            → DRR##### (BP=Step 3, BS=Step 4)
Step 6: MSS (Principal、primary.fa)                        → INSDC 二文字 prefix (BP=Step 1, BS=Step 4)
   ST_COMMENT: Genome-Assembly-Data Diploid :: Principal haplotype
Step 7: MSS (Alternate、alternate.fa)                      → INSDC 二文字 prefix (BP=Step 2, BS=Step 4)
   ST_COMMENT: Genome-Assembly-Data Diploid :: Alternate haplotype
```

### 例 10: TPA-WGS 再アセンブル (Rule 7a)

入力テーブル (元の INSDC primary accession SRR12345678 を再アセンブル):

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| reassembly.fa | prokaryote | open | assembled | [wgs][third-party][tpa-assembly] |

`FileGroup.referenceMeta`: `citedAccessions=["SRR12345678"]`, `pubmedId="38123456"` (peer-reviewed)。

生成 `FlowCard` (Rule 7a):

```
Step 1: Primary BioProject (Project data type=Genome Sequencing)     → PRJDB#####
Step 2: BioSample (Package=Microbe)                                  → SAMD#####
   notes: locus_tag_prefix 申請 (DDBJ 登録窓口経由) + 取得済み prefix 入力欄
Step 3: MSS (data type=WGS、reassembly.fa、TPA:assembly)              → INSDC TPA-WGS prefix (例 EAAA-EZZZ)
   DEFINITION 行 prefix: TPA_asm:
   KEYWORDS: Third Party Data; TPA; TPA:assembly.
   notes:
     - 引用元 SRR12345678 (PRIMARY ブロックに記載)
     - peer-reviewed publication PubMed:38123456 必須
     - 引用元領域以外 50 bp 上限 (`_ddbj/tpa.md`)
```

### 例 11: metabolomics LC-MS (Rule 4c、MetaboBank)

入力テーブル:

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| LC-MS_001.mzML | eukaryote | open | mass-spec | [metabolomics] |

`FileGroup.metaboBankSubmissionType="LC-MS"`。

生成 `FlowCard` (Rule 4 mass-spec-domain=metabolomics → metabobank、Rule 4c Study レベル only):

```
Step 1: Primary BioProject (Project data type=Other)                 → PRJDB#####
   notes: MetaboBank 専用 (Rule 1 優先順序 3)
Step 2: BioSample (Package=Model organism or animal、eukaryote default) → SAMD#####
Step 3: MetaboBank Study (Submission Type=LC-MS)                     → MTBKSn
   notes:
     - Run / Analysis レベル accession は MetaboBank に存在しない (Rule 4c)
     - 異なる実験デザイン (LC-MS / GC-MS / NMR 等) は Study を分割し BioProject でまとめる
     - Comment[Related accession] で関連 DB を `DB:ID` 形式記述
```

### 例 12: Third-party annotation (Rule 7c notes-only)

入力テーブル (公開済み GenBank entry AB######## への第三者アノテーション):

| ファイル | organism | access | data-form | chip |
|---|---|---|---|---|
| annotation.gff | eukaryote | open | annotation | [third-party] |

`FileGroup.referenceMeta`: `citedAccessions=["AB12345678"]`, `pubmedId="38987654"` (peer-reviewed)。

生成 `FlowCard` (Rule 7c PoC は notes-only Step、prefix 自動付与なし):

```
Step 1: Primary BioProject (Project data type=Other)                 → (Submit 不可状態、curatorReviewRequired=true)
Step 2: BioSample (Package=Model organism or animal)                 → (同上)
Step 3: MSS notes-only Step (data-form=annotation, third-party、annotation.gff) → 発行 prefix なし
   warning:
     - 2025/01 より TPA:inferential / TPA:experimental の登録受付は停止
     - Curator 事前相談が必要 ([DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html))
     - peer reviewed publication PubMed:38987654 引用 (要件は満たすが受付経路自体が停止)
   intraDbInputs.curatorReviewRequired: true (Submit ボタン disabled)
   notes: Curator 相談結果メモ欄、確定登録経路 (自由記述)
```

本番フェーズで `_ddbj/tpa.md` 更新を確認し、annotation 単独 TPA 経路が再開されたら notes-only Step を「自動付与あり」モードに切替。
