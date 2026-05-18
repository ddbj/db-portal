# 登録ナビゲーション v3 — 本番フェーズ残課題 + コンテンツ原典

[`docs/submit-alt3.md`](./submit-alt3.md) (本体) のサブ仕様。PoC スコープでは扱わず本番フェーズに送る課題と、SSOT データソースのカタログ。

サブファイル:

- データモデル → [`submit-alt3-data-model.md`](./submit-alt3-data-model.md)
- Tag Taxonomy → [`submit-alt3-tags.md`](./submit-alt3-tags.md)
- modal Q&A + グルーピング → [`submit-alt3-modals.md`](./submit-alt3-modals.md)
- 登録フローカード生成ロジック → [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md)

## 10. 本番フェーズ残課題

本体 §7.2 で PoC 範囲外と明示した項目の詳細、および PoC 実装中に確認が必要になる項目。

### 10.1 UI / UX

- **`hybrid` メタ Group の UI 操作性**: PoC では「+ 配列リードを 2 回押下 + 1 回目で `Hybrid Assembly` チェック ON + 2 回目で『相手の Hybrid Assembly Group に参加』を選ぶ」フロー (modals.md §7.4)。実利用での操作流れの自然さを PoC レビューで再確認。
- **「警告 (warning) / エラー (error) / 情報 notes (info)」の用語と表示**: 本体 §5.4 (cell 矛盾 = 警告)、modals.md (pool のまま追加 = modal で阻止 = エラー)、Rule 14 (chip 整合 = warning bar)、Step カード未確定 = `FlowStep.warnings`。同じ「warning」でも severity / 表示位置が異なるため、開発実装時に統一スタイルガイド (severity 3 段 × 表示位置 4 種) を整理 (.claude/docs/design-system.md と連携)。
- **ファイルアップロード実体**: 本番では FTP / Aspera / Web upload。PoC は仮ファイル名 + role 入力で代替。アップロード進捗 UI / 再開機能 / チャンク分割の設計。
- **下書きの永続化**: localStorage / server-side draft / 復元時の整合性 (途中で本体仕様が変わった場合のマイグレーション)。
- **リアルタイム検証**: 入力途中での矛盾検出、必須項目の進捗表示、警告の field-adjacent 表示。
- **後追い登録**: 既存 BP / BS の accession に追加ファイルだけを登録する UX (新規でない経路)。
- **公開連動 (BP/BS auto-release)**: DRA / GEA / MSS 公開時の BP+BS 連動公開の挙動を UI でどう案内するか。
- **エラー回復**: 外部 DB で Step が失敗した場合の、再開ポイント表示と部分再実行 UI。
- **アクセシビリティ / モバイル**: Group カードの indent UI のキーボード操作、モバイルでの modal UX。
- **大量ファイル性能チューニング**: PoC は数十行スケール。数千行のテーブル仮想化、Step カード再生成の差分計算最適化。
- **トップ導線の文言と本流選択**: v1 / v2 / v3 のどれをデフォルトにするか。研究者ペルソナごとの推奨経路。
- **デザインシステム整合**: 既存 `.claude/docs/design-system.md` と Tailwind トークン / コンポーネント命名の調整。
- **subgrp ID 取得済み確認 UX**: Rule 6 集約モード発火時に「提供申請グループの subgrp ID をユーザー自己申告 / Step 0 で入力させる / 取得済みでなければアラート」の UX 判断。
- **aggregate VCF の Section A 表現**: 集約 VCF を 1 行で示すか、複数 Sample の chip を表示するか。
- **テンプレートエクスポート**: BS の Excel テンプレート / DRA Run の metadata TSV を v3 から書き出して本番 submission に持ち込む経路 (DDBJ / JGA / AGD / MetaboBank / GEA / BioSample 各サービスの公開テンプレート参照)。
- **TPA-WGS Google スプレッドシート連携 UX**: TPA-WGS の場合の「全タンパク質コード遺伝子 + 非コード RNA 遺伝子記載のサンプルアノテーション」スプレッドシートアップロード経路 (ddbj/www `_ddbj/tpa.md` 参照)。
- **Section B 大量 Step 表示 UX**: 100+ Step が並ぶ大量ケースでの折りたたみ / Group 化 / scroll virtualization (PoC は数十行スケール、本フェーズで scaleup 検討)。
- **同一ファイル名追加の挙動**: 重複ファイル名追加時の warning / auto-rename / 拒否のいずれを default にするか (PoC は warning 表示 + ユーザー判断、本番フェーズで利用ログから default 再検討)。
- **Section A ↔ Section B 双方向ハイライト UX**: ハイライト色 / hover-only / click-to-pin / 解除方法。Step カード対象行ハイライト時に Group メンバ全体を強調するか、対象 cell のみ強調するか。
- **drag-and-drop 行並び替え**: 本体 §5.4 で「default = 追加順、列ヘッダクリックでソート」と規定したが、本番フェーズで drag-and-drop による任意並び替え (Group メンバ順 / 表示優先度) を検討。
- **multiplex barcode-sample 対応表の Group 共通入力 UX**: Group 全体で 1 度入力 → N Experiment への自動配布 (現状は per-Experiment 入力、Rule 9)。
- **`dismissedWarnings` の cleanup reducer**: data-model.md §4.4.2 で「Submission state を save / load する際に現存 warning ID と照合して未マッチ key を削除する」cleanup reducer を本番フェーズで追加する。PoC では数十行スケールで蓄積量限定的のため未実装。
- **restricted human + assembled の controlled-access INSDC submission 経路**: flow-rules.md Rule 6 共通の PoC スコープでは MSS Step を完全抑制 (= INSDC 公開前提のため restricted human assembled は JGA Analysis に集約)。本番フェーズで「個人ゲノム de novo アセンブリ」「Haplotype phased + restricted」等のユースケースを ddbj/www / INSDC 側で再確認し、controlled-access での INSDC submission 経路が必要と判明すれば MSS 並走モードを追加する。
- **JGA Sample N 入力 UX の強化**: flow-rules.md Rule 6a Step 3 で N 個の JGA Sample を 1 Step 内のリスト UI として扱う (Step を N 個並べる代替案)。aggregate VCF / phenotype-only Dataset で N 入力に個人別属性 (年齢 / 性別 / 表現型 table のレコード) を割り当てる UX は本番フェーズで詳細化 (XML スキーマと整合)。
- **+ 配列リード modal 2 回目以降の Hybrid Group 参加 UX**: modals.md §+ 配列リード で「2 回目に + 配列リードを押下すると『既存の Hybrid Assembly Group に追加しますか?』サブ選択が出る」とした (空き hybrid メタ Group が存在するときのみ表示)。PoC レビューで操作の自然さを再確認、無意味な質問が出ないよう条件 (pending hybrid メタ Group が「子 Group 1 つのみ」のときに限定する等) を本番フェーズで精緻化。

### 10.2 実装 / データ整備

- **拡張子からの初期 tag 推測**: PoC ではボタン押下が初期 tag。本番では拡張子 + ファイル名パターン (R1/R2、_001、bas.h5 等) で初期 tag を推測強化 (Rule 14 の整合チェックと連動)。
- **controlled vocabulary の masters.ts 実装**:
  - BP 7 pulldown (Project data type 13 / Project type 2 / Sample scope 6 / Material 7 / Capture 6 / Methodology 4 / Objective 11) — ddbj/www `_bioproject/project-info.md`
  - BS Package 22 種 — ddbj/www `_biosample/sample-info.md`
  - DRA 5 pulldown (Library Source 9 / Strategy 36 / Selection 29 / Run File Type 5 / Analysis Type 3) — ddbj/www `_dra/metadata.md`
  - DRA Instrument (Platform + Model) — ddbj/www `_dra/metadata.md`
  - GEA Experiment Type 40 種 + EFO accession — ddbj/www `_gea/experiment-types.md`
  - GEA Material Type 7 / Label / Technology Type — ddbj/www `_gea/`
  - MetaboBank Submission Type 11 種 — ddbj/www `_metabobank/submission.md`
  - MSS data type 11 / DIVISION 21 / TPA サブタイプ — ddbj/www `_ddbj/data-categories.md`, `_ddbj/flat-file.md`, `_ddbj/tpa.md`
- **JGA メタデータ XML スキーマ対応**: JGA は SRA モデル拡張の XML スキーマ。Step カード入力フィールドを XML スキーマフィールド (Sample / Experiment / Data / Analysis 各 XSD) にマッピング。`https://github.com/ddbj/pub/tree/master/docs/jga` 参照。
- **NCBI / EBI controlled vocabulary との整合**: INSDC 共通 vocabulary は ddbj/www 経由で取得済みだが、NCBI 固有 / EBI 固有との micro-差分を実装フェーズで再確認。
- **i18n の reach**: 英語コピー実装、新規追加 controlled vocabulary の両言語ラベル整備。
- **Library Strategy / Source の整合チェック範囲拡張**: Rule 14a で対象としていない Library Strategy 値 (CLONE / POOLCLONE / CLONEEND / FINISHING / Reduced Representation / RAD-Seq / Targeted-Capture / Tn-Seq / SELEX / miRNA-Seq / Other) は silent。PoC ログから利用頻度と typo 率を観測し、warning 対象に追加するか判断。Library Source 9 値の整合チェックも同様 (現状 METAGENOMIC / METATRANSCRIPTOMIC / SYNTHETIC のみ言及、他 6 種は silent)。

### 10.3 個別 SSOT の補完 — PoC スコープで確定済み

PoC スコープで取りうる範囲は本セッションで確定し、各 docs に反映済み。残る判断は PoC リリース後の利用ログ / 外部チーム確認結果を踏まえた本番フェーズでの調整のみ。各項目の現状方針と将来の調整ポイントは以下の docs に書き込み済み:

| 項目 | PoC での確定箇所 | 本番フェーズの調整トリガ |
|---|---|---|
| MetaboBank accession 仕様 | Rule 4c (Study レベル `MTBKSn` のみ、Run / Analysis レベル accession なしを ddbj/www `_metabobank/submission.md` から確定、Run/Analysis 不在は MetaboBank の登録単位仕様) | (PoC 完了、追加の MetaboBank チーム確認は将来規程改定時のみ) |
| 空間 Tx 未収録プラットフォーム (Stereo-seq / Slide-seq / GeoMx) | Rule 4d + [`submit-alt3-modals.md`](./submit-alt3-modals.md) §+ 空間トランスクリプトーム表 + 従属 chip `spatial-platform` 軸 ([DDBJ Contact](https://www.ddbj.nig.ac.jp/contact-ddbj-e.html) 経由で新規 Array Design 申請 + Generalist archive 代替案内) | GEA チームから新規 Array Design (A-GEAD-XXX) 発行された段階で表に追記 |
| SYN (合成配列) / GSS (Genome Survey Sequence) の単独 ButtonType 化 | [`submit-alt3-modals.md`](./submit-alt3-modals.md) + 組み立て済み配列 modal のアセンブリ種別サブ選択で吸収。本番判断材料 (合成生物学領域での SYN 頻度、近年 WGS 発展による GSS 減少傾向) も同 modal の補足に記載 | PoC リリース後の利用ログから modal 吸収の選択率を観測 |
| INSDC methodological keywords の controlled vocabulary 化 | Rule 13 KEYWORDS notes + 補足 (~40 種、廃止項目あり / 公式 version 管理なし、PoC は外部参照案内のみ、`as const` 化判断材料を docs に記載) | PoC ログから KEYWORDS 入力エラー率を観測、エラー率が高ければ `as const` 化を優先 |
| Rule 7c (Third-party annotation) と `TPA:inferential` 受付停止の整合 | Rule 7c は **notes-only Step**、prefix 自動付与なし、Curator 事前相談リンクを表示し送信不可状態に保つ ([`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 7c、[`submit-alt3-modals.md`](./submit-alt3-modals.md) + 遺伝子アノテーション modal) | `_ddbj/tpa.md` で annotation 単独 TPA の独立経路が再開されたら Rule 7c を「自動付与あり」モードに切替 |
| JGA 8 オブジェクトの Step 粒度 | ServiceKind を `jga-submission` / `jga-study` / `jga-sample` / `jga-experiment` / `jga-data` / `jga-analysis` / `jga-dataset` / `jga-policy` の 8 種に分解 ([`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.6、tags.md §5.5) | XML スキーマ詳細 (open-questions §10.2 で本番送り) を反映した時に Step カード入力フィールドを XSD と整合させる |
| DBCLS 事前申請の ServiceKind | `dbcls-application` (external、Rule 12) として独立 Step を生成 (Rule 6a Step 0) | (PoC 完了) |
| Spatial Tx プラットフォームの chip 軸化 | 従属 chip `spatial-platform` (7 値: visium / xenium / merfish / stereo-seq / slide-seq / geomx / other) で保持し Rule 4d の振り分けキーにする | (PoC 完了) |
| modal で確定する参照系メタの統一構造 | `FileGroup.referenceMeta: ReferenceMeta` (citedAccessions / doi / pubmedId / externalRawAccession / reviewStatus / notes) を新設し Rule 7a/b/c, Rule 8a, Rule 10c から参照 | (PoC 完了) |
| GroupType × BS 数の集約ルール | [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.3.1 で GroupType 別 BS 数を表に明示、Rule 3 でも同表を参照 | (PoC 完了) |
| Rule 1-15 の PoC/本番マッピング | 本体 §7.1.1 に Rule × PoC 表を追加 (Rule 7c のみ △、他は ◯) | (PoC 完了) |
| Rule 6c phenotype-only Sample-Dataset 直結 chain | [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 6c (Sample → Dataset を直結、Experiment / Data / Analysis スキップ) + 本体 §7.1.1 Rule × PoC 表に追加 | (PoC 完了) |
| `bp-N` / `bs-N` 順序番号の安定性ルール | [`submit-alt3-data-model.md`](./submit-alt3-data-model.md) §4.4.1 で永続化連番方式 (monotonic increment) を採用、削除されてもスキップ番号として残す | (PoC 完了) |
| Rule 1 Project data type 推測の優先順序拡張 | [`submit-alt3-flow-rules.md`](./submit-alt3-flow-rules.md) Rule 1 を 13 段優先順序に拡張 (assembled + assembly-form 別に Genome Sequencing / Transcriptome / Targeted Locus / Random Survey / Metagenome 分岐、raw + wes-target → Exome) | (PoC 完了) |
| `assembly-form=misc` / `ask` の区別 UX | [`submit-alt3-modals.md`](./submit-alt3-modals.md) + 組み立て済み配列 modal は `ask` のみ提示 (Curator 相談ルート)、`misc` は Step MSS カード DATATYPE 補助 pulldown で確定する流れに集約 | PoC リリース後の Curator 相談率が高ければ modal で「MISC データタイプ確定」選択肢を追加検討 |
| GeoMx readout (NGS / nCounter) の確定 | [`submit-alt3-modals.md`](./submit-alt3-modals.md) + 空間 Tx modal で GeoMx 選択時のみ readout 質問を追加、`FileGroup.referenceMeta.geomxReadout` に保存し Rule 4d 振り分けキーに使用 | (PoC 完了) |

### 10.4 個別 SSOT の補完 — 再確認必要 (本番フェーズで決定)

PoC スコープで暫定実装し、本番フェーズで ddbj/www 再確認 or UX 調整して最終確定する項目。docs にはレビューで指摘された設計のグレーゾーンを記録する。

| 項目 | 暫定方針 | 再確認 / 決定の根拠 |
|---|---|---|
| **本体 §3 ボタン表で mass-spec proteomics → jPOST 分岐の見えにくさ** | + 質量分析ボタン押下時の modal で proteomics / metabolomics / imaging を分岐 (modals.md §+質量分析)。proteomics → jPOST 外部 (amber-500)、metabolomics / imaging → MetaboBank (emerald-500) で色バッジが異なる Step に飛ぶが、ボタン表 (本体 §3) では「+ 質量分析」のみで内部 / 外部分岐が見えない | UX テスト or PoC ユーザーフィードバックで「ボタン押下時に MetaboBank に飛ぶと思っていたら jPOST だった」混乱があれば、ボタン分割 (`+ プロテオーム` と `+ メタボローム / Imaging MS`) or ボタンラベル補足を検討。現状は modal 内分岐で PoC は十分と判断 |
| **NSSS 経路の発火条件と UI 案内** | PoC では `mss` ServiceKind の `intraDbInputs.entryRoute = "mss" \| "nsss"` で区別 (本体 §6.2)。NSSS 経由時の 100 bp 下限案内 (`_faq/restricton-seq-length.md`) を Step notes に追加 | NSSS 経路の自動判定条件 (ファイル件数 / 配列長 / 経路選択 UI) は `_ddbj/web-submission.md` 再確認後に本番で確定 |
| **PacBio HDF5 + BAM の `bas-h5` / `bax-h5` / `bam` FileRole** | data-model §4.3 で FileRole 拡張 + GroupType `pacbio-hdf5` 追加 (PoC は + 配列リード modal で対応) | bas/bax の 4 ファイル構成の細部 UI と BAM の reference fasta 添付方法は PoC リリース後にユーザー実例で再確認 |

## 11. コンテンツ原典 (SSOT データソース)

データソースは 3 系統、優先順位は **ddbj/www > 既存 db-portal 資産 > 外部参考**。

### 11.1 ddbj/www ローカル (最優先 SSOT)

パス: `~/git/github.com/ddbj/www/` (Jekyll サイト ddbj/www のローカル clone)

| カテゴリ | 参照ファイル |
|---|---|
| `_ddbj/` | data-categories.md (MSS data type 11 種 / DIVISION 16 種 PoC 対象), tpa.md (TPA 規程 + DEFINITION prefix 4 種), tpa-table.md, haplotype.md (Haplotype = WGS 派生 + ST_COMMENT), submission.md, mss.md, genome.md, transcriptome.md, metagenome-assembly.md (MAG), single-amplified-genome.md (SAG), tls.md (Targeted Locus), tsa.md (Transcriptome Shotgun Assembly), est.md (EST は全て MSS), web-submission.md (NSSS 規程), assembly.md (Third-party assembly 規程), flat-file.md (DIVISION 21 種完全 SSOT, KEYWORDS), file-format.md (INSDC FF 記載規程), locus_tag.md (TPA-WGS 必須), qualifiers.md (Annotation 制約) |
| `_dra/` | submission.md (DRA 全体), metadata.md (Library Source 9 / Strategy 36 / Selection 29 / File Type 5 / Analysis Type 3 / Instrument), datafile.md, analysis.md, example.md (Hybrid Assembly / Umbrella project / multiplex example) |
| `_bioproject/` | submission.md, project-info.md (Project data type 13 / Sample scope 6 / Material 7 / Capture 6 / Methodology 4 / Objective 11 / Project type 2) |
| `_biosample/` | submission.md, overview.md (Package 選び方 + derived_from), sample-info.md (Package 22 種完全 SSOT) |
| `_metabobank/` | submission.md (Submission Type 11 種), metadata.md, datafile.md, mzB.md, third-party-reanalysis.md |
| `_gea/` | submit-sequence.md, submit-array.md, single-cell.md, spatial-gene-expression.md (Visium / Xenium / MERFISH), third-party-reanalysis.md, experiment-types.md (40 種 + EFO accession), index.md (functional genomics 定義), metadata.md, datafile.md, overview.md, adf.md, validation.md, transcriptome-reference.md |
| `_jga/` | submission.md (JGA 全体 + Analysis のみの登録), group.md (提供申請グループ + subgrp), submission-step.md (申請システム URL) |
| `_togovar/` | index.md, submission.md (`dstd` / `dss` / `dssv` / `dsv` prefix), metadata.md, datafile.md, validation.md |
| `_faq/` | restricton-seq-length.md (NSSS 100 bp 下限), where-to-submit-variation-data.md (TogoVar 振り分け), metadata-of-multiplexed-samples.md (multiplex 事前 demultiplex 必須) |
| `_insdc/` | prefix.md (INSDC accession prefix 完全 SSOT), accessions.md (prefix 書式) |
| `_news/` | TPA 受付停止 (`/news/ja/2024-09-05.html`)、TogoVar / メンテ等の重要変更 |

ddbj/www の新規ファイル / 新規規程は本番フェーズで実装着手時に再確認する。

### 11.2 既存 db-portal 資産

| 原典 | 用途 |
|---|---|
| `docs/submit-alt.md` (v2) | v2 Q&A wizard / 36 leaf SSOT (並走評価中) |
| `docs/submit.md` (v1) + `docs/submit-details.md` | v1 Decision Tree / Use Case Cards (並走評価中) |
| `src/lib/mock-data/submit-alt-tree/masters.ts` | v2 controlled vocabulary 実装 SSOT (本番フェーズで v3 masters.ts 移植時に参照) |
| `src/lib/mock-data/submit-alt-tree/` | v2 leaf tree モック (破壊禁止) |
| `src/routes/submit-alt.tsx`, `src/routes/submit.tsx` | v2 / v1 ルート (破壊禁止) |
| `../ddbj-search-converter/ddbj_search_converter/sra_accessions_tab.py` | 既発行 accession の関係性 DB (prefix SSOT 源ではない、参考のみ) |

### 11.3 外部参考 (UX / FAQ / 実例)

| 原典 | 用途 |
|---|---|
| https://ddbj.nig.ac.jp | 既存 DDBJ サイト |
| https://www.ddbj.nig.ac.jp/faq/en/index-e.html | DDBJ FAQ (NSSS 制約 / 公開連動等) |
| https://ddbj.nig.ac.jp/news/ | TPA 受付停止 / TogoVar 関連 / メンテ等の重要変更 |
| https://humandbs.ddbj.nig.ac.jp/nbdc/application/ | JGA 提供申請システム (Rule 6 Step 0) |
| https://humandbs.dbcls.jp/ | HumanDBs データ閲覧 (JGA データ公開後の参照) |
| https://insdc.org/submitting-standards/methodological-keywords/ | INSDC methodological keywords (KEYWORDS controlled vocabulary 外部 SSOT) |
| https://github.com/ddbj/pub/tree/master/docs/jga | JGA XML スキーマ (本番フェーズ実装参照) |
| https://github.com/ddbj/togovar-repository | TogoVar-repository Excel テンプレート (`TogoVar_v1.4.xlsx`) |
| https://docs.google.com/spreadsheets/d/15gLGL5FMV8gRt46ezc2Gmb-R1NbYsIGMssB0MyHkcwE/ | TPA-WGS サンプルアノテーション (ddbj/www `_ddbj/tpa.md` 参照) |
| NCBI SRA Submission Portal | DRA 対応 UX 比較 |
| EBI ENA Webin / ArrayExpress / GEO / PRIDE / MetaboLights / Metabolomics Workbench / EVA / BioStudies | 外部 DB 受入条件・UX 比較 |
