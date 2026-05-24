# API Types

ddbj-search-api との型連携を 1 元化し、portal 側で AST / DSL の二重実装を持たないための運用ルール。`architecture.md §7.1` のデータフロー全体像も合わせて参照する。

## 1. 方針

- `app/lib/api/openapi-types.ts` は **ddbj-search-api の `openapi.json` から `openapi-typescript` で自動生成** する
- 生成物は git commit する (CI で diff check を回すため)
- portal 側に手書きの DSL/AST 型を持たない。検索式の構造表現は API レスポンス型 (`ParseNode` alias) に乗せる
- AST → DSL のシリアライズはサーバへ委譲する (`POST /db-portal/serialize`)。portal 側に thin serializer を持たない

これにより grammar の二重保守 (portal 側と API 側) を完全に排除する。

## 2. 生成スクリプト

### 2.1 package.json scripts

```jsonc
{
  "scripts": {
    "gen:api-types": "dotenv -- openapi-typescript $DB_PORTAL_OPENAPI_URL -o app/lib/api/openapi-types.ts"
  }
}
```

`dotenv-cli` を devDep に追加してシェル非依存で `.env` を読む。`$DB_PORTAL_OPENAPI_URL` は `env.{dev,staging,production}` で切り替える (§4)。

### 2.2 生成物の場所

| パス | 内容 |
|---|---|
| `app/lib/api/openapi-types.ts` | `openapi-typescript` 生成。約 11k 行。git commit 対象 |
| `app/lib/api/client.ts` | `apiGet` / `apiPost` の operation 型補完付き fetch wrapper |
| `app/lib/api/errors.ts` | `APIError` クラスと RFC 7807 Problem Details 正規化 (§6) |
| `app/lib/api/search.ts` | `crossSearch` / `dbSearch` / `parseQuery` / `serializeAst` の wrapper |
| `app/lib/api/news.ts` | BFF `/api/news` の wrapper + `NewsItem` Zod schema |
| `app/lib/api/llm.ts` | BFF `/api/llm/health` の wrapper + `LlmHealth` Zod schema + `isLlmAvailable` |
| `app/lib/api/search-types.ts` | `ParseNode` alias (`-Input` / `-Output` ハイフン名を隠す。§3) |
| `app/lib/api/index.ts` | 上記の re-export |

`app/lib/api/` 配下は `lib` zone に属するため、`features` / `shell` / `routes` から `import` 可能だが、`schemas` / `ui` / `content` からは `import` できない (`architecture.md §3.1` 参照)。

### 2.3 実行タイミング

| 状況 | 実行者 | 何が起きるか |
|---|---|---|
| Developer が手元で API 仕様変更を反映 | `npm run gen:api-types` を手動実行 | `openapi-types.ts` が更新され、`tsc` で型エラーが顕在化 |
| CI (PR / push) | `npm run gen:api-types && git diff --exit-code` | API spec と生成物が乖離していたら CI fail |
| Production リリース直前 | production env で再実行し diff 確認 | staging と production の API spec 差を検知 |
| Nightly | production の openapi.json を fetch して diff 検知 | 差分があれば issue を自動起票 (CI/CD は別途) |

開発者の手元では基本 staging URL で生成する。production リリース直前にだけ production URL でも生成して diff がないことを確認する。

## 3. ParseNode alias

ddbj-search-api の検索 AST は Pydantic v2 の recursive Annotated discriminator union で表現されている。これを `openapi-typescript` で生成すると、`DbPortalParseBoolOp` が **Input 用と Output 用の 2 種類** に分かれる:

- `components["schemas"]["DbPortalParseBoolOp-Input"]`: Request body 用 (`POST /db-portal/serialize`)
- `components["schemas"]["DbPortalParseBoolOp-Output"]`: Response body 用 (`POST /db-portal/parse`)

UI 層がこのハイフン名を意識しなくて済むよう、`app/lib/api/search-types.ts` に薄い alias を 1 つ用意する。

### 3.1 alias 定義

```ts
// app/lib/api/search-types.ts
import type { components } from "./openapi-types"

type Leaves =
  | components["schemas"]["DbPortalParseLeafValue"]
  | components["schemas"]["DbPortalParseLeafRange"]
  | components["schemas"]["DbPortalParseFreeText"]

/** UI 層から見える AST (Response 系を SSOT とする) */
export type ParseNode =
  | components["schemas"]["DbPortalParseBoolOp-Output"]
  | Leaves

/** Request body 用 (POST /db-portal/serialize へ渡す形) */
export type ParseNodeInput =
  | components["schemas"]["DbPortalParseBoolOp-Input"]
  | Leaves
```

UI コードでは `ParseNode` だけを import する。serialize を呼ぶ層で `ParseNodeInput` に変換する境界を 1 箇所に絞る。

### 3.2 narrowing の効き方

discriminator (`op` フィールド) を使った `switch` で 8 分岐が型として narrow される:

```ts
function renderNode(n: ParseNode): ReactNode {
  switch (n.op) {
    case "free_text": return <FreeText value={n.value} />
    case "eq":        return <Eq field={n.field} value={n.value} />
    case "contains":  return <Contains field={n.field} value={n.value} />
    case "wildcard":  return <Wildcard field={n.field} value={n.value} />
    case "between":   return <Between field={n.field} from={n.from} to={n.to} />
    case "AND":       return <BoolGroup op="AND" children={n.children} />
    case "OR":        return <BoolGroup op="OR" children={n.children} />
    case "NOT":       return <BoolGroup op="NOT" children={n.children} />
  }
}
```

Pydantic v2 の `Field(alias="from")` を持つ field も `n.from` でアクセスできる (TypeScript 側に Reserved word の制約はない)。

### 3.3 alias を経由する利点

- ハイフン入りの型名 (`DbPortalParseBoolOp-Output`) を UI 層に露出させない
- Input/Output の切り替えを 1 箇所で管理する
- API 側で alias 名が変わった場合 (`-Input` / `-Output` の suffix が消えたなど)、影響範囲が `search-types.ts` だけになる

## 4. 環境変数による URL 切替

### 4.1 env.dev / env.staging

```bash
DB_PORTAL_OPENAPI_URL=https://ddbj-staging.nig.ac.jp/search/api/openapi.json
DB_PORTAL_SEARCH_API_URL=https://ddbj-staging.nig.ac.jp/search/api
```

### 4.2 env.production

```bash
DB_PORTAL_OPENAPI_URL=https://ddbj.nig.ac.jp/search/api/openapi.json
DB_PORTAL_SEARCH_API_URL=https://ddbj.nig.ac.jp/search/api
```

開発と staging は同じ URL を共有する。Production リリース直前にだけ production URL で `gen:api-types` を回し、staging との型差分を確認する。

env の全体方針は `development.md` を参照。

## 5. operation 型補完の運用

### 5.1 fetch wrapper

`app/lib/api/client.ts` の `apiGet` / `apiPost` は `paths` 型から operation の query / requestBody / response を推論する。base URL は呼び出し側が `options.baseUrl` で渡す (env 値は loader 経由で root から伝搬する形にし、 client.ts が直接 env を参照しない)。

```ts
// app/lib/api/client.ts (抜粋)
export const apiGet = async <P extends keyof paths & string>(
  path: P,
  options: ApiRequestOptions & { query?: <推論> },
): Promise<<推論 ResponseBody>> => { /* fetch + APIError throw */ }

export const apiPost = async <P extends keyof paths & string>(
  path: P,
  body: <推論 RequestBody>,
  options: ApiRequestOptions & { query?: <推論> },
): Promise<<推論 ResponseBody>> => { /* fetch + APIError throw */ }
```

`/db-portal/serialize` だけが POST。`/db-portal/cross-search` / `/db-portal/search` / `/db-portal/parse` は GET で、 query parameter (q / topHits / db / page / perPage / cursor / sort / keywordOperator) を `options.query` で渡す。

呼び出し側は `app/lib/api/search.ts` の thin wrapper を使う:

```ts
import { crossSearch, dbSearch, parseQuery, serializeAst } from "~/lib/api/search"

const crossResult = await crossSearch({ q: "cancer", topHits: 5 }, { baseUrl })
const dbResult = await dbSearch({ db: "sra", page: 1, perPage: 20 }, { baseUrl })
const parsed = await parseQuery({ q: "cancer AND organism:Homo sapiens" }, { baseUrl })
const serialized = await serializeAst({ ast: parsed.ast }, { baseUrl })
```

`apiGet` / `apiPost` を直接呼んでも型補完は効くが、 path string の typo を防ぐため通常は `search.ts` の wrapper を経由する。

### 5.2 query 文字列の組み立て

`encodeQuery(query?)` が `Record<string, unknown>` を `?key=value&key=value` 形に変換する (`undefined` / `null` を skip、 配列は repeated key)。`apiGet` / `apiPost` の内部で使い、 直接呼ぶ機会は少ないが、 URL を組み立てて external link を作る場合などに利用可能。

### 5.3 errors と APIError

`app/lib/api/errors.ts` が HTTP エラーレスポンスを `APIError` クラスに正規化する。`apiGet` / `apiPost` の内部で `response.ok` が false なら `toAPIError(response)` を `throw` する。

```ts
export class APIError extends Error {
  readonly status: number
  readonly type: string      // RFC 7807 type URI, default "about:blank"
  readonly title: string
  readonly detail?: string
  readonly instance?: string
}
```

`Content-Type: application/problem+json` のレスポンスは body の `type` / `title` / `status` / `detail` / `instance` を抽出する。それ以外 (text / 空 body) は `response.statusText` を title に、 status code を status に格納。`isAPIError(value)` の type guard で `instanceof APIError` を扱う。

TanStack Query 側では `APIError` の status を見て 5xx だけ retry (`app/lib/query/client.ts` の `shouldRetry`)。

### 5.4 openapi-fetch 等の外部ライブラリ採用判断

複雑な operation (path parameter / multipart 等) が増えた場合、`openapi-fetch` のような外部 wrapper への乗り換えを検討する余地はある。判断は実装中に operation 数と複雑度を見て行う。

## 6. CI での差分検知

### 6.1 PR / push 時

```yaml
- run: npm run gen:api-types
- run: git diff --exit-code app/lib/api/openapi-types.ts
```

API 仕様が変わったのに生成物を更新せず PR を出した場合に CI で fail する。

### 6.2 Nightly

production の `openapi.json` を fetch して、staging 由来の `openapi-types.ts` と diff を取る。差があれば issue を自動起票する。

実装の詳細 (workflow ファイル) は CI/CD 設計の別 SSOT に従う。

## 7. 静的検証のスコープ

`openapi-types.ts` が生成されたら次のチェックが動く:

| チェック | 何を保証するか |
|---|---|
| `tsc --noEmit --strict` | 生成型と portal コードの整合 |
| `npm run lint` | `lib` zone 制約 (他 zone を import していないか) |
| Unit test (`tests/unit/lib/api/`) | `ParseNode` の discriminator narrowing が期待通り |
| PBT (`tests/pbt/search/`) | AST round-trip 不変量 (`/db-portal/serialize` ↔ `/db-portal/parse` で構造が保存される) |

PBT の round-trip は staging API への E2E ではなく、msw で `/db-portal/serialize` と `/db-portal/parse` をモックして PBT で AST 生成器を回すこともできる。実 API での round-trip 検証は E2E (`tests/e2e/`) に分離する。

## 8. ddbj-search-api 側の前提

portal は次の前提のもとで動く。これらは ddbj-search-api リポジトリ側の責任。

- `openapi.json` が `--strict` な `openapi-typescript` 生成を通る (recursive union / alias / multi-content-type を扱えること)
- `POST /db-portal/serialize` が AST (Input) を受け、DSL 文字列を返す
- `GET /db-portal/parse?q=...` が DSL を受け、AST (Output) を返す
- `GET /db-portal/cross-search?q=...&topHits=...` が cross-DB のヒット数と top hits を返す
- `GET /db-portal/search?q=...&db=...&page=...&perPage=...&cursor=...&sort=...` が DB 指定の hits + pagination を返す
- discriminator (`op`) が必ず Leaf / BoolOp の判別に使える

API 側の追加・変更は schema レベルで PR が起き、portal 側は `npm run gen:api-types` で型が更新される。CI の diff check で更新漏れを検知する。

## 9. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §3.1` | `lib` zone の位置付け、`server` 共用境界 |
| `architecture.md §7.1` | 検索のデータフロー全体像 |
| `development.md` | `npm run gen:api-types` の実行方法、env 切替 |
