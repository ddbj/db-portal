# 登録ナビゲーション

DDBJ の複数 DB にまたがる登録フローを、**Decision Tree を網羅表現の中心**とし、**Use Case Cards をショートカット**、**Detail Panel を 2 段階ドリルダウンの情報開示装置** として統合的にガイドする仕様。

## 概要

DDBJ の複数 DB にまたがる登録フローを、ユースケース起点で統合的にガイドする。登録システム単位（D-way, MSS, NSSS 等）ではなく、研究者の動機（何を登録したいか）を起点とする。

ナビゲーションは `/submit` 1 ページで完結させる。

## ページ構成

`/submit` は 3 セクションの縦構成。

```
+--- /submit -----------------------------------------+
|  [Use Case Cards] 9 枚                              |
|  [Decision Tree] depth 2-7, 31 leaves              |
|  [Detail Panel] 2 段階ドリルダウン                      |
+-----------------------------------------------------+
```

### セクションの役割

| セクション | 役割 |
|---|---|
| **Use Case Cards** | 研究者のドメイン自己認識に合致したショートカット。tree の中間 node または leaf に一気にジャンプする |
| **Decision Tree** | 網羅的に DDBJ 登録の全パターンを表現する。カードでは自己判断できない研究者の導線 |
| **Detail Panel** | 2 段階ドリルダウン（カード選択 → 概要レベル、leaf 到達 → 具体レベル） |

### 3 セクションの連動

- **カードクリック**: tree の該当 node（中間 node または leaf）がハイライト + 自動選択。中間 node の場合は Detail Panel に概要レベル表示、leaf の場合は直接具体レベル表示
- **tree の leaf 到達**: Detail Panel が具体レベルに切り替わる（ゴール + 準備物 + 外部リンク等）
- **tree を L1 から順に進める**: カードは未選択のまま、leaf 到達で Detail Panel 表示

## 設計原則

### tree と card の役割分担

- **tree** は網羅的に DDBJ 登録の全パターンを表現する可視化装置
- **card** は tree の中間 node または leaf へのショートカット（よく使われる経路を最短で辿れる）
- ユーザーの経路は 2 通り:
  - 自己認識がある研究者: カードクリック → tree の最深部（leaf）まで進む
  - 判断に迷う研究者: tree L1 から順に降りる
- card の粒度は「研究者の自己認識の呼び方」で決める（例: 「真核生物ゲノム」「メタゲノム」）

### leaf 統合判定基準

tree の leaf として分岐させるか、詳細パネルで案内するかの判定:

**tree で分岐させる条件**（どれか 1 つでも該当）:
1. **登録先システムが違う**（DRA / MSS / NSSS / GEA 等の登録窓口が別）
2. **ワークフロー構造が違う**（Haplotype の umbrella+Principal+Alternate 構成、3 層 vs 2 層）
3. **必要な準備物が大きく違う**（新アクセッション取得、peer-reviewed 発表必須等）

**統合する条件**:
- 登録窓口は同じで、MSS 内の data type や BioSample パッケージの選択違いだけ
- qualifier・locus_tag 命名の違い
- → 詳細パネルで「MSS フォームで GNM/WGS/HTG を選択」のように 1-2 行で案内する

この判定基準により、重複する leaf（例: 真核 × 動物/植物/菌類 × Finished/Draft/HTG の 8 通り）を 1 leaf に統合し、研究者が登録サイトで二度入力する手間を避ける。

## Tree 構造

深さ 2〜7 層、合計 31 leaf。レイヤー数はモダリティ・生物カテゴリで可変。

質問キーは `q{階層}-{id}`、ゴールキーは `leaf-{NN}` で表記する。質問・選択肢の文言は研究者の動機（「何を持っているか / 何を登録したいか」）起点で表現し、DDBJ 内部用語（MSS / NSSS / WGS / HTG / TLS / TPA / EST / TSA 等）は補足に留める。

### L1 アクセス制限

| 選択肢 | 分岐 |
|---|---|
| ヒトを対象とした個人特定リスクのあるデータ（NBDC の提供申請が必要 / 既に承認済み） | **[leaf-01]** JGA |
| なし | L2 |

### L2 計測モダリティ

| 選択肢 | 分岐 |
|---|---|
| プロテオミクス（LC-MS/MS、プロテオーム解析） | **[leaf-02]** jPOST（外部） |
| メタボロミクス（LC-MS、GC-MS 等） | **[leaf-03]** BP+BS+MetaboBank |
| 変異コール結果（SNP / SV） | L3-var |
| 遺伝子発現プロファイリング | L3-expr |
| 塩基配列（DNA/RNA リード・配列） | L3-seq |

### L3-var 生物 × 変異タイプ

| 選択肢 | 分岐 |
|---|---|
| ヒト × SNP / Indel（≤ 50 bp） | **[leaf-04]** JVar SNP（外部、DDBJ 運営） |
| ヒト × SV（> 50 bp、構造変異） | **[leaf-05]** JVar SV（外部、DDBJ 運営） |
| 非ヒト × SNP / Indel | **[leaf-06]** EVA（外部、EBI） |
| 非ヒト × SV | **[leaf-07]** dgVa（外部、EBI） |

### L3-expr 計測技術

| 選択肢 | 分岐 |
|---|---|
| NGS による RNA-seq（発現解析） | **[leaf-08]** BP+BS+DRA+GEA |
| マイクロアレイ | **[leaf-09]** BP+BS+GEA |

### L3-seq 規模

| 選択肢 | 分岐 |
|---|---|
| 小規模（< 100 配列・< 500 kb・BioProject/BioSample 不要） | **[leaf-10]** NSSS |
| 大規模 | L4-seq |

### L4-seq 由来

| 選択肢 | 分岐 |
|---|---|
| 単一生物 | L5-single |
| 環境サンプル / メタゲノム | L5-meta |

### L5-meta メタゲノム種別

| 選択肢 | 補足（内部用語） | 分岐 |
|---|---|---|
| 生リードのみ | DRA | **[leaf-11]** BP+BS+DRA |
| 未同定コンティグ（ビニング前） | Primary metagenome、DRA Analysis のみ | **[leaf-12]** BP+BS+DRA (Analysis) |
| ゲノムビン（環境中の個別生物のゲノム再構築） | MAG / Binned / SAG。MSS 経由 | **[leaf-13]** BP+BS+DRA+MSS |
| OTU プロファイル（16S rRNA 等） | TLS（Targeted Locus Study） | **[leaf-14]** BP+BS+DRA+MSS (TLS) |
| メタトランスクリプトーム | メタ TSA（環境中の遺伝子発現） | **[leaf-15]** BP+BS+DRA+MSS (TSA) |

### L5-single 生物カテゴリ

| 選択肢 | 分岐 |
|---|---|
| 微生物（原核生物・ウイルス・オルガネラ・プラスミド） | L6-microbial |
| 真核生物（動物・植物・菌類） | L6-eu |

### L6-microbial 微生物 サブカテゴリ

| 選択肢 | 分岐 |
|---|---|
| 原核生物（細菌・古細菌） | L7-pro |
| ウイルス / ファージ | L7-virus |
| オルガネラ / プラスミド | **[leaf-16]** BP+BS+MSS (GNM) |

### L7-pro 原核ゲノム データ形式

| 選択肢 | 分岐 |
|---|---|
| 生リードのみ | **[leaf-17]** BP+BS+DRA |
| 生リード + アセンブリ | **[leaf-18]** BP+BS+DRA+MSS |
| アセンブリのみ | **[leaf-19]** BP+BS+MSS |

アセンブリ完成度（Finished = GNM / Draft = WGS）による MSS data type 選択は、詳細パネルで 1-2 行の注意として案内する。DFAST（原核生物ゲノム自動アノテーション）の利用も詳細パネルで案内。

### L7-virus ウイルスゲノム データ形式

| 選択肢 | 分岐 |
|---|---|
| 生リードのみ | **[leaf-20]** BP+BS+DRA |
| 生リード + アセンブリ | **[leaf-21]** BP+BS+DRA+MSS |
| アセンブリのみ（segment 対応） | **[leaf-22]** BP+BS+MSS |

SARS-CoV-2 は [leaf-21]/[leaf-22] で DFAST_VRL / GISAID 連携 / Japan COVID-19 Open Data Consortium を詳細パネルで案内。segment ウイルス（インフルエンザ等）の複数エントリ登録も詳細パネルで案内。

### L6-eu 真核ゲノム データ特殊性

| 選択肢 | 補足（内部用語） | 分岐 |
|---|---|---|
| 通常の真核ゲノム | 動物 / 植物 / 菌類 | L7-eu |
| Haplotype 区別あり（二倍体 Principal/Alternate） | umbrella + Principal + Alternate BioProject 構成 | L7-eu-hapl |
| de novo 転写産物アセンブリ | TSA（Transcriptome Shotgun Assembly） | **[leaf-23]** BP+BS+DRA+MSS (TSA) |
| 単発 cDNA（Sanger シングルパス） | EST（Expressed Sequence Tags、新規登録ほぼゼロ） | L7-eu-est |
| 第三者アノテーション | TPA assembly / specialist_db（peer-reviewed 発表必須） | **[leaf-24]** BP+BS+MSS (TPA) |

### L7-eu 真核ゲノム データ形式

| 選択肢 | 分岐 |
|---|---|
| 生リードのみ | **[leaf-25]** BP+BS+DRA |
| 生リード + アセンブリ | **[leaf-26]** BP+BS+DRA+MSS |
| アセンブリのみ | **[leaf-27]** BP+BS+MSS |

以下は tree では分岐させず詳細パネルで案内する（統合判定基準の「MSS 内 data type / BioSample パッケージ選択の違いだけ」に該当）:

- **生物種詳細（動物 / 植物 / 菌類）**: BioSample パッケージ選択（Model Organism Animal / Plant / Microbe）、locus_tag 命名規則、qualifier（cultivar / ecotype vs breed / strain / isolate）
- **アセンブリ完成度（Finished = GNM / Draft = WGS / BAC/YAC/fosmid ドラフト = HTG Phase 0/1/2）**: MSS フォームでの data type 選択

### L7-eu-hapl Haplotype データ形式

| 選択肢 | 分岐 |
|---|---|
| 生リード + アセンブリ | **[leaf-28]** BP+BS+DRA+MSS (umbrella + Principal + Alternate) |
| アセンブリのみ | **[leaf-29]** BP+BS+MSS (umbrella + Principal + Alternate) |

Haplotype 特有の BioProject 構成（umbrella の下に Principal と Alternate 2 つ）、BioSample 共通、locus_tag prefix 共通（prefix/suffix で Haplotype 区別: 例 `A1C_p00001` / `A1C_a00001`）は詳細パネルで案内。

### L7-eu-est EST 規模

| 選択肢 | 分岐 |
|---|---|
| 小規模（< 100 配列） | **[leaf-30]** NSSS（EST 区分） |
| 大規模 | **[leaf-31]** BP+BS+MSS（EST 区分） |

EST は新規登録ほぼゼロだが、網羅性優先で tree に残す。旧 EST データの更新・追加登録の問い合わせの受け皿。

## ゴール一覧

tree の leaf が辿り着く「登録先システムの組み合わせ」。16 種類。同じ goal に複数 leaf が帰属する。

| ゴール | 登録先 | 対応 leaf |
|---|---|---|
| JGA | JGA（NBDC 承認要） | leaf-01 |
| jPOST | jPOST（外部） | leaf-02 |
| BP+BS+MetaboBank | BioProject + BioSample + MetaboBank | leaf-03 |
| JVar SNP | JVar SNP（DDBJ 運営） | leaf-04 |
| JVar SV | JVar SV（DDBJ 運営） | leaf-05 |
| EVA | European Variation Archive（EBI） | leaf-06 |
| dgVa | Database of Genomic Variants archive（EBI） | leaf-07 |
| BP+BS+DRA+GEA | BioProject + BioSample + DRA + GEA | leaf-08 |
| BP+BS+GEA | BioProject + BioSample + GEA | leaf-09 |
| NSSS | DDBJ (Trad) NSSS 経由 | leaf-10, leaf-30 |
| BP+BS+DRA | BioProject + BioSample + DRA | leaf-11, leaf-17, leaf-20, leaf-25 |
| BP+BS+DRA (Analysis) | BioProject + BioSample + DRA（Analysis のみ、MSS 不要） | leaf-12 |
| BP+BS+DRA+MSS | BioProject + BioSample + DRA + DDBJ (Trad) MSS 経由 | leaf-13, leaf-14, leaf-15, leaf-18, leaf-21, leaf-23, leaf-26 |
| BP+BS+MSS | BioProject + BioSample + DDBJ (Trad) MSS 経由 | leaf-16, leaf-19, leaf-22, leaf-24, leaf-27, leaf-31 |
| BP+BS+DRA+MSS (Haplotype) | BP (umbrella + Principal + Alternate) + BS + DRA + MSS | leaf-28 |
| BP+BS+MSS (Haplotype) | BP (umbrella + Principal + Alternate) + BS + MSS | leaf-29 |

略語:

- BP = BioProject
- BS = BioSample
- DRA = DDBJ Sequence Read Archive
- GEA = Genomic Expression Archive
- DDBJ (Trad) = DDBJ Traditional Annotation（塩基配列データベース本体、フラットファイル形式、GenBank 相当）
- MSS = Mass Submission System（DDBJ (Trad) への大規模登録窓口）
- NSSS = Nucleotide Sequence Submission System（DDBJ (Trad) への小規模登録窓口）
- JGA = Japanese Genotype-phenotype Archive

## ゲノム登録の構造（補足）

「ゲノム登録」は単一の行為ではなく、3 層のデータを段階的・並行的に登録する統合プロセス。微生物ゲノム / 真核生物ゲノム / メタゲノム 各カードの詳細パネルで、この構造を明示する。

### 3 層構造

```
Layer 1: Metadata   → BioProject + BioSample (D-way)
Layer 2: Raw reads  → DRA (D-way)
Layer 3: Assembly   → DDBJ (Trad) via MSS or NSSS
```

各層は独立して登録される。層間は BioProject / BioSample のアクセッション番号で結びつく。

### アセンブリ段階

塩基配列の「完成度」で MSS の data type が変わる。

| 段階 | MSS data type | 内容 |
|---|---|---|
| Raw reads | - | NGS の生出力（MSS 対象外、DRA へ） |
| Contigs（overlapping reads） | WGS | Whole Genome Shotgun |
| Draft clone sequences | HTG | BAC / YAC / fosmid のドラフト（PHASE 0/1/2） |
| Finished level | GNM | 染色体全長相当の連続配列 |
| 転写産物アセンブリ | TSA | Transcriptome Shotgun Assembly |
| OTU プロファイル | TLS | Targeted Locus Study |
| MAG（最高品質） | MAG | Metagenome-Assembled Genome |
| SAG | SAG | Single Amplified Genome |
| 単発 cDNA | EST | Sanger シングルパス cDNA |
| 第三者再構築 | TPA | Third Party Annotation assembly / specialist_db |

MSS data type の完全な一覧は [_ddbj/data-categories.md](https://www.ddbj.nig.ac.jp/ddbj/data-categories.html) を参照。

### 分岐軸

- **生物種**: 原核 / 真核 / ウイルス / オルガネラ / プラスミド / メタゲノム
- **アセンブリレベル**: Finished / Draft（WGS） / 中間（HTG）
- **Haplotype 区別**: 二倍体 Principal / Alternate
- **規模**: 100 配列未満（NSSS） / 100 配列以上（MSS）
- **データ形式**: 生リード only / 生リード + アセンブリ / アセンブリ only

### 原核生物と真核生物の違い

| 項目 | 原核生物 | 真核生物 |
|---|---|---|
| 構造 | Chromosome + Plasmid | Chromosome（複数） + organelle |
| アノテーション | DFAST で自動化可能 | 手動 / 既存パイプラインに依存 |
| locus_tag prefix | 必須 | 必須 |
| unlocalized / unplaced 配列 | 稀 | 一般的 |

## 特殊データ種別の扱い

ddbj/www 現行ウィザードに登場する特殊データ種別の、新 tree / 詳細パネルでの扱い。

| 種別 | 新規受付 | tree での扱い | 詳細パネルでの案内 |
|---|---|---|---|
| MGA（Mass sequence for Genome Annotation） | 終了 | tree から完全除外 | 既存データ閲覧のみ言及（該当カードの詳細パネル内で） |
| GSS（Genome Survey Sequences） | 継続中 | leaf-18 / leaf-19（原核アセンブリ）に包含 | clone qualifier 必須等の MSS 要件 |
| COVID-19 / SARS-CoV-2 | 継続中 | leaf-21 / leaf-22（ウイルス）に包含 | DFAST_VRL、Japan COVID-19 Open Data Consortium、GISAID 連携 |
| HTG（BAC / YAC / fosmid ドラフト） | 継続中 | leaf-26 / leaf-27（真核 Raw+Asm / Asm のみ）に包含 | PHASE 0/1/2 の選択、clone qualifier、MSS 経由 |
| HTC（High Throughput cDNA） | 継続中（新規ほぼゼロ） | tree から独立 leaf を作らず leaf-27 / leaf-30 / leaf-31（真核 EST / 真核通常）で言及 | 歴史的経緯 |
| TPA（Third Party Annotation） | assembly / specialist_db のみ継続（experimental / inferential は 2025/01 終了） | leaf-24（真核 TPA）として独立 | 4 種別の現状、peer-reviewed 発表必須 |
| SAG（Single Amplified Genome） | 継続中 | leaf-13（メタゲノム ゲノムビン）に包含 | MISAG BioSample パッケージ、MSS 経由 |
| MAG / Binned / Primary metagenome | 継続中 | leaf-12（Primary、DRA Analysis のみ）/ leaf-13（MAG+Binned、MSS 経由）に分離 | 段階別の登録先 |
| TLS（Targeted Locus Study） | 継続中 | leaf-14（メタゲノム OTU プロファイル）として独立 | 16S rRNA 等の特定 locus 解析 |
| メタトランスクリプトーム TSA | 継続中 | leaf-15（メタゲノム メタ TSA）として独立 | メタゲノム由来の TSA の扱い |
| EST | 継続中（新規ほぼゼロ） | leaf-30 / leaf-31（真核 EST 小規模 / 大規模）として独立 | 歴史的経緯、Sanger シングルパス cDNA |
| TSA（真核 de novo transcriptome） | 継続中 | leaf-23（真核 TSA）として独立 | de novo transcriptome assembly の典型 |
| Haplotype（真核二倍体） | 継続中 | leaf-28 / leaf-29（Haplotype Raw+Asm / Asm のみ）として独立 | umbrella + Principal + Alternate 構成、locus_tag prefix/suffix の区別 |

## カード（9 枚）

tree 中間 node へのショートカット。研究者の自己認識の呼び方で命名。

| カード | 対応 tree node | 包含 leaf 数 | 対応 leaf |
|---|---|---|---|
| 微生物ゲノム | L6-microbial | 7 | leaf-16, leaf-17, leaf-18, leaf-19, leaf-20, leaf-21, leaf-22 |
| 真核生物ゲノム | L6-eu + L7-eu 配下全て | 9 | leaf-23, leaf-24, leaf-25, leaf-26, leaf-27, leaf-28, leaf-29, leaf-30, leaf-31 |
| メタゲノム / MAG / SAG | L5-meta | 5 | leaf-11, leaf-12, leaf-13, leaf-14, leaf-15 |
| 遺伝子発現（RNA-seq・アレイ） | L3-expr | 2 | leaf-08, leaf-09 |
| 変異データ | L3-var | 4 | leaf-04, leaf-05, leaf-06, leaf-07 |
| プロテオミクス | L2 の Proteomics 枝 | 1 | leaf-02 |
| メタボロミクス | L2 の Metabolomics 枝 | 1 | leaf-03 |
| 小規模塩基配列・PCR 産物 | L3-seq の小規模 | 1 | leaf-10 |
| ヒト制限アクセス | L1=Yes | 1 | leaf-01 |

### カード抽出原則

- **leaf が単一の研究目的を持つ**: そのまま 1 枚のカード（プロテオミクス、メタボロミクス、小規模、ヒト制限）
- **共通の研究ドメインを持つ leaf 群**: ドメイン名で統合カード化（微生物ゲノム、真核生物ゲノム、メタゲノム、変異、発現）
- **カード名は研究者の自己認識の呼び方に合わせる**（「真核生物ゲノム」「メタゲノム / MAG / SAG」等）
- **カードごとに包含 leaf 数は不均一で OK**（tree の自然な構造を反映）

### カード表示優先順

上から順: 微生物ゲノム → 真核生物ゲノム → メタゲノム → 遺伝子発現 → 変異データ → プロテオミクス → メタボロミクス → 小規模塩基配列 → ヒト制限アクセス。

ゲノム系を先頭、発現・変異、オミクス、特殊ケースの順。ヒト制限アクセスはフロー上 L1 先頭分岐だが、データ種別ではなくアクセス制限属性という性質上、他カードと横並びにすると認知負荷が上がるため最後に配置する。

## 詳細パネル（2 段階ドリルダウン）

詳細パネルは tree の現在の選択深度に応じて段階的に詳細化される。

### 概要レベル（カード選択時 / tree 中間 node 選択時）

1. **ユースケースの概要**（1-2 段落、研究者の動機起点）
2. **該当する場合は 3 層構造**（Layer 1 メタデータ / Layer 2 生リード / Layer 3 アセンブリ）
3. **データ形式による登録先の分岐**（テーブル、該当 leaf へのナビリンク付き）
4. **共通の準備物**（DDBJ Account、公開鍵）
5. **主要な外部リンク**（D-way、MSS フォーム、ddbj.nig.ac.jp 参考資料）

### 具体レベル（leaf 到達時）

概要レベルの情報に加えて:

6. **ゴール**（登録先システムの組み合わせ）
7. **登録順序**（BioProject → BioSample → DRA → MSS 等）
8. **具体的な準備物**（配列ファイル形式、アノテーションファイル、MD5、MSS data type 選択肢等）
9. **leaf 固有の補足**:
   - 真核ゲノム leaf: 動物/植物/菌類の BioSample パッケージ、locus_tag 命名、qualifier
   - ウイルス leaf: SARS-CoV-2 の DFAST_VRL、GISAID 連携
   - メタゲノム leaf: MAG の品質基準、derived_from qualifier
   - Haplotype leaf: Principal/Alternate の locus_tag 区別
10. **外部ツール・固有リンク**（DFAST, DFAST_VRL, GISAID, ddbj.nig.ac.jp の該当ページ）

詳細パネルの leaf 単位の詳細内容は [submit-details.md](./submit-details.md) に定義する。

### leaf 詳細の実装系統

leaf 具体レベルの描画は 2 系統で提供する:

1. **手書き TSX 版**: ゲノム系の代表 leaf（`prokaryote-raw-assembly`, `eukaryote-raw-assembly`）は `src/content/submit/*Detail.{ja,en}.tsx` で個別に書き下ろす。情報密度を最大化した詳述版
2. **goal テンプレ版**: 上記以外の leaf は `src/lib/mock-data/submit-tree/goalTemplates.ts`（goal 別テンプレ）+ `leafDetails.ts`（leaf 差分データ）を `DetailLeafTemplate` コンポーネントが data-driven に描画。goal Badge / 1 段落 summary / 登録の流れ / leaf 固有 Badge 群（BioSample パッケージ、MSS data type 等）/ 外部リンクの 5 要素構成

判定順は `DetailPanel` が担う: (1) 手書き TSX あり → 手書きを使用、(2) 無ければ `LEAF_DETAILS[leafId]` で goal テンプレ版を使用、(3) どちらも該当しない場合のみ `DetailPlaceholder`（全 31 leaf 分 `LEAF_DETAILS` を埋めるため実質到達しない）

### 詳細パネルの UI 形態

**インライン展開**（Decision Tree の直下に常時描画、同一領域で中身を差し替え）を採用。決め手は SSR / プリレンダリング方針との相性、同一領域コンテンツ差替え方針との直結、focus trap / ESC / scroll lock 等を自前実装せずに済む a11y・モバイル両面での素直さ。初期状態は 1 枚目（微生物ゲノム）の概要レベルを表示しておく。切替時は Detail Panel 見出しに `scrollIntoView({ behavior: "smooth" })`。

### 登録窓口への導線（現状と将来）

当面は、詳細パネル具体レベルから既存の登録窓口（D-way, MSS フォーム, NSSS 等）への外部リンクで誘導する。

将来的には、[DDBJ Record](https://github.com/ddbj/ddbj-record-specifications)（全登録形式を単一 JSON record として統一的に扱う仕様。v3 で全 DB 横断の submission set 表現を目指して設計中）を生成する UI をポータル内で提供し、Repository API へ POST することで登録を完結させる計画。複数 DB にまたがる submission set は 1 つの Record に含められるため、複数ユースケース該当時の統合案内はこの Record UI が SSOT となる。

## i18n

- UI テキスト（質問文、選択肢、カードタイトル、ボタン等）: `locales/ja.json`, `locales/en.json`
- 詳細パネル本文: 言語別 TSX コンポーネント（例: `MicrobialGenomeDetail.ja.tsx`, `MicrobialGenomeDetail.en.tsx`）

## URL 設計

DB ポータル全体の URL 設計方針は [overview.md#url-設計](./overview.md#url-設計) を参照。

### ページとレンダリング

| URL | 用途 | レンダリング |
|---|---|---|
| `/submit` | 登録ナビゲーション（3 セクション 1 ページ） | プリレンダ |

`/submit` は SEO ターゲットであり、静的コンテンツが中心（3 セクションともに TSX で書き下ろし、tree も `@xyflow/react` の SSR 対応を使う）なのでプリレンダで配信する。

### クエリパラメータ

| パラメータ | 値 | 用途 |
|---|---|---|
| `for` | tree の node ID（ケバブケース） | tree の任意 node（中間 node でも leaf でも）を指定し、該当 node をハイライト + Detail Panel を表示。中間 node なら概要レベル、leaf なら具体レベル |

`for` パラメータ 1 つで tree の全状態を表現する。カード / 中間 node / leaf のいずれも同じパラメータで指定できる。

### `for` パラメータの値

全 node（中間 node + leaf）に意味的なケバブケース ID を付与する。`leaf-NN` の番号 ID は仕様書内の識別用で、URL には意味的 ID を使う。

**カード対応 node（9 種類）**:

| 値 | 対応カード | node 種別 |
|---|---|---|
| `microbial` | 微生物ゲノム | 中間（L6-microbial） |
| `eukaryote` | 真核生物ゲノム | 中間（L6-eu） |
| `metagenome` | メタゲノム / MAG / SAG | 中間（L5-meta） |
| `expression` | 遺伝子発現（RNA-seq・アレイ） | 中間（L3-expr） |
| `variation` | 変異データ | 中間（L3-var） |
| `proteomics` | プロテオミクス | leaf（leaf-02） |
| `metabolomics` | メタボロミクス | leaf（leaf-03） |
| `small-sequence` | 小規模塩基配列・PCR 産物 | leaf（leaf-10） |
| `human-restricted` | ヒト制限アクセス | leaf（leaf-01） |

**その他の中間 node**:

| 値 | 対応 node | 備考 |
|---|---|---|
| `prokaryote` | L7-pro | 原核のデータ形式分岐 |
| `virus` | L7-virus | ウイルスのデータ形式分岐 |
| `eukaryote-genome` | L7-eu | 真核通常ゲノムのデータ形式分岐 |
| `eukaryote-haplotype` | L7-eu-hapl | Haplotype のデータ形式分岐 |
| `eukaryote-est` | L7-eu-est | EST の規模分岐 |

**leaf（31 種類）**:

| 値 | 対応 leaf | ゴール |
|---|---|---|
| `human-restricted` | leaf-01 | JGA |
| `proteomics` | leaf-02 | jPOST |
| `metabolomics` | leaf-03 | BP+BS+MetaboBank |
| `variation-human-snp` | leaf-04 | JVar SNP |
| `variation-human-sv` | leaf-05 | JVar SV |
| `variation-nonhuman-snp` | leaf-06 | EVA |
| `variation-nonhuman-sv` | leaf-07 | dgVa |
| `expression-ngs` | leaf-08 | BP+BS+DRA+GEA |
| `expression-array` | leaf-09 | BP+BS+GEA |
| `small-sequence` | leaf-10 | NSSS |
| `metagenome-raw` | leaf-11 | BP+BS+DRA |
| `metagenome-primary` | leaf-12 | BP+BS+DRA (Analysis) |
| `metagenome-genome-bin` | leaf-13 | BP+BS+DRA+MSS |
| `metagenome-tls` | leaf-14 | BP+BS+DRA+MSS (TLS) |
| `metagenome-tsa` | leaf-15 | BP+BS+DRA+MSS (TSA) |
| `organelle-plasmid` | leaf-16 | BP+BS+MSS |
| `prokaryote-raw` | leaf-17 | BP+BS+DRA |
| `prokaryote-raw-assembly` | leaf-18 | BP+BS+DRA+MSS |
| `prokaryote-assembly-only` | leaf-19 | BP+BS+MSS |
| `virus-raw` | leaf-20 | BP+BS+DRA |
| `virus-raw-assembly` | leaf-21 | BP+BS+DRA+MSS |
| `virus-assembly-only` | leaf-22 | BP+BS+MSS |
| `eukaryote-tsa` | leaf-23 | BP+BS+DRA+MSS (TSA) |
| `eukaryote-tpa` | leaf-24 | BP+BS+MSS (TPA) |
| `eukaryote-raw` | leaf-25 | BP+BS+DRA |
| `eukaryote-raw-assembly` | leaf-26 | BP+BS+DRA+MSS |
| `eukaryote-assembly-only` | leaf-27 | BP+BS+MSS |
| `eukaryote-haplotype-raw-assembly` | leaf-28 | BP+BS+DRA+MSS (Haplotype) |
| `eukaryote-haplotype-assembly-only` | leaf-29 | BP+BS+MSS (Haplotype) |
| `eukaryote-est-small` | leaf-30 | NSSS (EST) |
| `eukaryote-est-large` | leaf-31 | BP+BS+MSS (EST) |

カードが leaf に直行する場合（`proteomics`, `metabolomics`, `small-sequence`, `human-restricted`）はカード対応 node ID と leaf ID が同一になる。

### URL の組み合わせ

- `/submit`: 初期状態（1 枚目カードの概要レベル）
- `/submit?for=microbial`: 中間 node（微生物ゲノムカード相当）、Detail Panel は概要レベル
- `/submit?for=prokaryote-raw-assembly`: leaf、Detail Panel は具体レベル
- `/submit?for=proteomics`: leaf かつカード、Detail Panel は具体レベル

### canonical

`/submit?for=xxx` の canonical はすべて `/submit`。全バリエーションは同一コンテンツの断片表示であり、検索インデックスは `/submit` に集約する。

### 却下案

以下は URL に載せる候補として検討したが採用しない:

- **Detail Panel の開閉状態**: インライン展開で常時描画しているため状態不要
- **`for` と `leaf` の 2 パラメータ分離**（`?for=<card-id>&leaf=<leaf-id>`）: tree の全 node に一意 ID があるため、`for` 1 パラメータで常に単一 node を指定できる。2 パラメータは冗長であり、カードが leaf に直行するケース（`?for=proteomics&leaf=proteomics`）で不自然な重複が発生する

## 設計上の決定事項

- **tree の深さと幅**: 深さ 2〜7 層、leaf 31 個。レイヤー数はモダリティ・生物カテゴリで可変（JGA / プロテオミクス / メタボロミクス / GEA / NSSS は浅い、真核ゲノムは最深）
- **leaf 統合判定基準**: 本章「設計原則」節で定義。登録先システム・ワークフロー構造・必要準備物が変わるなら tree で分岐、MSS 内 data type や BioSample パッケージ選択の違いだけなら統合して詳細パネルで案内
- **カードの抽出原則**: tree 中間 node のうち「研究者のドメイン自己認識」に合致するものをカード化。leaf 数が少ない単発 leaf（プロテオミクス、メタボロミクス、小規模、ヒト制限）はそれ自体をカード化、leaf 数が多い共通ドメイン（メタゲノム、変異、発現、微生物ゲノム、真核ゲノム）は集約してカード化
- **詳細パネルの UI 形態**: インライン展開。Decision Tree の直下に常時描画、同一領域で中身を差し替え。サイドパネル・モーダルは SSR 相性と 1 ページ完結方針との不整合で却下、アコーディオンはカード / tree → Detail Panel 自動切替と開閉状態の二重管理で UX が複雑化するため却下
- **詳細パネルの 2 段階ドリルダウン**: カード選択 → 概要レベル / leaf 到達 → 具体レベル。詳細パネルの複雑性を tree 深度に応じて分散する
- **tree 描画ライブラリ**: `@xyflow/react` v12 系（React Flow）を採用。決め手は SSR 公式サポート（React Router v7 のプリレンダリング方針と整合）、カスタムノードで react-i18next / Tailwind を自然に適用できること、カード経路ハイライトを `nodes` / `edges` の className 切替で宣言的に実装できること。Mermaid は SSR 不可・i18n 相性不良・バンドル肥大で却下
- **tree の a11y / モバイル対応**: PC only 前提で進める。`@xyflow/react` のキーボード操作・スクリーンリーダー・モバイル横幅への専用対応は行わない。tree はゴール俯瞰の視覚的補助であり、操作経路としての代替手段は Use Case Cards（全 9 ユースケースに直接到達可能）で既に存在する
- **URL 設計**: `?for=<node-id>` の 1 パラメータで tree の任意 node（中間 node でも leaf でも）を指定。全 node に一意のケバブケース ID を付与。中間 node なら概要レベル、leaf なら具体レベルの Detail Panel を表示。カードが leaf に直行するケース（プロテオミクス等）は node ID = leaf ID で自然に統一される
- **EST の扱い**: 新規登録ほぼゼロだが網羅性優先で tree に残す（leaf-30 / leaf-31）
- **MGA の扱い**: 新規受付終了済みのため tree から除外、既存データの閲覧は該当カードの詳細パネル内で言及のみ
- **HTC（High Throughput cDNA）の扱い**: 現状新規登録ほぼゼロ、tree から独立 leaf を作らず真核 EST / 真核通常の詳細パネルで言及
- **複数ユースケースに該当する場合の案内方法**: 専用 UI は作らない。カードは単一選択、詳細パネルにも関連カード切替リンクを置かない。必要なカード（ゲノム系 3 枚: 微生物 / 真核 / メタゲノム）の詳細パネル内で BioProject umbrella 統合の概念に平文で触れる程度に留める。複数 DB にまたがる submission set の統合案内は、将来の [DDBJ Record](https://github.com/ddbj/ddbj-record-specifications) ベース登録 UI が SSOT となる予定

## コンテンツ原典

ddbj/www の以下のファイルを原典とする。文言はそのまま書き換えないが、情報の整理・取捨選択・新規書き下ろしは行う。既存のファイル分割単位は流用しない。

| 原典 | 参照先 |
|---|---|
| `submission-navigation.md` | ddbj/www 現行ウィザード（参考） |
| `submission.md` | DB と登録窓口一覧 |
| `_ddbj/data-categories.md` | MSS data type（WGS/GNM/MAG/SAG/TLS/HTG/TSA/HTC/EST/MISC/ASK） |
| `_ddbj/genome.md` | ゲノム登録 |
| `_ddbj/metagenome-assembly.md` | MAG / Binned |
| `_ddbj/single-amplified-genome.md` | SAG |
| `_ddbj/tls.md` | TLS |
| `_ddbj/transcriptome.md`, `_ddbj/tsa.md` | トランスクリプトーム / TSA |
| `_ddbj/est.md` | EST |
| `_ddbj/tpa.md`, `_ddbj/tpa-table.md` | TPA |
| `_ddbj/haplotype.md` | Haplotype |
| `_ddbj/htg.md` | HTG |
| `_ddbj/submission.md`, `_ddbj/mss.md`, `_ddbj/web-submission.md` | DDBJ 登録（NSSS / MSS） |
| `_dra/submission.md` | DRA |
| `_bioproject/submission.md` | BioProject |
| `_biosample/submission.md` | BioSample |
| `_gea/submit-sequence.md`, `_gea/submit-array.md` | GEA |
| `_metabobank/submission.md` | MetaboBank |
| `_jga/submission.md` | JGA |
