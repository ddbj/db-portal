# ニュース・お知らせ

DDBJ DB ポータルのニュース表示は [`ddbj/www`](https://github.com/ddbj/www) リポジトリを SSOT としてミラーする。本リポジトリは独立した CMS や別管理画面は持たない。

## スコープ

- ホーム右ペインの「News」一覧
- 全件アーカイブページ `/news`（年 / 種別 / サービス / タグでファセット絞り込み）
- 全ページ共通の上部 NotificationBar（重要告知のみ）

`/news/:slug` のような portal 内記事詳細ページは持たない（外部の `https://www.ddbj.nig.ac.jp/news/{lang}/{slug}.html` を新規タブで開く）。

## データソース

`ddbj/www` の `_news/ja/yyyy-mm-dd[_N].md` と `_news/en/yyyy-mm-dd[_N]-e.md` を 1 ニュース = 1 ファイルとして読み取る。GitHub のデフォルトブランチ（`main`）が本番反映元。`NEWS_MIRROR_BRANCH` 環境変数で上書き可能。

### 期待する front matter

| キー | 型 | 必須 | 用途 |
|---|---|---|---|
| `title` | string | 必須 | ニュースタイトル |
| `date` | ISO 8601 | 必須 | 公開日時 |
| `retire_time` | ISO 8601 | 任意 | これを過ぎたら現役表示枠から除外（後述） |
| `db` | string[] | 任意 | 関係するサービス名（`top`, `ddbj`, `dra`, `bioproject`, `biosample`, `jga`, `agd`, `gea`, `metabobank` 等） |
| `tags` | string[] | 任意 | 分類用ラベル（`Announcement`, `お知らせ`, `メンテナンス`, `データ公開` 等） |
| `lang` | `ja` / `en` | 任意 | ファイルパス由来で判定するので front matter からは参照しない |
| `category` | string | 任意 | `news` 固定。読み取らない |
| `layout` | string | 任意 | Jekyll 用。読み取らない |

front matter に `title` または `date` が欠けているファイルはスキップし、`console.warn` でログを残す。

### ja/en ペアリング

同じ日付の `.md` と `-e.md` を slug で揃え、両方存在する場合は `pairId` で相互参照する。片方しか無い場合は単一言語アイテムとして残す。en リクエスト時に対訳が無いものは結果に含めない（ja の文字列にフォールバックしない）。

## ミラー機構

`src/server/news-mirror/` がサーバ専用モジュール。React Router v7 の loader（サーバ専用パス）から `searchNews()` / `ensureWorkerStarted()` を呼ぶことで初回起動と検索を行う。

### 同期フロー

```
boot
 ├ loadFromDisk()  ← data/news-cache.json があれば即 hot snapshot
 ├ runSync()  (初回)
 └ setInterval(runSync, NEWS_SYNC_INTERVAL_MS ?? 600_000)

runSync()
 ├ fetchNewsTree()                ← GitHub Git Trees API（ETag + master HEAD SHA キャッシュ）
 │    ↳ 304 / 同じ HEAD なら skip
 ├ diff = lastFileShaMap vs tree
 ├ fetchRawFile(path) × diff.length
 ├ parseNewsFile → renderMarkdown（gray-matter → remark → rehype-sanitize → rehype-stringify）
 ├ normalizeAll → linkPairs → sortItemsByDateDesc
 ├ merge with kept items (unchanged)
 ├ setSnapshot + persistToDisk (atomic via .tmp + rename)
 └ failureStreak = 0
```

### 永続化

| パス | 内容 |
|---|---|
| `data/news-cache.json` | 起動時に load してリスタート耐性を持たせる。schemaVersion=2、items + fileShas + builtAt + sourceSha を保存。`.gitignore` 対象 |
| `data/news-cache.json.tmp` | atomic write のためのテンポラリ。`rename` で原子的に差し替え |

### エラーハンドリング

- HTTP / パース失敗時は前回の snapshot を維持
- `failureStreak` を増やし、5 回連続で `console.error`、通常時は `console.warn`
- 成功すれば `failureStreak = 0` にリセット

### シングルプロセス前提

`setInterval` ベースなので、複数 Node プロセスで動かす場合は最初に起動したものだけが sync する。podman compose で 1 サービス = 1 コンテナ前提（現行構成と整合）。将来スケールアウトする場合は Redis / 共有ロック / 外部スケジューラへ切り替える。

`Symbol.for("db-portal.news-mirror.worker")` を `globalThis` に置いて HMR / 重複 import 起因の多重 interval を防いでいる。

### GitHub の認証 / rate limit

- 未認証で動く（60 req/h）。10 分間隔 + ETag 利用で完全に収まる
- `GITHUB_TOKEN` 環境変数があれば `Authorization: Bearer` を付与し、5000 req/h にする
- `X-RateLimit-Remaining` が 50 未満になった場合は警告ログのみ（停止はしない）

## 分類ルール

ddbj/www が `_data/global.yml` の `top_news` セクションで **手動キュレーション** している記事だけを `type: notification` と判定する。`_includes/header.html` で同じデータが本家サイトの黄色い上部バー（`<section class="top-news-view">`）を駆動している。

```yaml
# ddbj/www 側 _data/global.yml の例
top_news:
  ja:
    - title: DDBJ リリース 141.0，DAD リリース 111.0 完成
      path: 2026-04-08
    - title: 塩基配列データ登録における INSDC minimal specifications を策定
      path: 2026-03-19
  en:
    - title: DDBJ Rel. 141.0, DAD Rel. 111.0 Completed
      path: 2026-04-08-e
    - title: INSDC Minimal Specifications
      path: 2026-03-19-e
```

| `top_news` 該当 | type | 表示先 |
|---|---|---|
| あり（ja / en それぞれの slug が一致） | `notification` | 上部 NotificationBar + `/news` 内 type フィルタ |
| なし | `news` | ホーム右ペイン + `/news` 内 type フィルタ |

front matter の `tags` 値（`Announcement`, `お知らせ`, `メンテナンス`, `データ公開` 等）は **分類には使わない**。`tags` はあくまでファセット絞り込み軸として `/news` で提供する。

### slug マッチング

`top_news[ja]` の `path` は `yyyy-mm-dd` で `_news/ja/<path>.md` を指す。`top_news[en]` は `yyyy-mm-dd-e` で `_news/en/<path>.md` を指す。en は `-e` を剥がして slug に正規化してから ja と同じ Set 内のキーとする。

YAML パーサ（js-yaml）は `2026-04-08` のような ISO 日付っぽい値を Date オブジェクトに自動変換するので、`top-news.ts` の `pathToString()` で Date → `yyyy-mm-dd` への戻し変換も実装している。

### 取得

`_data/global.yml` も `_news/` 以下のファイルと同じ runSync の中で raw URL から取得する。fetch 失敗時は `EMPTY_TOP_NEWS` にフォールバックして全件 news 扱いにする（致命的にはしない）。

### 将来拡張余地

- `tags` ベースの判定では細かい運用要件を表現しにくいため、将来 ddbj/www 側に独立した front matter（例 `type: notification`、`pickup: true`）を導入する案がある。導入時は `normalize.ts` の `classify()` を拡張する
- `retire_time` の意味も notification では「掲載終了」ではなく「重要度が下がる時点」として再定義する余地がある

## UI 配置

### 上部 NotificationBar（全ページ）

- `src/components/layout/NotificationBar.tsx`
- `src/root.tsx` の loader で `searchNews({ type: "notification", retired: "all" })` を取得し、`AppShell` で Header 直下に縦スタック表示。本家 ddbj.nig.ac.jp の `<section class="top-news-view">` と同じく `retire_time` を無視する（`top_news` は手動キュレーションのため、編集者が残している限り掲載する）
- 1 件 1 行、左に日付バッジ、中央にタイトル（外部リンク）、右に × dismiss ボタン
- `× dismiss` 押下で `localStorage["news.dismissed"]` に id を追加。次回ロードでも非表示
- SSR / CSR の hydration mismatch を避けるため、初期描画は全件表示し、`useEffect` で localStorage を読んで filter する
- `retireTime < now` のものは API 側で既に除外されているので client 側で追加判定しない

### ホーム右ペイン（`/`）

- レイアウト: hero（検索ボックス、中央、最大幅 3xl）→ 2-col grid（`lg:grid-cols-[1fr_320px]`）
- 左 main: service grid（lg では 2-col カード）
- 右 aside: NewsList（compact variant, 8 件, `lg:sticky lg:top-6`）
- 「もっと見る →」リンクは `/news` へ
- mobile / tablet では right pane が main の下にスタック

### `/news` 全件アーカイブ

- レイアウト: `lg:grid-cols-[240px_1fr]`、左 facets + 右 hits
- facets: type（notification / news）、year（降順、最近 10 年）、db（チェックボックス）、tag（チェックボックス、上位 10 + 「もっと見る」）
- URL クエリで状態を保持: `?type=&year=&db=csv&tag=csv`（`useSearchParams` で同期）
- 個別記事クリック → 外部 `https://www.ddbj.nig.ac.jp/news/{lang}/{slug}.html` を新規タブで開く

## URL / API 仕様

### `/news`（HTML）

| param | 型 | デフォルト |
|---|---|---|
| `year` | yyyy | all |
| `type` | `notification` \| `news` | all |
| `db` | csv | all |
| `tag` | csv | all |

`retired=all` 相当の挙動（過去ニュースも見える）。SSR loader で初期描画、client は `useSearchParams` で URL ↔ 状態同期。

### `/api/news`（JSON）

```
GET /api/news?lang=ja&type=news&db=ddbj,top&tag=データ公開&year=2026&retired=0&limit=8&cursor=...
```

| param | 型 | 既定 | 備考 |
|---|---|---|---|
| `lang` | `ja` \| `en` | リクエスト由来 | cookie / Accept-Language |
| `type` | `notification` \| `news` | all | |
| `db` | csv | all | any-of 一致 |
| `tag` | csv | all | any-of 一致 |
| `year` | yyyy | all | |
| `retired` | `0` \| `1` \| `all` | `0` | デフォルトで `retire_time < now` を除外 |
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
    "tag": [{"value": "お知らせ", "count": 30}, ...],
    "type": [{"value": "notification", "count": 1}, {"value": "news", "count": 122}]
  },
  "builtAt": "2026-05-11T...",
  "nextCursor": "..."
}
```

`Cache-Control: no-store`。 SSR 側 loader は `/api/news` を経由せず `searchNews()` を直接呼ぶ。クライアント側 TanStack Query が `/api/news` を叩く。

## 環境変数

| 変数 | デフォルト | 用途 |
|---|---|---|
| `GITHUB_TOKEN` | 未設定 | GitHub API 認証（rate limit 緩和、optional） |
| `NEWS_SYNC_INTERVAL_MS` | `600000`（10 分） | ミラー同期間隔 |
| `NEWS_CACHE_DIR` | `./data` | `news-cache.json` 保存先 |
| `NEWS_DISABLE` | 未設定 | `1` で worker 起動を抑止（test/CI 用） |
| `NEWS_MIRROR_BRANCH` | `main` | ddbj/www の取得元ブランチ |
| `NEWS_MIRROR_MAX_FILES_PER_LANG` | `400` | 各言語あたり最新何件までミラーするか（古いアーカイブは ddbj.nig.ac.jp 側で閲覧） |

詳細は [deployment.md](./deployment.md) も参照。

## 既知の制約

- シングルプロセス前提（前述）
- portal 内記事詳細は持たない（外部リンクで遷移）
- ja / en の対応が欠けているニュースは、欠けている言語側では表示されない（フォールバックしない）
- `_news/{ja,en}/_N` の同日複数ファイルにも対応するが、現状 ddbj/www にこのパターンは少ない

## 将来拡張

- `type: notification` 等の独立軸を ddbj/www 側に導入する PR
- portal 内記事詳細ページ `/news/:slug`（bodyHtml は既に snapshot に保持済み）
- 横断検索結果に news を混ぜる（DDBJ Search API への統合）
- 多プロセス対応（Redis / 共有ロック）
