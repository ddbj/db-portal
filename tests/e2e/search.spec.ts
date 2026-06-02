import { expect, test } from "./helpers"

const CARD_ORDER = [
  "trad",
  "bioproject",
  "biosample",
  "sra",
  "jga",
  "taxonomy",
  "gea",
  "metabobank",
] as const

test.describe("Search Domain", () => {
  test("S-SEARCH-01: トップ → /search → 検索実行", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("link", { name: /検索|Search/ }).first().click()
    await expect(page).toHaveURL(/\/search$/)

    const keyword = page.getByRole("textbox", { name: /検索キーワード|Search keywords/ })
    await keyword.fill("cancer")
    await keyword.press("Enter")

    await expect(page).toHaveURL(/\/search\/results\?q=cancer$/, { timeout: 15_000 })
    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    await expect(page).toHaveTitle(/Search|Results/)
  })

  test("S-SEARCH-02: cross-DB 結果のヒット数カードが 8 枚固定で描画", async ({ page }) => {
    await page.goto("/search/results?q=cancer")

    const cards = page.getByTestId("db-card")
    await expect(cards).toHaveCount(8, { timeout: 20_000 })

    for (const db of CARD_ORDER) {
      const card = page.locator(`[data-testid="db-card"][data-db="${db}"]`)
      await expect(card).toHaveCount(1)
      await expect(card.getByRole("heading", { level: 3 })).toBeVisible()
      await expect(card.getByRole("link", { name: /結果一覧|Open results/ })).toHaveCount(1)
    }
  })

  test("S-SEARCH-03: cross → per-DB 遷移と sidebar / 2 ペイン構造", async ({ page }) => {
    await page.goto("/search/results?q=cancer")

    const card = page.locator('[data-testid="db-card"][data-db="bioproject"]')
    await card.getByRole("link", { name: /結果一覧|Open results/ }).click()

    await expect(page).toHaveURL(/\/search\/results\?q=cancer&db=bioproject$/, { timeout: 15_000 })

    const sidebar = page.locator("aside").filter({ hasText: /絞り込み|Filters/ })
    await expect(sidebar).toBeVisible({ timeout: 15_000 })
    await expect(sidebar.getByTestId("facet-organism")).toBeVisible()
    await expect(sidebar.getByTestId("facet-objectType")).toBeVisible()
    await expect(sidebar.getByTestId("text-submitter")).toBeVisible()

    await expect(
      page.getByRole("region", { name: /検索結果|Search results/ }),
    ).toBeVisible()
    await expect(
      page.getByLabel(/クエリプレビュー|Query preview/).first(),
    ).toBeVisible()

    // AI is folded into the box toggle; there is no separate assistant region.
    await expect(
      page.getByRole("region", { name: /AI 検索アシスタント|AI search assistant/i }),
    ).toHaveCount(0)
  })

  test("S-SEARCH-04: Advanced builder → ?q= 更新と検索実行 (生物種 ID + 学名 の 2 条件)", async ({ page }) => {
    await page.goto("/search")

    // Row 1: 生物種 ID (organism_id, identifier) と一致 9606
    await page.getByRole("button", { name: /\+ 条件を追加|\+ Add condition/ }).first().click()
    await page.getByRole("combobox", { name: /検索フィールド|Search field/ }).last().click()
    await page.getByRole("option", { name: /生物種 ID|Organism \(taxonomy ID\)/ }).click()
    await page.getByRole("combobox", { name: /条件の演算子|Operator/ }).last().click()
    await page.getByRole("option", { name: /^と一致$|^equals$/ }).click()
    await page.getByRole("combobox", { name: /値を入力|Enter value/ }).last().fill("9606")

    // Row 2: 学名 (organism_name, text) を含む Homo sapiens
    await page.getByRole("button", { name: /\+ 条件を追加|\+ Add condition/ }).first().click()
    await page.getByRole("combobox", { name: /検索フィールド|Search field/ }).last().click()
    await page.getByRole("option", { name: /学名|Organism \(name\)/ }).click()
    await page.getByRole("combobox", { name: /条件の演算子|Operator/ }).last().click()
    await page.getByRole("option", { name: /を含む|contains/ }).click()
    await page.getByRole("textbox", { name: /値を入力|Enter value/ }).last().fill("Homo sapiens")

    // Live preview reflects both conditions after the debounce / serialize.
    const preview = page.getByLabel(/クエリプレビュー|Query preview/).first()
    await expect(preview).toContainText("organism_id:9606", { timeout: 15_000 })
    await expect(preview).toContainText("organism_name:")

    await page.getByRole("button", { name: /この条件で検索|Search with these conditions/ }).click()

    await expect(page).toHaveURL(/\/search\/results\?q=/, { timeout: 15_000 })
    const q = new URL(page.url()).searchParams.get("q") ?? ""
    expect(q).toContain("organism_id")
    expect(q).toContain("organism_name")
  })

  test("S-SEARCH-05: Sidebar facet トグル → ?q= 即時更新 (replace)", async ({ page }) => {
    await page.goto("/search/results?q=cancer&db=bioproject")

    const checkbox = page
      .getByTestId("facet-organism")
      .getByRole("checkbox")
      .first()
    await expect(checkbox).toBeVisible({ timeout: 15_000 })
    await checkbox.check()

    await expect(page).toHaveURL(/organism_id%3A|organism_id:/, { timeout: 15_000 })
    const url = new URL(page.url())
    const q = url.searchParams.get("q") ?? ""
    expect(q).toContain("cancer")
    expect(q).toContain("organism_id")
    expect(url.searchParams.get("db")).toBe("bioproject")
    // page resets to default 1 (omitted from the URL).
    expect(url.searchParams.get("page")).toBeNull()
  })

  test("S-SEARCH-06: URL ?q= からのキーワードボックス復元", async ({ page }) => {
    await page.goto(
      "/search/results?q=organism_id%3A9606%20AND%20date_published%3A%5B2022-01-01%20TO%202024-12-31%5D&db=bioproject",
    )

    const preview = page.getByLabel(/クエリプレビュー|Query preview/).first()
    await expect(preview).toBeVisible({ timeout: 15_000 })
    await expect(preview).toContainText("organism_id:9606")
    await expect(preview).toContainText("date_published")

    await expect(
      page.getByRole("region", { name: /検索結果|Search results/ }),
    ).toBeVisible()
    await expect(
      page.getByText(/クエリを解析できませんでした|Could not parse the query/),
    ).toHaveCount(0)
  })

  test("S-SEARCH-07: per-DB の pagination / perPage / sort が実 /db-portal/search 契約を通る", async ({ page }) => {
    await page.goto("/search/results?q=cancer&db=bioproject")

    const summary = page.getByText(/件中|of /).first()
    await expect(summary).toBeVisible({ timeout: 20_000 })

    // perPage 50
    await page.getByRole("combobox", { name: /1 ページあたり|Per page/ }).click()
    await page.getByRole("option", { name: "50" }).click()
    await expect(page).toHaveURL(/perPage=50/, { timeout: 15_000 })
    expect(new URL(page.url()).searchParams.get("page")).toBeNull()
    await expect(page.getByText(/1-50|1-\d/).first()).toBeVisible({ timeout: 15_000 })

    // sort 新しい順 (date_desc)
    await page.getByRole("combobox", { name: /並び替え|Sort/ }).click()
    await page.getByRole("option", { name: /新しい順|Newest first/ }).click()
    await expect(page).toHaveURL(/sort=date_desc/, { timeout: 15_000 })
    expect(new URL(page.url()).searchParams.get("page")).toBeNull()

    // pagination 次へ
    await page.getByRole("button", { name: /次のページ|Next page/ }).first().click()
    await expect(page).toHaveURL(/page=2/, { timeout: 15_000 })
    await expect(page.getByText(/\b51-|51 件/).first()).toBeVisible({ timeout: 15_000 })
  })

  test("S-SEARCH-08: クエリビルダーで編集: results → /search?q=&db= の db scope parse 往復", async ({ page }) => {
    await page.goto(
      "/search/results?q=object_type%3A%22BioProject%22%20AND%20cancer&db=bioproject",
    )

    await expect(
      page.getByText(/クエリを解析できませんでした|Could not parse the query/),
    ).toHaveCount(0)

    await page.getByRole("button", { name: /クエリビルダーで編集|Edit in builder/ }).click()

    await expect(page).toHaveURL(/\/search\?q=.*&db=bioproject$/, { timeout: 15_000 })
    // db scope parse admits the Tier 3 object_type field: no syntax-warn Callout.
    await expect(
      page.getByText(/クエリを解析できませんでした。構文を確認してください|Could not parse the query\. Check the syntax/),
    ).toHaveCount(0)
    // free text "cancer" is restored into the keyword row.
    await expect(
      page.getByRole("textbox", { name: /キーワード|Keyword/ }).first(),
    ).toHaveValue(/cancer/, { timeout: 15_000 })
  })

  test("S-SEARCH-09: URL 復元で sidebar facet / date レンジが選択済みで描かれ per-DB list が出る", async ({ page }) => {
    await page.goto(
      "/search/results?q=organism_id%3A9606%20AND%20date_published%3A%5B2022-01-01%20TO%202024-12-31%5D&db=bioproject",
    )

    const organism = page.getByTestId("facet-organism")
    await expect(organism).toBeVisible({ timeout: 15_000 })
    // The taxID 9606 is restored: either a checked bucket, or the taxID box value.
    const checkedBucket = organism.getByRole("checkbox", { checked: true })
    const taxBox = organism.getByRole("textbox", { name: /生物種 ID|Taxonomy ID/ })
    if ((await checkedBucket.count()) === 0) {
      await expect(taxBox).toHaveValue(/9606/)
    } else {
      await expect(checkedBucket.first()).toBeChecked()
    }

    // The 公開日 date row is restored as a custom range showing 2022 / 2024 bounds,
    // and exposes a 解除 button in its group header.
    const dateGroup = page
      .locator("div")
      .filter({ has: page.getByText(/公開日|Date published/) })
      .filter({ has: page.getByRole("textbox", { name: /開始日/ }) })
      .first()
    await expect(dateGroup.getByRole("textbox", { name: /開始日/ })).toHaveValue("2022-01-01")
    await expect(dateGroup.getByRole("textbox", { name: /終了日/ })).toHaveValue("2024-12-31")
    await expect(
      dateGroup.getByRole("button", { name: /^(解除|Clear)$/ }).last(),
    ).toBeVisible()

    await expect(
      page.getByRole("region", { name: /検索結果|Search results/ }),
    ).toBeVisible()
  })

  test("S-SEARCH-10: cross-DB カードの count 数値と上位 hit が実 API データで描画される", async ({ page }) => {
    await page.goto("/search/results?q=cancer")

    await expect(page.getByTestId("db-card")).toHaveCount(8, { timeout: 20_000 })

    // At least one card shows a numeric hit count (toLocaleString, not "?").
    const counts = page.getByLabel(/ヒット件数|Hit count/)
    await expect(counts.first()).toBeVisible({ timeout: 15_000 })
    let numericCount = 0
    const total = await counts.count()
    for (let i = 0; i < total; i++) {
      const text = ((await counts.nth(i).textContent()) ?? "").trim()
      if (/^[0-9][0-9,]*$/.test(text)) numericCount++
    }
    expect(numericCount).toBeGreaterThan(0)

    // At least one top hit is an external link with target=_blank + rel.
    const externalHit = page
      .locator('[data-testid="db-card"] a[target="_blank"]')
      .first()
    await expect(externalHit).toBeVisible({ timeout: 15_000 })
    await expect(externalHit).toHaveAttribute("rel", /noopener/)
    await expect(externalHit).toHaveAttribute("href", /^https?:\/\//)
  })

  test("E-SEARCH-01: 不正 DSL の URL で parse 失敗 Callout", async ({ page }) => {
    await page.goto("/search/results?q=organism%3A%5B%5B")

    const callout = page.getByRole("status").filter({
      hasText: /URL のクエリを解析できませんでした|Could not parse the query in the URL/,
    })
    await expect(callout).toBeVisible({ timeout: 15_000 })
    await expect(callout.getByRole("button", { name: /再試行|Retry/ })).toBeVisible()
  })

  test("E-SEARCH-02: cross-search 5xx で横断検索失敗 Callout", async ({ page }) => {
    test.skip(
      true,
      "cross-search は SSR route loader が upstream を server-side fetch するため browser page.route() では 5xx を注入できない。errorKey:\"cross\" → crossSearchFailure 経路は loader の unit/msw で固定する",
    )
    await page.route("**/db-portal/cross-search**", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    )
    await page.goto("/search/results?q=cancer")

    const callout = page.getByRole("status").filter({
      hasText: /横断検索に失敗しました|Cross-database search failed/,
    })
    await expect(callout).toBeVisible({ timeout: 15_000 })
    await expect(callout.getByRole("button", { name: /再試行|Retry/ })).toBeVisible()
  })

  test("E-SEARCH-03: LLM unset で AI モード toggle が非表示", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unset" }),
      }),
    )

    await page.goto("/search")
    await expect(page.getByRole("search")).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("button", { name: /AI モード|AI mode/ }),
    ).toHaveCount(0)
    // The keyword input stays usable; no error banner is shown.
    await expect(
      page.getByRole("textbox", { name: /検索キーワード|Search keywords/ }),
    ).toBeVisible()

    await page.goto("/search/results?q=cancer&db=bioproject")
    await expect(page.getByRole("search")).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("button", { name: /AI モード|AI mode/ }),
    ).toHaveCount(0)
  })

  test("E-SEARCH-04: per-DB search 5xx で errorKey:db の Callout (cross とは別文言)", async ({ page }) => {
    test.skip(
      true,
      "per-DB search も SSR route loader が server-side fetch するため browser page.route() で 5xx を注入できない。errorKey:\"db\" → dbSearchFailure 経路は loader の unit/msw で固定する",
    )
    await page.route("**/db-portal/search**", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    )
    await page.goto("/search/results?q=cancer&db=bioproject")

    const callout = page.getByRole("status").filter({
      hasText: /^検索に失敗しました|^Search failed/,
    })
    await expect(callout).toBeVisible({ timeout: 15_000 })
    await expect(callout.getByRole("button", { name: /再試行|Retry/ })).toBeVisible()
    // The cross-search wording must NOT appear (db path, not cross path).
    await expect(
      page.getByText(/横断検索に失敗しました|Cross-database search failed/),
    ).toHaveCount(0)
  })
})
