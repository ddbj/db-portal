---
title: JGA (Japanese Genotype-phenotype Archive)
description: DDBJ Center が運用する、ヒト個人レベルの遺伝学的・表現型データのための制限公開アーカイブ。NBDC ヒトデータベースで承認された利用制限ポリシー付きの匿名化データのみを受け付け、利用にはヒトデータ審査委員会の審査が必要です。
---

## JGA とは

Japanese Genotype-phenotype Archive (JGA) は、ヒト個人レベルの遺伝学的データと表現型データを保管・共有するための制限公開アーカイブです。DDBJ Center (Bioinformation and DDBJ Center) が運用し、登録のための提供申請と利用のための利用申請はいずれも [NBDC ヒトデータベース](/databases/humandbs) で受け付け、ヒトデータ審査委員会が審査します。研究参加者の同意の範囲を超えて公開できないデータを、利用制限ポリシー付きで保管し、承認された利用者にのみ提供します。

EBI EGA や NCBI dbGaP と同種の制限公開アーカイブにあたりますが、3 つのアーカイブ間でデータの相互交換は行われません。Study / Dataset / Policy の概要メタデータは DDBJ Search 上で誰でも閲覧できる一方、シークエンスファイル等の実データは利用申請が承認された利用者のみがダウンロードできます。

> [!NOTE]
> [登録ナビ](/submit) で「ヒト個人レベルの制限公開データ」を選ぶと、NBDC ヒトデータベースへのデータ提供申請から JGA への登録までの経路が案内されます。

## 受け付けるデータ

ヒト個人由来の匿名化されたデータのみを受け付けます。研究参加者を再特定し得る情報を含むデータは登録できません。

| データ種別 | 主なフォーマット | 紐付け先オブジェクト | 補足 |
|-----------|------------------|--------------------|------|
| NGS リード | FASTQ (gzip / bzip2) | Data | paired-end は `/1` `/2` サフィックスを付ける |
| アラインメント済みリード | BAM | Data | unaligned reads を含む BAM 推奨。再圧縮しない |
| 454 リード | SFF | Data | uncompressed のまま submit |
| バリアント | VCF | Analysis | sequence variations は VCF 推奨 |
| マイクロアレイ | genotyping / SNP / 発現アレイ | Analysis | GEA 準拠の形式を推奨 |
| メタボローム | MetaboBank submission format 準拠 | Analysis | |
| プロテオーム | SDRF-Proteomics 準拠 | Analysis | |

ファイル仕様の制約として、ファイル名にスペースを含めない、複数ファイルを ZIP でまとめて提出しない、BAM はそれ自体が圧縮形式なので gzip 等で再圧縮しない、などがあります。

> [!WARNING]
> JGA に登録できるのは「DBCLS で承認された利用制限ポリシーを持つ匿名化データ」のみです。ポリシー未承認のデータや個人を特定し得るデータは受け付けません。

## データ構造

JGA は [DRA](/databases/dra) で使われる BioProject / BioSample のモデルを採用せず、[Sequence Read Archive](https://www.ddbj.nig.ac.jp/dra/metadata.html) のメタデータモデルを拡張した独自のエンティティモデルを持ちます。Study / Sample / Experiment / Data / Analysis / Dataset / Policy の 7 種類のメタデータオブジェクトに加え、登録トランザクションを表す Submission があり、それぞれに独立したアクセッション番号が発行されます。

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

## 登録の流れ

```text
[1] D-way アカウント + SSH 公開鍵登録
        ↓
[2] NBDC 申請システムで提出者グループ作成 (PI / submitter 全員)
        ↓
[3] データ提出申請を送信
        ↓
[4] DBCLS による審査 → JSUB###### 発行 + 登録用ディレクトリ作成
        ↓
[5] JGA metadata Excel (英語) を記入
        ↓
[6] SFTP / WinSCP で jga-gw.ddbj.nig.ac.jp にメタデータ転送
        ↓
[7] 同経路でデータファイル転送 (Data / Analysis)
        ↓
[8] キュレーターが Excel → XML 変換 + 検証 → accession 発行
        ↓
[9] 対応する NBDC ヒトDB の hum 公開と連動して JGA データも公開
```

メタデータは英語で記入します。submitter 側で事前に XML 検証したい場合は、Singularity 経由で `excel2xml` を実行できます。

## 事前準備

- [NBDC ヒトデータベース](/databases/humandbs) でデータ利用ポリシーの承認を受けておく (必須前提)
- DDBJ (D-way) アカウントを作成し、SSH 公開鍵を登録する
- NBDC 申請システムで「データ提出者グループ」を作成し、PI / submitter 全員をメンバーに含める
- 研究参加者との同意書で公開・利用制限が確認できる、匿名化済みデータを準備する
- メタデータ記入用の英語環境を整える (Excel テンプレートは英語記入)

## NBDC ヒトデータベースとの関係

JGA は [NBDC ヒトデータベース](/databases/humandbs) と二段階で連動しています。

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
- [NBDC ヒトデータベース](/databases/humandbs) (登録前のポリシー承認と公開時の連動)
- [DRA](/databases/dra) (公開ヒトデータ / 非ヒトデータ向け sibling service)
