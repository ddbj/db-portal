# Services

DDBJ・DBCLS が提供する各サービスの一覧を、upstream の実データから生成して配信する。BFF が `ddbj/www` と `dbcls/website` の中の service データファイルを読み、正規化して全件 disk cache を保持する。ブラウザは BFF の `/api/services` だけを叩く。

このデータ源は News と同一の 2 repo であり、**News mirror が clone・pull する local clone をそのまま再利用する** (services 専用の git 操作は持たない)。データフロー全体図は `architecture.md` を参照する。

## 方針

| 項目 | 値 |
|---|---|
| 取得対象 | `ddbj/www` の `_data/services.yml` + `dbcls/website` の `json/services.json` |
| 取得方式 | News mirror が維持する local clone (`<DB_PORTAL_NEWS_REPOS_DIR>/{ddbj-www, dbcls-website}`) を read-only に読む。git clone / pull は News に委譲 |
| 更新契機 | News mirror が source の git HEAD 変化を検出した直後に、その source 分を再構築 (services 独自のポーリングは持たない) |
| cache 永続化 | `<DB_PORTAL_SERVICES_CACHE_DIR>/services.json`、起動時に load して即応答可 |
| schema migration | disk cache に `schemaVersion` を持たせ、不一致なら空 cache から再構築 |
| source 分割 | `ddbj` = `<clone>/ddbj-www/_data/services.yml` の `items[]` から `provider === "DDBJ"`、`dbcls` = `<clone>/dbcls-website/json/services.json` (配列) から `data[0]` ヘッダ行を除いた `掲載` が truthy の行。両 source は disjoint |
| 正規化 | 各 source の分類語彙を `ServiceCategory` enum に写像 (source 別 mapping 表)、原語彙は `rawCategories` で保持 |
| featuredTop | top page 掲載対象フラグ。DDBJ は name whitelist、DBCLS は name の `Togo` prefix |
| sort | `/services` 一覧・top page いずれも name のアルファベット順 (既定昇順) |
| API | `GET /api/services?source=&category=&featured=` で cache を filter して返す |

## source 分割 (重複回避)

取得元ファイルと対象条件は方針表に集約する。2 source が disjoint なのは、`services.yml` 由来の entry を `provider === "DDBJ"` で絞るため。`services.yml` には `provider: DBCLS` の entry (GGGenome / CRISPRdirect / RefEx / NBDC Human Database 等) も含まれるが、この filter で落ちるので `services.json` 側 (DBCLS) と二重計上されない。

`掲載` の判定は truthy 規約 (boolean `true`、または文字列 `"true"` / `"1"` を真とする) に従う。

## データモデル

Zod schema (`app/schemas/api-bff/service.ts`) が SSOT。BFF (`server/services/`) と client (`app/lib/api/services.ts`) で共用する境界 (`architecture.md`)。各フィールドの型と source 別の写し方 (name / description / url を DDBJ / DBCLS のどの field から取るか、相対 URL の絶対化) は `server/services/normalize.ts` が SSOT。

### ServiceCategory

機能軸の統合 enum 7 値。両 source の分類語彙を写像して正規化する。facet / Tag 表示で使う。

| 値 | 意味 |
|---|---|
| `repository` | データ登録・公開リポジトリ |
| `search` | 検索・取得 |
| `analysis` | 解析 |
| `annotation` | アノテーション |
| `integration` | データ統合・RDF |
| `visualization` | 可視化・教材 |
| `other` | その他 (写像結果が空のときの fallback) |

### 不変量・規約として固定するフィールド

- `id`: `${source}-${nameSlug(en 名)}` 形式で、不変量 `^[a-z0-9-]+$` を満たす (生成は `normalize.ts`、性質は PBT が固定)
- `categories`: 写像結果の `ServiceCategory[]` (複数値・dedupe、空なら `["other"]`)、`rawCategories`: 写像前の原語彙 (DDBJ tag / DBCLS Category ラベル)
- `featuredTop`: top page 掲載対象フラグ (default false、判定は `## featuredTop`)
- `ServiceCache.schemaVersion`: 不一致なら空 cache から再構築 (方針表)。`lastSyncSha` (source ごとの git HEAD SHA) を services 側でも保持するのは、cache が News と独立に破損・消失しても次回 sync の SHA 比較で自己回復できるようにするため

## 分類語彙 → ServiceCategory 写像

source ごとに語彙が異なる。BSI は次の **source 別 mapping 表** で `ServiceCategory` に正規化する。`categories` は複数値で、写像結果を dedupe する。結果が空なら `["other"]`。

### ddbj/www (DDBJ)

`services.yml` の `tags` で使われる実値:

| tag | category |
|---|---|
| `database` | `repository` |
| `submission` | `repository` |
| `search` | `search` |
| `analysis` | `analysis` |
| `annotation` | `annotation` |
| 未知 tag | (写像しない) |

### dbcls/website (DBCLS)

`services.json` の `Category_1..10` (boolean)。ラベルは `data[0]` ヘッダ行が `"English/日本語"` 形式で保持:

| Category | ラベル (en) | category |
|---|---|---|
| `Category_1` | Database integration | `integration` |
| `Category_2` | Materials | `visualization` |
| `Category_6` | NGS | `analysis` |
| `Category_8` | Natural language processing | `analysis` |
| `Category_9` | SPARQL Search | `search` |
| `Category_10` | RDF creation | `integration` |
| `Category_3/4/5/7` | Genome / Gene / Gene expression / Disease | (写像しない、domain 軸) |

domain 系 (Genome / Gene / Gene expression / Disease) は機能軸の `ServiceCategory` に対応しないため `categories` に寄与させない (原値は `rawCategories` に残す)。`User_1..4` は使わない。

表示名の上書き: upstream の `services_name_*` が冗長 / 和名表記のものは、BSI 側の上書き表 (`server/services/sources.ts` の `DBCLS_NAME_OVERRIDES`、key = upstream の `services_name_en`) で簡潔な表示名に揃える。id / featuredTop も上書き後の名前から導出する。

| upstream `services_name_en` | 表示名 (ja / en) |
|---|---|
| `TogoDX/human` | `TogoDX` / `TogoDX` |
| `TogoTV` (ja: 統合TV) | `TogoTV` / `TogoTV` |

source 側で新語彙が追加されたら写像対象外となり、`categories` が空になれば `other` に落ちる (UI を壊さない)。

## featuredTop (top page 掲載対象)

top page の services セクションは `featuredTop === true` の item だけを表示する。

| source | 条件 |
|---|---|
| `ddbj` | `name` が whitelist に完全一致: `BioProject`, `BioSample`, `DDBJ`, `JGA`, `DRA`, `GEA`, `MetaboBank` |
| `dbcls` | `services_name_en` が `Togo` で始まる (掲載 true のもの) |

DDBJ whitelist は BP / BS / DDBJ / JGA / DRA / GEA / MetaboBank に対応する。

## 取得フロー

起動時は `server/services/cache.ts` が disk cache を読んで即応答可能になり (不在 / schemaVersion 不一致 / parse 失敗のいずれも空 cache から start)、initial sync を待たない。以降は services 独自のポーリングを持たず、**News mirror が各 source の git HEAD 変化を検出して news を再構築した直後**、同じ source の services 再構築フックが呼ばれる。

services 側は受領 `sha` を `lastSyncSha[source]` と比較し、差分があるときだけ当該 source のファイル (`services.yml` / `services.json`) を read → 正規化して **その source の items のみ**を差し替える (他 source の items は保持、in-memory + disk cache を atomic に更新)。ファイル read / parse 失敗は warn にとどめ既存 items を維持する。手順は `server/services/cache.ts` / `mirror.ts` が SSOT。

## /api/services エンドポイント

`server/api/services.ts` が cache を filter して返す。全 query を AND で適用する。

| query | 型 | 動作 |
|---|---|---|
| `source` | comma separated (`ddbj` / `dbcls`) | source がいずれかに一致する item |
| `category` | comma separated `ServiceCategory` | item の `categories` がいずれかを含む (OR) |
| `featured` | `true` で featuredTop のみ | top page 用の絞り込み |

`Cache-Control: public, max-age=60` を付ける。`/services` route は SSR loader を持たず、client が TanStack Query 経由で `/api/services` を 1 回 fetch する (top page の services セクションも同じ query key を共有)。

## facet 設計

`/services` 画面の facet sidebar は次の 2 グループで構成する:

| facet | 元 field | 値の集合 |
|---|---|---|
| 種別 (category) | `categories` | `ServiceCategory` enum、cache から実出現分のみ |
| ソース (source) | `source` | `ddbj` / `dbcls`、cache から実出現分のみ |

複数選択は OR、異なる facet 同士は AND。chip は AppliedFilters に並べ、1 chip で 1 値を解除可能。一覧は name のアルファベット順 (既定昇順、Toolbar で昇順/降順切替)。News と異なり日付軸が無いため year facet・date sort は持たない。

facet count (self-exclusion 集計) とソース行の source 色点は News と同じ規約に従う (`news.md` の「facet 設計」が SSOT)。

URL params との同期 (`facet-url-state.ts`):

```
/services?source=ddbj&category=repository,search&sort=desc&page=2
```

`,` separated。順序は alphabet sort で安定化する。

## 説明文の末尾句点 (表示時正規化)

upstream の `description` は末尾の文末句点が付くもの・付かないもので混在する。BSI は **表示時** に言語別の文末句点 (ja `。` / en `.`) を補って統一する。cache / `/api/services` の生データは upstream 忠実なまま保持し、補完は一覧・top で共有する表示用の説明文取得経路 (`serviceDescription`、`app/lib/api/services.ts`) でのみ行う。既に句点があるとき据え置く・閉じ括弧の扱い・fallback 言語の規則はコードが SSOT。

## UI 統合

`/services` 一覧は `app/features/services/` 配下で実装する (News の構成に準拠。Toolbar + list + Pagination、category / source の 2 FacetGroup、facet ↔ URL params の純粋関数 helper、TanStack Query での取得 + facet 適用 + name sort + pagination)。component 構成は同ディレクトリのコードが SSOT。`AppliedFilters` / `FacetGroup` / `FacetRow` は `app/ui/` の primitive を利用し、`ServiceCategory` → i18n key の写像 helper は `app/lib/i18n` に置く。

top page の services セクションは `/services` 一覧と同じ query key (`["services"]`) で `/api/services` を取得し (全件 fetch を共有)、client 側で `featuredTop === true` の item だけに絞り、DDBJ・DBCLS 混在のアルファベット順 list で表示する (facet / pagination なし、icon なし)。

## 環境変数

`DB_PORTAL_` prefix で統一する (`server/lib/env.ts` で Zod 検証)。

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_SERVICES_CACHE_DIR` | `/var/cache/db-portal/services` | disk cache 配置先 |

repo の clone 先は News の `DB_PORTAL_NEWS_REPOS_DIR` を再利用する (services 独自の git / branch / interval 変数は持たない)。

## テスト

### unit

| ファイル | 内容 |
|---|---|
| `tests/unit/server/services/normalize.test.ts` | yml/json parse、source 分割 (provider!=DDBJ 除外 / data[0] 除外 / 掲載 false 除外 / 文字列 boolean)、tag・Category 写像、相対 URL 絶対化、featuredTop 判定、id 生成・衝突、片言語 fallback |
| `tests/unit/server/services/cache.test.ts` | disk load (不在 / 破損 / schema 不一致) → 空 cache、`replaceItemsForSource` の source 分離、filter (source / category(OR) / featured) |
| `tests/unit/server/services/mirror.test.ts` | sync フックが SHA 差分時のみ再構築 (自己回復)、ファイル欠落時に既存 items 保持 |

### PBT

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/services/normalize-mapping.pbt.test.ts` | 任意の tag / Category 組合せに対して `categories ⊆ ServiceCategory.options` かつ非空・dedupe、mapping 表に列挙した語は対応 category を返す、`nameSlug` が `^[a-z0-9-]+$` を満たす |
