import { expect, test } from "@playwright/test"

const ROUTES = [
  { path: "/", title: /DDBJ DB Portal/ },
  { path: "/search", title: /検索.*DDBJ DB Portal/ },
  { path: "/advanced-search", title: /詳細検索.*DDBJ DB Portal/ },
  { path: "/submit", title: /登録.*DDBJ DB Portal/ },
  { path: "/design-system", title: /Design System.*DDBJ DB Portal/ },
] as const

test.describe("Phase 1 routes", () => {

  for (const route of ROUTES) {
    test(`GET ${route.path} returns 200 and renders Header/Footer`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(route.title)
      await expect(page.getByRole("banner")).toBeVisible()
      await expect(page.getByRole("contentinfo")).toBeVisible()
    })
  }

  test("Header nav links navigate to each route", async ({ page }) => {
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "メインナビゲーション" })

    await nav.getByRole("link", { name: "検索" }).click()
    await expect(page).toHaveURL(/\/search$/)

    await nav.getByRole("link", { name: "詳細検索" }).click()
    await expect(page).toHaveURL(/\/advanced-search$/)

    await nav.getByRole("link", { name: "登録" }).click()
    await expect(page).toHaveURL(/\/submit$/)
  })

  test("Header does not include 'デザインシステム' link", async ({ page }) => {
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "メインナビゲーション" })
    await expect(nav.getByRole("link", { name: "デザインシステム" })).toHaveCount(0)
  })

  test("Logo link in header navigates to /", async ({ page }) => {
    await page.goto("/search")
    await page.getByRole("banner").getByRole("link", { name: "DDBJ Portal" }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test("Footer shows © 2026 DDBJ (Bioinformatics and DDBJ Center)", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("contentinfo")).toHaveText(
      /© 2026 DDBJ \(Bioinformatics and DDBJ Center\)/,
    )
  })
})
