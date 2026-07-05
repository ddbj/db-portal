# Entity list mirror

BSI が DDBJ / DBCLS の上流を mirror して 1 endpoint で配る **entity list** 機構の共通規約。 [news.md](news.md) と [services.md](services.md) はこの機構の instance で、 cache 構造 / facet 集計 / URL 規約 / source 軸の表示を共有する。

## データの流れ

upstream (git repo) を BFF が clone / pull し、 source ごとに正規化して 2 段 cache (in-memory + disk) に流し込み、 `/api/{entity}` から client hook を経由して UI に配る。 各 instance の具体的なフロー図は [news.md § news の役割](news.md) と [services.md § services の役割](services.md) を参照する。 secret を要する外部接続を BFF が遮蔽する一般則は [architecture.md](architecture.md) を参照する。

## 2 段 cache

cache は in-memory の `items` 配列と disk JSON ファイルの 2 段構成で、 両者を atomic に同期する。 起動時に disk cache を即 load して応答可能にしてから、 initial sync を背後で開始する。

- disk file 不在 / parse 失敗 / `schemaVersion` 不一致 のいずれも空 cache から start する。 cold start を待たせない
- 永続層は temp file + rename で書き、 中途半端な JSON を read してしまう状態を作らない
- atomic 差し替えの単位は **source**。 source A の再構築中に source B の items を喪失してはならない
- 再構築失敗 (network / parse / 破損 等) は warn にとどめ、 既存 cache をそのまま提供する

## schemaVersion 契約

- entity ごとに number literal で固定する (各 entity の schema 定義が SSOT)
- cache 形が breaking change したときに bump する
- bump 後の disk cache は旧形を後方互換でロードしない。 不一致時は空 cache から再構築する

## cache wrapper の外向き shape

各 entity の cache root は `schemaVersion` (entity 固有) / `lastSyncSha` (source 別 HEAD) / `lastFetchedAt` / `items` を持つ。 wrapper の Zod 定義 (`cacheWrapper`) と outer shape の SSOT は `app/schemas/api-bff/_shared.ts`。 各 entity ファイルは item schema を差し込んで再生成する。

## facet 軸の vocabulary

facet sidebar の 1 グループは「軸」 1 つに対応する。 軸は次の 4 種に分類する:

- **enum** — 有限の値列 (e.g. `source`, `category`)
- **number** — 数値 (e.g. `year`)
- **string** — 任意の文字列 (e.g. `service`)
- **bool** — boolean フラグ (e.g. `featured`)

各 entity が使う軸の組み合わせは entity 固有 docs を参照する。

### source 軸

`source` 軸の enum 値の SSOT は `app/schemas/api-bff/_shared.ts` の `BsiSource` (各 entity ファイルは同値を再 export)。 facet sidebar の色点表示と AppliedFilters chip は両 entity で同一規約。

## URL state と件数

- 同 facet グループ内の複数選択は OR、 異なる facet グループ間は AND で結ぶ
- グループ G の option v の件数は **G を除く全 facet を適用した結果集合のうち v を持つ件数** とする (self-exclusion)
- G 内での選択は G 自身の件数に影響しない。 他グループの絞り込みは G の件数に連動する
- pagination と facet を同時に変えた場合、 URL は 1 回で更新する (履歴を分割しない)
- 複数値は `,` separated、 順序は **enum / string 軸は alphabet 順、 number 軸は降順** で serialize する

## sort

各 entity が `{ values, default }` を宣言する。 hook 内部で sort closure を構築する。 sort key の具体は entity 固有 docs を参照する。

## BFF client

- `app/lib/api/{entity}.ts` の各 entity client は同じ helper (`buildRequestInit → fetch → toAPIError → Zod validate`) を経由する
- response の検証失敗 / HTTP non-2xx はすべて `APIError` で throw する
- query param の組み立て規約 (`,` separated 等) は § URL state と件数 を参照する

## 不変量

- per-source atomic swap (source A 再構築中に source B が消えない)
- sort は安定 (同 key の item の相対順は保たれる)
- facet count は self-exclusion 集計
- 空 cache でも `/api/{entity}` は空 items を返し throw しない
