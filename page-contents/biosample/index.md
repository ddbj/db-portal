---
title: BioSample
description: BioSample は DDBJ の実験データを得るために用いられた生物試料 (サンプル) の記述メタデータを集約するデータベースで、INSDC 三拠点で共有されます。
---

## BioSample とは

BioSample は、DDBJ の一次データベースに登録された実験データを得るために用いられた生物試料 (サンプル) の記述情報を集中して管理するデータベースです。INSDC 三拠点 (DDBJ / EBI / NCBI) で双方向にミラーされ、いずれかに登録すれば他拠点でも保持されます。

[BioProject](/bioproject) と並ぶメタデータ層で、配下の実データ ([DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) / [DDBJ 塩基配列](/ddbj)) から参照されます。

> [!NOTE]
> 自分の研究にどのサービスが必要かが分からない場合は、[登録ナビ](/submit) でフローチャート形式に絞り込めます。

## 受け付けるデータ

受け付けるのは試料そのものの記述情報 (属性メタデータ) です。配列データや実験ファイルは BioSample には登録せず、[DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) / [DDBJ 塩基配列](/ddbj) 側に登録します。

| 試料タイプ | 例 |
| --- | --- |
| 生物個体 | individual organism |
| 組織 | primary tissue biopsy |
| 培養細胞 | cell line |
| 環境サンプル | environmental isolate |

生物名 (organism) は NCBI Taxonomy に登録された種以下のランクの scientific name を使用します。未登録の場合は提唱名を入力すると DDBJ スタッフが登録を仲介します。

INSDC 規約により、採取地 (`geo_loc_name`、最低でも国 or 海洋) と採取日 (`collection_date`、最低でも年) は必須です。値を提供できない場合は INSDC missing value reporting standard に従い、適切な reporting level term (例: `not collected` / `restricted access: human-identifiable`) を記載する必要があります。空欄での提出はできません。

## アクセッション番号

| 種類 | プレフィックス | 例 | 説明 |
| --- | --- | --- | --- |
| Submission ID (仮 ID) | `SSUB` | `SSUB000001` | 新規 submission 作成時に自動採番。論文・公開資料には引用しない |
| Sample accession | `SAMD` | `SAMD00000001` | サンプル 1 件につき 1 つ。validation 通過後に自動発行 |

未登録の organism や `locus_tag_prefix` を含む場合は、キュレータの査定後に SAMD が発行されます。INSDC 三拠点ではそれぞれ DDBJ が `SAMD`、NCBI が `SAMN`、EBI が `SAMEA` プレフィックスを使い分けます。

> [!WARNING]
> `SSUB` は内部仮 ID です。論文・公開資料には必ず `SAMD` 番号を引用してください。

## Package と属性

BioSample では試料タイプに応じた **package** を 1 つ選ぶことで、入力する属性集合が確定します。package が異なるサンプルを 1 つの submission に混在させることはできません。

| カテゴリ | 主な package |
| --- | --- |
| Standard | SARS-CoV-2 (clinical / wastewater) / Microbe / Model organism or animal / Metagenome or environmental / Invertebrate / Human / Plant / Virus / Beta-lactamase / Omics |
| Pathogen | clinical or host-associated / environmental, food or other |
| MIxS compliant | MIGS.ba / MIGS.eu / MIGS.vi / MIMS.me / MIMAG / MISAG / MIMARKS.specimen / MIMARKS.survey / MIUVIG |
| Environmental (MIxS env) | soil / water / sediment / air / built / wastewater / host-associated / human-gut / plant-associated / hydrocarbon resources など |

属性ファイルはタブ区切りテキストで、1 行目に属性名、2 行目以降に 1 サンプル 1 行で記述します。必須フラグの意味は以下の通りです。

| フラグ | 意味 |
| --- | --- |
| `*` | 必須属性 |
| `**n` | 同一グループ `n` のうち最低 1 つは必須 |

属性ファイルは package のテンプレートからダウンロードして作成します。Validation でエラーが解消されない限り submit はできません。

## 登録の流れ

1. **アカウント取得** — D-way の submission account を発行します。
2. **新規 submission 作成** — D-way → BioSample → `[New submission]` で `SSUB` を発行します。
3. **Submitter / General info 入力** — Submitter / 所属組織 / 氏名 / 組織ドメインのメールアドレスなどを英語で入力します。
4. **Package 選択** — 試料タイプに応じて 1 つ選びます (混在不可)。
5. **属性ファイル作成・アップロード** — テンプレートをダウンロードしてタブ区切りで記入し、アップロードします。
6. **Validate** — エラーをすべて解消するまで submit はできません。
7. **Review & Submit** — OVERVIEW タブで確認のうえ投稿します。
8. **キュレーション (必要時)** — 未登録 organism や `locus_tag_prefix` を含む場合はスタッフによる査定が入ります。
9. **`SAMD` 発行** — メールで通知されます。
10. **公開 / Hold 指定** — 配下データの公開と連動して公開されます (§ INSDC との共有と公開連鎖)。

> [!IMPORTANT]
> 1 submission で登録できるサンプル数の上限は 1,000 件です。超過する場合は submission を分割してください。

## 事前準備

- DDBJ 登録用アカウント (D-way submission account)
- 組織ドメインのメールアドレス (フリーメールは不可)
- 投稿者氏名 (first / last) と所属組織のフルネーム (英語表記)
- 試料タイプに対応する **package** を 1 つ決定 (混在不可)
- 属性のタブ区切りテキストファイル (package のテンプレートから作成)
- 必須属性: `organism` (NCBI Taxonomy scientific name) / `collection_date` / `geo_loc_name` 他、package が指定する項目
- ゲノム塩基配列を [DDBJ](/ddbj) に登録予定なら `locus_tag_prefix` を希望値で記入 (スタッフが NCBI に予約申請)

## INSDC との共有と公開連鎖

BioSample は INSDC 三拠点で内容が共有される公開前提のメタデータです。ヒト個人レベルの制限公開試料は [JGA](/jga) 側で扱い、BioSample には登録しません。

公開トリガーは BioProject と共通の以下の挙動を持ちます。

- 単体の BioProject / BioSample の公開は、配下データの公開をトリガーしません。
- [DDBJ](/ddbj) / [DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) の公開は、リンクされた BioProject / BioSample の公開を自動的にトリガーします。
- BioSample 公開時、`derived_from` 属性で参照されている上流 BioSample も連鎖して公開されます。

> [!WARNING]
> BioSample は公開前提のデータベースです。ヒト個人の制限公開試料を扱う場合は [JGA](/jga) を選択してください。

## 登録後の更新

既登録レコードの属性更新・取下げは BioSample 担当への依頼ベースで行います。`SAMD` 発行通知メールへの返信で更新依頼を送れます。

## 関連リソース

- BioSample 公式トップ: <https://www.ddbj.nig.ac.jp/biosample/index.html>
- 概要: <https://www.ddbj.nig.ac.jp/biosample/overview.html>
- 登録手順: <https://www.ddbj.nig.ac.jp/biosample/submission.html>
- サンプル情報: <https://www.ddbj.nig.ac.jp/biosample/sample-info.html>
- 属性・package 選択: <https://www.ddbj.nig.ac.jp/biosample/attribute.html>
- 公開トリガー FAQ: <https://www.ddbj.nig.ac.jp/faq/en/bp-bs-seq-release-e.html>
- 更新申請 FAQ: <https://www.ddbj.nig.ac.jp/faq/en/sample-update-e.html>
- D-way 登録ポータル: <https://ddbj.nig.ac.jp/D-way>
- DDBJ アカウント取得: <https://www.ddbj.nig.ac.jp/ddbj-account.html>
- 関連サービス: [BioProject](/bioproject) / [DRA](/dra) / [GEA](/gea) / [MetaboBank](/metabobank) / [DDBJ 塩基配列](/ddbj) / [JGA](/jga)
