# 登録ナビゲーション (submit)

DDBJ の登録窓口は service ごとに分かれており、利用者は最初に「自分のデータの DB は何か」を選ばされる構造になっている。submit ナビゲーションは、利用者が手元のデータの性質を答えるだけで、登録経路 (どの登録先に何を出すか) を portal 側で導出して可視化する UI である。

---

## 概念

### 「自分のデータの DB は何か」を訊かない設計

利用者は登録窓口に来た時点では、DDBJ の service 構造 (BioProject / BioSample / DRA / JGA / DDBJ / GEA / MetaboBank / TogoVar …) を必ずしも理解していない。「自分が持っているのは FASTQ で、ヒトの制限公開データ」のような **データ側の言葉** で考えている。

submit ナビゲーションはこの状態を出発点とする:

- 利用者は前段で「登録種別」「生物ドメイン」を答える
- 続いて「手元にあるデータ種別」を **on/off で選ぶ**。各種別は前段 Q1/Q2 で enable/disable される
- portal が controlled vocabulary と純粋関数で「どの登録先に何を出すか」を導出する
- 利用者は導出結果 (Step カード) を見て、各 Step の Intra-DB Tag (DDBJ の Division、BioSample の生物種・package、DRA Library Strategy 等) を埋めていく

この向きで「service の存在は知らなくて良い」状態を担保する。

### 3 段構造

UI 全体は前段フィルタを足した 3 段構造になる:

```
┌─────────────────────────────────────────────────────────────┐
│  前段: 登録前提 (Q1 登録種別 / Q2 生物ドメイン)              │
│   - 単一選択。後段の選択肢を絞り込むカスケード・フィルタ      │
├─────────────────────────────────────────────────────────────┤
│  中段: データ種別の選択 (手元のデータ種別を on/off で選ぶ)    │
│   - 各種別 = 1 つのトグル。Q1/Q2 で enable/disable           │
│   - 公開+制限のときだけ、access が効く種別に公開区分トグル    │
│   - flow-changing 詳細 (platform / domain / MAG/SAG / pair) は│
│     種別ごとの詳細カードで答える                             │
├─────────────────────────────────────────────────────────────┤
│  下段: Step カード列 (導出結果 = FlowStep)                   │
│   - Step カード = 1 つの登録 step                           │
│   - service バッジ + scope (対象 group/entry)                │
│   - Intra-DB Tag (pulldown) を埋める                         │
└─────────────────────────────────────────────────────────────┘
```

下段は **中段の関数** であり、利用者は下段を直接編集しない。前段は中段の選択肢を絞る。下段に欲しい結果を出すために中段で種別を選び、中段の選択肢を狭めるために前段を調整する、という編集モデル。この 3 段は画面では 2 pane に割り付く: 前段 + 中段 (入力) を左 pane、下段 (結果) を右 pane に置く (`## 画面構成`)。

### Cross-DB Tag / Intra-DB Tag

submit の controlled vocabulary は 2 種類の文脈で使われる:

- **Cross-DB Tag**: 全 service に共通する分類軸。`Q1`, `Q2`, `FileTypeKind`, `Access`, `ChipAxis` のように、どの登録先に出すかを決める前段の情報
- **Intra-DB Tag**: 特定の service 内で使う controlled vocabulary。`DDBJ の Division × data type`, `BioSample の生物種・package・サンプル属性 (表現型)`, `DRA Library Strategy` のように、step 単位で出す pulldown 群

Cross-DB Tag は前段フィルタ / 種別トグル / 種別ごとの access・詳細回答で表現、Intra-DB Tag は Step カード内の pulldown で表現する。生物種のような細かい分類は Cross-DB ではなく Intra-DB Tag (BioSample) で扱う。

### 詳細質問の選別基準

種別の「データ詳細」質問 (DataDetailPanel) に持ってよいのは、**その答えで導出される `FlowStep[]` が変わる (flow-changing) 軸だけ** とする。具体的には destination service の集合が変わる・必須 step が増減する・scope の束ね方が変わる軸を指す。出る service / step を変えない細部は詳細質問にせず、登録先が決まってから Step カード内 Intra-DB Tag (pulldown) で埋める。利用者は「フローが変わる問い」だけを答え、各 DB の細部は後で埋める、という負荷分散になる。

判定の物差し (この基準は DDBJ 公式の登録手順が flow 分岐に使っている軸と一致させる。値の根拠は `ddbj.nig.ac.jp` のソース):

| 区分 | 例 | 置き場所 |
|---|---|---|
| flow-changing・**前段**で判定 | Q2 ヒト/非ヒト (variant→TogoVar/EVA, reads→DRA/JGA) / 公開区分 (JGA 分岐) / Q1 第三者 (TPA→MSS) | 前段 Q1/Q2・access トグル |
| flow-changing・**種別ごと**に判定 | `assembly-form` MAG/SAG (`ddbj-trad` ENV genome 経路へ分岐) / `mass-spec-domain=proteomics` (MetaboBank→jPOST) / `spatial-platform` (Sequencing→DRA+GEA / Microarray→GEA) / 配列+アノテのペア (MSS 1 step に束ねる scope) | データ詳細 (種別ごとの質問) |
| service / step 不変・DB 内部の細部 | reads の single/paired/10x/多重化 (DRA Library Layout・Instrument・BioSample 粒度) / 発現の MAGE-TAB・アレイ single/two-color (GEA 内の形式・IDF/SDRF) / variant の reference 有無・SNP/SV (TogoVar 内登録種別) / 質量分析の測定方式・MSI イメージング (MetaboBank 内のファイル差) / MSS data type の WGS/TSA/TLS/EST/HTG/HTC/GSS / BS package / DRA Library Strategy | Step カードの Intra-DB Tag pulldown |

詳細質問は「flow-changing・種別ごと」の軸だけを持つ。該当軸が無い種別 (`sequence-read` / `variant` / `expression-matrix` / `microarray-expression` / `nmr` / `metabolite-assignment`) は **詳細質問を持たず、詳細カードを出さない** (行先は前段 Q1/Q2 + access で確定する)。TPA は Q1 のみの軸とし種別ごとの chip を持たない (1 提出まるごと第三者を前提とする)。

flow を変えない区分を詳細質問に出すと「答えさせても経路に反映されない」死んだ質問になり、flow を変える区分を Intra-DB に隠すと「経路が誤って導出される」。両方向の事故を防ぐのがこの基準である。

### 2 層モデル (データ駆動 + 構造エンジン)

経路導出は 2 層に分かれる。この分離が「DDBJ がデータで登録フローを拡充でき、人がそのフローを確認できる」ことを担保する。

```
┌ Tier1: ルーティング・カタログ ── データ (DDBJ が編集)・人が読める ───────────┐
│  種別 × 条件 → 登録先 service + notes。単一種別の選択で判定が閉じる            │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ 薄いインタプリタ (純粋関数) が解釈
┌ Tier2: 構造エンジン ── コード・不変量を PBT で固定・滅多に変わらない ──────────┐
│  BioProject/BioSample 生成・JGA Policy ゲート・spatial の cross-archive 2 段   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
                       FlowStep[] (下段カード)
```

判定の一文基準: **「単一種別の選択を見れば宛先が決まる」= Tier1 のデータ。「submission 全体の集約 (companion・Policy ゲート) や 1 種別 → 複数 archive が要る」= Tier2 のエンジン。**

submit ナビは典型的な提出 (1 種別 = 1 つの論理データ) を案内対象とする。1 提出内で同一種別を複数ファイルに分けて段階や属性を割る高度なケース (メタゲノムアセンブリの多段チェーン、複数 Policy 単位の JGA Dataset 分割) は、種別単位の単一ガイド step に簡約して案内し、ファイル実体の段構造そのものは持たない (`## 設計判断` の「典型ケースに絞る」)。

---

## Controlled vocabulary

値域は `app/schemas/submit/vocabulary.ts` と `app/schemas/submit/service.ts` を SSOT とする。本章では各語彙の **意図と使い分け** を述べる。種別 → 登録先の対応は `## 前段カスケード・フィルタ` の規約表で扱う。

- **Q1 (登録種別)**: 「公開データの登録」(`public`)「制限公開データを含む登録」(`restricted`)「第三者の登録データに対する解析データの登録」(`third-party`)。前段の単一選択。種別ごとの `Access` の出し方と default を決める (`## 公開区分 (access) の規約`)。**第三者 (TPA) 分岐の唯一の起点**でもあり、TPA は提出単位 (Q1) で決まる軸として種別ごとには問わない (配列系の TPA → MSS の振り分けは `q1 = third-party` だけで判定する)
- **Q2 (生物ドメイン)**: 「ヒト」「ヒト以外の真核生物」「原核生物」「ファージ・ウイルス」「環境サンプル (メタゲノム)」。前段の単一選択で、**submission 全体の唯一の生物軸**。種・属レベルの phylogeny は持たない (それは BioSample の Intra-DB Tag で扱う)。`human` (ヒト個人由来) のみが JGA への分岐起点になり、`metagenome` (環境サンプル) は非ヒト扱いで JGA に入れない (`### JGA は「ヒト個人」限定`)。公開+制限のときの access default も Q2 が決める (`## 公開区分 (access) の規約`)
- **FileTypeKind**: データファイルの種別で、**真の一次登録単位だけ**を値域とする (配列リード / FASTA 塩基配列 / 配列アノテーション / バリアント / 発現マトリクス / マイクロアレイ発現 / 空間トランスクリプトーム / 空間画像 / 質量分析 / NMR / 代謝物アサインメント)。中段の選択トグルの単位で、利用者は手元にある種別を on にする (同一種別は高々 1 個)。附随メタデータ (表現型・サンプル属性) は BioSample の Intra-DB Tag、付随ファイル (processed 画像 / 解析レポート / 可視化オブジェクト) は主データ step の追加ファイル枠で扱い、FileTypeKind には含めない。ベンダー raw データも独立種別を作らず質量分析 / NMR の file_format に含める
- **Access**: `open` / `restricted`。**per-file の混合を持たず種別単位**で扱う軸。Q1 = 公開+制限 のときだけ access-sensitive な種別に出し、Q1/Q2 が default を注入する (`## 公開区分 (access) の規約`)。`restricted ∧ Q2 = ヒト` の組合せが JGA への分岐起点。非ヒトの制限公開 (細菌ゲノム等) は INSDC が制限公開を持たないため DRA に公開予定日 (embargo) 付きで出す
- **ChipAxis**: 前段で表現できない、かつ **出る service / step を変える (flow-changing)** 細部区分を、種別ごとの `{axis, value}` ペアで表現する。`assembly-form` (MAG/SAG を `ddbj-trad` ENV genome 経路に振り分ける) / `mass-spec-domain` (proteomics 振り分け) / `spatial-platform` (GEA Sequencing/Microarray・DRA 2 段の振り分け)。第三者 (TPA) は前段 Q1 のみの軸とし ChipAxis には持たない。出る service を変えない区分 (バリアントの SNP/SV、MSS data type の WGS/TSA/TLS 等) は chip にせず Step カードの Intra-DB Tag で扱う (`### 詳細質問の選別基準`)。`assembly-form` の routing 上の意味は `## 設計判断` を参照
- **GroupType**: 複数ファイルが論理的に 1 単位を成す関係 (配列 + アノテーションのペア、MAGE-TAB、imaging-ms 等)。経路導出の分岐要素として効く。詳細は `### group と Tier1 分岐` を参照
- **Service**: 登録先・導出物・外部誘導を表す単一の enum。各値は **role** を持つ (`destination` = 利用者のデータが行く登録先 / `companion` = submission 全体に共通する導出物 / `external` = DDBJ 外への誘導)。詳細は `## Service と role / 外向き契約`

### INSDC 公式との突合

INSDC (NCBI / ENA / DDBJ の 3 機関共通) との関係:

- DRA `Library Strategy` は INSDC 共通 vocabulary。`vocabulary.ts` は INSDC 公式と一致する値域を持つ
- BS package のうち SARS-CoV-2 系統と DDBJ 拡張は DDBJ ローカル

INSDC 公式 vocabulary が更新されたら `vocabulary.ts` の enum を直し、本書は触らない (二重源泉化しない)。

---

## 前段カスケード・フィルタ

Q1 → Q2 → 種別 (FileTypeKind) の順に選択肢を絞る。各 Q1/Q2/FileTypeKind オプションは **対応する登録エンドポイント集合** を持ち (Q1-3 由来データを SSOT 化したもの)、絞り込みは集合の積で閉じる。以後この集合を `repos` と呼ぶ。

```
allowedRepos = Q1.repos ∩ Q2.repos
Q2 オプション enable  ⟺  Q2opt.repos ∩ Q1.repos ≠ ∅
種別 enable           ⟺  KindRoute.candidateRepos ∩ allowedRepos ≠ ∅
```

カスケードは **rules を実行せず repos フィールドを読むだけ** で判定する純関数であり、経路導出 (rules 実行) と同じカタログの別の読み方になる (二重管理が起きない)。

Q1 の `repos` は登録区分を反映する: 公開は公開系の全 destination、第三者は TPA を受ける窓口 (MSS / MetaboBank)、**公開+制限は「公開系 destination ∪ JGA」= 全 destination** (公開分のデータと制限公開分のデータが同一提出に併存しうるため、両方の種別を enable する)。

### デッドエンドが構造的に 0 になる規約

(Q1 ∩ Q2) が種別を disable するため、`allowedRepos = ∅` の組合せや「選んでも宛先が無い種別」は選択不能になる。例: `Q1 = 第三者` (repos = {ddbj-trad, metabobank}) のとき、これらを candidateRepos に持たない種別 (配列リード / バリアント / 発現 / 空間) は disable され、配列 (MSS) と質量分析・NMR・代謝物だけが残る。これを PBT で固定する (`## 経路導出と不変量` の `cascade-no-deadend`)。

前段は種別の enable/disable と access default を決め、種別を選んだ後は (公開+制限なら) 種別ごとの `Access` と `ChipAxis`・詳細回答が経路導出を駆動する (生物 = ヒトかは Q2、公開区分は種別ごとに判定)。

---

## 公開区分 (access) の規約

`Access` は `open` / `restricted` の 2 値。**per-file の混合は持たず、種別単位**で扱う。Q1 が「出し方」を決める:

| Q1 | access UI | 種別の access |
|---|---|---|
| 公開 | 出さない | 全種別 open |
| 第三者 | 出さない | 全種別 open (TPA) |
| 公開+制限 | access-sensitive 種別にだけトグル | 種別ごとに open / restricted (default は Q2 由来) |

`Access` が登録先を変える (access-sensitive な) のは `sequence-read` / `variant` / `microarray-expression` の **3 種別だけ**である (他の種別は access に依らず登録先が固定)。公開+制限モードで Q2 が出すトグルと default:

| Q2 | トグルを出す種別 | default | 根拠 |
|---|---|---|---|
| human | sequence-read / variant / microarray-expression | **restricted** | ヒト個人データは JGA 想定が安全側。公開分だけ後から open に倒す |
| eukaryote / prokaryote / virus | sequence-read のみ | open | JGA 対象外。restricted は DRA embargo の opt-in |
| metagenome | sequence-read のみ | open | JGA 対象外 (DRA embargo)。同上 |

variant 非ヒト → EVA、microarray-expression 非ヒト → GEA は access で登録先が変わらないためトグルを出さない (余計な操作を増やさない)。`restricted ∧ Q2 = ヒト` は JGA 分岐、`restricted ∧ Q2 ≠ ヒト` の sequence-read は DRA に embargo を付ける。いずれも Tier1 catalog の first-match で評価する。default の生成は `app/features/submit/access.ts` の `defaultAccessFor` (純関数) が SSOT。

---

## Tier1 ルーティング・カタログ

`Submission` から「種別ごとの登録先」を決めるルールを、**service 非依存の宣言データ** として持つ。DDBJ はこのデータを編集してフローを拡充でき、値は controlled vocabulary なので起動時 Zod 検証で typo が落ちる。

### 構造

カタログは FileTypeKind ごとの `KindRoute` の集合で、型と全ルールデータは `app/schemas/submit/` と `app/content/submit-routing/catalog.ts` が SSOT。各 `KindRoute` は概念として次を持つ:

- `id`: FileTypeKind
- `candidateRepos`: この種別が emit しうる全**登録エンドポイント**の上位集合。種別 enable 判定・カスケード・parity 検証に使う
- `rules`: 上から **first-match** で評価されるルール列 (`{ when, emit }`)

**登録エンドポイント** = 利用者のデータの最終格納先になる service。DDBJ 内 (role = destination) に加え、データの最終格納先が DDBJ 外になる external service (`jpost` = proteomics、`eva` = 非ヒト variant) も含む。一方 `humandbs` は「Policy 申請・承認の誘導」であってデータの格納先ではないため登録エンドポイントに含めず、Tier2 が JGA の前提 step として出す (`## Service と role / 外向き契約`)。

`rule.emit` は `{ service, scope, notes }`: `service` は登録エンドポイント、`scope` は `entry` (その種別だけ) / `group` (所属 group の全 member + group)、`notes` は `{ kind (info/warning/error), messageKey }` の配列 (各 note は optional な `whenAny` を 1 階で持ち、scope 内に該当があるときだけ出る)。

例として `variant` 種別は、制限公開ヒトを `jga`・公開ヒトを `togovar`・非ヒトを `eva` に first-match で振り分ける (ヒト/非ヒトと公開区分で登録先が割れる)。短いバリアント (≤ 50 bp) と構造バリアント (> 50 bp) は **同じ service 内の登録種別差** (TogoVar の SNP/SV、EVA の short/SV) であって出る service を変えないため、詳細質問にせず Step カードの Intra-DB Tag (登録種別 pulldown) で扱う。`variant` 種別で **flow を割るのは Q2 (ヒト/非ヒト) と access** だけである。`eva` が非ヒトの正規の登録先で、非ヒトを TogoVar に流して警告で済ませない (TogoVar はヒト専用)。

### first-match が排他を保証する

`rules` は first-match のため、1 種別は同一カタログ内で高々 1 つのルールにマッチする。これにより「同じ種別が排他 service (JGA / DRA, JGA / TogoVar) の両方の scope に出ない」が機械的に成立する。否定 (NOT) は条件を先に置き末尾を `{always}` fallback にして順序で表す。

### group と Tier1 分岐

GroupType による分岐は、単一 group で完結するものを Tier1 (`emit.scope=group` または `groupType` 述語) で扱う。配置と意味は DDBJ 公式の登録手順に基づく。

| GroupType | 公式の実体 | 配置 |
|---|---|---|
| `mage-tab` / `two-color` | MAGE-TAB マトリクス → GEA | Tier1 (`groupType` 述語) |
| `imaging-ms` | imaging mass spec → MetaboBank | Tier1 (`groupType` 述語) |
| `assembly-annotation` | 配列 + アノテーションは **1 提出の 1 ファイルペア**。DDBJ (MSS) の単一 step で配列 + feature table を提出する | Tier1 (DDBJ の単一 step) |

### 条件記述語彙

`when` が参照できる原子述語 (種別 / 所属 group / 前段の属性に対する controlled vocabulary 等値) と結合子 (`and` / `or` / `not` / `always`) は `app/schemas/submit/when-dsl.ts` が SSOT。**単一 FileEntry / 単一 FileGroup / 前段で評価でき、submission 集約は参照できない** (それは Tier2)。

境界 (意図的に不可能):

- submission 集約 (種別組合せ、件数閾値) は参照不可 → Tier2
- 算術・正規表現・文字列マッチ不可。値は controlled vocabulary の等値のみ
- `emit` の動的計算不可 (service / scope は固定、note のみ `whenAny` で 1 階)
- `when` のネスト深さ上限 3

カタログで表現できない 1 回限りの例外は、DSL に逃さず Tier2 に named step を足す (escape の最終形 = コード)。

---

## Tier2 構造エンジン

薄いインタプリタが各種別にその `rules` を first-match 評価して service+scope+notes を確定し、同一 service の scope を union して 1 枚にまとめた後、次の構造導出を足す。これらは submission 全体の集約や 1 種別 → 複数 archive を要するため Tier1 では表現できない。

| 導出 | 配置理由 |
|---|---|
| BioProject 生成 (companion、種別 ≥ 1 で 1 つ) | submission 全体に共通 |
| BioSample 生成 (companion、種別 ≥ 1 で 1 つ) | submission 全体に共通。実サンプル数・生物種・package は Intra-DB Tag |
| JGA 前提ゲート + companion 抑制 (`jga-submission` recipe) | JGA は BioProject/BioSample を使わず Policy 承認を前提とする。submission 全体を見て判定 |
| spatial の DRA 2 段 (`spatial` recipe) | 1 種別 → DRA + GEA の cross-archive で Tier1 の単一 emit に収まらない |
| no-destination 警告 | 全種別評価後の集約 |
| 順序 / id 一意 / 同 service scope union | 出力整形 |

`named recipe` の集合は allowlist (`jga-submission` / `spatial`、`RECIPE_ALLOWLIST` が SSOT) として固定し、勝手に増えないことを PBT で担保する (Tier1 骨抜き防止)。BioProject / BioSample は通常 1 つずつの companion とする。

---

## Tier2 recipe 詳細

named recipe (`jga-submission` / `spatial`、allowlist 固定) は、薄インタプリタが確定した service+scope を受け、その上に submission 全体の構造を足す。

### jga-submission

制限公開ヒト個人データを JGA に出すための前提ゲートと companion 抑制を足す。JGA は SRA 系を拡張した独自エンティティ (Study / Experiment / Data / Analysis / Dataset / Policy。Dataset は Policy 単位でアクセス制御し、Policy は DAC を必須参照) を持ち、BioProject / BioSample を使わない。提供申請と利用制限ポリシー (NBDC 標準 / 独自 JGAP) は同一プラットフォーム (NBDC ヒトデータベース / HumanDBs) で完結する。

トリガー: いずれかの種別が `service = jga` に routing される (= `restricted ∧ Q2 = ヒト` の sequence-read / variant / microarray-expression)。

emit する FlowStep は「Policy 申請・承認」 (`humandbs`、JGA の前提ゲート。承認を得ないと JGA に登録不可) と「`jga` 登録」 (Tier1 が union した単一 JGA step)。companion: JGA は BioProject / BioSample を使わないため既定 companion を**抑制**する。Policy 単位の Dataset 分割は Intra-DB の登録単位の話として JGA 登録ウィザード側に委ね、navigator では「Policy 承認 → JGA 登録」の単一ガイドに簡約する (`## 設計判断` の「典型ケースに絞る」)。

不変量 (PBT 候補): jga が出るとき既定 BioProject・BioSample を emit しない / Policy ゲート (humandbs) が jga step より前に出る。

### spatial

発現・空間 Tx の platform が決める GEA Submission Type に応じて、生リード → DRA と processed → GEA の 2 段を構築する。**1 種別が複数 destination に出る**点が特徴で (group 間グラフではなく cross-archive 依存: raw が GEA より先に DRA に要る)、Tier1 の単一 emit に収まらないため Tier2 に置く。

トリガー: `spatial-transcriptomics` / `spatial-image` の種別で `spatial-platform` chip を持つもの。

platform → Submission Type 分類 (`_gea/spatial-gene-expression.md`)。対応 platform 値は `ALLOWED_CHIP_VALUES['spatial-platform']` が SSOT で、Sequencing 系の判定は `isSequencingSpatialPlatform` (`SEQUENCING_SPATIAL_PLATFORMS`) が SSOT:

| 分類 | 判定 | emit |
|---|---|---|
| Sequencing | `SEQUENCING_SPATIAL_PLATFORMS` に含まれる platform (Visium / Stereo-seq 系) | DRA Run (生リード) + GEA (processed) の 2 step |
| それ以外 (Microarray) | Sequencing 系でない platform (Xenium / MERFISH 系) | GEA のみ (DRA 無し) |

Sequencing platform は生リード (fastq/bam) を DRA に事前登録してから processed (GEX matrix・画像等) を GEA に出す 2 step、Microarray platform は GEA のみを emit する (具体の step / scope は `flow-rules/` が SSOT)。companion: 既定どおり BioProject 1 + BioSample 1。MERFISH 画像の Generalist archive は DDBJ service ではないため独立 step にせず GEA step の誘導 note で表す (`## 設計判断`)。

不変量 (PBT 候補): Sequencing platform の種別は dra step と gea step の両方に入る / Microarray platform の種別は gea step のみで dra step に入らない / どの platform でも種別は最低 1 つの destination service step に入る (no-orphan-destination 維持)。

### recipe 共通の不変量

`## 経路導出と不変量` の構造不変量に足す、`RECIPE_ALLOWLIST` の全 recipe 横断の性質:

- **recipe-companion-override**: `jga-submission` は BioProject/BioSample をともに抑制、`spatial` は既定 companion (BioProject 1 + BioSample 1) を保つ
- **recipe-no-orphan-destination**: recipe 適用後も全種別が destination service step に入る
- **recipe-service-exclusive**: 同一種別が排他 service の両方の scope に入らない

---

## Data model

submit 状態を表現する型は `app/schemas/submit/*.ts` を参照する (フィールド列挙はコード本体が SSOT)。

```
Submission
  ├─ preconditions          前段カスケードの選択 (Q1 登録種別 / Q2 生物ドメイン)
  ├─ 選択された種別          種別ごと: access (公開+制限時) + 詳細回答 (flow-changing 軸)
  └─ ペア関係 (group)        配列 + アノテーション (assembly-annotation) の 1 ペア束ね

(導出)
deriveFlowSteps(Submission) ──▶ FlowStep[]   下段カード (Submission を変更しない)
```

- 利用者は手元の種別を on にし (同一種別は高々 1 個)、種別ごとに access (公開+制限時) と flow-changing 詳細を答える
- 複数種別を 1 単位に束ねるのは **配列 + アノテーションのペア** (`assembly-annotation`) のみで、これは FASTA とアノテーションの 2 種別を 1 group にまとめて MSS の単一 step に出す
- `FlowStep.scope` は groupIds か entryIds の少なくとも一方が非空 (`scope-nonempty` 不変量)

### 参照整合の取り扱い

ペアの参照不整合は schema レベルでは throw しない。インタプリタは未知 group を持つ種別を `scope.entryIds` に出し、空 group は step を生成しない。UI 編集途中の整合崩れを許容する緩い参照を採用する。

---

## 経路導出と不変量

`deriveFlowSteps(submission)` は薄インタプリタ (Tier1 評価) と Tier2 構造エンジンを合成し、ステップ依存グラフのトポロジカル順 (不変量 #5、`### ステップ依存とカード順序`) で sort して `FlowStep[]` を返す (副作用なし、Submission を変更しない)。各構造導出が ctx を read-only で受け再計算しない (冪等性)。

### 不変量 (PBT で固定)

不変量を 3 区分で持つ。`tests/pbt/` で `numRuns=1000` で検証する:

**データ検証** (カタログが整合している。起動時 Zod + parity test):

| 不変量 | 内容 |
|---|---|
| catalog-vocab-closure | 全 `when` の値が controlled vocabulary のメンバー、`emit.service` が登録エンドポイント (role=destination ∪ `{jpost, eva}`) に存在 |
| candidateRepos-parity | `KindRoute.candidateRepos` ⊇ rules の全 `emit.service`、かつ前段データの種別 repos と一致 |
| messageKey-existence | 全 note の messageKey が i18n (ja/en) に存在 |
| every-kind-has-fallback | 全 KindRoute が `{always}` rule または named recipe を持つ (孤児ゼロの構造保証) |
| recipe-allowlist | named recipe の集合が固定 allowlist (`jga-submission` / `spatial`) 内 |

**エンジン不変量** (Tier2 が後段で必ず保証):

1. **冪等性**: 同じ input に対して同じ output (sort も含む)
2. **空 Submission**: 選択種別が空なら steps は空
3. **BP / BS companion**: 種別が 1 つでもあれば bioproject step 1 と biosample step 1 が出る (`jga-submission` recipe が抑制する場合を除く)
4. **JGA / DRA 排他**: 任意の配列リードについて、`access = restricted ∧ Q2 = ヒト` なら JGA scope に、それ以外 (非ヒトや公開) なら DRA scope に入る。同じ種別が両方に入らない (first-match で強化)。非ヒトの制限公開は DRA に embargo note を付ける
5. **順序 (依存順)**: ステップ依存グラフ (`### ステップ依存とカード順序`) のトポロジカル順。前提ステップが依存ステップより前に出る。前提ゲート (Policy: humandbs、jga の前) → 共通メタデータ (bioproject → biosample) → 一次データ (dra) → 主登録先 → 外部リポジトリ (jpost/eva)
6. **id 一意 / scope 非空 / scope ⊆ submission 種別**

**構造不変量** (no-orphan-destination 等):

| 不変量 | 防ぐ事故 |
|---|---|
| no-orphan-destination | 種別 ≥ 1 の任意 submission で、各種別が bioproject/biosample 以外に最低 1 つの destination service step に入る |
| cascade-no-deadend | 任意 (q1, q2) で enable された種別を選ぶと destination service が 1 枚以上出る (allowedRepos = ∅ や宛先なしの種別が選べない) |
| group-scope-completeness | `emit.scope=group` の step は flagged group の groupIds と全 member の両方を含む |
| spatial-dra-2step | Sequencing 系 platform の spatial 種別は dra と gea の両 step に入り、Microarray 系 platform の種別は gea のみで dra に入らない |

### ステップ依存とカード順序

service 間の前提関係を **ステップ依存グラフ** として宣言し、カード順序と「先に済ませること」ブロックの両方を駆動する。辺 (前提 → 依存先):

| 前提 | 依存先 | 根拠 |
|---|---|---|
| bioproject・biosample (共通メタデータ) | それを emit する全 destination | プロジェクト/サンプルを先に作り destination から参照する |
| humandbs (Policy ゲート) | jga | Policy 承認 (JGAP) を得ないと JGA に登録できない |
| dra | gea (sequencing 2 段) / ddbj-trad (MAG/SAG) | 生リードを先に DRA に登録し processed/ゲノムから参照する |

カード順序 (不変量 #5) はこの依存グラフのトポロジカル順で、前提ステップが依存ステップより前に出る。前提ゲート (Policy: humandbs) → 共通メタデータ (bioproject → biosample) → 一次データ (dra) → 主登録先 → 外部リポジトリ (jpost/eva) の線形順がこのトポロジカル順を実現する (Policy ゲートと共通メタデータは JGA が companion を抑制するため同一フローに共存しない)。各カードの「先に済ませること」は、依存先のうち **そのフローに実在する** 前提ステップだけを、その step の anchor へのリンクとして出す。`FlowOverview` も同じ依存順で並び、番号 badge の昇順が「前提 → 依存先」を表す。

### フロー・エクスプローラ (人がフローを確認する surface)

`/_design/submit-flow-explorer` route を置く (production build から除外)。任意の入力 (前段 Q1/Q2 + 選択種別 + 種別ごとの access・詳細) を組むと、出る `FlowStep[]` を全件プレビューする。各 step に **由来バッジ** (「Tier1 ルール由来」「Tier2 集約由来」「named recipe 由来」) を出す。加えて **マトリクスモード** で Q1 × Q2 × 種別の組合せを一覧し、`no-destination` / 種別 disable を可視化する。DDBJ はカタログを編集 → エクスプローラで結果を目視 → PBT が CI で網羅・不変量を検証、という流れでフローを確認・拡充する。

同じく production build から除外する `/_design/submit-result-summary` route は、右 pane の step 一覧を「登録先サマリー」(導出した登録先の粒度バッジ / 依存順の次にやること / warning・error と validation を集めた確認・前提) として見せ直す案を、builder と代表ケースのプリセットで試作する検討用 surface。本番 `/submit` には反映していない。

---

## Service と role / 外向き契約

Service は単一の enum で、各値が **role** を持つ。利用者向けの登録先 (destination)、submission 全体に共通する導出物 (companion)、DDBJ 外への誘導 (external) を role で区別する。accession 例と外部 URL は各 service の `app/content/services/*.content.tsx` が SSOT (本書は role と役割のみ)。submit カードは accession を主要素にせず、発行 ID の予告に意味がある service (`submit-routing/cards` の `issuedNote`) のみ外部リンク脇に muted で添える (`### 登録フロー詳細カード (FlowStepCard)` の accession の扱い)。

| service id | role | 役割 |
|---|---|---|
| `dra` | destination | リード / Run・Analysis。INSDC は制限公開を持たず、非ヒト制限公開は公開予定日 (embargo) で扱う |
| `jga` | destination | 制限公開**ヒト個人**データ (Dataset 単位アクセス制御)。Policy 承認は DBCLS/NBDC に委譲。メタゲノム / 環境は対象外 (`### JGA は「ヒト個人」限定`) |
| `gea` | destination | 遺伝子発現 (発現マトリクス / マイクロアレイ / 空間)。NGS 由来は raw を DRA に出す 2 段 (`### 発現・空間の DRA 2 段`) |
| `metabobank` | destination | メタボロミクス (質量分析 / NMR / 代謝物・MSI イメージング)。第三者再解析も受け入れ。proteomics は対象外 (`jpost` へ) |
| `togovar` | destination | ヒト variant (TogoVar-repository)。短いバリアント (≤ 50 bp) と構造バリアント (> 50 bp) の 2 登録種別を持つが、いずれも同 service (種別差は Intra-DB Tag)。非ヒトは受け付けない (→ `eva`) |
| `ddbj-trad` | destination | 塩基配列の一括登録のうち **MSS** (Mass Submission System) 経路。大規模・完成ゲノム・NSSS 非対応種別 (WGS / TSA / TLS / EST / HTG / HTC / GSS / TPA) と MAG/SAG の ENV/SAG ゲノムエントリを扱う。Division × data type の 2 軸で分類 |
| `nsss` | destination | 塩基配列の Web 登録 (Nucleotide Sequence Submission System)。MSS と同じ登録先 DB への並行窓口で、**小規模・非完成・NSSS 対応種別**を担う。MSS / NSSS の振り分け基準は `### MSS / NSSS の振り分け` |
| `bioproject` | companion | プロジェクトの束ね。種別があれば必ず生成 |
| `biosample` | companion | サンプルの束ね。実サンプル数・生物種は Intra-DB Tag |
| `eva` | external | 非ヒト variant の登録先 (EBI European Variation Archive)。短いバリアントも構造バリアント (旧 DGVa 相当) も EVA が受ける。dbSNP / dbVar は非ヒトの受付を終了 |
| `jpost` | external | proteomics (プロテオーム質量分析) の登録先 (jPOSTrepo、ProteomeXchange メンバー、DDBJ 外) |
| `humandbs` | external | 制限公開ヒトデータの利用制限ポリシー申請・承認窓口 (NBDC ヒトデータベース / HumanDBs、DBCLS 運営)。提供申請とポリシー (NBDC 標準 / 独自 JGAP) は同一プラットフォームで完結するため 1 service に統合する。JGA の前提ゲート |

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

db-portal は実ファイルを読まない navigator なので、配列長・配列数・Feature 数の厳密判定はできない。種別 (上記の NSSS 非対応リスト) と「完成ゲノムか否か」で振り分け、規模に依存する境界は Step カードの note で「小規模・非完成なら NSSS Web 登録、それ以外は MSS」と案内する。

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
| Stereo-seq | (DDBJ 未文書) | 要 (DRA + GEA) | 公式に登録経路の記載なし。`SEQUENCING_SPATIAL_PLATFORMS` に含め Sequencing 扱い (DRA+GEA) とし、根拠は `## 設計判断` に残す |

### Step カードのバッジ色

カードのバッジ色は role (destination/companion か external か) と notes の warning/error 有無で決まる。判定は `serviceBadgeColor` 純関数 (`schemas/submit/service.ts`、FlowStep 単位のラッパは `flow-rules/service-badge.ts` の `stepBadgeColor`)、具体色値は `app/styles/tailwind.css` の `@theme` トークンが SSOT。

---

## 画面構成

`/submit` は 1 つの `<Section>` を左右 2 pane に割る。左 pane が **入力** (利用者がデータ種別とその来歴を答える: 登録前提 Q1/Q2 → データ種別の選択 → 公開区分 → データ詳細)、右 pane が **結果** (導出された登録フロー: 一覧 FlowOverview → 各 step 詳細 FlowStepCard、違反時のみ PartialFailureBanner)。狭い画面では縦積みにする。pane 比率・grid・各 component の組み立ては `app/features/submit/` と `app/routes/submit/` が SSOT。id は client mount 後に採番して SSR hydration mismatch を避ける。

前段で Q1/Q2 を変更して選択済みの種別が disable になった場合、選択は破棄せず、`selectValidations` が `precondition-conflict` を出して該当種別へ誘導する (整合崩れを破壊的に解決しない)。

### 登録フロー一覧 (FlowOverview)

右 pane 先頭の `FlowOverview` は `FlowStep[]` をステップ依存順 (`### ステップ依存とカード順序`) で並べ、俯瞰とナビゲーションに徹する。status・source・説明文を持たず、番号 badge の昇順が依存順 (前提が先) を表す。各ステーションを click すると同順で並ぶ対応 `FlowStepCard` の anchor へ scroll する。step の中身 (source・件数明細・note・依存リンク・warning/error) は本体 `FlowStepCard` 側に置いて重複させない。

### 登録フロー詳細カード (FlowStepCard)

各 `FlowStepCard` は「**外部の登録ウィザードへ進む前の予告**」として振る舞う。利用者が DDBJ の service 構造を知らなくても、そのステップで何が起きるか・先に何が要るか・何を準備するか・押すとどこへ行くかが読めることを目的とする。登録自体は外部ページで行い portal は代行しない (`## 範囲と制約`)。

カードは役割で内容を出し分ける。表示ブロック (ヘッダ / 概要 / 先に済ませること / 対象データ / 準備するもの / 外部での手順 / 注意 / 外部リンク) の構成と出し分け・データ源 (i18n / 導出 / content) は `flow-cards/flow-step-card.tsx` と content (`submit-routing/cards` の `prepare` / `wizardSteps` / `gotcha` / `issuedNote`) が SSOT。「対象データ」ブロックは対象の種別をラベル + アイコンで示す (ファイル名・拡張子は持たない)。役割ごとの差:

- **destination** (dra/jga/gea/ddbj-trad/nsss/metabobank/togovar): 全ブロックを持つ主役カード。外部ウィザード予告と準備リストを要とする
- **companion** (bioproject/biosample): 「別個の登録先ではなく、フロー全体で共通して埋めるメタデータ」と明示する軽量カード。多くの登録ウィザードの最初のタブで作成/参照する位置づけ
- **external** (humandbs/jpost/eva): DDBJ 外の窓口。Policy ゲート (humandbs) は「先に済ませる前提」を強調し、jpost/eva は「専門リポジトリへの誘導」を述べる

登録後に発行される accession は、利用者が登録前にはまだ持っていないため **カードの主要素にしない**。一方で引用 ID を発行する service (`submit-routing/cards` で `issuedNote` を持つもの) は、外部リンク脇に muted で「登録すると <論文引用 ID> が発行されます」と統一文で予告する (先に取得が要る Policy の JGAP も同じ `issuedNote` で予告)。誘導ボタンのラベルは、登録は外部サイトで行うという一点で全 service 共通とし、i18n の単一キーで持つ。

---

## データ種別の選択 UX

中段は **データ種別の on/off トグル群** で、利用者は手元にある種別を選ぶ。種別は前段 Q1/Q2 のカスケード (`## 前段カスケード・フィルタ`) で enable/disable され、disable の種別は理由を tooltip で示す (選んでも宛先が無い種別を選ばせない)。同一種別は高々 1 個で、種別間の依存による相互 disable は持たない (`## 設計判断` の「種別間の相互排他は持たない」)。

公開区分 (access) は per-file では持たず、Q1 = 公開+制限 のときだけ access-sensitive な種別 (`## 公開区分 (access) の規約`) に open/restricted トグルとして出す。default は Q2 由来で、ヒトは restricted、非ヒトは open から始める。公開 / 第三者 のときは access UI を出さない (全種別 open)。

flow-changing 詳細質問 (`### 詳細質問の選別基準`) を持つ種別は、その下の `DataDetailPanel` で答える。各種別の詳細カードは種別をラベル + アイコンで示し (ファイル名・拡張子は持たない)、未設定 (`rowIsConfigured` が false) のものは `未設定` notify を出して入力を促す。詳細質問を持たない種別 (`sequence-read` / `variant` / `expression-matrix` / `microarray-expression` / `nmr` / `metabolite-assignment`) は notify を出さない。種別の選択解除はトグルを off にするだけで、確認を挟まず即時に反映する。

### データ詳細パネル (DataDetailPanel)

選択された種別のうち flow-changing 詳細質問を持つものを **最初から展開** する。各種別はその質問 (radio / check) を持ち、選択は即座に submission へ反映される (live commit、下書きを持たない)。質問を持たない種別は panel に現れない。種別を増やすときは form definition (`detail/form-defs.ts`) に 1 エントリ追加すれば panel 側に分岐コードを書かずに済む。

設定状態 (`rowIsConfigured`) は **「フォームの各ラジオ群で 1 つ以上選択されているか」** で決まる。既定値がそのまま妥当な答えになる種別 (`単独配列` / `単独アノテーション`) は最初から `設定済み`、既定では何も選ばれていない種別 (`spatial` / `mass-spectrometry`) はプラットフォーム / ドメインを選ぶまで `未設定` になる。`TagProgress` の母数はこの「詳細質問を持つ種別」で、質問のない種別は設定対象が無いため完了として数える (`countConfiguredRows`)。設定状態の判定 (`rowIsConfigured` / `countConfiguredRows`) は `app/features/submit/state/selectors.ts`、選択値のマッチと commit 値生成 (`optionMatches` 等) は `detail/form-apply.ts` の純関数が SSOT。

配列 + アノテーションのペア (`assembly-annotation`) は、配列 (FASTA) とアノテーションをともに選び、`sequence-annotation` の質問で `配列ペア` を選ぶと両者を同 group に束ねる。種別は高々 1 個ずつなので相方は一意に定まり、配列を選んでいなければアノテーション側は `未設定`、揃えば両方 `設定済み` になる (`単独アノテーション` に戻すとペアは解消する)。

---

## validation 検査軸

`selectValidations(state)` (純粋関数) が次を検査する。各 validation は i18n key + 該当種別を含み、click で該当箇所を scroll into view する。

- `precondition-conflict`: 前段 Q1/Q2 で disable された種別が選ばれたまま残っている
- `no-destination-service`: その種別がどの destination service step にも入らない
- `dangling-group-id`: ペア (`assembly-annotation`) の group 参照が崩れている (UI バグ検知)

---

## SSOT とデータ管理

Tier1 ルーティング・カタログと FileTypeKind の付帯情報 (種別・ファイル形式の概要 / 区分 / DDBJ URL) は、情報量が最多の 1 ソースを canonical とし、そこから派生する形で管理する。

```
canonical 1 ソース (DDBJ 由来、内部整合を機械検証)
   ├→ enum 層 (vocabulary.ts / service.ts)       flow-rules / PBT が参照する唯一の境界・人間レビュー対象
   ├→ データモジュール層 (content/submit-routing)  ルーティング・カタログ + 付帯情報、低摩擦更新
   └→ i18n 層 (resources/{ja,en}.ts)             表示テキスト、翻訳忘れ検出 PBT 管轄
同期は codegen でなく起動時 Zod + parity test で担保
```

- **値域 enum と表示テキストを分離**: enum (`vocabulary.ts` / `service.ts`) = flow-rules/reducer/PBT が参照する唯一の境界・人間レビュー対象。付帯情報 = content モジュール。翻訳 = i18n
- **更新運用の分離**: enum 値の増減 = flow-rules/PBT に波及する意味論変更 → 人間レビュー必須ゲート (parity test が落として知らせる)。概要・区分の変更 = 説明テキスト → content/i18n 修正で低摩擦
- **登録フロー詳細カードの service 別文言** (外部ウィザード手順の要約 `wizardSteps`・準備物 `prepare`・静的 `gotcha`・発行 ID 予告 `issuedNote`) は `app/content/submit-routing/cards.ts` の `SUBMIT_CARDS` (service ごとの bilingual データモジュール、`Record<Service, …>` で網羅を型固定) に集約する。カードの汎用ラベル (見出し・役割タグ) は i18n、service 名・概要は i18n (`submit.flow.<service>`)、誘導 URL と source は content/services に置く。文言は DDBJ 公式の登録手順 (`ddbj/www` の各 service `submission*.md` / `web-submission*.md`) を根拠とし、ja/en 揃わない文言は出さない
- DDBJ 由来データと現 portal の差分は `## 設計判断` に記録する

---

## 設計判断

submit ナビが採る登録先導出の設計判断とその公式根拠・トレードオフを記録する。routing の詳細規約は前段の該当セクションが持つ。

- **典型ケースに絞る (多段・多 Dataset の表現を持たない)**: navigator は「1 種別 = 1 つの論理データ」を出発点とし、1 提出内で同一種別を複数ファイルに分けて段階や属性を割る高度ケースは単一ガイド step に簡約する。具体的には (1) メタゲノムアセンブリ (MAG) / 単一増幅ゲノム (SAG) の生リード→primary→binned→MAG/SAG の多段チェーンと複数 BioSample (derived_from 放射状) は持たず、`ddbj-trad` の ENV/SAG ゲノムエントリと「生リードは DRA に出す」note に簡約する。(2) JGA の Policy 単位 Dataset 分割は持たず、「Policy 承認 (humandbs) → JGA 登録」の単一ガイドにする。これらの段構造・Dataset 分割は各登録ウィザード側の Intra-DB の話であり、複数ファイルを束ねる入力を navigator に持たせるとシンプルさが相殺されるため。同一種別の公開版+制限公開版を 1 提出で同時に出す等の「同一種別の多重化」も対象外とし、必要なら提出を分ける
- **公開区分 (access) は種別単位・per-file 混合を持たない**: access は種別単位で持ち、ファイル単位の公開/制限の混合は持たない (UI 規約と default は `## 公開区分 (access) の規約`)。種別間の混合 (制限公開 reads → JGA + 公開発現 → GEA) は navigator が 1 画面で全経路を見せる価値があるため許容する。access の SSOT は Q1/Q2 に一本化される
- **種別間の相互排他は持たない**: 種別を選ぶほど他種別を disable するような種別間依存は導入しない。11 種別の `candidateRepos` は独立した destination に散っており、DDBJ 公式の登録手順にも「この 2 種別は同一提出に共存不可」という根拠が無い。reads + variant + expression のような multi-omics の 1 提出は正当であり、種別間 disable はそれを誤ってブロックするだけで、`no-destination-service` / `cascade-no-deadend` の構造保証とも衝突する。種別の絞り込みは前段 Q1/Q2 カスケードだけが担う
- **生物軸は Q2 のみ**: 種別単位の細かい生物分類は持たない。Q2 (生物ドメイン) と重複し、細かい生物種は BioSample の Intra-DB Tag で扱うため。これに伴い「organism ごとに BioProject を分裂させ、BP ≥ 2 で Umbrella を出す」挙動は持たず、実 DDBJ の **「1 BioProject + 複数 BioSample」** に合わせる (BioSample の数・生物種は Intra-DB で確定する)
- **FileTypeKind は一次登録単位のみ**: 附随メタデータ・付随ファイルを独立種別にせず Intra-DB Tag / 追加ファイル枠に降ろす (値域と扱いは `## Controlled vocabulary` の FileTypeKind)。公式 docs がこれらを Sample メタデータ・付随ファイルと位置づけるため
- **filename / 拡張子を持たない**: navigator は実ファイルを読まず登録もしないため、ファイル名や拡張子は経路導出に寄与しない。中段・詳細カード・フロー詳細カードは種別をラベル + アイコンで示し、ファイル名の自動採番や拡張子の表示は持たない。配列 + アノテーションを「拡張子を除いてファイル名を揃える」という DDBJ MSS の実運用要件は、ファイル名表示を持たないため Step note で「配列とアノテーションは対応づけて提出する」と表現する
- **JGA はヒト個人のみ (メタゲノムは含めない)**: `access = restricted ∧ Q2 = ヒト` を唯一の JGA 分岐条件とする (公式根拠と embargo 代替は `### JGA は「ヒト個人」限定`)。ヒト宿主のマイクロバイオームの要望が生じても「由来がヒト個人か」は Q2 (生物ドメイン) と別軸であり、`Q2 = metagenome` を JGA トリガにはしない
- **Service は role 付きの単一 enum**: 利用者向けの登録エンドポイントと内部 service はほぼ 1:1 なので、別 enum を 2 本持たず role (destination / companion / external) で区別する (role の割り当ては `## Service と role / 外向き契約`)
- **制限公開ヒトの Policy 窓口は `humandbs` 1 つに統合する**: 提供申請 (data submission application) と利用制限ポリシー (NBDC 標準 / 独自 JGAP) は、いずれも DBCLS が運営する NBDC ヒトデータベース (HumanDBs) という単一プラットフォームで完結する。別 service (`humandbs` と `dbcls`) に分けると JGA フローに重複した外部窓口カードが 2 枚出て利用者を混乱させるため、`humandbs` 1 service・1 step に統合する (submit の Service enum から `dbcls` を持たない)。なお news / services 機能が情報「源」として扱う `dbcls` (NewsSource / ServiceSource) は別概念であり submit の統合とは無関係
- **塩基配列の窓口は MSS と NSSS の 2 つ**: 「DDBJ」の登録先 DB は 1 つだが投入窓口が 2 つあり、両者を別 destination service (`ddbj-trad` = MSS / `nsss` = NSSS) として持つ。振り分け基準・規模境界の note 案内は `### MSS / NSSS の振り分け`。リードは対象外で DRA に回る
- **変異の登録先はヒト/非ヒトと公開区分で割れる**: 公開ヒト → `togovar`、制限公開ヒト → `jga`、非ヒト (公開/制限問わず) → `eva`。TogoVar はヒト専用なので非ヒトを警告で済ませず `eva` を実 emit する。短い/構造バリアントの差は TogoVar・EVA いずれも同 service 内の登録種別差で出る service を変えないため Intra-DB Tag で扱い、reference 配列の有無も公式に routing 軸が無く同様 (`variant` は詳細質問を持たず行先は Q2 + access で確定)。旧 DGVa は EVA に統合済みで独立 service にしない。TogoVar の reference assembly 制約 (GRCh37/38 等) は一次情報未確認のため hard-constraint にせず登録時 validator に委ねる
- **proteomics は jPOST (DDBJ 外)、ただし生の質量分析のみ**: 質量分析のうち proteomics (プロテオーム) は MetaboBank でなく `jpost` (jPOSTrepo) に出す。metabolomics / NMR / MSI イメージングは `metabobank`。proteomics は出る service が変わる flow-changing なので `mass-spec-domain=proteomics` を warning note でなく `jpost` の emit に接続する。**proteomics 分岐が意味を持つのは生の質量分析 (`mass-spectrometry`) だけ**であり、NMR は metabolomics 専用 (MetaboBank が NMR を受け jPOST は受けない、`_metabobank/datafile-e.md`)、`metabolite-assignment` (MAF) も metabolomics の成果物で jPOST 経路を持たない。したがって `nmr` / `metabolite-assignment` は `mass-spec-domain` 質問を持たず MetaboBank 一択とする。MSI イメージングは MetaboBank 内のファイル要求差 (出る service は不変) なので groupType `imaging-ms` で構造を表し data-detail chip 値にはしない
- **空間 Tx の platform は recipe で実 DRA step を出す**: `spatial-platform` は GEA Submission Type と DRA 2 段の要否を変える flow-changing 軸なので、note 止まりにせず Tier2 `spatial` recipe で Sequencing platform に実 DRA step を emit する (platform 値域・分類・MERFISH 画像の外部誘導は `### spatial` / `### 発現・空間の DRA 2 段`)
- **`assembly-form` は MAG/SAG の `ddbj-trad` 分岐の軸**: `assembly-form` が routing で意味を持つのは `mag` / `sag` の値による `ddbj-trad` (ENV/SAG ゲノムエントリ) への分岐だけである。WGS/GNM/TSA/TLS/EST/HTG/HTC/GSS は全て同じ `ddbj-trad` 行きで出る service を変えないため、これらは `assembly-form` の値域に持たず Step カードの MSS data type pulldown (Intra-DB Tag) で扱う。チェーン内の段階 (生リード/primary/binned/MAG) は持たない (典型ケースに絞る)
- **第三者 (TPA) は提出単位 (Q1) で扱い種別ごとには問わない**: 配列系の TPA → `ddbj-trad` (MSS、引用元 INSDC accession 必須。`_ddbj/tpa-e.md` / `_ddbj/web-submission-e.md`: TPA は NSSS では受け付けず MSS のみ)、メタボローム再解析 → `metabobank`。TPA か否かは 1 提出まるごとで決まる軸なので前段 Q1 だけで判定し、種別ごとの `provenance` 質問・chip は持たない (Q1 と二重に問わない)。種別で割れるため Q1 = 第三者 で振り分け不能な種別は disable される
- **`assembly-annotation` は 1 step**: 配列 + アノテーションは MSS の 1 ファイルペアであり、配列登録 step とアノテ step に分けない
- **登録フロー詳細カードは「外部ウィザードの予告」とする**: 登録は外部ページで完結し portal は代行しないため、各 `FlowStepCard` は外部の登録ウィザード (`ddbj/www` の `submission*.md` 等) で何をどの順で行うかを予告し、依存ゲート (例 JGA は Policy 承認後にアップロード) を伝える役割に徹する。登録後にしか得られない accession 書式はナビ価値が無いため主要素から外す。カード構成・accession の添え方・順序の導出は `### 登録フロー詳細カード (FlowStepCard)` と `### ステップ依存とカード順序`

---

## i18n リソース

`app/lib/i18n/resources/{ja,en}.ts` の `Resources.submit` 配下に submit 用キーを追加する。ja / en 両方で完全一致が PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) で担保される。key 集合はカタログの `note.messageKey` 値と完全一致させる。en 未供給の説明は ja/en が揃うまで i18n に出さない (parity test が常時赤になるのを避ける)。

---

## 範囲と制約

- submit features は外部 API を呼ばない (navigator のみ)
- zones / lint 制約 (生 hex 禁止、`react/forbid-elements` で生 button / input / select / textarea 禁止、arbitrary value 禁止) は `architecture.md` に従う
- 新 primitive 追加は `docs/frontend.md` の「UI primitives」 の手順を経由する
