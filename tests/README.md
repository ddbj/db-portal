# Testing

テスト設計の SSOT。Vitest + fast-check + Playwright の 3 種で「バグを見つけるために」 書く。

## 目的

テストは「通すために」 書かない。**バグを見つけるために** 書く。

正常系だけを薄くなぞるテストは価値が低い。境界値・エッジケース・異常系を重点的にテストする。「この入力で壊れないか」 を常に問い続ける。

## テスト種別

| 種別 | スコープ | 配置 | 実行頻度 |
|---|---|---|---|
| **unit** | 関数・コンポーネント単体。外部境界を mock | `tests/unit/` | 開発中、何度も気軽に |
| **pbt** | 純粋関数の不変量を fast-check で検証 | `tests/pbt/` | unit と同列、何度も |
| **e2e** | UI から外部サービスまで貫通。staging 環境で実物を叩く | `tests/e2e/` | リリース前、CI で |

unit + pbt は開発のフィードバックループ。e2e は staging リリース後の検証。最初は unit + pbt を主軸にして、機能ごとに e2e シナリオを追加する。

## unit テスト

開発中になんども気軽に回せるもの。

### ツール

- Vitest (test runner)
- @testing-library/react (component test)
- msw (HTTP モック、Service Worker レベルで Search API / GitHub API 等を介入)

### ルール

- 1 ファイル数十〜数百テスト、ミリ秒単位で完走する規模に保つ
- watch モードで保存ごとに即実行できる速度
- ファイル名 `*.test.ts(x)` で対象ファイルの隣に配置するか、`tests/unit/` 配下にミラー
- describe / it の入れ子は浅く

### 命名規則

```
test("<対象>_<条件>_<期待結果>",  => { ... })
```

例: `test("parseDateRange_invalidFormat_throws", ...)`、`test("FlowStepCard_openRow_rendersDraBadge", ...)`

名前を読むだけで何を検証しているか分かるようにする。

## PBT (Property-Based Testing)

入力空間を手で列挙する限界を超えるためのテスト。

### ツール

fast-check (`@fast-check/vitest` で Vitest 統合)

### 対象

- **submit サービス step 関数の不変量** (登録ナビ schema 駆動)
  - 例: 任意の Submission state について、open 行があれば DRA か JGA の Step が必ず生成される
  - 例: Umbrella BP は primary BP ≥ 2 のときのみ生成される
  - 例: organism = restricted な行が存在するなら JGA Step が必ず存在する
- **検索 AST/DSL の round-trip**
  - portal 側 UI state (Advanced reducer / Sidebar facet) → AST → API serialize → DSL → API parse → AST の往復で等価性
  - portal 内の AST merge (`mergeAstAnd`) の冪等性 / 結合律
- **URL serialize / deserialize の対称性**
  - 検索 URL `?q=` / `?db=` / `?page=` 等の往復で復元される
- **content collection の Zod schema validation**
  - 任意の Zod-conformant input が `parse(stringify(x)) == x`
- **controlled vocabulary の閉包性**
  - 任意の `ButtonType` から派生する `DataForm`、`GroupType` の default が schema 内に必ず存在する
- **i18n リソースキーの整合**
  - ja / en で同じキーセットを持つ (片方にだけあるキーが存在しない)

### 不変量の書き方

- 「例外を投げない」 は不変量ではない (意味のある制約を書く)
- PBT は example-based test の **代替ではなく補完**。両方書く
- `fc.sample` で生成されるサンプル例を `console.log` して、ドメインを意図通りカバーしているか確認する
- shrink で失敗例が縮小されることを利用してデバッグを楽にする
- 実行時間が許容範囲なら `numRuns` を増やす (デフォルト 100、PBT 用 1000+)

実例は `tests/pbt/` 配下を参照 (submit flow-rules / search AST round-trip / i18n resource parity 等)。

## e2e テスト

最初にシナリオを書いてから実装する。staging 環境にデプロイした後に実行する重いテスト。

### ツール

Playwright

### 環境

- 対象: staging deploy 済の db-portal (`portal-staging.ddbj.nig.ac.jp`)
- 外部依存も実物を叩く:
  - ddbj-search-api staging (`ddbj-staging.nig.ac.jp/search/api`)
  - Keycloak staging (`idp-staging.ddbj.nig.ac.jp`)
  - ddbj/www mirror (GitHub API)
  - vLLM (`l40s-03:3200`)
- **mock しない** (外部境界の本物挙動を確認するのが e2e の役目)
- 実行コストが重い (1 シナリオ数秒〜数分、フルスイートで数分〜数十分)

### シナリオ集が SSOT

`e2e/scenarios.md` をテスト実装の前に書く。

#### シナリオ ID 体系

- 正常系: `S-<DOMAIN>-NN` (例: `S-SEARCH-01`)
- 異常系: `E-<DOMAIN>-NN` (例: `E-SUBMIT-03`)
- DOMAIN: `SEARCH` / `SUBMIT` / `NEWS` / `AUTH` / `LLM` / `TOP` / `CONTENT` (機能横断は `FLOW`)

#### ペルソナ

| ID | 名前 | 認証 | Playwright project |
|---|---|---|---|
| P-ANON | 未認証ユーザー | なし | `anon` |
| P-USER | 一般ユーザー (Keycloak login) | DDBJ Account JWT | `user` |

`user` project は `setup` project (`auth.setup.ts`) が事前に Keycloak でログインして保存した storage state を読み込んで起動する。リリース時点では認証ボタンのみで専用機能なし (`docs/auth.md`)。`P-USER` シナリオはログイン動作確認に限定。

#### シナリオ要素

各シナリオには以下を必ず書く:

- **ペルソナ** (P-ANON / P-USER)
- **前提** (URL / 状態 / 必要データ)
- **手順** (ユーザー操作の番号付きリスト)
- **期待** (DOM 状態 / URL 変化 / 外部 API 呼び出し / アクセシビリティ)
- **備考** (省略可、エッジケースの説明)

例:

```markdown
#### S-SEARCH-03: 検索結果の横断ヒット数サマリ

- **ペルソナ**: P-ANON
- **前提**: dev サーバ起動済、ddbj-search-api staging に到達可能
- **手順**:
  1. `/` を開く
  2. 検索ボックスに `cancer` と入力し、検索ボタンをクリック
- **期待**:
  - URL が `/search/results?q=cancer` に変わる
  - 8 つの DB ヒット数カードが描画される
  - 各カードに `count` の数値とリンクが表示される
  - 0 件の DB はカード自体が描画されない or `0 件` で表示される (どちらかは仕様で確定する)
```

### 設計ノート

`e2e/notes.md` に設計上の制約・ハマりどころを書く。

書くべき内容:

- テスト間独立性 (どこまで session を共有するか、ログイン状態の取り扱い)
- cleanup の順序制約 (localStorage / cookie / session)
- 外部 API のレート制限への配慮
- トークンリフレッシュ戦略
- staging 環境の安定性に依存する部分の retry / wait

### 実行とデプロイの関係

- 開発中の機能追加 → unit + pbt で feedback
- PR 単位で staging に prerelease → e2e 全シナリオ実行
- main マージ → staging に再 deploy → e2e で本リリース確認
- production deploy → smoke test のみ (e2e は staging で完了済)

## Mock のルール

### mock していい (外部境界)

- ✓ HTTP (Search API / GitHub API / vLLM)
- ✓ 認証 (OIDC redirect / token validation)
- ✓ ファイルシステム
- ✓ 時刻 (`Date.now`, `setTimeout`)
- ✓ ランダム (`Math.random`, `crypto.getRandomValues`)

### mock しない

- ✗ 内部関数 / 内部モジュール / コンポーネント
- ✗ Zod schema / TypeScript 型
- ✗ Tailwind config / CSS
- ✗ React Router の loader / action 自体は mock しない。代わりに `createRoutesStub` で route + loader/action を組んだ状態で component を render し、loader 内の fetch は msw で外部境界 mock する

内部 mock が必要に見えるなら **設計が悪い**。テストではなく設計を直す。

#### RR loader/action の unit テスト方針

`createRoutesStub` で「route + loader/action を組んだ状態」 を再構築し、その上で component を render する。loader 内 fetch は msw で境界 mock する。

- loader は実コードを直接渡す (mock しない)
- 外部 HTTP は msw で境界 mock
- unit テストで「loader が動いた状態の component」 を verify できる
- e2e に出すまでもないシナリオはここで吸収

実例は `tests/unit/routes/` 配下を参照。

### msw の使い方

`unit/mocks/handlers.ts` に Search API のレスポンス handler を集約する。各 unit test で `server.use(...)` で個別 override。staging API の OpenAPI schema から型を借りるので、handler のレスポンスも型安全。

## テスト間の独立性

- テスト間で state を共有しない (localStorage / cookie / mock state を必ずクリーンアップ)
- 実行順序に依存しない
- `vitest --shuffle` / `playwright --shard` で全テスト通ること

順序依存テストを許すと壊れたテストが「たまたま通る」 状態になり、回帰を見逃す。

## 実行コマンド

```bash
# unit + pbt (開発中の主力)
docker compose exec app npm test                    # 全実行
docker compose exec app npm run test:unit           # unit のみ
docker compose exec app npm run test:pbt            # PBT のみ
docker compose exec app npm test -- --watch         # watch モード

# e2e (staging URL に対して)
docker compose exec app npm run test:e2e
```

## ディレクトリ構造

```
tests/
├── unit/                   ← Vitest unit tests (collect rule: tests/unit/**/*.test.{ts,tsx})
│   ├── _helpers/           ← render-with-providers 等の共通ヘルパー
│   ├── content/
│   ├── features/
│   ├── lib/
│   ├── mocks/              ← msw handlers + server
│   ├── routes/             ← route action / resource route のテスト (例: api.set-lang)
│   ├── schemas/
│   ├── server/             ← BFF 側 (api / auth / lib / llm / news)
│   │   └── news/_fixtures.ts ← 領域別 fixture (`_` prefix)
│   ├── setup.ts            ← Vitest setup (jsdom / msw 起動 / storage clear)
│   ├── shell/
│   └── ui/
├── pbt/                    ← fast-check PBT (collect rule: tests/pbt/**/*.{test,pbt.test}.{ts,tsx})
│   ├── arbitraries/
│   ├── content/services/
│   ├── features/
│   │   ├── search/
│   │   └── submit/
│   ├── lib/                ← env / api / content / i18n の PBT
│   ├── server/             ← api / auth / lib / llm / news の PBT
│   └── submit/             ← サービス step 不変量
└── e2e/                    ← Playwright
    ├── auth.setup.ts       ← Playwright `setup` project (storage state 生成)
    ├── *.spec.ts           ← anon project (cookie 無しで実行する一般 scenario)
    ├── *.user.spec.ts      ← user project (auth.setup.ts で作った storage state を読む scenario)
    ├── fixtures/
    ├── helpers.ts
    ├── notes.md
    ├── playwright.config.ts
    └── scenarios.md
```

ヘルパー命名規約: `_helpers.ts` / `_fixtures.ts` のように `_` prefix で始めて、`*.test.*` 命名を避けることで vitest の collection (suffix で集めている) から外す。
