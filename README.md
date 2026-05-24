# db-portal

DDBJ の登録・検索サービスへの統合ポータル。

## クイックスタート

開発はすべて Docker Compose 内で実行する。ホストに Node を入れる必要はない。

```bash
cp env.dev .env
docker compose up -d --build
docker compose exec app npm install
docker compose exec app npm run gen:api-types
```

`http://localhost:3000` で dev サーバが応答する。

## ドキュメント

- `docs/architecture.md` — 全体構造、ディレクトリ、import 境界、SSR / CSR、BFF
- `docs/development.md` — Docker Compose 起動、env 切替、よく使うコマンド
- `docs/api-types.md` — ddbj-search-api との型連携、`gen:api-types` 運用
- `docs/i18n.md` — URL prefix 戦略、リソース運用、翻訳なし fallback
- `docs/auth.md` — DDBJ Account 連携 (BFF + HttpOnly cookie)
- `docs/content-system.md` — `*.content.ts` コンテンツ collection と breadcrumb 自動生成

## ライセンス

Apache-2.0 (`LICENSE`)。
