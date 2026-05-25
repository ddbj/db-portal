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
  3. 検索ボックスに `cancer` と入力し、検索ボタンをクリック
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
  1. 「+ 条件を追加」 → field=organism、op==、value="Homo sapiens" を入力
  2. 「+ 条件を追加」 → field=date_published、from=2022-01-01、to=2024-12-31
  3. 「この条件で検索」 button をクリック
- **期待**:
  - 検索条件が `mergeAstAnd` で AND 結合される
  - `/search/results?q=...` に遷移し、`?q=` に `organism:"Homo sapiens" AND date_published:[2022-01-01 TO 2024-12-31]` 相当の DSL が乗る
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
  1. `/search/results?q=organism%3A%5B%5B` (`organism:[[` の URL 化、invalid)
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

## Submit Domain

### S-SUBMIT-01: /submit 初期表示

- **ペルソナ**: P-ANON
- **前提**: portal staging が起動済
- **手順**:
  1. `/submit` を開く
- **期待**:
  - ヘッダー nav `登録` が active 状態 (`aria-current="page"`)
  - PageTitle `登録ナビゲーション`
  - ファイルテーブル section に 9 種類のファイル種別ボタン (3 × 3 grid) と空テーブル placeholder `NO FILES` が表示
  - 登録フロー section に「ファイルを追加すると、必要な登録手順 ...」 Callout が表示
  - PartialFailureBanner は表示されない

### S-SUBMIT-02: 配列リード行 1 件追加で Step が組まれる

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. `配列リード` ボタンをクリック
  2. 開いた modal で「保存」 をクリック
  3. テーブル行で生物 selector を `eukaryote` に変更、ファイル名に `read-001_R1.fastq.gz` を入力
- **期待**:
  - テーブルに 1 行が追加され、ファイル名・生物・公開区分 (default `open`) が反映
  - 登録フロー section に `BioProject` `BioSample` `DRA` の Step カードが順に表示
  - 各 Step カードに service tag (DDBJ) と placeholder accession (例 `PRJDB######`) と外部誘導 button が表示

### S-SUBMIT-03: 混在 5 行投入で multi step が組まれる

- **ペルソナ**: P-ANON
- **前提**: `/submit` 初期表示
- **手順**:
  1. `配列リード` × 2 / `組み立て済み配列` / `変異情報` / `表現型データ` の 5 ボタンを順次クリックして 5 行追加
  2. 各行の生物 selector を `Homo sapiens` / `eukaryote` のいずれかに設定、ファイル名を入力
  3. 各行の `+ 設定` (または `pair-end · ...` chip) をクリックして modal を開き、保存
- **期待**:
  - テーブルに 5 行
  - 登録フロー section に `Umbrella BioProject` / `BioProject` (organism 別に複数) / `BioSample` (organism 別) / `DRA` / `DDBJ Mass` / その他必要な Step が並ぶ
  - TagProgress が「3-5 / 5」 を表示し、進捗バーが進む

### S-SUBMIT-04: open / restricted の分岐

- **ペルソナ**: P-ANON
- **手順**:
  1. `配列リード` を 2 件追加
  2. 1 件目の生物を `human` / 公開区分を `restricted`、2 件目を `eukaryote` / `open` に設定
- **期待**:
  - 登録フロー に `JGA` Step (restricted human) と `DRA` Step (open eukaryote) が両方表示
  - JGA Step に DBCLS 申請依頼の warning note (`submit.jga.dbclsApplicationRequired`) が出る

### S-SUBMIT-05: 行詳細 modal 編集で Step が再生成

- **ペルソナ**: P-ANON
- **前提**: 配列リード 1 行追加済 (生物 `eukaryote`、ファイル名入力済)
- **手順**:
  1. テーブルの該当行で `+ 設定` をクリック → modal が open
  2. 「リードの構成は?」 で `pair-end FASTQ` を選択
  3. 「保存」 をクリック
- **期待**:
  - テーブルの「データ詳細」 セルに `pair-end · …` の RowSetTag (brand-soft 背景 + check icon) が表示
  - 登録フロー の DRA Step プレビューが再描画 (右側 ModalPreview にも反映)

### S-SUBMIT-06: 削除で Step が減る

- **ペルソナ**: P-ANON
- **前提**: 2 行追加済 (配列リード 1 / 組み立て済み配列 1)
- **手順**:
  1. テーブル最後の行で `×` (削除) をクリック → confirm modal
  2. 「削除する」 をクリック
- **期待**:
  - テーブル行が 1 件減る
  - 登録フローの Step カードが該当 service だけ消える

### E-SUBMIT-01: 必須項目未入力で warn 表示

- **ペルソナ**: P-ANON
- **前提**: 配列リード 1 行追加直後
- **手順**:
  1. ファイル名と生物を未入力のまま画面を観察
- **期待**:
  - 生物 selector とファイル名 input が warn 配色 (warn-bg + warn-border)
  - PartialFailureBanner に「ファイル名が未入力です」「生物が未選択です」 の 2 件が表示
  - 「→ 該当行 #1」 link クリックで行編集 modal が開く

### E-SUBMIT-02: GroupType 不整合で警告

- **ペルソナ**: P-ANON
- **前提**: マイクロアレイ発現 1 行追加 (GroupType `mage-tab`)、同 group に手動で `mass-spec` 行を追加するシナリオ (現状 UI からは届かないが、reducer で起こしうる状態)
- **期待**:
  - PartialFailureBanner に「GroupType がボタン種別と整合していません」 が表示
  - 該当行 link で modal が開く

### E-SUBMIT-03: 100 行追加でも UI が応答する

- **ペルソナ**: P-ANON
- **手順**:
  1. `配列リード` ボタンを 100 回連続クリック
- **期待**:
  - テーブルに 100 行が描画 (横スクロール許容、modal は最後の 1 行のみ open)
  - 100 行の Step プレビュー (BS / BP / DRA) が表示される
  - 入力中の体感に大きな遅延がない (60fps 維持目標、リリース時点では性能チューニングしないため目視評価)

## News Domain

### S-NEWS-01: /news で一覧表示

- **ペルソナ**: P-ANON
- **手順**:
  1. `/news` を開く
- **期待**:
  - 「お知らせ・ニュース」 ページタイトルが表示
  - 一覧が date 降順で表示
  - サイドバーに 種別 / 年 / サービス の facet group

### S-NEWS-02: facet で絞り込み、URL に反映

- **ペルソナ**: P-ANON
- **手順**:
  1. `/news` を開く
  2. 種別 facet で `リリース` を選択
  3. 年 facet で `2024` を選択
- **期待**:
  - URL が `/news?category=release&year=2024` に更新 (params alphabet sort)
  - 一覧が release かつ 2024 年の item に絞り込まれる
  - AppliedFilters に 2 chip 表示

### S-NEWS-03: NotificationBar に announcement が表示

- **ペルソナ**: P-ANON
- **手順**:
  1. `/` を開く
- **期待**:
  - 全 page 上部に NotificationBar が表示
  - `category === "announcement"` かつ `retireTime > now` の最新 1 件のみ表示
  - 「閉じる」 で次の候補に遷移、sessionStorage に dismissed id 保存

### S-NEWS-04: トップ右ペインに 8 件 + 「すべて見る」

- **ペルソナ**: P-ANON
- **手順**:
  1. `/` を開く
- **期待**:
  - 右ペインに news 上位 8 件 (date 降順)
  - 「すべて見る」 リンクで `/news` に遷移

### E-NEWS-01: GitHub API 障害時の挙動

- **ペルソナ**: P-OPS
- **手順**:
  1. GitHub API を遮断した状態で server を起動
  2. `/api/news` を叩く
- **期待**:
  - disk cache が空でも 200 で空配列を返す
  - disk cache がある状態なら cache から応答

### E-NEWS-02: 不正 front matter で起動時に検出

- **ペルソナ**: P-OPS
- **手順**:
  1. `date` field が欠落した markdown を含む状態で mirror polling 実行
- **期待**:
  - 該当 item は `toNewsItem` で undefined になり skip
  - log に warn `news_mirror_failed` 等で記録される

## Auth Domain

### S-AUTH-01: 未認証で Header に「ログイン」 button

- **ペルソナ**: P-ANON
- **手順**:
  1. `/` を開く
- **期待**:
  - `/api/me` が 401
  - Header 右に「ログイン」 button (`buildLoginUrl(currentPath)` を href)

### S-AUTH-02: Keycloak 経由でログイン完了 → user 名表示

- **ペルソナ**: P-USER
- **手順**:
  1. `/databases/bioproject` で「ログイン」 click
  2. Keycloak で `ts-db-portal-dev` を入力
  3. portal に戻ってくる
- **期待**:
  - `/api/auth/login` → Keycloak authorization URL に 302
  - `/api/auth/callback` で state 検証 + code → token 交換成功
  - `Set-Cookie: sid=...; HttpOnly; SameSite=Lax`
  - returnTo `/databases/bioproject` に遷移
  - Header 右に user 名 + ログアウト

### S-AUTH-03: ログアウトで session 削除

- **ペルソナ**: P-USER (login 済)
- **手順**:
  1. Header の「ログアウト」 click
- **期待**:
  - `/api/auth/logout` → Keycloak `end_session_endpoint` に 302 (`id_token_hint` 付き)
  - Keycloak が session を切り `/api/auth/logout-callback` に戻す
  - session 削除 + `Set-Cookie: sid=; Max-Age=0`
  - returnTo へ 302
  - Header に「ログイン」 が再表示

### E-AUTH-01: callback で state 不一致

- **ペルソナ**: P-ANON
- **手順**:
  1. 攻撃者が用意した `/api/auth/callback?code=x&state=evil` を被害者に踏ませる
- **期待**:
  - pendingLogins に `evil` state が存在せず 400 `invalid_state`
  - cookie 発行されない

### E-AUTH-02: token refresh 失敗で 401

- **ペルソナ**: P-USER
- **手順**:
  1. login 済の状態で Keycloak の refresh 拒否を発生させる
  2. `/api/me` を呼ぶ
- **期待**:
  - background refresh が失敗
  - session 削除、401 を返す
  - Header が「ログイン」 に戻る

## LLM Domain

### S-LLM-01: AI 検索アシスタントで proposal 受信

- **ペルソナ**: P-USER
- **手順**:
  1. `/search` を開く (LLM available 環境)
  2. AI アシスタント textarea に「human breast cancer rna-seq from 2023」 と入力
  3. 「生成」 click
- **期待**:
  - SSE で `event: message` が streaming token として流れる
  - `event: done` で final JSON が届く
  - Apply button で Advanced builder state に反映される

### S-LLM-02: /api/llm/health が ready で表示

- **ペルソナ**: P-ANON
- **手順**:
  1. LLM 設定済環境で `/search` を開く
- **期待**:
  - `/api/llm/health` が `{ status: "ok", model: ... }`
  - SearchAssistant が表示される

### E-LLM-01: vLLM 停止状態で UI 非表示

- **ペルソナ**: P-ANON
- **手順**:
  1. vLLM を停止した状態で `/api/llm/health` を叩く
- **期待**:
  - `{ status: "unreachable", reason: ... }`
  - SearchAssistant が render されない (機能の存在自体を隠す)

### E-LLM-02: SSE 切断で toast + 入力欄復元

- **ペルソナ**: P-USER
- **手順**:
  1. アシスタント生成中に vLLM 切断
- **期待**:
  - `event: error` で `{ code, message }` を受信
  - toast 表示 + 入力欄に元の input を戻す
  - state が `error` に遷移


## Top Domain

### S-TOP-01: ja トップ訪問で hero + tile + aside が表示

- **ペルソナ**: P-ANON
- **手順**:
  1. `/` を訪問
- **期待**:
  - Header active = top
  - Hero に `<SearchBox size="lg">` + example chip 3 件 + 「クエリビルダーで詳細条件を組む →」 link
  - ServiceGrid に primary-service の Service tile 6 件
  - PopularResources に DDBJ 7 件 / DBCLS 5 件
  - 右 aside に NewsAside (8 件、sticky)
  - Breadcrumb は描画されない (`useBreadcrumb` が 0 件)

### S-TOP-02: en トップ訪問で en リソース表示

- **ペルソナ**: P-ANON
- **手順**:
  1. `/en` を訪問
- **期待**:
  - `<html lang="en">`
  - hero / tile / Popular Resources / NewsAside すべて en の文言
  - Service tile internal link が `/en/search` `/en/submit` に向く
  - Popular Resource の `/databases/bioproject` link が `/en/databases/bioproject` に向く

### S-TOP-03: hero 検索で /search/results に遷移

- **ペルソナ**: P-ANON
- **手順**:
  1. `/` を訪問
  2. SearchBox に `cancer` と入力
  3. submit
- **期待**:
  - `/search/results?q=cancer` に遷移
  - 検索結果が表示される (cross-DB)
  - ja URL を維持

### E-TOP-01: News mirror 未準備での top render

- **ペルソナ**: P-ANON
- **手順**:
  1. News cache が空 (mirror 起動前) の状態で `/` を訪問
- **期待**:
  - NewsAside が loading (skeleton 相当) または empty 状態で表示される
  - 他の section (Hero / ServiceGrid / PopularResources) は通常通り render される
  - エラーバナーは出さない

## Content (Databases) Domain

### S-CONTENT-01: /databases/bioproject ja 表示と breadcrumb

- **ペルソナ**: P-ANON
- **手順**:
  1. `/databases/bioproject` を訪問
- **期待**:
  - `<h1>BioProject</h1>` + description
  - body[ja] (Section + Callout + 各種 section)
  - Breadcrumb `ホーム > データベース > BioProject`
  - Related databases section に `BioSample` / `DRA` の TextLink
  - External links section に NCBI / EBI / DDBJ 公式
  - 最終更新日 (例 "2026/05/25")

### S-CONTENT-02: /en/databases/bioproject en 表示

- **ペルソナ**: P-ANON
- **手順**:
  1. `/en/databases/bioproject` を訪問
- **期待**:
  - `<h1>BioProject</h1>` + en description
  - body[en] (Section + Callout)
  - Breadcrumb `Home > Databases > BioProject`
  - Related databases に BioSample / DRA (en title でも内容は同)
  - 最終更新日 (en locale 表示、例 "May 25, 2026")
  - TranslationUnavailable バナー無し (handle.i18n.en === "complete")

### S-CONTENT-03: /databases/biosample ja 表示

- **ペルソナ**: P-ANON
- **手順**:
  1. `/databases/biosample` を訪問
- **期待**:
  - `<h1>BioSample</h1>` + body[ja]
  - SAMD アクセッション説明
  - Related databases に BioProject / DRA
  - External links に NCBI BioSample / EBI BioSamples

### E-CONTENT-01: 未知 slug で 404

- **ペルソナ**: P-ANON
- **手順**:
  1. `/databases/unknown-slug` を訪問
- **期待**:
  - HTTP 404
  - ErrorBoundary が "404 Not Found" を表示

### E-CONTENT-02: 翻訳未完成 page で TranslationUnavailable

- **ペルソナ**: P-ANON
- **手順**:
  1. 仮に handle.i18n.en = "missing" な database page を `/en/databases/<slug>` で訪問
- **期待**:
  - TranslationUnavailable バナーが Header と main の間に出る
  - "Switch to Japanese version" link で `/databases/<slug>` に遷移
  - URL は en のまま (リダイレクトしない)

