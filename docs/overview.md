# DB ポータル概要

DDBJ の登録・検索サービスへの統合ポータルの全体設計。背景・スコープ・ページ構成・技術スタック・アーキテクチャを定義する。

## 背景と目的

DDBJ（DNA Data Bank of Japan）は多数のデータベース・登録システム・検索サービスを運用しているが、以下の課題がある:

- DB が分散していて、どこで何を検索すればいいかわからない（DDBJ Search, ARSA, TXSearch, Metabobank 等）
- キーワード検索したとき、横断的にヒット数を俯瞰できない
- 登録窓口単位（Mass Submission System（MSS）, D-way Submission Portal 等）でページが分かれており、適切な登録先の判断が困難
- ユースケース（ゲノム登録等）の達成に複数 DB（BioProject（BP）, BioSample（BS）, DRA（DDBJ Sequence Read Archive）, DDBJ (Trad)）への登録が必要だが、全体像を把握しにくい
- 仕様・ルールがドキュメント、Q&A 等に散在している

DB ポータルは、DDBJ の登録・検索サービスへの統合的な入口となる Web ポータルである。将来的に ddbj.nig.ac.jp を置き換える。

## ターゲットユーザー

- データを登録したい実験研究者（初心者 ~ 経験者）
- データを検索・閲覧したい研究者

## スコープ

### 含まれるもの

- **トップページ**: 横断検索ボックス + DB セレクタ、DDBJ センター動線カード（詳細検索 / 登録ナビ / サービス / スパコン / 統計 / 活動の 6 枚を 1 グリッドに混在）、ニュース（ddbj/www からミラー、右ペイン表示）。将来 ddbj.nig.ac.jp を置き換えるための入口を兼ねるため、ポータル機能（検索・登録）と DDBJ サイト全体の動線を同居させる
- **横断検索結果ページ**: DB ごとのヒット数サマリー、各 DB の検索ページへのリンク
- **DB 個別結果リストページ**: カードリスト形式（NCBI Entrez 風）+ 各 DB 詳細ページへの動線
- **登録ナビゲーションページ**: ユースケースカード + フローチャート形式ナビゲーション + 詳細パネルを 1 ページに集約（独立した QuickStart ページは作らない）
- **ニュースアーカイブ**: ddbj/www をミラーした全件一覧 + 年 / 種別 / DB / タグのファセット絞り込み（`/news`）。重要告知は上部 NotificationBar として全ページで表示
- **認証**: DDBJ Account（Keycloak）連携
- **問い合わせ**: 既存の Google Form へのリンク
- **i18n**: 日本語（メイン） + 英語

### 含まれないもの

以下は将来拡張として計画している。詳細は「将来拡張」セクションを参照。

- レコード詳細表示（各 DB の既存ページに遷移する）
- 実際の登録フォーム / Repository API 連携
- アナリティクス
- portal 内ニュース記事詳細ページ（現状は外部 ddbj.nig.ac.jp へ遷移）
- DBCLS（ライフサイエンス統合データベースセンター）サービスの統合

## ページ構成

```
(all pages)
└── NotificationBar (Header 直下、tags に Announcement を含む現役告知)

/ (top)
├── search box (cross-db search) + DB selector
└── 2-col grid (lg:grid-cols-[1fr_320px]):
    ├── left main: service grid (lg:2-col)
    │     /advanced-search, /submit (internal)
    │     DDBJ services, supercomputer, statistics, activities (external)
    └── right aside (sticky): News (compact list, 8 件) + "もっと見る →" /news

/search?q=xxx (cross-db search results)
├── hit count summary per DB
└── link to /search?q=xxx&db=yyy or external DB search

/search?q=xxx&db=yyy (per-DB result list)
├── simple unified list
└── link to external DB detail page

/submit (registration navigation, single page)
├── [Use Case Cards] 9 cards (shortcuts to tree nodes or leaves)
├── [Decision Tree] 31 leaves, depth 2-7 (comprehensive coverage)
└── [Detail Panel] 2-stage drill-down (overview on card, detail on leaf)

/news (news archive)
├── facets: type / year / db / tag
└── hits: 外部 ddbj.nig.ac.jp/news/{lang}/{slug}.html へリンク
```

## URL 設計

DB ポータル全体の URL 設計方針。検索系の詳細は [search.md#url-設計](./search.md#url-設計)、登録系の詳細は [submit.md#url-設計](./submit.md#url-設計) を参照。

### 全ページマップ

| URL | 用途 | レンダリング | robots |
|---|---|---|---|
| `/` | トップ | SSR | `index, follow` |
| `/search` | 横断 / DB 指定検索結果 | SSR シェル + CSR データ取得 | `noindex, follow` |
| `/advanced-search` | GUI クエリビルダ | SSR | `index, follow` |
| `/submit` | 登録ナビゲーション | SSR | `index, follow` |
| `/news` | ニュース全件アーカイブ（ファセット絞り込み、ddbj/www ミラー） | SSR | `index, follow` |
| `/api/news` | ニュース取得 API（resource route） | - | `noindex, nofollow` |
| `/design-system` | デザインシステム | SSR | `noindex, nofollow` |
| `/auth/callback` | OIDC 認可コード受け取り | CSR | `noindex, nofollow` |
| `/auth/silent-callback` | OIDC サイレント更新 | CSR | `noindex, nofollow` |
| `/auth/logout-callback` | OIDC ログアウト後 | CSR | `noindex, nofollow` |

### 設計方針

1. **クエリパラメータで状態を表現**: `/search` のフィルタ（`q`, `db`, `page`, `sort` 等）も `/submit` の選択状態（`for` + `leaf`）も、全てクエリパラメータで載せる。パスセグメントは使わない（DB 名やユースケース名はフィルタ値であって階層ではないため）
2. **ブックマーク / 共有を意識した復元**: URL 1 本で画面状態を復元できるようにする（検索結果 = `q` + `db` + `page` + `sort`、登録ナビ = `for` + `leaf`）
3. **デフォルト値は URL から省く**: canonical URL を短く保つため、デフォルト値（`page=1`, `sort=relevance` 等）は自動で省略する
4. **レンダリング方針**: `react-router.config.ts` で `ssr: true` とし、全ページ SSR で配信する（プリレンダは行わない）。SEO 上必要な canonical / robots / meta は SSR でも HTML に正しく出力できるため prerender 化は不要と判断。`/search` は SSR で初期 HTML（シェル）を返しつつ、検索結果データは TanStack Query で CSR 取得する（DB ごとに独立した `useQuery` で progressive rendering）。`/auth/**` は OIDC コールバックのため CSR
5. **i18n**: URL に言語を含めない（同一 URL で動的に切替）。言語判定は cookie `lang` > `Accept-Language` の優先順位。UI トグルの選択は cookie に保持し、SSR でも loader で読み取れるため hydration フラッシュが発生しない。hreflang は出さない（言語別の URL が存在しないため宣言の意味が成立しない）。将来 SEO で英語版を個別インデックスさせたくなったら `?lang=en` を導入して `?lang > cookie > Accept-Language` に拡張し、相互 hreflang で宣言する
6. **URL 互換性**: ルートパス・`db` の値・主要パラメータ名は変えない。廃止時は 301 redirect

### Accession 直アクセス

Accession（`PRJDB12345` 等）を URL で直接指定する専用パス（`/accession/...`）は設けない。`/search?q=PRJDB12345` に統一する。

理由:

- ポータルは accession ごとの詳細ページを自前で持たない（詳細は各 DB の既存ページに遷移する設計）
- 判定ロジックを設けずに「通常の全文検索で relevance score 上位に救う」方針（search.md 参照）と整合
- 将来 Featured result 的な強調が必要になったら検索結果画面内で対応

### 外部リダイレクト

変異データ（JVar / EVA / dgVa）、プロテオミクス（jPOST）、既存登録窓口（D-way / MSS フォーム / NSSS / MetaboBank / JGA 等）への遷移は自動リダイレクトしない。中継 URL（`/redirect?to=...`）も設けず、外部 URL を直接リンクする。外部サイトへ遷移する旨は Callout / TextLink external で明示し、新規タブで開く（`target="_blank" rel="noopener noreferrer"`）。詳細は [submit.md](./submit.md) 参照。

### 認証コールバック

`/auth/**` 名前空間にまとめる（`/auth/callback`, `/auth/silent-callback`, `/auth/logout-callback`）。将来の `/auth/profile`, `/auth/settings` への拡張余地を残す。Keycloak クライアントの redirect URI は各環境の実ドメインに固定する。

## トップページ

`/` は (a) ポータル機能（横断検索 / 詳細検索 / 登録ナビ）への動線、(b) DDBJ センター主要ページ（サービス・スパコン・統計・活動）への動線、(c) ニュースの 3 機能を同居させる。将来 ddbj.nig.ac.jp 廃止に向けて、現 DDBJ サイトのホーム機能を段階的に吸収する位置づけ。

### 構成

1. **横断検索ボックス + DB セレクタ**: 既存どおりトップ最上段（hero タイトルは廃止、検索ボックスを実質的なヒーローとして使う）
2. **2-col グリッド (lg+)**:
   - 左 main: サービスグリッド（内部リンク 2 枚 + 外部リンク 4 枚を 2-col に並べる、外部は新規タブ）
   - 右 aside: ニュース一覧（compact、8 件、sticky）と「もっと見る →」/news リンク
   - mobile / tablet では right aside が main の下にスタック
3. **重要告知**: ホームでも全ページ共通の上部 NotificationBar に集約（`/` ページ固有の枠は持たない）

### 外部リンク URL の i18n

外部 4 リンクの URL は当面 ja 固定（`ddbj.nig.ac.jp/...`、トレーリング `index.html` 省略）。en の同等 URL 体系を確認後、必要に応じて i18n リソース化する。

### ニュース・お知らせ

詳細は [news.md](./news.md) を参照。ddbj/www の `_news/{ja,en}/*.md` を 10 分間隔で Node サーバが GitHub API 経由でミラーし、front matter の `tags` に `Announcement` を含むものを「notification（上部バー）」、それ以外を「news（右ペイン）」として分配する。`/news` で全件アーカイブ + 年 / 種別 / db / tag のファセット絞り込みを提供する。

## 検索

横断検索は DDBJ Search API を拡張して、各検索サービスを束ねる proxy として機能する（Search API は別リポジトリ [ddbj/ddbj-search-api](https://github.com/ddbj/ddbj-search-api) で開発）。

バックエンドは 3 系統: DDBJ Search（ES: SRA / BioProject / BioSample / JGA / GEA / MetaboBank）、ARSA（Solr: Trad）、TXSearch（Solr: Taxonomy）。ユーザーにはバックエンドの違いを見せない。

検索フロー: キーワード入力 → 横断検索（DB ごとのヒット数サマリー）→ DB 指定検索（結果リスト）→ 外部詳細ページ。検索 UX の詳細は [search.md](./search.md) を参照。

## 登録ナビゲーション

登録システム単位ではなく、登録ユースケース単位で情報を整理する。詳細は v1 が [submit.md](./submit.md)、v2 が [submit-alt.md](./submit-alt.md)。

現在 `/submit` (v1, Decision Tree 起点) と `/submit-alt` (v2, 質問ウィザード起点) を並走評価中で、トップページ導線および最終的な本流選択は未確定。両仕様とも独立して保守する。

### ナビゲーション構成（v1: `/submit`）

`/submit` 1 ページに 3 セクション構成でまとめる（独立した QuickStart ページは作らない）:

1. **ユースケースカード一覧**: 代表的なユースケース 9 枚（微生物ゲノム、真核生物ゲノム、メタゲノム / MAG / SAG、遺伝子発現（RNA-seq・アレイ）、変異データ、プロテオミクス、メタボロミクス、小規模塩基配列・PCR 産物、ヒト制限アクセス）をグリッド表示。選択すると Decision Tree の該当中間 node が自動選択され、詳細パネルを概要レベルに切り替える
2. **Decision Tree**: 深さ 2〜7 層・31 leaf で DDBJ 登録の全パターンを網羅。カードで自己判断できない研究者は L1 から順に降りる。現在地・該当経路をハイライトする
3. **詳細パネル**: 2 段階ドリルダウン。カード選択時は概要レベル、tree の leaf 到達時は具体レベルに切り替わる。ユースケースの概要、必要な DB、ステップ、既存システムへのリンクを含む

初期に全 9 カード分の概要レベル詳細パネルを書き下ろす。記述深度はカードごとに調整する（ゲノム系を最も詳しく、外部リダイレクト系（変異データ・プロテオミクス）は概要 + 外部リンク中心）。leaf 単位の具体レベル記述は継続タスク。

### コンテンツ方針

- コンテンツの原典: [ddbj/www](https://github.com/ddbj/www) リポジトリの登録関連コンテンツ
- 既存コンテンツの文言はそのまま書き換えないが、情報の整理・取捨選択・新規書き下ろしは行う
- 既存のファイル分割単位は流用しない。ユースケース起点で再構成する
- ddbj/www からのコンテンツ移行は段階的に進める。インターナルリリースでは登録ナビ（`/submit`）に必要なコンテンツのみ書き下ろす。ファーストリリースで試験的に一部コンテンツを移行し、その後の長期計画で ddbj/www 廃止を検討する
- コンテンツのフォーマットは TSX コンポーネント（Markdown は使用しない）

## 認証

DDBJ Account は DDBJ が運用する統合認証基盤で、OpenID Connect（OIDC）provider として Keycloak を使用する。

現時点では認証を必須とする機能はないが、認証基盤との連携を組み込んでおく。ログイン / ログアウトの UI はヘッダーに配置する。

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

- URL は言語によって変わらない（同一 URL、クエリパラメータも付けない）
- 言語判定の優先順位: **cookie `lang`** > `Accept-Language` ヘッダ
  - cookie 未設定時は `Accept-Language` で判定（`ja` が含まれれば日本語、それ以外は英語）
- 言語切り替えは UI トグルで行い、選択を cookie `lang` に保持する
  - cookie 属性: `SameSite=Lax; Path=/; Max-Age=31536000`（1 年）、本番のみ `Secure`
  - 値: `ja` | `en`
- SSR/Hydration の整合: SSR 時は loader で `Cookie` ヘッダから `lang` を読み取り、i18next の初期言語に渡す。cookie とサーバの判定が一致するため hydration フラッシュは発生しない
- react-i18next の `i18next-browser-languageDetector` 検出順: `cookie → navigator`
- hreflang / `<link rel="alternate">` は出さない（言語別の別 URL が存在しないため）
- 将来英語版を個別に SEO インデックスさせたくなったら `?lang=en` を導入し、判定優先順位を `?lang=en > cookie > Accept-Language` に拡張する。両言語版 URL を相互に hreflang で宣言する
- ライブラリ: react-i18next + i18next-browser-languageDetector

### 翻訳リソースの管理

UI テキスト（ボタンラベル、見出し等の短い文字列）とコンテンツページ（長い文章）で管理方式を分ける:

- **UI テキスト**: react-i18next の JSON 翻訳ファイル（パスは実装時に確定）
- **コンテンツページ**: 言語別 TSX コンポーネント（例: `GenomeQuickStart.ja.tsx`, `GenomeQuickStart.en.tsx`）

## 技術スタック

| 項目 | 技術 |
|---|---|
| フロントエンド | Vite + React Router v7（framework mode） + TypeScript |
| スタイル | Tailwind CSS |
| データフェッチ | TanStack Query |
| 認証 | react-oidc-context（Keycloak、OIDC、Authorization Code Flow + PKCE） |
| i18n | react-i18next + i18next-browser-languageDetector |
| SEO | React Router v7 の SSR |
| テスト | Vitest |
| リンター | ESLint + @stylistic/eslint-plugin |
| パッケージ管理 | npm |

React Router v7 の framework mode を `ssr: true` で運用し、全ページ SSR で配信する。検索結果等のユーザー固有クエリ（`/search`）は SSR でシェル HTML を返しつつ、データ取得は TanStack Query の CSR で段階描画する。

## アーキテクチャ

```
        Browser
           |
       db-portal ---------------> DDBJ Search API
       (React Router v7)          /db-portal/cross-search   ← 横断（count + topHits）
           |                      /db-portal/search         ← DB 指定（hits envelope）
           |                      /db-portal/parse          ← DSL → AST（GUI 復元）
           |                              |
           |                       +------+------------+----------------+
           |                       |                   |                |
           |                  ES (DDBJ Search)    Solr (ARSA)      Solr (TXSearch)
           |                  SRA, BioProject,    Trad             Taxonomy
           |                  BioSample, JGA,
           |                  GEA, MetaboBank
           |
       Keycloak (OIDC)
```

- db-portal: React Router v7 framework mode による Web アプリケーション（本リポジトリ、フロントエンドのみ）。Node.js サーバーとして動作する
- DDBJ Search API: 別リポジトリ（[ddbj/ddbj-search-api](https://github.com/ddbj/ddbj-search-api)、0.3.0 staging 稼働中）。db-portal は `/db-portal/*` 名前空間の 3 endpoint（`cross-search` / `search` / `parse`）のみを叩く。`/db-portal/*` は ARSA / TXSearch / ES を束ねる proxy として新設、既存 `/search` 等の endpoint には手を加えない（詳細は [search-backends.md の既存 API との関係](./search-backends.md#既存-api-との関係ポータル用-endpoint-の名前空間分離) を参照）
- Keycloak: OIDC provider（DDBJ Account）
- 上流の Nginx は DDBJ インフラ側で管理する（本リポジトリのスコープ外）

開発は Docker Compose、staging / production は遺伝研スパコンで podman + podman-compose 運用。詳細は [deployment.md](./deployment.md) 参照。

## 将来拡張

- ddbj.nig.ac.jp の置き換え
- 実際の登録フォーム / Repository API 連携: [DDBJ Record](https://github.com/ddbj/ddbj-record-specifications)（全登録形式を単一 JSON record として統一的に扱う仕様。v3 で全 DB 横断の submission set 表現を目指して設計中）を生成する UI をポータル内で提供し、Repository API へ POST することで登録を完結させる計画。複数 DB（BioProject / BioSample / DRA / DDBJ (Trad) / JGA 等）にまたがる submission set を単一 Record として扱うことで、複数ユースケース該当時の登録統合案内の SSOT となる
- portal 内ニュース記事詳細ページ（`/news/:slug`、現状は外部 ddbj.nig.ac.jp へ遷移）
- DBCLS サービスの統合
- private accession の検索（DDBJ Account 連携）
- 更新申請機能
- 問い合わせシステムの整備
