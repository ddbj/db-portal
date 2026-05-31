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
| source 分割 | DDBJ = `services.yml` の `provider == "DDBJ"`、DBCLS = `services.json` の `掲載 == true` (両者は重複しない) |
| 正規化 | 各 source の分類語彙を `ServiceCategory` enum に写像 (source 別 mapping 表)、原語彙は `rawCategories` で保持 |
| featuredTop | top page 掲載対象フラグ。DDBJ は name whitelist、DBCLS は name の `Togo` prefix |
| sort | `/services` 一覧・top page いずれも name のアルファベット順 (既定昇順) |
| API | `GET /api/services?source=&category=&featured=` で cache を filter して返す |

## source 分割 (重複回避)

| source | 取得元ファイル | 対象条件 |
|---|---|---|
| `ddbj` | `<clone>/ddbj-www/_data/services.yml` の `items[]` | `provider === "DDBJ"` |
| `dbcls` | `<clone>/dbcls-website/json/services.json` (配列) | `data[0]` (ヘッダ行) を除外し `掲載 === true` |

`services.yml` には `provider: DBCLS` の entry (TogoVar / GGGenome / CRISPRdirect / RefEx / NBDC Human Database 等) も含まれるが、`provider === "DDBJ"` filter で落ちるため `services.json` 側と二重計上されない。`掲載 === true` の真偽は boolean / 文字列 (`"True"` 等) の双方を許容して判定する。

## データモデル

Zod schema (`app/schemas/api-bff/service.ts`) が SSOT。BFF (`server/services/`) と client (`app/lib/api/services.ts`) で共用する境界 (`architecture.md`)。

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

### ServiceItem の主要フィールド

| フィールド | 内容 |
|---|---|
| `id` | `${source}-${nameSlug}` 形式 (nameSlug = en 名を lowercase、非英数を `-`、連続 `-` 圧縮、前後 trim) |
| `source` | `"ddbj"` / `"dbcls"` |
| `name.{ja,en}` | サービス名。DDBJ は `formal_name`(優先)/`name`、DBCLS は `services_name_{ja,en}` (欠落側は空文字) |
| `description.{ja,en}` | 1 行説明。DDBJ は `description`、DBCLS は `explanation` (欠落側は空文字) |
| `url.{ja,en}` | サービスの実 URL。DDBJ は `service_link` (相対は `https://www.ddbj.nig.ac.jp` で絶対化)、DBCLS は単一 `URL` を両言語に |
| `categories` | `ServiceCategory[]` (複数値、dedupe、空なら `["other"]`) |
| `rawCategories` | 写像前の原語彙 (DDBJ tag / DBCLS Category ラベル) |
| `featuredTop` | top page 掲載対象 (default false) |
| `provider` | DDBJ 側のみ保持 (optional) |

### ServiceCache の主要フィールド

| フィールド | 内容 |
|---|---|
| `schemaVersion` | `2` で固定 (schema / 正規化出力の更新時に bump して旧 cache を破棄する) |
| `lastSyncSha` | source ごとの git HEAD SHA。News から受け取り、services 自身の再構築 guard に使う |
| `lastFetchedAt` | ISO 8601 |
| `items` | `ServiceItem[]` |

`lastSyncSha` を services 側でも保持するのは、cache が News と独立に破損・消失しても、次回 sync の SHA 比較で自己回復できるようにするため。

### 説明文の末尾句点 (表示時正規化)

upstream の `description` は末尾に文末句点が付くもの・付かないものが混在する。portal は **表示時** に言語別の文末句点を補って統一する。cache / `/api/services` の生データは upstream 忠実なまま保持し、補完は一覧・top で共有する表示用の説明文取得経路でのみ行う。

| 言語 | 補う句点 | 補完条件 |
|---|---|---|
| ja | `。` | 値が非空で、末尾が文末句読点 (`。 ． . ！ ？ ! ? …`) でないとき |
| en | `.` | 同上 |

- 末尾が既に上記いずれかの句読点なら据え置く (二重付与しない)。
- 閉じ括弧 (`）` `)` 等) は文末扱いせず句点を補う。
- 言語 fallback で別言語の値を表示する場合は、表示する値の言語規則で補う (ja 欠落で en を表示するなら `.`)。

## 分類語彙 → ServiceCategory 写像

source ごとに語彙が異なる。portal は次の **source 別 mapping 表** で `ServiceCategory` に正規化する。`categories` は複数値で、写像結果を dedupe する。結果が空なら `["other"]`。

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

#### 表示名の上書き

upstream の `services_name_*` が冗長 / 和名表記のものは、portal 側の上書き表 (`server/services/sources.ts` の `DBCLS_NAME_OVERRIDES`、key = upstream の `services_name_en`) で簡潔な表示名に揃える。id / featuredTop も上書き後の名前から導出する。

| upstream `services_name_en` | 表示名 (ja / en) |
|---|---|
| `TogoDX/human` | `TogoDX` / `TogoDX` |
| `TogoTV` (ja: 統合TV) | `TogoTV` / `TogoTV` |

source 側で新語彙が追加されたら写像対象外となり、`categories` が空になれば `other` に落ちる (UI を壊さない)。新語彙を取り込む場合は本表と `tests/unit/server/services/normalize.test.ts` / `tests/pbt/server/services/normalize-mapping.pbt.test.ts` を同時更新する。

## featuredTop (top page 掲載対象)

top page の services セクションは `featuredTop === true` の item だけを表示する。

| source | 条件 |
|---|---|
| `ddbj` | `name` が whitelist に完全一致: `BioProject`, `BioSample`, `DDBJ`, `JGA`, `DRA`, `GEA`, `MetaboBank`, `TogoVar-repository` |
| `dbcls` | `services_name_en` が `Togo` で始まる (掲載 true のもの) |

DDBJ whitelist は BP / BS / DDBJ / JGA / DRA / GEA / MetaboBank / jVar(=`TogoVar-repository`) に対応する。

## 取得フロー

### 起動時

1. `server/services/cache.ts` が `<DB_PORTAL_SERVICES_CACHE_DIR>/services.json` を読む (不在 / schemaVersion 不一致 / parse 失敗のいずれも空 cache から start)
2. 即座に `/api/services` を応答可能 (initial sync を待たない)
3. 以降は News mirror の sync フックで再構築される

### 再構築 (News sync フック)

News mirror が各 source の git HEAD 変化を検出し news を再構築した直後、同じ `(source, localDir, sha)` で services の再構築フックを呼ぶ。services 側は:

1. 自身の `lastSyncSha[source]` と受領 `sha` を比較し、差分が無ければ no-op
2. 差分があれば該当 source のファイル (`services.yml` / `services.json`) を read → 正規化 → `cache.replaceItemsForSource(source, items, sha)` で当該 source の items のみ差し替え (他 source は保持)、in-memory + disk を atomic 更新
3. ファイル read / parse 失敗は warn にとどめ、当該 source の既存 items は維持する

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

各オプションには件数 (facet count) を右端に添える。グループ G のオプション v の件数は、**G 以外の facet を適用した結果集合のうち v を持つ件数** とする (NCBI 流)。G 内での選択は G 自身の件数に影響せず、他グループでの絞り込みは件数に連動する。件数は cache 全件から client 側で集計する。ソース行には source 配色の色点 (ddbj=amber / dbcls=blue、`tailwind.css` の Source palette) を添えて視認性を上げる。

URL params との同期 (`facet-url-state.ts`):

```
/services?source=ddbj&category=repository,search&sort=desc&page=2
```

`,` separated。順序は alphabet sort で安定化する。

## UI 統合

`/services` 一覧は `app/features/services/` 配下で実装する (News の構成に準拠):

| ファイル | 役割 |
|---|---|
| `service-list.tsx` | Toolbar + list + Pagination の組立て |
| `service-row.tsx` | 1 行 (name / description / source Tag / category Tag、icon なし) |
| `facet-panel.tsx` | category / source の 2 FacetGroup の配置 |
| `facet-url-state.ts` | facet ↔ URL params の双方向 helper (純粋関数) |
| `use-services-list.ts` | TanStack Query で /api/services を取得、facet 適用・name sort・pagination |

`AppliedFilters` / `FacetGroup` / `FacetRow` は `app/ui/` の primitive を利用する。`ServiceCategory` → i18n key の写像 helper は `app/lib/i18n` に置く。

top page の services セクションは `/api/services?featured=true` を取得し、DDBJ・DBCLS 混在のアルファベット順 list で表示する (facet / pagination なし、icon なし)。詳細は `frontend.md` の「Top route」。

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
