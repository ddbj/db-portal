# db-portal

DDBJ の登録・検索サービスへの統合ポータル。検索 (横断 / DB 指定 + Advanced builder + Sidebar facet)、登録ナビゲーション (テーブル + 動的 FlowStep カード)、ニュース、DDBJ Account (Keycloak) 連携、AI 検索アシスタント (LLM)、日本語 / 英語の i18n を 1 リポジトリで提供する。

最終的に ddbj.nig.ac.jp 全ページの移行を見据えるが、リリース時点のスコープは上記 6 機能。他ページは既存サイトに残し、コンテンツ機構 (`*.content.tsx` collection) で段階移行できる土台を最初から組む。

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

- [architecture.md](docs/architecture.md) — 全体構造 / zones / URL とルーティング / SSR / BFF / 非機能要件 (CSP / sitemap / 404)
- [development.md](docs/development.md) — dev 環境セットアップ / env 切替 / よく使うコマンド
- [decisions.md](docs/decisions.md) — 主要な設計判断 (ADR、採用 / 不採用の理由)

**機能基盤**

- [frontend.md](docs/frontend.md) — UI primitives / Shell / Top route / Content system
- [i18n.md](docs/i18n.md) — lang cookie 戦略 / リソース運用 / 翻訳なし fallback
- [api-types.md](docs/api-types.md) — ddbj-search-api 連携 / `gen:api-types` 運用
- [tests/README.md](tests/README.md) — unit / PBT / e2e / mock のルール

**機能**

- [search.md](docs/search.md) — 検索 UI / Advanced builder / Sidebar facet / AI アシスタント
- [submit.md](docs/submit.md) — 登録ナビゲーション / controlled vocab / FlowStep
- [news.md](docs/news.md) — ddbj/www mirror + cache + NotificationBar 振り分け
- [auth.md](docs/auth.md) — BFF + HttpOnly cookie / OIDC PKCE / session store / Keycloak 設定
- [llm.md](docs/llm.md) — vLLM BFF / SSE / health 判定 / rate limit

**運用**

- [deployment.md](docs/deployment.md) — staging / production deploy / 監視 / トラブルシュート / secret rotation

## 参考

- 既存サイト: https://ddbj.nig.ac.jp
- 検索 UI 参考: https://www.ncbi.nlm.nih.gov/ (NCBI Entrez)
- デザイン参考: https://bsi.rois.ac.jp (BSI)
- 登録関連コンテンツの元ネタ: [ddbj/www](https://github.com/ddbj/www) (Jekyll サイト)

## ライセンス

Apache-2.0 (`LICENSE`)。
