# ニュース・お知らせ

DDBJ DB ポータルのニュース表示は、複数の外部リポジトリを SSOT としてミラーする。本リポジトリは独立した CMS や別管理画面は持たない。

現時点でミラー対象は 2 ソース:

- [`ddbj/www`](https://github.com/ddbj/www) — DDBJ の公式 news（`_news/{ja,en}/*.md`）
- [`dbcls/website`](https://github.com/dbcls/website) — DBCLS の公式 posts（`_posts/{ja,en}/*.md`）

両ソースの items は時系列降順で merge され、UI 上は同列に並ぶ。`source` ファセットで絞り込み可能。

## スコープ

- ホーム右ペインの「News」一覧（DDBJ / DBCLS 混在表示）
- 全件アーカイブページ `/news`（年 / 種別 / ソース / サービス / タグでファセット絞り込み）
- ホーム画面の上部 NotificationBar（DDBJ の重要告知のみ）

`/news/:slug` のような portal 内記事詳細ページは持たない。各 source の公開 URL を新規タブで開く。

## データソース

### ddbj/www（source 値: `ddbj`）

`_news/ja/yyyy-mm-dd[_N].md` と `_news/en/yyyy-mm-dd[_N]-e.md` を 1 ニュース = 1 ファイルとして読み取る。デフォルトブランチ `main`、`NEWS_MIRROR_BRANCH` で上書き可能。

| キー | 型 | 必須 | 用途 |
|---|---|---|---|
| `title` | string | 必須 | ニュースタイトル |
| `date` | ISO 8601 | 必須 | 公開日時 |
| `retire_time` | ISO 8601 | 任意 | これを過ぎたら現役表示枠から除外 |
| `db` | string[] | 任意 | 関係するサービス名（`top`, `ddbj`, `dra`, ...） |
| `tags` | string[] | 任意 | 後述の tag canonical mapping に従って正規化 |
| `lang` | `ja` / `en` | 任意 | ファイルパス由来で判定、front matter は参照しない |

公開 URL: `https://www.ddbj.nig.ac.jp/news/{lang}/{slug}.html`

ja/en は同 slug でペアリング（`pairId` 相互参照）。`-e` 接尾辞は en 側 slug から剥がす。

### dbcls/website（source 値: `dbcls`）

`_posts/ja/yyyy-mm-dd-postN.md` と `_posts/en/yyyy-mm-dd-postN.md` を読み取る（Jekyll の `_posts` 慣習）。デフォルトブランチ `master`、`NEWS_MIRROR_DBCLS_BRANCH` で上書き可能。

| キー | 型 | 必須 | 用途 |
|---|---|---|---|
| `title` | string | 必須 | ニュースタイトル |
| `tags` | string[] | 任意 | 後述の tag canonical mapping に従って正規化 |
| `published` | boolean | 任意 | `false` のものは skip。省略時は `true` 扱い |
| `category` | `ja` / `en` | 任意 | ファイルパス由来で判定、front matter は参照しない |
| `layout` | string | 任意 | Jekyll 用、読み取らない |

**`date` フィールドは存在しない**。Jekyll 慣習に従い、ファイル名 `yyyy-mm-dd-postN` から日付を抽出し、`postN` の連番を **分オフセット**として時刻に反映する（post1 → `00:00`、post2 → `00:01`、…、JST）。これにより同日複数 post の安定ソートを保つ。N が 60 以上になった場合は時/分/秒に繰り上げる安全装置を入れる。

**`retire_time` / `db` / top_news 相当のキュレーション機構は無い**。DBCLS posts は常に `type: news` とし、NotificationBar には現れない。`db` は空配列で固定。

非規則ファイル（`template_*.md` 等、`yyyy-mm-dd-postN.md` パターンに合致しないもの）は filter で除外する。

公開 URL: Jekyll default permalink `/:categories/:year/:month/:day/:title.html` に従い、`https://dbcls.rois.ac.jp/{lang}/{Y}/{M}/{D}/{slug}.html`。

ja/en は同ファイル名でペアリング。

## Tag canonical mapping

両ソースの生 tag を統合カテゴリに正規化する。`MirroredNewsItem.tags` には canonical key のみ格納し、UI 表示時に i18n キー `news.tag.<canonical>` で言語別ラベル化する。

| canonical | i18n ja | i18n en | DDBJ 生 tag | DBCLS 生 tag |
|---|---|---|---|---|
| `announcement` | お知らせ | Announcement | `お知らせ`, `Announcement` | `public_relations` |
| `data-release` | データ公開 | Data Release | `データ公開`, `Data Release` | — |
| `maintenance` | メンテナンス | Maintenance | `メンテナンス`, `Maintenance` | — |
| `service` | サービス | Service | — | `services` |
| `event` | イベント | Event | — | `events` |
| `recruitment` | 募集 | Recruitment | — | `registration` |
| `other` | その他 | Other | — | `other` |

mapping に存在しない生 tag は `console.warn` でログを残して **drop**（item 自体は残す）。

facet bucket の `value` も canonical key を使う。UI 表示時は i18n キー `routes.news.facets.tag_<canonical>` で言語別ラベル化する。`/api/news` の `tag` query パラメータも canonical key で受ける。

## ミラー機構

`src/server/news-mirror/` がサーバ専用モジュール。React Router v7 の loader（サーバ専用パス）から `searchNews()` / `ensureWorkerStarted()` を呼ぶ。

### 同期フロー

```
boot
 ├ loadFromDisk()  ← data/news-cache.json があれば即 hot snapshot
 ├ runSync()  (初回)
 └ setInterval(runSync, NEWS_SYNC_INTERVAL_MS ?? 600_000)

runSync()
 └ Promise.allSettled で各 source 並列実行（syncSingleSource）
     ├ fetchNewsTree(cfg)                ← source 別 ETag + HEAD SHA キャッシュ
     │    ↳ 304 / 同じ HEAD なら skip
     ├ diff = lastFileShaMap[source] vs tree
     ├ fetchRawFile(cfg, path) × diff.length
     ├ parseNewsFile(cfg) → renderMarkdown
     ├ normalizeAll(cfg, topNews?) → tag canonical 化、id = ${source}-${lang}-${slug}
     └ source 別 items / fileShas を返す
 ├ source 別 items を merge
 ├ linkPairs（key = ${source}:${slug} で source 内に閉じる）
 ├ sortItemsByDateDesc
 ├ setSnapshot + persistToDisk
 └ source 別 failureStreak を更新
```

部分失敗（一方の source 取得失敗）は許容する。失敗した source は前回 snapshot 由来の items をそのまま再利用し、成功した source のみ最新化される。

### 永続化

| パス | 内容 |
|---|---|
| `data/news-cache.json` | 起動時に load。schemaVersion=3、items + fileShas (source 別 nested) + sourceShas + builtAt を保存。`.gitignore` 対象 |
| `data/news-cache.json.tmp` | atomic write 用の一時ファイル |

schemaVersion 不一致時は破棄して再同期する（旧 v2 cache は自動で破棄される）。

### エラーハンドリング

- HTTP / パース失敗時は前回の snapshot を維持
- `failureStreak` は **source 別**に持ち、5 回連続で `console.error`
- 成功すれば該当 source の `failureStreak` を 0 リセット

### シングルプロセス前提

`setInterval` ベースなので、複数 Node プロセスで動かす場合は最初に起動したものだけが sync する。`Symbol.for("db-portal.news-mirror.worker")` を `globalThis` に置いて HMR / 重複 import 起因の多重 interval を防ぐ。

### GitHub の認証 / rate limit

- 未認証で動く（60 req/h）。10 分間隔 + ETag 利用で 2 source × 2 req/sync ≦ 24 req/h なので余裕がある
- `GITHUB_TOKEN` 環境変数があれば `Authorization: Bearer` を付与し、5000 req/h にする

## 分類ルール

### type（notification / news）

- **ddbj/www**: `_data/global.yml` の `top_news` セクションで **手動キュレーション** している記事を `type: notification`、それ以外を `type: news`
- **dbcls/website**: 常に `type: news`（top_news 相当が無いため）

```yaml
# ddbj/www 側 _data/global.yml 例
top_news:
  ja:
    - title: DDBJ リリース 141.0
      path: 2026-04-08
  en:
    - title: DDBJ Rel. 141.0 Completed
      path: 2026-04-08-e
```

`top_news[en]` は `-e` を剥がして slug に正規化する。YAML パーサ（js-yaml）は `2026-04-08` のような ISO 日付っぽい値を Date オブジェクトに自動変換するので、`top-news.ts` で Date → `yyyy-mm-dd` 変換も行う。

## UI 配置

### 上部 NotificationBar（ホーム画面のみ）

- `src/components/layout/NotificationBar.tsx`
- `src/root.tsx` の loader で `searchNews({ source: ["ddbj"], type: "notification", retired: "all" })` を取得。DBCLS は明示的に対象外
- 1 件 1 行、左に日付バッジ、中央にタイトル（外部リンク）、右に × dismiss ボタン
- `× dismiss` 押下で `localStorage["news.dismissed"]` に id を追加
- SSR / CSR の hydration mismatch を避けるため、初期描画は全件表示し、`useEffect` で localStorage を読んで filter する

### ホーム右ペイン（`/`）

- レイアウト: hero（検索ボックス）→ 2-col grid（`lg:grid-cols-[1fr_320px]`）
- 右 aside: NewsList（compact variant, 8 件, `lg:sticky lg:top-6`）— DDBJ / DBCLS 混在
- 「もっと見る →」リンクは `/news` へ

### `/news` 全件アーカイブ

- レイアウト: `lg:grid-cols-[240px_1fr]`、左 facets + 右 hits
- facets: type、source（DDBJ / DBCLS）、year（降順）、db、tag（canonical 名）
- URL クエリで状態を保持: `?type=&source=csv&year=&db=csv&tag=csv`
- 個別記事クリック → source 別の公開 URL を新規タブで開く

## URL / API 仕様

### `/news`（HTML）

| param | 型 | デフォルト |
|---|---|---|
| `year` | yyyy | all |
| `type` | `notification` \| `news` | all |
| `source` | csv (`ddbj`, `dbcls`) | all |
| `db` | csv | all |
| `tag` | csv (canonical key) | all |

`retired=all` 相当の挙動。SSR loader で初期描画、client は `useSearchParams` で URL ↔ 状態同期。

### `/api/news`（JSON）

```
GET /api/news?lang=ja&type=news&source=ddbj,dbcls&db=ddbj,top&tag=announcement&year=2026&retired=0&limit=8&cursor=...
```

| param | 型 | 既定 | 備考 |
|---|---|---|---|
| `lang` | `ja` \| `en` | リクエスト由来 | cookie / Accept-Language |
| `type` | `notification` \| `news` | all | |
| `source` | csv | all | `ddbj` / `dbcls` の any-of |
| `db` | csv | all | any-of 一致（DBCLS items は db=[] のためヒットしない） |
| `tag` | csv (canonical) | all | any-of 一致 |
| `year` | yyyy | all | |
| `retired` | `0` \| `1` \| `all` | `0` | デフォルトで `retire_time < now` を除外（DBCLS は常に retired=false） |
| `limit` | int | 50 | 上限 200 |
| `cursor` | base64url | - | `{dateTime, id}` をエンコード |

レスポンス:

```json
{
  "hits": [/* MirroredNewsItem[] */],
  "total": 123,
  "facets": {
    "year": [{"value": "2026", "count": 38}, ...],
    "db": [{"value": "ddbj", "count": 80}, ...],
    "tag": [{"value": "announcement", "count": 30}, ...],
    "type": [{"value": "notification", "count": 1}, {"value": "news", "count": 122}],
    "source": [{"value": "ddbj", "count": 100}, {"value": "dbcls", "count": 23}]
  },
  "builtAt": "2026-05-11T...",
  "nextCursor": "..."
}
```

`Cache-Control: no-store`。SSR 側 loader は `/api/news` を経由せず `searchNews()` を直接呼ぶ。

### MirroredNewsItem 型

```typescript
interface MirroredNewsItem {
  id: string              // "${source}-${lang}-${slug}" 形式
  source: "ddbj" | "dbcls"
  slug: string
  lang: "ja" | "en"
  date: string            // ISO date (yyyy-mm-dd)
  dateTime: string        // ISO datetime (full)
  retireTime: string | null
  db: string[]            // ddbj のみ。dbcls items は []
  tags: CanonicalTag[]    // canonical key の配列
  title: string
  bodyHtml: string
  sourceUrl: string       // 公開サイト URL
  sourceMdUrl: string     // GitHub blob URL
  type: "notification" | "news"  // dbcls items は常に "news"
  pairId: string | null   // 同 source 内の ja/en ペア id
}
```

## 環境変数

| 変数 | デフォルト | 用途 |
|---|---|---|
| `GITHUB_TOKEN` | 未設定 | GitHub API 認証（rate limit 緩和） |
| `NEWS_SYNC_INTERVAL_MS` | `600000`（10 分） | ミラー同期間隔（全 source 共通） |
| `NEWS_CACHE_DIR` | `./data` | `news-cache.json` 保存先 |
| `NEWS_DISABLE` | 未設定 | `1` で worker 起動を抑止（test/CI 用） |
| `NEWS_MIRROR_BRANCH` | `main` | ddbj/www の取得元ブランチ |
| `NEWS_MIRROR_MAX_FILES_PER_LANG` | `400` | 各 source × 各言語の最新何件までミラーするか |
| `NEWS_MIRROR_DBCLS_ENABLED` | `1` | `0` で dbcls source を無効化 |
| `NEWS_MIRROR_DBCLS_BRANCH` | `master` | dbcls/website の取得元ブランチ |
| `NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG` | `NEWS_MIRROR_MAX_FILES_PER_LANG` の値 | dbcls 専用上限 |

詳細は [deployment.md](./deployment.md) も参照。

## 既知の制約

- シングルプロセス前提（前述）
- portal 内記事詳細は持たない（外部リンクで遷移）
- ja / en の対応が欠けているニュースは、欠けている言語側では表示されない（フォールバックしない）
- DBCLS posts の同日複数（post1, post2, ...）は分オフセットで時刻を割り当てるため、表示順は post 番号順
- DBCLS の `template_*.md` 等の非規則ファイルは filter で除外する
- 生 tag が canonical mapping に存在しない場合、その tag は warning ログ付きで drop される（item は残る）

## 将来拡張

- DBCLS 側に独立した notification キュレーション機構が導入された場合の対応
- 横断検索結果に news を混ぜる（DDBJ Search API への統合）
- 多プロセス対応（Redis / 共有ロック）
- 他データセンターからの news source 追加（NBDC 等）
