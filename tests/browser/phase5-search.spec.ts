import { expect, test } from "@playwright/test"

test.describe("Phase 5: /search cross mode", () => {

  test("renders 8 DB hit count cards for ?q=human", async ({ page }) => {
    const res = await page.goto("/search?q=human")
    expect(res?.status()).toBe(200)
    await expect(page.getByText(/全データベースで絞り込み中/)).toBeVisible()
    await expect(page.getByText("BioProject")).toBeVisible()
    await expect(page.getByText("BioSample")).toBeVisible()
    await expect(page.getByText("SRA")).toBeVisible()
  })

  test("shows all-error banner for ?q=__error__", async ({ page }) => {
    await page.goto("/search?q=__error__")
    await expect(page.getByText(/検索サービスに接続できません/)).toBeVisible()
  })

  test("shows partial-failure warning for ?q=__partial__", async ({ page }) => {
    await page.goto("/search?q=__partial__")
    await expect(page.getByText(/一部の検索サービスが不安定/)).toBeVisible()
  })

  test("shows loading skeletons for ?q=__loading__", async ({ page }) => {
    await page.goto("/search?q=__loading__")
    const skeletons = page.getByRole("status", { name: "件数を取得中" })
    await expect(skeletons.first()).toBeVisible()
  })

  test("renders warning when both q and adv are given", async ({ page }) => {
    await page.goto("/search?q=human&adv=title%3Acancer")
    await expect(
      page.getByText(/シンプル検索と詳細検索の両方が指定されています/),
    ).toBeVisible()
  })

  test("redirects /search (empty query) to the cross-mode demo", async ({ page }) => {
    await page.goto("/search")
    await expect(page).toHaveURL(/\/search\?q=human$/)
    await expect(page.getByText(/全データベースで絞り込み中/)).toBeVisible()
  })
})

test.describe("Phase 5: /search DB-specified mode", () => {

  test("renders ResultCards and Pagination for ?q=human&db=bioproject", async ({ page }) => {
    await page.goto("/search?q=human&db=bioproject")
    await expect(page.getByText(/全 45,678 件中/)).toBeVisible()
    await expect(page.getByRole("button", { name: "前へ" })).toBeVisible()
    await expect(page.getByRole("button", { name: "次へ" })).toBeVisible()
  })

  test("shows 10k Callout and disables next for Solr DB at page 500", async ({ page }) => {
    await page.goto("/search?q=human&db=trad&page=500")
    await expect(page.getByText(/10,000 件まで/)).toBeVisible()
    await expect(page.getByRole("button", { name: "次へ" })).toBeDisabled()
  })

  test("does not show 10k Callout for ES-backed DB (bioproject)", async ({ page }) => {
    await page.goto("/search?q=human&db=bioproject")
    await expect(page.getByText(/全 45,678 件中/)).toBeVisible()
    await expect(page.getByText(/10,000 件まで/)).toHaveCount(0)
  })

  test("renders advanced summary chip for ?adv=...", async ({ page }) => {
    await page.goto(
      "/search?adv=title%3A%22cancer%22+AND+organism%3A%22Homo+sapiens%22",
    )
    await expect(page.getByText(/title:"cancer" AND organism/)).toBeVisible()
  })
})
