# 登録ナビゲーション v3 — ファイル種別ボタン + modal Q&A + グルーピング UX

[`docs/submit-alt3.md`](./submit-alt3.md) (本体) のサブ仕様。9 種のファイル種別ボタン、各 modal の Q&A 仕様、ファイル間関係性 (Group) を定義する。

クロスリファレンス:

- ButtonType / FileEntry / FileGroup / FileRole / GroupType の TypeScript 型 → [`submit-alt3-data-model.md`](./submit-alt3-data-model.md)
- modal 内で確定する chip 軸 → [`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.2
- modal で確定した tag から Step 列を生成するルール → [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md)

## 6.1 ボタン 9 種 (3×3 grid)

本体 §3 のボタン配置。table-first フローのため、ボタン押下は **テーブルに行 (or Group) を追加するための入口** で、modal は最小限の質問だけに絞る。

```
[+ 配列リード]          [+ 組み立て済み配列]       [+ 遺伝子アノテーション]
[+ 変異情報]            [+ 表現型データ]            [+ マイクロアレイ発現]
[+ RNA-seq マトリクス]  [+ 質量分析]                [+ 空間トランスクリプトーム]
```

| 表示 (日本語) | キー (`ButtonType`) | アイコン案 (Lucide React) | 取り扱うファイル例 | data-form 初期値 |
|---|---|---|---|---|
| 配列リード | `sequence-read` | `Dna` | FASTQ (single / pair / 10x / multiplex)、BAM、HDF5 | `raw` |
| 組み立て済み配列 | `assembled` | `Layers` | FASTA (WGS / 完成ゲノム / TSA / TLS / EST / MAG / SAG / GSS / SYN)、AGP | `assembled` |
| 遺伝子アノテーション | `annotation` | `Tags` | GFF / GFF3、GenBank flat (第三者アノテーション含む) | `annotation` |
| 変異情報 | `variation` | `GitBranch` | VCF (per-sample / 集約)、reference FASTA | `analysis-output` |
| 表現型データ | `phenotype` | `ClipboardList` | 表現型・臨床情報の table / TSV / CSV (JGA Dataset 想定) | `phenotype` |
| マイクロアレイ発現 | `expression-array` | `Grid3x3` | CEL、iDAT、IDF/SDRF、Xenium / MERFISH 出力 | `raw` |
| RNA-seq 発現マトリクス | `expression-matrix` | `BarChart3` | 発現マトリクス、IDF/SDRF | `matrix` |
| 質量分析 | `mass-spec` | `FlaskConical` | mzML、vendor RAW、imzML+ibd、ピークリスト、MAF | `mass-spec` |
| 空間トランスクリプトーム | `spatial-tx` | `Hexagon` | Visium / Xenium / MERFISH / Stereo-seq / Slide-seq / GeoMx 出力 | `matrix` |

ボタンに含めない (modal 内サブ選択 / 別経路で扱う) もの:

- **BioProject / BioSample / JGA Submission** などの上位メタデータ → Section B の Step カードで扱う (手元にファイルとして持っていない)
- **IDF/SDRF (MAGE-TAB) / MAF / reference FASTA** などの付随メタデータ → 対応する主要 modal の「メタデータも添付」サブ選択で吸収
- **特許配列 (PAT)** → ポータル外、ヘルプから特許機関 (JPO / EPO / USPTO / KIPO) への出願案内のみ

## 6.2 modal の Q&A (行ごとの編集動線でのみ表示)

**重要**: 9 種ボタンを押した瞬間は modal を出さず、ButtonType ごとの default 構成 + 自動連番 baseName (`read-001` / `asm-001` 等) で 1 Group が即時に追加される (本体 §2 操作の典型的な順序 / §3)。modal は **行右端の「編集」アイコン押下時にのみ** 表示し、grouping (pair-end / 10x / multiplex / two-color / hybrid 等) と構造的属性 (assembly-form / variation-form / mass-spec-domain 等) の上書きに使う。

各 ButtonType の default 構成 (modal を開かずに追加される最小構成):

| ButtonType | default groupType | default members (displayName, role) | default chip |
|---|---|---|---|
| `sequence-read` | `pair-end` | `{base}_R1.fastq.gz` (r1) + `{base}_R2.fastq.gz` (r2) | `functional-genomics=yes` |
| `assembled` | `single` | `{base}.fasta` (single) | `assembly-form=wgs` + `functional-genomics=wgs-target` |
| `annotation` | `single` | `{base}.gff3` (single) | `functional-genomics=other` |
| `variation` | `single` | `{base}.vcf.gz` (vcf) | `variation-form=per-sample` + `variation-type=snp-indel` + `functional-genomics=variation-target` |
| `phenotype` | `single` | `{base}.tsv` (phenotype-table) | `functional-genomics=other` |
| `expression-array` | `single` | `{base}.cel` (single) | `functional-genomics=yes` |
| `expression-matrix` | `single` | `{base}_counts.tsv` (single) | `functional-genomics=yes` + groupOverrides `experimentTypeHint=bulk-rnaseq` |
| `mass-spec` | `single` | `{base}.mzML` (single) | `mass-spec-domain=metabolomics` + `functional-genomics=other` + groupOverrides `metaboBankSubmissionType=LC-MS` |
| `spatial-tx` | `single` | `{base}_matrix.tsv` (single) | `functional-genomics=yes` + `spatial-platform=visium` |

`{base}` は ButtonType ごとの prefix + 連番 (3 桁 zero-padded)。prefix: `sequence-read=read` / `assembled=asm` / `annotation=ann` / `variation=var` / `phenotype=phe` / `expression-array=arr` / `expression-matrix=mtx` / `mass-spec=ms` / `spatial-tx=spt`。連番は同 ButtonType 内の既存 displayName から max+1 を取る (削除後の再追加で衝突しない)。実装は `src/lib/submit-alt3/defaultPayload.ts`。

各 modal は **grouping + 構造的属性の確定のみ** に絞る。組織 / 公開可否 / データ形態などのテーブル列 3 軸はテーブル per-cell 編集に委ね、Library Strategy / Library Selection / Library Source / Package / GEA Experiment Type 等の Intra-DB pulldown は Step カード内 ([`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.3) で後段確定する。

行の「編集」アイコンで modal を開いた場合、modal の「OK / 追加」を押下した瞬間に **旧 Group の全 file が remove され、新規 Group + members が atomic に置換される** (`src/components/submit-alt3/FileTableSection.tsx` `handleSubmitWithReplace`)。modal の **「キャンセル」操作** は state を変更せず元の状態に戻す。

**ファイル名の取り扱い**: modal はファイル名 (baseName) のテキスト入力を **持たない**。modal は ButtonType ごとの内部 default baseName (`sample` / `assembly` / `annotation` / `variants` / `phenotype` / `array` / `matrix` / `massspec` / `spatial`) を members template に埋め込むだけで、ユーザーには見せない。編集動線で modal を再オープンして submit すると、`handleSubmitWithReplace` が **旧 Group の displayName を継承** する (members 数が変わらない場合)。grouping を変更 (single → pair-end 等) した場合は members 数が変わるので modal の default baseName が使われる (この場合だけファイル名が `sample_R1.fastq.gz` 等に変わる)。新規追加でも modal を経由しないため、ファイル名は `defaultPayload.ts` の自動連番 (`read-001_R1.fastq.gz` 等) で決まる。

modal で確定するもの:

1. **GroupType**: ファイル間関係性 (pair-end / 10x / multiplex / two-color / hybrid / MAGE-TAB / imaging MS / variation-ref / MAG-SAG chain / JGA Dataset)
2. **構造的属性**: アセンブリ種別 (`assembly-form`)、provenance (`third-party` の場合のみ)、variation 形態 (`variation-form` / `variation-type`)、haplotype-mode、mass-spec-domain、microarray のカラー数 (Group 構造で表現)、空間 Tx プラットフォーム
3. **`functional-genomics` 軸 (+ 配列リード modal のみ)**: 他 8 modal は ButtonType + 既存 modal 質問で軸が自動確定 ([`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.2.1)

modal で確定しないもの (テーブル per-cell 編集 / Step カード pulldown 側):

- organism / access / data-form (テーブル列)
- Library Source / Library Strategy / Library Selection / Layout / Instrument / Run File Type (Step DRA pulldown)
- BS Package (Step BS pulldown)
- GEA Experiment Type 40 種の具体値 (Step GEA pulldown、大カテゴリだけ modal で絞り込みヒント)

**modal 内表記規約** (各 modal Q&A の選択肢書式):

- `(o)` / `( )` — radio button (相互排他、1 つだけ選択可能)
- `[ ]` / `[x]` — checkbox (単独 ON/OFF または複数選択可。「メタデータも添付」「Hybrid Assembly ですか?」等のオプション質問に使う)

選択肢に同型の question を複数並べる場合は radio (排他選択) を default とし、複数選択がユースケース上自然な場合のみ checkbox を使う。

### + 配列リード

```
リードの構成は?  (GroupType + FileRole を決定)
(o) single-end FASTQ (1 ファイル)
( ) pair-end FASTQ (R1 + R2 の 2 ファイル)
( ) 10x Genomics FASTQ (I1 + I2 + R1 + R2)
( ) BAM / SAM (1 ファイル、必要なら reference fasta は + 変異情報 modal の variation-ref Group で添付)
( ) PacBio HDF5 (bas.h5 + bax.h5 × 3)
( ) その他 / 不明

multiplex pool ですか?  (single-end / pair-end / BAM 選択時のみ表示、10x / PacBio HDF5 は構造上 multiplex 扱いしない)
(o) 既に sample 別に demux 済み (per-sample FASTQ を複数行で追加)
( ) pool のまま → 「DDBJ では事前 demultiplex 必須です」と案内 (本体 §4.4)

(初回追加時)
Hybrid Assembly ですか?  (異 instrument の Run を同 BioSample 配下の複数 Experiment として登録)
[ ] はい → ボタン「OK」押下後、テーブルに 1 つ目の Run Group + hybrid メタ Group が追加される。2 回目に + 配列リードボタンを押下すると下記の「相手の Hybrid Assembly Group に参加」サブ選択が出る

(2 回目以降の追加時のみ表示、Submission 内に空き hybrid メタ Group が存在する場合)
既存の Hybrid Assembly Group に追加しますか?
(o) いいえ (新しい独立 Group として追加)
( ) はい — [既存の hybrid メタ Group を選択 pulldown]

Q1: この実験では発現量 / エピジェネティクス / ジェノタイピング等の解析済みデータも登録しますか?
(o) はい (発現量行列 / peak / methylation / scRNA counts / Hi-C contact matrix 等)
( ) いいえ (raw 配列だけ、GEA には登録しない)

(Q1 = 「いいえ」のみ表示)
Q2: 最終的なアウトプットはどれが一番近いですか?
(o) 完成ゲノム / Draft assembly (WGS) → `functional-genomics=wgs-target`
( ) Transcriptome assembly (TSA) → `functional-genomics=tsa-target`
( ) メタゲノムアセンブリ (MAG / SAG / Binned) → `functional-genomics=metagenome-target`
( ) 変異情報 (variation / CNV) → `functional-genomics=variation-target`
( ) 全エクソーム配列 (WES、特定領域の variation 検出など) → `functional-genomics=wes-target`
( ) その他 / 不明 → `functional-genomics=other`
```

選択に応じて確定するもの:

- **GroupType**: single-end → `single`、pair-end → `pair-end`、10x → `10x`、PacBio HDF5 → `pacbio-hdf5` (bas.h5 + bax.h5 × 3、FileRole `bas-h5` / `bax-h5`)、BAM / SAM → `single` (FileRole `bam`、reference fasta が要る場合は + 変異情報 modal 経由で `variation-ref` Group の reference fasta 添付サブ選択を使う)、multiplex demux 済み → `multiplex` (本体 §4.1)
- **chip `functional-genomics`**: Q1=yes → `yes` (= GEA 登録)、Q1=no → Q2 回答に応じて 6 種 (上記の対応関係)
- **Hybrid Assembly**: 1 回目の追加で `pair-end` (or `single`) Group が生成されたあと、`Hybrid Assembly` チェック ON + 別 instrument の Run を追加で表現する。`hybrid` GroupType は 2 つ以上のサブ Group (例: short-read pair-end Group + long-read single Group) を束ねる **メタ Group**。data-model 上は `FileGroup.groupType="hybrid"` で `memberGroupIds` に子 FileGroup の id を、子 FileGroup の `parentGroupId` に親 hybrid Group の id を双方向で設定する (cf. §7.4 + data-model §4.4.3)

modal は **ファイル名 + GroupType + functional-genomics 軸の確定** で閉じる。Library Source / Strategy / Selection / Instrument / Run File Type の controlled vocabulary 選択は Step DRA カードに委ねる。テーブル per-cell 編集で organism / access / data-form を埋めると Section B の Step 列が確定する。

multiplex / pooled FASTQ は **事前 demultiplex 必須** (本体 §4.4、DDBJ FAQ `metadata-of-multiplexed-samples`)。pool のまま選択時は modal でエラー表示し、demultiplex 済みの per-sample FASTQ をテーブルに 1 行ずつ追加するよう案内する。`multiplex` Group は N 個の per-sample FASTQ + N 個の BS を束ねる構造。

### + 組み立て済み配列

```
何のアセンブリですか?
(o) ゲノム (de novo, primary、WGS 系) → assembly-form=wgs
( ) 完成ゲノム (Finished、コンティグ 1 つの完成染色体) → assembly-form=gnm
( ) 転写産物 (TSA) → assembly-form=tsa
( ) 16S/COI などマーカー (TLS) → assembly-form=tls
( ) EST → assembly-form=est
( ) MAG / SAG / Binned (メタゲノム由来 derived BS chain) → assembly-form=mag|sag
( ) HTG / HTC (高処理ゲノム / cDNA) → assembly-form=htg|htc
( ) GSS (Genome Survey Sequence) → assembly-form=gss
( ) 合成配列 (SYN) → assembly-form=syn
( ) DDBJ Curator に相談する / 不明 → assembly-form=ask

第三者再アセンブル (公開配列の再解析、TPA) ですか?
[ ] はい → chip provenance=third-party

(第三者選択時) INSDC/TPA サブタイプは?
(o) TPA:assembly (アセンブリ自体が peer-review の対象。一般的な再アセンブル)
( ) TPA:specialist_db (公的 specialist database 由来、DDBJ では受付しない → 案内のみ)
【注意】2025 年 1 月以降、TPA:experimental / TPA:inferential は登録受付停止

Haplotype phased ですか? (同サンプル由来の Principal / Alternate を 2 セット登録)
[ ] はい → chip haplotype-mode=phased、BP Step が複数生成 (Principal BP + Alternate BP + DRA 用 BP + Umbrella BP)

アノテーション (GFF / GenBank flat) も同時に持ちますか?
[ ] はい → 別途 + 遺伝子アノテーションボタンで追加し、assembly-annotation Group を構成
```

選択に応じて確定するもの:

- **chip `assembly-form`** (13 種値域)
- **chip `functional-genomics`**: `assembly-form` 値から自動推測 (マッピングは [`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.2.2)
- **chip `provenance`** (第三者選択時のみ `third-party`、それ以外は表示なし)
- **chip `haplotype-mode`** (yes 選択時のみ `phased`)
- **従属 chip `tpa-subtype`** (第三者選択時のみ): `tpa-assembly` / `tpa-specialist-db`。`tpa-specialist-db` は DDBJ で受付しないため Step MSS が案内 only に降格する (Rule 7a)
- **従属 chip `haplotype-naming`** (Haplotype phased 選択時のみ): `principal-alternate` / `haplotype-1-2` / `maternal-paternal` (Rule 11c)
- **`FileGroup.referenceMeta`** (第三者選択時のみ): 参照元 accession 配列 + DOI / PubMed ID を格納
- **`mag-sag-chain` Group** (MAG / SAG 選択時): 後段で `derived_from` 属性で派生 BS chain を表現

ファイル名 (or 仮名) を入力。raw リードを別途持つ場合は + 配列リード で追加するよう案内 (Hybrid Assembly の Run + Assembly 構成も同様に別 Group 連携)。

**「既存 BS と関連付け」select** (テーブルに既に 1 件以上 BS が登録済みのとき表示):

```
この組み立て済み配列は既に追加済みの sample に由来しますか?
(o) 新しい sample として登録する (既定)
( ) 既存の sample と同一: [select: bs-1 (sample_R1.fastq.gz 等), bs-2 (...), ...]
```

選択した既存 BS は `FileGroup.sourceBsHint` として保存され、`recomputeBpAndBs` が新規 BS を作らず指定 BS の `sourceGroupIds` に新規 Group を append する (data-model §4.3.1 「同 sample 関連付け」)。例: raw pair-end Group + 組み立て済み Group を同 sample にすれば BP+BS+DRA+MSS の 4 Step に正規化される (flow-rules §8.2 例 1 SSOT 理想形)。

**`misc` と `ask` の区別**:

- modal で **`ask` のみ** をユーザー選択肢として提示する (= 「DDBJ Curator に相談する / 不明」)。PoC では「その他混合系で MISC データタイプ確定」のケースは modal でなく Step MSS カードの DATATYPE 補助 pulldown で `MISC` を明示選択する流れに集約 (Curator 相談後にユーザー自身でデータタイプを確定する想定)
- `assembly-form=ask` の行は Step MSS カードに「DDBJ Curator 事前相談が必要」notes + [DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) リンクを表示、Submit 不可状態 (Rule 7c 同型の curatorReviewRequired)
- Curator 相談後にユーザーが Step MSS カードの DATATYPE 補助 pulldown で `MISC` / `ASK` / `WGS` / `GNM` / 等を明示選択し、選択値に応じて `assembly-form` chip も自動同期する

**SYN / GSS について** (`_ddbj/data-categories.md` SSOT、専用ページ `_ddbj/env.html` / `_ddbj/gss.html`):

- **SYN (synthetic constructs)**: 人為的な操作により構築された合成配列 (発現ベクター、プライマー、キメラ配列、fusion 配列、人為的に変異を導入した配列等)。複数の生物種・遺伝子由来の断片をつなぎ合わせた合成配列では複数 `source` feature で記載
- **GSS (genome survey sequences)**: short single pass のゲノム配列。原則として `source` 以外の feature key は記述されない
- PoC では + 組み立て済み配列 modal のアセンブリ種別「合成配列 (SYN)」/「GSS」サブ選択で吸収。**本番フェーズの単独 ButtonType 化判断材料**: SYN は合成生物学 / molecular cloning 領域での頻度、GSS は近年 WGS 発展で減少傾向 — 単独化が UX 上の利益となるか、modal 吸収で十分かを PoC リリース後の利用ログで再判断

### + 遺伝子アノテーション

```
何の配列に対するアノテーションですか?
(o) アセンブリ済みゲノム配列に対する annotation (一次)
( ) Transcriptome assembly に対する annotation (一次)
( ) 既存公開配列の第三者アノテーション (Third-party annotation)
( ) その他

ファイル形式は?
[ ] GFF / GFF3
[ ] GenBank flat
[ ] その他

(第三者アノテーション選択時のみ表示)
参照元 accession を入力してください
[ テキスト: 既発行アクセッション番号 (DRR / 二文字 prefix + 数字 等) ]
公開査読論文の DOI / PubMed ID を入力してください (必須、INSDC TPA 規範)
[ テキスト: DOI または PubMed ID ]
```

選択に応じて確定するもの:

- **`assembly-annotation` Group** (アセンブリ済みゲノム / TSA 選択時): 同 Group の FASTA とリンク
- **chip `provenance=third-party`** (第三者アノテーション選択時のみ)
- **`FileGroup.referenceMeta`** (第三者アノテーション選択時のみ): 参照元 accession + DOI / PubMed ID を格納
- **Step MSS カードへの案内** (第三者選択時、Rule 7c PoC 方針): PoC では `TPA:inferential` の DEFINITION 行 prefix を **自動付与しない**。理由: 2025/01 より `TPA:inferential` / `TPA:experimental` は登録受付停止 (`/news/ja/2024-09-05.html`、`_ddbj/tpa.md`)。代わりに Step MSS は **notes-only Step** として「DDBJ Curator 事前相談が必要」+ [DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) リンク + 入力欄に Curator 判断結果を控える欄を表示し、ユーザーは登録経路を案内に従って確定する。ddbj/www `_ddbj/assembly.md` L.148「Third party genome assembly submissions and updates ... are subject to existing third party annotation rules, including the requirement for presentation of the new/updated genome assembly in a peer reviewed publication prior to public release from INSDC」が SSOT。本番フェーズで `_ddbj/tpa.md` を再確認し、annotation 単独 TPA の独立経路がある場合は Rule 7c を再開する

軸の自動確定: chip `functional-genomics=other` (annotation は MSS 経路で完結、GEA を通らない)。

### + 変異情報

```
VCF の集約形態は?
(o) サンプル個別の VCF (per-sample)
( ) 集約 VCF (aggregate、複数サンプルを 1 ファイル)

変異の種類は?
(o) SNP / Indel (短い変異、点変異 / 短いインデル、≤50 bp)
( ) Structural Variant (SV、大規模構造変異、>50 bp)
( ) Copy Number Variant (CNV、コピー数変異)

参照配列はありますか?
(o) 添付しない (reference の指定なし、または別行で reference を持つ場合)
( ) reference FASTA を一緒に登録 → variation-ref Group を構成
( ) 既存 accession を参照のみ → reference テキスト入力
```

選択に応じて確定するもの:

- **chip `variation-form`** (`per-sample` / `aggregate`)
- **chip `variation-type`** (`snp-indel` / `sv` / `cnv`)
- **`variation-ref` Group** (reference FASTA 添付選択時)

軸の自動確定: chip `functional-genomics=variation-target` (variation processed は GEA でなく TogoVar / EVA / dgVa)。

variation-type が chip 軸である理由: 非ヒトで EVA (snp-indel) と dgVa (sv / cnv) が別 Service、ヒト open で TogoVar SNP (≤50 bp) / SV (>50 bp、cnv 含む) が別 Service。Step 列構成が変わるため chip ([`submit-alt3-tags.md`](./submit-alt3-tags.md) §5.2 / §5.4)。

### + 表現型データ

本体 §3 で新規追加。配列なしの表現型・臨床情報 table を JGA Dataset / BS attribute 経路で登録する。

modal は **access の初期値** と **`jga-dataset` Group の宣言** だけを確定する。最終的な経路振り分け (Rule 10a JGA chain vs Rule 10b BS attribute) は **テーブル列 organism × access の確定値** で機械的に決まり、modal 時点で不確定でもよい (Rule 10c の不明選択は安全側で `restricted` 暫定)。

```
ファイル形式は?
(o) TSV / CSV (BS と紐付ける表現型表)
( ) Excel / .xlsx
( ) その他

このデータには個人特定可能な情報 (氏名 / 住所 / ID 番号 / 個人ゲノム識別子等) が含まれますか?
(o) はい → access=restricted 自動設定 (columnSource=auto)
( ) いいえ → 列 access はユーザーが open / restricted を選択 (デフォルトは未設定の警告)
( ) 不明 → **安全側として access=restricted 暫定** (columnSource=auto)、相談結果に応じてユーザーが access 列を編集。
   不明判定時の案内表示先: Rule 10a で抑制対象になる BS Step の代わりに、**Rule 6a / 6b / 6c のいずれかで生成される JGA Sample Step (`jga-sample`)** の notes に [DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) + [DBCLS 提供申請システム](https://humandbs.ddbj.nig.ac.jp/nbdc/application/) URL を表示する。ユーザーが access を `open` に切替えると generateFlowCard が再評価し Rule 10b 経路の BS Step に切替わる

このデータを JGA Dataset として束ねますか?  (`jga-dataset` Group の宣言、Rule 10a 経路時のみ実際に発火)
(o) いいえ (デフォルト)
( ) はい — 同 Submission 内の他の行 (配列 / 変異 / 表現型) と Dataset として束ねる

(JGA Dataset 選択時)
対象の行はテーブル内のどれですか?
[ 既存行を複数チェック ]
```

選択に応じて確定するもの:

- **個人特定情報 yes → access=restricted 自動設定** (`columnSource.accessRestriction="auto"`)。ユーザーは列で編集可能
- **`jga-dataset` Group** (modal で「はい」選択時): 配列 / 変異 / 表現型を Dataset として束ねる宣言を `Submission` state に保存。実際の Step 生成は経路で分岐 (下記)
- **`phenotype-table` FileRole**

軸の自動確定: chip `functional-genomics=other`。data-form 列は `phenotype`。

経路は **テーブル列 organism × access の確定値** で分岐 ([`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 10):

- **Rule 10a 経路** (access=restricted + organism ∈ {human, human-microbiome}): JGA chain (`jga-sample` / `jga-data` / `jga-analysis` / `jga-dataset`) に集約。modal で `jga-dataset` Group を宣言済みなら Rule 6c (Sample-Dataset 直結、配列なし phenotype-only Dataset でも可) もしくは Rule 6a/6b に Dataset Step を追加する形で発火
- **Rule 10b 経路** (access=open または organism ∉ {human, human-microbiome}): BS のサンプル属性として吸収。modal で `jga-dataset` Group を宣言していても **generateFlowCard 側で無視され BS attribute 経路に集約** される (Step JGA Dataset は生成されない、warning notes 「列 access / organism が JGA 経路の条件を満たさないため Dataset は生成されません」を Step BS カードに表示)

modal で「JGA Dataset 束ねる はい」を選び、後でテーブル per-cell 編集で access を open に変更した場合も同様 (state 上 `jga-dataset` Group は残るが Step が生成されない、acknowledged 可能な warning で通知)。

### + マイクロアレイ発現

```
カラー数は?
(o) single-color (Cy3 のみ)
( ) two-color (Cy3 + Cy5)

ファイル形式は?
[ ] Affymetrix CEL
[ ] Illumina iDAT
[ ] Agilent native / GenePix / NimbleScan native
[ ] その他

MAGE-TAB メタデータ (IDF + SDRF) も添付しますか?
[ ] はい → mage-tab Group を構成
[ ] いいえ
```

選択に応じて確定するもの:

- **`two-color` Group** (two-color 選択時): Cy3 / Cy5 ロール指定
- **`mage-tab` Group** (MAGE-TAB 添付選択時)

軸の自動確定: chip `functional-genomics=yes` (microarray は functional genomics の定義、ddbj/www `_gea/index.md`)。

GEA Microarray Experiment Type (Affymetrix / Illumina / Agilent 別) の controlled vocabulary は Step GEA カードの pulldown で確定する。

### + RNA-seq 発現マトリクス

```
ファイルの内容は?
(o) カウント行列 (counts.tsv)
( ) TPM / FPKM 正規化値
( ) その他

GEA Experiment Type の大まかなカテゴリは? (Step GEA pulldown 絞り込みヒント)
(o) bulk RNA-seq (coding / non-coding)
( ) single-cell RNA-seq (coding / non-coding)
( ) miRNA / small RNA profiling
( ) Bisulfite-seq / methylation profiling
( ) ChIP-seq / ATAC-seq / FAIRE-seq / MNase-seq / MeDIP-seq
( ) Hi-C / 4C / Capture-C (chromatin conformation)
( ) RIP-seq / CLIP-seq (protein-RNA / protein-DNA)
( ) genotyping / DNA-seq / GRO-seq
( ) その他

MAGE-TAB メタデータ (IDF + SDRF) も添付しますか?
[ ] はい → mage-tab Group を構成
[ ] いいえ

配列リード (raw FASTQ / BAM) もありますか?
[ ] はい → 別途 + 配列リードボタンで追加
```

選択に応じて確定するもの:

- **`mage-tab` Group** (MAGE-TAB 添付選択時)
- **data-form 初期値 = matrix**
- **GEA Experiment Type 大カテゴリ**: Step GEA pulldown で 40 種の具体値を絞り込みヒントとして提示 (`_gea/experiment-types.md` SSOT)

軸の自動確定: chip `functional-genomics=yes` (matrix は functional genomics processed data の代表)。

raw FASTQ も持つ場合は + 配列リードで別 Group として追加、Section B では raw → DRA、matrix → GEA の二段 Step として表示される。

### + 質量分析

```
何の分析ですか?
(o) プロテオーム (proteomics) → jPOST 外部リダイレクト Step
( ) メタボローム (metabolomics) → MetaboBank Step
( ) Imaging MS → MetaboBank imaging stream

(metabolomics 選択時) MetaboBank Submission Type は?
(o) LC-MS
( ) LC-DAD-MS / GC-MS / GCGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS / NMR

(imaging 選択時) 自動で MetaboBank Submission Type = MSI

ファイル形式は?
[ ] mzML / nmrML
[ ] vendor RAW (.raw / .d / native)
[ ] imzML + ibd (imaging)

メタボローム代謝物アサインメント (MAF) も添付しますか?
[ ] はい → 同 Group の MAF メンバとして追加
[ ] いいえ
```

選択に応じて確定するもの:

- **chip `mass-spec-domain`**: `proteomics` / `metabolomics` / `imaging`
- **`imaging-ms` Group** (imaging 選択時): imzML + ibd + image
- **Step MetaboBank pulldown 既定値**: 11 種 (LC-MS / LC-DAD-MS / GC-MS / GCGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS / MSI / NMR)

軸の自動確定: chip `functional-genomics=other` (質量分析は GEA 経路を通らない、ddbj/www `_gea/index.md` の functional genomics 定義範囲外)。

proteomics は jPOST 外部リダイレクト Step (BP / BS は jPOST 側で管理)。metabolomics / imaging は MetaboBank。

### + 空間トランスクリプトーム

```
プラットフォームは?
(o) 10x Genomics Visium
( ) 10x Genomics Xenium
( ) MERFISH / MERSCOPE
( ) Stereo-seq (BGI / STOmics)
( ) Slide-seq / Slide-seqV2
( ) NanoString GeoMx DSP
( ) その他 (GEA チーム要問い合わせ)

(GeoMx DSP 選択時のみ)
readout は?  (Rule 4d の GEA Submission Type 振り分けキー)
(o) NGS (シーケンサー読み出し、Visium 型 = Sequencing 二段)
( ) nCounter (蛍光プローブ読み出し、Microarray 型 = 1 段)

MAGE-TAB メタデータ (IDF + SDRF) も添付しますか?
[ ] はい → mage-tab Group を構成
[ ] いいえ (Xenium / MERFISH は専用 Array Design テンプレートあり)

配列リード (raw FASTQ / BAM) もありますか?
[ ] はい → 別途 + 配列リードボタンで追加
```

選択に応じて確定するもの:

- **chip `functional-genomics=yes` 自動**: Visium / Xenium / MERFISH 共通で functional genomics
- **従属 chip `spatial-platform`**: modal の「プラットフォーム」回答を `visium` / `xenium` / `merfish` / `stereo-seq` / `slide-seq` / `geomx` / `other` で保持。Rule 4d の GEA Submission Type + Array Design 振り分けに使う
- **`FileGroup.referenceMeta.geomxReadout`** (GeoMx DSP 選択時のみ): `"ngs"` / `"ncounter"` を保持。Rule 4d で `gea` Submission Type と DRA Step 二段の要否を切替
- **`mage-tab` Group** (添付選択時)

GEA Submission Type はプラットフォーム別 (ddbj/www `_gea/spatial-gene-expression.md` SSOT):

| プラットフォーム | GEA Submission Type | Array Design | 備考 |
|---|---|---|---|
| 10x Genomics Visium | Sequencing | (なし) | DRA に fastq/bam、GEA processed data に GEX Matrix + 組織画像 + scalefactors_json.json + tissue_positions_list.csv 等を tar でまとめて登録 |
| 10x Genomics Xenium | Microarray | A-GEAD-246 | Raw: morphology.ome.tif + transcripts.parquet、Processed: barcodes/features/matrix + cells/boundaries (parquet/csv) |
| MERFISH / MERSCOPE | Microarray | A-GEAD-247 | 解析済みデータ必須。画像 / .vzg は GEA 受入不可、Generalist archive 推奨 |
| Stereo-seq | Sequencing (PoC 暫定) | (なし、要新規申請) | sequencing-based、Visium と同じ二段。専用 Array Design は ddbj/www 未収録、GEA チーム事前問い合わせ ([DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html)) |
| Slide-seq / Slide-seqV2 | Sequencing (PoC 暫定) | (なし、要新規申請) | sequencing-based、GEO 登録実例あり。DDBJ GEA で新規申請する場合は ADF を GEA submission directory にアップロード (`_gea/adf-e.md`) + [DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) |
| GeoMx DSP | NGS readout: Sequencing / nCounter readout: Microarray (PoC 暫定) | (要新規申請) | RNA / protein プロファイル可能。NGS readout は Visium 型 (Sequencing 二段)、nCounter readout は Microarray 型。事前問い合わせ ([DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html)) |
| その他 | 個別確認 | 個別 | GEA チーム問い合わせ ([DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html)) → Generalist archive 案内 |

## 6.3 取りこぼし対応

9 ボタンで直接拾えない要素の吸収先:

| 取りこぼし | 対応 |
|---|---|
| MAGE-TAB IDF / SDRF (発現メタデータ) | + マイクロアレイ / + RNA-seq マトリクス / + 空間 Tx modal の「メタデータも添付」 → `mage-tab` Group |
| MAF (メタボローム代謝物アサインメント) | + 質量分析 modal の「MAF も添付」 |
| Reference FASTA (BAM / VCF のリファレンス) | + 配列リードで BAM 選択時、または + 変異情報で参照 FASTA 添付選択時に同 Group |
| プロテオーム (jPOST) | + 質量分析 modal の proteomics 選択 → jPOST 外部リダイレクト Step |
| 表現型データ単独 (JGA Dataset 想定) | + 表現型データ modal |
| BioProject / BioSample / JGA Submission | Section B Step カード (modal でなく上位レイヤー) |
| 特許配列 (PAT) | ポータル外。ヘルプから特許機関への出願案内のみ (本体 §7.3) |

## 7. グルーピング UX

ボタン押下時 modal で Group を確定する (本体 §4.2)。

### 7.1 Group パターン一覧 (本体 §4.1 と整合)

| ケース | `GroupType` | メンバ | 主な modal Q&A |
|---|---|---|---|
| 単独 | `single` | 1 ファイル | (Group 関連 Q&A なし) |
| pair-end FASTQ | `pair-end` | R1 + R2 | + 配列リード modal で「pair-end」選択 |
| 10x Genomics | `10x` | I1 (+ I2) + R1 + R2 | + 配列リード modal で「10x」選択 |
| Two-color microarray | `two-color` | Cy3 + Cy5 | + マイクロアレイ modal で「two-color」選択 |
| Hybrid assembly | `hybrid` | 異 instrument の Run 群 (各 Run = 別 Experiment、同 BioSample 配下) | + 配列リードを 2 回押下、後段で Step DRA カードで関連付け表示 |
| Multiplex (事前 demultiplex 済み) | `multiplex` | N per-sample FASTQ + N BS | + 配列リード modal で「demux 済み multiplex」選択。pool のまま選択は「事前 demultiplex 必須」エラー (本体 §4.4) |
| Imaging MS | `imaging-ms` | imzML + ibd (+ image) | + 質量分析 modal で「Imaging MS」選択 |
| MAGE-TAB | `mage-tab` | IDF + SDRF + N raw + N processed | + マイクロアレイ / + RNA-seq / + 空間 Tx modal で「メタデータも添付」 |
| MAG / SAG derived chain | `mag-sag-chain` | raw + analysis + MAG/SAG fasta | + 配列リード → + 組み立て済み (MAG / SAG) で順次追加、後段で `derived_from` を確定 |
| 変異 + 参照 | `variation-ref` | VCF + reference fasta | + 変異情報 modal で「reference FASTA を一緒に登録」選択 |
| アセンブリ + アノテーション | `assembly-annotation` | FASTA + GFF | + 組み立て済み配列 + + 遺伝子アノテーション の併用 |
| JGA Dataset | `jga-dataset` | 配列リード / 変異 / 表現型を束ねる | + 表現型データ modal で JGA Dataset 選択、または事後にテーブル上で複数行を Dataset としてまとめる |

### 7.2 行 / Group の UI

本体 §2 の table-first フローでは、Group は **テーブル上で indent と共通の Group ヘッダで視覚化** する。

```
+------------------+--------+----------+-----------+------------------+
| ファイル          | 生物   | 公開     | データ形態| chip             |
+------------------+--------+----------+-----------+------------------+
| ↳ Group: pair-end (sample1_R1 + R2)                                |
|   sample1_R1.fq  | human  |restricted| raw       |                  |
|   sample1_R2.fq  | human  |restricted| raw       |                  |
| assembly.fa      | mouse  | open     | 組立済    | [WGS]            |
| variants.vcf     | mouse  | open     | 解析出力  | [aggregate][snp] |
+------------------+--------+----------+-----------+------------------+
```

- Group ヘッダ行で `GroupType` ラベル + メンバ概要を表示
- メンバ行は indent で視覚化、列の値は per-cell 編集
- chip 列には modal で確定した「非 grouping」属性のみが並ぶ (`pair-end` は Group 構造で表現されるため chip にしない)

### 7.3 後修正の操作

- **Edit Group**: Group ヘッダ右の操作メニューから modal を再表示、属性を変更
- **Ungroup**: Group を解除して各 FileEntry を `single` Group に戻す。Group 固有 chip (例: `mag-sag-chain` 由来の `assembly-form=mag`) は **維持**、Group 構造のみが表現していた情報 (`derived_from` 派生 BS chain / Hybrid Assembly 関連付け / pair-end の R1-R2 対応 等) は **喪失** するため、確認ダイアログ「Ungroup すると派生 BS chain / Hybrid Assembly 関連付け等は失われます。続行?」を表示
- **+ Add to Group**: 同種の追加ファイル (例: pair-end Group に技術レプリケート用の追加 fastq を加える) を append。Group の必須メンバ構造を満たさない追加 (例: pair-end Group に 3 ファイル目を追加) は warning 表示
- **行削除**: 行 hover でゴミ箱アイコン、削除確認 modal。Group の必須メンバ (例: pair-end Group の R2、imaging-ms Group の ibd) を削除する場合は「Group が崩れます。残メンバを `single` に降格しますか?」確認 → 承認時に Group 解除 + 残メンバを `single` 降格、`mag-sag-chain` Group で中間段階の派生 BS を削除する場合は「下位段階の `derived_from` 参照が消えます」警告
- **cell 編集の補助** (本体 §5.4): 直前の行と同じ値をデフォルト提案、複数行選択 + 一括編集、未設定 cell は ⚠ 警告、矛盾 cell (Library Strategy=WGS なのに data-form=matrix など) は強調表示

### 7.4 Hybrid Assembly の特殊扱い

DRA データモデル上、**1 Experiment = 1 library + 1 instrument** の制約があり (ddbj/www `_dra/metadata.md` Experiment 定義: 「複数の Experiment は１つの BioSample を参照することができますが、１つの Experiment が複数の BioSample を参照することはできません」)、異 instrument の Run を 1 つの Experiment にまとめることはできない。

Hybrid Assembly は **同 BioProject + 同 BioSample 配下に複数 Experiment (instrument 別) を登録** する構造で表現する。具体例:

- Experiment #1 = short-read library (例: Illumina HiSeq) → Run #1 (R1 + R2)
- Experiment #2 = long-read library (例: PacBio Sequel) → Run #2
- 両 Experiment は同じ BioSample / 同じ BioProject を参照
- 合成された assembly は別途 DRA Analysis または MSS-WGS Step として登録 ([`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 15)

#### data-model 上の Group 構造 (`hybrid` = メタ Group)

`hybrid` GroupType は **複数のサブ Group を束ねるメタ Group** として実装する ([`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.3):

- 短鎖リード側は `pair-end` (もしくは `single`) Group として通常通り追加され FileEntry を持つ
- 長鎖リード側は `single` Group として追加される
- これら 2 つ以上のサブ Group を `groupType="hybrid"` の親 FileGroup が `memberGroupIds: [短鎖 Group の id, 長鎖 Group の id]` で参照する (子 Group は `parentGroupId` に親 hybrid Group の id を持つ、双方向 referential integrity)

UI 上は + 配列リード modal で 1 回目に短鎖リードを追加 → 「Hybrid Assembly ですか?」チェック ON → 2 回目に + 配列リードボタンで long-read を追加し「相手の Hybrid Assembly Group に参加」を選ぶ流れで実現する。`hybrid` メタ Group はテーブル上の Group ヘッダで `short-read + long-read (Hybrid Assembly)` ラベルを表示する。

`hybrid` メタ Group の役割は **複数 Run の関連性を Step DRA カード上で視覚化する** ことで、内部的に 1 Experiment に統合するわけではない。Step DRA カードでは Hybrid Assembly Group を「short-read Experiment + long-read Experiment」として両 Experiment を並べて表示する。

Library Name / Library Construction Protocol への入力案内 (`_dra/metadata.md` 準拠):

- Library Name に Hybrid Assembly 識別子を含める (例: `myproject_hybrid_short` / `myproject_hybrid_long`)。同 BioSample 配下の複数 Experiment を識別しやすくするための運用慣行
- Library Construction Protocol (自由記述) で Hybrid Assembly 構成と相手側 instrument を記載

ddbj/www に Hybrid Assembly 専用の明示規範記述はないが、DRA データモデルの「1 Experiment = 1 instrument」制約と BioSample 多重参照可能性から、上記構造が正当な表現となる。

## 8. Step Input Popover (Section B の Step 入力編集)

各 Step カードの「Step 入力を編集」ボタンから開く inline popover。`StepInputPopover` ([`src/components/submit-alt3/StepInputPopover.tsx`](../src/components/submit-alt3/StepInputPopover.tsx)) が実装。

### 8.1 開閉条件

- **open**: Step カードの「Step 入力を編集」ボタン押下、または warning UI の `onFocusStepInput(field)` 呼び出し時にフォーカス指定で open
- **close**: 同じボタン再押下 (toggle) / popover 外クリック / Esc キー
- **Service 単位 merge との関係**: merge 後 Step カードでは segments[] が複数並ぶため、open 状態は `{ stepId, segmentId, focusField? }` で保持し、同 Step カード内で別 segment にトグルできる

### 8.2 不変条件 (props 安定性)

`StepInputPopover` の外部クリック検知 `useEffect` は `[onClose]` を依存配列に持つ。`onClose` が再レンダごとに新規参照になると `useEffect` の register / cleanup が競合し、外部クリックハンドラが安定して登録されない (popover が閉じられない原因となる)。

呼び出し元 (`FlowCardSection`) は以下を満たす:

- `onClose` を `useCallback` でメモ化 (依存配列は `[]`)
- `setOpenInput` を引き渡す関数も同様に安定化
- segment 経由の open は `setOpenInput((prev) => ...)` の関数形式で記述し、stale closure を避ける

### 8.3 segment 単位の Step 入力

merge 後 Step では `intraDbInputs` は `step.segments[].intraDbInputs` 側に格納される。`StepInputPopover` は props で受け取った `segment?: FlowStepSegment` を優先し、segment が undefined のときに限り `step.intraDbInputs` を読む。`onUpdate` 経路の stepId 引数は **segmentId** (= merge 前 Step.id、`Submission.serviceDrafts[]` のキーと一致) を渡す。

詳細な型は [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.4.2 / §4.6 参照。
