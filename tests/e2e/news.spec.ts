import type { Locator, Page } from "@playwright/test"

import { expect, test } from "./helpers"

// On /news the FacetRow / AppliedFilters chip <li> also carry the implicit
// listitem role, so a page-wide getByRole("listitem") is not NewsRow-only.
// Scope to NewsRow via its date-cell span (app/features/news/news-row.tsx).
const newsRows = (page: Page): Locator =>
  page.locator("li").filter({ has: page.locator("span.font-mono.w-date-col") })

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

// Behaviour-level news scenarios (facets / featured bar / pagination / dismiss)
// pin /api/news to fixtures so coverage no longer depends on what the staging
// cache happens to hold. /api/news is client-fetched (TanStack useQuery), so the
// browser route intercepts it; the real mirror → global.yml → cache pipeline is
// still exercised end-to-end by S-NEWS-06.
type NewsCat =
  | "announcement" | "data-release" | "maintenance" | "event" | "service" | "other"

const newsItem = (o: {
  id: string
  publishedAt: string
  category?: NewsCat
  source?: "ddbj" | "dbcls"
  featured?: boolean
  title?: { ja: string; en: string }
}): Record<string, unknown> => ({
  id: o.id,
  source: o.source ?? "ddbj",
  category: o.category ?? "announcement",
  featured: o.featured ?? false,
  publishedAt: o.publishedAt,
  title: o.title ?? { ja: `お知らせ ${o.id}`, en: `News ${o.id}` },
  db: [],
  rawTags: { ja: [], en: [] },
})

const mockNews = async (page: Page, items: readonly unknown[]): Promise<void> => {
  await page.route("**/api/news", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(items),
    }),
  )
}

test.describe("News Domain", () => {
  test("S-NEWS-01: /news で一覧と 4 facet グループが表示される", async ({ page }) => {
    await page.goto("/news")

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
    await mockNews(page, [
      newsItem({ id: "dr-2024-a", category: "data-release", publishedAt: "2024-09-15T12:00:00Z" }),
      newsItem({ id: "dr-2024-b", category: "data-release", publishedAt: "2024-06-15T12:00:00Z" }),
      newsItem({ id: "dr-2023", category: "data-release", publishedAt: "2023-06-15T12:00:00Z" }),
      newsItem({ id: "ann-2023", category: "announcement", publishedAt: "2023-03-15T12:00:00Z" }),
    ])
    await page.goto("/news")

    await page
      .getByRole("checkbox", { name: /データ公開/ })
      .first()
      .click()
    await expect(page).toHaveURL(/category=data-release/, { timeout: 10_000 })

    const yearFacet = page.getByRole("checkbox", { name: /^2024/ }).first()
    await expect(yearFacet).toBeVisible({ timeout: 10_000 })

    await yearFacet.click()
    await expect(page).toHaveURL(/year=2024/, { timeout: 10_000 })
    await expect(page).toHaveURL(/category=data-release/)

    // AppliedFilters chip が 2 つ (種別: データ公開 / 年: 2024)
    await expect(
      page.getByRole("button", { name: "種別: データ公開 フィルタを解除" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "年: 2024 フィルタを解除" }),
    ).toBeVisible()

    // 年 chip 解除で year param が消え、category は残る
    await page.getByRole("button", { name: "年: 2024 フィルタを解除" }).click()
    await expect(page).not.toHaveURL(/year=/, { timeout: 10_000 })
    await expect(page).toHaveURL(/category=data-release/)
  })

  test("S-NEWS-03: トップで featured が NotificationBar に stack 表示される", async ({ page }) => {
    await mockNews(page, [
      newsItem({ id: "feat-new", featured: true, category: "maintenance", publishedAt: "2024-09-20T12:00:00Z" }),
      newsItem({ id: "feat-old", featured: true, category: "announcement", publishedAt: "2024-05-10T12:00:00Z" }),
      newsItem({ id: "plain", featured: false, category: "data-release", publishedAt: "2024-08-01T12:00:00Z" }),
    ])
    await page.goto("/")

    const bar = page.getByRole("region", { name: "重要なお知らせ" })
    await expect(bar).toBeVisible({ timeout: 10_000 })

    const articles = bar.getByRole("article")
    // 非 featured は bar に出ない: featured 2 件だけが stack される。
    await expect(articles).toHaveCount(2)
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

    const aside = page.getByRole("complementary", { name: "お知らせ" })
    await expect(aside).toBeVisible({ timeout: 10_000 })

    const viewAll = aside.getByRole("link", { name: "すべて見る" })
    await expect(viewAll).toBeVisible()

    await viewAll.click()
    await expect(page).toHaveURL(/\/news$/, { timeout: 10_000 })
  })

  test("S-NEWS-05: facet 絞り込みで実 result set・range・chip が変化する (staging 実データ)", async ({ page }) => {
    await page.goto("/news")

    const count = page.locator("p[aria-live='polite']").first()
    await expect(count).toBeVisible()
    // 件数表示はクライアント fetch 完了後に "N–M / TOTAL 件" になる。読込前に読むと
    // total=0 を拾い restored 比較が壊れるため、件数が確定するまで待つ。
    await expect(count).toHaveText(/\d+–\d+ \/ [\d,]+ 件/, { timeout: 15_000 })

    const baseTotal = await readCountTotal(count)

    const dataRelease = page.getByRole("checkbox", { name: /データ公開/ }).first()
    await dataRelease.click()
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
      page.getByRole("button", { name: "種別: データ公開 フィルタを解除" }),
    ).toBeVisible()

    // OFF に戻すと総件数が復元、AppliedFilters が消える
    await dataRelease.click()
    await expect(page).not.toHaveURL(/category=/, { timeout: 10_000 })
    // 件数表示は URL 変化に遅れて settle する。settle 前に読むと filtered 値を拾うため、
    // 総件数が baseTotal へ戻りきるまで poll する (facet on→off の round-trip 不変量)。
    await expect.poll(() => readCountTotal(count), { timeout: 15_000 }).toBe(baseTotal)
    await expect(
      page.getByRole("button", { name: "種別: データ公開 フィルタを解除" }),
    ).toHaveCount(0)
  })

  test("S-NEWS-06: featured が mirror → global.yml → NotificationBar まで貫通する", async ({ page }) => {
    type ApiNewsItem = {
      featured?: boolean
      publishedAt: string
      title: { ja?: string; en?: string }
    }
    const res = await page.request.get("/api/news?lang=ja")
    expect(res.status()).toBe(200)
    const items = (await res.json()) as ApiNewsItem[]

    const featured = items.filter((n) => n.featured === true)

    const expectedTitles = [...featured]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map((n) => n.title.ja ?? n.title.en ?? "")

    await page.goto("/")

    const bar = page.getByRole("region", { name: "重要なお知らせ" })
    const articles = bar.getByRole("article")

    // 実 cache の whitelist 該当 featured が 0 件でも貫通は検証できる:
    // 0 件 → mirror → global.yml → bar の経路は bar を一切描画しない
    // (NotificationBar が null を返す)。データ有無に依らず skip しない。
    if (expectedTitles.length === 0) {
      await expect(bar).toHaveCount(0)
      return
    }

    await expect(bar).toBeVisible({ timeout: 10_000 })
    await expect(articles).toHaveCount(expectedTitles.length)

    const renderedLabels = await articles.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("aria-label") ?? ""),
    )
    // title 集合 / 並び順が GET /api/news の featured 集合 (降順) と一致する
    expect(renderedLabels).toEqual(expectedTitles)
  })

  test("S-NEWS-07: /news 一覧が date 降順で、pagination が URL に反映される", async ({ page }) => {
    // 25 件 → 2 ページ (page1=20, page2=5)。publishedAt を 1 日ずつ厳密降順に。
    const base = Date.parse("2024-12-31T12:00:00Z")
    await mockNews(page, Array.from({ length: 25 }, (_, i) =>
      newsItem({
        id: `news-${String(i).padStart(2, "0")}`,
        publishedAt: new Date(base - i * 86_400_000).toISOString(),
      }),
    ))
    await page.goto("/news")

    const count = page.locator("p[aria-live='polite']").first()
    await expect(count).toBeVisible()
    await expect(count).toHaveText(/\d+–\d+ \/ [\d,]+ 件/, { timeout: 15_000 })
    expect(await readCountTotal(count)).toBe(25)

    const readDates = async (): Promise<string[]> => {
      const cells = page.locator("ul > li span.font-mono").first()
      await expect(cells).toBeVisible()

      return (await page.locator("ul > li span.font-mono.w-date-col").allInnerTexts())
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

    const firstRow = newsRows(page).first()
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    const jaTitle = (await firstRow.innerText()).trim()
    expect(jaTitle.length).toBeGreaterThan(0)

    // ?lang=en は root loader が 302 + Set-Cookie で削る。redirect 後 URL は /news (prefix 無し)
    const enRes = await page.goto("/news?lang=en")
    expect(enRes?.status()).toBe(200)
    await expect(page).toHaveURL(/\/news$/)

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
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
  })

  test("S-NEWS-09: トップ aside の件数が NEWS_LIMIT と一致する", async ({ page }) => {
    await page.goto("/")

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

    await expect(
      page.getByRole("heading", { name: "お知らせ・ニュース", level: 1 }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("条件に一致するお知らせはありません")).toBeVisible()
    await expect(page.locator("p[aria-live='polite']").first()).toHaveText("全 0 件")
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("E-NEWS-02: NotificationBar の dismiss が reload を跨いで sessionStorage で保持される", async ({ page }) => {
    const featured = [
      newsItem({ id: "feat-1", featured: true, publishedAt: "2024-09-20T12:00:00Z" }),
      newsItem({ id: "feat-2", featured: true, publishedAt: "2024-07-10T12:00:00Z" }),
      newsItem({ id: "feat-3", featured: true, publishedAt: "2024-05-01T12:00:00Z" }),
    ]
    await mockNews(page, featured)
    await page.goto("/")

    const bar = page.getByRole("region", { name: "重要なお知らせ" })
    await expect(bar).toBeVisible({ timeout: 10_000 })
    const articles = bar.getByRole("article")
    const initialCount = await articles.count()
    expect(initialCount).toBe(featured.length)

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
    await expect(bar.getByRole("article")).toHaveCount(initialCount - 1, { timeout: 10_000 })
    await expect(
      bar.getByRole("article", { name: closedLabel, exact: true }),
    ).toHaveCount(0)

    // 新 context (sessionStorage 空) では全 featured bar が再表示される
    const freshContext = await page.context().browser()?.newContext()
    if (freshContext) {
      const freshPage = await freshContext.newPage()
      await mockNews(freshPage, featured)
      await freshPage.goto("/")
      const freshBar = freshPage.getByRole("region", { name: "重要なお知らせ" })
      await expect(freshBar.getByRole("article")).toHaveCount(initialCount, { timeout: 10_000 })
      await freshContext.close()
    }
  })
})
