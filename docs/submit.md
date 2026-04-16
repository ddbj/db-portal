# 登録ナビゲーション

DDBJ の複数 DB にまたがる登録フローを、ユースケース起点で案内する仕様。カード + フローチャート + 詳細パネルの 3 セクション構成。

## 概要

DDBJ の複数 DB にまたがる登録フローを、ユースケース起点で統合的にガイドする。登録システム単位（D-way, MSS, NSSS 等）ではなく、研究者の動機（何を登録したいか）を起点とする。

ナビゲーションは `/submit` 1 ページで完結させる。独立した QuickStart ページは設けない。

## ページ構成

`/submit` は 3 セクションの縦構成。

```
+--- /submit -----------------------------------------+
|  [Use Case Cards] grid of 8                         |
|  [Decision Flowchart]                               |
|  [Detail Panel] dynamic                             |
+-----------------------------------------------------+
```

- Use Case Cards のカードクリック -> Detail Panel が該当ユースケースに切り替わる。Decision Flowchart の該当経路もハイライトする
- Decision Flowchart をゴールまで進める -> Detail Panel にゴール内容が表示される
- Detail Panel は同一領域でコンテンツだけ差し替え（独立したページ遷移はしない）

## ユースケースカード（8 枚）

研究者の動機を起点にカードを設計する。

| カード | 対象 | 代表例 |
|---|---|---|
| 微生物ゲノム | 原核生物、ウイルス、プラスミド、オルガネラ、ファージ | 細菌ゲノム、ファージ、ミトコンドリア、SARS-CoV-2 |
| 真核生物ゲノム | 動物・植物・菌類のゲノム / 転写産物配列 | モデル生物、非モデル真核生物、Haplotype、de novo transcriptome（TSA）、EST |
| メタゲノム / MAG / SAG | 環境サンプル、単一細胞ゲノム、メタトランスクリプトーム | 土壌・海洋微生物、MAG、Binned、Primary、SAG、TLS、メタ TSA |
| 遺伝子発現（RNA-seq・アレイ） | 発現プロファイル（NGS / マイクロアレイ） | Bulk RNA-seq、single-cell RNA-seq、マイクロアレイ |
| 変異データ | SNP / SV（ヒト・非ヒト） | GWAS、Population genomics |
| ヒト制限アクセス | NBDC 承認が必要な個人データ | GWAS 生データ、臨床ゲノム |
| メタボロミクス | 代謝物プロファイリング | LC-MS、GC-MS |
| 小規模塩基配列・PCR 産物 | 100 配列未満、500 kb 未満 | 16S rRNA、遺伝子クローン、論文 Figure 用配列 |

カードの表示優先順は上から順。初期に全 8 カードの詳細パネルを書き下ろす。

## 登録先（ゴール）の組み合わせ

フローチャートの最終結果となるゴール。組み合わせは 12 種類。

| ゴール | 登録先 | 代表ユースケース |
|---|---|---|
| BP+BS+DRA+MSS | BioProject + BioSample + DRA + DDBJ (Trad)（MSS 経由） | ゲノム（NGS + アセンブリ）、TSA |
| BP+BS+DRA | BioProject + BioSample + DRA | NGS 生リードのみ |
| BP+BS+MSS | BioProject + BioSample + DDBJ (Trad)（MSS 経由） | アセンブリ配列のみ、EST、TPA |
| BP+BS+DRA+MSS (Haplotype) | BioProject (umbrella + Principal + Alternate) + BioSample + DRA + DDBJ (Trad)（MSS 経由） | Haplotype 区別を伴う二倍体ゲノム（生リード + アセンブリ） |
| BP+BS+MSS (Haplotype) | BioProject (umbrella + Principal + Alternate) + BioSample + DDBJ (Trad)（MSS 経由） | Haplotype 区別を伴う二倍体ゲノム（アセンブリのみ） |
| BP+BS+DRA+GEA | BioProject + BioSample + DRA + GEA | 遺伝子発現（NGS） |
| BP+BS+GEA | BioProject + BioSample + GEA | 遺伝子発現（マイクロアレイ） |
| NSSS | DDBJ (Trad)（NSSS 経由） | 小規模塩基配列（16S rRNA 等） |
| JGA | JGA（NBDC 承認要） | ヒト制限アクセスデータ |
| MetaboBank | MetaboBank | メタボロミクス |
| 外部 (JVar / EVA / dgVa) | 外部リダイレクト | 変異データ |
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

質問キーは `q{階層}-{id}`、ゴールキーは `g-{組み合わせ}` で表記する。階層は最大 3（L1: ヒト制限 / L2: データ種別 = カード 8 枚 / L3: 持っているデータ）。質問・選択肢の文言は研究者の動機（「何を持っているか / 何を登録したいか」）起点で表現し、DDBJ 内部用語（MSS / NSSS / WGS / HTG / TLS / TPA / EST / TSA 等）は補足に留める。

### L1 / Q1: ヒトを対象とした個人特定リスクのあるデータですか？

| 選択肢 | 分岐 |
|---|---|
| はい（NBDC の提供申請が必要 / 既に承認済み） | Goal: JGA |
| いいえ | Q2 |

### L2 / Q2: 何を登録したいですか？（カード 8 枚と同じ 8 択）

| 選択肢 | 分岐 |
|---|---|
| 微生物ゲノム（細菌・古細菌・ウイルス・オルガネラ・プラスミド・ファージ） | Q3-microbial |
| 真核生物ゲノム（動物・植物・菌類） | Q3-eukaryote |
| メタゲノム / MAG / SAG | Q3-metagenome |
| 遺伝子発現（RNA-seq・マイクロアレイ） | Q3-expression |
| 変異データ（SNP / SV） | Q3-variation |
| メタボロミクス | Goal: MetaboBank |
| プロテオミクス | Goal: jPOST（外部） |
| 小規模塩基配列・PCR 産物（100 配列未満・500 kb 未満） | Goal: NSSS |

### L3 / Q3-microbial: 持っているデータと規模は？

| 選択肢 | 補足（内部用語） | ゴール |
|---|---|---|
| 生リード + アセンブリ配列 | DRA + MSS（WGS / Finished） | BP+BS+DRA+MSS |
| 生リードのみ | DRA | BP+BS+DRA |
| アセンブリ配列のみ | MSS（WGS / Finished） | BP+BS+MSS |
| 小規模（100 配列未満・500 kb 未満・BioProject/BioSample 不要） | NSSS | NSSS |

ウイルス segment / オルガネラ / プラスミドの個別エントリ要件、SARS-CoV-2 への DFAST_VRL 等の支援は詳細パネルで案内。

### L3 / Q3-eukaryote: 持っているデータは？

| 選択肢 | 補足（内部用語） | ゴール |
|---|---|---|
| 生リード + ゲノムアセンブリ | DRA + MSS（WGS / HTG / Finished） | BP+BS+DRA+MSS |
| 生リードのみ | DRA | BP+BS+DRA |
| ゲノムアセンブリのみ（完成 / ドラフト / クローン中間すべて含む） | MSS（WGS / HTG / Finished） | BP+BS+MSS |
| Haplotype 区別を伴う二倍体ゲノム（Principal / Alternate を別登録） | umbrella + Principal + Alternate 構成 | Q3-eukaryote-haplotype |
| 転写産物アセンブリ配列（de novo transcriptome） | MSS（TSA） | BP+BS+DRA+MSS |
| 単発 cDNA 配列（Sanger シングルパス） | MSS（EST）。100 配列未満なら NSSS も可 | BP+BS+MSS |

アセンブリレベル詳細（Finished / WGS / HTG PHASE 0/1/2）、TPA（assembly / specialist_db のみ継続）の追加要件は詳細パネルで案内。

### L3 / Q3-eukaryote-haplotype: Haplotype の登録構成は？

二倍体ゲノムで Principal / Alternate を明示的に区別する場合、umbrella BioProject 配下に Principal / Alternate 個別の BioProject を配置する特殊構成を取る。BioSample は共通、BioProject は umbrella + Principal + Alternate の 3 つ。

| 選択肢 | ゴール |
|---|---|
| 生リード + アセンブリ | BP+BS+DRA+MSS (Haplotype) |
| アセンブリのみ | BP+BS+MSS (Haplotype) |

### L3 / Q3-metagenome: 持っているデータは？

| 選択肢 | 補足（内部用語） | ゴール |
|---|---|---|
| 生リード + アセンブリ（MAG / Binned / Primary / TLS / SAG / メタトランスクリプトーム TSA） | DRA + MSS | BP+BS+DRA+MSS |
| 生リードのみ | DRA | BP+BS+DRA |
| アセンブリのみ | MSS | BP+BS+MSS |

MAG / Binned / Primary / SAG / TLS の段階別の違い、メタトランスクリプトーム TSA の扱いは詳細パネルで案内。

### L3 / Q3-expression: 計測手法は？

GEA 系専用に純化（転写産物配列の登録 = TSA / EST は真核生物ゲノム / メタゲノムカード配下）。

| 選択肢 | 補足（内部用語） | ゴール |
|---|---|---|
| NGS による RNA-seq（発現解析） | DRA + GEA | BP+BS+DRA+GEA |
| マイクロアレイ | GEA | BP+BS+GEA |

### L3 / Q3-variation: ヒト / 非ヒト × SNP / SV

| 選択肢 | ゴール |
|---|---|
| ヒト SNP / Indel（≤ 50 bp） | 外部: JVar SNP |
| ヒト SV（> 50 bp、構造変異） | 外部: JVar SV |
| 非ヒト SNP / Indel | 外部: EVA（EBI） |
| 非ヒト SV | 外部: dgVa（EBI） |

## 特殊ケースの扱い

ddbj/www 現行ウィザードに登場する特殊データ種別は、フローの選択肢には出さず、各カードの詳細パネルで補足する方針。

| 種別 | 新規受付 | フローでの扱い | 詳細パネルでの案内 |
|---|---|---|---|
| MGA（Mass sequence for Genome Annotation） | 終了 | フローから完全除外 | 既存データ閲覧のみ言及 |
| GSS（Genome Survey Sequences） | 継続中 | 微生物 / 真核ゲノムの「アセンブリ配列のみ」に包含 | clone qualifier 必須等の MSS 要件 |
| COVID-19 / SARS-CoV-2 | 継続中 | 微生物ゲノムフローに統合 | DFAST_VRL ツール、Japan Covid-19 Open Data Consortium、GISAID 連携 |
| HTG（BAC / YAC / fosmid ドラフト） | 継続中 | 真核ゲノムの「ゲノムアセンブリ」に包含 | PHASE 0/1/2 の選択、clone qualifier、MSS 経由 |
| TPA（Third Party Annotation） | assembly / specialist_db のみ継続（experimental / inferential は 2025/01 終了） | 真核ゲノムの「ゲノムアセンブリのみ」に包含 | 4 種別の現状、peer-reviewed 発表必須 |
| SAG（Single Amplified Genome） | 継続中 | メタゲノムフローに包含 | MISAG BioSample パッケージ、MSS 経由 |
| MAG / Binned / Primary metagenome | 継続中 | メタゲノムフローに包含 | 段階別の登録先（DRA / DRA+MSS） |
| メタトランスクリプトーム TSA | 継続中 | メタゲノムフローに包含 | 「メタゲノム由来の TSA」の扱い |
| EST | 継続中（新規ほぼゼロ） | 真核ゲノム / メタゲノムフローに包含 | 歴史的経緯、Sanger シングルパス cDNA |
| TSA | 継続中 | 真核ゲノム / メタゲノムフローに包含 | de novo transcriptome assembly の典型 |

## カードとフローチャート経路の対応

カードクリック時、フローチャートでハイライトする経路。カード 8 枚と Q2 の選択肢 8 択は 1:1 対応する。

| カード | 対応する経路 |
|---|---|
| 微生物ゲノム | Q1=No -> Q2=Microbial -> Q3-microbial の各分岐 |
| 真核生物ゲノム | Q1=No -> Q2=Eukaryote -> Q3-eukaryote の各分岐（Haplotype 含む） |
| メタゲノム / MAG / SAG | Q1=No -> Q2=Metagenome -> Q3-metagenome の各分岐 |
| 遺伝子発現（RNA-seq・アレイ） | Q1=No -> Q2=Expression -> Q3-expression の各分岐 |
| 変異データ | Q1=No -> Q2=Variation -> Q3-variation の各分岐 |
| ヒト制限アクセス | Q1=Yes |
| メタボロミクス | Q1=No -> Q2=Metabolomics |
| 小規模塩基配列・PCR 産物 | Q1=No -> Q2=Small sequences |

## Detail Panel の内容

詳細パネルには以下を含める。

1. ユースケースの概要（1-2 段落）
2. 登録フロー図（BP -> BS -> DRA -> MSS などの順序を視覚化）
3. 各 DB の役割と登録ステップ
4. 必要な準備物（DDBJ Account、公開鍵、サンプル情報、データファイル等）
5. 既存システム（D-way、MSS フォーム、NSSS 等）へのリンク
6. ddbj.nig.ac.jp の参考資料へのリンク

### 初期に書き下ろす詳細パネル

全 8 カード分の詳細パネルの記述内容は [submit-details.md](./submit-details.md) に定義する。記述深度はカードごとに調整する（ゲノム系は最も詳しく、外部リダイレクト系（変異・プロテオミクス）は概要 + 外部リンク中心）。

### 登録窓口への導線（現状と将来）

当面は、詳細パネルから既存の登録窓口（D-way, MSS フォーム, NSSS 等）への外部リンクで誘導する。

将来的には、[DDBJ Record](https://github.com/ddbj/ddbj-record-specifications)（全登録形式を単一 JSON record として統一的に扱う仕様。v3 で全 DB 横断の submission set 表現を目指して設計中）を生成する UI をポータル内で提供し、Repository API へ POST することで登録を完結させる計画（overview.md「将来的な拡張」参照）。複数 DB にまたがる submission set は 1 つの Record に含められるため、複数ユースケース該当時の統合案内はこの Record UI が SSOT となる。

## i18n

- UI テキスト（質問文、選択肢、カードタイトル、ボタン等）: `locales/ja.json`, `locales/en.json`
- 詳細パネル本文: 言語別 TSX コンポーネント（例: `MicrobialGenomeDetail.ja.tsx`, `MicrobialGenomeDetail.en.tsx`）

## URL 設計

DB ポータル全体の URL 設計方針は [overview.md#url-設計](./overview.md#url-設計) を参照。登録ナビの URL は本節で定義する。

### ページとレンダリング

| URL | 用途 | レンダリング |
|---|---|---|
| `/submit` | 登録ナビゲーション（Use Case Cards / Decision Flowchart / Detail Panel を 1 ページに縦積み） | プリレンダ |

`/submit` は SEO ターゲットであり、静的コンテンツが中心（3 セクションともに TSX で書き下ろし、フローチャートも `@xyflow/react` の SSR 対応を使う）なのでプリレンダで配信する。

### クエリパラメータ

Use Case Cards の選択状態のみ URL に載せる。Decision Flowchart のフロー進行・Detail Panel の表示内容はクライアントサイドの UI state のみで管理する（URL に反映しない）。

| パラメータ | 値 | 用途 |
|---|---|---|
| `for` | ユースケース ID（ケバブケース） | Use Case Cards のカード選択を復元し、同時に Decision Flowchart の該当経路をハイライト、Detail Panel に該当パネルを表示 |

`for` パラメータの値（8 種類、カード 1:1 対応）:

| 値 | 対応カード |
|---|---|
| `microbial-genome` | 微生物ゲノム |
| `eukaryotic-genome` | 真核生物ゲノム |
| `metagenome` | メタゲノム / MAG / SAG |
| `expression` | 遺伝子発現（RNA-seq・アレイ） |
| `variation` | 変異データ |
| `human-restricted` | ヒト制限アクセス |
| `metabolomics` | メタボロミクス |
| `small-sequence` | 小規模塩基配列・PCR 産物 |

命名方針: 「submitter が何のために登録するか」を自然に表現するため `for` を採用（`/submit?for=microbial-genome` は "submit for microbial genome" と英文として読める）。UI 形態（カード / リスト / タブ）にも仕様用語（ユースケース）にも依存しない。

canonical: `/submit?for=xxx` の canonical は `/submit`（ユースケース 8 種類は同一コンテンツの断片表示であり、検索インデックスは `/submit` に集約する）。

### 却下案

以下はブックマーク / 共有のため URL に載せる候補として検討したが採用しない:

- **Decision Flowchart のフロー進行状態**（`?flow=q1-no,q2-eukaryote,q3-raw-assembly` 等）: (1) 3 階層・12 ゴールで URL がすぐ壊れる、(2) 3 セクションは相互連動しているので `for` だけあれば Decision Flowchart のハイライトと Detail Panel の切替は再現可能、(3) フロー進行の途中状態を共有したいニーズは薄い（完走後のゴール共有なら `for` で十分）
- **Detail Panel の開閉状態**: インライン展開で常時描画しているため状態不要

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

## 設計上の決定事項

- **Detail Panel の UI 形態**: **インライン展開**（Decision Flowchart の直下に常時描画、同一領域で中身を差し替え）を採用。決め手は (1) `/submit` の SSR / プリレンダリング方針と素の DOM 描画の相性、(2)「Detail Panel は同一領域でコンテンツだけ差し替え」方針との直結、(3) focus trap / ESC / scroll lock 等を自前実装せずに済む a11y・モバイル両面での素直さ。サイドパネル・モーダルは SSR 相性と 1 ページ完結方針との不整合で却下、アコーディオンは Use Case Cards / Decision Flowchart → Detail Panel 自動切替と開閉状態の二重管理で UX が複雑化するため却下。切替時は Detail Panel 見出しに `scrollIntoView({ behavior: "smooth" })`、初期状態は 1 枚目（微生物ゲノム）のパネルを表示しておく
- **フローチャート進行状態の URL 反映可否**: 本章「URL 設計」節で確定。Use Case Cards のカード選択のみ `?for=<usecase-id>` で反映、Decision Flowchart のフロー進行（`?flow=...`）と Detail Panel の開閉状態は却下。決め手は (1) `for` だけで 3 セクションの表示は再現可能、(2) `flow` は 3 階層 12 ゴールで URL がすぐ壊れる、(3) 共有したい状態は「完走後のユースケース」であって途中状態ではない
- **フローチャートの描画ライブラリ**: `@xyflow/react` v12 系（React Flow）を採用。決め手は SSR 公式サポート（React Router v7 のプリレンダリング方針と整合）、カスタムノードで react-i18next / Tailwind を自然に適用できること、カード経路ハイライトを `nodes` / `edges` の className 切替で宣言的に実装できること。Mermaid は SSR 不可・i18n 相性不良・バンドル肥大で却下。自前 SVG は描画品質で勝るがエッジ配線・モバイル・a11y の自作工数が大きいため却下
- **フローチャートの a11y / モバイル対応**: PC only 前提で進める。`@xyflow/react` のキーボード操作・スクリーンリーダー・モバイル横幅への専用対応は行わない。フローチャートはゴール俯瞰の視覚的補助であり、操作経路としての代替手段は Use Case Cards のカードクリック（全 8 ユースケースに直接到達可能）で既に存在する。将来的にラジオボタン + ステップ形式の代替モードが必要になった場合はその時点で追加を検討する
- **複数ユースケースに該当する場合の案内方法**: 専用 UI は作らない。Use Case Cards / Decision Flowchart は単一選択のまま、Detail Panel にも関連カード切替リンク等の切替導線を置かない。必要なカード（ゲノム系 3 枚: 微生物ゲノム / 真核生物ゲノム / メタゲノム）の詳細パネル内で BioProject umbrella 統合の概念に平文で触れる程度に留める。複数 DB にまたがる submission set の統合案内は、将来の [DDBJ Record](https://github.com/ddbj/ddbj-record-specifications) ベース登録 UI が SSOT となる予定。今の段階で切替型 UI を作り込むと情報が各カード末尾に分散し、Record UI への移行時に書き直し負債になるため避ける
