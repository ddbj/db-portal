import { expect, test } from "@playwright/test"

test.describe("Phase 3: Top (/)", () => {

  test("hero and search controls are visible", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: "DDBJ DB Portal" })).toBeVisible()
    await expect(page.getByPlaceholder(/キーワード/)).toBeVisible()
    await expect(page.getByRole("combobox", { name: "検索対象 DB" })).toBeVisible()
    await expect(page.getByRole("button", { name: "検索" })).toBeVisible()
  })

  test("renders 4 example chips", async ({ page }) => {
    await page.goto("/")
    for (const label of ["Homo sapiens", "Escherichia coli", "PRJDB10000", "DRR000001"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible()
    }
  })

  test("submit with db=all navigates to /search?q=<q>", async ({ page }) => {
    await page.goto("/")
    await page.getByPlaceholder(/キーワード/).fill("SARS-CoV-2")
    await page.getByRole("button", { name: "検索" }).click()
    await expect(page).toHaveURL(/\/search\?q=SARS-CoV-2$/)
  })

  test("submit with a specific DB navigates to /search?q=<q>&db=<id>", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("combobox", { name: "検索対象 DB" }).selectOption("sra")
    await page.getByPlaceholder(/キーワード/).fill("Homo sapiens")
    await page.getByRole("button", { name: "検索" }).click()
    await expect(page).toHaveURL(/\/search\?q=Homo\+sapiens&db=sra$/)
  })

  test("clicking an example chip submits with that chip's query", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Escherichia coli" }).click()
    await expect(page).toHaveURL(/\/search\?q=Escherichia\+coli$/)
  })

  test("CTA 詳細検索へ navigates to /advanced-search", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /詳細検索へ/ }).click()
    await expect(page).toHaveURL(/\/advanced-search$/)
  })

  test("CTA 登録ナビへ navigates to /submit", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /登録ナビへ/ }).click()
    await expect(page).toHaveURL(/\/submit$/)
  })
})
