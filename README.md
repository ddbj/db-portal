# BSI

BioData Science Initiative (BSI) のデータ登録とデータ検索を、ひとつの入口に統合した Web アプリケーション。研究者が「どこに登録すればよいか」「目的のデータをどう探すか」で迷わないことを目的とし、横断検索から登録手順の案内までを 1 リポジトリで提供する。

主な機能:

- 検索 — 全 DB の横断検索と DB 指定検索、条件を細かく組み立てる Advanced builder、結果を絞り込む Sidebar facet
- AI 検索アシスタント — 自然文の問い合わせを検索条件へ変換する LLM 連携
- 登録ナビゲーション — データの種類から適切な登録先を導くテーブルと、登録の流れを示す動的な FlowStep カード
- ニュース / サービス一覧 — DDBJ・DBCLS の既存サイトから情報を取り込んで掲載
- DDBJ Account 連携 — Keycloak によるログイン (BFF + HttpOnly cookie)
- 日本語 / 英語の i18n — 言語切替に対応

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
docker compose exec app npm run gen:last-updated
```

詳細は `docs/development.md`。

## ドキュメント

**前提**

- [architecture.md](docs/architecture.md) — 全体構造 / zone 分割 / SSR-CSR 境界 / routing / 性能 / セキュリティ / sitemap.xml
- [development.md](docs/development.md) — dev 環境セットアップ / env 切替 / よく使うコマンド

**横断レイヤ**

- [frontend.md](docs/frontend.md) — UI primitives / 設計トークン / a11y
- [content.md](docs/content.md) — Markdown ページ / Service collection / Sidebar / breadcrumb
- [i18n.md](docs/i18n.md) — lang cookie / 翻訳なし fallback / hreflang
- [api-types.md](docs/api-types.md) — ddbj-search-api 連携 / 型生成運用
- [entity-list.md](docs/entity-list.md) — news / services mirror の共通 cache / facet / URL state / source 軸

**機能**

- [search.md](docs/search.md) — 検索の 2 モード / facet / Advanced builder / AI assistant
- [submit.md](docs/submit.md) — 登録ナビ / FlowStep / access 導出規約
- [news.md](docs/news.md) — ddbj/www mirror / NotificationBar 振り分け
- [services.md](docs/services.md) — services 一覧 mirror / featuredTop 掲載
- [auth.md](docs/auth.md) — BFF + HttpOnly cookie / OIDC PKCE / Keycloak
- [contact.md](docs/contact.md) — 問い合わせ窓口の振り分け / mailto 規約
- [llm.md](docs/llm.md) — vLLM BFF / SSE / PII redaction

**運用 + 品質**

- [deployment.md](docs/deployment.md) — 環境構成 / 起動アーキ / log event / 監視 / トラブルシュート軸 / secret rotation
- [tests/README.md](tests/README.md) — unit / PBT / e2e / mock のルール

## License

Copyright 2026 BioData Science Initiative (BSI).

Licensed under the Apache License, Version 2.0 (the "License"); you may not use the files in this repository except in compliance with the License. You may obtain a copy of the License at <http://www.apache.org/licenses/LICENSE-2.0>, or from the [`LICENSE`](LICENSE) file distributed with this repository.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
