import { expect, test } from "@playwright/test"

import { clearBrowserState } from "./helpers"

test.describe("Content (Databases) Domain", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page)
  })

  test("S-CONTENT-01: /databases/bioproject ja 表示と breadcrumb", async ({ page }) => {
    await page.goto("/databases/bioproject")

    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    await expect(page.getByRole("heading", { name: "BioProject", level: 1 })).toBeVisible()
    await expect(page.getByRole("navigation", { name: /パンくず|breadcrumb/i })).toContainText(
      "ホーム",
    )
    await expect(page.getByText(/BioSample/)).toBeVisible()
  })

  test("S-CONTENT-02: /en/databases/bioproject en 表示", async ({ page }) => {
    await page.goto("/en/databases/bioproject")

    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.getByRole("heading", { name: "BioProject", level: 1 })).toBeVisible()
    await expect(page.getByRole("navigation", { name: /breadcrumb/i })).toContainText("Home")
    await expect(page.getByTestId("translation-unavailable")).toHaveCount(0)
  })

  test("S-CONTENT-03: /databases/biosample ja 表示", async ({ page }) => {
    await page.goto("/databases/biosample")

    await expect(page.getByRole("heading", { name: "BioSample", level: 1 })).toBeVisible()
    await expect(page.getByText(/SAMD/)).toBeVisible()
  })

  test("E-CONTENT-01: 未知 slug で 404 + ErrorBoundary", async ({ page }) => {
    const response = await page.goto("/databases/unknown-slug")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/ページが見つかりません|not found/i)
    await expect(page.getByRole("link", { name: /トップへ戻る|back to top/i })).toBeVisible()
  })

  test.skip("E-CONTENT-02: 翻訳未完成 page で TranslationUnavailable", async () => {
    // 現状の content collection に handle.i18n.en = "missing" の fixture が無い
    // 翻訳未完成 page が追加された段階で active 化する
  })
})
