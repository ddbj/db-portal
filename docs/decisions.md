# Architecture Decisions

db-portal の設計判断ログ。「なぜこの設計か」 を後から辿れるよう、各決定について **採用した方針 + 不採用にした代替案 + 理由** を記録する。実装の細部は `architecture.md` と各論 docs を参照。

判断の前提軸: **コスト最小化ではなく「正しい設計」 を優先する** (べき論)。

---

## アプリケーション基盤

### routing は config-based に統一

- 採用: `app/routes.ts` で全 URL 構造を一覧する config-based routing
- 不採用: RR v7 の file-based convention (`+page.tsx` 命名規則)
- 理由: ja default + `/en/...` prefix の i18n URL を route id 二重宣言で扱う必要があり、convention だと表現できない。全 URL 構造を 1 ファイルで一望できる利点も大きい

### リポジトリは 1 つのまま

- 採用: monorepo / モジュール分離は **内部 import 境界 (ESLint zones)** で表現
- 不採用: リリース前の物理分割 (`packages/*` への分解)
- 理由: portal は単一プロダクトであり、リリース前の物理分割は YAGNI。`architecture.md` の zones 表で論理境界を強制すれば 1 リポジトリで十分管理できる。リリース後に分割の必要性が出たら再評価

### ディレクトリ構造は `app/{routes,features,shell,ui,lib,schemas,content}` + `server/`

- 採用: 機能横断ロジック (`features`) と画面横断 chrome (`shell`) を分離、純粋ユーティリティは `lib`、Zod schema は `schemas` に集約
- 不採用: 機能単位の縦割り (`app/search/`, `app/submit/` で UI/lib/schemas を内包)
- 理由: zones の物理強制 (`no-restricted-paths`) と、features 同士の直接 import 禁止により、1 feature の変更が他 feature に波及しない構造を保つ

## データ取得

### 検索 AST → DSL のシリアライズは ddbj-search-api 側に集約

- 採用: `POST /db-portal/serialize` を ddbj-search-api に新設依頼 (実装済、staging 動作確認 + openapi-typescript 検証完了)、portal 側は debounce 500-1000 ms で叩く
- 不採用: portal 側に thin serializer を持つ二重実装
- 理由: grammar の二重保守を排除。AST → DSL は ddbj-search-api 側の DSL モジュール (`ddbj_search_api/search/dsl/`) で完全実装されており、portal が再実装する価値はない

### portal は独自 `Node` 型を持たず openapi-typescript で型生成

- 採用: `openapi-typescript` で `openapi.json` から `paths` / `components` を生成し、`ParseNode` alias で portal 側の型を作る
- 不採用: portal 側で `Node` 型を独自定義し、staging API と手動で同期
- 理由: API 変更時の型ズレを自動検知できる。`tsc --strict` で discriminator narrowing が完全に効くこと、Pydantic v2 の `Field(alias="from")` も `n.from` でアクセス可能であることを検証済 (`api-types.md`)

### News は git clone で mirror、GitHub REST API は使わない

- 採用: ddbj/www と dbcls/website を git clone + `git pull` で local mirror、30 分間隔でポーリング、SHA 比較で差分検出
- 不採用: GitHub REST API による 1 件ずつの取得 (rate limit 60 req/h IP、PAT 必要)
- 理由: git protocol HTTPS は REST API の rate limit と別枠で動くため認証不要。30 分間隔 × 2 source = 4 req/h で余裕。全件再構築は本数 1000-2600 規模なので partial update より単純堅牢

## 認証

### token storage は BFF + HttpOnly cookie

- 採用: OIDC token は BFF (`server/auth/`) の in-memory session store に置き、browser は HttpOnly cookie の `sid` だけを持つ
- 不採用: browser 側 localStorage / sessionStorage / JS-accessible cookie
- 理由: XSS による token 流出を物理的に防ぐ。JS から token に触れる経路を残さない (`auth.md`)

比較した代替案:

| 方式 | XSS 耐性 | Tab 越え session | Safari ITP 影響 | 実装複雑度 |
|---|---|---|---|---|
| BFF + HttpOnly cookie (採用) | ◎ JS が token に触れない | ◎ | ◎ | △ BFF に session 層が必要 (LLM proxy / News mirror で BFF は既存) |
| silent renew + sessionStorage | △ JS が触れる | × Tab 閉じで消える | × Keycloak iframe が 3rd-party cookie 制限で壊れる | ○ |
| localStorage に JWT | × | ◎ | ◎ | ◎ |

XSS 耐性と Safari ITP への耐性を最優先。BFF は News mirror / LLM proxy / Search API serialize で既設層なので、session 機能追加コストが小さい。

### リリース時点はログインボタンのみで専用機能なし

- 採用: 認証はログインボタン + `/api/me` 取得のみ。private accession 検索などのログイン必須機能は持たない
- 不採用: リリースに submit draft 永続化 / private accession 検索を含める
- 理由: スコープを最小化し、Keycloak 連携の動作確認だけを優先する。ログイン後専用機能はリリース後の追加

## i18n

### URL 戦略は ja default 無 prefix + `/en/...` のみ prefix

- 採用: ja は `/`、`/search`、`/news`、英語は `/en`、`/en/search`、`/en/news`。route id を二重宣言して同じ component を再利用
- 不採用: `/ja/...` も明示する両方 prefix、accept-language ベースの自動切替
- 理由: portal の主読者は日本語話者。ja を default にすることで URL がシンプルになり、SEO 上の重複も `<link rel="alternate">` で吸収できる (`i18n.md`)

補足理由:

- ja URL を短く保てる (ddbj.nig.ac.jp 既存サイトとの互換を取りやすい)
- ja 主・en 副の運営感と URL 構造が一致する
- SEO: `hreflang` で言語別バリエーションを宣言できる
- CDN cache: URL で言語が決まるため `Vary: Cookie` などのキャッシュ複雑化が不要

## テスト

### RR loader / action は `createRoutesStub` で unit テストする

- 採用: route + loader/action を `createRoutesStub` で組み立て、loader 内の HTTP は msw で境界 mock
- 不採用: loader を mock する / `MemoryRouter` で route を再構築する
- 理由: 内部関数を mock しないテスト哲学に準拠 (`testing.md`)。e2e に出すまでもないシナリオを unit で吸収できる

### mock は外部境界のみ

- 採用: HTTP / FS / 時刻 / 乱数 / OIDC のみ mock
- 不採用: 内部関数 / Zod schema / component / Tailwind を mock
- 理由: 内部 mock が必要に見えるなら設計が悪い。テストではなく設計を直す方針 (`testing.md`)

## ビルド・運用

### CI は最小 (typecheck / lint / unit + PBT のみ)

- 採用: `.github/workflows/ci.yml` で 3 コマンドのみ Docker 内実行。e2e / staging deploy / openapi 差分検知 / 性能ゲートは CI 化しない
- 不採用: staging-deploy / production-deploy / nightly / 性能ゲートを GitHub Actions 上で自動化
- 理由: CI に乗せると失敗時の対応コストが膨らむ。手動運用で十分回せる規模 (`deployment.md`)

### 環境変数は `DB_PORTAL_` prefix、`env.{dev,staging,production}` を `.env` に cp

- 採用: prefix で統一、 環境切替は `cp env.<env> .env && docker compose up -d --build`
- 不採用: `.env.dev` / `.env.staging` を file 名で切替、prefix なし
- 理由: `compose.yml` が `.env` を自動読み込みする慣習に従う。 `DB_PORTAL_PREFIX` を container_name / image / volume / network 名に含めるので、同一ホストで dev / staging / production が衝突せず共存する

### 本番は podman + podman-compose (NIG インフラ)

- 採用: production / staging は podman-compose、`compose.podman.yml` で rootless 用の override を吸収
- 不採用: production も Docker、 systemd unit、 k8s
- 理由: NIG インフラの慣習。`docker compose` (docker-compose plugin) は CDI device 名を解釈しないため、Python 製の `podman-compose` を使う

## コンテンツ

### コンテンツは `*.content.tsx` (TSX fragment + Zod 検証)

- 採用: Jekyll Markdown を **キーボードで打ち直して** TSX fragment に再起筆、Zod schema で eager validate
- 不採用: Markdown 直書き、 機械変換による一括移植
- 理由: 文章を再構造化する機会にする。TSX なら `<Callout>` / `<Section>` などのリッチコンポーネントを直接使え、Zod で構造の不正を build 時に弾ける (`content-system.md`)

比較した代替案:

| 方式 | 型安全 | リッチ表現 | i18n diff の読みやすさ | 将来の CMS 化 |
|---|---|---|---|---|
| `*.content.tsx` (採用) | ◎ Zod schema | ◎ JSX | ◎ 同一ファイルに `{ja, en}` 並走 | ○ loader を差し替えるだけ |
| Markdown frontmatter + MDX | △ frontmatter schema 検証は別途 | ◎ | △ 別ファイル管理になりがち | ○ |
| Headless CMS | △ 型は別途 codegen | ○ | △ | ◎ |

リリース時点でコンテンツ数が限られているため、CMS 化のコストは見合わない。`*.content.tsx` collection で出発し、将来必要なら loader を差し替える余地を持つ。

### breadcrumb は schema から除外し、 route handle + i18n リソースで自動生成

- 採用: 各 route の `handle.breadcrumb` で文字列キー or 関数を返し、`shell/breadcrumb.tsx` が描画
- 不採用: content の Zod schema に `breadcrumb` field を持たせる
- 理由: breadcrumb は content の本質的な属性ではなく、URL 構造から導出される表示要素。route handle に置く方が DRY (`shell.md`)

### DDBJ Record (v3) schema には依存しない

- 採用: 登録ナビは「登録経路の知識ベース」 として独立した Zod schema (`app/schemas/submit/`) で表現
- 不採用: DDBJ Record の spec が固まるのを待ってから adapter 設計
- 理由: Record は別プロジェクトで未確定。登録メタデータと「登録経路ナビ」 は別物。Record 完成後に必要なら adapter を後付けできる

## プロジェクト範囲

### ddbj.nig.ac.jp 全ページ移行は最終ゴール、 リリースには含めない

- 採用: 今リリースは検索 + 登録ナビ + News + LLM + 認証 + i18n のスコープ。ddbj.nig.ac.jp の他ページは段階移行
- 不採用: 全ページを 1 リリースで移行
- 理由: スコープが膨らみすぎる。コンテンツ機構 (`*.content.tsx` collection) は全ページ移行を見据えて設計し、 段階移行できる土台だけ最初から組む

### ローカル LLM (vLLM + Qwen 32B AWQ @ L40S) は継続、 外部 API へのスイッチを目的としない

- 採用: 自前 vLLM を運用継続、 BFF (`server/llm/`) で抽象化、 障害時は UI 側で hide
- 不採用: OpenAI / Anthropic / Cohere などの外部 API
- 理由: コスト 0 / データを外に出さない方針。BFF 抽象化はテスタビリティ目的であり、外部 API への切替は目的ではない (`llm.md`)

### 旧実装 (`v0.poc-final` tag) は参照素材、 コードを 1 行も持ち込まない

- 採用: `~/db-portal-prev-impl/` を local clone、 grep / Read で参照のみ
- 不採用: ファイル copy / 関数 copy / 型 copy / fixture 流用
- 理由: 参照と流用の境界は「キーボードで打ち直すかどうか」。ファイル ↔ クリップボードで運ばれた瞬間にアウト
