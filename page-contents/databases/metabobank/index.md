---
title: MetaboBank
description: DDBJ が運営する公開メタボロミクスデータリポジトリ。質量分析・NMR・質量分析イメージングで得られたメタボロームと代謝物アサインメントを MAGE-TAB 形式で登録・公開できます。
---

## MetaboBank とは

MetaboBank は DDBJ が運営する公開メタボロミクスデータリポジトリです。質量分析 (MS)、NMR、質量分析イメージング (MSI) で取得したメタボロームデータと、同定した代謝物のアサインメントを受け付けます。

メタデータには [GEA](/databases/gea) と同系統の MAGE-TAB 形式を採用しており、EBI が運営する MetaboLights の ISA-TAB と互換性を持ちます。MetaboBank と MetaboLights はデータ標準化で連携しています。

> [!NOTE]
> サービスの選択や登録手順の全体像は [登録ナビ](/submit) から確認できます。MetaboBank の登録は申請フォーム経由の個別対応で進みます。

## 受け付けるデータ

対応する測定モダリティとファイル種別は以下のとおりです。

| 区分 | 内容 |
| --- | --- |
| MS | LC-MS / LC-DAD-MS / GC-MS / GCxGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS |
| MSI | 質量分析イメージング (image data と機器情報) |
| NMR | NMR 測定データ (機器コンフィグファイルの同梱を推奨) |

ファイル種別は次の 3 種に分類されます。

| 種別 | 内容 |
| --- | --- |
| Raw data | 機器のネイティブ出力。MS は mzML 等のオープン形式、NMR は nmrML 等を raw として受理 |
| Processed data | 解析後データ・サマリ。SDRF の列から参照される |
| MAF (Metabolite Assignment File) | 同定・推定した化合物の標準テーブル (TSV)。MS 用 / NMR 用に別テンプレートあり。strongly recommended |

ファイル名は英数字・`_`・`-`・`.` のみを使用し、Study 内でユニークである必要があります。Study 単位で tar / zip にまとめてアップロードできます。公開時には raw データが Reifycs 社の mzB フォーマットでも提供され、専用ビューワ DataChaker で閲覧できます。

> [!WARNING]
> raw データのファイル内に含まれるローカルパスなど個人情報につながりうる情報は、アップロード前に必ず除去してください。ヒト由来サンプルでは、メタデータからの直接識別子の除去も必要です。

## アクセッション番号

MetaboBank に登録した Study と、関連する [BioProject](/databases/bioproject) / [BioSample](/databases/biosample) には次のアクセッション番号が発行されます。

| 対象 | 形式 | 例 |
| --- | --- | --- |
| MetaboBank Study | `MTBKS####` | MTBKS1234 |
| BioProject | `PRJDB######` | PRJDB123456 |
| BioSample (Omics package) | `SAMD########` | SAMD00012345 |

データを引用する際は、`MTBKS####` + `PRJDB######` + `SAMD########` のセットで参照される構造になります。

## 登録の流れ

1. DDBJ アカウントを取得し、公開鍵を登録 (scp / sftp 用)
2. **MetaboBank registration application form** で登録申請
3. [BioProject](/databases/bioproject) を登録して `PRJDB######` を取得
4. [BioSample](/databases/biosample) の Omics package で各サンプルの `SAMD#####` を取得
5. 測定タイプに対応する MAGE-TAB Excel テンプレートに **IDF + SDRF** を記入、必要に応じて **MAF** を作成
6. raw data / processed data / MAF の MD5 チェックサムとファイル一覧を準備
7. scp / sftp でファイルサーバへアップロード (Study 単位で tar / zip 圧縮を推奨)
8. MetaboBank チームが内容を確認し、`MTBKS#` を発行
9. 公開設定 (即時公開、または論文公開までの hold) を決定

> [!IMPORTANT]
> MetaboBank は DRA や GEA のようなセルフサービス型のウェブフォームではなく、申請フォームを起点に MetaboBank チームと連絡を取りながら進める個別対応型の運用です。

## 事前準備 (MAGE-TAB と MAF)

登録申請前に次を揃えておきます。

- DDBJ アカウントと、scp / sftp 用の公開鍵
- [BioProject](/databases/bioproject) (PRJDB) と [BioSample](/databases/biosample) Omics package (SAMD) の取得
- 測定タイプに対応する **MAGE-TAB Excel テンプレート** (IDF + SDRF)
- 該当する場合は **MAF テンプレート** (MS 用 / NMR 用)
- ファイル名一覧と MD5 チェックサム

### MAGE-TAB (IDF + SDRF)

- **IDF (Investigation Description Format)**: Study の概要、実験デザイン、プロトコル、出版情報をまとめる
- **SDRF (Sample and Data Relationship Format)**: sample から assay、data file への対応関係を「自然な流れ」で記述する

測定タイプごとに専用テンプレートが用意されています (LC-MS / LC-DAD-MS / GC-MS / GCxGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS / MSI / NMR)。

### MAF (Metabolite Assignment File)

同定・推定した化合物を TSV で記述する標準テーブルです。MS 用と NMR 用にそれぞれ Excel テンプレートが提供されています。代表的なフィールドは次のとおりです。

| 項目 | 内容 |
| --- | --- |
| ChEBI ID | 化合物識別子 |
| 化学式 / SMILES / InChI | 構造情報 |
| 保持時間 / 化学シフト | MS / NMR の測定パラメータ |
| MSI 信頼度スコア | MSI でのアサインメント信頼度 |
| `maf_value_unit` | peak area / 濃度などの単位 |

## MSI (mass spectrometry imaging)

MSI 専用のメタデータテンプレートが用意されており、image data に加えて機器情報や測定条件を記述します。MAF では MSI 用の信頼度スコアを使ってアサインメントを記述します。

## MetaboLights との関係

MetaboBank の MAGE-TAB は、EBI の MetaboLights が採用する ISA-TAB と互換性を持ちます。両リポジトリはデータ標準化で連携しており、メタデータ形式は MAGE-TAB ファミリの [GEA](/databases/gea) (ArrayExpress 系) や SDRF-Proteomics と同系統の枠組みです。

> [!NOTE]
> 公式ドキュメントによれば、MetaboBank と MetaboLights の間で公開済みデータの相互交換は現時点では行われていません。

## 公開ポリシー

- 即時公開、または論文公開までの hold (embargo) を選択可能
- release date は最大 3 年まで設定でき、延長も可能
- 公開は [DDBJ データ公開原則](https://www.ddbj.nig.ac.jp/documents/data-release-policy.html) に従って行われ、リンクされた [BioProject](/databases/bioproject) / [BioSample](/databases/biosample) の公開タイミングと整合します
- 査読者向けの非公開閲覧 (reviewer access) は MetaboBank チームに依頼し、password 付きサイト経由で提供されます
- 登録後の修正は MetaboBank チームへ専用フォームで連絡します

## 検索 UI

公開済み Study は MetaboBank 検索 UI (<https://mb2.ddbj.nig.ac.jp/>) から browse / search できます。Reifycs 社の mzB 形式で提供される raw データは、専用ビューワ DataChaker で閲覧します。

## 関連リソース

- MetaboBank トップ (日本語): <https://www.ddbj.nig.ac.jp/metabobank/index.html>
- MetaboBank トップ (English): <https://www.ddbj.nig.ac.jp/metabobank/index-e.html>
- 登録手順: <https://www.ddbj.nig.ac.jp/metabobank/submission.html>
- データファイル仕様: <https://www.ddbj.nig.ac.jp/metabobank/datafile.html>
- メタデータ仕様 (IDF / SDRF / MAF): <https://www.ddbj.nig.ac.jp/metabobank/metadata.html>
- 検索 UI: <https://mb2.ddbj.nig.ac.jp/>
- DDBJ FAQ (公開連動): <https://www.ddbj.nig.ac.jp/faq/en/bp-bs-seq-release-e.html>
- DDBJ FAQ (reviewer access): <https://www.ddbj.nig.ac.jp/faq/en/reviewer-access-e.html>
- 関連サービス: [BioProject](/databases/bioproject) / [BioSample](/databases/biosample) / [GEA](/databases/gea) / [DRA](/databases/dra)
