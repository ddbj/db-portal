# News

`ddbj/www` リポジトリの `_news/{ja,en}/*.md` を BFF が mirror し、 全件 disk cache を保持する。 ブラウザは BFF の `/api/news` だけを叩く。 GitHub API は BFF が背面で扱い、 portal が GitHub に対する rate limit や CORS を表に出さない。

データフロー全体図は `architecture.md §7` を、 デザインは `.claude/docs/design/screens/10-news.notes.md` を参照する。

## 1. 方針

| 項目 | 値 |
|---|---|
| 取得対象 | `ddbj/www` の `_news/{ja,en}/*.md` (リリース版はこの 1 source のみ) |
| 取得方式 | 全件 cache + GitHub Compare API で差分 file 取得 |
| ポーリング間隔 | 30 分 (`DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS=1800`) |
| 起動時挙動 | disk cache を即 load → 5 秒後に初回 fetch → 以降ポーリング |
| 変更検出 | GitHub Commits API で `_news/{ja,en}` の最新 commit SHA を取得し、 前回値と比較 |
| 差分時 fetch | Compare API で変更 file 一覧を取り、 変更分だけ再 fetch (初回 / SHA 不明時は全件) |
| cache 永続化 | `<DB_PORTAL_NEWS_CACHE_DIR>/news.json`、 起動時に load して即応答可 |
| schema migration | disk cache に `schemaVersion` を持たせ、 不一致なら空 cache から再構築 |
| ja/en pairing | slug でペアリング (`19961123` / `19961123-e` → 同一 NewsItem) |
| 正規化 | front matter の `tags` を `NewsCategory` enum に写像、 原 tag は `rawTags` で保持 |
| API | `GET /api/news?lang=&category=&year=&service=` で cache を filter して返す |

## 2. データモデル

`app/schemas/api-bff/news.ts` の Zod schema が SSOT。 BFF (`server/news/`) と client (`app/lib/api/news.ts`) で共用する境界 (`architecture.md §3.1`)。

```ts
const NewsCategory = z.enum([
  "announcement",  // 重要告知 → NotificationBar に出す
  "release",       // リリースノート
  "maintenance",   // メンテナンス告知
  "event",         // イベント
  "news",          // その他 (default fallback)
])

const NewsItem = z.object({
  id: z.string().min(1),                  // slug、 ja/en 共通の pairId として機能
  source: z.literal("ddbj"),              // リリース版は ddbj のみ
  category: NewsCategory,                 // 正規化後 (UI の分配判定に使う)
  publishedAt: z.string().datetime(),     // ISO 8601、 front matter の `date`
  retireTime: z.string().datetime().optional(),  // NotificationBar 表示終了基準
  title: z.object({ ja: z.string(), en: z.string() }),
  summary: z.object({ ja: z.string(), en: z.string() }).optional(),
  url: z.object({ ja: z.string().url().optional(), en: z.string().url().optional() }).optional(),
  db: z.array(z.string()).default([]),    // 関連 DB の slug 配列 (facet で使う)
  rawTags: z.object({ ja: z.array(z.string()).default([]), en: z.array(z.string()).default([]) }),
})

const NewsCache = z.object({
  schemaVersion: z.literal(1),
  source: z.literal("ddbj"),
  lastCommitSha: z.record(z.enum(["ja", "en"]), z.string().nullable()),
  lastFetchedAt: z.string().datetime(),
  items: z.array(NewsItem),
})
```

### 2.1 ja/en pair の id

slug は ddbj/www の file 名から導出する:

- `_news/ja/1996-06-21.md` → slug `1996-06-21`
- `_news/en/1996-06-21-e.md` → slug `1996-06-21` (末尾 `-e` を削除)
- `_news/ja/2024-04-01_2.md` → slug `2024-04-01_2`
- `_news/en/2024-04-01_2-e.md` → slug `2024-04-01_2`

同一 slug の ja / en があればペアリングして 1 件の `NewsItem` にする。 片方しか無ければ title.en (もしくは title.ja) を空文字で持ち、 UI 側で fallback する (`newsItemTitle` helper、 §7.1 参照)。

### 2.2 url の組み立て

front matter に明示的な URL は無い。 portal は次の規約で URL を組み立てる:

```
url.ja = https://www.ddbj.nig.ac.jp/news/ja/${slug}.html
url.en = https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html
```

該当 file が無い言語側は省略する (`url.ja` のみ / `url.en` のみ)。

## 3. 取得フロー

### 3.1 起動時

1. `server/news/cache.ts` が `<DB_PORTAL_NEWS_CACHE_DIR>/news.json` を読む
   - file が無い / `schemaVersion` 不一致 / parse 失敗のいずれも空 cache から start
2. 即座に `/api/news` を応答可能 (GitHub API を待たない、 cold start を遅らせない)
3. `setTimeout(checkAndUpdate, 5_000)` で 5 秒後に最初の fetch を実行
   - cold start に query を載せたくない / disk cache が空でも 5 秒で構築が走る、 の両立
4. 以降 `setInterval(checkAndUpdate, intervalMs)` で polling

### 3.2 差分検出 (checkAndUpdate)

GitHub Commits API で対象 path の最新 commit SHA を取得する:

```
GET /repos/{owner}/{repo}/commits?path=_news/ja&per_page=1&sha={branch}
GET /repos/{owner}/{repo}/commits?path=_news/en&per_page=1&sha={branch}
```

各レスポンス先頭の `sha` を `lastCommitSha.{ja,en}` と比較する。 両方変わっていなければ何もしない。

### 3.3 差分 file 取得

ja / en どちらかでも SHA が変わっていた場合:

- `lastCommitSha.{ja,en}` のどちらかが `null` (初回起動 + 空 cache) なら **全件取得** (`GET /repos/{owner}/{repo}/contents/_news/{lang}?ref={branch}` から file 一覧を取り、 各 `download_url` から markdown を fetch)
- そうでなければ `GET /repos/{owner}/{repo}/compare/{base}...{head}` で変更 file の一覧を取得し、 変更 / 追加 / 削除された file だけ fetch / cache update

`If-None-Match` (ETag) を file 単位で送ると変更されていない file は 304 で返る。 これにより rate limit 消費を抑える。

### 3.4 正規化 (normalize)

各 markdown の front matter を YAML として parse し、 NewsItem に写す。

- `title` → `title.{ja|en}` (該当言語側に格納)
- `date` → `publishedAt` (タイムゾーン情報込みで ISO 8601 にする)
- `retire_time` → `retireTime`
- `db` → `db` (文字列の正規化: 小文字化 + trim、 `agd  ` のような余分な空白は除去)
- `tags` → `rawTags.{ja|en}` (原文配列のまま) + `category` (写像)
- `lang` → 受信時に自明 (`_news/ja` か `_news/en` か)

front matter の `category:` field は ddbj/www 側ではほぼ "news" 固定で portal の `NewsCategory` 分類とは別物。 portal の `category` は `tags` 配列からの写像 (§4) のみで決定する。

## 4. tag → NewsCategory 写像

ddbj/www の `tags:` は ja / en で語彙が異なり、 同義語の揺れもある (`お知らせ` と `重要なお知らせ`、 `Maintenance` と `Maintenance / Network`)。 portal は次の表で `NewsCategory` に正規化する。

| 含まれる tag (大文字小文字 / 前後 trim 後の部分一致) | category |
|---|---|
| `重要` / `Announcement` / `Notice` | `announcement` |
| `リリース` / `Release` / `公開` | `release` |
| `メンテナンス` / `Maintenance` / `障害` / `復旧` / `Incident` | `maintenance` |
| `イベント` / `Event` / `セミナー` / `Workshop` | `event` |
| 上記いずれもなし | `news` |

写像は次の順で行う:

1. ja / en の rawTags を 1 配列に結合
2. 各 tag に対して上表の正規表現 (case-insensitive) を上から順に試す
3. 最初にマッチした enum を採用、 マッチが無ければ `news`

`retireTime` を過ぎた item の `category` は変えない (`announcement` のまま)。 NotificationBar 側で `retireTime` を見て表示から外す (§7.1)。

写像ルールは `server/news/normalize.ts` の `tagsToCategory()` が一手に担う。 ddbj/www 側で新しい tag が追加されたら fallback の `news` に落ちる (UI を壊さない)。

## 5. facet 設計

`/news` 画面の facet sidebar は次の 4 グループで構成する (`.claude/docs/design/screens/10-news.notes.md`):

| facet | 元 field | 値の集合 |
|---|---|---|
| 種別 (category) | `category` | `NewsCategory` enum 5 種、 cache から実出現分のみ |
| ソース | `source` | `"ddbj"` 1 種 (リリース版)、 将来 `dbcls` 追加余地あり |
| 年 | `publishedAt` の年 | cache から実出現分のみ、 降順 |
| サービス | `db` | `db` 配列の和集合、 文字列 sort |

複数選択は OR、 異なる facet 同士は AND で結ぶ (NCBI 流の faceted search に準拠)。 chip は AppliedFilters に並べ、 1 chip で 1 値を解除可能。

URL params との同期 (`facet-url-state.ts`):

```
/news?category=announcement,release&year=2024,2025&service=bioproject,biosample
```

`,` separated。 順序は alphabet sort で安定化 (URL diff が小さく保たれる)。

## 6. /api/news エンドポイント

`server/api/news.ts` が cache を filter して返す。 全 query を AND で適用する。

| query | 型 | 動作 |
|---|---|---|
| `category` | comma separated NewsCategory | いずれかに一致する item |
| `lang` | `ja` または `en` | 該当言語の title / summary を持つ item に絞る (両言語持ちは常に通る) |
| `year` | comma separated YYYY | publishedAt の年が一致 |
| `service` | comma separated db slug | `db` 配列に いずれか含む item |

`Cache-Control: public, max-age=60` を付ける (ブラウザの過剰呼び出しを抑制、 server cache は 30 分間隔で更新)。 SSR loader は `fetch(new URL("/api/news", ...))` で BFF を経由する (`architecture.md §4` zones)。

## 7. UI 統合

### 7.1 NotificationBar (全 page 上部)

`/api/news` の上位レスポンスから次の条件を満たす 1 件を表示する:

- `category === "announcement"`
- `retireTime` が無いか、 `retireTime > now`
- sessionStorage `dbPortal.notificationBar.dismissed` (string id 配列) に含まれていない

複数件が条件を満たす場合は `publishedAt` 降順で先頭。 close button で次の候補へ、 全て閉じれば bar 自体を hide する。 仕様詳細は `shell.md §4`。

### 7.2 NewsAside (top page 右ペイン)

`/api/news` 上位 8 件 (date 降順、 facet 無し) を compact list で表示し、 「すべて見る」 リンクで `/news` に飛ばす。 仕様詳細は `shell.md §5`。

### 7.3 /news 一覧 + facet

`app/features/news/` 配下で実装する (`architecture.md §3.2` zones に準拠して `app/features/` 内に閉じる)。

```
app/features/news/
├── news-list.tsx        ← Toolbar + NewsList + Pagination の組立て
├── news-row.tsx         ← 1 行 (date / title / 重要 tag / source / category Tag)
├── facet-panel.tsx      ← 4 グループ FacetGroup の配置
├── facet-item.tsx       ← 1 item のチェックボックス + count
├── applied-filters.tsx  ← 適用中 chip の表示と解除
├── facet-url-state.ts   ← facet ↔ URL params の双方向 helper (純粋関数)
├── use-news-list.ts     ← TanStack Query で /api/news を取得、 facet 適用
└── index.ts
```

routing 側 (`app/routes/news/route.tsx`) は loader で `loadAuth(request)` 等の global state を取り、 children に `app/features/news` の component を組み合わせる。 ja / en の id 二重宣言は `app/routes.ts` で行い、 lang は handle (`routes/lang-en/layout.tsx` の `handle.lang = "en"`) で決まる (`i18n.md §2.3`)。

pagination は `app/ui/pagination.tsx` を使い、 1 page 20 件、 URL に `?page=` で反映する。 facet と pagination を同時に変えた場合は URL を 1 回で更新する。

## 8. cache の schema migration

`NewsCache.schemaVersion` を `z.literal(1)` で固定する。 schema を更新する際は次の運用を取る:

1. `app/schemas/api-bff/news.ts` の `schemaVersion` を `2` に上げ、 新 field を追加
2. server 起動時、 disk cache が `schemaVersion: 1` (旧) なら parse 失敗 → 空 cache から再構築 (5 秒後 fetch で全件再取得)
3. 旧 file は上書き保存される (古い schema を後方互換で持たない、 シンプル化優先)

PBT (`tests/pbt/server/news/cache-migration.pbt.test.ts`) で「任意の旧 cache file を渡しても、 起動が成功し空 cache から復元される」 不変量を担保する。

## 9. 環境変数

`.claude/docs/env-policy.md` 準拠の `DB_PORTAL_` prefix。

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_NEWS_MIRROR_REPO` | `ddbj/www` | 取得対象 (owner/repo) |
| `DB_PORTAL_NEWS_MIRROR_BRANCH` | `main` | branch |
| `DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS` | `1800` (30 分) | ポーリング間隔 |
| `DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` | (空) | GitHub PAT (rate limit 緩和、 staging / production で設定) |
| `DB_PORTAL_NEWS_CACHE_DIR` | `/var/cache/db-portal/news` | disk cache 配置先 |

GitHub API rate limit:

- 認証なし: 60 req/h/IP
- PAT 認証: 5000 req/h

通常運用では 30 分間隔 × 2 path = 4 req/h で commit SHA check のみ。 差分時の Compare API + file 単位 fetch を加味しても 100 req/h 程度。 認証なしでも回るが、 staging / production では rate limit の余裕を持つために PAT を推奨。

### 9.1 secret の取扱い

`DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN` は server-only。 `VITE_` 接頭辞は付けない (`env-policy.md §7` 参照)。 production env file には `CHANGE_ME` placeholder を置き、 deploy 時に上書きする。

## 10. テスト

外部境界 (GitHub API / disk FS / 時刻) のみ mock する (`.claude/docs/test-policy.md §3`)。 内部関数 (normalize / cache filter / pair) は mock しない。

### 10.1 unit (Vitest + msw)

| ファイル | 内容 |
|---|---|
| `tests/unit/server/news/normalize.test.ts` | front matter parse、 tag → NewsCategory 写像、 url 組み立て、 retire_time 解析 |
| `tests/unit/server/news/cache.test.ts` | disk load (file 不在 / 破損 / schema 不一致) → 空 cache、 update で in-memory + disk 両方更新、 filter (category / year / service / lang) |
| `tests/unit/server/news/pair.test.ts` | ja のみ / en のみ / 両方ある場合の slug ペアリング |
| `tests/unit/server/news/github-client.test.ts` | msw で Commits API / Compare API / Contents API のレスポンスを fixture 化、 ETag handling |
| `tests/unit/server/news/mirror.test.ts` | timer mock で 5 秒後 fetch → 30 分間隔、 SHA 同一なら no-op |

### 10.2 PBT (fast-check)

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/news/normalize-mapping.pbt.test.ts` | 任意の tag 配列に対して `tagsToCategory()` が冪等 (`tagsToCategory(tags) === tagsToCategory([tagsToCategory(tags)])` 型の自己同型)、 全 tag 出力が enum 5 種のいずれかに収まる |
| `tests/pbt/server/news/pair-symmetry.pbt.test.ts` | 任意の `{ ja, en }` slug ペア生成器で、 ペアリング後の item.id が ja / en どちらから入っても等しい |
| `tests/pbt/server/news/sort-order.pbt.test.ts` | 任意の date 配列が降順 sort 後に「より新しい item が先」 を満たす |
| `tests/pbt/server/news/cache-migration.pbt.test.ts` | 任意の旧 schema cache JSON (`schemaVersion: 0` 等) で起動が成功し、 空 cache から復元される |

### 10.3 E2E (Playwright on staging)

| ID | 内容 |
|---|---|
| `S-NEWS-01` | `/news` を開き一覧表示、 default で date 降順 |
| `S-NEWS-02` | facet で category / year / service 絞り込み、 URL に `?category=...` 反映 |
| `S-NEWS-03` | NotificationBar に announcement category が表示、 close で次の 1 件 |
| `S-NEWS-04` | top page 右ペインに 8 件 + 「すべて見る」 リンク |
| `E-NEWS-01` | GitHub API 障害時、 disk cache から応答 |
| `E-NEWS-02` | 不正 front matter (date が欠落 等) で起動時に該当 item を skip + log warn |

## 11. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §5` | BFF 責務分離 (news mirror は BFF) |
| `architecture.md §7` | News データフロー全体図 |
| `shell.md §4` | NotificationBar の表示 / dismiss 仕様 |
| `shell.md §5` | NewsAside の表示仕様 |
| `i18n.md §2` | route id 二重宣言 + handle で lang 決定 |
| `api-types.md §2.2` | `app/lib/api/news.ts` (client wrapper) の位置付け |
