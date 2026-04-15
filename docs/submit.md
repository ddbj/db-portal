# 登録ナビゲーション

DDBJ の複数 DB にまたがる登録フローを、ユースケース起点で案内する仕様。カード + フローチャート + 詳細パネルの 3 セクション構成。

## 概要

DDBJ の複数 DB にまたがる登録フローを、ユースケース起点で統合的にガイドする。登録システム単位（D-way, MSS, NSSS 等）ではなく、研究者の動機（何を登録したいか）を起点とする。

ナビゲーションは `/submit` 1 ページで完結させる。独立した QuickStart ページは設けない。

## ページ構成

`/submit` は 3 セクションの縦構成。

```
+--- /submit -----------------------------------------+
|  [Section A] Use case cards (grid of 8)             |
|  [Section B] Flowchart                              |
|  [Section C] Detail panel (dynamic)                 |
+-----------------------------------------------------+
```

- Section A のカードクリック -> Section C が該当ユースケースに切り替わる。Section B の該当経路もハイライトする
- Section B のフローチャートをゴールまで進める -> Section C にゴール内容が表示される
- Section C は同一領域でコンテンツだけ差し替え（独立したページ遷移はしない）

## ユースケースカード（8 枚）

研究者の動機を起点にカードを設計する。

| カード | 対象 | 代表例 |
|---|---|---|
| 微生物ゲノム | 原核生物、ウイルス、プラスミド、オルガネラ | 細菌ゲノム、ファージ、ミトコンドリア |
| 真核生物ゲノム | 動物・植物・菌類の核ゲノム | モデル生物、非モデル真核生物 |
| メタゲノム / MAG / SAG | 環境サンプル、単一細胞ゲノム | 土壌微生物、海洋微生物 |
| 遺伝子発現 / RNA-seq（NGS・アレイ） | 発現解析（NGS・アレイ）、TSA、EST | Bulk RNA-seq、Single-cell、TSA、マイクロアレイ |
| 変異データ | SNP / SV（ヒト・非ヒト） | GWAS、Population genomics |
| ヒト制限アクセス | NBDC 承認が必要な個人データ | GWAS 生データ、臨床ゲノム |
| メタボロミクス | 代謝物プロファイリング | LC-MS、GC-MS |
| 小規模塩基配列・PCR 産物 | 100 配列未満、500 kb 未満 | 16S rRNA、遺伝子クローン、論文 Figure 用配列 |

カードの表示優先順は上から順。第一段階では全カードを表示するが、詳細パネルの書き下ろしはゲノム系（1, 2）を優先する。

## 登録先（ゴール）の組み合わせ

フローチャートの最終結果となるゴール。組み合わせは約 11 種類。

| ゴール | 登録先 | 代表ユースケース |
|---|---|---|
| BP+BS+DRA+MSS | BioProject + BioSample + DRA + DDBJ (Trad)（MSS 経由） | ゲノム（NGS + アセンブリ） |
| BP+BS+DRA | BioProject + BioSample + DRA | NGS 生リードのみ |
| BP+BS+MSS | BioProject + BioSample + DDBJ (Trad)（MSS 経由） | アセンブリ配列のみ |
| BP+BS+DRA+GEA | BioProject + BioSample + DRA + GEA | 遺伝子発現（NGS） |
| BP+BS+GEA | BioProject + BioSample + GEA | 遺伝子発現（アレイ） |
| NSSS | DDBJ (Trad)（NSSS 経由） | 小規模塩基配列（16S rRNA 等） |
| MSS | DDBJ (Trad)（MSS 経由） | 単独ウイルス / オルガネラゲノム等 |
| JGA | JGA（NBDC 承認要） | ヒト制限アクセスデータ |
| MetaboBank | MetaboBank | メタボロミクス |
| 外部 (JVar / EVA / dgVA) | 外部リダイレクト | 変異データ |
| 外部 (jPOST) | 外部リダイレクト | プロテオミクス |

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

「ゲノム登録」は単一の行為ではなく、3 層のデータを段階的・並行的に登録する統合プロセス。カード 1（微生物ゲノム）、カード 2（真核生物ゲノム）、カード 3（メタゲノム / MAG / SAG）の詳細パネルで、この構造を明示する。

### 3 層構造

```
Layer 1: Metadata   -> BioProject + BioSample (D-way)
Layer 2: Raw reads  -> DRA (D-way)
Layer 3: Assembly   -> DDBJ (Trad) via MSS or NSSS
```

各層は独立して登録される。層間は BioProject / BioSample のアクセッション番号で結びつく。

### アセンブリ段階

塩基配列の「完成度」で登録先のデータ種別（division）が変わる。

| 段階 | 略称 | 内容 | 登録先 |
|---|---|---|---|
| Raw reads | - | NGS の生出力 | DRA |
| Contigs（overlapping reads） | WGS | Whole Genome Shotgun | DDBJ (Trad) WGS 区分（MSS 経由） |
| Draft clone sequences | HTG | BAC / YAC / fosmid のドラフト | DDBJ (Trad) HTG 区分（MSS 経由） |
| Finished level | GNM | 染色体全長相当の連続配列 | DDBJ (Trad) GNM 区分（MSS 経由） |

### 分岐軸

- **生物種**: 原核 / 真核 / ウイルス / オルガネラ / プラスミド / メタゲノム
- **アセンブリレベル**: Finished level / Draft（WGS） / 中間（HTG）

登録の組み合わせは「研究者がどこまでの配列を持っているか」で決まる。

| 持っているデータ | 登録先の組み合わせ |
|---|---|
| Raw reads のみ | BP+BS+DRA |
| Raw reads + Contigs（Draft） | BP+BS+DRA+MSS (WGS) |
| Raw reads + Finished level genome | BP+BS+DRA+MSS (Finished) |
| Finished level genome のみ（既存 raw reads を参照） | BP+BS+MSS (Finished) |

### 原核生物と真核生物の違い

| 項目 | 原核生物 | 真核生物 |
|---|---|---|
| 構造 | Chromosome + Plasmid | Chromosome（複数） + organelle |
| アノテーション | DFAST で自動化可能 | 手動 / 既存パイプラインに依存 |
| locus_tag prefix | 必須 | 必須 |
| unlocalized / unplaced 配列 | 稀 | 一般的 |

### 特殊ケース

- **ウイルス / ファージ**: 小規模で Finished level に到達しやすい。segment 対応
- **オルガネラ / プラスミド**: 独立したエントリとして登録（WGS には含めない）
- **メタゲノム / MAG / SAG**: 環境サンプル由来の配列。仮想 BioSample とメタゲノム固有の属性（metagenome_source、derived_from 等）が必要
- **Haplotype**: Principal / Alternate の 2 系統を別 BioProject として登録し、umbrella project でまとめる

## フローチャート分岐仕様

質問キーは `q{階層}-{id}`、ゴールキーは `g-{組み合わせ}` で表記する。ddbj/www 現行ウィザードの分岐構造を参考にしつつ、ユーザー体験起点で再設計する方針（「フローチャート全体の包括的な再設計」は未決事項）。

### Q1: ヒトを対象とした研究データで、アクセス制限が必要ですか？

| 選択肢 | 分岐 |
|---|---|
| はい（NBDC の提供申請が必要 / 既に承認済み） | Goal: JGA |
| いいえ | Q2 |

### Q2: データの種類は？

| 選択肢 | 分岐 |
|---|---|
| ゲノム配列 | Q3-genome |
| メタゲノム | Q3-metagenome |
| トランスクリプトーム | Q3-transcriptome |
| 変異データ | Q3-variation |
| 遺伝子発現（NGS による RNA-seq 等） | Goal: BP+BS+DRA+GEA |
| 遺伝子発現（マイクロアレイ） | Goal: BP+BS+GEA |
| メタボロミクス | Goal: MetaboBank |
| プロテオミクス | Goal: jPOST（外部） |
| その他の塩基配列 | Q3-other |

### Q3-genome: 生物の種類は？

| 選択肢 | 分岐 |
|---|---|
| 原核生物（細菌・古細菌） | Q5-genome-prokaryote |
| 真核生物（動物・植物・菌類） | Q5-genome-eukaryote |
| ウイルス | Q4-genome-virus |
| オルガネラ（ミトコンドリア・葉緑体） | Q4-genome-organelle |
| プラスミド | Q4-genome-plasmid |
| Haplotype（Principal / Alternate を区別する二倍体ゲノム） | Q4-genome-haplotype |
| TPA（Third Party Data: 他者が登録済の配列を再解析） | Q3-tpa |

### Q4-genome-{virus, organelle, plasmid}: 登録方法は？

登録窓口（NSSS / MSS）は配列の規模・種別で決まる。以下のいずれかに該当すれば MSS、そうでなければ NSSS（ddbj/www `_ddbj/submission.md` 基準）。

**MSS を選ぶ条件:**

- 配列数が 100 を超える
- 配列長が 500 kb 以上
- 1 エントリあたり Feature 数が 30 以上
- WGS / CON / HTG / TSA / TLS / HTC / EST / GSS / TPA のいずれかの種別
- DBLINK（BioProject / BioSample）記載が必要

| 選択肢 | ゴール |
|---|---|
| 上記条件に該当しない小規模配列 | NSSS |
| 上記いずれかに該当する | MSS（単独） or BP+BS+MSS |

### Q4-genome-haplotype: Haplotype ゲノムの登録方法は？

二倍体ゲノムで Principal / Alternate を明示的に区別する場合、umbrella BioProject 配下に Principal / Alternate の個別 BioProject を配置する特殊構成を取る。BioSample は共通、BioProject は Principal / Alternate 別に作成する。

| 選択肢 | ゴール |
|---|---|
| NGS 生リード + アセンブリ配列 | BP+BS+DRA+MSS（umbrella + Principal + Alternate 構成） |
| アセンブリ配列のみ | BP+BS+MSS（umbrella + Principal + Alternate 構成） |

### Q5-genome-{prokaryote, eukaryote}: アセンブリレベルと登録方法は？

アセンブリレベル:

- 完成（Finished level）
- ドラフト（Draft / WGS）

登録方法:

| 選択肢 | ゴール |
|---|---|
| NGS 生リード + アセンブリ配列 | BP+BS+DRA+MSS |
| NGS 生リードのみ | BP+BS+DRA |
| アセンブリ配列のみ | BP+BS+MSS |

### Q3-metagenome: メタゲノムの段階は？

| 選択肢 | 分岐 |
|---|---|
| プライマリーメタゲノム（未同定アセンブリ） | Q4-metagenome-primary |
| Binned メタゲノム（既知分類群に帰属） | Q4-metagenome-binned |
| MAG（Metagenome-Assembled Genome、代表ゲノム） | Q4-metagenome-mag |
| TLS（Targeted Locus Study） | Q4-metagenome-tls |
| その他 | Q4-metagenome-other |

各 Q4 で登録方法（DRA のみ / DRA + MSS / MSS のみ）を選ぶ。

### Q3-transcriptome: トランスクリプトームの種類は？

| 選択肢 | ゴール |
|---|---|
| EST（Expressed Sequence Tags） | BP+BS+MSS |
| TSA（Transcriptome Shotgun Assembly） | BP+BS+DRA+MSS |
| 発現解析（NGS） | BP+BS+DRA+GEA |
| その他 | Q4-transcriptome-other |

### Q3-variation: 変異データの種類は？

| 選択肢 | ゴール |
|---|---|
| ヒト SNP | 外部: JVar SNP |
| ヒト SV（構造変異） | 外部: JVar SV |
| 非ヒト SNP | 外部: EVA（EBI） |
| 非ヒト SV | 外部: dgVA（EBI） |

### Q3-tpa: TPA データの登録

TPA（Third Party Annotation: 他者が既に登録した配列を第三者が再解析・再アノテーションして登録する形態）。TLS / TSA / WGS assembly いずれも登録先は共通のため、フローチャートでは種類を問わず 1 ゴールに集約する。TPA の 4 種類（TPA:experimental / TPA:inferential は 2025 年 1 月新規受付終了、TPA:assembly / TPA:specialist_db は継続）は詳細パネルで説明する。

ゴール: **BP+BS+MSS**

### Q3-other: 登録方法は？

| 選択肢 | ゴール |
|---|---|
| NGS 生リード | BP+BS+DRA |
| NGS + アセンブリ | BP+BS+DRA+MSS |
| アセンブリのみ | BP+BS+MSS |
| 小規模塩基配列（100 配列未満） | NSSS |

## カードとフローチャート経路の対応

カードクリック時、フローチャートでハイライトする経路。

| カード | 経路 |
|---|---|
| 微生物ゲノム | Q2=Genome -> Q3=Prokaryote / Virus / Plasmid / Organelle |
| 真核生物ゲノム | Q2=Genome -> Q3=Eukaryote |
| メタゲノム / MAG / SAG | Q2=Metagenome |
| 遺伝子発現 / RNA-seq（NGS・アレイ） | Q2=Transcriptome / 遺伝子発現（NGS） / 遺伝子発現（アレイ） |
| 変異データ | Q2=Variation |
| ヒト制限アクセス | Q1=Yes |
| メタボロミクス | Q2=Metabolomics |
| 小規模塩基配列・PCR 産物 | Q3-other=Small sequences / 各 Q4 の NSSS 分岐 |

## 詳細パネル（Section C）の内容

詳細パネルには以下を含める。

1. ユースケースの概要（1-2 段落）
2. 登録フロー図（BP -> BS -> DRA -> MSS などの順序を視覚化）
3. 各 DB の役割と登録ステップ
4. 必要な準備物（DDBJ Account、公開鍵、サンプル情報、データファイル等）
5. 既存システム（D-way、MSS フォーム、NSSS 等）へのリンク
6. ddbj.nig.ac.jp の参考資料へのリンク

### 第一段階で書き下ろす詳細パネル

- 微生物ゲノム
- 真核生物ゲノム

他のユースケースは概要と既存ページへのリンクを最小限で用意する。フローチャートゴールの詳細は既存ページに誘導する。

### 登録窓口への導線（現状と将来）

第一段階では、詳細パネルから既存の登録窓口（D-way, MSS フォーム, NSSS 等）への外部リンクで誘導する。将来的にはポータル内で登録フォームを提供し、Repository API を直接叩く計画（overview.md「将来的な拡張」参照）。

## i18n

- UI テキスト（質問文、選択肢、カードタイトル、ボタン等）: `locales/ja.json`, `locales/en.json`
- 詳細パネル本文: 言語別 TSX コンポーネント（例: `MicrobialGenomeDetail.ja.tsx`, `MicrobialGenomeDetail.en.tsx`）

## URL 設計

| URL | 用途 |
|---|---|
| `/submit` | 登録ナビゲーション（1 枚構成） |

カード選択やフローチャート進行状態を URL に反映するかは第一段階ではスコープ外。将来的にブックマーク / 共有のため `?card=xxx` や `?flow=q1-yes,q2-genome` 等のクエリ反映を検討する。

## コンテンツ原典

ddbj/www の以下のファイルを原典とする。文言はそのまま書き換えないが、情報の整理・取捨選択・新規書き下ろしは行う。既存のファイル分割単位は流用しない。

| 原典 | 参照先 |
|---|---|
| `submission-navigation.md` | ddbj/www 現行ウィザード（参考） |
| `submission.md` | DB と登録窓口一覧 |
| `_ddbj/genome.md` | ゲノム登録 |
| `_ddbj/metagenome-assembly.md` | MAG / Binned |
| `_ddbj/single-amplified-genome.md` | SAG |
| `_ddbj/transcriptome.md` | トランスクリプトーム |
| `_ddbj/submission.md`, `_ddbj/mss.md`, `_ddbj/web-submission.md` | DDBJ 登録（NSSS / MSS） |
| `_dra/submission.md` | DRA |
| `_bioproject/submission.md` | BioProject |
| `_biosample/submission.md` | BioSample |
| `_gea/submit-sequence.md`, `_gea/submit-array.md` | GEA |
| `_metabobank/submission.md` | MetaboBank |
| `_jga/submission.md` | JGA |

## 未決事項

- [ ] **フローチャート全体の包括的な再設計**: 現行 ddbj/www ウィザードは分岐が複雑で、ユーザー体験起点で全体を再設計する必要がある。以下を全て含む
    - HTG（BAC/YAC/fosmid のドラフト）選択肢の Q5 への追加
    - トランスクリプトーム分岐の対称化（現状 EST/TSA/発現解析は直接ゴール、「その他」のみ Q4）
    - Haplotype 特殊ゴール（umbrella + Principal + Alternate）のゴール組み合わせ表への記載
    - MGA（新規終了） / GSS（Q3-other 配下） / COVID-19（通常フロー）の扱いの明示
    - 選択肢文言のユーザー寄り化
- [ ] 詳細パネルの具体的な記述内容（第一段階: 微生物ゲノム / 真核生物ゲノム）
- [ ] Section C の UI 形態（インライン展開 / アコーディオン / サイドパネル / モーダル）
- [ ] フローチャート進行状態の URL 反映可否
- [ ] 外部サービス（JVar / EVA / dgVA / jPOST）への誘導 UI（新規タブ / 案内ページ / リダイレクト）
- [ ] フローチャートの描画ライブラリ選定（React Flow / Mermaid / 自前 SVG）
- [ ] モバイルレイアウト（カードの縦積み、フローチャートの収め方）
- [ ] 複数ユースケースに該当する場合の案内方法（例: ゲノム + メタボロミクス）
