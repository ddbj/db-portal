# API Types

ddbj-search-api との型連携を 1 元化し、portal 側で AST / DSL の二重実装を持たないための運用ルール。`architecture.md` のデータフロー全体像も合わせて参照する。

## 方針

- `app/lib/api/openapi-types.ts` は **ddbj-search-api の `openapi.json` から `openapi-typescript` で自動生成** する
- 生成物は git commit する (CI で diff check を回すため)
- portal 側に手書きの DSL/AST 型を持たない。検索式の構造表現は API レスポンス型 (`ParseNode` alias) に乗せる
- AST → DSL のシリアライズはサーバへ委譲する (`POST /db-portal/serialize`)。portal 側に thin serializer を持たない

これにより grammar の二重保守 (portal 側と API 側) を完全に排除する。

## 生成スクリプト

`package.json` の `scripts.gen:api-types` が `dotenv-cli` で `.env` を読み、`openapi-typescript $DB_PORTAL_OPENAPI_URL -o app/lib/api/openapi-types.ts` を実行する。`$DB_PORTAL_OPENAPI_URL` は `env.{dev,staging,production}` で切り替える。

### 生成物の場所

| パス | 内容 |
|---|---|
| `app/lib/api/openapi-types.ts` | `openapi-typescript` 生成。約 11k 行。git commit 対象 |
| `app/lib/api/client.ts` | `apiGet` / `apiPost` の operation 型補完付き fetch wrapper |
| `app/lib/api/errors.ts` | `APIError` クラスと RFC 7807 Problem Details 正規化 |
| `app/lib/api/search.ts` | `crossSearch` / `dbSearch` / `parseQuery` / `serializeAst` の wrapper |
| `app/lib/api/news.ts` | BFF `/api/news` の wrapper。Zod schema (`NewsItem` / `NewsList` / `NewsSource` / `NewsCategory` / `NewsCache`) は `app/schemas/api-bff/news.ts` に置き、ここで re-export |
| `app/lib/api/llm.ts` | BFF `/api/llm/health` の wrapper + `isLlmAvailable`。`LlmHealth` Zod schema は `app/schemas/api-bff/llm.ts` に置き、ここで re-export |
| `app/lib/api/search-types.ts` | `ParseNode` alias (`-Input` / `-Output` ハイフン名を隠す) |
| `app/lib/api/index.ts` | 上記の re-export |

`app/lib/api/` 配下は `lib` zone に属するため、`features` / `shell` / `routes` から import 可能だが、`schemas` / `ui` / `content` からは import できない (`architecture.md`)。

### 実行タイミング

| 状況 | 実行者 | 何が起きるか |
|---|---|---|
| Developer が手元で API 仕様変更を反映 | `npm run gen:api-types` を手動実行 | `openapi-types.ts` が更新され、`tsc` で型エラーが顕在化 |
| Production リリース直前 | production env で `npm run gen:api-types` を再実行し diff 確認 | staging と production の API spec 差を検知 |

開発者の手元では基本 dev / staging env で生成する。production リリース直前にだけ production env でも生成して diff がないことを確認する (`deployment.md`)。

## ParseNode alias の役割

ddbj-search-api の検索 AST は Pydantic v2 の recursive Annotated discriminator union で表現されており、`openapi-typescript` の生成型は **Input 用と Output 用の 2 種類** に分かれる:

- `DbPortalParseBoolOp-Input`: Request body 用 (`POST /db-portal/serialize`)
- `DbPortalParseBoolOp-Output`: Response body 用 (`GET /db-portal/parse`)

UI 層がこのハイフン名を意識しなくて済むよう、`app/lib/api/search-types.ts` で次の 2 つの alias を提供する:

- `ParseNode` — UI 層から見える AST (Response 系を SSOT とする)。`DbPortalParseBoolOp-Output` と各 Leaf を union 化
- `ParseNodeInput` — `POST /db-portal/serialize` に渡す Request 用

UI コードでは `ParseNode` だけを import する。serialize 呼び出し層で `ParseNodeInput` に変換する境界を 1 箇所に絞る。

### narrowing の効き方

`ParseNode` は discriminator (`op` フィールド) を持つので、`switch (n.op)` で各 leaf / BoolOp に narrow される (`free_text` / `eq` / `contains` / `wildcard` / `between` / `AND` / `OR` / `NOT` の 8 分岐)。Pydantic v2 の `Field(alias="from")` を持つ field も `n.from` でアクセスできる (TypeScript 側に reserved word の制約はない)。

### alias を経由する利点

- ハイフン入りの型名 (`DbPortalParseBoolOp-Output`) を UI 層に露出させない
- Input/Output の切り替えを 1 箇所で管理する
- API 側で alias 名が変わった場合 (`-Input` / `-Output` の suffix が消えたなど)、影響範囲が `search-types.ts` だけになる

## 環境変数による URL 切替

| 変数 | 用途 |
|---|---|
| `DB_PORTAL_OPENAPI_URL` | `openapi-typescript` の生成元 (`openapi.json` の URL) |
| `DB_PORTAL_SEARCH_API_URL` | runtime の検索 API base URL |

dev / staging は同じ openapi 配置 (staging API) を共有する。Production リリース直前にだけ production URL で `gen:api-types` を回し、staging との型差分を確認する。env の全体方針は `development.md` を参照。

## operation 型補完の運用

### fetch wrapper

`app/lib/api/client.ts` の `apiGet` / `apiPost` は `paths` 型から operation の query / requestBody / response を推論する型付き fetch wrapper。base URL は呼び出し側が `options.baseUrl` で渡す (env 値は loader 経由で root から伝搬する形にし、client.ts が直接 env を参照しない)。

`/db-portal/serialize` だけが POST。`/db-portal/cross-search` / `/db-portal/search` / `/db-portal/parse` は GET で、query parameter (`q` / `topHits` / `db` / `page` / `perPage` / `cursor` / `sort` / `fields` / `includeProperties` 等、operation ごとに有効な subset) を `options.query` で渡す。

呼び出し側は通常 `app/lib/api/search.ts` の thin wrapper を経由する (`crossSearch` / `dbSearch` / `parseQuery` / `serializeAst`)。`apiGet` / `apiPost` を直接呼んでも型補完は効くが、path string の typo を防ぐため通常は wrapper を経由する。

### query 文字列の組み立て

`encodeQuery(query?)` が `Record<string, unknown>` を `?key=value&key=value` 形に変換する (`undefined` / `null` を skip、配列は repeated key)。`apiGet` / `apiPost` の内部で使い、直接呼ぶ機会は少ないが、URL を組み立てて external link を作る場合などに利用可能。

### errors と APIError

`app/lib/api/errors.ts` が HTTP エラーレスポンスを `APIError` クラスに正規化する。`apiGet` / `apiPost` の内部で `response.ok` が false なら `toAPIError(response)` を throw する。

| プロパティ | 内容 |
|---|---|
| `status` | HTTP status code |
| `type` | RFC 7807 type URI (`Content-Type: application/problem+json` の `type`、 default `"about:blank"`) |
| `title` | 短いエラータイトル (Problem の `title` または `response.statusText`) |
| `detail` | Problem の `detail` (任意) |
| `instance` | Problem の `instance` (任意) |

`isAPIError(value)` の type guard で `instanceof APIError` を扱う。TanStack Query の `queries.retry` は `shouldRetry` を使って `APIError` の status が 5xx のときだけ最大 2 回 retry。`mutations.retry` は `0` (debounced serialize は 1 度で fail し、SyncStatusChip の再試行 button から手動 retry する想定)。

### openapi-fetch 等の外部ライブラリ採用判断

複雑な operation (path parameter / multipart 等) が増えた場合、`openapi-fetch` のような外部 wrapper への乗り換えを検討する余地はある。判断は実装中に operation 数と複雑度を見て行う。

## 差分検知の運用

API 仕様変更を取りこぼさないため、開発者は次の手順を踏む:

```bash
docker compose exec app npm run gen:api-types
git diff app/lib/api/openapi-types.ts
```

差分があれば、関連 type を消費しているコード (`app/lib/api/` / `app/features/search/` 等) を更新してから commit する。production リリース直前には `deployment.md` の手順で production URL での差分も確認する。

## 静的検証のスコープ

`openapi-types.ts` が生成されたら次のチェックが動く:

| チェック | 何を保証するか |
|---|---|
| `tsc --noEmit --strict` | 生成型と portal コードの整合 |
| `npm run lint` | `lib` zone 制約 (他 zone を import していないか) |
| Unit test (`tests/unit/lib/api/`) | API client wrapper の挙動 (`encode-query` / `APIError` 等) |
| PBT (`tests/pbt/features/search/`) | AST round-trip / URL serialize 不変量 (`ast-roundtrip` / `url-symmetry` / `merge-laws` / `advanced-reducer`) |

round-trip の PBT は msw で `/db-portal/serialize` と `/db-portal/parse` をモックして AST 生成器を回す。実 API での round-trip 検証は E2E (`tests/e2e/`) に分離する。

## ddbj-search-api 側の前提

portal は次の前提のもとで動く。これらは ddbj-search-api リポジトリ側の責任。

- `openapi.json` が `--strict` な `openapi-typescript` 生成を通る (recursive union / alias / multi-content-type を扱えること)
- `POST /db-portal/serialize` が AST (Input) を受け、DSL 文字列を返す
- `GET /db-portal/parse?q=...` が DSL を受け、AST (Output) を返す
- `GET /db-portal/cross-search?q=...&topHits=...` が cross-DB のヒット数と top hits を返す
- `GET /db-portal/search?q=...&db=...&page=...&perPage=...&cursor=...&sort=...` が DB 指定の hits + pagination を返す
- discriminator (`op`) が必ず Leaf / BoolOp の判別に使える

API 側の追加・変更は schema レベルで PR が起き、portal 側は `npm run gen:api-types` で型を更新する。開発者が手動で diff を確認してから commit する。
