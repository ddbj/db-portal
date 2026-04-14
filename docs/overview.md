# DB ポータル概要

## 背景と目的

DDBJ（DNA Data Bank of Japan）は多数のデータベース・登録システム・検索サービスを運用しているが、以下の課題がある:

- DB が分散していて、どこで何を検索すればいいかわからない（DDBJ Search, ARSA, TXSearch, Metabobank 等）
- キーワード検索したとき、横断的にヒット数を俯瞰できない
- 登録システム単位（Mass Submission System（MSS）, D-way Submission Portal, DDBJ Read Archive（DRA）等）でページが分かれており、適切な登録先の判断が困難
- ユースケース（ゲノム登録等）の達成に複数 DB（BioProject（BP）, BioSample（BS）, Sequence Read Archive（SRA）, DDBJ Trad）への登録が必要だが、全体像を把握しにくい
- 仕様・ルールがドキュメント、Q&A 等に散在している

DB ポータルは、DDBJ の登録・検索サービスへの統合的な入口となる Web ポータルである。将来的に ddbj.nig.ac.jp を置き換える。

## ターゲットユーザー

- データを登録したい実験研究者（初心者 ~ 経験者）
- データを検索・閲覧したい研究者

## 第一段階スコープ

### 含まれるもの

- **トップページ**: 横断検索ボックス + DB セレクタ、DB/リソース一覧、登録への動線
- **横断検索結果ページ**: DB ごとのヒット数サマリー、各 DB の検索ページへのリンク
- **DB 個別結果リストページ**: 統一的な簡易リスト表示 + 各 DB 詳細ページへの動線
- **登録ナビゲーションページ**: ユースケース一覧 + ウィザード形式ナビゲーション
- **ゲノム登録 QuickStart ページ**: 登録に必要な DB の全体像（BP, BS, SRA, DDBJ Trad）、各ステップの説明と既存システムへのリンク
- **認証**: DDBJ Account（Keycloak）連携
- **問い合わせ**: 既存の Google Form へのリンク
- **i18n**: 日本語（メイン） + 英語

### 含まれないもの

以下は将来的な拡張として計画している。詳細は「将来的な拡張」セクションを参照。

- レコード詳細表示（各 DB の既存ページに遷移する）
- 実際の登録フォーム / Repository API 連携
- ゲノム登録以外のユースケース登録ページ
- アナリティクス
- ホームページ的なコンテンツ（ニュース、お知らせ等）
- DBCLS（ライフサイエンス統合データベースセンター）サービスの統合
- DB 個別結果リストのファセット検索

## ページ構成

```
/ (top)
├── search box (cross-db search) + DB selector
├── DB / resource list
└── link to /submit

/search?q=xxx (cross-db search results)
├── hit count summary per DB
└── link to /search?q=xxx&db=yyy or external DB search

/search?q=xxx&db=yyy (per-DB result list)
├── simple unified list
└── link to external DB detail page

/submit (registration navigation)
├── use case cards (genome, MAG/SAG, ...)
├── wizard navigation (guided questions -> registration target)
└── link to /submit/<use-case>

/submit/genome (genome registration QuickStart)
├── overview of required DBs (BP, BS, SRA, DDBJ Trad)
└── step-by-step guide with links to existing systems
```

## 検索

横断検索は DDBJ Search API を拡張して、各検索サービスを束ねるプロキシとして機能する（Search API は別リポジトリで開発）。

対象サービス:

| サービス | 説明 |
|---|---|
| DDBJ Search | DDBJ の統合検索 |
| ARSA | 塩基配列・アミノ酸配列の検索 |
| TXSearch | Taxonomy 検索 |
| Metabobank | メタボローム検索 |

検索フロー:

```
[top] keyword input + DB selector
  |
  v
[/search?q=xxx] hit count summary per DB
  |  (click DB)
  v
[/search?q=xxx&db=yyy] per-DB result list (simple)
  |  (click record)
  v
[external] DB detail page
```

Accession（例: `PRJDB12345`）入力時は、横断検索結果を表示しつつ該当レコードへの直接リンクを目立たせる。検索 UX の詳細は [NCBI Entrez](https://www.ncbi.nlm.nih.gov/) に準じる。

## 登録ナビゲーション

登録システム単位ではなく、登録ユースケース単位で情報を整理する。第一段階ではゲノム登録のユースケースのみ対象。

### ナビゲーション構成

2 つの動線を組み合わせる:

1. **ユースケースカード一覧**: 代表的なユースケース（ゲノム、Metagenome-Assembled Genome（MAG）/ Single Amplified Genome（SAG）、RNA-seq 等）をカード UI で提示。選択すると QuickStart ページへ遷移
2. **ウィザード形式ナビゲーション**: 質問に答えていくと適切な登録先がわかるガイド

### コンテンツ方針

- コンテンツの原典: [ddbj/www](https://github.com/ddbj/www) リポジトリの登録関連コンテンツ
- 既存コンテンツの文言はそのまま書き換えないが、情報の整理・取捨選択・新規書き下ろしは行う
- 既存のファイル分割単位は流用しない。ユースケース起点で再構成する
- 重要なコンテンツからポータルに移行する
- コンテンツのフォーマットは TSX コンポーネント（Markdown は使用しない）

## 認証

DDBJ Account は DDBJ が運用する統合認証基盤で、OpenID Connect（OIDC）provider として Keycloak を使用する。

第一段階では認証を必須とする機能はないが、認証基盤との連携を組み込んでおく。ログイン / ログアウトの UI はヘッダーに配置する。

### 認証フロー

Authorization Code Flow + PKCE を使用する。

```
db-portal              Keycloak
    |                      |
    |  1. Login button     |
    |--------------------->|
    |  2. User login       |
    |--------------------->|
    |  3. Redirect (code)  |
    |<---------------------|
    |  4. Exchange (JWT)   |
    |--------------------->|
    |<---------------------|
    |                      |
    |  (JWT stored in      |
    |   localStorage)      |
```

- ライブラリ: react-oidc-context（oidc-client-ts ベース）
- トークン保存: localStorage
- Keycloak クライアント: db-portal 用に新設
- 匿名ユーザーフローは不要（ログインなしで全機能利用可能）

## i18n

日本語をメイン言語とし、英語にも対応する。

- URL は言語によって変わらない（同一 URL）
- 言語切り替えは UI トグルで行う
- ライブラリ: react-i18next

### 翻訳リソースの管理

UI テキスト（ボタンラベル、見出し等の短い文字列）とコンテンツページ（長い文章）で管理方式を分ける:

- **UI テキスト**: react-i18next の JSON 翻訳ファイル（`locales/ja.json`, `locales/en.json`）
- **コンテンツページ**: 言語別 TSX コンポーネント（例: `GenomeQuickStart.ja.tsx`, `GenomeQuickStart.en.tsx`）

## 技術スタック

| 項目 | 技術 |
|---|---|
| フロントエンド | Vite + React Router v7（framework mode） + TypeScript |
| スタイル | Tailwind CSS |
| データフェッチ | TanStack Query |
| 認証 | react-oidc-context（Keycloak、OIDC、Authorization Code Flow + PKCE） |
| i18n | react-i18next |
| SEO | React Router v7 の SSR / プリレンダリング |
| テスト | Vitest |
| リンター | ESLint + @stylistic/eslint-plugin |
| パッケージ管理 | npm |

React Router v7 の framework mode を使用し、SEO が必要な静的コンテンツ（トップページ、登録ナビゲーション等）は SSR / プリレンダリングで配信する。検索結果等の動的ページはクライアントサイドでレンダリングする。

## デザイン

デザインの方向性は [BSI（情報・システム研究機構）](https://bsi.rois.ac.jp) を参考にする。デザインシステムの詳細は別途定義する。

## アーキテクチャ

```
        Browser
           |
       db-portal -------> DDBJ Search API
       (React Router v7       |  (proxy)
        framework mode)    +--+-------+------+------+
           |               |          |      |      |
           |          DDBJ Search   ARSA  TXSearch  Metabobank
           |          (internal)
           |
       Keycloak (OIDC)
```

- db-portal: React Router v7 framework mode による Web アプリケーション（本リポジトリ）。Node.js サーバーとして動作する
- DDBJ Search API: 各検索サービスを束ねるプロキシ（別リポジトリ）。DDBJ Search 自身の検索機能も内包する
- Keycloak: OIDC provider（DDBJ Account）
- 上流の Nginx は DDBJ インフラ側で管理する（本リポジトリのスコープ外）

## インフラ・デプロイ

| 環境 | ツール |
|---|---|
| 開発 | Docker Compose |
| NIG インフラ（staging / production） | podman + podman-compose |

上流の Nginx（リバースプロキシ）は DDBJ インフラ側で管理する。本リポジトリには含めない。

開発ドメイン: `portal-dev.ddbj.nig.ac.jp`

## リポジトリ構成

本リポジトリ（ddbj/db-portal）にはフロントエンドのみを含む。DDBJ Search API の拡張は別リポジトリで行う。

## 将来的な拡張

- ddbj.nig.ac.jp の置き換え
- ゲノム登録以外のユースケース登録ページ
- 実際の登録フォーム / Repository API 連携
- ホームページ的なコンテンツ（ニュース、お知らせ等）
- DBCLS サービスの統合
- private accession の検索（DDBJ Account 連携）
- 更新申請機能
- 問い合わせシステムの整備
- DB 個別結果リストのファセット検索
