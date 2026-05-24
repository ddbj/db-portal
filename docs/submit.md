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
| `filename` | テーブル列「ファイル名」で入力するファイル名 (識別用、登録経路導出には使わない) |
| `organism` | テーブル列「生物」で選択 |
| `access` | テーブル列「公開区分」で選択 |
| `dataForm` | 行詳細 modal で選択 (typical default は `TYPICAL_DATA_FORM_FOR_BUTTON`) |
| `groupId` | 所属する FileGroup の id (必須) |
| `chipTags` | 行内 chip 集合 (`{axis, value}` 配列、modal 内で編集) |

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
| テーブル列 (3 軸 + 補助列) | `buttonType` (read-only Tag), `organism`, `access`, `filename`, データ詳細 chip cell | 列のセル (selector / TextInput / modal trigger) | Cross-DB Tag |
| 行詳細 modal | `dataForm`, `chipTags`, `FileGroup.groupType` | modal 内 FormGroup / FmtRadio / FmtCheck | Cross-DB Tag |
| Step カード pulldown | BS package, DRA Library Strategy, BP Project type | Step カード内 pulldown | Intra-DB Tag |

### §4.2 責務の分け方

**テーブル列 (3 軸 + 補助列)** は全 service 共通の最も粗い分類。`buttonType` (種別、行追加時固定) + `organism` (生物) + `access` (公開区分) の 3 軸を selector で見せ、 `filename` (識別用) と「データ詳細」 chip cell (modal trigger) を補助列として並べる。 列を増やすと table が横に広がり、利用者が「何を入れるべきか」分からない列が増えるため、 dataForm / chipTags / groupType は行詳細 modal に降ろす。

**行詳細 modal (Cross-DB Tag 細部)** は「サービス step 関数の分岐に効くが、列にすると table が肥大化する」軸。`dataForm` / `chipTags` / `FileGroup.groupType` を ButtonType ごとの Q&A 形式で編集する (§11)。 chip は `{axis, value}` の組で表現するので、軸が増えても UI 形は同じ。

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

---

## §9 画面構成

`/submit` は 2 段構造 (§1.2) を、上段「ファイルテーブル」section + 下段「登録フロー」section の 2 つの `<Section>` で表現する。

### §9.1 全体レイアウト

```
┌─ Header (active="submit") ───────────────────────────────────────┐
├─ PageTitle "登録ナビゲーション" + subtitle ────────────────────────┤
│
├─ Section padY="md"   ファイルテーブル ────────────────────────────┤
│   ┌ SectionHeading "ファイルテーブル" ───────────────────────────┐│
│   ├ FileTypeGrid (3 列 × 3 行、9 ButtonType) ────────────────────┤│
│   └ FileTable (or empty placeholder) ──────────────────────────┘│
│
├─ Section padY="md"   登録フロー ──────────────────────────────────┤
│   ┌ SectionHeading "登録フロー" count={steps.length} ───────────┐│
│   ├ TagProgress (設定済 / 全行) ────────────────────────────────┤│
│   ├ FlowStepCards (FlowStep[] → 並んだ card) ────────────────────┤│
│   └ PartialFailureBanner (validation 違反時のみ) ───────────────┘│
│
├─ ModalRouter (overlay、editing 行のとき 1 つだけ open) ────────────┤
├─ Footer ──────────────────────────────────────────────────────┤
```

`Section` / `SectionHeading` / `PageTitle` は `app/ui/` の primitive をそのまま使う (`docs/ui-primitives.md §4-§6`)。

### §9.2 9 ボタン (`FileTypeGrid`)

`FileTypeGrid` は `ButtonType.options` を駆動源とする 3 × 3 grid。 grid 内の 1 ボタン (`FileTypeButton`) は次の要素を持つ:

- 種別 icon (`app/features/submit/components/file-type-icon.tsx`、`ButtonType` 値ごとに固有 SVG path、装飾 `aria-hidden`)
- 種別 label (i18n `submit.buttons.{buttonType}.label`)
- 拡張子サンプル (i18n `submit.buttons.{buttonType}.ext`、mono `font-mono text-fs-micro text-ink-mid`)
- click hint (`submit.buttons.{buttonType}.hint`、`title` 属性に出す)

クリックで `dispatch({ type: "ADD_ROW", buttonType })` を発火し、空行 1 件を末尾に追加 + その行の編集 modal を即時 open する。

新 ButtonType を vocabulary に追加すると、grid に自動で追加される (`.options` を直接 map するため)。対応する i18n キーが欠落すれば PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) が落ちる。

### §9.3 行追加後の初期状態

`ADD_ROW` の reducer は次を行う:

1. 新 `FileGroup` (id 自動採番、`groupType` = `TYPICAL_GROUP_TYPE_FOR_BUTTON[buttonType]`、`memberFileIds` 空)
2. 新 `FileEntry` (id 自動採番、`buttonType`、`organism` 未設定、`access` = `"open"`、`dataForm` = `TYPICAL_DATA_FORM_FOR_BUTTON[buttonType]`、`filename` 空、`groupId` = 上の group id、`chipTags` 空)
3. `FileGroup.memberFileIds` に entry id を追加
4. `editing` UI state を `{ kind: "row", entryId }` に設定 (modal 自動 open)

id は client mount 後に `crypto.randomUUID()` で採番する。SSR レンダリングでは initial state は空のため hydration mismatch が起きない (`features/search/advanced` と同じ pattern)。

### §9.4 ヘッダー / ボディ密度

全画面で次を守る:

- 種別ボタン 1 件の icon = 18px、label = `text-fs-body` weight 600、ext = mono `text-fs-micro`
- ボタン全体 padding `px-4 py-3`、border `border-soft`、radius `rounded-button`
- 行高 (table row) は最小 56px (`min-h-[3.5rem]` を `<tr>` 子セルに付与)
- Step カード = `rounded-card` + `shadow-card`、 内部 padding `p-4`
- Modal = `Modal` primitive (width 820、`docs/ui-primitives.md §11`)

色は `@theme` トークン経由 (`bg-surface` / `text-ink` / `border-border-soft` 等)、生 hex / arbitrary value は features 配下で禁止 (`architecture.md §3.3`)。

---

## §10 ファイルテーブル UX

ファイルテーブルは Cross-DB Tag の **buttonType / organism / access** の 3 軸 + ファイル名 + 「データ詳細」chip の 5 列構成 (+ 削除アクション列)。`dataForm` と `chipTags` と `groupType` は「データ詳細」chip cell の modal 内で編集する。

### §10.1 列構成

| 列 | 編集 UI | 連動データ | warn 条件 |
|---|---|---|---|
| 種別 | `Tag kind="tag"` (read-only) | `FileEntry.buttonType` | — (追加時に固定、変更不可) |
| ファイル名 | `TextInput` (mono) | `FileEntry.filename` | 空白文字列 (`warn`) |
| 生物 | `NativeSelect` | `FileEntry.organism` | 空 value (`warn`) |
| 公開区分 | `NativeSelect` | `FileEntry.access` | — (default `"open"`) |
| データ詳細 | `WarnDashedButton` / `RowSetTag` | `FileEntry.dataForm` / `chipTags` / `FileGroup.groupType` | chipTags が空かつ dataForm が default のとき `WarnDashedButton` |
| 削除 | `IconButton` (×) | — | — |

`buttonType` は行追加時に固定し変更不可 (誤った種別を選んだ場合は行削除 + 別ボタンで作り直す)。これにより `TYPICAL_DATA_FORM_FOR_BUTTON` / `TYPICAL_GROUP_TYPE_FOR_BUTTON` の default 整合が崩れない。

`organism` / `filename` 未設定は `state="warn"` を `NativeSelect` / `TextInput` に渡す。 visual には warn 色 + 「未設定」 inline message で表現。

### §10.2 「データ詳細」 chip cell

ButtonType ごとの controlled vocabulary (`dataForm` + `chipTags` + `FileGroup.groupType`) を 1 click で編集する trigger。表示は 2 形態:

- **未設定** (chipTags が空かつ groupType が default): `WarnDashedButton` (label `submit.table.detailUnset` = `"+ 設定"`、warn 配色 + dashed border)
- **設定済み** (chipTags が ≥ 1 件、または groupType が default 以外): `RowSetTag` (brand-soft 背景 + brand-light/50 border + check icon + 短文サマリ、サマリは `summarizeRowDetail({entry, group})` が生成する 1-2 句、 例 `"pair-end · GEA"` / `"third-party"` / `"phenotype + spatial"`)

click で `dispatch({ type: "OPEN_EDIT_ROW", entryId })` を発火し、 row editing modal を open する (§11)。

### §10.3 「データ詳細」 サマリのテキスト生成

`summarizeRowDetail({entry, group})` は純粋関数で、次の優先順序で 1-2 句のテキストを返す:

1. `FileGroup.groupType` が default 以外なら groupType i18n label を 1 句目に出す (`pair-end` / `10x` / `mage-tab` 等)
2. `entry.chipTags` の代表値 1-2 件を `·` 区切りで連結する (chip axis ごとに i18n label を引く)
3. 上記が 0 件で `entry.dataForm` が default と異なるなら dataForm i18n label のみを返す
4. それも 0 件なら空文字 (= `WarnDashedButton` 表示分岐に倒れる)

サマリは表示専用で機械処理しない (PBT は通さない、 unit test で代表シナリオを検査)。

### §10.4 空状態 (initial)

`fileEntries.length === 0` のとき、テーブル本体は `Label "NO FILES"` + 案内文 (`submit.table.empty`) を中央寄せで出す。 9 ボタン grid は常に表示。

### §10.5 行削除

削除 IconButton クリックで confirm dialog (`window.confirm` ベースでなく `Modal` primitive を `OPEN_CONFIRM_DELETE` で出す) → 確認後 `dispatch({ type: "REMOVE_ROW", entryId })`。

行を削除すると:

- `FileGroup.memberFileIds` から entry id を除外
- `memberFileIds` が空になった group も削除
- group が削除されると `FileEntry.groupId` が孤立する他行が出るので、 reducer は孤立 entry の `groupId` を新規の単独 group に再割当する (整合維持)

### §10.6 同 group への 2 件目追加

1 つの `FileGroup` に複数 entry を載せる UX (pair-end の R1 + R2 等) は、 既存行の「+ ペアファイルを追加」 link (RowSetTag 設定済み時に表示) を起点とする:

1. RowSetTag 内 link click で `dispatch({ type: "ADD_TO_GROUP", groupId, buttonType })`
2. reducer は新 FileEntry を作り、 同 groupId に紐付ける
3. 編集 modal を同 group の 2 件目について open

これは row 編集 modal の §11.3 「Q1: リードの構成」 が `pair-end` / `10x` 等を選択して保存した直後に自動で行われる動作と等価。

### §10.7 大量行レイアウト

100 行以上の行を持つテーブルでも、 デフォルト DOM レンダリング (`<table>` + n `<tr>`) を維持する。 virtualization (`react-window` 等) は導入しない。 visual には `<tbody>` の overflow を作らず、 ページ全体スクロールで読み下す。

---

## §11 Modal UX

各 `ButtonType` 専用の編集 modal を実装する。 modal は ButtonType の数だけ存在し (9 種)、 `ModalRouter` が `state.editing` を見て対応 modal を render する。

### §11.1 共通形

全 modal は同じ shape を持つ:

```
┌ Modal (width 820) ─────────────────────────────────────────────┐
│ ModalHeader                                                    │
│   eyebrowTag = Tag kind="tag" {buttonType label}               │
│   eyebrowMeta = mono filename                                  │
│   title = "データ詳細を入力"                                    │
│   description = 1 行説明                                        │
│   onClose = CLOSE_MODAL                                         │
├────────────────────────────────────────────────────────────────┤
│ ModalBody cols={2} minHeight={460}                              │
│ ┌ 左 56% padding 22 ────┐ ┌ 右 44% ModalPreview ───────────────┐│
│ │ FormGroup num="1." ... │ │ Label "この設定で組まれる登録"     ││
│ │ FmtRadio / FmtCheck    │ │ PreviewCard × n                   ││
│ │                        │ │ footnote                           ││
│ │ FormGroup num="2." ... │ │                                    ││
│ │ ...                    │ │                                    ││
│ └────────────────────────┘ └────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│ ModalFooter                                                    │
│   status = 入力進捗 (例: "必須項目はすべて入力済み")              │
│   actions = [Button secondary "キャンセル", primary "この内容で保存"]│
└────────────────────────────────────────────────────────────────┘
```

`Modal` / `ModalHeader` / `ModalBody` / `ModalFooter` / `ModalPreview` / `PreviewCard` / `FormGroup` / `FmtRadio` / `FmtCheck` は `app/ui/` の primitive (`docs/ui-primitives.md §11`)。

### §11.2 Modal の責務

modal は次の 3 つを編集する:

1. `FileGroup.groupType` (1 つ目の FormGroup でほぼ確定)
2. `FileEntry.dataForm` (default 維持 / override の選択)
3. `FileEntry.chipTags` (ButtonType 固有の chip 軸を 1-2 件)

`organism` / `access` / `filename` は **modal の中では編集しない** (テーブル列で扱う、 modal は per-row の詳細編集に集中する)。

「保存」 click で `dispatch({ type: "COMMIT_ROW_EDIT", entryId, patch })` を発火、 patch は modal が組み立てた `{ groupType, dataForm, chipTags }` partial。 reducer は対応 entry / group を immutable に置換する。

「キャンセル」 click で `dispatch({ type: "CLOSE_MODAL" })`、 編集中 draft は破棄。

### §11.3 ButtonType ごとの FormGroup 構成

各 modal の質問項目は ButtonType に依存する。 質問本数は 1-3 件で、 wizard (multi-step) には倒さず single page で並べる (利用者がプレビューを見ながら同時に決められる UX)。

| ButtonType | FormGroup 1 | FormGroup 2 | FormGroup 3 |
|---|---|---|---|
| `sequence-read` | リードの構成 (`single-end` / `pair-end` / `10x` / `multiplex` / `pacbio-hdf5`、`GroupType` に直結) | 解析済データの登録 (`yes` / `no`、`yes` で `GroupType` を `mage-tab` 等に展開 + chipTag `functional-genomics` 設定) | hybrid assembly か (`FmtCheck`、`GroupType` を `hybrid` に切替) |
| `assembled` | アセンブリ形 (`assembled` / `hybrid` / `mag-sag-chain`、`assembly-form` chip + `GroupType`) | アノテーションも同時 (`FmtCheck` で `assembly-annotation` group に展開) | provenance (`first-party` / `third-party`、 chip 設定) |
| `gene-annotation` | アノテーション対象 (`assembly-pair` / `standalone`、 chip 設定) | provenance (`first-party` / `third-party`) | — |
| `variation` | 変異形 (`per-sample` / `aggregate`、 chip `variation-form`) | reference 参照 (`yes` / `no`、 chip `variation-with-reference` + GroupType) | — |
| `phenotype` | 表現型タイプ (`clinical` / `model-organism`、 chip 設定) | data-form 詳細 (`raw` / `summary`) | — |
| `microarray-expression` | プラットフォーム (`single-color` / `two-color`、 GroupType `mage-tab` / `two-color`) | MAGE-TAB 同梱 (always `mage-tab`) | — |
| `rna-seq-matrix` | データ形 (`raw-counts` / `normalized` / `tpm`、 `dataForm` 切替) | MAGE-TAB 同梱 | — |
| `mass-spec` | 領域 (`proteomics` / `metabolomics`、 chip `mass-spec-domain`) | 取得方法 (`shotgun` / `targeted` / `imaging`、 `imaging` で GroupType `imaging-ms`) | — |
| `spatial-tx` | プラットフォーム (`visium` / `stereo-seq` / `slide-seq`、 chip `spatial-platform`) | 解析段階 (`raw` / `analysis-output`、 `dataForm` 切替) | — |

質問本数の最終形は ButtonType ごとに 1-3 件で固定する。 wizard 化はリリース時点では採用しない (single page で完結する想定で primitive を組む)。

### §11.4 ModalPreview の組み立て

右 44% の `ModalPreview` には、 「今の draft が保存されたら出る FlowStep を 3-4 枚」 をプレビュー表示する:

1. modal が編集中の `{groupType, dataForm, chipTags}` を仮 patch として `entry` に当てた `Submission` を組む (元 state は変更しない)
2. `deriveFlowSteps(patchedSubmission)` を呼ぶ
3. 結果のうち、 patch 対象 entry の id を `scope.entryIds` に含む step だけを抽出
4. 各 step を `PreviewCard` (source = serviceToSource(service)、 db = service code、 title = i18n `submit.preview.{service}.title`、 body = i18n `submit.preview.{service}.body`) で出す

これにより利用者は「保存したら BioSample + DRA + GEA が組まれる」 のような予測を modal の右側でリアルタイムに見られる。 preview の `active` は `step.notes` に warning / error が無いとき `true`、 ある時 `false` (`opacity-50`) にして visual に「未確定」 を示す。

### §11.5 ModalFooter status と保存可否

`status` には「必須項目はすべて入力済み」 / 「{n} 項目が未入力」 をテキストで出す。 必須項目は ButtonType ごとに 1 つ目の FormGroup 回答 (groupType に直結) のみ。 default が必ず選択されているので「必須未入力」 状態は実質起きないが、 利用者が FmtRadio を明示変更したとき以外は default のまま「入力済み」 と扱う。

保存ボタンは常に enable (default 値で保存可)、 visual に保存を妨げる disabled 状態を出さない。

### §11.6 confirm-delete modal

行削除確認は `ModalRouter` が `state.editing.kind === "confirm-delete"` のときに render する小型 modal (width 480)。 内容は「この行を削除すると、 関連 Step が変更されます。 削除しますか?」 と「キャンセル」 + danger「削除」 button。 危険操作は `Button kind="danger"` で表現。

### §11.7 ModalRouter

```tsx
function ModalRouter({state, dispatch}) {
  if (state.editing === null) return null
  if (state.editing.kind === "row") {
    const entry = state.submission.fileEntries.find(e => e.id === state.editing.entryId)
    if (!entry) return null
    const Modal = MODAL_BY_BUTTON_TYPE[entry.buttonType]
    return <Modal entry={entry} state={state} dispatch={dispatch} />
  }
  if (state.editing.kind === "confirm-delete") {
    return <ConfirmDeleteModal entryId={state.editing.entryId} dispatch={dispatch} />
  }
  return null
}
```

`MODAL_BY_BUTTON_TYPE` は `ButtonType` 全 9 種の値を key に持つ `Record<ButtonType, ComponentType>`。 値の漏れがあれば TypeScript exhaustiveness で検出される。

### §11.8 focus / 復元

`Modal` primitive の自前 focus trap (`docs/ui-primitives.md §11.1`) が open 時に dialog 内最初の focusable に focus 移動、close 時に trigger 要素 (= テーブル行の RowSetTag / WarnDashedButton) に focus 復元する。

ESC で `CLOSE_MODAL`、 overlay click で同じく `CLOSE_MODAL`。 dialog 内部 click は overlay click から守られる (`stopPropagation`)。

---

## §12 動的 FlowStep カード描画

下段の「登録フロー」 section が `selectSteps(state)` で `FlowStep[]` を取得し、 並んだ card で表示する。 `selectSteps` は `app/features/submit/state/selectors.ts` の純粋関数で、 内部で `deriveFlowSteps(state.submission)` を呼ぶ。

### §12.1 FlowStepCards

```tsx
function FlowStepCards({state}) {
  const steps = selectSteps(state)
  if (steps.length === 0) return <FlowEmptyState />
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, i) => (
        <FlowStepCard key={step.id} step={step} index={i + 1} />
      ))}
    </ol>
  )
}
```

`<ol>` 要素で順序を表現し、 アクセシビリティ的に「順序ある手順」 を screen reader へ伝える。

### §12.2 FlowStepCard

```
┌ FlowStepCard ────────────────────────────────────────────────┐
│ ┌ Header ────────────────────────────────────────────────┐   │
│ │ [StepBadge index] [Tag source DDBJ/DBCLS] title       │   │
│ │                                    [Tag status warning?]│   │
│ └────────────────────────────────────────────────────────┘   │
│ ┌ Body ──────────────────────────────────────────────────┐   │
│ │ description (i18n submit.flow.{service}.description)   │   │
│ │ ┌ AccessionPlaceholder ──────────────────────────────┐ │   │
│ │ │ 発行 accession: PRJDB######, SAMD######, DRR###### │ │   │
│ │ └────────────────────────────────────────────────────┘ │   │
│ │ ┌ FilesBlock ────────────────────────────────────────┐ │   │
│ │ │ 1/n / filename / filename                          │ │   │
│ │ │ 2/n / ...                                           │ │   │
│ │ └────────────────────────────────────────────────────┘ │   │
│ │ Notes (info / warning / error i18n message を列挙)     │   │
│ │ ┌ ExternalLinkButton ─────────────────────────────────┐│   │
│ │ │ 「D-way へ登録に進む ↗」 (Button kind="secondary")    ││   │
│ │ └─────────────────────────────────────────────────────┘│   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### §12.3 StepBadge

ステップ番号 (1, 2, 3, …) を円 (28 × 28) で表示。 確定 / pending で配色を切替:

- 確定 (`step.notes` に kind=info のみ): `bg-brand-soft text-brand-deep border-brand-light`
- pending (`step.notes` に kind=warning または error が含まれる): `bg-warn-bg text-warn-fg border-warn-border` (dashed)

`step.notes` の warning / error 有無は `flow-rules/service-badge.ts` の `stepBadgeColor(step)` と整合する。`StepBadge` は service badge color (emerald / amber / rose) とは異なる、 「ステップ進捗」 軸の表現。

### §12.4 ServiceBadge

step header に並ぶ `Tag kind="source" name="DDBJ" | "DBCLS"`。`serviceToSource(step.service)` で `Service` → `"DDBJ" | "DBCLS"` の純粋写像を引く (DDBJ 内部 service は全て `"DDBJ"`、 外部誘導 service `dbcls` のみ `"DBCLS"`、 残り外部 `humandbs` / `jpost` / `eva` / `dgva` は `"DDBJ"` を出さず Tag を hide する代わりに ExternalLinkButton のラベルに含める)。

ServiceBadge の色 (`emerald` / `amber` / `rose`) は visual には Tag 自体ではなく、 FlowStepCard 外周 border 色 (1px) で表現する:

- emerald: `border-ok-border`
- amber: `border-warn-border`
- rose: `border-critical-border`

これにより「card の border 色 = service の状態色」、 source pill = 「どこの DB か」 が分離される。

### §12.5 AccessionPlaceholder

発行される accession の placeholder テキスト (`PRJDB######`, `SAMD######`, `DRR######`, `DRX######` 等) を mono inline code で並べる。 アクセシビリティのため `<span className="font-mono ...">` で出し、 placeholder 性質を伝える hint をその前に `Label` で出す (`submit.flow.accessionLabel` = `"発行 accession (例)"`).

具体 placeholder 値は `app/features/submit/components/accession-placeholder.ts` の `ACCESSION_PLACEHOLDERS: Record<Service, string[]>` で持つ (例 `bioproject: ["PRJDB######"]`, `dra: ["DRR######", "DRX######"]`)。 i18n しない (accession code は機械フォーマットなので)。

### §12.6 FilesBlock

step が対象とする FileGroup を「1/n」 表記の mini card 列で並べる:

```
┌────────────────────────────────────────────────────────────┐
│ 1/3   read-001_R1.fastq.gz                                 │
│       read-001_R2.fastq.gz                                  │
├────────────────────────────────────────────────────────────┤
│ 2/3   read-002_R1.fastq.gz                                 │
│       read-002_R2.fastq.gz                                  │
└────────────────────────────────────────────────────────────┘
```

`scope.groupIds` を iterate して、 各 group の `memberFileIds` から FileEntry を引き、 `filename` を表示する。 filename が空の entry は `<filename 未設定>` (i18n `submit.flow.filenameMissing`) を表示し、 visual に warn 色で示す。 group 数 ≥ 5 のときは初期 4 件 + `+ 残り {n} 件を表示` リンク (`Button kind="link"` でクリック展開)。

### §12.7 ExternalLinkButton

step ごとの外部誘導 URL を `Button kind="secondary"` で出す。 URL は `app/features/submit/external-links.ts` の `EXTERNAL_LINKS: Record<Service, string>` で hardcode 管理する (将来 content collection に移行する設計余地はあるが、 リリース時点は hardcode で十分):

| service | 誘導 URL (例) | label |
|---|---|---|
| `bioproject` | `https://ddbj.nig.ac.jp/resource/sra-study` (D-way) | `submit.flow.bioproject.cta` |
| `biosample` | `https://ddbj.nig.ac.jp/biosample/submission` | `submit.flow.biosample.cta` |
| `dra` | `https://trace.ddbj.nig.ac.jp/D-way/` | `submit.flow.dra.cta` |
| `jga` | `https://www.ddbj.nig.ac.jp/jga/submission.html` | `submit.flow.jga.cta` |
| `gea` | `https://www.ddbj.nig.ac.jp/gea/submission.html` | `submit.flow.gea.cta` |
| (以下同様) | … | … |

button は外部 link を扱う `Button` ではなく、 内部に `<a target="_blank" rel="noopener noreferrer">` を embed しない。 visual には外向き矢印 `↗` (`ExternalIcon`) を label の末尾に置き、 click は `window.open(url, "_blank", "noopener,noreferrer")` を `Button` の `onClick` で発火する (`Button` primitive は `<button>` 要素なので、 a-href 経由でなく onClick で同等動作)。

### §12.8 Notes 表示

`step.notes` (`{kind, messageKey}[]`) を listing する:

- kind=info: 通常テキスト + info icon
- kind=warning: `Callout tone="warn"` で囲む
- kind=error: `Callout tone="warn"` + `role="alert"` (緊急性表現)

`messageKey` は i18n リソースキー (例 `submit.dra.intro` / `submit.jga.dbclsApplicationRequired`)、 ja / en で必ず存在する (PBT 担保)。

### §12.9 TagProgress

「データ詳細 設定済 / 全行」 を section heading 直下に出す:

```
┌ TagProgress ────────────────────────────────────────────────┐
│ [clock icon] データ詳細 設定済み  [mono n/total]  ━━━━━━━ %  │
│  残り {m} 件のデータ詳細を設定すると、フローカードの詳細が確定 │
│  します。                                                    │
└──────────────────────────────────────────────────────────────┘
```

n / total = chipTags が ≥ 1 件 (もしくは groupType が default 以外) の行数 / 全行数。 100% で完了サイン (`ok-bg + ok-fg + check icon`)、 < 100% で進捗 (`warn-bg + warn-fg + clock icon`)。

`TagProgress` は `app/features/submit/components/tag-progress.tsx` の画面固有 component。 内部で `Label` / `Tag` を使う。

### §12.10 PartialFailureBanner

`selectValidations(state)` が non-empty を返す場合、 section 末尾に表示する警告バナー:

```
┌ Callout tone="warn" role="alert" ───────────────────────────┐
│ {n} 件のデータ設定が flow-rules と整合していません。         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ • {validation 1} → 該当行 [#{row index}]              │ │
│ │ • {validation 2} → 該当行 [#{row index}]              │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

validation 検査軸 (`selectValidations` の責務、 純粋関数):

- `missing-organism`: FileEntry.organism が空 (`organism` を要素 enum と整合させているため Zod parse は通るが、 UI 上「未設定」 として `""` を一時保持する設計を許容する)
- `missing-filename`: FileEntry.filename が空白文字列
- `inconsistent-group-type`: `FileGroup.groupType` が、 entry の `buttonType` と互換しない (例 `mage-tab` group に `mass-spec` ButtonType の entry が混入)
- `dangling-group-id`: FileEntry.groupId が submission.fileGroups にない (UI バグ検知、 reducer 不変量で起きないはずだが安全網)

各 validation は i18n key (`submit.validations.{kind}`) + 該当 row index list を含む。 click で row scroll into view + 編集 modal を open する。

---

## §13 状態管理

UI 状態は `app/features/submit/state/` の reducer + selectors で管理する。 純粋関数で組み、 副作用は持たない。

### §13.1 UIState

```ts
type Editing =
  | null
  | { kind: "row"; entryId: string }
  | { kind: "confirm-delete"; entryId: string }

type UIState = {
  submission: Submission
  editing: Editing
}
```

`submission` は `app/schemas/submit/Submission` の値 (UI 上で一時的に `organism === ""` 等を保持するため、 reducer 内では `Submission` schema を緩く扱う—Zod parse は loader 境界でしかしない)。

### §13.2 Action 一覧

```ts
type Action =
  | { type: "ADD_ROW"; buttonType: ButtonType }
  | { type: "EDIT_ROW_CELL"; entryId: string; patch: Partial<FileEntry> }
  | { type: "OPEN_EDIT_ROW"; entryId: string }
  | { type: "COMMIT_ROW_EDIT"; entryId: string; patch: RowEditPatch }
  | { type: "ADD_TO_GROUP"; groupId: string; buttonType: ButtonType }
  | { type: "OPEN_CONFIRM_DELETE"; entryId: string }
  | { type: "REMOVE_ROW"; entryId: string }
  | { type: "CLOSE_MODAL" }
```

`RowEditPatch` は `{ groupType?: GroupType; dataForm?: DataForm; chipTags?: FileEntryChip[] }`。 modal が組み立てて dispatch する。

reducer は immutable update を維持し、 id は client mount 後にしか生成しない (SSR mismatch 回避)。

### §13.3 不変量

任意の action sequence に対し、 reducer は次を満たす:

1. **id 一意性**: `submission.fileEntries` と `submission.fileGroups` の id 集合内で各々 unique
2. **groupId 参照**: 各 `FileEntry.groupId` が `submission.fileGroups` 内に存在する (孤立しない)
3. **memberFileIds 双方向**: `FileEntry.groupId === g.id` ⟺ `g.memberFileIds.includes(entry.id)`
4. **editing 整合**: `editing.kind === "row"` のとき `editing.entryId` は `fileEntries` 内に存在する
5. **buttonType 不変**: `EDIT_ROW_CELL` / `COMMIT_ROW_EDIT` は entry.buttonType を書き換えない

これらは `tests/pbt/features/submit/reducer-invariants.pbt.test.ts` で `numRuns=1000` で検証する。

### §13.4 selectors

```ts
selectSteps(state): FlowStep[]            // = deriveFlowSteps(state.submission)
selectValidations(state): Validation[]    // 未設定セル / 不整合 検出
selectRowDetailSummary(state, entryId): string  // RowSetTag のサマリテキスト
```

selectors は memoize しない (デフォルトで純粋関数として呼び、 React の reconciliation で不要な再計算を抑える方針)。

---

## §14 i18n リソース構造

`app/lib/i18n/resources/{ja,en}.ts` の `Resources.submit` 配下に次を追加する。 ja / en 両方で完全一致が PBT で担保される (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`)。

```ts
submit: {
  pageTitle: string
  pageSubtitle: string
  table: {
    heading: string
    fileTypeGridLabel: string
    columnButtonType: string
    columnFilename: string
    columnOrganism: string
    columnAccess: string
    columnDetail: string
    columnDelete: string
    detailUnset: string         // "+ 設定"
    detailSetPrefix: string     // "設定済み"
    empty: string
    addToGroup: string
    filenamePlaceholder: string
    organismPlaceholder: string
  }
  buttons: Record<ButtonType, { label: string; ext: string; hint: string }>
  organism: Record<Organism, string>
  access: Record<Access, string>
  dataForm: Record<DataForm, string>
  groupType: Record<GroupType, string>
  chipAxis: Record<ChipAxis, string>
  flow: {
    sectionHeading: string
    accessionLabel: string
    filenameMissing: string
    notesSeparator: string
    {service}: { title: string; description: string; cta: string }   // ← Service 全 14 値
  }
  preview: {
    label: string
    footnote: string
    {service}: { title: string; body: string }   // ← Service 全 14 値
  }
  progress: {
    heading: string
    countPrefix: string
    remaining: string
    complete: string
  }
  modal: {
    title: string
    description: string
    save: string
    cancel: string
    confirmDelete: {
      title: string
      description: string
      confirm: string
      cancel: string
    }
    formGroups: {
      {buttonType}: { 1: string; 2?: string; 3?: string }   // ← ButtonType 9 種
    }
  }
  validations: {
    missingOrganism: string
    missingFilename: string
    inconsistentGroupType: string
    danglingGroupId: string
    rowReference: string  // "→ 該当行 #{index}"
  }
  biosample: { intro: string }
  bioproject: { intro: string }
  umbrella: { intro: string; publicOnly: string }
  dra: { intro: string }
  jga: { intro: string; dbclsApplicationRequired: string }
  annotation: { intro: string }
  variation: {
    internal: { intro: string; togovarLink: string }
    external: { restrictedHuman: string }
  }
  gea: { intro: string; mageTabRequired: string }
  metabobank: { intro: string; jpostRedirect: string }
  thirdParty: { intro: string; originDoiRequired: string }
  multiModal: { warning: string }
  a11y: {
    addRowButton: string
    deleteRow: string
    editRowDetail: string
    modalClose: string
    modalSave: string
    modalCancel: string
    flowStepCard: string
    previewCard: string
  }
}
```

`submit.biosample.*` / `submit.dra.*` / `submit.jga.*` / etc. は `flow-rules/steps/` の `FlowStepNote.messageKey` 値と完全一致させる (key 集合は schema 駆動)。

---

## §15 zones / 制約

- `app/features/submit/state/` は `app/shell/` / `app/features/{search,news,auth}/` を import しない (zones)
- `app/features/submit/` 内では生 button / a / input / select / textarea を書かない (`react/forbid-elements` lint)。 全て `app/ui/` primitive 経由
- 生 hex / arbitrary Tailwind value は `app/features/submit/` で禁止 (`docs/architecture.md §3.3`)
- 新 primitive 追加は `.claude/docs/design/INDEX.md §6` の逆流手順を経由する (`docs/ui-primitives.md §2`)

リリース時点で submit features は外部 API を呼ばない (navigator のみ)。 将来 draft 永続化 / Repository API 連携を入れる場合は `app/features/submit/api/` を新設する余地を残すが、 本リリースでは作らない。
