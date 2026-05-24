# Architecture

DDBJ ポータルの全体構造を定義する。本書は `docs/` 配下の最上位 SSOT であり、各論 (`api-types.md` / `i18n.md` / `auth.md` / `content-system.md` / `development.md`) はここから参照される。

## 1. プロジェクトの位置付け

DDBJ の登録・検索サービスへの統合ポータル。次の機能領域を 1 リポジトリで提供する。

| 機能 | URL | 概要 |
|---|---|---|
| トップ | `/` | 検索ボックスを実質的なヒーローとし、DDBJ 全体動線と最新ニュースへ案内する |
| 検索 | `/search` `/search/results` | cross-DB 検索と DB 指定検索を Advanced builder と Sidebar facet で構成 |
| 登録ナビゲーション | `/submit` | テーブル + per-cell tag + 動的 FlowStep カードによる登録経路ナビ |
| ニュース | `/news` | ddbj/www の `_news/` を mirror し、カテゴリ facet で閲覧 |
| データベース解説 | `/databases/:slug` | コンテンツ collection から各 DB の説明を生成 |
| 認証 | `/auth/*` | DDBJ Account (Keycloak) との OIDC 連携、JS は token に触れない (§5) |
| 英語版 | `/en/...` | URL prefix によるロケール切替 (詳細 `i18n.md`) |

## 2. ディレクトリ構造

```
db-portal/
├── app/                         アプリケーションコード (browser + SSR)
│   ├── root.tsx                 HTML shell、i18n provider、QueryClient provider
│   ├── routes.ts                config-based routing の宣言 (URL 全構造の SSOT)
│   ├── routes/                  route component の置き場 (file 名 ≠ URL)
│   ├── features/                画面横断ロジック (search / submit / news / auth)
│   ├── shell/                   Header / Footer / NotificationBar / NewsAside / Breadcrumb
│   ├── ui/                      Tailwind primitives (Button / Card / Tag / Callout / Modal …)
│   ├── lib/                     純粋ユーティリティ (api / i18n / auth client / content / query)
│   ├── content/                 *.content.tsx (型安全コンテンツ collection)
│   ├── schemas/                 Zod schemas (submit vocab / FlowStep / News / DatabaseContent …)
│   └── styles/                  Tailwind v4 entry + @theme block
├── server/                      BFF / Node 専用コード (browser に出さない)
│   ├── index.ts                 Node entry (RR v7 server adapter + API route 配線)
│   ├── lib/                     env 検証 / 構造化 log
│   ├── auth/                    session store / cookie / OIDC token 交換
│   ├── api/                     /api/* エンドポイント実装
│   ├── news/                    ddbj/www mirror + disk cache
│   └── llm/                     vLLM HTTP client
├── docs/                        本書を含む仕様 SSOT (概念 + 図 + schemas/ 参照)
├── tests/
│   ├── unit/                    Vitest + msw + createRoutesStub
│   ├── pbt/                     fast-check (純粋ロジックの不変量)
│   └── e2e/                     Playwright (staging に対して)
├── env.dev / env.staging / env.production
├── compose.yml / compose.podman.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── react-router.config.ts
└── eslint.config.ts
```

`app/` は browser 実行と SSR 実行の両方を担う。`server/` は Node 専用で browser bundle に乗らない。詳細は §4 と §6。

## 3. import 境界

### 3.1 zones 表

各ディレクトリの import 可否を定義する。`eslint-plugin-import` の `no-restricted-paths` で物理強制される。

| from \ to | features/X | features/Y | shell | ui | lib | schemas | content |
|---|---|---|---|---|---|---|---|
| features/X | ✓ | × | ✓ | ✓ | ✓ | ✓ | ✓ |
| shell | × | × | ✓ | ✓ | ✓ | ✓ | ✓ |
| ui | × | × | × | ✓ | × | × | × |
| lib | × | × | × | × | ✓ | ✓ | × |
| schemas | × | × | × | × | × | ✓ | × |
| content | × | × | × | ✓ | ✓ | ✓ | ✓ |
| routes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

`server/` と `app/` の間も次の通り分離する。

| from \ to | app/features | app/shell | app/ui | app/lib | app/schemas | app/content | app/routes |
|---|---|---|---|---|---|---|---|
| server | × | × | × | × | ✓ | × | × |
| app | × (`server/` 全般 import 不可) |

`app/schemas` だけが `app` と `server` の共用境界。Zod schema は型と runtime validation を兼ねるので、BFF 側のレスポンス整形と client 側の表示で同じ schema を共有する。

### 3.2 zones の意図

| zone | 役割 | 上位 zone への依存 |
|---|---|---|
| `schemas` | Zod による型 + runtime validation | 持たない (純粋型定義) |
| `lib` | 純粋ユーティリティ (HTTP wrapper / i18n runtime / content loader / query client) | `schemas` のみ (content loader が DatabaseContent を parse するなど、runtime validation を担う lib は schema に依存する) |
| `ui` | Tailwind primitive | 持たない (`@theme` token のみ参照) |
| `content` | `*.content.tsx` collection | `ui` のリッチコンポーネント (Callout / Section …) を JSX で使う |
| `shell` | Header / Footer / NavBar / Breadcrumb (画面横断 chrome) | `ui` / `lib` / `schemas` / `content` |
| `features` | 画面ごとの状態管理・reducer・modal などのロジック | `shell` / `ui` / `lib` / `schemas` / `content` |
| `routes` | RR v7 framework mode の route component (loader / action / 描画) | 全 zone (薄く配線するだけ) |
| `server` | BFF (Node 専用) | `app/schemas` のみ (共用境界) |

`features` 同士の直接 import は禁止する。features を跨ぐ共通ロジックは `lib` か `schemas` に降ろし、UI 共通は `ui` か `shell` に降ろす。これにより 1 feature の変更が他 feature へ波及しない。

### 3.3 デザイントークンの物理強制

ESLint が次の 2 系統で逸脱を検出する。

- 生 hex literal 禁止: `app/{features,routes,shell,content}/` 配下で `#[0-9A-Fa-f]{3,8}` を含む文字列リテラルを `no-restricted-syntax` で弾く。`app/ui/` のみ除外
- arbitrary Tailwind value 禁止: `app/{features,routes,content}/` 配下で `className` 内の `bg-[#...]` / `text-[14.5px]` / `p-[3px]` を弾く。`app/ui/` と `app/shell/` は除外 (chrome / primitive 設計上の細部値を許容)
- `app/routes/_design/` (開発時のみ生成される token / primitive 視覚確認 route) は `no-restricted-syntax` 全体から除外 (token 一覧表示のために hex 文字列を意図的に保持する)

色や spacing を直接書きたくなったら、まず `app/styles/tailwind.css` の `@theme` block にトークンとして追加する。utility class (`bg-brand` / `text-ink` / `p-section-md`) を経由して参照する。

## 4. SSR と CSR の境界

React Router v7 framework mode (`react-router.config.ts` で `{ ssr: true }`) を使う。

| フェーズ | 実行環境 | 触れていいもの |
|---|---|---|
| Server render | Node | `app/` 全部 + `server/` の `lib` / `auth` (cookie 経由で session 解決) |
| Client hydration | Browser | `app/` 全部 (browser API のみ)、`server/` 不可 |
| Loader / Action | Node (RR) | `app/` 全部 + `server/` の `lib` / `auth` (`fetch` で `/api/*` を叩くより、内部で直接 import するほうが overhead が少ない) |

ローダーで `fetch("/api/me")` を呼ぶか、`server/api/me.ts` の関数を直接 import するかは Node 上では後者でも動く。ただし、内部関数を直接呼ぶと server zones を超えて import することになる (`app → server` 禁止)。そのため次のルールで分離する。

- Server route handler 経由 (`POST /api/*`): client / server 両方から呼べる正規 API
- `server/` 内部関数: server adapter から組み立てる内部実装、`app/` からは触れない

Loader / Action は HTTP を経由する。Same-process でも `fetch(new URL("/api/...", url))` を使い、 zone 境界を物理的に守る。

## 5. BFF と client の責務分離

`server/` 配下が BFF (Backend for Frontend) として次の責務を持つ。client (`app/`) はこれらに依存して動く。

| BFF 責務 | エンドポイント | client が直接アクセスする外部に対する遮蔽点 |
|---|---|---|
| OIDC token 管理 | `/api/auth/*`、`/api/me` | Keycloak access token / refresh token は browser に出さない (`auth.md`) |
| Search API への AST→DSL serialize 中継 | `POST /api/search/serialize` | ddbj-search-api への HTTP を BFF 経由にし、debounce ロジックは client / 認可と timeout は BFF |
| LLM ストリーミング | `/api/llm/health`、`POST /api/llm/*` | vLLM の URL / API key を browser に出さない、SSE は BFF で pass-through |
| News mirror | `GET /api/news` | ddbj/www の commit を polling し、disk cache を経由して browser へ提供 |

外部 API (Search / vLLM / Keycloak / GitHub) に client が直接アクセスすることはない。これにより:

- secret (LLM API key / Keycloak client secret / GitHub PAT) が client bundle に embed されない
- ddbj-search-api / vLLM が CORS を緩める必要がない
- 障害時 fallback (LLM 未到達なら UI を hide する) を BFF の health 判定で集約できる

## 6. ビルド時と runtime の境界

### 6.1 ビルド時に確定するもの

- API 型 (`app/lib/api/openapi-types.ts`): `npm run gen:api-types` で staging openapi.json から生成。git commit 対象。詳細 `api-types.md`
- コンテンツ collection (`app/content/**/*.content.tsx`): `import.meta.glob` で列挙、Zod schema で eager validate。1 件でも parse 失敗すれば build が落ちる。詳細 `content-system.md`
- i18n リソース (`app/lib/i18n/resources/{ja,en}.ts`): 静的 import。`ja` と `en` でキーセットが乖離した場合は PBT (`tests/pbt/`) で検出。詳細 `i18n.md`
- Tailwind utility class: `@theme` block + JSX を Vite が走査して必要な class のみを出力

### 6.2 Runtime に決まるもの

- 環境変数 (`DB_PORTAL_*`): `server/lib/env.ts` の Zod schema で起動時に validate。違反すれば server を起動しない
- BFF session store: in-memory Map に sid → session entry。プロセス再起動で揮発
- News mirror cache: disk persist (`DB_PORTAL_NEWS_CACHE_DIR`)、起動時に再 load し即応答可能
- LLM health 状態: `/api/llm/health` の結果を server memory に保持

### 6.3 client bundle と server bundle の分離

| 変数 | 接頭辞 | アクセス方法 | 何に使えるか |
|---|---|---|---|
| Server | `DB_PORTAL_*` | `process.env.DB_PORTAL_*` (server-only) | secret 含めて全て可 |
| Client | `VITE_DB_PORTAL_*` | `import.meta.env.VITE_DB_PORTAL_*` | secret は絶対に含めない |

`compose.yml` で `VITE_DB_PORTAL_*` を `DB_PORTAL_*` から派生させ、`DB_PORTAL_LLM_API_KEY` や `DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` は `VITE_` 側に出さない。secret を browser に流出させない最後の防壁となる。

## 7. データフローの 4 経路

ポータル内で発生する主要な情報の流れ。

### 7.1 検索

```
[Browser]
  ├─ Advanced builder reducer (app/features/search/)
  └─ Sidebar facet → AST (app/features/search/)
        │
        ▼ debounce 500-1000 ms
  POST /api/search/serialize (server/api/search/serialize.ts)
        │
        ▼
  ddbj-search-api POST /db-portal/serialize
        │
        ▼
  DSL 文字列を URL の ?q= に反映
        │
        ▼
  検索結果取得 (TanStack Query + ddbj-search-api /db-portal/{cross-search,search})
```

AST 表現は `app/lib/api/search-types.ts` の `ParseNode` alias を SSOT とする。詳細 `api-types.md §3`。

### 7.2 登録ナビゲーション

```
[Browser]
  Submission state (FileEntry[] + FileGroup[])
        │
        ▼ schemas/submit/ の純粋関数群
  サービス step 関数 collection (BioSample / BioProject / DRA / JGA …)
        │
        ▼
  FlowStep[] (動的カード)
```

`app/schemas/submit/` が controlled vocabulary と Submission 型の SSOT。サービス step 関数の不変量は `tests/pbt/submit/` で固定する。

### 7.3 認証

```
[Browser] cookie (sid, HttpOnly, SameSite=Lax, Secure)
        │
        ▼
[Server] /api/me
        │
        ▼ in-memory session store
  { tokens, userInfo, expiresAt (sliding 30 min) }
        │
        ▼ 期限切れ前に background refresh
[Keycloak] /protocol/openid-connect/token
```

詳細 `auth.md`。

### 7.4 LLM

```
[Browser]
  useLlmAvailability() → BFF /api/llm/health の結果で UI を hide/show
        │
        ▼ available 時
  POST /api/llm/* (SSE)
        │
        ▼
[Server] vLLM へ pass-through (event: message / done / error)
```

vLLM 接続情報 (`DB_PORTAL_LLM_BASE_URL`) が空の dev 環境では `/api/llm/health` が `{status:"unset"}` を返し、UI 側で AI アシスタント機能を非表示にする。

## 8. テストの位置付け

| 種別 | 配置 | 役割 |
|---|---|---|
| Unit | `tests/unit/` | コンポーネント / 関数 / `createRoutesStub` での loader 統合。HTTP は msw |
| PBT | `tests/pbt/` | 純粋ロジックの不変量 (submit step / AST round-trip / URL serialize / i18n キー整合) |
| E2E | `tests/e2e/` | Playwright で staging URL に対して実行 |

Mock は外部境界 (HTTP / OIDC / FS / 時刻 / 乱数) のみ。内部関数 / コンポーネント / Zod schema は mock しない。詳細な方針は `tests/` 配下の README とテストごとの設計に従う。

## 9. デザインシステム

`app/styles/tailwind.css` の `@theme` block がデザイントークンの SSOT (色 / spacing / font / radius / shadow)。`app/ui/` の primitive はこの token を utility class 経由で参照する。

- token utility class: `bg-brand` / `text-ink` / `border-border-soft` / `p-section-md` / `rounded-card` …
- 生 hex literal / arbitrary value は ESLint で物理禁止 (§3.3)
- primitive 一覧 (Button / IconButton / NativeSelect / FormGroup / Tag / Chip / Callout / Modal / Pagination …) は `app/ui/` に集約、`features` / `shell` / `routes` / `content` は primitive を消費する
- 新 primitive が必要な場合、`features` 内で独自実装せず `app/ui/` に追加する (zones で物理強制)

詳細な token 値と primitive 仕様はコード (`app/styles/tailwind.css` と `app/ui/`) を一次情報とする。

## 10. 関連 docs

| ファイル | 内容 |
|---|---|
| `api-types.md` | ddbj-search-api との型連携、`ParseNode` alias、生成・diff 運用 |
| `i18n.md` | URL prefix 戦略、`useLang`、リソース運用、翻訳なし fallback |
| `auth.md` | BFF + HttpOnly cookie、session store、OIDC PKCE、`useAuth` / `RequireAuth` |
| `content-system.md` | `*.content.tsx` collection、loader、breadcrumb 自動生成、TSX fragment スコープ |
| `ui-primitives.md` | `app/ui/` 22 primitive の Props / variant / accessibility / token 参照規約 |
| `shell.md` | Header / Footer / NotificationBar / NewsAside / Breadcrumb / TranslationUnavailable / ShellLayout |
| `development.md` | Docker Compose 起動、env 切替、よく使うコマンド |
