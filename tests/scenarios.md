# テストシナリオ

機能ごとにテストすべきシナリオを列挙する。方針は [tests/README.md](./README.md) を参照。

各シナリオは 3 バケツ（unit / browser / integration）のいずれかに振り分ける。機能 1-a（SR-FX）は詳細シナリオ ID 化済みで、フォーマットの見本とする。残り機能は観点レベルの箇条書きで、実装時に観点 → シナリオ ID 化する。

## テストの目的

バグを見つけるために書く。境界値・エッジケース・異常系を重点的にテストする。

## テスト対象外

以下はテスト対象外とする。

- **PC only 前提**: モバイル・タブレット対応は非対象
- **アクセシビリティ（a11y）方針**: キーボード操作・スクリーンリーダー対応は検証しない
- **JS 無効環境**: フォールバック挙動の検証は行わない
- **localStorage ブロック環境**: Safari private mode 等の動作は検証しない
- **セキュリティ方針**: CSP / XSS / CSRF の個別検証は行わない（実装時の一般対策のみ）
- **パフォーマンス目標**: LCP / TTFB / 検索レイテンシの数値目標は設けない
- **SEO 最適化**: `/search` は `noindex` のため対象外
- **他リポジトリの責務**: ddbj-search-api の内部実装（キャッシュ TTL、HTTP ステータス生成、edismax のクエリ変換効率、Solr warming 戦略等）は db-portal のテスト対象外。db-portal は `/db-portal/*` endpoint のレスポンス仕様のみに依存する

方針変更があれば docs/ 側で合意した上で、scenarios.md に組み込み直す。

## ペルソナ

| ID | 名称 | 用途 |
| --- | --- | --- |
| P-ANON | 匿名ユーザ（未ログイン） | 検索系の基本ペルソナ。全機能を利用可能 |
| P-AUTH | DDBJ Account ログイン済み | 認証まわりのみ |
| P-DEV | URL 直編集する開発者 / 上級者 | DSL 構文エラー・不正パラメータ等の異常系 |
| P-CRAWLER | クローラ | `noindex` / canonical / 301 redirect 確認 |

各機能の章冒頭で「既定ペルソナ」を宣言し、シナリオごとのペルソナ記述はデフォルトと異なる場合のみ明記する。

## 共通検証ルール

シナリオごとに繰り返し書かないが、全レスポンスで検証する。

- エラーレスポンスは RFC 9457 形式（`application/problem+json`、`type` / `title` / `status` / `detail` / `instance` / `code` を含む）
- `/search` と検索結果系ページは `<meta name="robots" content="noindex, follow">`
- `/advanced-search` / `/submit` / `/` は `index, follow`
- 外部リンクは `target="_blank" rel="noopener noreferrer"`
- canonical link が正しく出力される
- i18n cookie `lang` が反映される

## docs ref 表記ルール

docs/ への参照は **section 名併記**形式で書く。GitHub の anchor slug 化は日本語・全角括弧・記号の扱いで壊れやすいため、anchor リンクは張らない。

- 形式: `docs/X.md の「section 名」`
- 例: `docs/search.md の「全体バナーの出し分け」`
- Ctrl+F で該当 section を検索する運用

機能レベルの docs ref（章の冒頭に書く）はリンクを張って良い（ファイル全体を指すため slug 問題が発生しない）。

## シナリオ ID 体系

`<略称>-<連番 2 桁>`（例: `SR-FX-01`, `ADV-GUI-15`）

| # | 機能 | 略称 |
| --- | --- | --- |
| 1-a | 横断検索 fan-out / 件数集約 / 部分失敗 | SR-FX |
| 1-b | 横断検索結果ページ UI | SR-UI |
| 2-a | DB 指定検索カードリスト | DB-LIST |
| 2-b | DB 指定検索ページネーション / ソート / 表示件数 | DB-PAGE |
| 3-a | Advanced Search GUI クエリビルダ | ADV-GUI |
| 3-b | Advanced Search DSL 生成 / プレビュー | ADV-DSL |
| 3-c | Advanced Search 条件サマリチップ | ADV-SUM |
| 4 | URL 正規化・互換性 | URL |
| 5-a | 登録ナビ Decision Tree 構造 | SUB-TREE |
| 5-b | Card ↔ Tree ↔ Detail Panel 連動 | SUB-LINK |
| 6 | 登録ナビ Detail Panel | SUB-DETAIL |
| 7 | 認証（DDBJ Account / Keycloak OIDC） | AUTH |
| 8 | 全体ナビ・ヘッダー・フッター | NAV |
| 9 | エラーページ | ERR |
| 10 | トップページ (/) | TOP |
| 11 | i18n | I18N |
| 12 | Search API fetch 層 | API |
| 13 | シンプル検索（UI） | SIMPLE |

シナリオは以下の 4 カテゴリに分類する: 正常系 / 境界値 / エッジケース / 異常系。

**欠番ルール**: 削除したシナリオ ID は欠番のまま残す（歴史的互換性。ID は原則再利用しない）。

## バケツ選択ガイドライン

tests/README.md の「3 バケツ」を補足する判定軸。迷った時の早見表。

| 判定点 | unit | browser | integration |
| --- | --- | --- | --- |
| DOM レンダリング | React Testing Library で足りる（className / text / role 検証） | ユーザ操作（click / type）+ URL 遷移 + 副作用（clipboard / target="_blank" / history） | 実 SSR / hydration フラッシュ検証 |
| 外部 HTTP | MSW stub で fetch 層を検証 | MSW stub で UI 表示を検証 | 実 staging API に接続 |
| 認証 | token claim の decode / 境界判定 | oidc-context mock で UI 切替 | 実 Keycloak に PKCE フローで接続 |
| タイマー / 並列 | fake timers（`vi.useFakeTimers()` 前提） | real timers を許容できるとき | 並列 fan-out の実レイテンシ測定 |
| CSS visual | className / computed style の assertion | visual regression が必要な時のみ | 視覚回帰 |
| URL 生成 / 解析 | 純粋関数の PBT（fast-check） | URL バー反映 + 履歴操作 | サーバ側 redirect（301 等） |

**原則**:

- 同じ観点を複数バケツに重複させない（unit で検証できるなら unit、UI 挙動が絡む時のみ browser）
- MSW で再現可能な異常系は基本 browser / unit に寄せ、integration は実外部貫通でしか再現できないケース（実 Solr の cold cache、実 Keycloak の redirect URI allowlist、実 ES の 10,000 件境界挙動など）を代表 1 本だけ

## リリース段階との接続

シナリオの実装優先度はリリース段階に従う。詳細は docs/search.md の「段階的な積み上げ」を参照。

| 段階 | 対象範囲 | scenarios.md の記述 |
| --- | --- | --- |
| **インターナルリリース** | シンプル検索本番稼働。Advanced Search は Tier 1 フィールドのみ（identifier / title / description / organism / date_*）。GEA / MetaboBank ES 接続済み | 本文に列挙された観点のうち、Tier 3 / Tier 2 を明示的に除く全て |
| **ファーストリリース** | Advanced Search Tier 2 / Tier 3 の段階追加 | 各機能の「Tier 2 / Tier 3 の拡張（ファーストリリース）」節で明記 |
| **将来拡張** | 履歴 / Saved Search / API Export / オートサジェスト / BioSample attributes top-level 昇格 / ES analyzer 再設計 | scenarios.md には含めない（docs/ 側で FIX してから追加） |

## シナリオ記述フォーマット

```
#### <ID>: <短いタイトル>

- **バケツ**: unit | browser | integration（PBT 候補なら `unit, PBT`）
- **ペルソナ**: P-XXX（既定ペルソナと異なる時のみ明記）
- **前提**: テスト実行時の条件
- **手順**: バケツに応じた記述粒度
  - unit: 対象関数・hook の呼び出しレベル（例: `useCrossSearchQuery("cancer")` を呼ぶ）
  - browser: ユーザ操作レベル（例: `/search?q=cancer` を開き DB カードをクリック）
  - integration: 実環境での操作・API コール
- **期待**: 検証可能な具体的な事項
- **根拠**: docs/X.md の「section 名」（複数あれば列挙）
```

観点レベルの箇条書き（機能 1-b 以降）は、実装時に観点 → シナリオ ID 化する。表記: `- 観点テキスト [バケツ] — docs/X.md の「section 名」`。PBT 候補は `[unit, PBT]`。

---

## 機能 1-a: 横断検索 fan-out / 件数集約 / 部分失敗 (SR-FX)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-ANON

### 正常系

#### SR-FX-01: 全 DB success で databases[] を組み立てる

- **バケツ**: unit
- **前提**: 全 8 DB（bioproject / biosample / sra / trad / taxonomy / jga / gea / metabobank）が success レスポンスを返す MSW stub + `tests/helpers/fixtures.ts` の `successfulDatabasesResponse()`
- **手順**: `useCrossSearchQuery("cancer")` 相当のクエリフックを呼ぶ
- **期待**: 返却値の `databases[]` に 8 要素、全て `count != null`、`error === null`。`isError === false`
- **根拠**: docs/search-backends.md の「部分失敗ポリシー」

#### SR-FX-02: 3 並列 fan-out の段階表示（progressive rendering）

- **バケツ**: browser
- **前提**: ES / ARSA / TXSearch を異なるレイテンシで返す MSW stub（TXSearch 0.1s / ES 0.5s / ARSA 2s）
- **手順**: `/search?q=cancer` を開く
- **期待**: TXSearch 系（Taxonomy）カードが先に success 表示、ES 系（6 DB）が次、ARSA 系（Trad）が最後。各 DB カードは loading → success へ独立遷移
- **根拠**: docs/search.md の「段階表示（progressive rendering）」、docs/search-backends.md の「並列実行」

#### SR-FX-03: 部分失敗時も databases[] に全 DB の状態が揃う

- **バケツ**: unit
- **前提**: 1 つ以上の DB が success、残りは error を返す MSW stub
- **手順**: `useCrossSearchQuery("cancer")` を呼ぶ
- **期待**: `databases[]` が 8 要素揃う。success DB は `count` 値、error DB は `error` 種別が入る（クライアント側で早期 throw しない）
- **根拠**: docs/search-backends.md の「部分失敗ポリシー」

### 境界値

#### SR-FX-04: error 3/8 では全体バナーを出さない

- **バケツ**: browser
- **前提**: 8 DB のうち 3 DB が error、5 DB が success の MSW stub
- **手順**: `/search?q=cancer` を開く
- **期待**: 全体バナー非表示。error カードに個別エラー表示（再試行ボタン + エラー種別補足）のみ
- **根拠**: docs/search.md の「全体バナーの出し分け」

#### SR-FX-05: error 4/8（半数境界）で warning バナー

- **バケツ**: browser
- **前提**: 8 DB のうち 4 DB が error の MSW stub
- **手順**: `/search?q=cancer` を開く
- **期待**: `Callout type="warning"` + 「一部の検索サービスが不安定です。」を表示。個別カードにもエラー表示
- **根拠**: docs/search.md の「全体バナーの出し分け」

#### SR-FX-06: error 7/8 でも warning バナーの範囲

- **バケツ**: browser
- **前提**: 8 DB のうち 7 DB が error、1 DB が success の MSW stub
- **手順**: `/search?q=cancer` を開く
- **期待**: warning バナーを表示。error バナー（全 DB error 用）は出さない
- **根拠**: docs/search.md の「全体バナーの出し分け」

#### SR-FX-07: error 8/8 で error バナー + `role="alert"`

- **バケツ**: browser
- **前提**: 全 8 DB が error を返す MSW stub
- **手順**: `/search?q=cancer` を開く
- **期待**: `Callout type="error"` + `role="alert"` + 「検索サービスに接続できません。しばらくしてからもう一度お試しください。」 + 再試行ボタン
- **根拠**: docs/search.md の「全体バナーの出し分け」

#### SR-FX-08: タイムアウト閾値（ES 10s / ARSA 15s / TXSearch 5s / 全体 20s）

- **バケツ**: unit
- **前提**: `vi.useFakeTimers()` で時間を mock。各バックエンドのタイムアウト値を注入
- **手順**: 各バックエンドのレスポンスを閾値超まで遅延させ、fake timer を advance
- **期待**: ES 10s 超で `error: "timeout"`、ARSA 15s 超で同、TXSearch 5s 超で同。横断検索全体 20s 超過で未完了 DB を `null` 化。実テスト実行時間は数ms（fake timer 前提、実タイマーでは 20s 固まるので避ける）
- **根拠**: docs/search-backends.md の「タイムアウト初期値」

### エッジケース

#### SR-FX-09: count = 0 と null の混在ソート

- **バケツ**: unit, PBT
- **前提**: 0 件 DB / null DB / success DB が混在する `databases[]`
- **手順**: ソート関数（件数降順 + null 末尾）を呼ぶ
- **期待**: 件数降順 → 0 件 → `null` 末尾。任意の混在パターンで安定ソート（fast-check で順列の多様性を網羅）
- **根拠**: docs/search.md の「横断検索結果の DB 表示順序」

#### SR-FX-10: ES 障害で 6 DB 同時 null（warning 閾値を自然に満たす）

- **バケツ**: browser
- **前提**: ES 全滅（sra / bioproject / biosample / jga / gea / metabobank が error）、ARSA と TXSearch は success
- **手順**: `/search?q=cancer` を開く
- **期待**: 半数以上 error なので warning バナー。ES 系 6 DB カードは個別 error 表示
- **根拠**: docs/search.md の「全体バナーの出し分け」

#### SR-FX-11: 【欠番】

削除。キャッシュ（`cachetools.TTLCache`）は ddbj-search-api の責務で db-portal のテスト対象外。

#### SR-FX-12: Solr cold / warm cache のレイテンシ差

- **バケツ**: integration
- **前提**: staging Solr が起動済み、直前に再起動でキャッシュクリア
- **手順**: cold cache 状態で `/db-portal/search?q=cancer&db=trad`、続けて同一クエリを実行
- **期待**: 2 回目（warm cache）が初回より明らかに速い。両方 HTTP 200（具体的なレイテンシ値は docs/search-backends.md の「Solr cold cache 対策（warming）」参照だが、閾値超えで fail にしない）
- **根拠**: docs/search-backends.md の「Solr cold cache 対策（warming）」

### 異常系

#### SR-FX-13: error 種別 4 種のハンドリング

- **バケツ**: unit
- **前提**: MSW stub で 4 種の error（`timeout` / `upstream_5xx` / `connection_refused` / `unknown`）を返す
- **手順**: `useCrossSearchQuery("cancer")` を呼び、`databases[]` の各 error フィールドを検証
- **期待**: `error` フィールドに対応する値が入り、カード表示テキスト変換関数が正しく文字列を返す（`timeout` → 「タイムアウト」、`upstream_5xx` → 「サーバーエラー」、`connection_refused` → 「接続エラー」、`unknown` → 「不明なエラー」）
- **根拠**: docs/search.md の「エラー種別の補足テキスト」、docs/search-backends.md の「部分失敗ポリシー」

#### SR-FX-14: 【欠番】

削除。HTTP 502 生成は ddbj-search-api 側の責務。UI 側の全 DB error 表示は SR-FX-07 で検証済み。

#### SR-FX-15: error カードの再試行で単 DB 再 fetch

- **バケツ**: browser
- **前提**: 1 DB のみ error、他 7 DB は success の状態
- **手順**: error カードの再試行ボタンをクリック
- **期待**: 該当 DB のみ再 fetch。他 7 DB は再 fetch されない（loading に戻らない）
- **根拠**: docs/search.md の「loading / error 状態」

---

## 機能 1-b: 横断検索結果ページ UI (SR-UI)

**docs ref**: [search.md](../docs/search.md)
**既定ペルソナ**: P-ANON
**責務分界**: SR-FX の状態（loading / success / error）を受けた UI 側の表示確認を扱う。fetch 層の動作は SR-FX、API 層は API 参照。

### 正常系

- 8 DB カードが件数降順で並び、`null` は末尾 [browser] — docs/search.md の「横断検索結果の DB 表示順序」
- DB カードクリックで `/search?q=xxx&db=yyy` に遷移 [browser] — docs/search.md の「検索フロー」
- 「この DB で詳細検索」ボタンで `/advanced-search?db=xxx` に遷移 [browser] — docs/search.md の「ユーザー動線」

### 境界値

- DB カード件数 0 件の表記 [browser] — docs/search.md の「ヒット件数表示」
- DB カード件数 1 件の表記 [browser] — docs/search.md の「ヒット件数表示」
- DB カード件数 10,000 件ちょうどの表記 [browser] — docs/search.md の「ヒット件数表示」
- DB カード件数 10,001 件以上の表記（「10,000 件以上」） [browser] — docs/search.md の「ヒット件数表示」
- ES `track_total_hits` 上限超過時「X 件以上（正確な件数は絞り込みを推奨）」表記 [unit] — docs/search.md の「ヒット件数表示」

### エッジケース

- 件数 Skeleton の形状（`w-24` / `h-8`、`role="status"` 付き）、DB 名は静的表示 [browser] — docs/search.md の「Skeleton 形状の根拠」
- 1〜2 DB だけ error で全体バナーなし、個別カードのみ表示 [browser] — docs/search.md の「全体バナーの出し分け」

### 異常系

- error カード補足テキスト 4 種（「タイムアウト」「サーバーエラー」「接続エラー」「不明なエラー」） [unit] — docs/search.md の「エラー種別の補足テキスト」

---

## 機能 2-a: DB 指定検索カードリスト (DB-LIST)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-ANON

### 正常系

- BioProject カードの L5 に `Project type` + `Organization` を表示 [unit] — docs/search.md の「DB 別メタデータ（L5）」
- Trad カードの L5 に `Division` を表示 [unit] — docs/search.md の「DB 別メタデータ（L5）」
- Taxonomy カードの L5 に `Rank` + `Common name` + `Japanese name` を表示 [unit] — docs/search.md の「DB 別メタデータ（L5）」
- カード L1〜L6 の共通構造（accession / title / description / organism / DB 固有 / 関連 DB リンク）が DB 横断で揃う [unit] — docs/search.md の「カードの共通構造」
- L2 タイトルクリックで外部詳細ページへ `target="_blank" rel="noopener noreferrer"` で開く [browser] — docs/search.md の「カードクリック時の遷移」、docs/overview.md の「外部リダイレクト」
- L6 関連 DB リンクが `relatedObjects` から生成される [unit] — docs/search.md の「関連 DB リンク（L6）」

### 境界値

- L2 title 2 行ちょうどで切れず表示される [unit] — docs/search.md の「カードの共通構造」
- L2 title 3 行相当で末尾 `...` 省略 [unit] — docs/search.md の「カードの共通構造」
- L3 description が title と同一内容なら L3 非表示 [unit] — docs/search.md の「カードの共通構造」
- `relatedObjects` が空なら L6 行自体を非表示 [unit] — docs/search.md の「関連 DB リンク（L6）」

### エッジケース

- Taxonomy は L4 organism 行非表示（`scientific_name` が L2 と重複するため） [unit] — docs/search.md の「カードの共通構造」
- `publishedAt` が null（Taxonomy 等）で L1 の右側空欄 [unit] — docs/search.md の「カードの共通構造」
- BioProject の Project type / Organization が欠損時の L5 フォールバック [unit] — docs/search.md の「DB 別メタデータ（L5）」
- Trad の ARSA `Date`（`YYYYMMDD`）を ISO 8601 に変換 [unit] — docs/search-backends.md の「統一スキーマへの変換」

### 異常系

- データ取得エラー時のカード表示（API 機能 12 で詳細検証） [browser] — docs/search.md の「loading / error 状態」

---

## 機能 2-b: DB 指定検索ページネーション / ソート / 表示件数 (DB-PAGE)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-ANON

### 正常系

- デフォルト値（`perPage=20` / `sort=relevance` / `page=1`）で検索 [unit] — docs/search.md の「/search のクエリパラメータ」
- ソート変更（Relevance / Date 新しい順 / Date 古い順）で URL 反映 + 結果更新 [browser] — docs/search.md の「ページネーション仕様」
- 表示件数変更（20 / 50 / 100）で URL 反映 + 結果更新 [browser] — docs/search.md の「/search のクエリパラメータ」
- 件数バッジ「全 X 件中 N-M 件を表示」形式 [unit] — docs/search.md の「ヒット件数表示」
- ツールバー（件数バッジ + ソートセレクト + 表示件数セレクト）のレイアウト [browser] — docs/search.md の「ページ全体のレイアウト」

### 境界値

- `perPage` = 20 / 50 / 100 は許容 [unit] — docs/search.md の「/search のクエリパラメータ」
- `perPage` = 30 / 21 など allowlist 外は拒否または `perPage=20` にフォールバック [unit] — docs/search.md の「/search のクエリパラメータ」
- ES バックエンド 10,000 件ちょうどでの offset → cursor 切替の判定ロジック [unit, PBT] — docs/search.md の「10,000 件超のハンドリング」
- ES バックエンド 10,001 件目で cursor 必須、offset 拒否の判定ロジック [unit, PBT] — docs/search.md の「10,000 件超のハンドリング」
- ES 10,001 件目の end-to-end 挙動（実 ES での cursor 生成と遷移） [integration] — docs/search.md の「10,000 件超のハンドリング」
- Solr（Trad / Taxonomy）500 ページ目（`perPage=20` × 500 = 10,000）でページャ無効化 [browser] — docs/search.md の「10,000 件超のハンドリング」
- Solr 件数 = 10,000 ちょうどで Callout 非表示（10,001 以上で表示） [browser] — docs/search.md の「10,000 件超のハンドリング」
- Solr 件数 = 10,001 で Callout `type="info"` + 「詳細検索を開く」CTA が `?db=trad` 引継ぎ [browser] — docs/search.md の「10,000 件超のハンドリング」

### エッジケース

- `page=0` / `page=-1`（非正数）→ 400 または `page=1` フォールバック [unit] — docs/search.md の「/search のクエリパラメータ」
- `page` が小数・文字列（`1.5` / `abc`）→ 400 または `page=1` フォールバック [unit] — docs/search.md の「/search のクエリパラメータ」

### 異常系

- 不正な `cursor` 文字列（HMAC 検証失敗時の 400 Problem Details を UI が受ける） [browser] — docs/search-backends.md の「内部実装」
- 未定義 `sort` 値（`relevance_desc` 等）のフォールバック [unit] — docs/search.md の「/search のクエリパラメータ」

---

## 機能 3-a: Advanced Search GUI クエリビルダ (ADV-GUI)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-ANON

### 正常系

- 初期状態「全データベース（横断）」で Tier 1 フィールドのみ選択可 [browser] — docs/search.md の「フィールド構成（3 層）」
- 単一 DB 選択時に Tier 3 が選択可能 [browser] — docs/search.md の「フィールド構成（3 層）」
- 1 行目に演算子ドロップダウンなし、2 行目以降に AND/OR/NOT [unit] — docs/search.md の「レイアウト」
- フィールド型による演算子フィルタ（identifier は equals/starts_with/wildcard 等） [unit] — docs/search.md の「演算子とフィールドの組み合わせ」
- date サブセレクタ（公開日 / 更新日 / 作成日 / いずれか）切替で state 変化 [unit] — docs/search.md の「日付フィールド」
- Examples チップクリックで条件行が埋まる [browser] — docs/search.md の「シンプル検索ボックスの UI 補助」
- `organism` フィールドに学名（`Homo sapiens`）を入力して受理 [unit] — docs/search-backends.md の「スキーマ仕様」
- `organism` フィールドに Taxonomy ID（`9606`）を入力して受理 [unit] — docs/search-backends.md の「スキーマ仕様」

### 境界値

- 条件行のネスト深さ 5 で追加可、6 で拒否 [unit] — docs/search-backends.md の「スキーマ仕様」
- 単一 DB = Trad で「公開日」のみ活性、他 3 種は非活性 + tooltip [browser] — docs/search.md の「バックエンド別の制約と UI 挙動」
- 単一 DB = Taxonomy で date フィールド行全体が非活性 + tooltip [browser] — docs/search.md の「バックエンド別の制約と UI 挙動」
- 横断モードで Trad は `date_modified` / `date_created` / `date` をベストエフォート評価、UI に警告出さない [unit] — docs/search.md の「バックエンド別の制約と UI 挙動」

### エッジケース

- 単一 DB A → B 切替時、A の Tier 3 条件があるとインライン `Callout type="warning"` に削除対象を列挙 [browser] — docs/search.md の「DB 切り替え時の条件引き継ぎ」
- Callout の「切り替える」（Button variant="secondary" size="sm"）をクリックで条件削除 [unit] — docs/search.md の「DB 切り替え時の条件引き継ぎ」
- Callout の「キャンセル」（Button variant="ghost" size="sm"）をクリックで DB セレクタを元の値に戻す [unit] — docs/search.md の「DB 切り替え時の条件引き継ぎ」
- Tier 3 条件なしで DB 切替時は Callout 出ず即座切替 [browser] — docs/search.md の「DB 切り替え時の条件引き継ぎ」
- 単一 DB → 全 DB で Tier 3 削除、Tier 1 / 2 保持 [unit] — docs/search.md の「DB 切り替え時の条件引き継ぎ」
- 全 DB → 単一 DB で Tier 3 が新規追加可能、既存条件は保持 [unit] — docs/search.md の「DB 切り替え時の条件引き継ぎ」
- `date` エイリアスが `date_published` OR `date_modified` OR `date_created` に展開 [unit] — docs/search.md の「日付フィールド」

### 異常系

- 横断モードで Tier 3 は GUI 選択肢に出ない [browser] — docs/search.md の「フィールド構成（3 層）」

### Tier 2 / Tier 3 の拡張（ファーストリリース）

- `submitter` / `publication` の Tier 2 フィールド対応（横断 / 単一 DB） — docs/search.md の「フィールド構成（3 層）」
- SRA の `library_strategy` / `platform` / `instrument_model` の Tier 3 — docs/search.md の「フィールド構成（3 層）」
- BioSample の `geo_loc_name` / `collection_date` / `host` 等の Tier 3 — docs/search.md の「フィールド構成（3 層）」

---

## 機能 3-b: Advanced Search DSL 生成 / プレビュー / コピー (ADV-DSL)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-ANON（URL 直編集時は P-DEV）

### 正常系

- GUI の条件変更にリアルタイムで DSL 文字列が再生成 [unit] — docs/search.md の「クエリプレビュー」
- [コピー] ボタンでクリップボードに DSL 文字列が入る [browser] — docs/search.md の「クエリプレビュー」
- プレビュー欄のテキスト選択が可能（手動コピー動線） [browser] — docs/search.md の「クエリプレビュー」
- フィールド allowlist（Tier 1 / 2 / 3）のみが出力される [unit] — docs/search-backends.md の「スキーマ仕様」

### 境界値

- 複数条件を AND/OR/NOT でネスト深さ 5 まで組んだ時の DSL 整形 [unit] — docs/search.md の「レイアウト」
- フレーズトークンの DSL 内クォート（`organism:"Homo sapiens"`） [unit] — docs/search-backends.md の「スキーマ仕様」
- 単独 `NOT` は拒否、子は 1 件まで [unit] — docs/search-backends.md の「スキーマ仕様」

### エッジケース

- プレビュー欄は read-only（キーボード入力無効、focus 可） [browser] — docs/search.md の「クエリプレビュー」
- URL 直編集で到達した不正 DSL を GUI には戻さない（インターナルリリース） [unit] — docs/search.md の「GUI ↔ DSL の方向性」
- PBT: 任意 GUI 条件組み合わせ → DSL → サーバパース可能性 [unit, PBT] — docs/search-backends.md の「パーサ実装」

### 異常系

（ADV-DSL では DSL 生成部分の異常系のみを扱う。URL 経由の DSL パースエラーはすべて機能 9 ERR に集約）

---

## 機能 3-c: Advanced Search 条件サマリチップ (ADV-SUM)

**docs ref**: [search.md](../docs/search.md)
**既定ペルソナ**: P-ANON

### 正常系

- ヘッダのシンプル検索ボックス位置にサマリチップが差し替わる（同時表示なし） [browser] — docs/search.md の「Advanced Search の条件サマリ表示」
- `db` 指定時のプレフィックス `{DB UI ラベル} で絞り込み中:` [unit] — docs/search.md の「Advanced Search の条件サマリ表示」
- 横断モード（`db` 未指定）のプレフィックス `全データベースで絞り込み中:` [unit] — docs/search.md の「Advanced Search の条件サマリ表示」

### 境界値

- 条件数 1〜2: DSL そのまま、50 文字超で末尾 `...` 省略 [unit] — docs/search.md の「サマリ文言の生成ルール」
- 条件数 3 以上: `title:"cancer" 他 N 条件` 形式 [unit] — docs/search.md の「サマリ文言の生成ルール」
- 50 文字ちょうど / 51 文字の境界省略 [unit] — docs/search.md の「サマリ文言の生成ルール」

### エッジケース

- [編集] ボタンが `/advanced-search?db=xxx&adv=<現在の DSL>` の URL を生成する [unit] — docs/search.md の「操作」
- [編集] ボタンクリックで上記 URL に遷移（インターナルリリースでは GUI 復元せず、Advanced Search ページの DSL プレビュー欄に文字列表示のみ） [browser] — docs/search.md の「操作」、docs/search.md の「GUI ↔ DSL の方向性」
- [✕ クリア] で `adv` / `db` 解除、`/search` にリダイレクトしシンプル検索ボックス再表示 [browser] — docs/search.md の「操作」
- サマリチップ本体クリックでは何も起きない（[編集] / [✕] のみアクション） [browser] — docs/search.md の「操作」

### 異常系

（`adv` と `q` 両方指定の異常系は機能 4 URL に集約）

---

## 機能 4: URL 正規化・互換性 (URL)

**docs ref**: [search.md](../docs/search.md) / [overview.md](../docs/overview.md)
**既定ペルソナ**: P-ANON（URL 直編集時は P-DEV、canonical 確認は P-CRAWLER）

### 正常系

- `?q=xxx&page=1&sort=relevance` → `?q=xxx` に正規化（初回描画後 `history.replaceState`） [browser] — docs/search.md の「CSR 上での正規化実装」
- パラメータ順序 `q → db → page → perPage → sort → cursor → adv` 固定 [unit] — docs/search.md の「正規化ルール」
- ページ送り・ソート変更は `pushState` で履歴に積む（戻るで前状態） [browser] — docs/search.md の「CSR 上での正規化実装」
- `/search` に常時 `<meta name="robots" content="noindex, follow">` [unit] — docs/search.md の「CSR 上での正規化実装」
- canonical link がクエリ確定後に出力される [unit] — docs/search.md の「CSR 上での正規化実装」
- URL 互換性契約: `db` 値（`trad` / `sra` / `bioproject` / `biosample` / `jga` / `gea` / `metabobank` / `taxonomy`）が変わらない [unit] — docs/search.md の「URL 互換性ポリシー」
- URL 互換性契約: パラメータ名（`q` / `db` / `page` / `perPage` / `sort` / `cursor` / `adv`）が変わらない [unit] — docs/search.md の「URL 互換性ポリシー」

### 境界値

- `q` も `adv` もない `/search` → `/` に 301 redirect [integration] — docs/search.md の「canonical / noindex」
- `perPage=20`（デフォルト）は URL から省く [unit, PBT] — docs/search.md の「正規化ルール」
- `perPage=50` / `perPage=100` は URL に残す [unit] — docs/search.md の「正規化ルール」
- `page=1`（デフォルト）は URL から省く [unit, PBT] — docs/search.md の「正規化ルール」
- `page=2` 以降は URL に残す [unit] — docs/search.md の「正規化ルール」

### エッジケース

- URL エンコードされた DSL（`%3A` / `%22` / space の `+`）の encode → decode → encode 冪等性 [unit, PBT] — docs/search.md の「Advanced Search の URL 形式」
- `db` の値が allowlist 外の扱い [unit] — docs/search.md の「db パラメータの値」
- 不正パラメータ（`foo=bar`）が混入しても無視して canonical 化 [unit] — docs/search.md の「正規化ルール」

### 異常系

- `q` と `adv` 両方指定で 400 Problem Details [integration] — docs/search.md の「/search のクエリパラメータ」、docs/search-backends.md の「エラーコード一覧」

---

## 機能 5-a: 登録ナビ Decision Tree 構造 (SUB-TREE)

**docs ref**: [submit.md](../docs/submit.md)
**既定ペルソナ**: P-ANON

### 正常系

- 31 leaf すべてが描画可能・到達可能 [unit] — docs/submit.md の「tree 構造」
- 深さ 2〜7 層の階層（JGA / プロテオミクス等は浅い、真核ゲノムは最深） [unit] — docs/submit.md の「設計上の決定事項」
- 全 node に一意のケバブケース ID が付与、重複なし [unit] — docs/submit.md の「for パラメータの値」

### 境界値

- カードが leaf 直行するケース（`proteomics` / `metabolomics` / `small-sequence` / `human-restricted`）で node ID = leaf ID [unit] — docs/submit.md の「for パラメータの値」
- カードは 9 枚ちょうど [unit] — docs/submit.md の「カード（9 枚）」
- カード表示優先順が 9 枚で崩れない [unit] — docs/submit.md の「カード表示優先順」

### エッジケース

- leaf-01 (`human-restricted`) は L1 分岐だがカード配置は最後 [unit] — docs/submit.md の「カード表示優先順」
- 新規登録ほぼゼロの `eukaryote-est-small` / `eukaryote-est-large` も tree に残る [unit] — docs/submit.md の「L7: eu-est-* 規模」
- MGA は tree から完全除外、該当カード詳細内でのみ言及 [unit] — docs/submit.md の「特殊データ種別の扱い」
- ゴール数 16 種類に 31 leaf が多対一で帰属 [unit] — docs/submit.md の「ゴール一覧」

---

## 機能 5-b: Card ↔ Tree ↔ Detail Panel 連動 (SUB-LINK)

**docs ref**: [submit.md](../docs/submit.md)
**既定ペルソナ**: P-ANON

### 正常系

- カードクリックで対応中間 node ハイライト + Detail Panel 概要レベル [browser] — docs/submit.md の「3 セクションの連動」
- leaf 直行カードクリックで具体レベル表示 [browser] — docs/submit.md の「3 セクションの連動」
- tree の leaf 到達で Detail Panel が概要 → 具体レベルに切替 [browser] — docs/submit.md の「3 セクションの連動」
- 中間 node 選択で概要パネル表示 → 子 node へドリルダウンで leaf 到達時に具体レベルへ切替 [browser] — docs/submit.md の「3 セクションの連動」
- 初期状態は 1 枚目（微生物ゲノム）の概要レベル [browser] — docs/submit.md の「詳細パネルの UI 形態」
- Detail Panel 見出しに `scrollIntoView({ behavior: "smooth" })` [browser] — docs/submit.md の「詳細パネルの UI 形態」

### 境界値

- `/submit?for=microbial` → 中間 node → 概要レベル [browser] — docs/submit.md の「URL の組み合わせ」
- `/submit?for=prokaryote-raw-assembly` → leaf → 具体レベル [browser] — docs/submit.md の「URL の組み合わせ」
- `/submit?for=proteomics` → leaf かつカード直行 → 具体レベル [browser] — docs/submit.md の「URL の組み合わせ」
- `/submit`（`for` なし）→ 初期状態 [browser] — docs/submit.md の「URL の組み合わせ」
- SSR プリレンダで `/submit` が 31 leaf の DOM を静的に出す [integration] — docs/submit.md の「3 セクションの連動」、docs/overview.md の「全ページマップ」

### エッジケース

- L1 から順に降りた場合、カード未選択のまま leaf 到達で Detail Panel 表示 [browser] — docs/submit.md の「3 セクションの連動」
- canonical は全バリエーションで `/submit` [unit] — docs/submit.md の「canonical」

### 異常系

- `leaf` のような旧パラメータを入れても無視、`for` 1 パラメータに集約 [unit] — docs/submit.md の「却下案」

---

## 機能 6: 登録ナビ Detail Panel (SUB-DETAIL)

**docs ref**: [submit.md](../docs/submit.md) / [submit-details.md](../docs/submit-details.md) / [overview.md](../docs/overview.md)
**既定ペルソナ**: P-ANON

### 正常系

- 概要レベル = 「ユースケースの概要」「3 層構造」「登録先分岐テーブル」「共通準備物」「主要外部リンク」 [unit] — docs/submit.md の「概要レベル（カード選択時 / tree 中間 node 選択時）」
- 具体レベル = 概要 + 「ゴール」「登録順序」「具体的な準備物」「leaf 固有補足」「外部ツール・固有リンク」 [unit] — docs/submit.md の「具体レベル（leaf 到達時）」
- goal テンプレート 6 パターン（ゲノム系 / GEA 系 / NSSS / MetaboBank 系 / JGA 系 / 外部） [unit] — docs/submit-details.md の「goal テンプレート（6 パターン）」

### 境界値

- 9 カード分の概要レベル記述が全カード存在 [unit] — docs/submit-details.md 全体
- 31 leaf 分の goal テンプレート + leaf 差分が抜けなく出力 [unit] — docs/submit-details.md の「テンプレート設計」
- 外部リダイレクト系（jPOST / JVar / EVA / dgVa）は概要 + 外部リンクのみで leaf 差分最小 [unit] — docs/submit-details.md 全体

### エッジケース

- 外部リンクは `target="_blank" rel="noopener noreferrer"` [browser] — docs/overview.md の「外部リダイレクト」
- 外部遷移は Callout / TextLink external で明示 [browser] — docs/overview.md の「外部リダイレクト」
- Haplotype leaf は umbrella + Principal + Alternate 構成、locus_tag prefix/suffix の区別が記述される [unit] — docs/submit-details.md の「2. 真核生物ゲノム」
- SARS-CoV-2 は DFAST_VRL / GISAID 連携 / Japan COVID-19 Open Data Consortium の記述が virus leaf に [unit] — docs/submit-details.md の「1. 微生物ゲノム」
- MAG / Binned / SAG の BioSample パッケージ分岐（MIMAG / MIGS / MISAG）が `metagenome-genome-bin` leaf に [unit] — docs/submit-details.md の「3. メタゲノム / MAG / SAG」
- TPA は peer-reviewed 発表必須の記述 [unit] — docs/submit-details.md の「2. 真核生物ゲノム」

### 異常系

- 外部リダイレクト系 leaf で内部遷移に見えるリンク表示をしない [browser] — docs/overview.md の「外部リダイレクト」

---

## 機能 7: 認証（DDBJ Account / Keycloak OIDC） (AUTH)

**docs ref**: [overview.md](../docs/overview.md) / [keycloak-setup.md](../docs/keycloak-setup.md)
**既定ペルソナ**: P-AUTH（匿名ユーザ確認は P-ANON）

### 正常系

- AUTH を要求する機能はない（ペルソナ P-ANON で全機能アクセス可能） [browser] — docs/overview.md の「認証」
- Authorization Code Flow + PKCE (S256) でログイン成功 [integration] — docs/overview.md の「認証フロー」、docs/keycloak-setup.md の「PKCE method」
- ログイン後 JWT が localStorage に保存 [browser] — docs/overview.md の「認証フロー」
- `/auth/callback` で code → token 交換 [integration] — docs/overview.md の「認証コールバック」
- `/auth/silent-callback` でサイレント更新 [integration] — docs/overview.md の「認証コールバック」
- `/auth/logout-callback` でログアウト後遷移 [integration] — docs/overview.md の「認証コールバック」
- ヘッダーにログイン / ログアウトボタン、認証状態で切替 [browser] — docs/overview.md の「認証」

### 境界値

- token claim の decode: `basic` スコープで `sub` claim が含まれる [unit] — docs/keycloak-setup.md の「basic スコープ（sub claim）」
- Keycloak 設定到達性: `.well-known/openid-configuration` が取得可能 [integration] — docs/keycloak-setup.md の「Access settings」
- Access Token Lifespan 設定値の整合（dev/staging: 1h、production: 5min） [integration] — docs/keycloak-setup.md の「Advanced settings（タイムアウト値）」
- Client Session Idle 設定値の整合（dev/staging: 8h、production: 30min） [integration] — docs/keycloak-setup.md の「Advanced settings（タイムアウト値）」

### エッジケース

- Front channel logout で別タブのログアウトが同期される [integration] — docs/keycloak-setup.md の「Logout settings」
- Web origins 制約（CORS）に違反する origin からのリクエスト拒否 [integration] — docs/keycloak-setup.md の「Access settings」

### 異常系

- 未知 redirect URI でのログイン試行を Keycloak が拒否 [integration] — docs/keycloak-setup.md の「Access settings」
- code 交換失敗（PKCE verifier 不一致、code 期限切れ） [integration] — docs/keycloak-setup.md の「PKCE method」

---

## 機能 8: 全体ナビ・ヘッダー・フッター (NAV)

**docs ref**: [search.md](../docs/search.md) / [overview.md](../docs/overview.md) / [.claude/docs/design-system.md](../.claude/docs/design-system.md)
**既定ペルソナ**: P-ANON

### 正常系

- ヘッダーにロゴ（左）・ナビ（右）・ミニマル 1 段レイアウト [unit] — .claude/docs/design-system.md の「レイアウト」
- ヘッダー `position: static`（上部固定しない）の className 検証 [unit] — .claude/docs/design-system.md の「レイアウト」
- ヘッダー背景色なし・ボーダーなしの className 検証 [unit] — .claude/docs/design-system.md の「レイアウト」
- コンテンツ最大幅 `max-w-6xl`（1152px） [unit] — .claude/docs/design-system.md の「レイアウト」
- 「詳細検索」リンクから `/advanced-search` に遷移 [browser] — docs/search.md の「ユーザー動線」
- 問い合わせリンクが Google Form を指す（外部） [browser] — docs/overview.md の「スコープ」

### 境界値

- ヘッダーのシンプル検索ボックスとサマリチップは同時表示しない [browser] — docs/search.md の「Advanced Search の条件サマリ表示」

### エッジケース

（フッタ仕様は docs/ 未定義のため観点なし。将来 docs で合意した時点で追加）

---

## 機能 9: エラーページ (ERR)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-DEV（正常 redirect 確認は P-CRAWLER、一般異常系は P-ANON）

### 正常系

- `/search` で `q` / `adv` なし → `/` に 301 redirect [integration] — docs/search.md の「canonical / noindex」
- 404（未定義ルート）の構造（React Router v7 framework mode default） [browser] — docs/overview.md の「全ページマップ」

### 境界値

- `/search?q=xxx&db=unknown_db`（allowlist 外 DB 値） [integration] — docs/search.md の「db パラメータの値」
- `adv` に構文エラー DSL → 400 Problem Details [integration] — docs/search-backends.md の「エラーレスポンス」

### エッジケース

- Problem Details の `type: https://ddbj.nig.ac.jp/problems/<slug>` / `code` / `position.{line,column,length}` の整形 [unit] — docs/search-backends.md の「エラーレスポンス」
- UI は `detail` をそのまま `Callout type="error"` に出す [browser] — docs/search-backends.md の「エラーレスポンス」

### 異常系

- エラーコード 8 種の UI 側表示（`UNEXPECTED_TOKEN` / `UNKNOWN_FIELD` / `FIELD_NOT_AVAILABLE_IN_CROSS_DB` / `INVALID_DATE_FORMAT` / `INVALID_OPERATOR_FOR_FIELD` / `NEST_DEPTH_EXCEEDED` / `MISSING_VALUE` / `INVALID_QUERY_COMBINATION`）を MSW stub で 400 Problem Details 返却し Callout 表示 [browser] — docs/search-backends.md の「エラーレスポンス」
- 横断モードで Tier 3 使用 → `FIELD_NOT_AVAILABLE_IN_CROSS_DB` の貫通確認 [integration] — docs/search-backends.md の「エラーレスポンス」
- ネスト深さ 6（上限 5 超） → `NEST_DEPTH_EXCEEDED` の貫通確認 [integration] — docs/search-backends.md の「エラーレスポンス」

---

## 機能 10: トップページ (/) (TOP)

**docs ref**: [overview.md](../docs/overview.md) / [search.md](../docs/search.md)
**既定ペルソナ**: P-ANON

### 正常系

- 横断検索ボックス + DB セレクタが中央配置 [browser] — docs/overview.md の「ページ構成」
- DB / リソース一覧、登録への動線（`/submit` リンク） [browser] — docs/overview.md の「ページ構成」
- SSR or プリレンダで配信、`robots: index, follow` [unit] — docs/overview.md の「全ページマップ」

### 境界値

- キーワード入力 + DB セレクタ（`All Databases`）+ Enter → `/search?q=xxx` [browser] — docs/search.md の「検索フロー」
- キーワード入力 + DB セレクタ（個別 DB）+ Enter → `/search?q=xxx&db=yyy` [browser] — docs/search.md の「検索フロー」
- DB セレクタ選択肢: 8 DB + "All Databases"（横断、デフォルト） [unit] — docs/search.md の「DB 一覧」

### エッジケース

- 記号のみ入力（`HIF-1`）で遷移し、結果画面で自動フレーズ化された状態 [browser] — docs/search.md の「記号を含むトークンの自動フレーズ化」
- Examples チップクリックで検索ボックス入力 + submit [browser] — docs/search.md の「シンプル検索ボックスの UI 補助」

---

## 機能 11: i18n（言語切替・cookie 永続化・SSR/hydration 整合） (I18N)

**docs ref**: [overview.md](../docs/overview.md) / [submit.md](../docs/submit.md)
**既定ペルソナ**: P-ANON

### 正常系

- 初回 SSR 時 loader が `Cookie: lang=ja` を読み取り、i18next 初期言語に渡す [unit] — docs/overview.md の「i18n」
- cookie 未設定時 `Accept-Language: ja` → 日本語、それ以外 → 英語 [unit] — docs/overview.md の「i18n」
- UI トグルで言語切替、cookie `lang=ja|en` に保存（`SameSite=Lax; Path=/; Max-Age=31536000`、production のみ `Secure`） [browser] — docs/overview.md の「i18n」
- react-i18next detector 検出順 `cookie → navigator` [unit] — docs/overview.md の「i18n」
- URL に言語パラメータを含めない（同一 URL で切替、hreflang も出さない） [unit] — docs/overview.md の「i18n」

### 境界値

- cookie 値 `ja` / `en` 以外（`fr` 等）は英語にフォールバック [unit] — docs/overview.md の「i18n」
- cookie 最大期間 1 年（31536000 秒） [unit] — docs/overview.md の「i18n」

### エッジケース

- 詳細パネル本文は言語別 TSX（`MicrobialGenomeDetail.ja.tsx` / `.en.tsx`）で切替 [unit] — docs/submit.md の「i18n」、docs/overview.md の「翻訳リソースの管理」
- UI テキスト（JSON）とコンテンツページ（TSX）で管理方式が分かれる [unit] — docs/overview.md の「翻訳リソースの管理」
- hydration フラッシュなし（SSR と client の初期言語が一致） [integration] — docs/overview.md の「i18n」

### 異常系

- cookie パース失敗時のフォールバック動作 [unit] — docs/overview.md の「i18n」

---

## 機能 12: Search API fetch 層 (API)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md) / [deployment.md](../docs/deployment.md)
**既定ペルソナ**: P-ANON

### 正常系

- TanStack Query `useQueries` で 3 並列 fetch（ES / ARSA / TXSearch） [unit] — docs/search.md の「段階表示（progressive rendering）」
- `/db-portal/search?q=<keyword>` で count 先行取得（2 段構成） [integration] — docs/search-backends.md の「2 段構成（count 先行 + 詳細 fetch）」
- `/db-portal/search?q=<keyword>&db=<id>` で結果リスト取得 [integration] — docs/search-backends.md の「endpoint 設計」

### 境界値

- Search API URL の環境別切替（dev/staging = `https://ddbj-staging.nig.ac.jp/search/api`、production = `https://ddbj.nig.ac.jp/search/api`） [integration] — docs/deployment.md の「環境変数」
- `databases[]` の 8 要素（bioproject / biosample / sra / trad / taxonomy / jga / gea / metabobank）が揃う [unit] — docs/search-backends.md の「部分失敗ポリシー」

### エッジケース

- MSW stub で error 種別 4 種（timeout / upstream_5xx / connection_refused / unknown）の再現 [unit] — docs/search-backends.md の「部分失敗ポリシー」
- count のみ軽量取得（`rows=0` / `size=0`） [integration] — docs/search-backends.md の「2 段構成（count 先行 + 詳細 fetch）」

### 異常系

- Problem Details 応答のパース（`application/problem+json`、`type` / `title` / `status` / `detail` / `instance` / `code` / `position`） [unit] — docs/search-backends.md の「エラーレスポンス」
- fetch タイムアウト（横断検索全体 20s 超過分を `null` 化、fake timer 前提） [unit] — docs/search-backends.md の「タイムアウト初期値」

---

## 機能 13: シンプル検索（UI） (SIMPLE)

**docs ref**: [search.md](../docs/search.md) / [search-backends.md](../docs/search-backends.md)
**既定ペルソナ**: P-ANON

### 正常系

- スペース区切り = 暗黙 AND [unit] — docs/search.md の「シンプル検索ボックス」
- `"Homo sapiens"` でフレーズ検索 [unit] — docs/search.md の「シンプル検索ボックス」
- 大文字小文字区別なし [unit] — docs/search.md の「シンプル検索ボックス」
- プレースホルダ `例: "Homo sapiens" BRCA1` のような併記例 [browser] — docs/search.md の「シンプル検索ボックスの UI 補助」
- 検索ボックス下の small text 「スペース区切りで AND 検索。…」の案内 [browser] — docs/search.md の「シンプル検索ボックスの UI 補助」
- Accession 風入力（`PRJDB12345`）は通常の全文検索（特別判定なし） [unit] — docs/search.md の「Accession 入力時の挙動」
- 大文字 Boolean（`AND` / `OR` / `NOT`）もリテラル扱い（エラーにしない） [unit] — docs/search.md の「シンプル検索ボックス」
- 括弧 `()` / ワイルドカード `*` `?` / フィールド指定 `field:value` / ファジー `~` もリテラル扱い [unit] — docs/search.md の「シンプル検索ボックス」
- フレーズ内のダブルクォートは受け付けない（クォート解析で消費） [unit] — docs/search-backends.md の「シンプル検索ボックスからの入力」
- フレーズ内のバックスラッシュ `\` は `\\` にエスケープ [unit] — docs/search-backends.md の「シンプル検索ボックスからの入力」

### 境界値

- 記号判定文字集合（`- / . + : * ? ( ) [ ] { } ^ ~ ! | & \`）を含むトークンは自動フレーズ化 [unit, PBT] — docs/search-backends.md の「クエリ変換」
- 記号を含まない単語 `BRCA1` はそのまま [unit] — docs/search-backends.md の「クエリ変換」
- `HIF-1` / `BRCA1/2` / `E. coli` / `CD4+` の自動フレーズ化 [unit] — docs/search.md の「記号を含むトークンの自動フレーズ化」

### エッジケース

- 未閉じクォート `"Homo sapiens`（末尾未閉）を末尾まで閉じられず無視してリテラル扱い [unit] — docs/search-backends.md の「シンプル検索ボックスからの入力」
- 日本語トークンはフレーズ化しない（記号判定文字集合に日本語句読点を含めない） [unit] — docs/search-backends.md の「日本語入力の扱い」
- 空クエリ `/search?q=` の扱い（`MISSING_VALUE` 寄り） [integration] — docs/search-backends.md の「値のバリデーション」

---

## 次のステップ

- 機能 1-a（SR-FX）を見本に、実装時に各機能の観点を ID 付きシナリオへ詳細化する
- 観点 → シナリオ ID 化のルール:
  - **1 シナリオ = 1 期待値** を目安に分解
  - 1 観点が 5 行以上に分解されるなら、観点段階で先に細分化する
  - シナリオは連番で付与し、削除時は欠番のまま残す
- 観点に変更があれば、対応する docs/ を先に更新してから scenarios.md に反映する
- SR-FX 以外にも 1 機能（例: ADV-DSL）を ID 化して例を増やすか、実装着手時に検討
