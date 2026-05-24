# E2E Scenarios

Playwright を staging URL に対して回す。各シナリオはペルソナ / 前提 / 手順 / 期待 を持つ。

## Personas

| ID | 名前 | 認証 |
|---|---|---|
| P-ANON | 未認証ユーザー | なし |
| P-USER | 一般ユーザー (DDBJ Account login) | Keycloak JWT |

## Domains

| Domain | 接頭辞 | 説明 |
|---|---|---|
| TOP | `S-TOP` / `E-TOP` | トップページ |
| SEARCH | `S-SEARCH` / `E-SEARCH` | 検索ビルダ / 結果 |
| SUBMIT | `S-SUBMIT` / `E-SUBMIT` | 登録ナビ |
| NEWS | `S-NEWS` / `E-NEWS` | ニュース一覧 |
| AUTH | `S-AUTH` / `E-AUTH` | サインイン / サインアウト |
| LLM | `S-LLM` / `E-LLM` | AI アシスタント |
| CONTENT | `S-CONTENT` / `E-CONTENT` | データベース解説 |
| FLOW | `S-FLOW` / `E-FLOW` | 機能横断シナリオ |

## Search Domain

### S-SEARCH-01: トップ → /search → 検索実行

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済
- **手順**:
  1. `/` を開く
  2. ヘッダーの「検索」 ナビをクリック → `/search` 遷移
  3. 検索ボックスに `cancer` と入力し、 検索ボタンをクリック
- **期待**:
  - URL が `/search/results?q=cancer` に変わる
  - ページタイトル「データベース横断検索」 が表示される

### S-SEARCH-02: cross-DB 結果のヒット数カード表示

- **ペルソナ**: P-ANON
- **前提**: ddbj-search-api staging 到達可能
- **手順**:
  1. `/search/results?q=cancer` を直接開く
- **期待**:
  - 8 つの DB (trad / sra / bioproject / biosample / jga / gea / metabobank / taxonomy) ヒット数カードが描画される
  - 各カードに `count` の数値と「結果一覧」 link が表示される
  - 0 件 DB のカードも `0` 表示で常に描画される (固定 8 件)

### S-SEARCH-03: cross → per-DB 遷移と sidebar facet

- **ペルソナ**: P-ANON
- **前提**: S-SEARCH-02 の URL から
- **手順**:
  1. BioProject カードの「結果一覧」 link をクリック
- **期待**:
  - URL が `/search/results?q=cancer&db=bioproject` に変わる
  - 左 sidebar に絞り込み (organism / 登録機関 / 研究タイプ / 公開日 facet)
  - main に record card 一覧
  - 右 pane に AI 検索アシスタント (LLM available 時のみ)
  - 上下に pagination

### S-SEARCH-04: Advanced builder → URL `?q=` 更新

- **ペルソナ**: P-ANON
- **前提**: `/search` を開く
- **手順**:
  1. 「+ 条件を追加」 → field=organism、 op==、 value="Homo sapiens" を入力
  2. 「+ 条件を追加」 → field=date_published、 from=2022-01-01、 to=2024-12-31
  3. 「この条件で検索」 button をクリック
- **期待**:
  - 検索条件が `mergeAstAnd` で AND 結合される
  - `/search/results?q=...` に遷移し、 `?q=` に `organism:"Homo sapiens" AND date_published:[2022-01-01 TO 2024-12-31]` 相当の DSL が乗る
  - debounce 700 ms 以内に Query Preview に DSL が更新表示される

### S-SEARCH-05: Sidebar facet → URL `?q=` 更新

- **ペルソナ**: P-ANON
- **前提**: `/search/results?q=cancer` を開く
- **手順**:
  1. Sidebar facet で `生物種: Homo sapiens` を選択
- **期待**:
  - 700 ms 以内に URL の `?q=` が `cancer AND organism:"Homo sapiens"` 相当に更新される
  - `navigate(..., { replace: true })` なので履歴は積まれない

### S-SEARCH-06: URL `?q=` で復元 (ブクマ共有)

- **ペルソナ**: P-ANON
- **前提**: なし
- **手順**:
  1. `/search/results?q=organism%3A%22Homo+sapiens%22+AND+date_published%3A%5B2022-01-01+TO+2024-12-31%5D&db=bioproject` を直接開く
- **期待**:
  - SearchBox に DSL が反映される
  - Sidebar facet の生物種 / 公開日が選択済状態で復元される
  - per-DB record card list が表示される

### E-SEARCH-01: 不正 DSL の URL

- **ペルソナ**: P-ANON
- **手順**:
  1. `/search/results?q=organism%3A%5B%5B` (`organism:[[` の URL 化、 invalid)
- **期待**:
  - ErrorBoundary か Callout で「URL のクエリを解析できませんでした」 が表示される
  - 「クエリビルダーで編集」 link で `/search` に戻れる

### E-SEARCH-02: /db-portal/cross-search 5xx

- **ペルソナ**: P-ANON
- **前提**: ddbj-search-api を mock で 503 を返す状態 (staging では到達できない場合に再現)
- **手順**:
  1. `/search/results?q=cancer` を開く
- **期待**:
  - エラーバナーで「横断検索に失敗しました」 が表示される
  - 「再試行」 button で再 navigation 可能

### E-SEARCH-03: LLM 未到達で AI assistant が非表示

- **ペルソナ**: P-ANON
- **前提**: `DB_PORTAL_LLM_BASE_URL` 未設定 (`/api/llm/health` → `{status:"unset"}`)
- **手順**:
  1. `/search` を開く
  2. `/search/results?q=cancer&db=bioproject` を開く
- **期待**:
  - 両画面で AI 検索アシスタント セクションが DOM に描画されない (`null` return)
  - エラーバナーや placeholder は出ない
