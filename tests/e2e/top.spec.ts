import { expect, test } from "./helpers"

test.describe("Top Domain", () => {
  test("S-TOP-01: ja トップで hero / service tile / news aside / breadcrumb なし", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    await expect(
      page.getByRole("heading", { level: 1 }).or(page.locator("[data-testid='hero']")).first(),
    ).toBeVisible()
    await expect(page.getByPlaceholder(/キーワード/)).toBeVisible()
    await expect(page.getByRole("navigation", { name: /パンくず|breadcrumb/i })).toHaveCount(0)
  })

  test("S-TOP-02: en トップで <html lang=en> と en 文言", async ({ page }) => {
    await page.goto("/en")

    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.getByPlaceholder(/Search by keyword/i)).toBeVisible()
  })

  test("S-TOP-03: hero 検索で /search/results に遷移", async ({ page }) => {
    await page.goto("/")
    await page.getByPlaceholder(/キーワード/).fill("cancer")
    await page.getByPlaceholder(/キーワード/).press("Enter")

    await expect(page).toHaveURL(/\/search\/results\?q=cancer/)
  })

  test("E-TOP-01: News mirror 未準備でも他 section は表示される", async ({ page }) => {
    await page.route("**/api/news", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    )
    await page.goto("/")

    await expect(page.getByPlaceholder(/キーワード/)).toBeVisible()
    await expect(page.getByRole("alert").filter({ hasText: /error/i })).toHaveCount(0)
  })
})
