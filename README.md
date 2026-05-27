# db-portal

DDBJ の登録・検索サービスへの統合ポータル。検索 (横断 / DB 指定 + Advanced builder + Sidebar facet)、登録ナビゲーション (テーブル + 動的 FlowStep カード)、ニュース、DDBJ Account (Keycloak) 連携、AI 検索アシスタント (LLM)、日本語 / 英語の i18n を 1 リポジトリで提供する。

## 技術スタック

| 層 | 採用 |
|---|---|
| フロント | Vite + React Router v7 (framework mode, config-based routing) + TypeScript (strict) + Tailwind CSS v4 |
| データフェッチ | TanStack Query |
| バリデーション | Zod |
| 型自動生成 | `openapi-typescript` (ddbj-search-api `openapi.json`) |
| 認証 | DDBJ Account (Keycloak) BFF + HttpOnly cookie |
| LLM | 自前 vLLM (Qwen 32B AWQ @ L40S) を BFF 経由で利用 |
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

- [architecture.md](docs/architecture.md) — 全体構造 / zones / SSR / BFF / 非機能要件 (CSP / sitemap / 404)
- [development.md](docs/development.md) — dev 環境セットアップ / env 切替 / よく使うコマンド
- [decisions.md](docs/decisions.md) — 主要な設計判断 (ADR、採用 / 不採用の理由)

**アプリ基盤 (横断的な仕組み)**

- [routes.md](docs/routes.md) — 全 URL 一覧 / route handle / resource route
- [i18n.md](docs/i18n.md) — lang cookie 戦略 / リソース運用 / 翻訳なし fallback
- [content-system.md](docs/content-system.md) — `*.content.tsx` collection / loader / breadcrumb 自動生成
- [api-types.md](docs/api-types.md) — ddbj-search-api 連携 / `gen:api-types` 運用
- [ui-primitives.md](docs/ui-primitives.md) — `app/ui/` の primitive 設計原則
- [testing.md](docs/testing.md) — unit / PBT / e2e / mock のルール

**機能ごとの仕様**

- [shell.md](docs/shell.md) — Header / Footer / NotificationBar / NewsAside / Breadcrumb
- [top.md](docs/top.md) — トップページの hero + service grid + news aside
- [search.md](docs/search.md) — 検索 UI / Advanced builder / Sidebar facet / AI アシスタント
- [submit.md](docs/submit.md) — 登録ナビゲーション / controlled vocab / FlowStep
- [news.md](docs/news.md) — ddbj/www mirror + cache + NotificationBar 振り分け
- [auth.md](docs/auth.md) — BFF + HttpOnly cookie / OIDC PKCE / session store
- [llm.md](docs/llm.md) — vLLM BFF / SSE / health 判定 / rate limit

**運用**

- [deployment.md](docs/deployment.md) — staging / production deploy / podman + NIG / rollback
- [keycloak-setup.md](docs/keycloak-setup.md) — Keycloak 管理画面側の realm / client / redirect URI 設定
- [operations.md](docs/operations.md) — 監視 / log / トラブルシューティング / secret rotation

## 参考

- 既存サイト: https://ddbj.nig.ac.jp
- 検索 UI 参考: https://www.ncbi.nlm.nih.gov/ (NCBI Entrez)
- デザイン参考: https://bsi.rois.ac.jp (BSI)
- 登録関連コンテンツの元ネタ: [ddbj/www](https://github.com/ddbj/www) (Jekyll サイト)

## ライセンス

Apache-2.0 (`LICENSE`)。
