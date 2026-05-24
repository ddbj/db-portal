# 登録ナビゲーション (submit)

DDBJ の登録窓口は service ごとに分かれており、利用者は最初に「自分のデータの DB は何か」を選ばされる構造になっている。submit ナビゲーションは、利用者が手元のファイル / メタデータの性質を入力するだけで、登録経路 (どの service に何を出すか) を portal 側で導出して可視化する UI である。

本書は submit の概念 / controlled vocabulary / データモデル / 経路導出ルールの **基礎章** を扱う。値域そのものは `app/schemas/submit/` を SSOT とし、本書は値域を二重に書かない。

---

## §1 概念

### §1.1 「自分のデータの DB は何か」を訊かない設計

利用者は登録窓口に来た時点では、DDBJ の service 構造 (BioProject / BioSample / DRA / JGA / DDBJ Mass / GEA / MetaboBank …) を必ずしも理解していない。「自分が持っているのは FASTQ で、ヒトの restricted データ」のような **データ側の言葉** で考えている。

submit ナビゲーションはこの状態を出発点とする:

- 利用者は「ファイルの種類」「生物」「公開区分」「データ形」のような **データ側の属性** を入力する
- portal が controlled vocabulary と純粋関数で「どの service に何を出すか」を導出する
- 利用者は導出結果 (Step カード) を見て、各 Step の Intra-DB Tag (BS package, DRA Library Strategy 等) を埋めていく

この向きで「service の存在は知らなくて良い」状態を担保する。

### §1.2 テーブル + Step カードの 2 段構造

UI 全体は 2 段構造になる:

```
┌─────────────────────────────────────────────────────────────┐
│  上段: ファイルテーブル                                      │
│   - 各行 = 1 ファイル (FileEntry)                            │
│   - 列 = buttonType / organism / access / dataForm           │
│   - 行内 chip で追加軸を表現                                  │
│   - 「ファイルを追加」ボタン (9 種) で行追加                  │
├─────────────────────────────────────────────────────────────┤
│  下段: Step カード列 (導出結果)                              │
│   - Step カード = 1 つの登録 step (FlowStep)                 │
│   - service バッジ + scope (対象 group/entry)                │
│   - Intra-DB Tag (pulldown) で BS package 等を選ぶ            │
└─────────────────────────────────────────────────────────────┘
```

下段は **上段の関数** であり、利用者は下段を直接編集しない。下段に欲しい結果を出すために上段の入力を調整する、という編集モデル。

### §1.3 Cross-DB Tag / Intra-DB Tag

submit の controlled vocabulary は 2 種類の文脈で使われる:

- **Cross-DB Tag**: 全 service に共通する分類軸。`ButtonType`, `Organism`, `Access`, `DataForm` のように、どの service に出すかを決める前段の情報
- **Intra-DB Tag**: 特定の service 内で使う controlled vocabulary。`BioSample package`, `DRA Library Strategy`, `BioProject Project type` のように、step 単位で出す pulldown 群

Cross-DB Tag はテーブル列 / 行内 chip で表現、Intra-DB Tag は Step カード内の pulldown で表現する (§4)。

### §1.4 SSOT 関係

`docs/` (本書) は **概念と図** だけを語る。enum の値域、データ型のフィールド、サービス step 関数の判定式は `app/schemas/submit/*.ts` と `app/features/submit/flow-rules/**/*.ts` が SSOT。

本書は値リストを書かない。値が変わったら schemas を直すだけで、docs を直す必要はない (二重源泉を作らない)。

---

## §2 Controlled vocabulary

controlled vocabulary の値域は `app/schemas/submit/vocabulary.ts` と `app/schemas/submit/service.ts` を SSOT とする。本章では各 enum の **意図と使い分け** のみを述べる。

### §2.1 ButtonType (ファイル追加ボタン、9 種)

テーブル先頭の「ファイルを追加」ボタンに並ぶ 9 種類。利用者がボタンを押すと FileEntry が 1 行追加され、その種別が `buttonType` に固定される。

意図: ファイルの **物理的種類**。FASTQ raw か、assembly FASTA か、VCF か、MAGE-TAB マトリクスか、質量分析 raw か、といった粒度。

9 種を「概念グループ」で見ると次の通り:

| 概念グループ | ButtonType |
|---|---|
| シーケンス | `sequence-read`, `assembled`, `gene-annotation`, `variation` |
| 機能ゲノミクス | `microarray-expression`, `rna-seq-matrix` |
| 質量分析 | `mass-spec` |
| 空間 | `spatial-tx` |
| 表現型 | `phenotype` |

各 ButtonType は典型的な `DataForm` と典型的な `GroupType` の対応を持つ (§5, §6)。

### §2.2 GroupType (ファイルグルーピング、13 種)

複数のファイルが論理的に 1 単位を成すケース (pair-end の 2 ファイル、MAGE-TAB IDF/SDRF 一式、MAG/SAG chain の階段構造) を `FileGroup.groupType` で表現する。

意図: **複数ファイルが 1 つの service entity に紐付く** 関係を持つ場合、その関係の種類を controlled に表現する。grouping は経路導出の分岐要素の 1 つになる (例: `jga-dataset` GroupType の存在は JGA step 生成に効く)。

13 種は §6 で詳述。

### §2.3 Organism (生物分類、7 種)

DDBJ 登録経路の分岐に必要十分な粒度で 7 種を持つ。種・属レベルの phylogeny は持たせない (それは BS package / BP organism field など Intra-DB Tag で扱う)。

7 種の意図:

| Organism | 経路導出での効果 |
|---|---|
| `human` | restricted との組合せで JGA / humandbs 経路 |
| `human-microbiome` | ヒト由来だが restricted 扱いではない |
| `eukaryote` | ヒト以外の真核生物 (動物 / 植物 / 真菌等) |
| `prokaryote` | 細菌 / 古細菌 |
| `virus` | ウイルス |
| `metagenome` | 環境メタゲノム |
| `organelle-plasmid` | オルガネラ / プラスミド |

`bioprojectStep` は organism 集合のユニーク値ごとに Primary BP を分裂させる。

### §2.4 Access (公開区分、2 種)

`open` / `restricted` の 2 種。`restricted` ∧ `human` の組合せが JGA / humandbs への分岐起点になる。

### §2.5 DataForm (データ形、7 種)

raw / assembled / analysis-output / matrix / annotation / mass-spec / phenotype の 7 種。ButtonType に従属する側面はあるが、テーブル列で利用者が override できるよう独立軸として保つ。

例: ButtonType=`sequence-read` の典型 DataForm は `raw` だが、利用者が後から `analysis-output` に変えると経路導出が変わる (DRA Run → DRA Analysis 等)。

### §2.6 ChipAxis (行内 chip 軸ラベル、10 軸)

テーブル列に表現できない細部区分を、行内 chip の `{axis, value}` ペアで表現する。chip は任意個。

10 軸の意図 (代表的な分岐効果):

| ChipAxis | 経路導出での効果 |
|---|---|
| `assembly-form` | mag-sag chain 段階の判定 (raw / primary / binned / mag / sag) |
| `provenance` | third-party 由来の判定 (DDBJ Mass 内の TPA scope に振り分け) |
| `variation-form` | per-sample / aggregate の振り分け |
| `host-pathogen` | host-pathogen 関係の表現 |
| `haplotype-mode` | haplotype phased 構造の判定 (4 段 BP) |
| `functional-genomics` | 機能ゲノミクス (ChIP-seq / ATAC-seq 等) の細分 |
| `mass-spec-domain` | proteomics / metabolomics の判別 (jpost / MetaboBank 振り分け) |
| `spatial-platform` | 空間プラットフォーム (Visium / Stereo-seq 等) |
| `tpa-subtype` | TPA サブタイプ |
| `mag-sag-chain` | MAG/SAG chain 段階の補強 |

### §2.7 Service (登録先 service、14 種)

内部 9 + 外部 5。

内部 (DDBJ 内 service): `bioproject`, `umbrella-bioproject`, `biosample`, `dra`, `jga`, `ddbj-mass`, `annotation`, `gea`, `metabobank`

外部 (DDBJ 外への誘導): `humandbs`, `dbcls`, `jpost`, `eva`, `dgva`

「内部 / 外部」は `app/schemas/submit/service.ts` の `INTERNAL_SERVICES` / `EXTERNAL_SERVICES` 定数で表現する。Service バッジ色は §8 を参照。

外部 service のうち、`FlowStep` として独立に生成されるのは `eva` (restricted human variation の誘導 step)。残り 4 種 (`humandbs`, `dbcls`, `jpost`, `dgva`) は内部 service の note (messageKey で `dbclsApplicationRequired` / `jpostRedirect` / `togovarLink` 等を持つ) を通じて誘導する。Service vocabulary は note 上でも参照可能な閉じた値域として保持される。

### §2.8 INSDC 公式との突合

INSDC (NCBI / ENA / DDBJ の 3 機関共通) との関係:

- DRA `Library Strategy` (約 38 種) は INSDC 共通 vocabulary。`app/schemas/submit/vocabulary.ts` は INSDC 公式と一致する値域を持つ
- BS package のうち SARS-CoV-2 系統 (clinical / wastewater) と DDBJ 拡張は DDBJ ローカル
- DRA `File type` の `reference_fasta` は BAM ローダー用に DDBJ が拡張した値

INSDC 公式 vocabulary が更新されたら `vocabulary.ts` の enum を直し、本書は触らない (本書は値リストを持たないため二重源泉化しない)。

---

## §3 Data model

submit 状態を表現する型は 4 種類。Zod 型定義は `app/schemas/submit/*.ts` を参照。

### §3.1 概念図

```
Submission
  ├─ fileEntries: FileEntry[]
  │    └─ FileEntry { id, buttonType, organism, access, dataForm, groupId, chipTags[] }
  ├─ fileGroups: FileGroup[]
  │    └─ FileGroup { id, groupType, memberFileIds[], linkedGroupIds[] }
  └─ notes: string

(導出)
FlowStep { id, service, scope { groupIds[], entryIds[] }, notes[] }
```

### §3.2 FileEntry (1 行 = 1 ファイル)

テーブルの 1 行に対応する型。利用者が「ファイルを追加」ボタンを押すと作られる。

| field | 意図 |
|---|---|
| `id` | entry の安定 ID。並べ替え / 削除しても変わらない |
| `buttonType` | 追加時に選んだボタン種別 |
| `organism` | テーブル列「生物」で選択 |
| `access` | テーブル列「公開区分」で選択 |
| `dataForm` | テーブル列「データ形」で選択 |
| `groupId` | 所属する FileGroup の id (必須) |
| `chipTags` | 行内 chip 集合 (`{axis, value}` 配列) |

`buttonType` 追加時に default `groupId` (1 ファイル = 1 group の単純 group) が自動生成される。利用者が GUI で「これらを paired にする」操作をすると同じ groupId が振られて pair-end group になる。

### §3.3 FileGroup (複数ファイルの論理単位)

複数ファイルが論理的に 1 単位を成すケースを表現する。

| field | 意図 |
|---|---|
| `id` | group の安定 ID |
| `groupType` | 13 種の grouping 種別 (§6) |
| `memberFileIds` | 直接の member となる FileEntry の id 集合 |
| `linkedGroupIds` | 他 group との参照関係 (Umbrella 配下の Primary 集合、MAG/SAG chain の段階リンク等) |

`linkedGroupIds` は **横の関係** (group 間の参照)、`memberFileIds` は **縦の関係** (file → group の所属)。

### §3.4 Submission (submit ナビ全体状態)

利用者が UI で操作する submit 状態の root。

| field | 意図 |
|---|---|
| `fileEntries` | 全 FileEntry の集合 |
| `fileGroups` | 全 FileGroup の集合 |
| `notes` | 自由 note (経路導出には使わない、利用者 memo 用) |

`fileEntries` と `fileGroups` は id 参照で結合される。`FileEntry.groupId` が `fileGroups` 内の id にマッチすることが期待されるが、Zod parse では緩く string として保持する (UI 編集途中の整合崩れに対して厳密 fail させない)。サービス step 関数は「未知 groupId は無視」で吸収する。

### §3.5 FlowStep (導出された 1 ステップ)

サービス step 関数が `Submission` から導出する読み取り専用型。

| field | 意図 |
|---|---|
| `id` | step の安定 ID。同じ Submission に対して deterministic |
| `service` | どの service への step か |
| `scope` | 対象となる FileGroup / FileEntry の id 集合 |
| `notes` | info / warning / error の attach 集合 |

`scope` は `{groupIds: string[], entryIds: string[]}`。groupIds か entryIds の少なくとも一方は非空 (`scope-nonempty` 不変量、§7)。

`notes` は `{kind, messageKey}` の配列。`kind` は info / warning / error の 3 値、`messageKey` は i18n リソースキー (具体テキストは locale ファイルで管理)。

### §3.6 サンプル例示

`fc.sample(arbSubmission, N)` で生成される代表分布を意図的にカバーする (詳細は `tests/pbt/arbitraries/submission.ts`)。各 input に対して導出される `FlowStep[]` の主な service 集合を併記する:

| Submission の概形 | 導出される FlowStep の service 集合 |
|---|---|
| `entries=[]`, `groups=[]` | `[]` (空) |
| 1 行 open sequence-read (eukaryote raw) | `bioproject`, `biosample`, `dra` |
| 1 行 restricted human sequence-read | `bioproject`, `biosample`, `jga` |
| open eukaryote + restricted human (sequence-read 各 1) | `umbrella-bioproject`, `bioproject` (×2), `biosample` (×2), `dra`, `jga` |
| 複数 organism (eukaryote / prokaryote / virus、各 1 行) | `umbrella-bioproject`, `bioproject` (×3), `biosample` (×3) + 各 organism の経路 service |
| 1 行 variation (open eukaryote) | `bioproject`, `biosample`, `ddbj-mass` (内部 variation step) |
| 1 行 variation (restricted human) | `bioproject`, `biosample`, `eva` (外部 step) |
| 1 行 microarray-expression (mage-tab group) | `bioproject`, `biosample`, `gea` |
| 1 行 mass-spec + chip `mass-spec-domain=proteomics` | `bioproject`, `biosample`, `metabobank` (notes に jpost 誘導 warning) |
| 1 group に sequence-read + mass-spec の 2 entry (multi-modal) | `bioproject`, `biosample`, `dra`, `metabobank`, `ddbj-mass` (multi-modal warning step) |

これらは PBT の `arbSubmission` が生成しうる典型例で、`fc.sample` で目視確認できる。

### §3.7 参照整合の取り扱い

`FileEntry.groupId` の参照不整合 (未知 group を指す) は schema レベルでは throw しない。サービス step 関数は次の方針で吸収する:

- 未知 groupId を持つ FileEntry は scope.entryIds に出る (`scope.groupIds` には groupId 文字列がそのまま入るが、対応する FileGroup は存在しない)
- 空 FileGroup (memberFileIds=[]) は step を生成しない
- `linkedGroupIds` の dangling 参照は無視する

整合性を厳密強制する (parse 時に throw する) アプローチは選択肢として残されているが、本書スコープでは UI 編集途中の整合崩れを許容する緩い参照を採用する。

---

## §4 3 階層 tagging

「どこに情報を持たせるか」の責務分担。

### §4.1 3 階層の表

| 階層 | 例 | 編集 UI | 種類 |
|---|---|---|---|
| テーブル列 (4 列固定) | `buttonType`, `organism`, `access`, `dataForm` | 列のセル (selector) | Cross-DB Tag |
| 行内 chip (任意個) | `provenance=third-party`, `haplotype-mode=phased` | 行内 chip pill (軸ラベル + 値) | Cross-DB Tag |
| Step カード pulldown | BS package, DRA Library Strategy, BP Project type | Step カード内 pulldown | Intra-DB Tag |

### §4.2 責務の分け方

**テーブル列 (4 列固定)** は全 service 共通の最も粗い分類。多くの利用者が「とりあえず正しい値」を入れられる粒度に保つ。列を増やすと table が横に広がり、利用者が「何を入れるべきか」分からない列が増える。

**行内 chip** は「サービス step 関数の分岐に効くが、列にすると table が肥大化する」軸。chip は `{axis, value}` の組で表現するので、軸が増えても UI 形は同じ (chip が 1 つ増えるだけ)。

**Step カード pulldown (Intra-DB Tag)** は特定 service の controlled vocabulary。BS package 一覧、DRA Library Strategy 一覧など。submit ナビが導出した Step カード内に並ぶ。

### §4.3 なぜ Intra-DB Tag を行に持たせないか

BS package のような Intra-DB Tag を FileEntry の chip にすると、次の問題が起きる:

- BS package は BioSample step が決まらないと「どの package が適用されるか」が分からない
- 同じ表現 (例: "Pathogen: clinical") が異なる service で違う意味を持つ可能性
- 利用者は「行に対して package を選ぶ」のではなく「step に対して package を選ぶ」と認知している

そこで Intra-DB Tag は Step カードまで降りてから決める。これによりテーブル側は「全 service 共通の粗い区分」だけに集中できる。

### §4.4 組合せ例

| 入力 | 出力 Step (主要) |
|---|---|
| `sequence-read` / `human` / `restricted` / `raw` | JGA Submission + BioProject + BioSample (Intra-DB: Human BS package) |
| `sequence-read` / `eukaryote` / `open` / `raw` | DRA Run + BioProject + BioSample (Intra-DB: Model organism BS package) |
| `assembled` + `gene-annotation` (同 group) | DDBJ Mass + Annotation + BioProject + BioSample |
| `mass-spec` + chip `mass-spec-domain=proteomics` | MetaboBank + jpost 案内 (外部) |

---

## §5 9 ボタン

ButtonType ごとに「典型的に付随する `DataForm` / `GroupType`」がある。submit ナビは「ボタンを押した後、典型値を default として selector に出す」だけで、利用者は自由に override できる (default 強制はしない)。

### §5.1 ButtonType 別の default 値と主な誘導先

| ButtonType | default DataForm | default GroupType | 主な誘導先 service |
|---|---|---|---|
| `sequence-read` | `raw` | `single` | DRA / JGA |
| `assembled` | `assembled` | `single` | DDBJ Mass |
| `gene-annotation` | `annotation` | `single` | Annotation |
| `variation` | `analysis-output` | `variation-with-reference` | DDBJ Mass (内部 TogoVar 誘導) / EVA (restricted human 用、外部) |
| `phenotype` | `phenotype` | `single` | DDBJ Mass (phenotype scope) |
| `microarray-expression` | `matrix` | `mage-tab` | GEA |
| `rna-seq-matrix` | `matrix` | `mage-tab` | GEA |
| `mass-spec` | `mass-spec` | `single` | MetaboBank (proteomics chip 時は jpost 誘導 note) |
| `spatial-tx` | `matrix` | `single` | DDBJ Mass (spatial scope) |

「default GroupType」はボタンを押した直後の値で、利用者は §6 の 13 種から後で変更できる (例: `sequence-read` をペアにする操作で `pair-end` に切り替わる、MAG/SAG chain にする操作で `mag-sag-chain` に切り替わる)。「主な誘導先 service」は典型シナリオでの導出結果であり、組合せ (organism / access / chip 等) により分岐する。

### §5.2 ボタンを押した後の補助 UI

ボタンを押すと:

1. 新規 FileEntry が 1 行追加される (`id` 自動採番、`buttonType` 固定、`groupId` 自動生成)
2. 列セルの default に「典型 `organism` / `access` / `dataForm`」が入る (利用者が変更可能)
3. group が pair-end / 10x 等の複合 group の場合、続けて 2 ファイル目以降を追加する候補が出る

これらは UI 補助であり、controlled vocabulary そのものではない。

---

## §6 Grouping 13 種

`GroupType` の意味と適用条件。

### §6.1 GroupType 一覧

| GroupType | 含む ButtonType | 意味 / 適用条件 |
|---|---|---|
| `single` | 任意 | 1 ファイル 1 group の単純構成 |
| `pair-end` | `sequence-read` | paired layout の 2 ファイル (R1 / R2) |
| `10x` | `sequence-read` | 10x Genomics 構成 (3 ファイル: I1 / R1 / R2) |
| `multiplex` | `sequence-read` | 1 group に複数 sample 由来の read が混在 |
| `two-color` | `microarray-expression` | two-color microarray (Cy3 / Cy5) |
| `mage-tab` | `microarray-expression`, `rna-seq-matrix` | MAGE-TAB IDF + SDRF 一式 |
| `hybrid` | `assembled` | hybrid assembly (long + short read を組合せた assembly) |
| `imaging-ms` | `mass-spec` | imaging mass-spec (空間質量分析) |
| `variation-with-reference` | `variation` | VCF + reference FASTA pair |
| `mag-sag-chain` | `assembled`, `sequence-read` | MAG / SAG chain (raw → primary → binned → mag/sag) |
| `jga-dataset` | `sequence-read` | JGA Dataset (制限公開 read 集合) |
| `pacbio-hdf5` | `sequence-read` | PacBio HDF5 (1 sample あたり 2-3 ファイル) |
| `assembly-annotation` | `assembled`, `gene-annotation` | assembly + annotation pair (DDBJ Mass + Annotation 連動) |

### §6.2 適用条件の細部

- `mag-sag-chain` は member の `assembly-form` chip が `raw` / `primary` / `binned` / `mag` / `sag` のいずれかを取り、4 段以上が同 chain で `linkedGroupIds` でリンクされる
- `jga-dataset` は `access=restricted` ∧ `organism=human` が typical。typical でない組合せは warning note が付く
- `hybrid` は `assembled` の `assembly-form` chip ∈ `{hybrid}` または GroupType=`hybrid` 自身で判定
- `assembly-annotation` の 2 ファイル (assembled + gene-annotation) は ButtonType が異なるが同 group。multi-modal warning の対象から除外する (assembly + annotation pair は normal な組合せ)

### §6.3 grouping と Service 経路

GroupType は経路導出の分岐要素として効く:

- `jga-dataset` の存在は JGA step を強くドライブ (JGA Dataset entity の生成)
- `mag-sag-chain` は DRA + DDBJ Mass の chain 構造を出す
- `hybrid` は DDBJ Mass の hybrid scope note を出す
- `assembly-annotation` は DDBJ Mass + Annotation の連動 step を出す (2 step 同時生成)
- `imaging-ms` は MetaboBank 経路 (imaging scope)
- `variation-with-reference` は variationStep が VCF + reference FASTA を同 step に入れる

---

## §7 Flow rules の概念

`Submission` から `FlowStep[]` を導出するロジックは、**サービスごとの純粋関数のコレクション** で実装する。各 step 関数は「自分の service の責務範囲」だけを判定して `FlowStep[]` を返す (副作用なし、Submission を変更しない)。

### §7.1 構造

```ts
deriveFlowSteps(submission)
  = [
    ...biosampleStep(submission, ctx),
    ...bioprojectStep(submission, ctx),
    ...umbrellaBioprojectStep(submission, ctx),
    ...draStep(submission, ctx),
    ...jgaStep(submission, ctx),
    ...annotationStep(submission, ctx),
    ...variationStep(submission, ctx),
    ...geaStep(submission, ctx),
    ...metabobankStep(submission, ctx),
    ...thirdPartyStep(submission, ctx),
    ...multiModalStep(submission, ctx),
  ].sort(byServicePhysicalOrder)
```

`ctx` は `deriveFlowContext(submission)` が 1 度計算する派生情報。各 step が ctx を read-only で受ける。

### §7.2 FlowContext (共通入力)

`FlowContext` は Submission から純粋に派生する読み取り専用情報:

| field | 意図 |
|---|---|
| `primaryBioprojectAssignments` | Primary BP の分裂計画 (organism ごとに entry / group をどう割り振るか) |

step 関数は ctx を再計算せず、同じ Submission に対して同じ結果を返す (冪等性)。各 step の access / organism 判定は entry を直接 filter する形で表現し、共通計算が必要になった場合のみ context に派生情報を追加する。

### §7.3 各 step 関数の責務

| step | 入力条件 | 出力 service | 主な note |
|---|---|---|---|
| `biosampleStep` | 任意の FileEntry がある | `biosample` | organism / package 推測 |
| `bioprojectStep` | 任意の FileEntry がある | `bioproject` (organism 群ごと 1 件) | Project type 推測 |
| `umbrellaBioprojectStep` | Primary BP ≥ 2 | `umbrella-bioproject` | 公開強制 |
| `draStep` | open ∨ (restricted ∧ non-human) で sequence-read を含む | `dra` | Library Strategy 候補 |
| `jgaStep` | restricted ∧ human で sequence-read を含む | `jga` | DBCLS 申請依頼 |
| `annotationStep` | `gene-annotation` ButtonType ∨ `assembly-annotation` GroupType | `annotation` | DDBJ Mass との連動 |
| `variationStep` | `variation` ButtonType | open / restricted non-human: `ddbj-mass` (TogoVar 案内 note), restricted human: `eva` (note で External Variation Archive 誘導) | 内部 / 外部の判定 |
| `geaStep` | `microarray-expression` / `rna-seq-matrix` ∨ `mage-tab` / `two-color` GroupType | `gea` | MAGE-TAB 要件 |
| `metabobankStep` | `mass-spec` ∨ `imaging-ms` GroupType | `metabobank` (proteomics chip ありなら jpost への誘導 warning を note に追加) | proteomics / metabolomics の振り分け |
| `thirdPartyStep` | `provenance=third-party` chip ∨ `tpa-subtype` chip | `ddbj-mass` (third-party scope) | 元データの DOI 必須 note |
| `multiModalStep` | 1 FileGroup に 2+ 異種 ButtonType (assembly-annotation 除く) | `ddbj-mass` | multi-modal warning |

### §7.4 不変量 (PBT で固定)

任意の `Submission` に対して以下を満たす:

1. **冪等性**: `deriveFlowSteps(s)` は同じ input に対して同じ output (sort も含む)
2. **空 Submission**: 全 entry / group が空なら steps は空 `[]`
3. **BS 必須**: FileEntry が 1 つでもあれば `biosample` step が ≥ 1
4. **BP 必須**: FileEntry が 1 つでもあれば `bioproject` step が ≥ 1
5. **Umbrella 条件**: `bioproject` step が ≥ 2 ⟺ `umbrella-bioproject` step が 1
6. **JGA / DRA 排他**: 任意の sequence-read FileEntry について、restricted ∧ human なら JGA scope に、それ以外なら DRA scope に入る。同じ entry が両方の scope に入らない
7. **順序**: 出力 steps は `umbrella-bioproject` → `bioproject` → `biosample` → 内部 service → 外部 service の順
8. **id 一意**: 出力 steps の id は全て一意
9. **scope 非空**: 各 step の scope は `groupIds` か `entryIds` の少なくとも一方が非空

これらは `tests/pbt/submit/flow-rules-invariants.pbt.test.ts` で `numRuns=1000` で検証する。検証実装と本書は同期する (不変量を増減したら本節と test を両方更新)。

### §7.5 重複なしの担保

同じ FileEntry が異なる service step に重複して入る可能性は次のように排除する:

- `draStep` / `jgaStep`: 不変量 #6 で row 単位排他 (restricted human ⊥ それ以外)
- `variationStep` (内部) と `annotationStep`: ButtonType が異なる (`variation` ⊥ `gene-annotation`) ため重ならない
- `geaStep` / `metabobankStep`: ButtonType および GroupType が disjoint (`microarray-expression`/`rna-seq-matrix` vs `mass-spec`)
- `thirdPartyStep` と他: scope.entryIds は他 step と重なるが、`service` 値が `ddbj-mass` ∧ note `provenance=third-party` で識別され、step.id (service + scope digest) が異なれば別 step として扱う

### §7.6 step 関数の出力単位

各 step 関数は `FlowStep[]` を返す。多くは 0 件 or 1 件だが、`bioprojectStep` のように organism 群の数だけ複数件返すケースがある。

`scope` は「対象になる FileGroup / FileEntry の集合」であり、UI 側で「この Step はどの行群に関するか」を視覚的に紐付ける根拠となる。

---

## §8 Service バッジ色分け

Step カードの header に Service バッジ (色付き pill) を出す。色は 3 種:

### §8.1 3 色の意味

| バッジ色 | 条件 | 意味 |
|---|---|---|
| **emerald** | 内部 service (DDBJ) で notes に warning/error なし | 通常の DDBJ 経路 |
| **amber** | 外部 service (`humandbs` / `dbcls` / `jpost` / `eva` / `dgva`) で notes に warning/error なし | DDBJ 以外への誘導 |
| **rose** | 任意の service で notes に warning または error が 1 件でもある | 利用者の追加判断が必要 |

### §8.2 判定ロジック

`app/schemas/submit/service.ts` の `serviceBadgeColor(service, notes)` 純粋関数で判定する:

```
serviceBadgeColor(service, notes):
  if notes に warning または error がある:
    return "rose"
  if EXTERNAL_SERVICES.has(service):
    return "amber"
  return "emerald"
```

`INTERNAL_SERVICES` / `EXTERNAL_SERVICES` は `app/schemas/submit/service.ts` で disjoint な定数集合として定義される。`Service` enum 全値はこの 2 集合のいずれかに必ず属する (PBT `service-badge.pbt.test.ts` で固定)。

### §8.3 表示

emerald (DDBJ 通常) は「そのまま進めて OK」のサイン、amber (外部) は「別 service への離脱を示唆」、rose は「追加判断が必要」を視覚化する。Step カードに並んだ際、色の分布で利用者が全体感を掴める設計。

具体色値 (CSS variable / Tailwind utility) は `app/styles/tailwind.css` の `@theme` トークンで管理する。
