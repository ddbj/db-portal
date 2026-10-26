# Entity list mirror

BSI の BFF が DDBJ / DBCLS の upstream (git repository) を mirror し、1 つの endpoint で返す entity list の共通規約。news ([news.md](news.md)) と services ([services.md](services.md)) はこの仕組みの instance で、cache の構造、facet の集計、URL の規約、source 軸の表示を共有する。

## データの流れ

BFF が upstream の git repository を clone / pull し、source ごとに正規化して 2 段 cache (in-memory と disk) に保存する。UI は `/api/{entity}` の response を client hook 経由で受け取る。instance ごとの具体的な流れは [news.md § news の役割](news.md) と [services.md § services の役割](services.md) に図がある。secret を要する外部接続を BFF が引き受けて client に secret を出さない一般則は、[architecture.md](architecture.md) を参照する。

## 2 段 cache

cache は in-memory の `items` 配列と disk の JSON ファイルの 2 段で構成し、BFF が両者を atomic に同期する。BFF は起動時に disk cache をすぐに load して応答できる状態にしてから、最初の sync をバックグラウンドで始める。

- disk file が無い、parse に失敗した、`schemaVersion` が一致しない、のいずれのときも空の cache から起動する。起動を待たせないためである
- disk への書き込みは temp file に書いてから rename する。書きかけの JSON を読む状態を作らないためである
- atomic に差し替える単位は source である。source A の再構築中に、source B の items が cache から消えてはならない
- 再構築に失敗したとき (network / parse / 破損 等) は warn を log に出すだけにし、既存の cache をそのまま返し続ける

## schemaVersion 契約

- `schemaVersion` は entity ごとに number literal で固定する。値は各 entity の schema 定義を SSOT とする
- cache の形に互換性の無い変更を入れたときは、開発者が `schemaVersion` を上げる
- `schemaVersion` を上げた後は、旧形式の disk cache を後方互換で読み込まない。不一致のときは空の cache から再構築する

## cache wrapper の外向き shape

各 entity の cache の root は、`schemaVersion` (entity 固有の値)、`lastSyncSha` (source 別の HEAD)、`lastFetchedAt`、`items` を持つ。この外側の形 (wrapper) の Zod 定義 `cacheWrapper` は `app/schemas/api-bff/_shared.ts` を SSOT とし、各 entity の schema ファイルは `cacheWrapper` に自分の item schema を当てはめて entity 用の schema を作る。

## facet 軸の vocabulary

facet sidebar の 1 グループは「軸」1 つに対応する。軸は次の 4 種に分類する:

- enum: 有限の値列 (例: `source`、`category`)
- number: 数値 (例: `year`)
- string: 任意の文字列 (例: `service`)
- bool: boolean フラグ (例: `featured`)

各 entity がどの軸を使うかは、entity ごとの docs を参照する。

### source 軸

`source` 軸の enum 値は `app/schemas/api-bff/_shared.ts` の `BsiSource` を SSOT とし、各 entity の schema ファイルは同じ値を再 export する。facet sidebar の source の色点と、AppliedFilters の chip の表示は、news と services で同じ規約にする。

## URL state と件数

- 同じ facet グループ内で複数の値を選ぶと OR、異なる facet グループ間は AND で結ぶ
- グループ G の選択肢 v の件数は、G 自身の選択を除いた他の全グループの絞り込みを適用した結果のうち、v を持つ item の数である (self-exclusion)
- G 内で何を選んでも G の件数は変わらない。他のグループで絞り込むと、G の件数はそれに連動して変わる
- pagination と facet を同時に変えたとき、URL の更新は 1 回にまとめる。ブラウザの履歴を 2 件に分けない
- 複数の値は `,` 区切りで serialize する。enum / string 軸の値は alphabet 順、number 軸の値は降順に並べる

## sort

各 entity は選べる sort key の一覧 `values` と既定値 `default` を宣言する。hook はその宣言から sort の closure を内部で作る。sort key の具体的な値は entity ごとの docs を参照する。

## BFF client

- `app/lib/api/{entity}.ts` の各 entity client は、同じ helper を通して「request の組み立て (`buildRequestInit`) → `fetch` → error の変換 (`toAPIError`) → Zod validate」の順に処理する
- response の検証に失敗したとき、または HTTP status が 2xx でないときは、client は `APIError` を throw する
- query param の組み立て (`,` 区切り等) は § URL state と件数 の規約に従う

## 制約

news と services に共通する制約:

- source 単位の atomic swap: source A の再構築中に source B の items が消えない
- sort は安定である: 同じ key を持つ item の相対順を保つ
- facet の件数は self-exclusion で集計する
- cache が空でも `/api/{entity}` は空の `items` を返し、throw しない
