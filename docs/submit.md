# 登録ナビゲーション (submit)

DDBJ の登録窓口は service ごとに分かれており、利用者は最初に「自分のデータの DB は何か」を選ばされる構造になっている。submit ナビゲーションは、利用者が手元のファイル / メタデータの性質を入力するだけで、登録経路 (どの service に何を出すか) を portal 側で導出して可視化する UI である。

本書は submit の **概念 / 経路導出の考え方 / 画面構造** を扱う。値域そのもの (vocab の値リスト / 型のフィールド / Action enum / i18n リソース key) は `app/schemas/submit/` と `app/features/submit/` のコードが SSOT であり、本書は値を二重に書かない。

---

## 概念

### 「自分のデータの DB は何か」を訊かない設計

利用者は登録窓口に来た時点では、DDBJ の service 構造 (BioProject / BioSample / DRA / JGA / DDBJ Mass / GEA / MetaboBank …) を必ずしも理解していない。「自分が持っているのは FASTQ で、ヒトの restricted データ」のような **データ側の言葉** で考えている。

submit ナビゲーションはこの状態を出発点とする:

- 利用者は「ファイルの種類」「生物」「公開区分」「データ形」のような **データ側の属性** を入力する
- portal が controlled vocabulary と純粋関数で「どの service に何を出すか」を導出する
- 利用者は導出結果 (Step カード) を見て、各 Step の Intra-DB Tag (BS package, DRA Library Strategy 等) を埋めていく

この向きで「service の存在は知らなくて良い」状態を担保する。

### テーブル + Step カードの 2 段構造

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

### Cross-DB Tag / Intra-DB Tag

submit の controlled vocabulary は 2 種類の文脈で使われる:

- **Cross-DB Tag**: 全 service に共通する分類軸。`ButtonType`, `Organism`, `Access`, `DataForm` のように、どの service に出すかを決める前段の情報
- **Intra-DB Tag**: 特定の service 内で使う controlled vocabulary。`BioSample package`, `DRA Library Strategy`, `BioProject Project type` のように、step 単位で出す pulldown 群

Cross-DB Tag はテーブル列 / 行内 chip で表現、Intra-DB Tag は Step カード内の pulldown で表現する。

### SSOT 関係

本書は **概念と図** だけを語る。enum の値域、データ型のフィールド、サービス step 関数の判定式は `app/schemas/submit/*.ts` と `app/features/submit/flow-rules/**/*.ts` が SSOT。

本書は値リストを書かない。値が変わったら schemas を直すだけで、docs を直す必要はない (二重源泉を作らない)。

---

## Controlled vocabulary

値域は `app/schemas/submit/vocabulary.ts` と `app/schemas/submit/service.ts` を SSOT とする。本章では各 enum の **意図と使い分け** だけを述べる (値リストはコード参照)。

- **ButtonType**: ファイルの **物理的種類**。FASTQ raw か、assembly FASTA か、VCF か、MAGE-TAB マトリクスか、質量分析 raw か、といった粒度。テーブル先頭の「ファイルを追加」 ボタンに並ぶ ButtonType ごとに 1 行追加され、行追加時に固定 (変更不可)。新 ButtonType を vocabulary に追加すると grid に自動で追加される (`.options` を直接 map するため)
- **GroupType**: 複数ファイルが論理的に 1 単位を成す関係 (pair-end / 10x / MAGE-TAB / mag-sag chain 等)。経路導出の分岐要素として効く (例: `jga-dataset` の存在は JGA step を強くドライブ)
- **Organism**: DDBJ 登録経路の分岐に必要十分な粒度の生物分類。種・属レベルの phylogeny は持たない (それは BS package / BP organism field など Intra-DB Tag で扱う)。`bioprojectStep` は organism 集合のユニーク値ごとに Primary BP を分裂させる
- **Access**: `open` / `restricted`。`restricted ∧ human` の組合せが JGA / humandbs への分岐起点
- **DataForm**: raw / assembled / analysis-output / matrix / annotation / mass-spec / phenotype 等。ButtonType に従属する側面はあるが、テーブル列で利用者が override できる独立軸として保つ (例: ButtonType=`sequence-read` を `analysis-output` に変えると DRA Run → DRA Analysis に経路が変わる)
- **ChipAxis**: テーブル列に表現できない細部区分を、行内 chip の `{axis, value}` ペアで表現する (任意個)。`assembly-form` / `provenance` / `variation-form` / `haplotype-mode` / `mass-spec-domain` / `spatial-platform` / `tpa-subtype` 等
- **Service**: 内部 (DDBJ 内) と外部 (DDBJ 外への誘導) の disjoint な集合。`INTERNAL_SERVICES` / `EXTERNAL_SERVICES` 定数で表現。外部のうち `eva` だけが独立 step として生成され、残り (`humandbs` / `dbcls` / `jpost` / `dgva`) は内部 service の note (messageKey で `dbclsApplicationRequired` / `jpostRedirect` / `togovarLink` 等) を通じて誘導する

### INSDC 公式との突合

INSDC (NCBI / ENA / DDBJ の 3 機関共通) との関係:

- DRA `Library Strategy` (約 38 種) は INSDC 共通 vocabulary。`vocabulary.ts` は INSDC 公式と一致する値域を持つ
- BS package のうち SARS-CoV-2 系統 (clinical / wastewater) と DDBJ 拡張は DDBJ ローカル
- DRA `File type` の `reference_fasta` は BAM ローダー用に DDBJ が拡張した値

INSDC 公式 vocabulary が更新されたら `vocabulary.ts` の enum を直し、本書は触らない (二重源泉化しない)。

---

## Data model

submit 状態を表現する型は 4 種類。Zod 型定義は `app/schemas/submit/*.ts` を参照する (フィールド列挙はコード本体が SSOT)。

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

- `FileEntry.groupId` は所属する FileGroup の id (必須)。ButtonType 追加時に default で 1 ファイル = 1 group の単純 group が自動生成される
- `FileGroup.memberFileIds` は **縦の関係** (file → group の所属)、`linkedGroupIds` は **横の関係** (group 間の参照、Umbrella 配下の Primary 集合、MAG/SAG chain の段階リンク等)
- `FlowStep.scope` は `{groupIds: string[], entryIds: string[]}`。groupIds か entryIds の少なくとも一方は非空 (`scope-nonempty` 不変量)
- `FlowStep.notes` は `{kind, messageKey}` の配列。`kind` は info / warning / error の 3 値、`messageKey` は i18n リソースキー

### 参照整合の取り扱い

`FileEntry.groupId` の参照不整合 (未知 group を指す) は schema レベルでは throw しない。サービス step 関数は次の方針で吸収する:

- 未知 groupId を持つ FileEntry は `scope.entryIds` に出る (`scope.groupIds` には文字列がそのまま入るが、対応する FileGroup は存在しない)
- 空 FileGroup (`memberFileIds=[]`) は step を生成しない
- `linkedGroupIds` の dangling 参照は無視する

UI 編集途中の整合崩れを許容する緩い参照を採用する。

---

## 3 階層 tagging

「どこに情報を持たせるか」 の責務分担。

| 階層 | 例 | 編集 UI | 種類 |
|---|---|---|---|
| テーブル列 (3 軸 + 補助列) | `buttonType` (read-only Tag), `organism`, `access`, `filename`, データ詳細 chip cell | 列のセル | Cross-DB Tag |
| 行詳細 modal | `dataForm`, `chipTags`, `FileGroup.groupType` | modal 内 FormGroup / FmtRadio / FmtCheck | Cross-DB Tag |
| Step カード pulldown | BS package, DRA Library Strategy, BP Project type | Step カード内 pulldown | Intra-DB Tag |

責務の分け方:

- **テーブル列**: 全 service 共通の最も粗い分類 (`buttonType` / `organism` / `access` + 補助列の `filename` / 「データ詳細」 chip cell)。列を増やすと table が横に広がり、利用者が「何を入れるべきか」 分からない列が増えるため、`dataForm` / `chipTags` / `groupType` は行詳細 modal に降ろす
- **行詳細 modal**: 「サービス step 関数の分岐に効くが、列にすると table が肥大化する」 軸。chip は `{axis, value}` の組で表現するので、軸が増えても UI 形は同じ
- **Step カード pulldown**: 特定 service の Intra-DB Tag。step が決まってから決める

なぜ Intra-DB Tag を行に持たせないか:

- BS package のような Intra-DB Tag は BioSample step が決まらないと「どの package が適用されるか」 が分からない
- 同じ表現 (例: "Pathogen: clinical") が異なる service で違う意味を持つ可能性
- 利用者は「行に対して package を選ぶ」 のではなく「step に対して package を選ぶ」 と認知する

---

## 9 ボタンと grouping

ButtonType ごとに「典型的に付随する `DataForm` / `GroupType`」 がある (`TYPICAL_DATA_FORM_FOR_BUTTON` / `TYPICAL_GROUP_TYPE_FOR_BUTTON` 定数が SSOT)。ボタンを押した直後にこれらが default として selector に入り、利用者は自由に override できる (default 強制はしない)。

GroupType は経路導出の分岐要素として効く。代表例:

- `jga-dataset` の存在は JGA step を強くドライブ (JGA Dataset entity 生成)
- `mag-sag-chain` は DRA + DDBJ Mass の chain 構造を出す
- `hybrid` は DDBJ Mass の hybrid scope note を出す
- `assembly-annotation` は DDBJ Mass + Annotation の連動 step を出す (2 step 同時生成、multi-modal warning から除外)
- `imaging-ms` は MetaboBank 経路 (imaging scope)
- `variation-with-reference` は VCF + reference FASTA を同 step に入れる

各 ButtonType / GroupType の値リストと適用条件の細部は `app/schemas/submit/vocabulary.ts` と `app/features/submit/flow-rules/` を参照。

---

## Flow rules

`Submission` から `FlowStep[]` を導出するロジックは、**サービスごとの純粋関数のコレクション** で実装する。各 step 関数は「自分の service の責務範囲」 だけを判定して `FlowStep[]` を返す (副作用なし、Submission を変更しない)。

### 構造

`deriveFlowSteps(submission)` が `app/features/submit/flow-rules/steps/` 配下の各 step 関数 (`biosampleStep` / `bioprojectStep` / `umbrellaBioprojectStep` / `draStep` / `jgaStep` / `annotationStep` / `variationStep` / `geaStep` / `metabobankStep` / `thirdPartyStep` / `multiModalStep`) を順に呼び、結果を flatten して `byServicePhysicalOrder` で sort する。

`ctx` は `deriveFlowContext(submission)` が 1 度計算する派生情報 (Primary BP の分裂計画など)。各 step が ctx を read-only で受け、再計算しない (冪等性)。各 step 関数の入力条件・出力 service は `app/features/submit/flow-rules/steps/` の関数定義を参照。

### 不変量 (PBT で固定)

任意の `Submission` に対して以下を満たす。 `tests/pbt/submit/flow-rules-invariants.pbt.test.ts` で `numRuns=1000` で検証 (不変量を増減したら本節と test を両方更新):

1. **冪等性**: `deriveFlowSteps(s)` は同じ input に対して同じ output (sort も含む)
2. **空 Submission**: 全 entry / group が空なら steps は空 `[]`
3. **BS 必須**: FileEntry が 1 つでもあれば `biosample` step が ≥ 1
4. **BP 必須**: FileEntry が 1 つでもあれば `bioproject` step が ≥ 1
5. **Umbrella 条件**: `bioproject` step が ≥ 2 ⟺ `umbrella-bioproject` step が 1
6. **JGA / DRA 排他**: 任意の sequence-read FileEntry について、restricted ∧ human なら JGA scope に、それ以外なら DRA scope に入る。同じ entry が両方の scope に入らない
7. **順序**: 出力 steps は `umbrella-bioproject` → `bioproject` → `biosample` → 内部 service → 外部 service の順
8. **id 一意**: 出力 steps の id は全て一意
9. **scope 非空**: 各 step の scope は `groupIds` か `entryIds` の少なくとも一方が非空

各 step の重複なし担保 (例: `draStep` / `jgaStep` が同じ entry を両方に入れない) は不変量 #6 と、ButtonType / GroupType の disjoint 性で機械的に保証する。

---

## Service バッジ色分け

Step カードの header / 外周 border に Service バッジ色を表現する (3 色):

| バッジ色 | 条件 | 意味 |
|---|---|---|
| **emerald** | 内部 service で notes に warning/error なし | 通常の DDBJ 経路 |
| **amber** | 外部 service (`humandbs` / `dbcls` / `jpost` / `eva` / `dgva`) で notes に warning/error なし | DDBJ 以外への誘導 |
| **rose** | 任意の service で notes に warning または error が 1 件でもある | 利用者の追加判断が必要 |

判定ロジックは `app/schemas/submit/service.ts` の `serviceBadgeColor(service, notes)` 純粋関数。`INTERNAL_SERVICES` / `EXTERNAL_SERVICES` は disjoint で `Service` enum 全値はいずれかに必ず属する (PBT `service-badge.pbt.test.ts` で固定)。具体色値は `app/styles/tailwind.css` の `@theme` トークンで管理する。

---

## 画面構成

`/submit` は 2 段構造を、上段「ファイルテーブル」 section + 下段「登録フロー」 section の 2 つの `<Section>` で表現する。

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

`Section` / `SectionHeading` / `PageTitle` / `Modal` / `Callout` などは `app/ui/` の primitive をそのまま使う (`docs/frontend.md` の「UI primitives」)。

id は client mount 後に `crypto.randomUUID` で採番する。SSR レンダリングでは initial state が空のため hydration mismatch が起きない。

---

## ファイルテーブル UX

ファイルテーブルは Cross-DB Tag の **buttonType / organism / access** の 3 軸 + ファイル名 + 「データ詳細」 chip cell の 5 列構成 (+ 削除アクション列)。`dataForm` / `chipTags` / `groupType` は「データ詳細」 chip cell の modal 内で編集する。

`buttonType` は行追加時に固定し変更不可 (誤った種別を選んだ場合は行削除 + 別ボタンで作り直す)。これにより `TYPICAL_DATA_FORM_FOR_BUTTON` / `TYPICAL_GROUP_TYPE_FOR_BUTTON` の default 整合が崩れない。`organism` / `filename` 未設定は `state="warn"` を `Select` / `TextInput` に渡す。

「データ詳細」 chip cell は ButtonType ごとの controlled vocabulary を 1 click で編集する trigger。表示は 2 形態:

- **未設定** (chipTags が空かつ groupType が default): `WarnDashedButton` (warn 配色 + dashed border)
- **設定済み** (chipTags ≥ 1 件、または groupType が default 以外): `RowSetTag` (brand-soft 背景 + check icon + 短文サマリ、 例 `"pair-end · GEA"` / `"third-party"`)

行削除は confirm modal を経由する。 reducer は孤立 entry の `groupId` を新規の単独 group に再割当する (整合維持)。 同 group への 2 件目追加 (pair-end の R1 + R2 等) は `ADD_TO_GROUP` action を発火する。

100 行以上の行を持つテーブルでも、デフォルト DOM レンダリング (`<table>` + n `<tr>`) を維持する。virtualization (`react-window` 等) は導入しない。

---

## Modal UX

各 `ButtonType` 専用の編集 modal を実装する (現状 9 種)。`ModalRouter` が `state.editing` を見て対応 modal を render する。全 modal は同じ shape を持つ:

```
┌ Modal (width 820) ─────────────────────────────────────────────┐
│ ModalHeader (eyebrowTag + filename + title + description)      │
├────────────────────────────────────────────────────────────────┤
│ ModalBody cols={2}                                              │
│ ┌ 左 56% FormGroup × 1-3 ┐ ┌ 右 44% ModalPreview ─────────────┐│
│ │ FmtRadio / FmtCheck    │ │ PreviewCard × n                  ││
│ └────────────────────────┘ └──────────────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│ ModalFooter (status + キャンセル / 保存)                         │
└────────────────────────────────────────────────────────────────┘
```

modal の責務は次の 3 つの編集:

1. `FileGroup.groupType` の選択
2. `FileEntry.dataForm` の override / default 維持
3. `FileEntry.chipTags` の編集 (ButtonType 固有の chip 軸)

`organism` / `access` / `filename` は modal で扱わない (テーブル列で編集する)。 質問本数は ButtonType ごとに 1-3 件で固定 (wizard 化はしない、single page で完結)。

`ModalPreview` は「draft が保存されたら出る FlowStep」 をプレビュー表示する: 仮 patch を当てた `Submission` を組んで `deriveFlowSteps` を呼び、対象 entry を `scope.entryIds` に含む step を抽出して `PreviewCard` で render する。`notes` に warning / error が無いとき `active` 表示、ある時 `opacity-50` で「未確定」 を示す。

保存ボタンは常に enable (default 値で保存可)。 行削除確認は `ModalRouter` が `state.editing.kind === "confirm-delete"` のときに render する小型 modal。

`Modal` primitive の自前 focus trap (`docs/frontend.md` の「UI primitives」) が open 時に dialog 内最初の focusable に focus 移動、close 時に trigger 要素 (= テーブル行の RowSetTag / WarnDashedButton) に focus 復元する。ESC / overlay click で `CLOSE_MODAL`。

---

## 動的 FlowStep カード

下段の「登録フロー」 section は `selectSteps(state)` で `FlowStep[]` を取得し、 `<ol>` で並べる (順序ある手順を SR に伝える)。各カードは次の要素を持つ:

- **StepBadge** (1, 2, 3, … の進捗番号、確定 / pending で配色切替)
- **ServiceBadge** (`Tag kind="source"` で DDBJ / DBCLS の source pill)
- **Card 外周 border** で service バッジ色 (emerald / amber / rose) を表現
- **AccessionPlaceholder** (発行 accession の例、`ACCESSION_PLACEHOLDERS: Record<Service, string[]>` が SSOT、i18n しない)
- **FilesBlock** (`scope.groupIds` を iterate して filename を 1/n 表記で並べる、5 件以上は折り畳み)
- **Notes** (`step.notes` を info / warning / error で出し分け、`messageKey` が i18n リソースキー)
- **ExternalLinkButton** (`EXTERNAL_LINKS: Record<Service, string>` を hardcode、`Button kind="secondary"` の onClick で `window.open(url, "_blank", "noopener,noreferrer")`)

section heading 直下に **TagProgress** (データ詳細 設定済 / 全行) を、validation 違反があれば末尾に **PartialFailureBanner** (`Callout tone="warn" role="alert"`) を出す。

### validation 検査軸

`selectValidations(state)` (純粋関数) が次を検査する:

- `missing-organism`: FileEntry.organism が空
- `missing-filename`: FileEntry.filename が空白文字列
- `inconsistent-group-type`: `FileGroup.groupType` が entry の `buttonType` と互換しない (例 `mage-tab` group に `mass-spec` entry が混入)
- `dangling-group-id`: FileEntry.groupId が submission.fileGroups にない (UI バグ検知、reducer 不変量で起きないはずだが安全網)

各 validation は i18n key + 該当 row index list を含む。click で row scroll into view + 編集 modal を open する。

---

## 状態管理と reducer 不変量

UI 状態は `app/features/submit/state/` の reducer + selectors で管理する (`UIState` / `Action` discriminated union / `selectors` は code が SSOT)。 reducer は immutable update を維持し、id は client mount 後にしか生成しない (SSR mismatch 回避)。 `Submission` schema は loader 境界でのみ厳密 parse し、reducer 内では `organism === ""` 等の一時状態を緩く扱う。

### reducer 不変量 (PBT で固定)

任意の action sequence に対して、reducer は次を満たす。 `tests/pbt/features/submit/reducer-invariants.pbt.test.ts` で `numRuns=1000` で検証:

1. **id 一意性**: `submission.fileEntries` と `submission.fileGroups` の id 集合内で各々 unique
2. **groupId 参照**: 各 `FileEntry.groupId` が `submission.fileGroups` 内に存在する (孤立しない)
3. **memberFileIds 双方向**: `FileEntry.groupId === g.id` ⟺ `g.memberFileIds.includes(entry.id)`
4. **editing 整合**: `editing.kind === "row"` のとき `editing.entryId` は `fileEntries` 内に存在する
5. **buttonType 不変**: `EDIT_ROW_CELL` / `COMMIT_ROW_EDIT` は entry.buttonType を書き換えない

selectors (`selectSteps` / `selectValidations` / `selectRowDetailSummary`) は memoize しない (デフォルトで純粋関数として呼び、React の reconciliation で不要な再計算を抑える)。

---

## i18n リソース

`app/lib/i18n/resources/{ja,en}.ts` の `Resources.submit` 配下に submit 用キーを追加する。 ja / en 両方で完全一致が PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) で担保される。 key 集合は schema 駆動で `flow-rules/steps/` の `FlowStepNote.messageKey` 値と完全一致させる。

---

## 範囲と制約

- submit features は外部 API を呼ばない (navigator のみ、現状 `app/features/submit/api/` は存在しない)
- zones / lint 制約 (生 hex 禁止、`react/forbid-elements` で生 button / input / select / textarea 禁止、arbitrary value 禁止) は `architecture.md` に従う
- 新 primitive 追加は `docs/frontend.md` の「UI primitives」 の手順を経由する
