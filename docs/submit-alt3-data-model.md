# 登録ナビゲーション v3 — データモデル

[`docs/submit-alt3.md`](./submit-alt3.md) (本体) のサブ仕様。本ファイルは PoC のデータ shape を TypeScript 型で示す SSOT。実装は `src/lib/mock-data/submit-alt3/` 等を新設予定。

クロスリファレンス:

- 列 / chip / pulldown の値域と controlled vocabulary → [`submit-alt3-tags.md`](./submit-alt3-tags.md)
- ButtonType と modal Q&A の関係 → [`submit-alt3-modals.md`](./submit-alt3-modals.md)
- `Submission` から `FlowCard` の生成ルール → [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md)

本体 §5 の 3 階層 tag 表現 (列 / chip / pulldown) を型で明示する:

- **テーブル列 3 軸** (Cross-DB Tag、per-cell 編集) → `FileEntry` の直接フィールド (`organism` / `accessRestriction` / `dataForm`)
- **行内 chip 10 軸** (Cross-DB Tag non-grouping、modal 確定。主軸 7 + 従属 3) → `FileEntry.chipTags: ChipTag[]` (§4.5)
- **Step カード pulldown** (Intra-DB Tag、Service 確定後) → `FlowStep.intraDbInputs: Record<string, unknown>`

## 4.1 ButtonType (9 種)

ボタン押下から決まる、ファイルの初期種別。

```ts
type ButtonType =
  | "sequence-read"      // 配列リード
  | "assembled"          // 組み立て済み配列 (WGS / TSA / TLS / EST / MAG / SAG / GSS / SYN / 完成ゲノム)
  | "annotation"         // 遺伝子アノテーション (一次 / 第三者)
  | "variation"          // 変異情報 (per-sample / aggregate)
  | "phenotype"          // 表現型データ (JGA Dataset 想定)
  | "expression-array"   // マイクロアレイ発現
  | "expression-matrix"  // RNA-seq 発現マトリクス
  | "mass-spec"          // 質量分析 (proteomics / metabolomics / imaging)
  | "spatial-tx"         // 空間トランスクリプトーム
```

## 4.2 FileEntry (1 行 = 1 ファイル = 1 sample)

本体 §4.4 の「1 file = 1 BS = 1 organism = 1 access」原則に従い、列 3 軸は単一値で持つ。

```ts
interface FileEntry {
  id: string
  groupId: string                                 // 主たる Group (単独ファイルでも `single` Group を必ず持つ)
  additionalGroupIds?: string[]                   // jga-dataset Group など、複数所属を表現する補助参照 (主 Group とは別の所属関係を持つときのみ非空)
  buttonType: ButtonType
  displayName: string                             // PoC では仮名でよい (例 "sample1_R1.fastq.gz")
  role?: FileRole                                 // Group 内のロール (§4.3)
  fileFormat?: string                             // ファイル形式の controlled vocabulary (`cel` / `idat` / `mzml` / `imzml` / `gff3` / `vcf` / etc.)。+ マイクロアレイ / + 質量分析 等の modal で確定、Step カードの File Type 自動入力に使う

  // テーブル列 3 軸 (Cross-DB Tag、per-cell 編集、未設定なら警告マーク)
  organism?: string                               // 値域は submit-alt3-tags.md
  accessRestriction?: "open" | "restricted"
  dataForm?: string                               // 値域は submit-alt3-tags.md

  // 各列が「ユーザー手動編集」か「自動補完 (直前行コピー / Rule 10c 個人特定 yes 由来等)」かを区別する flag
  // (本体 §5.4 のデフォルト提案・Rule 10c の自動 restricted などで設定、ユーザー編集で "user" に切替)
  columnSource: {
    organism?: "user" | "auto"                    // "auto" = 直前行コピー / Rule 自動付与
    accessRestriction?: "user" | "auto"
    dataForm?: "user" | "auto"                    // ButtonType 初期値も "auto" 扱い
  }

  // 行内 chip (Cross-DB Tag non-grouping、modal 確定 / chip クリックで再編集)
  chipTags: ChipTag[]
}
```

`FileRole` は Group 内での役割。

```ts
type FileRole =
  | "single"                            // 単独
  | "r1" | "r2"                         // pair-end FASTQ
  | "i1" | "i2"                         // 10x index
  | "cy3" | "cy5"                       // two-color microarray
  | "short-read" | "long-read"          // hybrid assembly (各 Role が別 Experiment、同 BioSample 配下)
  | "idf" | "sdrf"                      // MAGE-TAB metadata
  | "raw" | "processed"                 // MAGE-TAB data
  | "imzml" | "ibd" | "image"           // imaging MS
  | "vcf" | "reference-fasta"           // variation + reference
  | "primary-fasta"                     // MAG/SAG chain top
  | "binned-fasta"                      // MAG/SAG chain mid
  | "mag-fasta"                         // MAG/SAG chain leaf
  | "demultiplexed-per-sample"          // multiplex Group の per-sample FASTQ (事前 demultiplex 済み)
  | "phenotype-table"                   // JGA Dataset 表現型 table
  | "fasta-assembly"                    // assembly-annotation Group の FASTA 側
  | "gff-annotation"                    // assembly-annotation Group の GFF 側
  | "bam"                               // BAM / SAM (+ 配列リード modal で選択時、reference は別 Group の variation-ref FileRole)
  | "bas-h5" | "bax-h5"                 // PacBio HDF5 (1 sample = bas.h5 1 個 + bax.h5 3 個、`pacbio-hdf5` Group)
  | "maf"                               // MetaboBank 代謝物アサインメント (+ 質量分析 modal の「MAF も添付」)
```

## 4.3 FileGroup (関連付け)

ファイル間の関係性。本体 §4.1 の grouping パターンに対応する。

```ts
type GroupType =
  | "single"               // 単独ファイル (デフォルト)
  | "pair-end"             // R1 + R2
  | "10x"                  // I1 (+ I2) + R1 + R2
  | "pacbio-hdf5"          // bas.h5 + bax.h5 × 3 (PacBio raw、1 sample 多メンバ Group)
  | "two-color"            // Cy3 + Cy5
  | "hybrid"               // 異 instrument の Run 群を 1 Group にまとめる (各 Run = 別 Experiment、同 BioSample 配下、Rule 15)
  | "multiplex"            // 事前 demultiplex 済み per-sample FASTQ 群 + N BS (1 file = 1 sample 原則)
  | "mage-tab"             // matrix + IDF + SDRF + N raw + N processed (SDRF が複数 raw / processed をリンク)
  | "imaging-ms"           // imzML + ibd (+ image)
  | "variation-ref"        // VCF + reference fasta
  | "mag-sag-chain"        // 派生 BS chain (primary FASTA → binned → MAG/SAG)
  | "assembly-annotation"  // FASTA + GFF
  | "jga-dataset"          // 配列リード / 変異 / 表現型を Dataset として束ねる

interface FileGroup {
  id: string
  groupType: GroupType
  memberFileIds: string[]                         // FileEntry.id の配列 (groupType != "hybrid" の通常 Group)
  memberGroupIds: string[]                        // 子 FileGroup.id の配列 (groupType == "hybrid" のメタ Group のみ非空、他は [])
  parentGroupId?: string                          // hybrid メタ Group の子に設定される逆参照 (双方向 referential integrity 維持)
  notes?: string                                  // multiplex の barcode-sample 対応表 等の自由記述
  referenceMeta?: ReferenceMeta                   // modal で確定する参照系メタ (TPA / 第三者 annotation / variation reference / MAG/SAG raw 外部登録 等)
  experimentTypeHint?: string                     // + RNA-seq マトリクス modal の GEA Experiment Type 大カテゴリ (bulk RNA-seq / scRNA-seq 等、Step GEA pulldown 絞り込みヒント)
  metaboBankSubmissionType?: string               // + 質量分析 modal の MetaboBank Submission Type 確定値 (LC-MS / GC-MS / NMR 等、tags.md §5.3)
  sourceBsHint?: string                           // modal で「既存 BS と関連付け」が選ばれた場合の対象 BS id (§4.3.1 「同 sample 関連付け」)。 recomputeBpAndBs が新規 BS を作らず既存 BS の sourceGroupIds に追加する目印
}

// modal で確定する参照系メタの統一構造
// (Rule 7a/b/c の参照元 accession + DOI/PubMed、Rule 8a 外部 raw 登録、Rule 11c Haplotype 命名、等)
interface ReferenceMeta {
  citedAccessions?: string[]                      // 参照元 (例: INSDC primary accession / DRR / 元 GEA accession 等)
  doi?: string
  pubmedId?: string
  rawStatus?: "external" | "pending" | "external-db"  // Rule 8a の MAG/SAG raw 三択選択 (外部で登録済み / 未登録 / DDBJ 外 DB 登録予定)
  externalRawAccession?: string                   // rawStatus="external" 時の既発行 INSDC SRA accession (DRR / SRR / ERR)
  reviewStatus?: "unconfirmed" | "confirmed"      // Rule 7b チーム事前確認状態
  geomxReadout?: "ngs" | "ncounter"               // spatial-platform=geomx 時の readout 区別 (Rule 4d、Sequencing vs Microarray 振り分けキー)
  notes?: string                                  // 自由記述 (DDBJ チーム相談時のメモ等)
}
```

### 4.3.1 GroupType ↔ BS 集約ルール (Rule 3 と整合)

`generateFlowCard` が BS Step を何個生成するかは GroupType で決まる。N BS とは N 個の独立した `BioSampleDraft` を生成する意。

| GroupType | BS 数 | 補足 |
|---|---|---|
| `single` | 行ごとに 1 BS (= N 行 → N BS が原則)。**ただし複数の `single` Group が同一 sample に由来することが modal 時点で明示された場合 (例: raw pair-end Group + 組み立て済み配列 Group を「同 sample」として関連付けた場合) は 1 BS に集約** (Submission state 上は同一 `BioSampleDraft.sourceGroupIds` に複数 Group が紐づく形で表現)。実装上は `FileGroup.sourceBsHint` で関連付け対象 BS id を保持し、`recomputeBpAndBs` が新規 BS を作らず既存 BS の `sourceGroupIds` に新規 Group id を append する | 同 organism + 同 access + 同 BS 属性候補で自動縮約する `mergeSingleBs` オプションは PoC 範囲外 (Rule 3 デフォルトは「Group 単位 1 BS」を厳守) |
| `pair-end` / `10x` / `pacbio-hdf5` / `two-color` | Group 全体で 1 BS | 1 sample から複数ファイル/レーン由来 |
| `hybrid` | Group 全体で 1 BS | 同 BS 配下に複数 Experiment が並ぶ (Rule 15) |
| `multiplex` | per-sample FASTQ 行ごとに 1 BS (Group で N BS) | 事前 demultiplex 済み (本体 §4.4) |
| `mage-tab` | Group 内 raw / processed 行に対応する sample ごとに 1 BS | 単一 sample なら 1 BS、複数 sample SDRF なら N BS |
| `imaging-ms` | Group 全体で 1 BS | imzML + ibd + image は 1 sample 想定 |
| `variation-ref` | VCF の variation-form で決まる: `per-sample` → N BS、`aggregate` → 1 BS | reference fasta 自体は BS を持たない |
| `mag-sag-chain` | 段階別: raw / primary は 1 BS、binned / MAG/SAG は派生 BS × 派生数 | Rule 8a の Step 構造に整合 (raw BS + 派生 BS × N) |
| `assembly-annotation` | Group 全体で 1 BS | FASTA + GFF は 1 sample |
| `jga-dataset` | Dataset のメンバ行が紐づく Sample 集合に依存 | JGA Sample は個人単位、Rule 6a の per-row 集約 |

Haplotype phased は `assembly-annotation` / `single` のいずれかに乗るが、Rule 11a の通り **複数 BP 構成 + 共通 BS 1 個** (Principal / Alternate の共通 sample) なので「BS 1 個」を維持する。

## 4.4 Submission (上位レイヤー)

本体 §6.3 の「Umbrella BioProject + 複数 primary BP」(host-pathogen / multi-modal 研究で自動提案) を反映。`Submission` は永続される **正準 state**。`bsToGroupIds` / `bpToBsIds` のような関係マップは `BioSampleDraft.sourceGroupIds` 等から `generateFlowCard` が都度算出する派生データなので state には持たない。

```ts
interface Submission {
  umbrellaBioProject?: BioProjectDraft            // 任意、複数 primary BP を統括するときのみ (Rule 2 で自動生成、§4.4.1)
  primaryBioProjects: BioProjectDraft[]           // 0+ 個 (Rule 6 で全行 JGA 集約時は 0、host-pathogen / Haplotype 等は N)、Rule 5 + Rule 6 組合せの判定で増減 (§4.4.1)
  biosamples: BioSampleDraft[]                    // 0+ 個 (Rule 6 集約で全行 restricted human 時は 0)
  fileGroups: FileGroup[]
  fileEntries: FileEntry[]
  serviceDrafts: Record<string, ServiceDraft>     // key = Step id (§4.6 の命名規約)、各 Step カードの入力値を永続化 (§4.4.2)
  dismissedWarnings: Record<string, true>         // Rule 14b の warning ID → 「無視」済みフラグ (acknowledged の永続化先、§4.6 FlowWarning)
}

interface BioProjectDraft {
  id: string                                      // "bp-<順序番号>" もしくは "bp-umbrella" / "bp-principal" 等の命名
  intraDbValues: Record<string, unknown>          // Project data type, scope, ... の永続値 (ユーザーが明示入力した値、Rule 1 の推測値とは別管理)
  derivedFromTags: Pick<FileEntry, "organism" | "accessRestriction" | "dataForm">[]
                                                  // この BP に属する FileEntry の列値スナップショット (Rule 1 / 5 の推測キー、複数 organism の場合は集合のまま保持)
  commonLineage?: string                          // Rule 5 で複数 organism を統合した時の共通系統 ("Mammalia" / "Eukaryote" 等)、UI 表示用
  isUmbrella?: boolean
  umbrellaChildrenIds?: string[]                  // Umbrella BP が統括する primary BP の id 配列
  haplotypePhase?: string                         // Rule 11a / 11c で確定。値域: "principal" | "alternate" | `haplotype-${number}` | "maternal" | "paternal" | "dra-shared"。複数 Haplotype セット (Rule 11d) で n が 1-N まで動的拡張
}

interface BioSampleDraft {
  id: string                                      // "bs-<順序番号>" もしくは派生 BS は "bs-derived-<順序番号>"
  intraDbValues: Record<string, unknown>          // Package, organism, ... の永続値 (Rule 3 の推測 Package とは別、ユーザー編集分のみ)
  sourceGroupIds: string[]                        // どの FileGroup の sample か (BS → Group の参照源)
  derivedFromBsIds?: string[]                     // 混合アセンブリ / MAG-SAG chain の派生 BS chain (Rule 8c)
}

// 各 Service の Step カード入力値を保存する union 型
// PoC では Record<string, unknown> として緩く扱い、本番フェーズで Service ごとの specific 型に強化 (open-questions §10.2)
type ServiceDraft =
  | { kind: "dra-run"; libraryStrategy?: string; librarySource?: string; librarySelection?: string; instrument?: string; runFileType?: string; libraryConstructionProtocol?: string; libraryName?: string }
  | { kind: "dra-experiment"; /* dra-run と共有、複数 Experiment を区別 */ }
  | { kind: "dra-analysis"; analysisType?: string; referenceAccession?: string }
  | { kind: "mss"; entryRoute: "mss" | "nsss"; dataType?: string; division?: string; tpaSubtype?: "tpa-assembly" | "tpa-specialist-db"; locusTagPrefix?: string; curatorReviewRequired?: boolean }
  | { kind: "gea"; submissionType?: "Sequencing" | "Microarray"; experimentType?: string; arrayDesign?: string; materialType?: string; technologyType?: string }
  | { kind: "metabobank"; submissionType?: string; relatedAccessions?: string[] }
  | { kind: "biosample"; package?: string; geoLocName?: string; collectionDate?: string; locusTagPrefix?: string; derivedFrom?: string }
  | { kind: "primary-bioproject"; projectDataType?: string; sampleScope?: string; material?: string; capture?: string; methodology?: string; objective?: string; title?: string; description?: string }
  | { kind: "umbrella-bioproject"; title?: string; description?: string; privateCommentsToDdbjStaff?: string }
  | { kind: "jga" }  // PoC は単一 Step に集約された notes-only Step (8 オブジェクトを 1 枚に集約、XSD 入力フィールドを持たない)。詳細は [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 6 共通 + open-questions §10.2 参照
  | { kind: "togovar"; studyType?: "snp" | "sv" }
  | { kind: "dbcls-application"; applicationConfirmedSubgroupId?: string }
  | { kind: "jpost" | "eva" | "dgva" | "humandbs"; [field: string]: unknown }  // 外部、入力なし
```

### 4.4.1 primary BP / Umbrella BP / BS の永続化方針 (純粋関数性の責務分担)

`Submission` モデルは「ユーザー編集 state の正準形」。`primaryBioProjects` / `umbrellaBioProject` / `biosamples` は **ユーザーが modal を確定したタイミングで reducer が更新する永続値** であり、`generateFlowCard` (純粋関数) は read-only でこれを参照する。Rule 5 の primary BP 数判定 / Rule 2 の Umbrella 自動発火 / Rule 3 の BS 数判定は reducer 側の関心事として行い、`Submission` 内に結果を書き込む。`generateFlowCard` は受け取った `Submission` を信頼し再判定しない。Rule 1 の Project data type 推測も含めユーザー入力値で上書きされない自動推測の部分は `generateFlowCard` 側 (`intraDbInputs` の自動部分) で担う。

具体的な reducer のタイミング:

- `addFile(submission, modalAnswer) → submission'`: + 配列リード等のボタン押下 + modal 確定で `fileEntries` / `fileGroups` 追加、`primaryBioProjects` 数を Rule 5 + 6 で再計算、`biosamples` を Rule 3 で再計算
- `editCell(submission, fileId, column, value) → submission'`: テーブル per-cell 編集で `organism / accessRestriction / dataForm` 更新、影響範囲の `primaryBioProjects` / `biosamples` を再計算
- `dismissWarning(submission, warningId) → submission'`: Rule 14b で `dismissedWarnings[id] = true` を書き込み

これにより `generateFlowCard` は副作用なし純粋関数として保たれる。

#### `bp-N` / `bs-N` 順序番号の安定性ルール

`BioProjectDraft.id` / `BioSampleDraft.id` の連番 (`bp-1`, `bp-2`, `bs-1`, `bs-3` 等) は **永続化連番方式** (monotonic increment) を採る:

- 新規 BP/BS が reducer で追加されるときは `Submission.<bp|bs>Sequence` 内部カウンタを +1 して `bp-${n}` / `bs-${n}` を採番
- 既存 BP/BS が削除されても他の id は変わらない (削除された番号はスキップ、再利用しない)
- Rule 5 + 6 で primary BP 数が変動する (open 行集合が変わる) ときも、既存 BP は可能な限り保持 (列値 / chip が変わって BP が分裂 / 統合する場合のみ id 更新)
- 永続化された draft を load する際は内部カウンタも復元する (最大 id +1 を初期値に設定、典型例: `Math.max(...primaryBioProjects.map(bp => parseInt(bp.id.replace("bp-", ""))), 0) + 1`)

固定 id (`bp-umbrella` / `bp-principal` / `bp-alternate` / `bp-dra-shared` / `bs-derived-${n}` 等) は連番でなく文字列リテラルで持つ。`bs-derived-${n}` の `${n}` も連番として永続化 (MAG/SAG chain で派生 BS が増えるとカウンタも +1)。

これにより `FlowStep.id = step-<service>[-<discriminator>]` (§4.6.1) の `<discriminator>` 部分 (= BP/BS の id) が安定し、`dismissedWarnings` / `serviceDrafts` の key が長く有効に保たれる。

### 4.4.2 `serviceDrafts` と `dismissedWarnings` の管理

`Submission.serviceDrafts[segmentId]` は Step カードでユーザーが入力した値を保存する。キーは **merge 前 Step.id (= `FlowStepSegment.segmentId`)** で、`generateFlowCard` の Rule 1-15 が生成する確定的命名 (§4.6.1 命名規約) と一致する。merge 後の Step トップの `intraDbInputs` は空 `{}` で、実値は `segments[].intraDbInputs` に格納される。Submission state 上では「過去に存在した segment id」が含まれる可能性がある (例: ユーザーが行を削除すると対応 Step が消える)。

`generateFlowCard` 出力時、merge 前の各 Step は以下の合成で `intraDbInputs` を得て、その後 Service 単位 merge (§8.1.A) で segments[].intraDbInputs に移送される:

```
mergedInputs = {
  ...自動推測値 (Rule 13 等),
  ...submission.serviceDrafts[step.id],          // ユーザー入力が自動推測値を上書き
}
```

stale な `serviceDrafts` (現在 Step に存在しない id) は出力に乗らない (ガーベッジ)。本番フェーズで明示的に削除する reducer を加える。

`Submission.dismissedWarnings[warningId]` も同様に stale 化する。Rule 14b の warning ID は `step:<stepId>:<inputField>:<inputValue>|chip:<axis>:<value>` 形式で、Step / chip / 列値のいずれかが変わると id が変わる。`generateFlowCard` 出力時:

```
FlowStep.warnings[i].acknowledged = submission.dismissedWarnings[warning.id] === true
```

現存する Step の現在 warning ID とマッチする dismissed key のみ acknowledged として反映される。マッチしない (stale な) key は出力に乗らないが Submission state には残る (ガーベッジ)。PoC は数十行スケールで蓄積量が限定的なので許容、本番フェーズで「Submission state を save / load する際に現存 warning ID と照合して未マッチ key を削除する」cleanup reducer を加える (open-questions §10.1)。

### 4.4.3 Submission 不変条件 (referential integrity invariants)

`Submission` state は以下を満たす前提で `generateFlowCard` が動く。reducer 側が責任を持って保つ:

1. 各 `FileEntry.groupId` は `fileGroups.find(g => g.id === groupId)` で必ず解決可能
2. 各 `FileEntry.additionalGroupIds[]` の要素も `fileGroups` に存在する
3. 各 `FileGroup.memberFileIds[]` の要素は全て `fileEntries` に存在する
4. 各 `FileGroup.memberGroupIds[]` の要素は全て `fileGroups` に存在し、`groupType="hybrid"` の親 Group のみ非空
5. `parentGroupId` を持つ FileGroup は、その親 FileGroup の `memberGroupIds` に含まれる (双方向参照)
6. 各 `BioSampleDraft.sourceGroupIds[]` の要素は `fileGroups` に存在
7. 各 `BioSampleDraft.derivedFromBsIds[]` の要素は `biosamples` に存在 (循環参照禁止)
8. `umbrellaBioProject.umbrellaChildrenIds` の要素は全て `primaryBioProjects[].id`
9. 各 `BioProjectDraft.haplotypePhase` が `dra-shared` の BP は、同じ Submission 内で `haplotypePhase ∈ {principal, alternate, haplotype-*, maternal, paternal}` の BP が 2 個以上存在する場合のみ生成される
10. 各 `ChipTag` axis に対して `chipTags` 配列内で値は高々 1 つ (per-axis 単一値、`tpa-subtype` / `haplotype-naming` / `spatial-platform` は主軸が存在する時のみ非空)

invariant 違反は `generateFlowCard` の未定義動作とする (実装は throw もしくは defensive な空出力で対応、PoC では throw)。

## 4.5 ChipTag (行内 chip 10 軸、Cross-DB Tag non-grouping)

本体 §5.2 の chip 軸。modal で確定する「非 grouping」属性のみ。Group 構造が表現する情報 (pair-end / 10x / multiplex / two-color / hybrid / imaging MS / MAG-SAG chain / JGA Dataset 等) は chip に含めない。

7 軸が「行間比較に有用な Cross-DB Tag」、追加 3 軸 (`spatial-platform` / `tpa-subtype` / `haplotype-naming`) は「modal で確定する構造的属性で Step 構成や入力に影響するが、テーブル列にすると他種別行で常に空になるもの」を chip として持つ。表示は `axis` 値で chip タイプ別アイコンを分ける。

```ts
type ChipAxis =
  | "assembly-form"        // WGS / GNM / TSA / TLS / EST / MAG / SAG / HTG / HTC / GSS / SYN / MISC / ASK (13 種)
  | "provenance"           // 第三者再解析 (一次は default 扱いなので chip 表示なし)
  | "variation-form"       // per-sample / aggregate
  | "variation-type"       // snp-indel / sv / cnv (EVA / dgVa 振り分けの根拠)
  | "haplotype-mode"       // phased (yes のみ表示)
  | "functional-genomics"  // yes (GEA 登録) / wgs-target / tsa-target / metagenome-target / variation-target / wes-target / other
  | "mass-spec-domain"     // proteomics / metabolomics / imaging
  | "spatial-platform"     // visium / xenium / merfish / stereo-seq / slide-seq / geomx / other (Rule 4d / + 空間 Tx modal)
  | "tpa-subtype"          // tpa-assembly / tpa-specialist-db (Rule 7a、provenance=third-party 時の必須付随)
  | "haplotype-naming"     // principal-alternate / haplotype-1-2 / maternal-paternal (Rule 11c)

interface ChipTag {
  axis: ChipAxis
  value: string                                   // 値域は submit-alt3-tags.md
  manualOverride?: boolean                        // `axis="functional-genomics"` でのみ意味を持つ。ユーザー手動編集時に true、自動推測値 (下記 3 種) の上書きを保護。他 axis では未使用
                                                  //   1. + 組み立て済み配列 modal で `assembly-form` から推測した値 (tags.md §5.2.2 表)
                                                  //   2. + 配列リード modal Q1=yes / Q2 で確定した値 (tags.md §5.2.2 末尾)
                                                  //   3. §5.2.1 表の ButtonType 固定値 (expression-array/matrix/spatial-tx の `yes` 固定、annotation/phenotype の `other` 固定、variation の `variation-target` 固定)
                                                  // chip クリック編集 UI の「自動推測に戻す」で flag をクリア
}
```

`tpa-subtype` と `haplotype-naming` は他軸の値があるときのみ表示する従属軸: `tpa-subtype` は `provenance=third-party` が同行にある時のみ、`haplotype-naming` は `haplotype-mode=phased` が同行にある時のみ。`spatial-platform` は ButtonType=`spatial-tx` の行のみに付く。

## 4.6 FlowCard / FlowStep (登録フローカード)

本体 §6 の Section B。`generateFlowCard(submission: Submission): FlowCard` で `Submission` から純粋関数として生成する。出力順 = 表示順 (Step は配列、`steps[i]` が物理上から i 番目)。

### 4.6.0 Step 物理表示順序の SSOT

`sortStepsByPhysicalOrder` は **Service 単位 merge (§8.1.A) 後の Step 配列** に対して適用する。同一 ServiceKind + 同一 `mergeKey` の Step が複数 segment に畳まれた後の Step.id は最古 segment の id を継承するため、merge 前後で物理表示順序は決定的に再現される。

`steps` 配列の順序は次の固定優先度で決定的に並べる (混在ケースで分岐するときも、各経路はこの順序内で構築する):

1. `dbcls-application` (Rule 6 集約発火時の Step 0、最上位)
2. `umbrella-bioproject` (Rule 2 発火時)
3. `primary-bioproject` (Rule 1、複数あれば `derivedFromTags` の代表 organism のアルファベット順)
4. `biosample` (Rule 3、`sourceGroupIds` の最小 id 昇順)
5. `dra` (Rule 4 Run / Analysis、対象行の `FileEntry.id` 最小値昇順)
6. `mss` (Rule 4 / 7、対象行昇順)
7. `gea` (Rule 4 / 4a / 4b、対象行昇順)
8. `metabobank` (Rule 4 / 4c)
9. `togovar` (Rule 4)
10. `jga` (Rule 6a / 6b / 6c、8 オブジェクトを 1 Step に集約)
11. 外部 Service (`jpost` / `eva` / `dgva` / `humandbs`)

### 4.6.1 `FlowStep.id` / `mergeKey` 命名規則

決定的に採番するため命名規約を固定する。warning ID は本 id (merge 後は `segmentId`) に依存して構築されるため、`Submission` を入力に同じ id / segmentId が再生成される必要がある。

```
step-<service>[-<discriminator>]
```

- `<service>` = ServiceKind 値そのまま (例 `step-primary-bioproject`、`step-jga`)
- `<discriminator>` = 同 Service で複数 Step が並ぶ時の識別子。原則は紐づく `BioSampleDraft.id` / `BioProjectDraft.id` / `FileGroup.id` / `FileEntry.id` の id。例:
  - `step-primary-bioproject-bp-1` (primary BP 複数の場合、`bp-1` は `primaryBioProjects[0].id`)
  - `step-biosample-bs-3` (BS 1 個ごとに Step)
  - `step-dra-bs-3` (BS bs-3 配下の DRA Step)
  - `step-mss-bs-3` (BS bs-3 配下の MSS Step)
  - `step-umbrella-bioproject` (Umbrella は 1 個固定、discriminator なし)
  - `step-dbcls-application` (固定、Rule 6 発火時のみ)

#### `mergeKey` の命名規約

`mergeKey` は Service 単位 merge の同一性キー。Rule 側で各 Step を生成する際に明示する。同一 ServiceKind + 同一 `mergeKey` の Step は 1 枚に集約される。

| 状況 | `mergeKey` 値 | 効果 |
|---|---|---|
| デフォルト (Rule 1 / 2 / 3 / 4 / 6 / 7 / 10 / 12 など) | `service` (例 `"mss"`) | 同 Service の Step は 1 枚に集約 |
| Rule 9 multiplex per-file DRA Run | `dra:multiplex:${fileId}` | per-file DRA Run Step が維持 (多重化 N → N Step) |
| Rule 11 haplotype phased | `${service}:haplotype:${phase}` (例 `primary-bioproject:haplotype:principal`) | phase 別 BP / MSS Step が維持 |
| Rule 8 MAG-SAG chain | `${service}:magsag:${stage}` (例 `biosample:magsag:binned`) | stage 別の BS / MSS Step が維持 |

`FlowStep.id` は merge 後も「最古 (= 物理表示順序ソート後の先頭) segment.id」を継承する。`segments[].segmentId` は merge 前の Step.id をそのまま保持し、warning ID と `Submission.serviceDrafts[]` のキーとして安定化させる。`FlowStep.id` ≠ `segments[0].segmentId` のケースは存在しない (id は segments[0] と一致する)。

### 4.6.2 generateFlowCard と reducer の責務境界

`generateFlowCard` は `Submission` を input、`FlowCard` を output とする純粋関数。次を行わない:
- `Submission` 内の `primaryBioProjects` / `biosamples` を増減する判定 (これは reducer の関心事、§4.4.1)
- `Submission.dismissedWarnings` への書き込み (これは `dismissWarning` reducer の関心事)
- ButtonType / chip / 列値から `Submission` の他フィールドを推測 (modal 確定時の reducer で完結)

generateFlowCard が行うこと:
- Submission の `primaryBioProjects` / `biosamples` を読み、対応 Step を構築
- Rule 4 / 6 / 7 等の **per-row 判定** で出口 Step (DRA / MSS / GEA / JGA chain / TogoVar / 外部) を決定
- Rule 13 等の **自動推測値** (DIVISION / DATATYPE 等) を `intraDbInputs` に書き、`serviceDrafts[stepId]` で上書き
- Rule 14 整合チェックで warning を生成し、`dismissedWarnings[id]` を読み acknowledged を反映

```ts
interface FlowCard {
  steps: FlowStep[]
  globalWarnings: FlowWarning[]                   // 未設定 cell 等の Submission 全体の警告
}

interface FlowStep {
  id: string                                      // ステップ一意 ID (例 "step-primary-bp-1"、merge 後は最古 segment.id を継承)
  mergeKey: string                                 // Service 単位 merge の同一性キー (デフォルト = service、§4.6.1)
  service: ServiceKind
  title: string                                   // 例 "Umbrella BioProject 登録"
  descriptionKey?: string                         // 説明文 i18n key prefix。例 "routes.submitAlt3.flowSteps.dra" → .overview / .prerequisites / .outputs / .serviceLink を展開
  serviceUrl?: { url: string; labelKey: string }  // 登録 / 案内サービスへの遷移ボタン (SERVICE_URLS で集約)
  targetGroupIds: string[]                        // Section A の行群と双方向リンク (merge 後は union)
  targetFileIds: string[]
  intraDbInputs: Record<string, unknown>          // Step カード内の pulldown + テキスト入力 (merge 後の Step トップは空 {} で、実値は segments[].intraDbInputs)
  upstreamStepIds: string[]                       // 前段 Step の id を参照 (merge 後は union、accession 発行前から成立)。表示時は対応 Step の issuedAccessionTypes / 仮 ID を解決
  issuedAccessionTypes: string[]                  // 例 ["PRJDB#####"] / ["DRR#####", "DRX#####"]、複数 prefix が同 Step で発行されるケースに対応
  badgeKind: "internal" | "external"              // 本体 §6.2 (内部 = emerald-500 / 外部 = amber-500)
  notes: string[]                                 // merge 後は union (dedupe)
  warnings: FlowWarning[]                         // テーブル未設定 cell 起因 / Rule 14 chip 整合 等。merge 後は union (id で dedupe)
  segments?: FlowStepSegment[]                    // Service 単位 merge で 2 件以上が畳まれた場合の per-origin 開示
}

// merge 前の Step に対応する単位。segmentId は merge 前 Step.id と同一で、warning ID stability と serviceDrafts[] のキーを担う
interface FlowStepSegment {
  segmentId: string
  targetGroupIds: string[]
  targetFileIds: string[]
  upstreamStepIds: string[]
  intraDbInputs: Record<string, unknown>
  notes: string[]
}

interface FlowWarning {
  id: string                                      // Rule 14b の一意 ID (例 "step:dra-3:library_strategy:WGS|chip:functional-genomics:yes")
  severity: "warning" | "info"
  messageKey: string                              // i18n key (Rule 14c の "flowGen.rule14.warning.<caseKey>" 等)
  messageParams?: Record<string, string>          // placeholder 埋め込み値 ({strategy}, {currentChip} 等)
  acknowledged?: boolean                          // Submission.dismissedWarnings[id] を反映
}

type ServiceKind =
  // 内部 (BSI / DDBJ 運営、Step カードに `intraDbInputs` pulldown / 入力欄を表示)
  | "umbrella-bioproject"
  | "primary-bioproject"
  | "biosample"
  | "dra"                                         // DRA Run / Experiment / Analysis を 1 Step に集約 (issuedAccessionTypes で複数 prefix 表現)
  | "gea"
  | "mss"                                         // MSS / NSSS を統合 (intraDbInputs.entryRoute = "mss" | "nsss" で区別、本体 §6.2)
  | "metabobank"
  | "togovar"
  // 内部 (DDBJ 運営) だが D-way 外の独自系統。Step カードは notes + serviceUrl のみで入力 UI を持たない
  // (JGA は NBDC 提供申請 + sftp + 独自 XSD で完結、db-portal は外部誘導のみ。
  //  8 オブジェクト = Submission / Study / Sample / Experiment / Data / Analysis / Dataset / Policy は
  //  同一 JGA 申請管理システム 1 箇所で完結するため、Step も 1 枚に集約。
  //  [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 6 共通参照)
  | "jga"                                         // JGA 8 オブジェクトを集約した単一 Step (Rule 6a/6b/6c)
  // 外部 (DDBJ 運営外、リンク + 案内のみ、入力フォームなし)
  | "dbcls-application"                           // DBCLS / NBDC 提供申請システム (Rule 6 Step 0 の事前申請)
  | "jpost"
  | "eva"
  | "dgva"
  | "humandbs"
```

`jga` は `badgeKind = "internal"` を維持 (DDBJ 運営、本体 §6.2)、外部 5 種 (`dbcls-application` 等) は `badgeKind = "external"`。「Step カードに入力 UI を持つか否か」は badgeKind とは独立した属性で、`jga` は internal でありながら notes-only。flow-rules.md Rule 6 共通でこの例外を一括規定し、`SERVICE_URLS["jga"]` には JGA 案内ページ (`https://www.ddbj.nig.ac.jp/jga/submission.html`) を割り当てる (D-way URL は割り当てない、`flowRulesMasters.ts` SSOT)。発行予定 accession は `issuedAccessionTypes` 配列に 8 prefix (`JGA######` / `JGAS######` / `JGAN#########` / `JGAX#########` / `JGAR#########` / `JGAZ#########` / `JGAD######` / `JGAP######`) を並べる (`dra` Step の Run+Experiment+Analysis 集約と同型の表現)。

`upstreamStepIds` は Step ID 参照とし、accession 未発行時も成立。UI 表示時は参照先 Step の発行型を解決して `"参照: Step 2 (PRJDB#####)"` のように表示する。同 Service で複数 prefix を発行する DRA (Run + Experiment) や Haplotype の MSS (Principal + Alternate) は 1 Step 内 `issuedAccessionTypes` を配列に持って表現する。

## 4.7 実装ヒント

PoC の実装方針 (仕様としては緩い指針、本体 §1-§7 の方向性が優先)。

### i18n

- UI テキスト (ボタンラベル / modal 質問文 / Step 見出し / chip ラベル): `locales/ja.json`, `locales/en.json`
- 登録フローカードの説明文 / 補足: 言語別 TSX (例 `FlowStepBioProject.ja.tsx`, `FlowStepBioProject.en.tsx`)
- Intra-DB pulldown の controlled vocabulary は英語キー固定、表示は i18n 経由
- PoC リリース時に日英両言語を同時提供する (本体 §7.1)

#### i18n key の名前空間 (PoC 規約)

ファイル分割は `locales/<lang>.json` 1 ファイルでも `locales/<lang>/<namespace>.json` 分割でも可。key は以下の prefix で揃え、`flowGen.rule14.warning.*` (Rule 14c で先行制定) と同型に維持する:

| Prefix | 対象 |
|---|---|
| `buttons.<buttonType>.label` / `.description` | 9 種ファイル追加ボタン |
| `modals.<buttonType>.<questionKey>.label` / `.options.<optionKey>` / `.hint` | modal Q&A の質問文と選択肢 |
| `tableColumns.<column>.label` / `.placeholder` | 列ヘッダ (`organism` / `accessRestriction` / `dataForm`) |
| `chips.<axis>.label` / `.values.<value>` | 行内 chip (axis = ChipAxis 10 種、value = 値域) |
| `flowSteps.<service>.title` / `.notes.<noteKey>` | Step カード見出し + ノート (service = ServiceKind 値) |
| `flowGen.rule<N>.warning.<caseKey>` / `.info.<caseKey>` | `generateFlowCard` 起因の warning / info notes (Rule 14c 例参照) |
| `pulldown.<service>.<field>.values.<value>` | Step カード内 controlled vocabulary (例 `pulldown.dra.libraryStrategy.values.WGS`) |
| `errors.<errorKey>` | modal / cell 編集の阻止系エラー |
| `globals.<key>` | 横断的な定型文 (「未設定」「⚠ 不整合」等) |

i18n は表示文字列のみを担当、controlled vocabulary の **値 (英語キー)** は src code 内で固定する。

### URL

- `/submit-alt3` のみ。`Submission` state は React `useState` (or 軽量 store) で保持
- URL クエリ連携・履歴連携は持たない (PoC 範囲、本体 §7.2)

### コンポーネント分割

- ルートコンポーネント `routes/submit-alt3.tsx` で `Submission` state を保持
- `FileTableSection` (Section A、テーブル + ボタン群) と `FlowCardSection` (Section B) は `Submission` を props で受け取り
- `AddFileButton` (9 種) は内部で modal を持ち、grouping と構造的属性だけを確定する
- `FileRow` / `GroupHeader` でテーブル行 / Group 視覚化、`ChipList` で行内 chip を表示
- `FlowStepCard` は `FlowStep` を受け取りステップ単体を描画
- 生成ロジックは pure function `generateFlowCard(submission: Submission): FlowCard` に閉じ込めて単体テストする
