# 登録ナビゲーション (submit)

DDBJ の登録窓口は service ごとに分かれており、利用者は最初に「自分のデータの DB は何か」を選ばされる構造になっている。submit ナビゲーションは、利用者が手元のデータの性質を答えるだけで、登録経路 (どの登録先に何を出すか) を portal 側で導出して可視化する UI である。

本書は submit の **概念 / 経路導出の考え方 / 画面構造 / 不変量 / 外向き契約** を扱う。値域そのもの (vocab の値リスト / 型のフィールド / i18n リソース key) は `app/schemas/submit/` と `app/features/submit/` のコードが SSOT であり、本書は値を二重に書かない。ルーティングの規約 (種別 → 登録先の対応、条件記述語彙) と外向き契約 (service / accession / 外部 URL) は本書が扱う。

---

## 概念

### 「自分のデータの DB は何か」を訊かない設計

利用者は登録窓口に来た時点では、DDBJ の service 構造 (BioProject / BioSample / DRA / JGA / DDBJ Trad / GEA / MetaboBank / TogoVar …) を必ずしも理解していない。「自分が持っているのは FASTQ で、ヒトの制限公開データ」のような **データ側の言葉** で考えている。

submit ナビゲーションはこの状態を出発点とする:

- 利用者は前段で「登録種別」「生物ドメイン」を答え、続いて「ファイルの種類」「公開区分」のような **データ側の属性** を入力する
- portal が controlled vocabulary と純粋関数で「どの登録先に何を出すか」を導出する
- 利用者は導出結果 (Step カード) を見て、各 Step の Intra-DB Tag (DDBJ Trad の Division、BioSample の生物種・package、DRA Library Strategy 等) を埋めていく

この向きで「service の存在は知らなくて良い」状態を担保する。

### 3 段構造

UI 全体は前段フィルタを足した 3 段構造になる:

```
┌─────────────────────────────────────────────────────────────┐
│  前段: 登録前提 (Q1 登録種別 / Q2 生物ドメイン)              │
│   - 単一選択。後段の選択肢を絞り込むカスケード・フィルタ      │
├─────────────────────────────────────────────────────────────┤
│  中段: ファイルテーブル (Q3 = データファイル種別の行)        │
│   - 各行 = 1 ファイル (FileEntry)                            │
│   - 「ファイル種別を追加」ボタンは Q1/Q2 で enable/disable    │
│   - 行内で access / データ詳細 chip を編集                    │
├─────────────────────────────────────────────────────────────┤
│  下段: Step カード列 (導出結果 = FlowStep)                   │
│   - Step カード = 1 つの登録 step                           │
│   - service バッジ + scope (対象 group/entry)                │
│   - Intra-DB Tag (pulldown) を埋める                         │
└─────────────────────────────────────────────────────────────┘
```

下段は **中段の関数** であり、利用者は下段を直接編集しない。前段は中段の選択肢を絞る。下段に欲しい結果を出すために中段の入力を、中段の選択肢を狭めるために前段を調整する、という編集モデル。

### Cross-DB Tag / Intra-DB Tag

submit の controlled vocabulary は 2 種類の文脈で使われる:

- **Cross-DB Tag**: 全 service に共通する分類軸。`Q1`, `Q2`, `FileTypeKind`, `Access`, `ChipAxis` のように、どの登録先に出すかを決める前段の情報
- **Intra-DB Tag**: 特定の service 内で使う controlled vocabulary。`DDBJ Trad の Division × data type`, `BioSample の生物種・package・サンプル属性 (表現型)`, `DRA Library Strategy` のように、step 単位で出す pulldown 群

Cross-DB Tag は前段フィルタ / テーブル列 / 行内 chip で表現、Intra-DB Tag は Step カード内の pulldown で表現する。生物種のような細かい分類は Cross-DB ではなく Intra-DB Tag (BioSample) で扱う。

### file 詳細質問の選別基準

行の「データ詳細」file 質問 (modal) に持ってよいのは、**その答えで導出される `FlowStep[]` が変わる (flow-changing) 軸だけ** とする。具体的には destination service の集合が変わる・必須 step が増減する (recipe 起動)・scope の束ね方が変わる軸を指す。出る service / step を変えない細部は file 質問にせず、登録先が決まってから Step カード内 Intra-DB Tag (pulldown) で埋める (この panel は未着手)。利用者は「フローが変わる問い」だけをテーブルで答え、各 DB の細部は後で埋める、という負荷分散になる。

判定の物差し (この基準は DDBJ 公式の登録手順が flow 分岐に使っている軸と一致させる。値の根拠は `ddbj.nig.ac.jp` のソース):

| 区分 | 例 | 置き場所 |
|---|---|---|
| flow-changing・**前段**で判定 | Q2 ヒト/非ヒト (variant→TogoVar/EVA, reads→DRA/JGA) / access 公開区分 (JGA 分岐) / Q1 第三者 (TPA→MSS) | 前段 Q1/Q2・access 列 |
| flow-changing・**file ごと**に判定 | `assembly-form` MAG/SAG (DRA 多段 recipe) / `mass-spec-domain=proteomics` (MetaboBank→jPOST) / `spatial-platform` (Sequencing→DRA+GEA / Microarray→GEA / MERFISH 画像→外部 archive) / 配列+アノテのペア (MSS 1 step に束ねる scope) | データ詳細 (file 質問) |
| service / step 不変・DB 内部の細部 | reads の single/paired/10x/多重化 (DRA Library Layout・Instrument・BioSample 粒度) / 発現の MAGE-TAB・アレイ single/two-color (GEA 内の形式・IDF/SDRF) / variant の reference 有無・SNP/SV (TogoVar 内登録種別) / 質量分析の測定方式・MSI イメージング (MetaboBank 内のファイル差) / hybrid アセンブリ (sequencing platform 属性) / MSS data type の WGS/TSA/TLS/EST/HTG/HTC/GSS / BS package / DRA Library Strategy | Step カードの Intra-DB Tag pulldown (未着手) |

file 質問は「flow-changing・file ごと」の軸だけを持つ。該当軸が無い種別 (`sequence-read` / `variant` / `expression-matrix` / `microarray-expression` / `nmr` / `metabolite-assignment`) は **file 質問を持たず、データ詳細セルを出さない** (行先は前段 Q1/Q2 + access 列で確定する)。TPA は Q1 のみの軸とし per-file chip を持たない (1 提出まるごと第三者を前提とする)。

flow を変えない区分を file 質問に出すと「答えさせても経路に反映されない」死んだ質問になり、flow を変える区分を Intra-DB に隠すと「経路が誤って導出される」。両方向の事故を防ぐのがこの基準である。

### 2 層モデル (データ駆動 + 構造エンジン)

経路導出は 2 層に分かれる。この分離が「DDBJ がデータで登録フローを拡充でき、人がそのフローを確認できる」ことを担保する。

```
┌ Tier1: ルーティング・カタログ ── データ (DDBJ が編集)・人が読める ───────────┐
│  種別 × 条件 → 登録先 service + notes。単一 entry / 単一 group で判定が閉じる   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ 薄いインタプリタ (純粋関数) が解釈
┌ Tier2: 構造エンジン ── コード・不変量を PBT で固定・滅多に変わらない ──────────┐
│  BioProject/BioSample 必須導出 (companion)・multi-modal 警告・named recipe     │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
                       FlowStep[] (下段カード)
```

判定の一文基準: **「単一 entry / 単一 group を見れば宛先が決まる」= Tier1 のデータ。「submission 全体の集約・他導出結果・group 間グラフが要る」= Tier2 のエンジン。**

---

## Controlled vocabulary

値域は `app/schemas/submit/vocabulary.ts` と `app/schemas/submit/service.ts` を SSOT とする。本章では各語彙の **意図と使い分け** を述べる。種別 → 登録先の対応は `## 前段カスケード・フィルタ` の規約表で扱う。

- **Q1 (登録種別)**: 「公開データの登録」「制限公開データを含む登録」「第三者の登録データに対する解析データの登録」。前段の単一選択。行レベルの `Access` の default を注入する (制限公開のとき restricted、公開 / 第三者 / 未選択のとき open)。**第三者 (TPA) 分岐の唯一の起点**でもあり、TPA は提出単位 (Q1) で決まる軸として per-file では問わない (配列系の TPA → MSS の振り分けは `q1 = third-party` だけで判定する)
- **Q2 (生物ドメイン)**: 「ヒト」「ヒト以外の真核生物」「原核生物」「ファージ・ウイルス」「環境サンプル (メタゲノム)」。前段の単一選択で、**submission 全体の唯一の生物軸**。種・属レベルの phylogeny は持たない (それは BioSample の Intra-DB Tag で扱う)。`human` (ヒト個人由来) のみが JGA への分岐起点になり、`metagenome` (環境サンプル) は非ヒト扱いで JGA に入れない (`### JGA は「ヒト個人」限定`)
- **FileTypeKind**: データファイルの種別で、**真の一次登録単位だけ**を値域とする (配列リード / FASTA 塩基配列 / 配列アノテーション / バリアント / 発現マトリクス / マイクロアレイ発現 / 空間トランスクリプトーム / 空間画像 / 質量分析 / NMR / 代謝物アサインメント)。テーブルの行を生む単位。附随メタデータ (表現型・サンプル属性) は BioSample の Intra-DB Tag、付随ファイル (processed 画像 / 解析レポート / 可視化オブジェクト) は主データ step の追加ファイル枠で扱い、FileTypeKind には含めない。ベンダー raw データも独立種別を作らず質量分析 / NMR の file_format に含める
- **Access**: `open` / `restricted`。行レベルの軸 (Q1 が default を注入)。`restricted ∧ Q2 = ヒト` の組合せが JGA への分岐起点。非ヒトの制限公開 (細菌ゲノム等) は INSDC が制限公開を持たないため DRA に公開予定日 (embargo) 付きで出す
- **ChipAxis**: テーブル列・前段で表現できない、かつ **出る service / step を変える (flow-changing)** 細部区分を、行内 chip の `{axis, value}` ペアで表現する (任意個)。`assembly-form` (MAG/SAG 派生チェーンの段階・種別) / `mass-spec-domain` (proteomics 振り分け) / `spatial-platform` (GEA Sequencing/Microarray・DRA 2 段の振り分け)。第三者 (TPA) は前段 Q1 のみの軸とし ChipAxis には持たない (`## 設計判断` の TPA 集約)。出る service を変えない区分 (バリアントの SNP/SV、MSS data type の WGS/TSA/TLS 等) は chip にせず Step カードの Intra-DB Tag で扱う (`### file 詳細質問の選別基準`)。`assembly-form` の値域と命名上の留意は `## 設計判断` を参照
- **GroupType**: 複数ファイルが論理的に 1 単位を成す関係 (pair-end / 10x / MAGE-TAB 等)。経路導出の分岐要素として効く。group 駆動の詳細は `### group 駆動と Tier2 recipe` を参照
- **Service**: 登録先・導出物・外部誘導を表す単一の enum。各値は **role** を持つ (`destination` = 利用者のデータが行く登録先 / `companion` = 必ず随伴する導出物 / `external` = DDBJ 外への誘導)。詳細は `## Service と role / 外向き契約`

### INSDC 公式との突合

INSDC (NCBI / ENA / DDBJ の 3 機関共通) との関係:

- DRA `Library Strategy` は INSDC 共通 vocabulary。`vocabulary.ts` は INSDC 公式と一致する値域を持つ
- BS package のうち SARS-CoV-2 系統と DDBJ 拡張は DDBJ ローカル

INSDC 公式 vocabulary が更新されたら `vocabulary.ts` の enum を直し、本書は触らない (二重源泉化しない)。

---

## 前段カスケード・フィルタ

Q1 → Q2 → Q3 (FileTypeKind) の順に選択肢を絞る。各 Q1/Q2/FileTypeKind オプションは **対応する登録エンドポイント集合** を持ち (Q1-3 由来データを SSOT 化したもの)、絞り込みは集合の積で閉じる。以後この集合を `repos` と呼ぶ。

```
allowedRepos = Q1.repos ∩ Q2.repos
Q2 オプション enable  ⟺  Q2opt.repos ∩ Q1.repos ≠ ∅
Q3 種別 enable        ⟺  KindRoute.candidateRepos ∩ allowedRepos ≠ ∅
```

カスケードは **rules を実行せず repos フィールドを読むだけ** で判定する純関数であり、経路導出 (rules 実行) と同じカタログの別の読み方になる (二重管理が起きない)。

### デッドエンドが構造的に 0 になる規約

Q1 が Q2 を、(Q1 ∩ Q2) が Q3 を順に disable するため、`allowedRepos = ∅` の組合せは選択不能になる。例: `Q1 = 制限公開` (repos = {JGA}) のとき、JGA を持たない Q2 (ヒト以外の真核 / 原核 / ファージ・ウイルス / 環境サンプル) は disable され、残る Q2 (ヒト) のみが JGA を含む。これを PBT で固定する (`## 経路導出と不変量` の `cascade-no-deadend`)。

Q1/Q2 と行レベル `Access` は併存する。前段は選択肢を絞り default を注入するのみで、行確定後は `Access` / `ChipAxis` が経路導出を駆動する (生物 = ヒトかは Q2、公開区分は行ごとに判定)。

---

## Tier1 ルーティング・カタログ

`Submission` から「種別ごとの登録先」を決めるルールを、**service 非依存の宣言データ** として持つ。DDBJ はこのデータを編集してフローを拡充でき、値は controlled vocabulary なので起動時 Zod 検証で typo が落ちる。

### 構造

カタログは FileTypeKind ごとの `KindRoute` の集合。各 `KindRoute` は次を持つ (フィールドの意味。型は `app/schemas/submit/` が SSOT):

| フィールド | 意味 |
|---|---|
| `id` | FileTypeKind |
| `candidateRepos` | この種別が emit しうる全**登録エンドポイント**の上位集合。Q3 enable 判定とカスケード、parity 検証に使う |
| `rules` | 上から **first-match** で評価されるルール列。各ルールは `{ when, emit }` |

**登録エンドポイント** = 利用者のデータの最終格納先になる service。DDBJ 内 (role = destination) に加え、データの最終格納先が DDBJ 外になる external service (`jpost` = proteomics、`eva` = 非ヒト variant) も含む。一方 `humandbs` / `dbcls` は「Policy 申請・公開の誘導」であってデータの格納先ではないため登録エンドポイントに含めず、recipe が補助 step として出す (`## Service と role / 外向き契約`)。

`rule.emit` は `{ service, scope, notes }`:

| フィールド | 意味 |
|---|---|
| `service` | 登録エンドポイント (role = destination、または最終格納先が DDBJ 外の external = `jpost` / `eva`) |
| `scope` | `entry` (その entry だけ) / `group` (所属 group の全 member entry + group) |
| `notes` | `{ kind, messageKey }` の配列。`kind` は info / warning / error、`messageKey` は i18n リソースキー。各 note は optional な `whenAny` (原子述語 1 階) を持ち、scope 内に該当 entry があるときだけ出る |

例 (`variant` 種別。制限公開ヒトは JGA、公開ヒトは TogoVar、非ヒトは EVA。ヒト/非ヒトと制限公開で登録先が割れる):

```jsonc
{ "id": "variant", "candidateRepos": ["togovar", "eva", "jga"], "rules": [
  { "when": { "and": [ {"access":"restricted"}, {"q2":"human"} ] },
    "emit": { "service": "jga", "scope": "entry" } },
  { "when": { "q2": "human" },
    "emit": { "service": "togovar", "scope": "entry", "notes": [
      { "kind": "info", "messageKey": "submit.variant.togovar.intro" } ] } },
  { "when": { "always": true },
    "emit": { "service": "eva", "scope": "entry", "notes": [
      { "kind": "info", "messageKey": "submit.variant.eva.nonHuman" } ] } } ] }
```

短いバリアント (≤ 50 bp) と構造バリアント (> 50 bp) は **同じ service 内の登録種別差** (TogoVar の SNP/SV、EVA の short/SV) であって出る service を変えない。したがってこの区別はデータ詳細 chip にせず、Step カードの Intra-DB Tag (登録種別 pulldown) で扱う。`variant` 種別で **flow を割るのは Q2 (ヒト/非ヒト) と access** だけである。`eva` が非ヒトの正規の登録先で、非ヒトを TogoVar に流して警告で済ませない (TogoVar はヒト専用)。

### first-match が排他を保証する

`rules` は first-match のため、1 entry は同一種別内で高々 1 つのルールにマッチする。これにより「同じ entry が排他 service (JGA / DRA, JGA / TogoVar) の両方の scope に出ない」が機械的に成立する。否定 (NOT) は条件を先に置き末尾を `{always}` fallback にして順序で表す。

### 条件記述語彙

`when` が参照できる原子述語と結合子。**単一 FileEntry / 単一 FileGroup / 前段で評価でき、submission 集約は参照できない** (それは Tier2)。

| 種別 | 例 | 参照 |
|---|---|---|
| 原子 | `fileTypeKind` / `fileTypeKindIn` / `access` / `dataForm` / `groupType` / `groupTypeIn` / `anyChip {axis, value?}` / `q1` / `q1In` / `q2` / `q2In` | entry / 所属 group / 前段 |
| 結合子 | `and` / `or` / `not` / `always` | — |

境界 (意図的に不可能):

- submission 集約 (種別組合せ、件数閾値) は参照不可 → Tier2
- group メンバ間グラフ (`linkedGroupIds` の連結) は参照不可 → Tier2 recipe
- 算術・正規表現・文字列マッチ不可。値は controlled vocabulary の等値のみ
- `emit` の動的計算不可 (service / scope は固定、note のみ `whenAny` で 1 階)
- `when` のネスト深さ上限 3

カタログで表現できない 1 回限りの例外は、DSL に逃さず Tier2 に named step を足す (escape の最終形 = コード)。

---

## Tier2 構造エンジン

薄いインタプリタが各 entry にその種別の `rules` を first-match 評価して service+scope+notes を確定し、同一 service の scope を union して 1 枚にまとめた後、次の構造導出を足す。これらは submission 全体の集約や group 間グラフを要するため Tier1 では表現できない。

| 導出 | 配置理由 |
|---|---|
| BioProject 生成 (companion、entry ≥ 1 で 1 つ) | submission 全体への随伴 |
| BioSample 生成 (companion、entry ≥ 1 で 1 つ) | submission 全体への随伴。実サンプル数・生物種・package は Intra-DB Tag |
| multi-modal 警告 (1 group に複数種別が混在) | group 全 member の集約。意図的に多種別を束ねる group (`assembly-annotation` / `mag-sag-chain` / `jga-dataset`) は除外する |
| no-destination 警告 (どの destination service にも入らない entry) | 全 entry 評価後の集約 |
| named recipe (`jga-submission` / `mag-project` / `sag` / `spatial`) | group 間グラフ探索・複数 service 横断 (`spatial` は 1 entry → DRA + GEA の cross-archive 2 段で Tier1 の単一 emit に収まらない) |
| 順序 / id 一意 / 同 service scope union | 出力整形 |

`named recipe` の集合は allowlist として固定し、勝手に増えないことを PBT で担保する (Tier1 骨抜き防止)。BioProject / BioSample は通常 1 つずつの companion だが、`mag-project` のような recipe が必要に応じて複数の BioSample (例: メタゲノムサンプルから `derived_from` で派生する Binned / MAG サンプル) を生成する。

### group 駆動と Tier2 recipe

GroupType による分岐のうち、単一 group で完結するものは Tier1 (`emit.scope=group` または `groupType` 述語) で、group 間グラフを要するものは Tier2 named recipe で扱う。配置と意味は DDBJ 公式の登録手順に基づく。

| GroupType | 公式の実体 | 配置 |
|---|---|---|
| `mage-tab` / `two-color` | MAGE-TAB マトリクス → GEA | Tier1 (`groupType` 述語) |
| `imaging-ms` | imaging mass spec → MetaboBank | Tier1 (`groupType` 述語) |
| `jga-dataset` | JGA Dataset は Data/Analysis を **Policy 単位で束ねる中間層**。1 提出に複数 Dataset、各 Dataset は member の部分集合 + Policy 参照必須。JGA は Run を持たず Data が直接ファイルを保持する | Tier2 recipe `jga-submission` |
| `mag-sag-chain` (MAG) | MAG は 4 段: 生リード→DRA Run / プライマリ・Binned→DRA Analysis / MAG→DDBJ Trad の ENV ゲノムエントリ。全段が **共通 BioProject (type=Metagenome)** を参照し、Binned/MAG の BioSample は **生リードのメタゲノムサンプルから `derived_from`** で派生する (放射状)。MAG ↔ SAG は別パッケージ (MIMAG / MISAG) で束ねない | Tier2 recipe `mag-project` |
| SAG | 一細胞単離・全ゲノム増幅由来。MAG とは別経路 (MISAG)。複数細胞時は結合 SAG が個別 SAG を `derived_from` で束ねる | Tier2 recipe `sag` |
| `assembly-annotation` | 配列 + アノテーションは **1 提出の 1 ファイルペア** (拡張子を除くファイル名が同一)。DDBJ Trad (MSS) の単一 step で配列 + feature table を提出する。multi-modal 警告の対象から除外する | Tier1 (DDBJ Trad の単一 step) |

`linkedGroupIds` は Tier2 recipe が複数 group を横断して結ぶグラフ辺として使う (例: `mag-project` の共通 BioProject 参照リンク、BioSample `derived_from` の放射状ツリー、DRA Run ↔ Analysis のペア)。

---

## Tier2 recipe 詳細

named recipe (`jga-submission` / `mag-project` / `sag`、allowlist 固定) は、薄インタプリタが確定した service+scope と `emit.scope=group` の group フラグを受け、その上に group 間グラフ探索・複数 destination 横断・複数 companion 生成を足す。各 recipe は §経路導出と不変量 の既定 companion (entry ≥ 1 で BioProject 1 + BioSample 1) を上書き / 拡張する。

### jga-submission

制限公開ヒト個人データ・ヒト関連メタゲノムを、Policy 単位の Dataset に束ねる。JGA は SRA 系を拡張した独自エンティティを持ち、BioProject / BioSample を使わない。

トリガー: `service = jga` の entry が 1 件以上、または `jga-dataset` group が存在。

エンティティ (accession prefix。子 → 親の単方向参照):

```
Study(JGAS) ─┬─ Experiment(JGAX) ── Data(JGAR, FILE 1..N)   NGS リード経路
  (root)     │      ▲ Sample(JGAN, TAXON_ID 必須)
             └─ Analysis(JGAZ, VCF / アレイ / 集計)          非 NGS 経路
                    │
        Dataset(JGAD) = Data/Analysis の部分集合 + Policy 必須参照 (1)
                    │
        Policy(JGAP) = DAC (prefix なし) を必須参照
```

emit する FlowStep (Dataset を Policy ごとに N 枚):

| step | service (role) | scope | 主な note |
|---|---|---|---|
| `jga` (Policy ごと N 枚) | jga (destination) | その Policy 配下の Data/Analysis entry + `jga-dataset` group | NGS は Data・他は Analysis に振る |
| Policy 申請 | humandbs (external) | 該当 Dataset | DBCLS で Policy 承認 (JGAP) を取得しないと登録不可 |
| NBDC ポリシー (任意) | dbcls (external) | 全 JGA scope | NBDC 標準ポリシー利用可 / 独自は DBCLS 登録で JGAP 発行 |

linkedGroupIds: `jga-dataset` group が配下の一次データ group 群 + Policy group を指す。各 Dataset の Policy 参照はちょうど 1 つ。companion: JGA は BioProject / BioSample を使わないため既定 companion を**抑制**する。

不変量 (PBT 候補): 各 Dataset は Policy を 1 つ必須参照 / ポリシーが異なるデータは別 Dataset (scope 非重複) / 既定 BioProject・BioSample を emit しない。

### mag-project

メタゲノムアセンブリ (MAG) の 4 段を、共通 BioProject・Run ↔ Analysis ペア・BioSample `derived_from` 放射状で構築する。

トリガー: `mag-sag-chain` group に `assembly-form = mag` の member。

```
              BioProject (companion, 単一, type=Metagenome)  ← 全段が共通参照
   (1)生リード    (2)プライマリ    (3)Binned      (4)MAG
    DRA Run       DRA Analysis    DRA Analysis   DDBJ Trad(ENV genome)
    BioSample A ──(共有)             ▲derived_from   ▲derived_from
    (メタゲノム) ─────────────────────┴───────────────┘  (B Binned / C MAG は A から派生=放射状)
```

emit する FlowStep:

| step | service (role) | scope | 主な note |
|---|---|---|---|
| 共通 BioProject | bioproject (companion) | 全 4 段 | type = Metagenome |
| メタゲノム / Binned / MAG サンプル ×3 | biosample (companion) | 各段 | MIMS.me / MIMAG・derived_from = メタゲノムサンプル |
| 生リード | dra (destination) | (1) | DRA Run、生データ登録が前提 |
| プライマリ / Binned アセンブリ | dra (destination) | (2)(3) | Analysis = De Novo Assembly、(1) の Run とセット |
| MAG ゲノムエントリ | ddbj-trad (destination) | (4) | ENV division・MSS 窓口 |

linkedGroupIds: Run ↔ Analysis セット ((1)↔(2), (1)↔(3)) / 全段 ↔ 共通 BioProject / derived_from 放射状 ((1) サンプル ↔ Binned, ↔ MAG)。直列ではない。companion: 既定 BioSample 1 を A/B/C の 3 つに拡張し BioProject は単一に保つ。段間の accession 依存 (Analysis が Run を、MAG が DRA 登録を前提) は note で案内する。

不変量 (PBT 候補): BioProject は単一で全段を含む / Binned・MAG の derived_from はともにメタゲノムサンプルを親に取り両者間に派生辺を張らない / (1)(2)(3) → dra・(4) → ddbj-trad の排他。

### sag

単一増幅ゲノム (SAG) を MISAG package で登録。MAG とは別 recipe。

トリガー: `mag-sag-chain` group に `assembly-form = sag` の member (chip 値で mag-project と分岐)。

emit する FlowStep:

| step | service (role) | scope | 主な note |
|---|---|---|---|
| プロジェクト束ね | bioproject (companion) | group 全体 | 同一 BioProject |
| 一細胞 SAG サンプル | biosample (companion) | group 全体 | MISAG / metagenome・uncultured 生物名不可、実生物種名 |
| 結合 SAG サンプル (複数細胞時) | biosample (companion) | group 全体 | 個別 SAG を derived_from で束ねる |
| 生リード (任意) | dra (destination) | 生リード member | DRA Run (SAG では任意) |
| SAG 配列エントリ | ddbj-trad (destination) | SAG 配列 member | MSS data type = SAG・`/note="single amplified genome"`・`/isolation_source` 必須 |

linkedGroupIds: 結合 SAG group が個別 SAG group 群を指す**収束**方向 (MAG の放射状と逆向き)。

MAG との差分: package (MIMAG ↔ MISAG) / 生物名 (metagenome 由来 ↔ 実生物種名) / 段構造 (4 段 ↔ DRA 任意 + MSS) / derived_from の向き (放射状 ↔ 収束)。

不変量 (PBT 候補): 同一 group は assembly-form 値で sag / mag-project の一方にのみディスパッチ / biosample package は MISAG / 結合 SAG step は個別 SAG group が 1 つ以上あるときのみ emit。

### spatial

発現・空間 Tx の platform が決める GEA Submission Type に応じて、生リード → DRA と processed → GEA の 2 段を構築する。**1 entry が複数 destination に出る**点が他 recipe と違い (group 間グラフではなく cross-archive 依存: raw が GEA より先に DRA に要る)、Tier1 の単一 emit に収まらないため Tier2 に置く。

トリガー: `spatial-transcriptomics` / `spatial-image` の entry で `spatial-platform` chip を持つもの。

platform → Submission Type 分類 (`_gea/spatial-gene-expression.md`):

| 分類 | platform | emit |
|---|---|---|
| Sequencing | visium / stereo-seq (暫定) / geomx (暫定) | DRA Run (生リード) + GEA (processed) の 2 step |
| Microarray | xenium / merfish | GEA のみ (DRA 無し) |

emit する FlowStep:

| step | service (role) | scope | 主な note |
|---|---|---|---|
| 生リード (Sequencing のみ) | dra (destination) | その entry | fastq/bam を DRA に事前登録、GEA から参照 |
| processed | gea (destination) | その entry | GEX matrix・画像等を GEA に登録 |
| 外部 archive 誘導 (spatial-image の merfish) | gea step の warning note | — | 大容量画像・.vzg は GEA 受付不可、外部 Generalist archive を案内 |

companion: 既定どおり BioProject 1 + BioSample 1。MERFISH 画像の Generalist archive は DDBJ service ではないため独立 step にせず GEA step の誘導 note で表す (`## 設計判断`)。

不変量 (PBT 候補): Sequencing platform の entry は dra step と gea step の両方に入る / Microarray platform の entry は gea step のみで dra step に入らない / どの platform でも entry は最低 1 つの destination service step に入る (no-orphan-destination 維持)。

### recipe 共通の不変量

§経路導出と不変量 の新設不変量に足す、3 recipe 横断の性質:

- **recipe-companion-override**: `jga-submission` は BioProject/BioSample をともに抑制、`mag-project`/`sag` は BioProject を単一に保ち BioSample のみ複数に拡張する (BP 分裂禁止)
- **recipe-no-orphan-destination**: recipe 適用後も全 entry が destination service step に入る (`no-orphan-destination` を recipe 出力でも維持)
- **recipe-service-exclusive**: 同一 entry が排他 service の両方の scope に入らない
- **recipe-dangling-linked-ignored**: `linkedGroupIds` の dangling 参照を無視し throw しない

---

## Data model

submit 状態を表現する型は `app/schemas/submit/*.ts` を参照する (フィールド列挙はコード本体が SSOT)。

```
Submission
  ├─ preconditions { q1, q2 }          前段カスケードの選択 (q2 が生物軸)
  ├─ fileEntries: FileEntry[]
  │    └─ FileEntry { id, fileTypeKind, access, dataForm, groupId, chipTags[] }
  ├─ fileGroups: FileGroup[]
  │    └─ FileGroup { id, groupType, memberFileIds[], linkedGroupIds[] }
  └─ notes: string

(導出)
FlowStep { id, service, scope { groupIds[], entryIds[] }, notes[] }
```

- `FileEntry.groupId` は所属する FileGroup の id (必須)。種別追加時に default で 1 ファイル = 1 group の単純 group が自動生成される
- `FileGroup.memberFileIds` は **縦の関係** (file → group の所属)、`linkedGroupIds` は **横の関係** (group 間の参照、Tier2 recipe が探索)
- `FlowStep.scope` は groupIds か entryIds の少なくとも一方が非空 (`scope-nonempty` 不変量)

### 参照整合の取り扱い

`FileEntry.groupId` の参照不整合は schema レベルでは throw しない。インタプリタは未知 groupId を持つ FileEntry を `scope.entryIds` に出し、空 FileGroup は step を生成せず、`linkedGroupIds` の dangling 参照は無視する。UI 編集途中の整合崩れを許容する緩い参照を採用する。

---

## 経路導出と不変量

`deriveFlowSteps(submission)` は薄インタプリタ (Tier1 評価) と Tier2 構造エンジンを合成し、`byServicePhysicalOrder` で sort して `FlowStep[]` を返す (副作用なし、Submission を変更しない)。各構造導出が ctx を read-only で受け再計算しない (冪等性)。

### 不変量 (PBT で固定)

不変量を 3 区分で持つ。`tests/pbt/` で `numRuns=1000` で検証 (不変量を増減したら本節と test を両方更新):

**データ検証** (カタログが整合している。起動時 Zod + parity test):

| 不変量 | 内容 |
|---|---|
| catalog-vocab-closure | 全 `when` の値が controlled vocabulary のメンバー、`emit.service` が登録エンドポイント (role=destination ∪ `{jpost, eva}`) に存在 |
| candidateRepos-parity | `KindRoute.candidateRepos` ⊇ rules の全 `emit.service`、かつ前段データの種別 repos と一致 |
| messageKey-existence | 全 note の messageKey が i18n (ja/en) に存在 |
| every-kind-has-fallback | 全 KindRoute が `{always}` rule または named recipe を持つ (孤児ゼロの構造保証) |
| recipe-allowlist | named recipe の集合が固定 allowlist 内 |

**エンジン不変量** (Tier2 が後段で必ず保証):

1. **冪等性**: 同じ input に対して同じ output (sort も含む)
2. **空 Submission**: 全 entry / group が空なら steps は空
3. **BP / BS companion**: FileEntry が 1 つでもあれば bioproject step 1 と biosample step 1 が出る (recipe が上書きする場合を除く)
4. **JGA / DRA 排他**: 任意の配列リード FileEntry について、`access = restricted ∧ Q2 = ヒト` なら JGA scope に、それ以外 (非ヒトや公開) なら DRA scope に入る。同じ entry が両方に入らない (first-match で強化)。非ヒトの制限公開は DRA に embargo note を付ける
5. **順序**: bioproject → biosample → destination service → external service
6. **id 一意 / scope 非空 / scope ⊆ submission entries**

**新設不変量** (再設計で守るべき性質):

| 不変量 | 防ぐ事故 |
|---|---|
| no-orphan-destination | entry ≥ 1 の任意 submission で、各 entry が bioproject/biosample 以外に最低 1 つの destination service step に入る |
| cascade-no-deadend | 任意 (q1, q2) で Q3 enable された種別の entry を入れると destination service が 1 枚以上出る (allowedRepos = ∅ が選べない) |
| group-scope-completeness | `emit.scope=group` の step は flagged group の groupIds と全 member entryIds の両方を含む |
| spatial-dra-2step | Sequencing 系 platform の spatial entry は dra と gea の両 step に入り、Microarray 系 platform の entry は gea のみで dra に入らない |

---

## Service と role / 外向き契約

Service は単一の enum で、各値が **role** を持つ。利用者向けの登録先 (destination)、必ず随伴する導出物 (companion)、DDBJ 外への誘導 (external) を role で区別する。accession 例と外部 URL は各 service の `app/content/services/*.content.tsx` が SSOT (本書は role と役割のみ)。

| service id | role | 役割 |
|---|---|---|
| `dra` | destination | リード / Run・Analysis。INSDC は制限公開を持たず、非ヒト制限公開は公開予定日 (embargo) で扱う |
| `jga` | destination | 制限公開**ヒト個人**データ (Dataset 単位アクセス制御)。Policy 承認は DBCLS/NBDC に委譲。メタゲノム / 環境は対象外 (`### JGA は「ヒト個人」限定`) |
| `gea` | destination | 遺伝子発現 (発現マトリクス / マイクロアレイ / 空間)。NGS 由来は raw を DRA に出す 2 段 (`### 発現・空間の DRA 2 段`) |
| `metabobank` | destination | メタボロミクス (質量分析 / NMR / 代謝物・MSI イメージング)。第三者再解析も受け入れ。proteomics は対象外 (`jpost` へ) |
| `togovar` | destination | ヒト variant (TogoVar-repository)。短いバリアント (≤ 50 bp) と構造バリアント (> 50 bp) の 2 登録種別を持つが、いずれも同 service (種別差は Intra-DB Tag)。非ヒトは受け付けない (→ `eva`) |
| `ddbj-trad` | destination | 塩基配列の一括登録のうち **MSS** (Mass Submission System) 経路。大規模・完成ゲノム・NSSS 非対応種別 (WGS / TSA / TLS / EST / HTG / HTC / GSS / TPA) を扱う。Division × data type の 2 軸で分類 |
| `nsss` | destination | 塩基配列の Web 登録 (Nucleotide Sequence Submission System)。MSS と同じ登録先 DB への並行窓口で、**小規模・非完成・NSSS 対応種別**を担う。MSS / NSSS の振り分け基準は `### MSS / NSSS の振り分け` |
| `bioproject` | companion | プロジェクトの束ね。entry があれば必ず随伴 |
| `biosample` | companion | サンプルの束ね。実サンプル数・生物種は Intra-DB Tag |
| `eva` | external | 非ヒト variant の登録先 (EBI European Variation Archive)。短いバリアントも構造バリアント (旧 DGVa 相当) も EVA が受ける。dbSNP / dbVar は非ヒトの受付を終了 |
| `jpost` | external | proteomics (プロテオーム質量分析) の登録先 (jPOSTrepo、ProteomeXchange メンバー、DDBJ 外) |
| `humandbs` / `dbcls` | external | 制限公開ヒトの Policy 申請・公開 (NBDC / DBCLS / HumanDBs) への誘導 |

`candidateRepos` (カスケードと KindRoute が参照する登録エンドポイント集合) は **登録エンドポイント (role = destination ∪ `{jpost, eva}`) の部分集合** である。role は `service.ts` が SSOT で、PBT で全 service がいずれかの role に属することを固定する。

MERFISH 等の大容量空間画像が向かう外部 Generalist archive (Zenodo / figshare 等) は DDBJ service ではないため enum に持たず、`spatial` recipe が GEA step の誘導 note として表す (step 化しない)。

### MSS / NSSS の振り分け

塩基配列のアノテーション付き登録には DDBJ 公式に 2 つの並行窓口があり、登録先 DB は同一だが投入方式が違う。submit ナビは両方を別 destination service (`ddbj-trad` = MSS / `nsss` = NSSS) として持ち、種別と規模で振り分ける。基準は DDBJ 公式の登録手順 (`_ddbj/web-submission.md` ≡ `_ddbj/mss.md` ≡ `_ddbj/submission.md`、3 箇所一致) に従う。

| 窓口 | service | 担当範囲 | 投入方式 |
|---|---|---|---|
| NSSS (Web 版) | `nsss` | 小規模・非完成・NSSS 対応種別。公式が第一に勧める初心者向け窓口 | Web ウィザードで逐次入力 |
| MSS | `ddbj-trad` | 大規模・完成ゲノム・NSSS 非対応種別 | 登録ファイルを自作してファイル送付 |

NSSS が**対応できず MSS に回す**条件 (いずれか 1 つでも該当):

- **種別**: EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA (これらは NSSS 非対応)
- **規模**: 1 配列 ≥ 500 kb / 総配列数 > 100 / 1 配列あたり Feature ≥ 30
- **完成度・連携**: 完全長ゲノム・染色体・オルガネラ/ウイルスゲノム・プラスミド全長、または BioProject/BioSample を DBLINK に記載するもの (メタゲノム・全長ゲノム同一菌株由来など)

db-portal は実ファイルを読まない navigator なので、配列長・配列数・Feature 数の厳密判定はできない。種別 (上記の NSSS 非対応リスト) と「完成ゲノムか否か」で振り分け、規模に依存する境界は Step カードの note で「小規模・非完成なら NSSS Web 登録、それ以外は MSS」と案内する。MSS / NSSS の選択を確定する規模軸 (`### file 詳細質問の選別基準` の flow-changing 軸) を導入するかは `## 設計判断` で扱う。

### JGA は「ヒト個人」限定

JGA は **ヒト個人由来の制限公開データ** (個人特定可能な遺伝学的・表現型情報) 専用で、DBCLS で承認された利用制限ポリシーを前提とする (`_jga/submission.md` / `_jga/index.md`)。メタゲノム・マイクロバイオーム・環境サンプルは公式上 JGA の対象ではなく、生リードは DRA、MAG は ENV division (`ddbj-trad`) に行く (`_ddbj/metagenome-assembly.md` に JGA への言及なし)。

したがって JGA 分岐条件は **`access = restricted ∧ Q2 = human`** とする。`Q2 = metagenome` (環境サンプル) は制限公開でも JGA に入れず、DRA に embargo (公開予定日) を設定して非公開期間を扱う。INSDC は制限公開そのものを持たないため、非ヒトの「制限公開」は embargo が唯一の非公開手段になる (`_insdc/data-release-policy.md`)。

### 発現・空間の DRA 2 段

GEA の Submission Type が **Sequencing** のとき (NGS 由来の発現・空間 Tx)、生リード (fastq/bam) を先に DRA に登録し、processed データを GEA に出す **2 段**になる (`_gea/submit-sequence.md` は DRA タブ必須、`_gea/datafile.md` は「生データは DRA に事前登録」)。Submission Type が **Microarray** のときは生データも GEA に直接登録し DRA を経由しない (`_gea/submit-array.md` に DRA タブ無し)。

空間 Tx は platform で Submission Type と DRA 2 段の要否が割れる (`_gea/spatial-gene-expression.md`)。これは **出る service の集合が変わる flow-changing 軸**なので、`spatial-platform` を note 止まりにせず Tier2 `spatial` recipe で実際に DRA step を emit する (`### spatial`)。

| platform | GEA Submission Type | DRA 2 段 | 備考 |
|---|---|---|---|
| Visium | Sequencing | 要 (DRA + GEA) | fastq/bam を DRA、GEX matrix 等を GEA |
| Xenium | Microarray (A-GEAD-246) | 不要 (GEA のみ) | raw も processed も GEA |
| MERFISH / MERSCOPE | Microarray (A-GEAD-247) | 不要 (GEA のみ) | 大容量画像・.vzg は GEA 受入不可。spatial-image は外部 Generalist archive 誘導 note を付ける (`### spatial`) |
| Stereo-seq / Slide-seq / GeoMx | (DDBJ 未文書) | (暫定) | 公式に登録経路の記載なし。暫定で Sequencing 扱い (DRA+GEA) とし、根拠は `## 設計判断` に残す |

### Step カードのバッジ色 (3 色)

| バッジ色 | 条件 |
|---|---|
| **emerald** | role = destination/companion の service で notes に warning/error なし |
| **amber** | role = external の service で notes に warning/error なし |
| **rose** | 任意の service で notes に warning または error が 1 件でもある |

判定は `serviceBadgeColor` 純関数 (`service.ts`)。具体色値は `app/styles/tailwind.css` の `@theme` トークン。

---

## 画面構成

`/submit` は 3 段構造を 3 つの `<Section>` で表現する。

```
┌─ Header (active="submit") ───────────────────────────────────────┐
├─ PageTitle "登録ナビゲーション" + subtitle ────────────────────────┤
│
├─ Section  登録前提 ───────────────────────────────────────────────┤
│   ┌ Q1 登録種別 (SegmentedControl, role=radiogroup) ──────────────┐│
│   └ Q2 生物ドメイン (SegmentedControl、Q1 で選択肢 disable) ───────┘│
│
├─ Section  ファイルテーブル ───────────────────────────────────────┤
│   ┌ FileTypeGrid (Q1/Q2 で各種別ボタンを aria-disabled + 理由 tip) ┐│
│   └ FileTable (or empty placeholder) ───────────────────────────┘│
│
├─ Section  登録フロー ─────────────────────────────────────────────┤
│   ┌ SectionHeading "登録フロー" count={steps.length} ───────────┐│
│   ├ TagProgress (設定済 / 全行) ────────────────────────────────┤│
│   ├ FlowStepCards (FlowStep[] → 並んだ card) ────────────────────┤│
│   └ PartialFailureBanner (validation 違反時のみ) ───────────────┘│
│
├─ EditRowModal (overlay、editing 行のとき 1 つだけ open) ───────────┤
```

`Section` / `SegmentedControl` / `Modal` 等は `app/ui/` の primitive を使う (`docs/frontend.md` の「UI primitives」)。id は client mount 後に `crypto.randomUUID` で採番する (SSR hydration mismatch を避ける)。

前段で Q1/Q2 を変更して既存行の種別が disable になった場合、行は削除せず、`selectValidations` が `precondition-conflict` を出して該当行へ誘導する (整合崩れを破壊的に解決しない)。

### フロー・エクスプローラ (人がフローを確認する surface)

`/_design/submit-flow-explorer` route を置く (production build から除外)。任意の入力 (FileEntry / FileGroup + 前段 Q1/Q2) を組むと、出る `FlowStep[]` を全件プレビューする。各 step に **由来バッジ** (「Tier1 ルール由来」「Tier2 集約由来」「named recipe 由来」) を出す。加えて **マトリクスモード** で Q1 × Q2 × 種別の組合せを一覧し、`no-destination` / `Q3 disable` を可視化する。DDBJ はカタログを編集 → エクスプローラで結果を目視 → PBT が CI で網羅・不変量を検証、という流れでフローを確認・拡充する。

---

## ファイルテーブル UX

ファイルテーブルは Cross-DB Tag の **fileTypeKind / access** の 2 軸 + ファイル名 (読み取り専用) + 「データ詳細」 chip cell の 4 列構成 (+ 削除アクション列)。`dataForm` / `chipTags` / `groupType` は「データ詳細」 chip cell の modal 内で編集する。

`fileTypeKind` は行追加時に固定し変更不可 (誤った種別は行削除 + 別ボタンで作り直す)。`access` は Q1 が default を注入する (Q1 = 公開 なら open 固定)。`filename` はユーザーが設定せず、行追加時に同種別の既存連番を読んで `{prefix}-{連番 (3 桁ゼロ埋め)}.{ext}` を自動採番し読み取り専用で表示する (連番は削除後の再追加でも衝突しないよう max+1 方式)。

「データ詳細」 chip cell は種別ごとの controlled vocabulary を 1 click で編集する trigger。表示は 3 形態:

- **flow 質問なし種別**: trigger を出さない (空セル)。`sequence-read` / `variant` / `expression-matrix` / `microarray-expression` / `nmr` / `metabolite-assignment` は flow-changing 軸を持たないため、データ詳細で問うことがない (`### file 詳細質問の選別基準`)
- **未設定**: `WarnDashedButton` (warn 配色 + dashed border)
- **設定済み**: `RowSetTag` (brand-soft 背景 + check icon + 短文サマリ)

行削除は confirm modal を経由する。reducer は対象 entry を `memberFileIds` から除外し、空になった group は drop するが、残った同 group の sibling entry の `groupId` は触らない。同 group への 2 件目追加は `ADD_TO_GROUP` action を発火する。

100 行以上でもデフォルト DOM レンダリングを維持する。virtualization は導入しない。

### Modal UX

編集 modal は **1 つの `EditRowModal`** が `ROW_FORM_DEFS: Record<FileTypeKind, RowFormDef>` から該当種別の form definition を引いて描画する。種別を増やすときは form definition に 1 エントリ追加すれば modal 側に分岐コードを書かずに済む。modal の責務は `FileGroup.groupType` の選択 / `FileEntry.dataForm` の override / `FileEntry.chipTags` の編集で、いずれも **flow-changing 軸に限る**。form definition が空 (質問なし) の種別はデータ詳細 trigger を出さず modal も開かない。`access` はテーブル列で編集し、`filename` は自動採番の読み取り専用。どちらも modal では扱わない。

`ModalPreview` は仮 patch を当てた `Submission` で `deriveFlowSteps` を呼び、対象 entry を含む step を `PreviewCard` で render する。`Modal` primitive の focus trap が open/close 時の focus を制御する。

---

## validation 検査軸

`selectValidations(state)` (純粋関数) が次を検査する。各 validation は i18n key + 該当 row index list を含み、click で row scroll into view + 編集 modal を open する。

- `precondition-conflict`: 前段 Q1/Q2 で disable された種別の行が残っている
- `no-destination-service`: その entry がどの destination service step にも入らない
- `dangling-group-id`: FileEntry.groupId が submission.fileGroups にない (UI バグ検知)

---

## SSOT とデータ管理

Tier1 ルーティング・カタログと FileTypeKind の付帯情報 (種別・ファイル形式の概要 / 区分 / 拡張子 / DDBJ URL) は、情報量が最多の 1 ソースを canonical とし、そこから派生する形で管理する。

```
canonical 1 ソース (DDBJ 由来、内部整合を機械検証)
   ├→ enum 層 (vocabulary.ts / service.ts)       flow-rules / PBT が参照する唯一の境界・人間レビュー対象
   ├→ データモジュール層 (content/submit-routing)  ルーティング・カタログ + 付帯情報、低摩擦更新
   └→ i18n 層 (resources/{ja,en}.ts)             表示テキスト、翻訳忘れ検出 PBT 管轄
同期は codegen でなく起動時 Zod + parity test で担保
```

- **値域 enum と表示テキストを分離**: enum (`vocabulary.ts` / `service.ts`) = flow-rules/reducer/PBT が参照する唯一の境界・人間レビュー対象。付帯情報 = content モジュール。翻訳 = i18n
- **更新運用の分離**: enum 値の増減 = flow-rules/PBT に波及する意味論変更 → 人間レビュー必須ゲート (parity test が落として知らせる)。概要・拡張子・区分の変更 = 説明テキスト → content/i18n 修正で低摩擦
- DDBJ 由来データと現 portal の差分は `## 設計判断` に記録する

---

## 設計判断

利用者向けの登録先データ (Q1/Q2/Q3 と service 対応) と現行 DDBJ の登録手順・現 portal 実装の間には差分があり、次の判断で解消する。

- **file 詳細質問は flow-changing 軸だけに限定する**: 行の modal は「答えると `FlowStep[]` が変わる」軸 (destination 集合・必須 step・scope の束ね) だけを問う。出る service / step を変えない DB 内部の細部 (reads の library layout、発現・アレイの形式、variant の reference 有無・SNP/SV、質量分析の測定方式・MSI 等) は file 質問にせず Step カードの Intra-DB Tag に降ろす。該当軸が無い種別 (`sequence-read` / `variant` / `expression-matrix` / `microarray-expression` / `nmr` / `metabolite-assignment`) は file 質問を持たず、データ詳細セルを出さない。これにより「答えても flow が変わらない」死んだ質問を排除し、登録経路の確定に効く問いだけを利用者に出す (`### file 詳細質問の選別基準`)
- **生物軸は Q2 のみ**: 行レベルの細かい生物分類は持たない。Q2 (生物ドメイン) と重複し、細かい生物種は BioSample の Intra-DB Tag で扱うため。これに伴い「organism ごとに BioProject を分裂させ、BP ≥ 2 で Umbrella を出す」挙動は持たず、実 DDBJ の **「1 BioProject + 複数 BioSample」** に合わせる (BioSample の数・生物種は Intra-DB で確定し、`mag-project` 等の recipe が必要な多 BioSample 構造を作る)
- **FileTypeKind は一次登録単位のみ**: 附随メタデータ (表現型・サンプル属性 → BioSample / SDRF) と付随ファイル (processed 画像 / 解析レポート / 可視化オブジェクト → 発現・空間本体の追加ファイル) は独立種別にせず、Intra-DB Tag / 追加ファイル枠に降ろす。公式 docs がこれらを Sample メタデータ・付随ファイルと位置づけるため
- **JGA はヒト個人のみ (メタゲノムは含めない)**: JGA 分岐は `access = restricted ∧ Q2 = ヒト` とする。公式上 JGA はヒト個人由来の制限公開データ専用で、メタゲノム・環境・マイクロバイオームは対象外 (`### JGA は「ヒト個人」限定`)。制限公開の環境メタゲノムや非ヒトは DRA に embargo (公開予定日) で出す (INSDC は制限公開を持たないため embargo が唯一の非公開手段)。ヒト宿主のマイクロバイオームを JGA に入れたい要件が生じても、それは生物ドメイン軸 (Q2) でなく「由来がヒト個人か」という別軸の話であり、Q2 = metagenome を JGA トリガにはしない
- **Service は role 付きの単一 enum**: 利用者向けの登録エンドポイントと内部 service はほぼ 1:1 であり、別 enum を 2 本持たない。登録エンドポイント (DDBJ 内 = destination / 最終格納先が DDBJ 外 = external の `jpost`・`eva`) と随伴する導出物 (companion = BioProject/BioSample) と誘導のみの external (`humandbs`・`dbcls`) の差は role で表す
- **塩基配列の窓口は MSS と NSSS の 2 つ**: 「DDBJ (Trad)」の登録先 DB は 1 つだが投入窓口が 2 つある。`ddbj-trad` = MSS (Mass Submission System、ファイル送付、大規模・完成ゲノム・NSSS 非対応種別)、`nsss` = NSSS (Web 登録、小規模・非完成・公式が第一に勧める初心者向け)。両者を別 destination service として持ち、種別 (WGS/TSA/TLS/EST/HTG/HTC/GSS/TPA は MSS) と完成度で振り分ける (`### MSS / NSSS の振り分け`)。リードは対象外で DRA に回る。db-portal は実ファイルを読まないため、配列長・配列数・Feature 数に依存する境界は Step note で案内し、規模を確定する flow-changing 軸を入れるかは別途判断する
- **変異の登録先はヒト/非ヒトと制限公開で割れる**: 公開ヒト → `togovar` (TogoVar-repository)、制限公開ヒト → `jga`、非ヒト (公開/制限問わず) → `eva` (EBI EVA)。TogoVar はヒト専用なので非ヒトを TogoVar に流して警告で済ませず、`eva` を実際に emit する。短いバリアント (≤ 50 bp) と構造バリアント (> 50 bp) は TogoVar・EVA いずれも**同 service 内の登録種別差**であり出る service を変えないため、データ詳細 chip でなく Step カードの Intra-DB Tag (登録種別 pulldown) で扱う。reference 配列の有無も DDBJ 公式に routing 軸が無く同 service 内の扱いなので同じく file 質問にしない (行先は Q2 ヒト/非ヒト + access で確定し、`variant` は file 質問を持たない)。非ヒト構造バリアントの旧 DGVa は EBI EVA に統合済みで、独立 service にはしない (EVA に集約)。TogoVar の reference assembly 制約 (GRCh37/38 等) は一次情報で確認できていないため hard-constraint として書かず、必要なら登録時の validator に委ねる
- **proteomics は jPOST (DDBJ 外)、ただし生の質量分析のみ**: 質量分析のうち proteomics (プロテオーム) は MetaboBank でなく `jpost` (jPOSTrepo) に出す。metabolomics / NMR / MSI イメージングは `metabobank`。proteomics は出る service が変わる flow-changing なので `mass-spec-domain=proteomics` を warning note でなく `jpost` の emit に接続する。**proteomics 分岐が意味を持つのは生の質量分析 (`mass-spectrometry`) だけ**であり、NMR は metabolomics 専用 (MetaboBank が NMR を受け jPOST は受けない、`_metabobank/datafile-e.md`)、`metabolite-assignment` (MAF) も metabolomics の成果物で jPOST 経路を持たない。したがって `nmr` / `metabolite-assignment` は `mass-spec-domain` 質問を持たず MetaboBank 一択とする (両種別に proteomics→jpost 分岐は置かない)。MSI イメージングは MetaboBank 内のファイル要求差 (出る service は不変) なので groupType `imaging-ms` で構造を表し data-detail chip 値にはしない
- **空間 Tx の platform は recipe で実 DRA step を出す**: `spatial-platform` は GEA Submission Type (Sequencing/Microarray) と DRA 2 段の要否を変える flow-changing 軸なので、note 止まりにせず Tier2 `spatial` recipe で **Sequencing platform に実際の DRA step を emit** する (`### spatial`)。値域は実運用頻度で決め、少なくとも Visium / Xenium / MERFISH を持つ (Xenium は頻出)。公式未文書の platform (Stereo-seq / Slide-seq / GeoMx) は暫定で Sequencing 扱いとし根拠を明記する。MERFISH の大容量画像は GEA 受付不可だが、外部 Generalist archive は DDBJ service でないため step 化せず GEA step の誘導 note で表す
- **`assembly-form` は MAG/SAG 派生チェーン専用の軸**: `assembly-form` が routing で意味を持つのは `mag-sag-chain` group での MAG/SAG ディスパッチ (DRA 多段を生む flow-changing) だけ。WGS/GNM/TSA/TLS/EST/HTG/HTC/GSS は全て同じ `ddbj-trad` 行きで出る service を変えないため、これらは `assembly-form` の値域に持たず Step カードの MSS data type pulldown (Intra-DB Tag) で扱う。チェーン内の段階 (生リード/primary/binned/MAG) は構造情報 (group membership・`derived_from`) であって「アセンブリ形態」ではないため、軸名・値域が段階と種別を混同しない形に整える (現行値 `raw` 等の命名はこの観点で見直す)
- **第三者 (TPA) は提出単位 (Q1) で扱い per-file では問わない**: 配列系の TPA → `ddbj-trad` (MSS、引用元 INSDC accession 必須。`_ddbj/tpa-e.md` / `_ddbj/web-submission-e.md`: TPA は NSSS では受け付けず MSS のみ)、メタボローム再解析 → `metabobank`。TPA か否かは 1 提出まるごとで決まる軸なので前段 Q1 だけで判定し、per-file の `provenance` 質問・chip は持たない (Q1 と二重に問わない)。種別で割れるため Q1 = 第三者 で振り分け不能な種別は Q3 で disable される
- **`assembly-annotation` は 1 step**: 配列 + アノテーションは MSS の 1 ファイルペアであり、配列登録 step とアノテ step に分けない
- **MAG ≠ SAG**: 別パッケージ (MIMAG / MISAG) で、1 つの GroupType に束ねない。MAG の段階間リンクは単一 BioProject を共有しつつ BioSample `derived_from` の放射状で表し、直列 chain ではない。MAG は生リードを DRA に出す多段が必須 (flow-changing) だが、SAG は公式上 DRA が任意なので MAG と同列の多段固定にはせず、DRA を任意扱いにする (`_ddbj/single-amplified-genome.md` に DRA 必須の記載なし)
- **hybrid は独立した登録概念ではない**: ハイブリッドアセンブリは sequencing platform の多値属性 (`_ddbj/wgs-e.md` の Sequencing Technology 自由記述) であり出る service を変えないため、file 質問に持たない (`sequence-nucleotide` の form は 単独 / MAG チェーン / SAG チェーンのみ)

---

## i18n リソース

`app/lib/i18n/resources/{ja,en}.ts` の `Resources.submit` 配下に submit 用キーを追加する。ja / en 両方で完全一致が PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) で担保される。key 集合はカタログの `note.messageKey` 値と完全一致させる。en 未供給の説明は ja/en が揃うまで i18n に出さない (parity test が常時赤になるのを避ける)。

---

## 範囲と制約

- submit features は外部 API を呼ばない (navigator のみ)
- zones / lint 制約 (生 hex 禁止、`react/forbid-elements` で生 button / input / select / textarea 禁止、arbitrary value 禁止) は `architecture.md` に従う
- 新 primitive 追加は `docs/frontend.md` の「UI primitives」 の手順を経由する
