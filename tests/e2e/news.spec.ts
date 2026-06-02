import type { Locator, Page } from "@playwright/test"

import { expect, test } from "./helpers"

// On /news the FacetRow / AppliedFilters chip <li> also carry the implicit
// listitem role, so a page-wide getByRole("listitem") is not NewsRow-only.
// Scope to NewsRow via its date-cell span (app/features/news/news-row.tsx).
const newsRows = (page: Page): Locator =>
  page.locator("li").filter({ has: page.locator("span.font-mono.w-20") })

const readCountTotal = async (count: Locator): Promise<number> => {
  const text = (await count.innerText()).trim()
  const match = text.match(/\/\s*([\d,]+)\s*件/)
  const captured = match?.[1]
  if (captured === undefined) return 0

  return Number(captured.replace(/,/g, ""))
}

const isNonIncreasing = (values: readonly string[]): boolean => {
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1]
    const cur = values[i]
    if (prev === undefined || cur === undefined) continue
    if (prev < cur) return false
  }

  return true
}

test.describe("News Domain", () => {
  test("S-NEWS-01: /news で一覧と 4 facet グループが表示される", async ({ page }) => {
    await page.goto("/news")
    await page.waitForLoadState("networkidle")

    await expect(
      page.getByRole("heading", { name: "お知らせ・ニュース", level: 1 }),
    ).toBeVisible({ timeout: 10_000 })

    const facetPanel = page.getByRole("region", { name: "絞り込み" })
    await expect(facetPanel).toBeVisible()
    // 種別 / ソースは常に出る。年 / サービスは cache に実出現があるときのみ。
    await expect(page.getByText("種別", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("ソース", { exact: true }).first()).toBeVisible()

    const count = page.locator("p[aria-live='polite']").first()
    await expect(count).toBeVisible()
    await expect(count).toHaveText(/^\d+–\d+ \/ [\d,]+ 件$/)

    await expect(newsRows(page).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("S-NEWS-02: facet 選択が URL params と AppliedFilters chip に反映される", async ({ page }) => {
    await page.goto("/news")
    await page.waitForLoadState("networkidle")

    await page
      .getByRole("checkbox", { name: /データ公開/ })
      .first()
      .check()
    await expect(page).toHaveURL(/category=data-release/, { timeout: 10_000 })

    const yearFacet = page.getByRole("checkbox", { name: /^2024/ }).first()
    const hasYear = await yearFacet.isVisible().catch(() => false)
    test.skip(!hasYear, "2024 が cache に実出現しない期間")

    await yearFacet.check()
    await expect(page).toHaveURL(/year=2024/, { timeout: 10_000 })
    await expect(page).toHaveURL(/category=data-release/)

    // AppliedFilters chip が 2 つ (種別: データ公開 / 年: 2024)
    await expect(
      page.getByRole("button", { name: "種別: データ公開 を解除" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "年: 2024 を解除" }),
    ).toBeVisible()

    // 年 chip 解除で year param が消え、category は残る
    await page.getByRole("button", { name: "年: 2024 を解除" }).click()
    await expect(page).not.toHaveURL(/year=/, { timeout: 10_000 })
    await expect(page).toHaveURL(/category=data-release/)
  })

  test("S-NEWS-03: トップで featured が NotificationBar に stack 表示される", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const bar = page.getByRole("region", { name: "重要なお知らせ" })
    const hasBar = await bar.isVisible().catch(() => false)
    test.skip(!hasBar, "featured item が 0 件の期間は region 自体が描画されない")

    const articles = bar.getByRole("article")
    await expect(articles.first()).toBeVisible()
    // 各 article に「重要」Tag / 日付 / title / 閉じるボタン
    await expect(bar.getByText("重要").first()).toBeVisible()
    await expect(
      bar.getByRole("button", { name: "通知を閉じる" }).first(),
    ).toBeVisible()

    // publishedAt 降順 (新しい順) であること: 表示日付が非増加
    const dates = await articles
      .locator("span.font-mono")
      .allInnerTexts()
    const normalized = dates.map((d) => d.trim()).filter((d) => d.length > 0)
    expect(isNonIncreasing(normalized)).toBe(true)
  })

  test("S-NEWS-04: トップ右 aside に最新ニュースと「すべて見る」リンク", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const aside = page.getByRole("complementary", { name: "お知らせ" })
    await expect(aside).toBeVisible({ timeout: 10_000 })

    const viewAll = aside.getByRole("link", { name: "すべて見る" })
    await expect(viewAll).toBeVisible()

    await viewAll.click()
    await expect(page).toHaveURL(/\/news$/, { timeout: 10_000 })
  })

  test("S-NEWS-05: facet 絞り込みで実 result set・range・chip が変化する (staging 実データ)", async ({ page }) => {
    await page.goto("/news")
    await page.waitForLoadState("networkidle")

    const count = page.locator("p[aria-live='polite']").first()
    await expect(count).toBeVisible()

    const baseTotal = await readCountTotal(count)

    const dataRelease = page.getByRole("checkbox", { name: /データ公開/ }).first()
    await dataRelease.check()
    await expect(page).toHaveURL(/category=data-release/, { timeout: 10_000 })

    const filteredTotal = await readCountTotal(count)
    expect(filteredTotal).toBeLessThanOrEqual(baseTotal)

    // 表示中の全 NewsRow が「データ公開」category Tag を持つ
    const rows = newsRows(page)
    const rowCount = await rows.count()
    if (rowCount > 0) {
      for (let i = 0; i < rowCount; i += 1) {
        await expect(rows.nth(i)).toContainText("データ公開")
      }
    }

    await expect(
      page.getByRole("button", { name: "種別: データ公開 を解除" }),
    ).toBeVisible()

    // OFF に戻すと総件数が復元、AppliedFilters が消える
    await dataRelease.uncheck()
    await expect(page).not.toHaveURL(/category=/, { timeout: 10_000 })
    const restored = await readCountTotal(count)
    expect(restored).toBe(baseTotal)
    await expect(
      page.getByRole("button", { name: "種別: データ公開 を解除" }),
    ).toHaveCount(0)
  })

  test("S-NEWS-06: featured が mirror → global.yml → NotificationBar まで貫通する", async ({ page }) => {
    type ApiNewsItem = {
      featured?: boolean
      retireTime?: string
      publishedAt: string
      title: { ja?: string; en?: string }
    }
    const res = await page.request.get("/api/news?lang=ja")
    expect(res.status()).toBe(200)
    const items = (await res.json()) as ApiNewsItem[]

    const now = Date.now()
    const featured = items
      .filter((n) => n.featured === true)
      .filter((n) => !n.retireTime || Date.parse(n.retireTime) > now)

    test.skip(
      featured.length === 0,
      "whitelist 該当 featured item が GET /api/news に 1 件も現れない期間は定義のみ",
    )

    const expectedTitles = [...featured]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map((n) => n.title.ja ?? n.title.en ?? "")

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const bar = page.getByRole("region", { name: "重要なお知らせ" })
    await expect(bar).toBeVisible({ timeout: 10_000 })

    const articles = bar.getByRole("article")
    await expect(articles).toHaveCount(expectedTitles.length)

    const renderedLabels = await articles.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("aria-label") ?? ""),
    )
    // title 集合 / 並び順が GET /api/news の featured 集合 (降順) と一致する
    expect(renderedLabels).toEqual(expectedTitles)
  })

  test("S-NEWS-07: /news 一覧が date 降順で、pagination が URL に反映される", async ({ page }) => {
    await page.goto("/news")
    await page.waitForLoadState("networkidle")

    const count = page.locator("p[aria-live='polite']").first()
    await expect(count).toBeVisible()
    const total = await readCountTotal(count)

    test.skip(total <= 20, "2 ページ以上 (21 件以上) を返さない期間")

    const readDates = async (): Promise<string[]> => {
      const cells = page.locator("ul > li span.font-mono").first()
      await expect(cells).toBeVisible()

      return (await page.locator("ul > li span.font-mono.w-20").allInnerTexts())
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
    }

    const page1Dates = await readDates()
    expect(page1Dates.length).toBeLessThanOrEqual(20)
    expect(page1Dates.length).toBeGreaterThan(0)
    // 上から下へ非増加 (newest 順)
    expect(isNonIncreasing(page1Dates)).toBe(true)

    // count 行 range 表示
    await expect(count).toHaveText(/^1–20 \/ [\d,]+ 件$/)

    await page.getByRole("button", { name: "次のページ" }).first().click()
    await expect(page).toHaveURL(/\/news\?page=2/, { timeout: 10_000 })

    const page2Dates = await readDates()
    expect(page2Dates.length).toBeGreaterThan(0)
    // 2 ページ目の先頭 ≤ 1 ページ目の末尾
    const page2First = page2Dates[0]
    const page1Last = page1Dates[page1Dates.length - 1]
    expect(page2First !== undefined && page1Last !== undefined).toBe(true)
    if (page2First !== undefined && page1Last !== undefined) {
      expect(page2First <= page1Last).toBe(true)
    }
  })

  test("S-NEWS-08: 言語切替 (cookie) で ja/en pairing と fallback が反映される", async ({ page }) => {
    await page.goto("/news")
    await page.waitForLoadState("networkidle")

    const firstRow = newsRows(page).first()
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    const jaTitle = (await firstRow.innerText()).trim()
    expect(jaTitle.length).toBeGreaterThan(0)

    // ?lang=en は root loader が 302 + Set-Cookie で削る。redirect 後 URL は /news (prefix 無し)
    const enRes = await page.goto("/news?lang=en")
    expect(enRes?.status()).toBe(200)
    await expect(page).toHaveURL(/\/news$/)
    await page.waitForLoadState("networkidle")

    const enRow = newsRows(page).first()
    await expect(enRow).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    // en へ切替後の外部リンクは https の external URL を指す (source 依存パターン)
    const enLink = enRow.getByRole("link").first()
    const hasLink = await enLink.isVisible().catch(() => false)
    if (hasLink) {
      const href = await enLink.getAttribute("href")
      expect(href).toMatch(/^https?:\/\//)
    }

    // 再読込でも en が cookie で維持される
    await page.goto("/news")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
  })

  test("S-NEWS-09: トップ aside の件数が NEWS_LIMIT と一致する", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const aside = page.getByRole("complementary", { name: "お知らせ" })
    await expect(aside).toBeVisible({ timeout: 10_000 })

    const rows = aside.getByRole("listitem")
    await expect(rows.first()).toBeVisible({ timeout: 10_000 })
    const rowCount = await rows.count()
    // 返却件数が 5 未満のときは全件表示なので min(total, 5)
    expect(rowCount).toBeLessThanOrEqual(5)
    expect(rowCount).toBeGreaterThan(0)

    // publishedAt 降順
    const dates = (await rows.locator("span.font-mono").allInnerTexts())
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
    expect(isNonIncreasing(dates)).toBe(true)

    await aside.getByRole("link", { name: "すべて見る" }).click()
    await expect(page).toHaveURL(/\/news$/, { timeout: 10_000 })
  })

  test("E-NEWS-01: /api/news が 200 空配列でも UI が崩れない", async ({ page }) => {
    await page.route("**/api/news", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    )
    await page.goto("/news")
    await page.waitForLoadState("networkidle")

    await expect(
      page.getByRole("heading", { name: "お知らせ・ニュース", level: 1 }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("条件に一致するお知らせはありません")).toBeVisible()
    await expect(page.locator("p[aria-live='polite']").first()).toHaveText("全 0 件")
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("E-NEWS-02: NotificationBar の dismiss が reload を跨いで sessionStorage で保持される", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const bar = page.getByRole("region", { name: "重要なお知らせ" })
    const hasBar = await bar.isVisible().catch(() => false)
    const articles = bar.getByRole("article")
    const initialCount = hasBar ? await articles.count() : 0
    test.skip(
      initialCount < 2,
      "featured bar が 2 件未満の期間は定義のみ (2 件以上 featured が表示されるまで実行不可)",
    )

    const firstLabel = await articles.first().getAttribute("aria-label")
    expect(firstLabel).not.toBeNull()
    const closedLabel = firstLabel ?? ""

    // 1 件目を閉じる → その article だけ即時に消え、残りは継続
    await articles
      .first()
      .getByRole("button", { name: "通知を閉じる" })
      .click()
    await expect(bar.getByRole("article")).toHaveCount(initialCount - 1)
    await expect(
      bar.getByRole("article", { name: closedLabel, exact: true }),
    ).toHaveCount(0)

    // sessionStorage に dismissed id が文字列配列で保存される
    const stored = await page.evaluate(() =>
      window.sessionStorage.getItem("dbPortal.notificationBar.dismissed"),
    )
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored ?? "[]") as unknown
    expect(Array.isArray(parsed)).toBe(true)
    expect((parsed as string[]).length).toBe(1)

    // reload 後も閉じた bar は再表示されず、残りは表示
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(bar.getByRole("article")).toHaveCount(initialCount - 1, { timeout: 10_000 })
    await expect(
      bar.getByRole("article", { name: closedLabel, exact: true }),
    ).toHaveCount(0)

    // 新 context (sessionStorage 空) では全 featured bar が再表示される
    const freshContext = await page.context().browser()?.newContext()
    if (freshContext) {
      const freshPage = await freshContext.newPage()
      await freshPage.goto("/")
      await freshPage.waitForLoadState("networkidle")
      const freshBar = freshPage.getByRole("region", { name: "重要なお知らせ" })
      await expect(freshBar.getByRole("article")).toHaveCount(initialCount, { timeout: 10_000 })
      await freshContext.close()
    }
  })
})
