# News

`ddbj/www` と `dbcls/website` の 2 source を BFF が mirror し、全件 disk cache を保持する。ブラウザは BFF の `/api/news` だけを叩く。BFF は upstream を git で local clone し、定期的に `git pull` で更新する (GitHub REST API は使わない)。portal が GitHub の rate limit や CORS を表に出さない。

データフロー全体図は `architecture.md` を参照する。

## 方針

| 項目 | 値 |
|---|---|
| 取得対象 | `ddbj/www` の `_news/{ja,en}/*.md` + `dbcls/website` の `_posts/{ja,en}/*.md` |
| 取得方式 | git で repo を local に clone (`./repos/{ddbj-www, dbcls-website}/`)、ポーリング時に `git pull` で更新 (source ごと独立) |
| ポーリング間隔 | 30 分 (`DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS=1800`) |
| 起動時挙動 | disk cache を即 load → 直後に initial sync (clone or pull) → 以降ポーリング |
| 変更検出 | `git rev-parse HEAD` を pull の前後で比較。変化があれば全件再構築 (1000-2600 件規模で十分速い、partial update の追跡コストを避ける) |
| cache 永続化 | `<DB_PORTAL_NEWS_CACHE_DIR>/news.json`、起動時に load して即応答可 |
| schema migration | disk cache に `schemaVersion` を持たせ、不一致なら空 cache から再構築 |
| ja/en pairing | slug でペアリング (`19961123` / `19961123-e` → 同一 NewsItem) |
| 正規化 | front matter の `tags` を `NewsCategory` enum に写像 (source 別 mapping 表)、原 tag は `rawTags` で保持 |
| featured | `ddbj/www/_data/global.yml` の `top_news.{ja,en}[].path` (slug whitelist) に一致した item は `featured=true`。NotificationBar 掲載対象 |
| API | `GET /api/news?lang=&category=&source=&year=&service=` で cache を filter して返す |

## データモデル

Zod schema (`app/schemas/api-bff/news.ts`) が SSOT。BFF (`server/news/`) と client (`app/lib/api/news.ts`) で共用する境界 (`architecture.md`)。

### NewsCategory

`NewsCategory` enum の 6 値で UI の分配判定 (NotificationBar / facet) に使う: `announcement` (告知・お知らせ・プレスリリース) / `data-release` (データ公開・リリース) / `maintenance` (メンテナンス・障害) / `event` (イベント・募集) / `service` (サービス紹介・更新、DBCLS 起点) / `other` (default fallback)。値は `tags` からの写像で決まる (`## tag → NewsCategory 写像`)。

### NewsItem / NewsCache

各フィールドの型と source 別の写し方は `app/schemas/api-bff/news.ts` が SSOT、正規化の詳細は `## 取得フロー` の「正規化」 と `server/news/normalize.ts`。規約として固定するのは:

- `NewsItem.id`: `${source}-${slug}` 形式で、ja/en 共通の pairId として機能する (`### pairing と url`)
- `featured`: `global.yml` の `top_news` slug whitelist に一致したとき true (NotificationBar 掲載対象、default false)
- `summary.{ja,en}`: front matter には持たず本文 markdown 先頭から `extractSummary` で抽出する (180 文字以内、markdown 装飾を除去)
- `NewsCache.schemaVersion`: `3` で固定 (不一致なら空 cache から再構築、`## cache の schema migration`)、`lastSyncSha` は source ごとの git HEAD SHA

### pairing と url

file 名から slug を取り出す規則は source ごとに異なり、`pair.ts` の `slugFromFilename` が SSOT。同一 slug の ja / en を 1 件の `NewsItem` にペアリングし、片方の言語しか無ければ反対側の title は空文字で持ち UI 側で fallback する (`newsItemTitle` helper)。

front matter に明示的な URL は無く、portal が source / lang / slug から組み立てる (`sources.ts` の `urlBuilder`)。該当 file が無い言語側は省略する (`url.ja` のみ / `url.en` のみ)。

| source | URL pattern (ja) | URL pattern (en) |
|---|---|---|
| ddbj | `https://www.ddbj.nig.ac.jp/news/ja/${slug}.html` | `https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html` |
| dbcls | `https://dbcls.rois.ac.jp/ja/${YYYY}/${MM}/${DD}/postN.html` | `https://dbcls.rois.ac.jp/en/${YYYY}/${MM}/${DD}/postN.html` |

## 取得フロー

起動時は disk cache を即 load して応答可能にし (file 不在 / schemaVersion 不一致 / parse 失敗のいずれも空 cache から start、cold start を遅らせない)、直後に initial sync (clone or pull) する。以降は **30 分間隔** (`DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS`) で source ごと独立にポーリングする。git clone / fetch / reset の手順は `server/news/git-sync.ts` が SSOT。

変更検出は `git rev-parse HEAD` を pull 前後で比較し、SHA が `lastSyncSha[source]` と一致なら no-op、不一致なら **当該 source の {ja,en} md を全件読み直して再構築**する (1000-2600 件規模で十分速く、partial update の追跡コストを避ける)。ddbj source は `global.yml` の whitelist に一致した item に `featured` を付ける (dbcls は常に false)。最後に当該 source の items のみを atomic に差し替える (他 source の items は保持、in-memory + disk 両方)。pull 失敗 (network / branch 不在 / 破損) は warn にとどめ既存 cache を維持する。`git pull` は HTTPS の git protocol で動き GitHub REST API rate limit とは別枠なので、認証なしでも 30 分間隔は余裕。

### 正規化 (normalize)

各 markdown の front matter を YAML として parse し NewsItem に写す。field ごとの写し方は `server/news/normalize.ts` が SSOT。規約として固定するのは:

- `published`: 両言語側が共に欠落または `published: false` の slug だけを item から落とす。片方でも公開されていれば残す (未公開側の title はそのまま写る)
- front matter の `category:` field は source 側の Jekyll layout 用で、portal の `NewsCategory` 分類とは **別物**。portal の `category` は `tags` 配列からの写像のみで決定する (`## tag → NewsCategory 写像`)
- `db`: 文字列を全て `.toLowerCase().trim()` してから dedupe する (`agd  ` のような余分な空白も除去)。facet の「サービス」 軸で使う
- `publishedAt`: ddbj は front matter の `date`、dbcls は file slug `YYYY-MM-DD-postN` から JST datetime を合成する (同一日付の post を安定 sort できる順序にする)
- `summary`: 本文 markdown 先頭から `extractSummary` で抽出する (heading / link 等を strip、180 文字でカット)

## tag → NewsCategory 写像

source ごとに語彙が異なる。portal は次の **source 別 mapping 表** で `NewsCategory` に正規化する (`server/news/normalize.ts` の `MAPPING`)。マッチは `tag.trim.toLowerCase` 後の完全一致。

### ddbj/www (DDBJ)

front matter の `tags` で使われている実値:

| tag (lowercased で比較) | category |
|---|---|
| `お知らせ` / `announcement` | `announcement` |
| `データ公開` / `data release` | `data-release` |
| `メンテナンス` / `maintenance` | `maintenance` |
| 上記いずれもなし / 未知 tag | `other` |

> Note: DDBJ の Database 区分 (`BioProject`, `BioSample`, `DRA`, `GEA`, `JGA`, `AGD`, `MetaboBank`, `TogoVar`, `DTA` 等) は **`tags` ではなく front matter の `db` フィールド** に入っており、`.toLowerCase().trim()` 後に `NewsItem.db` に格納される。NewsCategory 体系とは独立した別軸 (facet の「サービス」 で使う)。

### dbcls/website (DBCLS)

front matter の `tags` で使われている実値:

| tag | category |
|---|---|
| `public_relations` | `announcement` |
| `events` | `event` |
| `registration` | `event` |
| `services` | `service` |
| `other` | `other` |
| 未知 tag | `other` |

### 写像ルール

ja / en の `rawTags` を結合し、各 tag を `trim.toLowerCase` 正規化して source 別 mapping 表を first-match で引き、マッチが無ければ `other` (default fallback) を採る (`server/news/normalize.ts`)。source 側で新しい tag が追加されたら `other` に落ちる (UI を壊さない)。

## facet 設計

`/news` 画面の facet sidebar は次の 4 グループで構成する:

| facet | 元 field | 値の集合 |
|---|---|---|
| 種別 (category) | `category` | `NewsCategory` enum 6 種、cache から実出現分のみ |
| ソース | `source` | `NewsSource` enum (`"ddbj"` / `"dbcls"`)、cache から実出現分のみ |
| 年 | `publishedAt` の年 | cache から実出現分のみ、降順 |
| サービス | `db` | `db` 配列の和集合、文字列 sort |

複数選択は OR、異なる facet 同士は AND で結ぶ (NCBI 流の faceted search に準拠)。chip は AppliedFilters に並べ、1 chip で 1 値を解除可能。

各オプションには件数 (facet count) を右端に添える。グループ G のオプション v の件数は、**G 以外の全 facet を適用した結果集合のうち v を持つ件数** とする。これにより G 内での選択は G 自身の件数に影響せず (グループ内 OR と整合)、他グループでの絞り込みは件数に連動する。件数は cache 全件 (当該言語で title を持つ item) から client 側で集計する。ソース行に添える source 配色の色点など見た目は `app/features/news/` と `app/styles/tailwind.css` の Source palette が SSOT。

URL params との同期 (`facet-url-state.ts`):

```
/news?category=announcement,data-release&year=2024,2025&service=bioproject,biosample
```

`,` separated。順序は alphabet sort で安定化 (URL diff が小さく保たれる)。

## /api/news エンドポイント

`server/api/news.ts` が cache を filter して返す。全 query を AND で適用する。

| query | 型 | 動作 |
|---|---|---|
| `category` | comma separated NewsCategory | いずれかに一致する item |
| `source` | comma separated NewsSource (`ddbj` / `dbcls`) | source がいずれかに一致する item |
| `lang` | `ja` または `en` | 該当言語の title が非空である item に絞る (summary は判定に使わない) |
| `year` | comma separated YYYY | publishedAt の年が一致 |
| `service` | comma separated db slug | `db` 配列に いずれか含む item |

`Cache-Control: public, max-age=60` を付ける (ブラウザの過剰呼び出しを抑制、server cache は polling 間隔で更新)。`/news` route は SSR loader を持たず、`useNewsList` (`app/features/news/use-news-list.ts`) が client-side で TanStack Query 経由で `/api/news` を 1 回 fetch する。`NotificationBar` / `NewsAside` も同じ query key を共有する (`["news"]`)。

## UI 統合

### NotificationBar / NewsAside

NotificationBar (top page 上部、全 featured を新しい順に stack、個別 close 可) と NewsAside (top page 右ペイン、最新 N 件 (`NEWS_LIMIT`) の compact list) の表示仕様は `frontend.md` の「Shell」 を参照。

news data source 側の補足: NotificationBar 掲載対象は **`featured` フラグ** (= `global.yml` の `top_news` slug whitelist に該当) で判定する。category とは独立した軸で、category が `announcement` であっても featured でなければ NotificationBar に出さない。逆に featured なら category を問わず出る (ddbj 側のみ運用、`global.yml` メンテナで決まる)。

### /news 一覧 + facet

`app/features/news/` 配下で実装する (`architecture.md` zones に準拠して `app/features/` 内に閉じる。Toolbar + NewsList + Pagination、4 グループの FacetGroup、facet ↔ URL params の純粋関数 helper、TanStack Query での取得 + facet 適用)。component 構成は同ディレクトリのコードが SSOT。`AppliedFilters` / `FacetGroup` / `FacetRow` は `app/ui/` の primitive を利用し、`NewsCategory` → i18n key の写像 helper (`categoryLabelKey`) は `app/lib/i18n/category-label.ts` が SSOT。

routing 側 (`app/routes/news/route.tsx`) は loader を持たず、URL から facet state を組み立てて `useNewsList(lang, facet)` に渡す (lang は cookie、`i18n.md`)。pagination は 1 page 20 件 (`NEWS_PAGE_SIZE`)、URL に `?page=` で反映し、facet と pagination を同時に変えた場合は URL を 1 回で更新する。

## cache の schema migration

`NewsCache.schemaVersion` を `3` に固定する。schema を更新するときは `schemaVersion` を bump して新 field を追加すると、起動時に旧 cache は parse 失敗 → 空 cache から再構築される (起動直後の initial sync で全件取得)。旧 schema を後方互換で持たない (シンプル化優先)。`tests/unit/server/news/cache.test.ts` の "schema mismatch" ケースが「任意の旧 cache file を渡しても起動が成功し空 cache から復元される」 ことを担保する。

## 環境変数

`DB_PORTAL_` prefix で統一する (`server/lib/env.ts` で Zod 検証)。

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_NEWS_REPOS_DIR` | `./repos` | 各 source の clone 先ディレクトリのルート |
| `DB_PORTAL_NEWS_DDBJ_REPO_URL` | `https://github.com/ddbj/www.git` | ddbj source の clone 元 URL |
| `DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH` | `main` | ddbj source の branch |
| `DB_PORTAL_NEWS_DBCLS_REPO_URL` | `https://github.com/dbcls/website.git` | dbcls source の clone 元 URL |
| `DB_PORTAL_NEWS_MIRROR_DBCLS_BRANCH` | `master` | dbcls source の branch |
| `DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS` | `1800` (30 分) | 全 source 共通のポーリング間隔 |
| `DB_PORTAL_NEWS_CACHE_DIR` | `/var/cache/db-portal/news` | disk cache 配置先 |

git clone / pull は GitHub の git protocol HTTPS 経由で行う。REST API rate limit (60 req/h IP) とは別枠であり、PAT などの認証は不要。

## テスト

### unit

| ファイル | 内容 |
|---|---|
| `tests/unit/server/news/normalize.test.ts` | front matter parse、tag → NewsCategory 写像、url 組み立て、`published: false` 除外 |
| `tests/unit/server/news/cache.test.ts` | disk load (file 不在 / 破損 / schema 不一致) → 空 cache、`replaceItemsForSource` で他 source の items を保持しつつ差し替え、filter (category / source / year / service / lang) |
| `tests/unit/server/news/pair.test.ts` | ja のみ / en のみ / 両方ある場合の slug ペアリング |
| `tests/unit/server/news/featured.test.ts` | `global.yml` parser: 正常 / 末尾空白 / 空 array / 不在 / malformed YAML / `path` が non-string / BOM 付きの 7 ケース |
| `tests/unit/server/news/git-sync.test.ts` | 子プロセス起動 API を inject 可能にして mock、clone / pull / rev-parse の成功・失敗を網羅 |

### PBT

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/news/normalize-mapping.pbt.test.ts` | 任意の tag 配列に対して `tagsToCategory(source, tags)` が `NewsCategory.options` のいずれかを返す、mapping 表に列挙した tag は対応 category を返す、source ごとに mapping が独立している |
