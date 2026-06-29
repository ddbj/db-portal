---
title: BioProject
description: BioProject は研究プロジェクトの情報と、そこから生まれたデータを束ねる INSDC 共通のメタデータカタログです。配列や実験データそのものは別サービスに登録します。
---

## BioProject とは

BioProject は、研究プロジェクトのメタデータと、そのプロジェクトから生まれた各種データを束ねる INSDC 共通のメタデータカタログです。配列や実験データそのものは登録せず、プロジェクトの概要・目的・対象生物・関連論文といった情報を 1 件のエントリーにまとめます。

実データは [DRA](/dra)、[GEA](/gea)、[DDBJ](/ddbj)、MetaboBank、[JGA](/jga) など別のサービスに登録し、それらのエントリーが BioProject アクセッション番号を引用することで、横断的にプロジェクト単位で参照できるようになります。公開後は NCBI BioProject、EBI BioStudies とメタデータが相互交換されます。

プロジェクトには 2 種類あります。

- **プライマリープロジェクト**: 配列や実験データに直接リンクされる通常のプロジェクト。
- **アンブレラプロジェクト**: 複数のプライマリーを束ねる管理用プロジェクト。データ自体は参照しません。

> [!NOTE]
> どのサービスに登録すべきか迷ったら、[登録ナビ](/submit) で研究内容に合わせた登録先を案内します。

## 受け付けるデータ

BioProject では配列そのものではなく、プロジェクトのメタデータを登録します。主な項目は以下のとおりです。

| 項目 | 内容 |
| --- | --- |
| Project Data Type | Genome Sequencing / Metagenome / Transcriptome or Gene Expression / Epigenomics / Variation など 12 種類から選択 |
| Sample Scope | Monoisolate / Multiisolate / Multi-species / Environment / Synthetic の 5 種類 |
| Material | Genome / Transcriptome / Proteome など、対象とする生物学的素材 |
| Capture | Whole / Clone Ends / Exome / Targeted Locus / Random Survey |
| Methodology | Sequencing / Array / Mass Spectroscopy など |
| Objective | Raw Sequence Reads / Assembly / Expression / Variation など、登録するデータ種別 |
| Target Organism | NCBI Taxonomy の organism name / taxonomy ID と、strain / breed / cultivar / isolate |
| Publications | 関連論文の PubMed ID または DOI |

メタデータはすべて英語で入力します。description は 100 文字以上が必要です。submitter 個人の情報は公開されず、所属組織情報のみが INSDC 上で公開されます。

## アクセッション番号

| Prefix | 用途 | 引用 |
| --- | --- | --- |
| `PRJDB` | 登録完了時に自動発行される正式アクセッション番号 (例: `PRJDB1`) | 論文・データ公開で引用するのはこちら |
| `PSUB` | 登録途中の submission 用仮 ID | 論文等で引用してはいけない |

> [!WARNING]
> `PSUB` で始まる仮 ID は登録作業のための内部 ID です。論文・プレスリリースなどでは必ず公開後の `PRJDB` アクセッション番号を引用してください。

論文・データ公開で BioProject を 1 件引用することで、その下にぶら下がる DRA / GEA / DDBJ などのデータをまとめて辿れるようにするのが基本的な使い方です。

## 登録の流れ

1. [DDBJ アカウント](https://www.ddbj.nig.ac.jp/ddbj-account.html) を取得する (BioProject / [BioSample](/biosample) / [DRA](/dra) などで共通)。
2. 登録ツール [D-way](https://ddbj.nig.ac.jp/D-way/) にログインし、BioProject の登録ページへ移動する。
3. **[New submission]** を押して新規登録を開始する。
4. 各タブを左から順に英語で入力する (submitter / project type / organism / publication など)。
5. **OVERVIEW** タブで全体を確認する。
6. **公開設定**を選ぶ: 即日公開、または関連データ公開時に同時公開する非公開 (Hold)。
7. submit すると `PRJDB` アクセッション番号が自動発行される。

> [!IMPORTANT]
> 非公開 (Hold) を選択できるのはプライマリープロジェクトのみです。アンブレラプロジェクトは常に公開となります。

## 事前準備

- **DDBJ アカウント**: BioSample / DRA / GEA など他サービスと共通で利用できます。
- **組織ドメインの email アドレス**: 個人のフリーメールは原則不可です。
- **英語のメタデータ**: title、100 文字以上の description、所属組織名 (略さない正式名称)、対象生物、material / capture / methodology、関連論文情報を準備します。
- **ヒトデータを扱う場合**: [DRA](/dra) / [GEA](/gea) / [DDBJ](/ddbj) にヒト由来データを登録するには、事前に DBCLS の「制限公開でないヒトデータの提供申請」を提出し承認を得ておく必要があります。承認後に発行される申請 ID を、登録フォームのプライベートコメント欄に記載します。制限公開のヒトデータは [JGA](/jga) を利用してください。
- **ゲノムアノテーション付き配列を登録する場合**: [BioSample](/biosample) 側で locus_tag prefix を事前に登録しておきます。
- **アンブレラに紐付ける場合**: 先にプライマリープロジェクトの `PRJDB` 番号を準備しておきます。

## Umbrella BioProject

Umbrella BioProject は、関連するプライマリープロジェクトを束ねる管理用の階層プロジェクトです。データ自体は直接参照せず、複数のプロジェクトを 1 つの傘の下にまとめて見せるために使います。

典型的なユースケースは、複数機関が参加する大規模な共同研究で、各機関の活動に対応するプライマリーをアンブレラで束ねる構成です。アンブレラは 2 階層に重ねることもでき (最上位の共同研究全体を表すアンブレラ → 機関単位のアンブレラ → 実データに紐付くプライマリー)、プライマリー / アンブレラの双方が複数のアンブレラを参照できます。

別のユースケースとして、同一プロジェクト内の複数ハプロタイプを別々のプライマリーとして登録し、1 つのアンブレラから束ねる構成があります (公開ページ: [bioproject/submission.html#submit-umbrella-project](https://www.ddbj.nig.ac.jp/bioproject/submission.html#submit-umbrella-project))。

| プロジェクト | 種別 | 役割 |
| --- | --- | --- |
| `PRJDB0` (例) | Umbrella | 配下の primary を束ねる |
| `PRJDB1` | Primary | 主ハプロタイプ (Principal) のデータ |
| `PRJDB2` | Primary | 副ハプロタイプ (Alternate) のデータ |
| `PRJDB3` | Primary | 関連 DRA データ |

> [!WARNING]
> アンブレラプロジェクトは非公開にできず、常に公開状態になります。配下のプライマリーは個別に非公開のままにできるため、「公開アンブレラの下に非公開プライマリーがぶら下がる」構成は可能です。

アンブレラへのリンク付けは DDBJ スタッフが手作業で処理します。登録フォームのプライベートコメント欄に「このプロジェクトはアンブレラである」「このプライマリーをこのアンブレラに紐付けてほしい」旨と、相手側のアクセッション番号・アブストラクトを記載してください。

## INSDC との共有

DDBJ BioProject は INSDC (DDBJ / NCBI / EBI) の共通スキーマに基づいて運用されており、公開後はメタデータが NCBI BioProject、EBI BioStudies と相互交換されます。

> [!WARNING]
> 同じ研究プロジェクトを DDBJ と NCBI / EBI の両方に重複登録してはいけません。いずれか 1 か所に登録すれば、INSDC 経由で他の 2 拠点からも参照できるようになります。

## 関連サービスとの連携

BioProject 自体には配列も実験データも入っていません。実データは以下のサービスに登録し、各エントリーから BioProject アクセッション番号を引用します。

- [BioSample](/biosample): 配列の由来となるサンプルのメタデータ。
- [DRA](/dra): 次世代シーケンサ由来の raw read。
- [GEA](/gea): 遺伝子発現データ。
- [DDBJ](/ddbj): アノテーション付き配列。
- [JGA](/jga): 制限公開ヒトデータ。

## 関連リソース

- [BioProject 概要 (日本語)](https://www.ddbj.nig.ac.jp/bioproject/index.html)
- [BioProject overview (English)](https://www.ddbj.nig.ac.jp/bioproject/index-e.html)
- [Overview ページ](https://www.ddbj.nig.ac.jp/bioproject/overview.html)
- [登録手順 (日本語)](https://www.ddbj.nig.ac.jp/bioproject/submission.html)
- [Submission procedure (English)](https://www.ddbj.nig.ac.jp/bioproject/submission-e.html)
- [プロジェクト情報入力仕様](https://www.ddbj.nig.ac.jp/bioproject/project-info.html)
- [D-way 登録ツール](https://ddbj.nig.ac.jp/D-way/)
- [DDBJ アカウント](https://www.ddbj.nig.ac.jp/ddbj-account.html)
- [ヒトデータの取り扱い (policies)](https://www.ddbj.nig.ac.jp/policies.html#unrestricted-access)
- [NCBI BioProject](https://www.ncbi.nlm.nih.gov/bioproject/)
