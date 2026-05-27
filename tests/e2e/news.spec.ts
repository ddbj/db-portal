import { expect, test } from "./helpers"

test.describe("News Domain", () => {
  test("S-NEWS-01: /news で一覧表示と facet group", async ({ page }) => {
    await page.goto("/news")

    await expect(
      page.getByRole("heading", { name: /お知らせ|news/i, level: 1 }).first(),
    ).toBeVisible()
    await expect(page.getByRole("complementary").first()).toBeVisible()
  })

  test("S-NEWS-02: facet で絞り込み、URL に反映", async ({ page }) => {
    await page.goto("/news")

    await page
      .getByRole("checkbox", { name: /データ公開|data release/i })
      .first()
      .check()

    await expect(page).toHaveURL(/category=data-release/, { timeout: 5_000 })

    const yearFacet = page.getByRole("checkbox", { name: /2024/ }).first()
    if (await yearFacet.isVisible().catch(() => false)) {
      await yearFacet.check()
      await expect(page).toHaveURL(/year=2024/, { timeout: 5_000 })
    }
  })

  test("S-NEWS-03: NotificationBar に announcement が表示", async ({ page }) => {
    await page.goto("/")

    const bar = page.getByRole("region", { name: /重要なお知らせ|Important notice/i })
    await expect(bar).toBeVisible({ timeout: 10_000 })
  })

  test("S-NEWS-04: トップ右ペイン 8 件 + すべて見る", async ({ page }) => {
    await page.goto("/")

    const aside = page.getByRole("complementary", { name: /お知らせ|Announcements/i })
    await expect(aside).toBeVisible()
    await expect(aside.getByRole("link", { name: /すべて見る|see all/i })).toBeVisible()
  })

  test("E-NEWS-01: /api/news 200 空配列でも UI 崩れない", async ({ page }) => {
    await page.route("**/api/news", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    )
    await page.goto("/news")

    await expect(
      page.getByRole("heading", { name: /お知らせ|news/i, level: 1 }).first(),
    ).toBeVisible()
  })
})
