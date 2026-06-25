---
title: BioSample
description: 実験データの取得に使われた試料 (細胞株 / 組織 / 個体 / 環境試料) の属性を集中管理するデータベース。
---

## BioSample とは

BioSample は、DDBJ の一次データベース (DRA / DDBJ Annotated / GEA など) に登録された実験データの出典となる生物学的試料の情報をまとめるデータベースです。
細胞株、組織の生検試料、生物個体、環境試料 (土壌・水・空気など) が代表的な例です。

> [!NOTE]
> BioSample の登録は、シーケンスデータや発現量データの登録と同時に進めることが多くなります。
> [登録ナビ](/submit) で実験データの種別を選ぶと、BioSample を含む登録経路が自動で組み立てられます。

## アクセッション番号と package

DDBJ BioSample では各試料に `SAMD` から始まるアクセッション番号を発行します。
登録時には、試料の種別に応じた INSDC 共通の package (例: Human / Microbe / Environmental) を選び、必要な属性を入力します。

## 国際的な共有

登録された BioSample は、DDBJ・EBI・NCBI の各 BioSample データベース間で双方向に共有されます。
つまり一度 DDBJ に登録した試料情報は、他センターの一次データベースからも参照可能です。

## 外部リンク

- [NCBI BioSample](https://www.ncbi.nlm.nih.gov/biosample)
- [EBI BioSamples](https://www.ebi.ac.uk/biosamples/)
- [DDBJ BioSample 公式ページ](https://www.ddbj.nig.ac.jp/biosample/index.html)
