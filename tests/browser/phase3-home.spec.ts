import { expect, test } from "@playwright/test"

test.describe("Phase 3: Top (/)", () => {

  test("search controls are visible (no hero h1)", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
    await expect(page.locator("h1")).toHaveCount(0)
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

  test("submit with db=all navigates to /search/results?q=<q>", async ({ page }) => {
    await page.goto("/")
    await page.getByPlaceholder(/キーワード/).fill("SARS-CoV-2")
    await page.getByRole("button", { name: "検索" }).click()
    await expect(page).toHaveURL(/\/search\/results\?q=%22SARS-CoV-2%22$/)
  })

  test("submit with a specific DB navigates to /search/results?q=<q>&db=<id>", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("combobox", { name: "検索対象 DB" }).selectOption("sra")
    await page.getByPlaceholder(/キーワード/).fill("Homo sapiens")
    await page.getByRole("button", { name: "検索" }).click()
    await expect(page).toHaveURL(/\/search\/results\?q=%22Homo\+sapiens%22&db=sra$/)
  })

  test("clicking an example chip submits with that chip's query", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Escherichia coli" }).click()
    await expect(page).toHaveURL(/\/search\/results\?q=%22Escherichia\+coli%22$/)
  })

  test("renders 6 service cards (2 internal + 4 external) with expected hrefs", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /検索ページへ/ })).toHaveAttribute("href", "/search")
    await expect(page.getByRole("link", { name: /登録ナビへ/ })).toHaveAttribute("href", "/submit")
    await expect(page.getByRole("link", { name: /サービス一覧/ })).toHaveAttribute(
      "href",
      "https://www.ddbj.nig.ac.jp/services/",
    )
    await expect(page.getByRole("link", { name: /スパコンの利用へ/ })).toHaveAttribute(
      "href",
      "https://sc.ddbj.nig.ac.jp/",
    )
    await expect(page.getByRole("link", { name: /統計を見る/ })).toHaveAttribute(
      "href",
      "https://www.ddbj.nig.ac.jp/statistics/",
    )
    await expect(page.getByRole("link", { name: /活動を見る/ })).toHaveAttribute(
      "href",
      "https://www.ddbj.nig.ac.jp/activities/",
    )
  })

  test("CTA 検索ページへ navigates to /search", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /検索ページへ/ }).click()
    await expect(page).toHaveURL(/\/search$/)
  })

  test("CTA 登録ナビへ navigates to /submit", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /登録ナビへ/ }).click()
    await expect(page).toHaveURL(/\/submit$/)
  })

  test("お知らせ / News tabs switch on click", async ({ page }) => {
    await page.goto("/")
    const announcementTab = page.getByRole("tab", { name: "お知らせ" })
    const newsTab = page.getByRole("tab", { name: "News" })
    await expect(announcementTab).toHaveAttribute("aria-selected", "true")
    await expect(newsTab).toHaveAttribute("aria-selected", "false")
    await newsTab.click()
    await expect(announcementTab).toHaveAttribute("aria-selected", "false")
    await expect(newsTab).toHaveAttribute("aria-selected", "true")
  })

  test("renders もっと見る link to /news", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /もっと見る/ })).toHaveAttribute("href", "/news")
  })
})
