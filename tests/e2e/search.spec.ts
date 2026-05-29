import { expect, test } from "./helpers"

test.describe("Search Domain", () => {
  test("S-SEARCH-01: トップ → /search → 検索実行", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "検索" }).first().click()
    await expect(page).toHaveURL(/\/search$/)

    const searchBox = page.getByPlaceholder(/キーワード|cancer/).first()
    await searchBox.fill("cancer")
    await searchBox.press("Enter")

    await expect(page).toHaveURL(/\/search\/results\?q=cancer/)
  })

  test("S-SEARCH-02: cross-DB ヒット数カードが 8 件描画", async ({ page }) => {
    await page.goto("/search/results?q=cancer")

    await expect(page.getByTestId("db-card")).toHaveCount(8, { timeout: 15_000 })
  })

  test("S-SEARCH-03: per-DB 遷移と sidebar facet", async ({ page }) => {
    await page.goto("/search/results?q=cancer")
    await page
      .getByTestId("db-card")
      .filter({ hasText: /bioproject/i })
      .getByRole("link", { name: /結果一覧/ })
      .click()

    await expect(page).toHaveURL(/\/search\/results\?q=cancer&db=bioproject/)
    await expect(page.getByRole("complementary", { name: /絞り込み|facet/i }).first()).toBeVisible()
  })

  test("S-SEARCH-04: Advanced builder で URL ?q= 更新", async ({ page }) => {
    await page.goto("/search")

    await page.getByRole("button", { name: /条件を追加|add condition/i }).click()
    await page
      .getByRole("combobox", { name: /field|フィールド/i })
      .first()
      .selectOption("organism")
    await page.getByRole("textbox", { name: /value|値/i }).first().fill("Homo sapiens")
    await page.getByRole("button", { name: /この条件で検索|run search/i }).click()

    await expect(page).toHaveURL(/\/search\/results\?q=/, { timeout: 15_000 })
  })

  test("S-SEARCH-05: Sidebar facet で URL ?q= 更新", async ({ page }) => {
    await page.goto("/search/results?q=cancer&db=bioproject")

    const facet = page.getByTestId("facet-organism").getByRole("checkbox").first()
    await facet.check()

    await expect(page).toHaveURL(/organism/, { timeout: 5_000 })
  })

  test("S-SEARCH-06: URL ?q= で復元", async ({ page }) => {
    const url
      = "/search/results?q=organism%3A%22Homo+sapiens%22+AND+date_published%3A%5B2022-01-01+TO+2024-12-31%5D&db=bioproject"
    await page.goto(url)

    await expect(page.getByPlaceholder(/キーワード|cancer/).first()).toHaveValue(/organism:.*Homo sapiens/)
  })

  test("E-SEARCH-01: 不正 DSL の URL で Callout 表示", async ({ page }) => {
    await page.goto("/search/results?q=organism%3A%5B%5B")

    await expect(
      page.getByRole("alert").or(page.getByText(/クエリを解析できません|could not parse/i)).first(),
    ).toBeVisible()
  })

  test("E-SEARCH-02: /db-portal/cross-search 5xx でエラーバナー", async ({ page }) => {
    await page.route("**/db-portal/cross-search**", (route) =>
      route.fulfill({ status: 503, body: "Service Unavailable" }),
    )
    await page.goto("/search/results?q=cancer")

    await expect(
      page.getByRole("alert").or(page.getByText(/横断検索に失敗|search failed/i)).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("E-SEARCH-03: LLM 未到達で AI モードトグル非表示", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unset" }),
      }),
    )
    await page.goto("/search")

    // 統合検索ボックスは出るが、AI モードトグルは出ない
    await expect(page.getByRole("search")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /AI モード|AI mode/i }),
    ).toHaveCount(0)
  })
})
