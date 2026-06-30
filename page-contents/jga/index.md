---
title: JGA
ヒト由来試料を用いた研究で産出された解析データを一定の条件の下で共有するための制限公開データアーカイブです。シークエンスデータ等の生データを提供・利用する際には、ヒトデータ審査委員会による審査承認を受ける必要があります
---

## JGA とは

データの提供・利用には、「NBDCヒトデータ共有ガイドライン」および「NBDCヒトデータ取扱いセキュリティガイドライン」の遵守が求められます。また、各データには利用条件を定めたPolicyが付与されており、そのPolicyを満たす研究目的・利用条件の範囲内でデータを利用する必要があります。

JGAは、European Bioinformatics Institute（EBI）が運用するEuropean Genome-phenome Archive（EGA）や、National Center for Biotechnology Information（NCBI）が運用するdatabase of Genotypes and Phenotypes（dbGaP）と同様の制限公開データを管理・共有するためのアーカイブです。各国・地域の法令等に基づいたデータ提供・利用審査を行う必要があるため、JGA、EGA、dbGaPの三極間でデータそのものを相互に交換する仕組みは設けていません([公式 FAQ](https://www.ddbj.nig.ac.jp/faq/en/jga-dbgap-ega-e.html))。併せて、いずれのアーカイブでも査読者用のアクセストークンを発行することはできません。

メタデータのうち、Study、Dataset、Policyは、DDBJ Searchを通じて誰でも閲覧できます。一方で、シークエンスファイル等の生データや、その他のメタデータについては、データ利用申請が承認された利用者のみがアクセスできます。

> [!NOTE]
> [登録ナビゲーション](/submit) で「ヒト」＋「制限公開を希望する」/「個人識別符号を含む」/「法令・倫理指針に沿った研究」を選ぶと、NBDC ヒトデータベースへのデータ提供申請から JGA への登録までの経路が案内されます。

## 受け付けるデータ

ヒト個人由来のデータの場合は匿名化を実施済みデータのみを受け付け、研究参加者を再特定し得る情報を含むデータは受け付けません。

| データ種別 | 主なフォーマット | 紐付け先オブジェクト | 補足 |
|-----------|------------------|--------------------|------|
| NGS リード | FASTQ (gzip / bzip2) | Data | paired-end は `/1` `/2` サフィックスを付ける |
| アラインメント済みリード | BAM | Data | unaligned reads を含む BAM 推奨。再圧縮しない |
| 454 リード | SFF | Data | uncompressed のまま submit |
| バリアント | VCF | Analysis | sequence variations は VCF 推奨 |
| アレイ | genotyping / SNP / 発現 intensity data | Analysis | GEA 準拠の形式を推奨 |
| メタボローム | MetaboBank submission format 準拠 | Analysis | |
| プロテオーム | SDRF-Proteomics 準拠 | Analysis | |

ファイル仕様の制約として、ファイル名にスペースを含めない、複数ファイルを ZIP でまとめて提出しない、BAM はそれ自体が圧縮形式なので gzip 等で再圧縮しない、などがあります。


## データ登録事前準備

- 「NBDC ヒトデータ共有ガイドライン」「NBDC ヒトデータベースセキュリティガイドライン（データ提供者向け）」の最新版を熟読し、権利や責務について確認
- データ提供申請に必要な以下の情報を準備
  - 提供するデータに関する情報：研究内容の概要（目的、方法、対象、発表論文など）、データの種類（名称・量、アクセス制限レベルの分類に関する情報、公開可能日など）
  - データ提供申請の際の研究代表者の氏名、所属情報（所属機関名、職名、所在地）、連絡先（電話番号、メールアドレス）
  - 所属機関の長の氏名、職名、連絡先
    - 所属機関の長とは、倫理審査委員会によって承認された研究計画の実施を許可する者を指します。
  - 提供を予定しているデータを産出した際の研究に関する情報
    - 研究計画書（倫理審査申請書）
    - インフォームドコンセントの際の説明文書および同意文書のフォーム（書式）
    - 所属機関等の倫理審査委員会の審査・承認を受けた上で、所属機関の長が研究実施について許可したことが分かる書面（承認通知書など）の写し
- NBDC ヒトデータベース申請システムにログインするための準備をする
  - DDBJアカウントを作成し、SSH 公開鍵を登録する
    - 

- [NBDC ヒトデータベース](/humandbs) でデータ利用ポリシーの承認を受けておく (必須前提)
- 
- NBDC 申請システムで「データ提出者グループ」を作成し、PI / submitter 全員をメンバーに含める
- 研究参加者との同意書で公開・利用制限が確認できる、匿名化済みデータを準備する



## 登録の流れ

```mermaid
flowchart TD
  S1[D-way アカウント + SSH 鍵登録]
  S2[NBDC で提出者グループ作成]
  S3[データ提出申請]
  S4[DBCLS 審査 → JSUB 発行]
  S5[metadata Excel 記入]
  S6[メタデータ転送 SFTP]
  S7[データファイル転送]
  S8[キュレーターが XML 化 → accession 発行]
  S9[NBDC ヒトDB の hum 公開と連動して公開]
  S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9
```

メタデータは英語で記入します。submitter 側で事前に XML 検証したい場合は、Singularity 経由で `excel2xml` を実行できます。


## データ構造

JGA は [DRA](/dra) で使われる BioProject / BioSample のモデルを採用せず、[Sequence Read Archive](https://www.ddbj.nig.ac.jp/dra/metadata.html) のメタデータモデルを拡張した独自のエンティティモデルを持ちます。Study / Sample / Experiment / Data / Analysis / Dataset / Policy の 7 種類のメタデータオブジェクトに加え、登録トランザクションを表す Submission があり、それぞれに独立したアクセッション番号が発行されます。

| オブジェクト | 役割 |
|------------|------|
| Submission | 登録トランザクションの単位。公開タイミングもこの単位 |
| Study | 研究全体のメタデータ。論文での citation はこの単位を使う |
| Sample | 匿名化された個別サンプルの記述 (通常 1 サンプル = 1 個人) |
| Experiment | NGS / アレイ実験のライブラリ調製・プラットフォーム情報 |
| Data | NGS の生リード等のプライマリデータファイル |
| Analysis | VCF / マイクロアレイ / 派生データなどの解析結果ファイル |
| Dataset | 利用申請の対象となる配布単位。1 つの Policy に紐付く |
| Policy | データ利用ポリシー (DAA: Data Access Agreement) の記述 |

アクセス制御は **Dataset × Policy** の組で行われ、利用者は Policy 単位で DBCLS に利用申請します。1 つの Dataset は 1 つの Policy に紐付きます。Study 内で Control と Case など適用ポリシーが異なるデータを扱う場合は、Dataset をポリシーごとに分割します。

## アクセッション番号

提供申請が承認された段階で、作業用の Submission ID (例 `JSUB000353`) が払い出され、JGA サーバ上に登録用ディレクトリが作成されます。最終的なアクセッション番号は、キュレータによる Excel → XML 変換と xsd バリデーション完了後に発行されます。

| Prefix | オブジェクト | 桁数 | 例 |
|--------|------------|----|-----|
| `JGA` | Submission | 6 | `JGA000001` |
| `JGAS` | Study | 6 | `JGAS000001` |
| `JGAN` | Sample | 9 | `JGAN000000001` |
| `JGAX` | Experiment | 9 | `JGAX000000001` |
| `JGAR` | Data | 9 | `JGAR000000001` |
| `JGAZ` | Analysis | 9 | `JGAZ000000001` |
| `JGAD` | Dataset | 6 | `JGAD000001` |
| `JGAP` | Policy | 6 | `JGAP000001` |

`JGAP` (Policy) は NBDC ポリシー以外のポリシーが必要な場合に DBCLS でポリシーを登録した時点で発行され、Dataset から参照します。NBDC ポリシーだけが適用される登録では Policy を新規作成する必要はありません。

> [!TIP]
> 論文での citation には Study accession (`JGAS######`) を使うことが推奨されています。Study に紐付く Dataset / Policy 全体への入口になります。


## NBDC ヒトデータベースとの関係

JGA は [NBDC ヒトデータベース](/humandbs) と二段階で連動しています。

- **登録前**: 研究で適用する利用制限ポリシーを NBDC ヒトデータベース側で申請し、DBCLS の審査・承認を受けてから JGA への登録に進みます。ポリシー未承認のデータは JGA では受け付けません。
- **公開時**: JGA データが公開されるのは、対応する NBDC ヒトデータベースの研究公開ページ (hum###### 番号) が公開されたタイミングです。submitter 単独のスケジュールで公開を制御することはできず、公開時期は NBDC ヒトデータベース側の研究公開状況に従います。

> [!IMPORTANT]
> JGA / NCBI dbGaP / EBI EGA は、同種のヒト制限公開アーカイブですが、3 者間でデータの相互交換は行われません ([公式 FAQ](https://www.ddbj.nig.ac.jp/faq/en/jga-dbgap-ega-e.html))。

## 関連リソース

- [JGA 公式ページ (日本語)](https://www.ddbj.nig.ac.jp/jga/index.html)
- [JGA 公式ページ (英語)](https://www.ddbj.nig.ac.jp/jga/index-e.html)
- [JGA Submission ガイド](https://www.ddbj.nig.ac.jp/jga/submission.html)
- [JGA Submission step-by-step (EN)](https://www.ddbj.nig.ac.jp/jga/submission-step-e.html)
- [FAQ: JGA / dbGaP / EGA の相互交換について](https://www.ddbj.nig.ac.jp/faq/en/jga-dbgap-ega-e.html)
- [submission-excel2xml (Excel → XML 変換ツール)](https://github.com/ddbj/submission-excel2xml)
- [JGA XML schema (xsd)](https://github.com/ddbj/pub/tree/master/docs/jga)
- [DDBJ Search での JGA Dataset 検索例](https://ddbj.nig.ac.jp/search/entry/jga-dataset/JGAD000948)
- [NBDC ヒトデータベース](/humandbs) (登録前のポリシー承認と公開時の連動)
- [DRA](/dra) (公開ヒトデータ / 非ヒトデータ向け sibling service)
