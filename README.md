# db-portal

DDBJ の登録・検索サービスへの統合ポータル。検索 (横断 / DB 指定 + Advanced builder + Sidebar facet)、登録ナビゲーション (テーブル + 動的 FlowStep カード)、ニュース、DDBJ Account (Keycloak) 連携、AI 検索アシスタント (LLM)、日本語 / 英語の i18n を 1 リポジトリで提供する。コンテンツは `*.content.tsx` collection (TSX fragment + Zod 検証) で扱う。

## 技術スタック

| 層 | 採用 |
|---|---|
| フロント | Vite + React Router v7 (framework mode, config-based routing) + TypeScript (strict) + Tailwind CSS v4 |
| データフェッチ | TanStack Query |
| バリデーション | Zod |
| 型自動生成 | `openapi-typescript` (ddbj-search-api `openapi.json`) |
| 認証 | DDBJ Account (Keycloak) BFF + HttpOnly cookie |
| LLM | 自前 vLLM (OpenAI 互換 API) を BFF 経由で利用 (model は `DB_PORTAL_LLM_MODEL`、詳細は `docs/llm.md`) |
| サーバ | Express + `@react-router/express` (SSR) |
| テスト | Vitest + fast-check (PBT) + Playwright (E2E) |
| Lint | ESLint (`@stylistic` + `eslint-plugin-import` の `no-restricted-paths`) |
| 開発 | Docker Compose |
| 本番 | podman + podman-compose (NIG インフラ) |

## クイックスタート (dev)

開発はすべて Docker Compose 内で実行する。ホストに Node を入れる必要はない。

```bash
cp env.dev .env
docker compose up -d --build
docker compose exec app npm install
docker compose exec app npm run gen:api-types
```

`http://localhost:3000` で dev サーバが応答する。

よく使うコマンド:

```bash
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
docker compose exec app npm run build
docker compose exec app npm run validate:content
docker compose exec app npm run check:last-updated
```

詳細は `docs/development.md`。

## ドキュメント

**まず読む**

- [architecture.md](docs/architecture.md) — 全体構造 / zones / URL とルーティング / SSR / BFF / 非機能要件 (CSP / sitemap / 404)
- [development.md](docs/development.md) — dev 環境セットアップ / env 切替 / よく使うコマンド

**機能基盤**

- [frontend.md](docs/frontend.md) — UI primitives / Shell / Top route / Content system
- [i18n.md](docs/i18n.md) — lang cookie 戦略 / リソース運用 / 翻訳なし fallback
- [api-types.md](docs/api-types.md) — ddbj-search-api 連携 / `gen:api-types` 運用
- [tests/README.md](tests/README.md) — unit / PBT / e2e / mock のルール

**機能**

- [search.md](docs/search.md) — 検索 UI / Advanced builder / Sidebar facet / AI アシスタント
- [search-fields.md](docs/search-fields.md) — 検索フィールド一覧
- [submit.md](docs/submit.md) — 登録ナビゲーション / controlled vocab / FlowStep
- [news.md](docs/news.md) — ddbj/www mirror + cache + NotificationBar 振り分け
- [services.md](docs/services.md) — services 一覧 mirror (news clone 再利用) + cache + /services / top 掲載
- [auth.md](docs/auth.md) — BFF + HttpOnly cookie / OIDC PKCE / session store / Keycloak 設定
- [llm.md](docs/llm.md) — vLLM BFF / SSE / health 判定 / rate limit

**運用**

- [deployment.md](docs/deployment.md) — 環境構成 / 起動アーキ / log event / 監視 / トラブルシュート軸 / secret rotation

## 参考

- 既存サイト: https://ddbj.nig.ac.jp
- 検索 UI 参考: https://www.ncbi.nlm.nih.gov/ (NCBI Entrez)
- デザイン参考: https://bsi.rois.ac.jp (BSI)
- 登録関連コンテンツの元ネタ: [ddbj/www](https://github.com/ddbj/www) (Jekyll サイト)

## ライセンス

Apache-2.0 (`LICENSE`)。
