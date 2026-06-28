# 登録ナビゲーション (submit)

DDBJ の登録窓口は service ごとに分かれており、利用者は最初に「自分のデータの DB は何か」を選ばされる構造になっている。submit ナビゲーションは、利用者が手元のデータの性質を答えるだけで、登録経路 (どの登録先に何を出すか) を BSI 側で導出して可視化する UI である。

---

## 概念

### 「自分のデータの DB は何か」を訊かない設計

利用者は登録窓口に来た時点では、DDBJ の service 構造 (BioProject / BioSample / DRA / JGA / DDBJ / GEA / MetaboBank …) を必ずしも理解していない。「自分が持っているのは FASTQ で、ヒトの制限公開データ」のような **データ側の言葉** で考えている。

submit ナビゲーションはこの状態を出発点とする:

- 利用者は前段で「生物ドメイン」を答え、ヒト由来データの場合は「公開区分」を設定する
- 続いて「手元にあるデータ種別」を **on/off で選ぶ**。各種別は前段 Q2 で enable/disable される
- BSI が controlled vocabulary と純粋関数で「どの登録先に何を出すか」を導出する
- 利用者は導出結果 (Step カード) を見て、各 Step の Intra-DB Tag (DDBJ の Division、BioSample の生物種・package、DRA Library Strategy 等) を埋めていく

この向きで「service の存在は知らなくて良い」状態を担保する。

### 3 段構造

UI 全体は前段フィルタを足した 3 段構造になる:

```
┌─────────────────────────────────────────────────────────────┐
│  前段: 登録前提                                               │
│   - Q2 生物ドメイン (単一選択・後段の絞り込みカスケード)       │
│   - ② 公開区分 (ヒト時のみ active・非ヒト時は disable 表示)   │
│     制限公開の希望・個人識別符号の有無・非制限公開の根拠を      │
│     設定し、access を種別ごとに導出する (per-file 反転可)      │
├─────────────────────────────────────────────────────────────┤
│  中段: データ種別の選択 (手元のデータ種別を on/off で選ぶ)    │
│   - 各種別 = 1 つのトグル。Q2 で enable/disable               │
│   - flow-changing 詳細 (platform / MAG/SAG / TPA) は          │
│     種別ごとの詳細カードで答える                             │
├─────────────────────────────────────────────────────────────┤
│  下段: 登録先サマリーカード (導出結果 = FlowStep)              │
│   - 1 枚のカード内に step をリスト表示                        │
│   - service バッジ + role タグ + source タグ + scope 件数      │
│   - 各 service の詳細ページ (/databases/$slug) へのリンク      │
│   - 登録サイトへの外部リンク                                  │
└─────────────────────────────────────────────────────────────┘
```

下段は **中段の関数** であり、利用者は下段を直接編集しない。前段は中段の選択肢を絞り、公開区分は access を導出する。下段に欲しい結果を出すために中段で種別を選び、中段の選択肢を狭めるために前段を調整する、という編集モデル。この 3 段は画面では 2 pane に割り付く: 前段 + 中段 (入力) を左 pane、下段 (結果) を右 pane に置く。右 pane は access の導出結果 (公開/制限) も表示する。各 step の詳細（登録手順・事前準備・注意事項）は `/databases/$slug` の各 service ページに委ね、サマリーカードからリンクする。

### Cross-DB Tag / Intra-DB Tag

submit の controlled vocabulary は 2 種類の文脈で使われる:

- **Cross-DB Tag**: 全 service に共通する分類軸。`Q2`, `② 公開区分`, `FileTypeKind`, `Access`, `ChipAxis` のように、どの登録先に出すかを決める前段の情報
- **Intra-DB Tag**: 特定の service 内で使う controlled vocabulary。`DDBJ の Division × data type`, `BioSample の生物種・package・サンプル属性 (表現型)`, `DRA Library Strategy` のように、step 単位で出す pulldown 群

Cross-DB Tag は前段フィルタ / 種別トグル / 種別ごとの access・詳細回答で表現、Intra-DB Tag は Step カード内の pulldown で表現する。生物種のような細かい分類は Cross-DB ではなく Intra-DB Tag (BioSample) で扱う。

### 詳細質問の選別基準

種別の「データ詳細」質問に持ってよいのは、**その答えで導出される `FlowStep[]` が変わる (flow-changing) 軸だけ** とする。具体的には destination service の集合が変わる・必須 step が増減する・scope の束ね方が変わる軸を指す。出る service / step を変えない細部は詳細質問にせず、登録先が決まってから Step カード内 Intra-DB Tag (pulldown) で埋める。利用者は「フローが変わる問い」だけを答え、各 DB の細部は後で埋める、という負荷分散になる。

判定の物差し (この基準は DDBJ 公式の登録手順が flow 分岐に使っている軸と一致させる。値の根拠は `ddbj.nig.ac.jp` のソース):

| 区分 | 例 | 置き場所 |
|---|---|---|
| flow-changing・**前段**で判定 | Q2 ヒト/非ヒト (variant→JGA/EVA, reads→DRA/JGA) / ② 公開区分 (JGA 分岐) / `hasIdentifier` (個人識別符号の有無で全 restricted ↔ 種別ごと) | 前段 Q2・② 公開区分 |
| flow-changing・**種別ごと**に判定 | `assembly-form` ゲノム/MAG/SAG/ハプロタイプ (`ddbj` ENV genome 経路・`umbrella-bioproject` 導出) / `has-annotation` アノテーション有無 (ゲノム + アノテーションなし → unannotated 経路) / `tpa` (TPA→MSS) / `small-scale` (小規模→NSSS) / `spatial-platform` (Sequencing→DRA+GEA / Microarray→GEA) / `expression-source` (NGS 由来→DRA+GEA / Non-NGS→GEA のみ) / `identifiability` (上部 `hasIdentifier` radio に対する種別単位の反転上書き。DRA/DDBJ/EVA ↔ JGA) | データ詳細 (種別ごとの質問) |
| service / step 不変・DB 内部の細部 | reads の single/paired/10x/多重化 (DRA Library Layout・Instrument・BioSample 粒度) / 発現の MAGE-TAB・アレイ single/two-color (GEA 内の形式・IDF/SDRF) / variant の reference 有無・SNP/SV (EVA 内登録種別) / 質量分析の測定方式・MSI イメージング (MetaboBank 内のファイル差) / MSS data type の WGS/TSA/TLS/EST/HTG/HTC/GSS / BS package / DRA Library Strategy | Step カードの Intra-DB Tag pulldown |

詳細質問は「flow-changing・種別ごと」の軸だけを持つ。該当軸が無い種別 (`microarray-expression` / `metabolomics` / `proteome`) は **詳細質問を持たず、詳細カードを出さない** (行先は前段 Q2 + ② 公開区分で確定する)。TPA は `sequence` 種別の ChipAxis として持ち、TPA 対象外の種別には出さない。`identifiability` は `sequence-read` / `sequence` / `variant` 種別の ChipAxis として Q2=human 時に表示し、非ヒト Q2 では出さない。chip の文言と効果は上部 `hasIdentifier` radio の値によって反転する (Yes 時は「該当しない (open に逆転)」、No 時は「該当する (restricted に逆転)」)。

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

- **Q2 (生物ドメイン)**: 「ヒト」「ヒト以外の真核生物」「原核生物」「ファージ・ウイルス」「環境サンプル (メタゲノム)」。前段の単一選択で、**submission 全体の唯一の生物軸**。種・属レベルの phylogeny は持たない (それは BioSample の Intra-DB Tag で扱う)。`human` (ヒト個人由来) のみが ② 公開区分の active 化と JGA への分岐起点になり、`metagenome` (環境サンプル) は非ヒト扱いで JGA に入れない (`### JGA は「ヒト個人」限定`)
- **② 公開区分 (accessSection)**: ヒト時のみ active (非ヒト時は表示 + 全体 disable)。5 つの入力 (1 トグル + 1 radio + 3 トグル) で「制限公開の希望」「個人識別符号の有無 (radio、default Yes)」「公開区分の根拠 (倫理指針 / 一般入手 / 微生物)」 を設定し、access を**種別ごとに**導出する。radio が Yes (含む) のあいだは全種別 restricted (= JGA 行き) に倒れ、No に切り替えると倫理指針の種別ごとロジックや一般入手の全 open ロジックに委ねられる。同一 submission 内で制限と公開が混在しうる。詳細は `## 公開区分 (access) の規約`
- **FileTypeKind**: データファイルの種別で、**真の一次登録単位だけ**を値域とする (配列リード / 塩基配列 / バリアント / 発現マトリクス / マイクロアレイ / 空間トランスクリプトーム / 空間画像 / メタボロミクス / プロテオーム)。中段の選択トグルの単位で、利用者は手元にある種別を on にする (同一種別は高々 1 個)。附随メタデータ (表現型・サンプル属性) は BioSample の Intra-DB Tag、付随ファイル (processed 画像 / 解析レポート / 可視化オブジェクト) は主データ step の追加ファイル枠で扱い、FileTypeKind には含めない。ベンダー raw データも独立種別を作らずメタボロミクスの file_format に含める
- **Access**: `open` / `restricted`。**per-file の混合を持たず種別単位**で扱う軸。② 公開区分の導出結果として**種別ごとに**値が入る (`## 公開区分 (access) の規約`)。`hasIdentifier` radio が Yes (default) なら全種別 restricted。No に倒すと倫理指針 ON 時は個人識別性のある種別 (配列リード等) が restricted、ない種別 (発現マトリクス等) が open になり、同一 submission 内で値が分かれうる。`restricted ∧ Q2 = ヒト` の組合せが JGA への分岐起点で、restricted な種別が JGA に振られる。非ヒトは既定 open で INSDC が制限公開を持たないため DRA に公開予定日 (embargo) 付きで出す
- **ChipAxis**: 前段で表現できない、かつ **出る service / step を変える (flow-changing)** 細部区分を、種別ごとの `{axis, value}` ペアで表現する。`assembly-form` (ゲノム / MAG / SAG / ハプロタイプの 4 択 radio。MAG/SAG を `ddbj` ENV genome 経路に振り分ける、ハプロタイプの `umbrella-bioproject` 導出) / `has-annotation` (アノテーション付きかどうかのトグル。`assembly-form=genome` でアノテーションなしの場合に unannotated 経路に分岐) / `tpa` (TPA → MSS。`sequence` 種別のみ。MAG/SAG/ハプロタイプ選択時は disabled) / `small-scale` (小規模 → NSSS。`sequence` 種別のみ。MAG/SAG/ハプロタイプ選択時は disabled) / `spatial-platform` (GEA Sequencing/Microarray・DRA 2 段の振り分け) / `expression-source` (発現マトリクスの由来。`ngs` で DRA+GEA 2 段、未選択で GEA のみ) / `identifiability` (上部 `hasIdentifier` radio に対する **per-file の反転上書きスイッチ**。`sequence-read` / `sequence` / `variant` の 3 種別で Q2=human 時に表示。値域は `non-identifiable` / `identifiable` の 2 値で、上部 radio が Yes なら `non-identifiable` で当該種別だけ open に逆転、上部 radio が No なら `identifiable` で当該種別だけ restricted に逆転する)。出る service を変えない区分 (バリアントの SNP/SV、MSS data type の WGS/TSA/TLS 等) は chip にせず Step カードの Intra-DB Tag で扱う (`### 詳細質問の選別基準`)。`assembly-form` の routing 上の意味は `## 設計判断` を参照
- **GroupType**: 複数ファイルが論理的に 1 単位を成す関係 (MAGE-TAB、imaging-ms 等)。経路導出の分岐要素として効く。詳細は `### group と Tier1 分岐` を参照
- **Service**: 登録先・導出物・外部誘導を表す単一の enum。各値は **role** を持つ (`destination` = 利用者のデータが行く登録先 / `companion` = submission 全体に共通する導出物 / `external` = DDBJ 外への誘導)。詳細は `## Service と role / 外向き契約`

### INSDC 公式との突合

INSDC (NCBI / ENA / DDBJ の 3 機関共通) との関係:

- DRA `Library Strategy` は INSDC 共通 vocabulary。`vocabulary.ts` は INSDC 公式と一致する値域を持つ
- BS package のうち SARS-CoV-2 系統と DDBJ 拡張は DDBJ ローカル

INSDC 公式 vocabulary が更新されたら `vocabulary.ts` の enum を直し、本書は触らない (二重源泉化しない)。

---

## 前段カスケード・フィルタ

Q2 → 種別 (FileTypeKind) の順に選択肢を絞る。各 Q2/FileTypeKind オプションは **対応する登録エンドポイント集合** を持ち、絞り込みは集合で閉じる。以後この集合を `repos` と呼ぶ。

```
allowedRepos = Q2.repos
種別 enable  ⟺  KindRoute.candidateRepos ∩ allowedRepos ≠ ∅
```

カスケードは **rules を実行せず repos フィールドを読むだけ** で判定する純関数であり、経路導出 (rules 実行) と同じカタログの別の読み方になる (二重管理が起きない)。

Q2 = human の `repos` は JGA を含む全 destination で、非ヒト Q2 の `repos` は JGA を除く公開系 destination。access の導出は ② 公開区分が担い、カスケードは種別の enable/disable のみに専念する。

### デッドエンドが構造的に 0 になる規約

Q2 が種別を disable するため、`allowedRepos = ∅` の組合せや「選んでも宛先が無い種別」は選択不能になる。これを PBT で固定する (`## 経路導出と不変量` の `cascade-no-deadend`)。

前段は種別の enable/disable を決め、② 公開区分は access を種別ごとに導出する (`hasIdentifier` radio + 補助トグル + per-file 反転 chip の組合せで混在しうる)。種別を選んだ後は `ChipAxis`・詳細回答が経路導出を駆動する (生物 = ヒトかは Q2、公開区分は ② で判定)。

---

## 公開区分 (access) の規約

`Access` は `open` / `restricted` の 2 値。**per-file の混合を持たず、種別単位**で扱う。② 公開区分が access を**種別ごとに**導出する。`hasIdentifier` radio が Yes (default) のあいだは全種別 restricted、No に倒すと倫理指針の種別ごとロジックや一般入手の全 open ロジックに委ねられ、同一 submission 内で制限と公開が混在しうる。

### 個人識別性 (identifiability)

個人情報保護法施行規則の「個人識別符号」(全ゲノム配列・全エキソーム配列・全ゲノム SNP データ等) に該当しうるかを上部 `hasIdentifier` radio で **submission 全体に対して 1 回** 答える。default は安全側 (Yes = 含む)。Q2=human 時のみ active。

per-file の個別反転は `identifiability` ChipAxis で表現する。chip の効果は上部 radio に応じて逆転する (`### ② 公開区分 (accessSection)` の導出ルール参照)。

`IDENTIFIABLE_KINDS` (`app/schemas/submit/vocabulary.ts`) は、上部 radio が No (含まない) + 倫理指針 ON のときに「ヒト研究なら個人識別符号該当の 3 種別だけ安全側で restricted」 とする種別ごと既定値を表す:

| 種別 | 個人識別性 | 根拠 |
|---|---|---|
| 配列リード | **あり** | 生リード = 個人ゲノム。個人識別符号に該当 |
| 塩基配列 | **あり** | アセンブリ済みだが個人レベル SNP を含みうる |
| バリアント | **あり** | 個体 genotype = 個人識別符号。頻度データは非該当だが現状の種別粒度で分離不可。全体を該当扱い |
| 発現マトリクス | なし | 集約データ。法的には非該当 |
| マイクロアレイ | なし | 発現・methylation は非該当。SNP genotyping は該当するが上部 radio = Yes で対処 |
| 空間 Tx / 空間画像 | なし | 空間座標付きデータ。個人識別リスクは低い |
| メタボロミクス | なし | 代謝物プロファイル。低リスク |
| プロテオーム | なし | タンパク質プロファイル。低リスク |

### ② 公開区分 (accessSection)

ヒト時のみ active (非ヒト時は表示 + 全体 disable → 全種別 open)。1 トグル + 1 radio + 3 トグルで構成し、access を種別ごとに導出する:

```
[⬛] 制限公開を希望する                      ← default OFF
     ON → 全種別 restricted、下の radio + 3 条件 disable

(◉) 個人識別符号を含む / ( ) 含まない        ← default = 含む (Yes)
     sub: 全ゲノム配列・全エキソーム配列・全ゲノム SNP データ等
     Yes → 全種別 restricted、下の 3 条件 disable

▼ 公開区分の根拠 (制限=OFF かつ radio=No のとき)
[■■] 倫理指針に沿ったヒト研究                ← default ON  → 種別で分かれる
[⬛] 一般入手可能な試料の解析                ← default OFF → 全種別 open
[⬛] 微生物自体の分析 (ヒト配列除去済み)     ← default OFF → 全種別 open
```

**導出ルール** (SSOT は `app/features/submit/access.ts` の `deriveAccess` 純関数、優先度の高い順):

| 条件 | access | 根拠 |
|---|---|---|
| 非ヒト (Q2 ≠ human) | 全種別 open | INSDC は制限公開を持たない。非公開は embargo |
| 制限公開を希望する = ON | 全種別 restricted | 利用者の明示的な制限希望。安全側 |
| `hasIdentifier` = Yes (default) | 全種別 restricted。chip = `non-identifiable` の種別だけ open に逆転 | 個人識別符号を含む = 法的に制限公開対象 |
| 倫理指針に沿ったヒト研究 = ON (default、`hasIdentifier`=No 時) | **種別で分かれる** | `IDENTIFIABLE_KINDS` で既定値を決め、chip があれば `non-identifiable` / `identifiable` で上書き |
| 一般入手可能な試料の解析 = ON | 全種別 open。chip = `identifiable` の種別だけ restricted に逆転 | 倫理指針の適用外 (policies-e.md:270) |
| 微生物自体の分析 (ヒト配列除去) = ON | 全種別 open。chip = `identifiable` の種別だけ restricted に逆転 | 倫理指針の適用外。ヒト配列除去が条件 |
| 上記いずれにも該当しない | 全種別 restricted | 安全側 fallback |

**デフォルト状態 (ヒト)**: `hasIdentifier` = Yes (default) → 全種別 restricted (JGA + Policy 申請)。「含まない」 を選んだ時に倫理指針 ON で `IDENTIFIABLE_KINDS` に従って分かれる。RNA-seq のように個人識別符号に該当しないリードデータを登録する場合は、上部 radio を No に倒した上で必要なら配列リードの `identifiability` chip で個別調整できる。

**排他制御**: 「制限公開を希望する」 = ON と `hasIdentifier` = Yes は**いずれも下のサブ条件を disable する強い意思表示**で、片方でも該当すれば下 3 トグル (倫理指針 / 一般入手 / 微生物) は disabled になる。「一般入手可能な試料」「微生物自体の分析」は倫理指針の**適用外**で、倫理指針 ON と同時に ON にするのは矛盾する。いずれかを ON にすると倫理指針が自動で OFF になり、倫理指針を ON にすると他 2 つが自動で OFF になる。「一般入手可能な試料」と「微生物自体の分析」は同時に ON にできる。

**根拠**: 旧 NBDC ヒトデータベースナビの画面2 (公開区分の希望) と画面3 (非制限公開の妥当性ゲート) を統合。客フィードバック「個別 genotype は JGA、集計頻度データは TogoVar 公開」 のような混在ケースを、上部 1 質問 + per-file 反転 chip で表現する。`restrictedPreference` と `hasIdentifier` は機能的に同じ「全 restricted トリガー」 だが、前者は主観的な希望、後者は客観的な事実 (個人情報保護法施行規則上の該否) を表す別軸として並置する。

### JGA 一般化

restricted な**全種別**が JGA に振られる。sequence-read → JGA Data、それ以外 → JGA Analysis (`_jga/submission.md`)。non-human reads の restricted は DRA に embargo を付ける (JGA 対象外)。いずれも Tier1 catalog の first-match で評価する。

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

例として `variant` 種別は、制限公開ヒトを `jga`・それ以外を `eva` に first-match で振り分ける。短いバリアント (≤ 50 bp) と構造バリアント (> 50 bp) は **同じ service 内の登録種別差** (EVA の short/SV) であって出る service を変えないため、詳細質問にせず Step カードの Intra-DB Tag (登録種別 pulldown) で扱う。`variant` 種別で **flow を割るのは Q2 (ヒト/非ヒト) と access** だけである。

### first-match が排他を保証する

`rules` は first-match のため、1 種別は同一カタログ内で高々 1 つのルールにマッチする。これにより「同じ種別が排他 service (JGA / DRA, JGA / EVA) の両方の scope に出ない」が機械的に成立する。否定 (NOT) は条件を先に置き末尾を `{always}` fallback にして順序で表す。

### group と Tier1 分岐

GroupType による分岐は、単一 group で完結するものを Tier1 (`emit.scope=group` または `groupType` 述語) で扱う。配置と意味は DDBJ 公式の登録手順に基づく。

| GroupType | 公式の実体 | 配置 |
|---|---|---|
| `mage-tab` / `two-color` | MAGE-TAB マトリクス → GEA | Tier1 (`groupType` 述語) |
| `imaging-ms` | imaging mass spec → MetaboBank | Tier1 (`groupType` 述語) |

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
| 発現マトリクスの DRA 2 段 (`expression-dra` recipe) | NGS 由来の発現マトリクスは生リードを DRA に出す cross-archive 2 段。`expression-source: ngs` 時に DRA step を emit |
| ハプロタイプの Umbrella BioProject (`haplotype` recipe) | DDBJ/NCBI 公式でハプロタイプ登録にはUmbrella BioProject が必須。`assembly-form: haplotype` 時に `umbrella-bioproject` companion step を emit |
| no-destination 警告 | 全種別評価後の集約 |
| 順序 / id 一意 / 同 service scope union | 出力整形 |

`named recipe` の集合は allowlist (`jga-submission` / `spatial` / `sequence-dra` / `expression-dra` / `haplotype`、`RECIPE_ALLOWLIST` が SSOT) として固定し、勝手に増えないことを PBT で担保する (Tier1 骨抜き防止)。BioProject / BioSample は通常 1 つずつの companion とする。

---

## Tier2 recipe 詳細

named recipe (`jga-submission` / `spatial` / `sequence-dra` / `expression-dra` / `haplotype`、allowlist 固定) は、薄インタプリタが確定した service+scope を受け、その上に submission 全体の構造を足す。

### jga-submission

制限公開ヒト個人データを JGA に出すための前提ゲートと companion 抑制を足す。JGA は SRA 系を拡張した独自エンティティ (Study / Experiment / Data / Analysis / Dataset / Policy。Dataset は Policy 単位でアクセス制御し、Policy は DAC を必須参照) を持ち、BioProject / BioSample を使わない。提供申請と利用制限ポリシー (NBDC 標準 / 独自 JGAP) は同一プラットフォーム (NBDC ヒトデータベース / HumanDBs) で完結する。

トリガー: いずれかの種別が `service = jga` に routing される (= `restricted ∧ Q2 = ヒト` の全種別。sequence-read → JGA Data、それ以外 → JGA Analysis)。

emit する FlowStep は「Policy 申請・承認」 (`humandbs`、JGA の前提ゲート。承認を得ないと JGA に登録不可) と「`jga` 登録」 (Tier1 が union した単一 JGA step)。companion: JGA は BioProject / BioSample を使わないため既定 companion を**抑制**する。Policy 単位の Dataset 分割は Intra-DB の登録単位の話として JGA 登録ウィザード側に委ね、navigator では「Policy 承認 → JGA 登録」の単一ガイドに簡約する (`## 設計判断` の「典型ケースに絞る」)。

不変量 (PBT 候補): jga が出るとき既定 BioProject・BioSample を emit しない / Policy ゲート (humandbs) が jga step より前に出る。

### spatial

発現・空間 Tx の platform が決める GEA Submission Type に応じて、生リード → DRA と processed → GEA の 2 段を構築する。**1 種別が複数 destination に出る**点が特徴で (group 間グラフではなく cross-archive 依存: raw が GEA より先に DRA に要る)、Tier1 の単一 emit に収まらないため Tier2 に置く。

トリガー: `spatial-transcriptomics` 種別で `spatial-platform` chip を持つもの。

platform → Submission Type 分類 (`_gea/spatial-gene-expression.md`)。対応 platform 値は `ALLOWED_CHIP_VALUES['spatial-platform']` が SSOT で、Sequencing 系の判定は `isSequencingSpatialPlatform` (`SEQUENCING_SPATIAL_PLATFORMS`) が SSOT:

| 分類 | 判定 | emit |
|---|---|---|
| Sequencing | `SEQUENCING_SPATIAL_PLATFORMS` に含まれる platform (Visium / Stereo-seq 系) | DRA Run (生リード) + GEA (processed) の 2 step |
| それ以外 (Microarray) | Sequencing 系でない platform (Xenium / MERFISH 系) | GEA のみ (DRA 無し) |

Sequencing platform は生リード (fastq/bam) を DRA に事前登録してから processed (GEX matrix・画像等) を GEA に出す 2 step、Microarray platform は GEA のみを emit する (具体の step / scope は `flow-rules/` が SSOT)。companion: 既定どおり BioProject 1 + BioSample 1。MERFISH 画像の Generalist archive は DDBJ service ではないため独立 step にせず GEA step の誘導 note で表す (`## 設計判断`)。

不変量 (PBT 候補): Sequencing platform の種別は dra step と gea step の両方に入る / Microarray platform の種別は gea step のみで dra step に入らない / どの platform でも種別は最低 1 つの destination service step に入る (no-orphan-destination 維持)。

### haplotype

ハプロタイプ登録に必須のUmbrella BioProject を companion step として追加する。DDBJ 公式 (`ddbj.nig.ac.jp/ddbj/haplotype.html`) および NCBI 公式 (`ncbi.nlm.nih.gov/genbank/eukaryotic_submission/`) で、diploid/polyploid assembly の各ハプロタイプは個別 BioProject を持ち、Umbrella BioProject で束ねる構造が必須とされる。

トリガー: `sequence` 種別で `assembly-form: haplotype` chip を持つもの。

emit する FlowStep は `umbrella-bioproject` (companion、Umbrella BioProject 作成の案内)。既定 companion (BioProject 1 + BioSample 1) はそのまま保つ。ハプロタイプの各 BioProject (Principal/Alternate 等) の構造は登録ウィザード側に委ね、navigator では「Umbrella BioProject → BioProject → BioSample → DDBJ」の線形ガイドに簡約する。

不変量 (PBT 候補): `assembly-form: haplotype` の種別は `umbrella-bioproject` step に入る / `umbrella-bioproject` は BioProject step より前に出る。

### recipe 共通の不変量

`## 経路導出と不変量` の構造不変量に足す、`RECIPE_ALLOWLIST` の全 recipe 横断の性質:

- **recipe-companion-override**: `jga-submission` は BioProject/BioSample をともに抑制、`spatial` / `expression-dra` / `haplotype` は既定 companion (BioProject 1 + BioSample 1) を保つ
- **recipe-no-orphan-destination**: recipe 適用後も全種別が destination service step に入る
- **recipe-service-exclusive**: 同一種別が排他 service の両方の scope に入らない

---

## Data model

submit 状態を表現する型は `app/schemas/submit/*.ts` を参照する (フィールド列挙はコード本体が SSOT)。

```
Submission
  ├─ preconditions          前段カスケードの選択 (Q2 生物ドメイン)
  ├─ accessSection          ② 公開区分 (4 トグルの状態)
  ├─ 選択された種別          種別ごと: 詳細回答 (flow-changing 軸)
  └─ ペア関係 (group)        MAGE-TAB / imaging-ms 等

(導出)
deriveFlowSteps(Submission) ──▶ FlowStep[]   下段カード (Submission を変更しない)
```

- 利用者は手元の種別を on にし (同一種別は高々 1 個)、種別ごとに flow-changing 詳細を答える。access は ② 公開区分 (`hasIdentifier` radio + 補助トグル + per-file 反転 chip) から種別ごとに導出される
- `FlowStep.scope` は groupIds か entryIds の少なくとも一方が非空 (`scope-nonempty` 不変量)

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
| recipe-allowlist | named recipe の集合が固定 allowlist (`jga-submission` / `spatial` / `sequence-dra` / `expression-dra` / `haplotype`) 内 |

**エンジン不変量** (Tier2 が後段で必ず保証):

1. **冪等性**: 同じ input に対して同じ output (sort も含む)
2. **空 Submission**: 選択種別が空なら steps は空
3. **BP / BS companion**: 種別が 1 つでもあれば bioproject step 1 と biosample step 1 が出る (`jga-submission` recipe が抑制する場合を除く)
4. **JGA / 公開 DB 排他**: 任意の種別について、`access = restricted ∧ Q2 = ヒト` なら JGA scope に、それ以外 (非ヒトや公開) なら公開系 destination scope に入る。同じ種別が両方に入らない (first-match で強化)。配列リード: restricted → JGA Data、open → DRA。それ以外: restricted → JGA Analysis、open → 各種公開 DB
5. **順序 (依存順)**: ステップ依存グラフ (`### ステップ依存とカード順序`) のトポロジカル順。前提ステップが依存ステップより前に出る。前提ゲート (Policy: humandbs、jga の前) → 共通メタデータ (bioproject → biosample) → 一次データ (dra) → 主登録先 → 外部リポジトリ (jpost/eva)
6. **id 一意 / scope 非空 / scope ⊆ submission 種別**

**構造不変量** (no-orphan-destination 等):

| 不変量 | 防ぐ事故 |
|---|---|
| no-orphan-destination | enable 種別 ≥ 1 の任意 submission で、各 enable 種別が bioproject/biosample 以外に最低 1 つの destination service step に入る |
| conflict-kind-no-step | 前段で disable された選択種別は step を生成せず、その entryId はどの step scope にも現れない (右 pane に無効な登録先を出さない) |
| cascade-no-deadend | 任意 q2 で enable された種別を選ぶと destination service が 1 枚以上出る (allowedRepos = ∅ や宛先なしの種別が選べない) |
| group-scope-completeness | `emit.scope=group` の step は flagged group の groupIds と、その group の enable な member を含む (disable された種別の member は scope に出さない) |
| access-derivation-consistency | 非ヒトは常に全種別 open。ヒト時の優先度は `restrictedPreference` > `hasIdentifier` > `ethicsCompliance` > `publiclyAvailable`/`microbialAnalysis` > fallback。`restrictedPreference` ON → 全種別 restricted。`hasIdentifier`=Yes → 全種別 restricted (`identifiability` chip = `non-identifiable` の種別だけ open に逆転)。`hasIdentifier`=No かつ `ethicsCompliance` ON → `IDENTIFIABLE_KINDS` で種別ごと既定 (chip があれば値で上書き)。`publiclyAvailable` or `microbialAnalysis` ON → 全種別 open (chip = `identifiable` の種別だけ restricted に逆転)。fallback → 全種別 restricted |
| spatial-dra-2step | Sequencing 系 platform の spatial 種別は dra と gea の両 step に入り、Microarray 系 platform の種別は gea のみで dra に入らない |

### ステップ依存とカード順序

service 間の前提関係を **ステップ依存グラフ** として宣言し、カード順序と「先に済ませること」ブロックの両方を駆動する。辺 (前提 → 依存先):

| 前提 | 依存先 | 根拠 |
|---|---|---|
| bioproject・biosample (共通メタデータ) | それを emit する全 destination | プロジェクト/サンプルを先に作り destination から参照する |
| humandbs (Policy ゲート) | jga | Policy 承認 (JGAP) を得ないと JGA に登録できない |
| dra | gea (sequencing 2 段) / ddbj (MAG/SAG) | 生リードを先に DRA に登録し processed/ゲノムから参照する |

カード順序 (不変量 #5) はこの依存グラフのトポロジカル順で、前提ステップが依存ステップより前に出る。前提ゲート (Policy: humandbs) → 共通メタデータ (bioproject → biosample) → 一次データ (dra) → 主登録先 → 外部リポジトリ (jpost/eva) の線形順がこのトポロジカル順を実現する (Policy ゲートと共通メタデータは JGA が companion を抑制するため同一フローに共存しない)。各 step の「先に済ませること」は、依存先のうち **そのフローに実在する** 前提ステップだけを参照する。

---

## Service と role / 外向き契約

Service は単一の enum で、各値が **role** を持つ。利用者向けの登録先 (destination)、submission 全体に共通する導出物 (companion)、DDBJ 外への誘導 (external) を role で区別する。accession 例と外部 URL は各 service の `app/content/services/*.content.tsx` が SSOT (本書は role と役割のみ)。submit カードは accession を主要素にせず、発行 ID の予告に意味がある service (`submit-routing/cards` の `issuedNote`) のみ外部リンク脇に muted で添える。

| service id | role | 役割 |
|---|---|---|
| `dra` | destination | リード / Run・Analysis。INSDC は制限公開を持たず、非ヒト制限公開は公開予定日 (embargo) で扱う |
| `jga` | destination | 制限公開**ヒト個人**データ (Dataset 単位アクセス制御)。restricted な全種別が JGA に振られる (sequence-read → JGA Data、それ以外 → JGA Analysis)。Policy 承認は DBCLS/NBDC に委譲。メタゲノム / 環境は対象外 (`### JGA は「ヒト個人」限定`) |
| `gea` | destination | 遺伝子発現 (発現マトリクス / マイクロアレイ / 空間)。NGS 由来は raw を DRA に出す 2 段 (`### 発現・空間の DRA 2 段`) |
| `metabobank` | destination | メタボロミクス (質量分析 / NMR / 代謝物アサインメント・MSI イメージング)。`metabolomics` 種別の一択先 |

| `ddbj` | destination | 塩基配列の一括登録のうち **MSS** (Mass Submission System) 経路。大規模・完成ゲノム・NSSS 非対応種別 (WGS / TSA / TLS / EST / HTG / HTC / GSS / TPA) と MAG/SAG の ENV/SAG ゲノムエントリを扱う。Division × data type の 2 軸で分類 |
| `nsss` | destination | 塩基配列の Web 登録 (Nucleotide Sequence Submission System)。MSS と同じ登録先 DB への並行窓口で、**小規模・非完成・NSSS 対応種別**を担う。MSS / NSSS の振り分け基準は `### MSS / NSSS の振り分け` |
| `umbrella-bioproject` | companion | ハプロタイプ登録時のUmbrella BioProject。各ハプロタイプの BioProject を束ねる。`haplotype` recipe が `assembly-form: haplotype` 時に emit |
| `bioproject` | companion | プロジェクトの束ね。種別があれば必ず生成 |
| `biosample` | companion | サンプルの束ね。実サンプル数・生物種は Intra-DB Tag |
| `eva` | external | 非ヒト variant の登録先 (EBI European Variation Archive)。短いバリアントも構造バリアント (旧 DGVa 相当) も EVA が受ける。dbSNP / dbVar は非ヒトの受付を終了 |
| `jpost` | external | プロテオーム (非 MS 含む) の登録先 (jPOSTrepo、ProteomeXchange メンバー、DDBJ 外)。`proteome` 種別の一択先 |
| `humandbs` | external | 制限公開ヒトデータの利用制限ポリシー申請・承認窓口 (NBDC ヒトデータベース / HumanDBs、DBCLS 運営)。提供申請とポリシー (NBDC 標準 / 独自 JGAP) は同一プラットフォームで完結するため 1 service に統合する。JGA の前提ゲート |

`candidateRepos` (カスケードと KindRoute が参照する登録エンドポイント集合) は **登録エンドポイント (role = destination ∪ `{jpost, eva}`) の部分集合** である。role は `service.ts` が SSOT で、PBT で全 service がいずれかの role に属することを固定する。

MERFISH 等の大容量空間画像が向かう外部 Generalist archive (Zenodo / figshare 等) は DDBJ service ではないため enum に持たず、`spatial` recipe が GEA step の誘導 note として表す (step 化しない)。

### MSS / NSSS の振り分け

塩基配列のアノテーション付き登録には DDBJ 公式に 2 つの並行窓口があり、登録先 DB は同一だが投入方式が違う。submit ナビは両方を別 destination service (`ddbj` = MSS / `nsss` = NSSS) として持ち、種別と規模で振り分ける。基準は DDBJ 公式の登録手順 (`_ddbj/web-submission.md` ≡ `_ddbj/mss.md` ≡ `_ddbj/submission.md`、3 箇所一致) に従う。

| 窓口 | service | 担当範囲 | 投入方式 |
|---|---|---|---|
| NSSS (Web 版) | `nsss` | 小規模・非完成・NSSS 対応種別。公式が第一に勧める初心者向け窓口 | Web ウィザードで逐次入力 |
| MSS | `ddbj` | 大規模・完成ゲノム・NSSS 非対応種別 | 登録ファイルを自作してファイル送付 |

NSSS が**対応できず MSS に回す**条件 (いずれか 1 つでも該当):

- **種別**: EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA (これらは NSSS 非対応)
- **規模**: 1 配列 ≥ 500 kb / 総配列数 > 100 / 1 配列あたり Feature ≥ 30
- **完成度・連携**: 完全長ゲノム・染色体・オルガネラ/ウイルスゲノム・プラスミド全長、または BioProject/BioSample を DBLINK に記載するもの (メタゲノム・全長ゲノム同一菌株由来など)

BSI は実ファイルを読まない navigator なので、配列長・配列数・Feature 数の厳密判定はできない。種別 (上記の NSSS 非対応リスト) と「完成ゲノムか否か」で振り分け、規模に依存する境界は Step カードの note で「小規模・非完成なら NSSS Web 登録、それ以外は MSS」と案内する。

### JGA は「ヒト個人」限定

JGA は **ヒト個人由来の制限公開データ** (個人特定可能な遺伝学的・表現型情報) 専用で、DBCLS で承認された利用制限ポリシーを前提とする (`_jga/submission.md` / `_jga/index.md`)。メタゲノム・マイクロバイオーム・環境サンプルは公式上 JGA の対象ではなく、生リードは DRA、MAG は ENV division (`ddbj`) に行く (`_ddbj/metagenome-assembly.md` に JGA への言及なし)。

したがって JGA 分岐条件は **`access = restricted ∧ Q2 = human`** とする。`Q2 = metagenome` (環境サンプル) は制限公開でも JGA に入れず、DRA に embargo (公開予定日) を設定して非公開期間を扱う。INSDC は制限公開そのものを持たないため、非ヒトの「制限公開」は embargo が唯一の非公開手段になる (`_insdc/data-release-policy.md`)。

### 発現・空間の DRA 2 段

GEA の Submission Type が **Sequencing** のとき (NGS 由来の発現・空間 Tx)、生リード (fastq/bam) を先に DRA に登録し、processed データを GEA に出す **2 段**になる (`_gea/submit-sequence.md` は DRA タブ必須、`_gea/datafile.md` は「生データは DRA に事前登録」)。Submission Type が **Microarray** のときは生データも GEA に直接登録し DRA を経由しない (`_gea/submit-array.md` に DRA タブ無し)。

発現マトリクスも同様に、NGS 由来かどうかで DRA 2 段の要否が分かれる。`expression-source` ChipAxis で `ngs` を選択すると `expression-dra` recipe が DRA step を emit し、未選択 (Non-NGS) なら GEA のみになる。

空間 Tx は platform で Submission Type と DRA 2 段の要否が割れる (`_gea/spatial-gene-expression.md`)。これは **出る service の集合が変わる flow-changing 軸**なので、`spatial-platform` を note 止まりにせず Tier2 `spatial` recipe で実際に DRA step を emit する (`### spatial`)。

| platform | GEA Submission Type | DRA 2 段 | 備考 |
|---|---|---|---|
| Visium | Sequencing | 要 (DRA + GEA) | fastq/bam を DRA、GEX matrix 等を GEA |
| Xenium | Microarray (A-GEAD-246) | 不要 (GEA のみ) | raw も processed も GEA |
| MERFISH / MERSCOPE | Microarray (A-GEAD-247) | 不要 (GEA のみ) | 大容量画像・.vzg は GEA 受入不可。MERFISH 選択時に外部 Generalist archive 誘導 warning を表示 |
| Stereo-seq | (DDBJ 未文書) | 要 (DRA + GEA) | 公式に登録経路の記載なし。`SEQUENCING_SPATIAL_PLATFORMS` に含め Sequencing 扱い (DRA+GEA) とし、根拠は `## 設計判断` に残す |

### サマリーカードのバッジ色

バッジ色は role (destination/companion か external か) と notes の warning/error 有無で決まる。判定は `serviceBadgeColor` 純関数 (`schemas/submit/service.ts`、FlowStep 単位のラッパは `flow-rules/service-badge.ts` の `stepBadgeColor`)、具体色値は `app/styles/tailwind.css` の `@theme` トークンが SSOT。

---

## validation 検査軸

`selectValidations(state)` (純粋関数) が次を検査する。各 validation は i18n key + 該当種別を含み、click で該当箇所を scroll into view する。

- `precondition-conflict`: 前段 Q2 で disable された種別が選ばれたまま残っている。この種別は経路導出から除外される (右 pane に登録先を出さない) ため、`no-destination-service` とは二重計上せず precondition-conflict 1 件に集約し、トグルのクリックで解除させる
- `no-destination-service`: その種別がどの destination service step にも入らない
- `dangling-group-id`: group 参照が崩れている (UI バグ検知)

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
- DDBJ 由来データと現 BSI の差分は `## 設計判断` に記録する

---

## 設計判断

submit ナビが採る登録先導出の設計判断とその公式根拠・トレードオフを記録する。routing の詳細規約は前段の該当セクションが持つ。

- **典型ケースに絞る (多段・多 Dataset の表現を持たない)**: navigator は「1 種別 = 1 つの論理データ」を出発点とし、1 提出内で同一種別を複数ファイルに分けて段階や属性を割る高度ケースは単一ガイド step に簡約する。具体的には (1) メタゲノムアセンブリ (MAG) / 単一増幅ゲノム (SAG) の生リード→primary→binned→MAG/SAG の多段チェーンと複数 BioSample (derived_from 放射状) は持たず、`ddbj` の ENV/SAG ゲノムエントリと「生リードは DRA に出す」note に簡約する。(2) JGA の Policy 単位 Dataset 分割は持たず、「Policy 承認 (humandbs) → JGA 登録」の単一ガイドにする。これらの段構造・Dataset 分割は各登録ウィザード側の Intra-DB の話であり、複数ファイルを束ねる入力を navigator に持たせるとシンプルさが相殺されるため。同一種別の公開版+制限公開版を 1 提出で同時に出す等の「同一種別の多重化」も対象外とし、必要なら提出を分ける
- **公開区分 (access) は ② 公開区分から種別ごとに導出する**: access は種別単位で持ち、上部 radio + 補助トグルの組合せ次第で同一 submission 内に restricted / open が混在しうる (per-file の混合は依然として持たない)。② 公開区分は旧 NBDC ヒトデータベースナビの画面2 (公開区分の希望) と画面3 (非制限公開の妥当性ゲート) を統合したもので、ヒトデータを安易に非制限公開に流さない安全機構として機能する (UI 規約と導出ルールは `## 公開区分 (access) の規約`)
- **種別間の相互排他は持たない**: 種別を選ぶほど他種別を disable するような種別間依存は導入しない。9 種別の `candidateRepos` は独立した destination に散っており、DDBJ 公式の登録手順にも「この 2 種別は同一提出に共存不可」という根拠が無い。reads + variant + expression のような multi-omics の 1 提出は正当であり、種別間 disable はそれを誤ってブロックするだけで、`no-destination-service` / `cascade-no-deadend` の構造保証とも衝突する。種別の絞り込みは前段 Q2 カスケードだけが担う
- **生物軸は Q2 のみ**: 種別単位の細かい生物分類は持たない。Q2 (生物ドメイン) と重複し、細かい生物種は BioSample の Intra-DB Tag で扱うため。これに伴い「organism ごとに BioProject を分裂させ、BP ≥ 2 で Umbrella を出す」挙動は持たず、実 DDBJ の **「1 BioProject + 複数 BioSample」** に合わせる (BioSample の数・生物種は Intra-DB で確定する)
- **FileTypeKind は一次登録単位のみ**: 附随メタデータ・付随ファイルを独立種別にせず Intra-DB Tag / 追加ファイル枠に降ろす (値域と扱いは `## Controlled vocabulary` の FileTypeKind)。公式 docs がこれらを Sample メタデータ・付随ファイルと位置づけるため
- **filename / 拡張子を持たない**: navigator は実ファイルを読まず登録もしないため、ファイル名や拡張子は経路導出に寄与しない。中段・詳細カード・フロー詳細カードは種別をラベル + アイコンで示し、ファイル名の自動採番や拡張子の表示は持たない。配列 + アノテーションを「拡張子を除いてファイル名を揃える」という DDBJ MSS の実運用要件は、ファイル名表示を持たないため Step note で「配列とアノテーションは対応づけて提出する」と表現する
- **JGA はヒト個人の全種別 (メタゲノムは含めない)**: `access = restricted ∧ Q2 = ヒト` を唯一の JGA 分岐条件とし、restricted な**全種別**を JGA に振る (sequence-read → JGA Data、それ以外 → JGA Analysis。`_jga/submission.md` で Analysis にメタボ・プロテオ・アレイ・VCF・表現型を受付)。ヒト宿主のマイクロバイオームの要望が生じても「由来がヒト個人か」は Q2 (生物ドメイン) と別軸であり、`Q2 = metagenome` を JGA トリガにはしない
- **個人識別性は上部 radio (default Yes) + per-file 反転上書き**: 個人情報保護法施行規則の「個人識別符号」 該否は submission 全体に 1 回だけ問う (`hasIdentifier` radio、default Yes = 安全側)。`restrictedPreference` と機能は同じ「全 restricted トリガー」 だが、根拠が違う (主観的希望 vs 客観的事実) ので別軸として並置する。per-file の `identifiability` chip は上部 radio に対する反転スイッチで、Yes 時は「この種別だけ該当しない (open に逆転)」、No 時は「この種別だけ該当する (restricted に逆転)」 を表す。これにより「個別 genotype は JGA、集計頻度は TogoVar 公開」 のような混在ケースを per-file で表現できる。`IDENTIFIABLE_KINDS` は radio = No かつ倫理指針 ON 時の種別ごと既定値として残す。カタログの routing rules は変更不要 (access 導出だけが変わり、既存の `{ access: "restricted" }` 条件はそのまま効く)
- **Service は role 付きの単一 enum**: 利用者向けの登録エンドポイントと内部 service はほぼ 1:1 なので、別 enum を 2 本持たず role (destination / companion / external) で区別する (role の割り当ては `## Service と role / 外向き契約`)
- **制限公開ヒトの Policy 窓口は `humandbs` 1 つに統合する**: 提供申請 (data submission application) と利用制限ポリシー (NBDC 標準 / 独自 JGAP) は、いずれも DBCLS が運営する NBDC ヒトデータベース (HumanDBs) という単一プラットフォームで完結する。別 service (`humandbs` と `dbcls`) に分けると JGA フローに重複した外部窓口カードが 2 枚出て利用者を混乱させるため、`humandbs` 1 service・1 step に統合する (submit の Service enum から `dbcls` を持たない)。なお news / services 機能が情報「源」として扱う `dbcls` (NewsSource / ServiceSource) は別概念であり submit の統合とは無関係
- **塩基配列の窓口は MSS と NSSS の 2 つ**: 「DDBJ」の登録先 DB は 1 つだが投入窓口が 2 つあり、両者を別 destination service (`ddbj` = MSS / `nsss` = NSSS) として持つ。振り分け基準・規模境界の note 案内は `### MSS / NSSS の振り分け`。リードは対象外で DRA に回る
- **変異の登録先はヒト/非ヒトと公開区分で割れる**: 制限公開ヒト → `jga`、それ以外 → `eva`。短い/構造バリアントの差は EVA 内の登録種別差で出る service を変えないため Intra-DB Tag で扱い、reference 配列の有無も公式に routing 軸が無く同様 (`variant` は詳細質問を持たず行先は Q2 + access で確定)。旧 DGVa は EVA に統合済みで独立 service にしない
- **メタボロミクスとプロテオームは独立種別**: メタボロミクス (質量分析 / NMR / 代謝物アサインメント) は `metabolomics` として 1 種別に統合し MetaboBank 一択。プロテオーム (非 MS 含む) は `proteome` として独立種別に昇格し jPOST 一択。旧設計の `mass-spec-domain` ChipAxis は廃止する (proteome が独立種別になるため分岐が不要)。MSI イメージングは MetaboBank 内のファイル要求差 (出る service は不変) なので groupType `imaging-ms` で構造を表す
- **発現マトリクスの NGS 由来は recipe で実 DRA step を出す**: `expression-source` は発現マトリクスの由来を表す flow-changing 軸で、`ngs` 選択時は `expression-dra` recipe が DRA step を emit する (DRA + GEA 2 段)。Non-NGS 選択時は GEA のみ (microarray は別種別 `microarray-expression` で分離済み)
- **空間 Tx の platform は recipe で実 DRA step を出す**: `spatial-platform` は GEA Submission Type と DRA 2 段の要否を変える flow-changing 軸なので、note 止まりにせず Tier2 `spatial` recipe で Sequencing platform に実 DRA step を emit する (platform 値域・分類・MERFISH 画像の外部誘導は `### spatial` / `### 発現・空間の DRA 2 段`)
- **`assembly-form` と `has-annotation` は塩基配列の直交する 2 軸**: `assembly-form` は 4 択 radio (ゲノム / MAG / SAG / ハプロタイプ) でアセンブリ形式を選択する。`has-annotation` は独立トグルでアノテーション有無を表す。(1) ゲノム (`genome`) + アノテーション付き = 標準の `ddbj` MSS 登録。(2) ゲノム + アノテーションなし = FASTA のみ、`ddbj` unannotated 経路。(3) MAG (`mag`) = `ddbj` ENV genome エントリ。(4) SAG (`sag`) = `ddbj` SAG エントリ。(5) ハプロタイプ (`haplotype`) = `ddbj` + `haplotype` recipe が `umbrella-bioproject` companion step を emit (DDBJ/NCBI 公式でUmbrella BioProject 必須)。MAG/SAG/ハプロタイプ選択時は TPA・小規模トグルを false にして disabled にする (これらの assembly form では NSSS や TPA が不適用のため)。WGS/GNM/TSA/TLS/EST/HTG/HTC/GSS は全て同じ `ddbj` 行きで出る service を変えないため、`assembly-form` の値域に持たず Step カードの MSS data type pulldown (Intra-DB Tag) で扱う
- **第三者 (TPA) は `sequence` 種別の ChipAxis で扱う**: 配列系の TPA → `ddbj` (MSS、引用元 INSDC accession 必須。`_ddbj/tpa-e.md` / `_ddbj/web-submission-e.md`: TPA は NSSS では受け付けず MSS のみ)。TPA は `sequence` 種別でのみ ChipAxis `tpa` として表示し、TPA 対象外の種別には出さない。MAG/SAG/ハプロタイプ選択時は disabled。MetaboBank の第三者再解析は正式サポート未確認のため当面除外する
- **塩基配列は 1 種別に統合し、アセンブリ形式とアノテーション有無を独立軸で表現する**: 旧設計の `sequence-nucleotide` と `sequence-annotation` を `sequence` 1 種別に統合する。アセンブリ形式は `assembly-form` ChipAxis の 4 択 radio (ゲノム / MAG / SAG / ハプロタイプ)、アノテーション有無は `has-annotation` ChipAxis のトグル、TPA と小規模は独立トグルで表現する。3 つのトグル (アノテーション / TPA / 小規模) は公開条件セクションと同じ Toggle パターンで配置する
- **サマリーカードは「全体俯瞰 + 詳細への導線」とする**: 登録は外部ページで完結し BSI は代行しないため、右 pane のサマリーカードは導出結果の全体像（service 名・role・routing 理由・依存関係）を一目で把握させ、各 service の詳細ページ (`/databases/$slug`) と外部登録サイトへの導線を示す役割に徹する。登録手順の詳細（ウィザードの手順・事前準備・注意事項）は各 service の詳細ページに委ねる。登録後にしか得られない accession 書式はナビ価値が無いため主要素から外す。順序の導出は `### ステップ依存とカード順序` に従う
- **「詳細を見る」link は内部詳細ページがある service だけに出す**: 内部詳細ページ (`/databases/<slug>`) を持つのは 8 service (bioproject / biosample / dra / jga / ddbj / gea / metabobank / humandbs)。`umbrella-bioproject` は BioProject ページの `#umbrella-bioproject` セクション、`nsss` は DDBJ ページの `#nsss` セクション (NSSS は DB ではなく塩基配列の Web 登録窓口で、MSS と並列に DDBJ ページ内で扱うため独立ページを持たない) へ deep link する。`eva` / `jpost` は DDBJ 外の登録窓口で本サイトに内部詳細ページを持たないため、flow card の「詳細を見る」link を出さず、外部登録サイトへのリンクのみ表示する。slug マッピングと判定は `app/schemas/submit/service.ts` の `internalDetailHref` / `hasInternalDetailPage` が SSOT。flow card 側 (`flow-summary-card.tsx`) は `internalDetailHref(step.service)` が undefined のとき `TextLink` を出さない

---

## i18n リソース

`app/lib/i18n/resources/{ja,en}.ts` の `Resources.submit` 配下に submit 用キーを追加する。ja / en 両方で完全一致が PBT (`tests/pbt/lib/i18n/resource-parity.pbt.test.ts`) で担保される。key 集合はカタログの `note.messageKey` 値と完全一致させる。en 未供給の説明は ja/en が揃うまで i18n に出さない (parity test が常時赤になるのを避ける)。

---

## 範囲と制約

- submit features は外部 API を呼ばない (navigator のみ)
- zones / lint 制約 (生 hex 禁止、`react/forbid-elements` で生 button / input / select / textarea 禁止、arbitrary value 禁止) は `architecture.md` に従う
- 新 primitive 追加は `docs/frontend.md` の「UI primitives」 の手順を経由する
