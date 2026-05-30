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
| API | `GET /api/news?lang=&category=&year=&service=` で cache を filter して返す |

## データモデル

Zod schema (`app/schemas/api-bff/news.ts`) が SSOT。BFF (`server/news/`) と client (`app/lib/api/news.ts`) で共用する境界 (`architecture.md`)。

### NewsCategory

`NewsCategory` enum の 6 値。UI の分配判定 (NotificationBar / facet) で使う。

| 値 | 意味 |
|---|---|
| `announcement` | 告知・お知らせ・プレスリリース |
| `data-release` | データ公開・リリース |
| `maintenance` | メンテナンス・障害 |
| `event` | イベント・募集 |
| `service` | サービス紹介・更新 (DBCLS 起点) |
| `other` | その他 (default fallback) |

### NewsItem の主要フィールド

| フィールド | 内容 |
|---|---|
| `id` | `${source}-${slug}` 形式、ja/en 共通の pairId として機能 |
| `source` | `"ddbj"` / `"dbcls"` |
| `category` | 正規化後の `NewsCategory` |
| `featured` | `global.yml` の `top_news` slug whitelist に一致 → NotificationBar 表示対象 (default false) |
| `publishedAt` | ISO 8601、ddbj は front matter の `date`、dbcls は file slug `YYYY-MM-DD-postN` から JST datetime を合成 (`publishedAtFromSlug`) |
| `retireTime` | optional、NotificationBar 表示終了基準 |
| `title.{ja,en}` | 該当言語側に title (片言語のみのとき他言語は空文字)。`published: false` の言語は title を空文字にする (この片言語は item を pair から落とす条件にも使う) |
| `summary.{ja,en}` | 本文 markdown の先頭から `extractSummary` で抽出 (180 文字以内、`#` heading / link 等の markdown 装飾は除去)。front matter には summary を持たない |
| `url.{ja,en}` | source / lang / slug から組み立てた外部 URL (片言語のみのとき省略) |
| `db` | 関連 DB の slug 配列 (facet で使う) |
| `rawTags.{ja,en}` | 原 tag 配列 (写像前) |

### NewsCache の主要フィールド

| フィールド | 内容 |
|---|---|
| `schemaVersion` | `3` で固定 (schema 更新時に bump して旧 cache を破棄する) |
| `lastSyncSha` | source ごとの git HEAD SHA |
| `lastFetchedAt` | ISO 8601 |
| `items` | `NewsItem[]` |

### ja/en pair の id

source ごとに slug 規則が異なる。`server/news/sources.ts` の `slugFromFilename` (`SourceParseConfig`) に各規則を畳み込み、同一 slug の ja / en をペアリングして 1 件の `NewsItem` にする。

ddbj/www:

- `_news/ja/1996-06-21.md` → slug `1996-06-21`
- `_news/en/1996-06-21-e.md` → slug `1996-06-21` (en file の末尾 `-e` のみを削除、ja side は無修正)
- `_news/ja/2024-04-01_2.md` → slug `2024-04-01_2`
- `_news/en/2024-04-01_2-e.md` → slug `2024-04-01_2`

dbcls/website (Jekyll `_posts` 形式、`YYYY-MM-DD-post{N}.md`):

- `_posts/ja/2024-04-01-post1.md` → slug `2024-04-01-post1`
- `_posts/en/2024-04-01-post1.md` → slug `2024-04-01-post1` (suffix なし)

片方の言語しか無ければ title.en (もしくは title.ja) を空文字で持ち、UI 側で fallback する (`newsItemTitle` helper)。

### url の組み立て

front matter に明示的な URL は無い。portal は source / lang / slug から `server/news/sources.ts` の `urlBuilder` で組み立てる。

| source | URL pattern (ja) | URL pattern (en) |
|---|---|---|
| ddbj | `https://www.ddbj.nig.ac.jp/news/ja/${slug}.html` | `https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html` |
| dbcls | `https://dbcls.rois.ac.jp/ja/${YYYY}/${MM}/${DD}/postN.html` | `https://dbcls.rois.ac.jp/en/${YYYY}/${MM}/${DD}/postN.html` |

dbcls は slug `YYYY-MM-DD-postN` を分解して埋め込む。該当 file が無い言語側は省略する (`url.ja` のみ / `url.en` のみ)。

## 取得フロー

### 起動時

1. `server/news/cache.ts` が `<DB_PORTAL_NEWS_CACHE_DIR>/news.json` を読む
   - file が無い / `schemaVersion` 不一致 / parse 失敗のいずれも空 cache から start
2. 即座に `/api/news` を応答可能 (initial sync を待たない、cold start を遅らせない)
3. `server/news/git-sync.ts` で `./repos/{ddbj-www, dbcls-website}/` を確認:
   - 存在しなければ `git clone --depth 1 --branch <branch> <url>`
   - 存在すれば `git fetch --depth 1 origin <branch> && git reset --hard origin/<branch>`
4. `git rev-parse HEAD` で HEAD SHA を取得、cache の `lastSyncSha[source]` と比較
   - 一致なら no-op
   - 不一致なら全件再構築
5. 以降 `setInterval(tickAll, intervalMs)` で polling

### ポーリング (tickAll)

各 source に対し独立に:

1. `git fetch + reset --hard origin/<branch>`
2. `git rev-parse HEAD` で新 SHA 取得
3. SHA が `lastSyncSha[source]` と一致なら no-op、不一致なら全件再構築

`git pull` (HTTPS) は GitHub の REST API rate limit と別枠で動作するため、認証なしでも 30 分間隔は余裕。pull 失敗 (network エラー / branch 不在 / 破損) は warn log にとどめ、既存 cache は維持する。

### 全件再構築

1. `repos/<src>/<pathByLang[lang]>` 配下の `*.md` を `fs.readdir` で列挙
2. 各 markdown を `fs.readFile` → `parseRawArticle` で `RawArticle` に
3. `pairToNewsItems` で ja/en pair → `NewsItem` の配列を作る
4. ddbj source は `repos/ddbj-www/_data/global.yml` を `loadFeaturedWhitelist` で読み、`isFeaturedSlug` で各 NewsItem に `featured` フラグを付与 (DBCLS 側は常に false)
5. `cache.replaceItemsForSource(source, items, newSha)` で **当該 source の items のみを差し替え**、他 source の items は保持したまま、in-memory + disk 両方を atomic 更新

### 正規化 (normalize)

各 markdown の front matter を YAML として parse し、NewsItem に写す。

- `title` → `title.{ja|en}` (該当言語側に格納)
- `date` → `publishedAt` (ddbj は front matter の `date` をそのまま、dbcls は file slug `YYYY-MM-DD-postN` から JST 00:00 を合成する)
- `retire_time` → `retireTime`
- `db` → `db` (文字列を全て `.toLowerCase().trim()` してから dedupe、`agd  ` のような余分な空白も除去)
- `tags` → `rawTags.{ja|en}` (原文配列のまま) + `category` (写像)
- `lang` → 受信時に自明 (`_news/ja` か `_news/en` か、dbcls なら `_posts/ja` / `_posts/en`)
- `published` → `false` のとき、その言語側を pair から落とす。両言語共に `published: false` の slug は最終的な item に含めない

front matter の `category:` field は source 側で Jekyll の layout 用に使われており、portal の `NewsCategory` 分類とは別物。portal の `category` は `tags` 配列からの写像のみで決定する。

`summary.{ja,en}` は front matter には無く、本文 markdown の先頭から `extractSummary` で抽出する (heading / link 等を strip し、180 文字でカット)。

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

1. ja / en の `rawTags` を 1 配列に結合
2. 各 tag を `trim.toLowerCase` で正規化し、source 別 mapping 表を引く
3. 最初にマッチした enum を採用、マッチが無ければ `other` (default fallback)

`retireTime` を過ぎた item の `category` は変えない。NotificationBar 側で `featured && retireTime > now` を見て表示から外す。

source 側で新しい tag が追加されたら fallback の `other` に落ちる (UI を壊さない)。新 tag を category に取り込みたい場合は本表と `tests/unit/server/news/normalize.test.ts` の table を同時更新する。

## facet 設計

`/news` 画面の facet sidebar は次の 4 グループで構成する:

| facet | 元 field | 値の集合 |
|---|---|---|
| 種別 (category) | `category` | `NewsCategory` enum 6 種、cache から実出現分のみ |
| ソース | `source` | `NewsSource` enum (`"ddbj"` / `"dbcls"`)、cache から実出現分のみ |
| 年 | `publishedAt` の年 | cache から実出現分のみ、降順 |
| サービス | `db` | `db` 配列の和集合、文字列 sort |

複数選択は OR、異なる facet 同士は AND で結ぶ (NCBI 流の faceted search に準拠)。chip は AppliedFilters に並べ、1 chip で 1 値を解除可能。

各オプションには件数 (facet count) を右端に添える。グループ G のオプション v の件数は、**G 以外の全 facet を適用した結果集合のうち v を持つ件数** とする。これにより G 内での選択は G 自身の件数に影響せず (グループ内 OR と整合)、他グループでの絞り込みは件数に連動する。件数は cache 全件 (当該言語で title を持つ item) から client 側で集計する。ソース行には source 配色の色点 (ddbj=amber / dbcls=blue、`tailwind.css` の Source palette) を添えて視認性を上げる。

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

NotificationBar (top page 上部、全 featured を新しい順に stack、個別 close 可) と NewsAside (top page 右ペイン、最新 5 件 compact list) の表示仕様は `frontend.md` の「Shell」 を参照。

news data source 側の補足: NotificationBar 掲載対象は **`featured` フラグ** (= `global.yml` の `top_news` slug whitelist に該当) で判定する。category とは独立した軸で、category が `announcement` であっても featured でなければ NotificationBar に出さない。逆に featured なら category を問わず出る (ddbj 側のみ運用、`global.yml` メンテナで決まる)。

### /news 一覧 + facet

`app/features/news/` 配下で実装する (`architecture.md` zones に準拠して `app/features/` 内に閉じる)。次の責務に分割する:

| ファイル | 役割 |
|---|---|
| `news-list.tsx` | Toolbar + NewsList + Pagination の組立て |
| `news-row.tsx` | 1 行 (date / title / featured バッジ / source / category Tag) |
| `facet-panel.tsx` | 4 グループ FacetGroup (category / source / year / service) の配置 |
| `facet-url-state.ts` | facet ↔ URL params の双方向 helper (純粋関数) |
| `use-news-list.ts` | TanStack Query で /api/news を取得、facet 適用 |

`AppliedFilters` / `FacetGroup` / `FacetRow` は `app/ui/` の primitive を利用する。`NewsCategory` → i18n key の写像 helper (`categoryLabelKey`) は `app/lib/i18n/category-label.ts` が SSOT。

routing 側 (`app/routes/news/route.tsx`) は loader を持たず、URL から facet state を組み立てて `useNewsList(lang, facet)` に渡すだけ。lang は cookie で決まる (`i18n.md`)。

pagination は `app/ui/pagination.tsx` を使い、1 page 20 件 (`NEWS_PAGE_SIZE`)、URL に `?page=` で反映する。facet と pagination を同時に変えた場合は URL を 1 回で更新する。

## cache の schema migration

`NewsCache.schemaVersion` を `z.literal(3)` で固定する。schema を更新する際は次の運用を取る:

1. `app/schemas/api-bff/news.ts` の `schemaVersion` を `4` に上げ、新 field を追加
2. server 起動時、disk cache が `schemaVersion: 3` (旧) なら `safeParse` 失敗 → 空 cache から再構築 (起動直後 initial sync で全件取得)
3. 旧 file は上書き保存される (古い schema を後方互換で持たない、シンプル化優先)

`tests/unit/server/news/cache.test.ts` の "schema mismatch" ケースで「任意の旧 cache file を渡しても、起動が成功し空 cache から復元される」 挙動を担保する。

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
| `tests/unit/server/news/normalize.test.ts` | front matter parse、tag → NewsCategory 写像、url 組み立て、retire_time 解析、`published: false` 除外 |
| `tests/unit/server/news/cache.test.ts` | disk load (file 不在 / 破損 / schema 不一致) → 空 cache、`replaceItemsForSource` で他 source の items を保持しつつ差し替え、filter (category / source / year / service / lang) |
| `tests/unit/server/news/pair.test.ts` | ja のみ / en のみ / 両方ある場合の slug ペアリング |
| `tests/unit/server/news/featured.test.ts` | `global.yml` parser: 正常 / 末尾空白 / 空 array / 不在 / malformed YAML / `path` が non-string / BOM 付きの 7 ケース |
| `tests/unit/server/news/git-sync.test.ts` | 子プロセス起動 API を inject 可能にして mock、clone / pull / rev-parse の成功・失敗を網羅 |

### PBT

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/news/normalize-mapping.pbt.test.ts` | 任意の tag 配列に対して `tagsToCategory(source, tags)` が `NewsCategory.options` のいずれかを返す、mapping 表に列挙した tag は対応 category を返す、source ごとに mapping が独立している |
