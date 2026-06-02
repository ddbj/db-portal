import type { Page } from "@playwright/test"

import { expect, test } from "./helpers"

const HERO_PLACEHOLDER_JA = "キーワード、accession、学名で検索"
const HERO_PLACEHOLDER_EN = "Search by keyword, accession, or organism"

// The hero keyword input is the SearchBox textbox; its accessible name is the
// keyword aria-label (search.a11y.input), shared by ja "検索キーワード" / en
// "Search keywords".
const heroInput = (page: Page) =>
  page.getByRole("textbox", { name: /検索キーワード|Search keywords/ })

// The 6 primary-service tiles render as <li> inside the ServiceGrid's first <ul>
// in <main>; FeaturedServices rows live in a sibling <ul>, so scope to the grid.
const serviceTiles = (page: Page) =>
  page.getByRole("main").getByRole("list").first().getByRole("listitem")

test.describe("Top Domain", () => {
  test("S-TOP-01: ja トップ訪問で hero + service tile + FeaturedServices + NewsAside が表示", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("html")).toHaveAttribute("lang", "ja")

    const input = heroInput(page)
    await expect(input).toBeVisible({ timeout: 10_000 })
    await expect(input).toHaveAttribute("placeholder", HERO_PLACEHOLDER_JA)

    // example chips render as <button> (Chip as="button"); clicking fills input.
    for (const chip of ["BRCA1", "SARS-CoV-2", "\"Oryza sativa\"", "\"Cyprinus carpio\"", "PRJDB10452"]) {
      await expect(page.getByRole("button", { name: chip, exact: true })).toBeVisible()
    }
    await page.getByRole("button", { name: "BRCA1", exact: true }).click()
    await expect(input).toHaveValue("BRCA1")

    // advanced-search TextLink at the end of the example row → /search
    const advancedLink = page.getByRole("link", { name: "詳細条件で検索" })
    await expect(advancedLink).toBeVisible()
    await expect(advancedLink).toHaveAttribute("href", "/search")

    // ServiceGrid: 6 primary-service tiles (content collection, fixed count).
    await expect(serviceTiles(page)).toHaveCount(6)

    // FeaturedServices: "サービス" heading + view-all → /services, ≥1 row.
    await expect(page.getByRole("heading", { name: "サービス" })).toBeVisible()
    const servicesViewAll = page.getByRole("link", { name: "すべて見る" }).first()
    await expect(servicesViewAll).toHaveAttribute("href", "/services")

    // NewsAside: aria-labelledby gives it the accessible name "お知らせ"
    // (the route's wrapping aside has no name) + view-all → /news.
    const newsAside = page.getByRole("complementary", { name: "お知らせ" })
    await expect(newsAside).toBeVisible()
    await expect(newsAside.getByRole("link", { name: "すべて見る" })).toHaveAttribute("href", "/news")

    // Breadcrumb nav is not rendered on the top (Home only → null).
    await expect(page.getByRole("navigation", { name: /パンくず|breadcrumb/i })).toHaveCount(0)
  })

  test("S-TOP-02: `?lang=en` でクッキー切替し en 文言・stable URL を確認", async ({ page }) => {
    // Inspect the redirect contract directly: ?lang=en → 302 + Set-Cookie, the
    // lang param stripped, no /en prefix.
    const redirectRes = await page.request.get("/?lang=en", { maxRedirects: 0 })
    expect(redirectRes.status()).toBe(302)
    const location = redirectRes.headers()["location"] ?? ""
    expect(new URL(location, "https://x.test").pathname).toBe("/")
    expect(location).not.toContain("lang=")
    expect(location).not.toMatch(/\/en(\/|$)/)
    const setCookie = (await redirectRes.headersArray())
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value)
      .join("\n")
    expect(setCookie).toMatch(/db_portal_lang=en/)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Path=\//i)
    expect(setCookie).toMatch(/Max-Age=31536000/i)
    expect(setCookie).toMatch(/Secure/i)

    // Drive the UI: ?lang=en lands on / and renders en.
    await page.goto("/?lang=en")
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    await expect(heroInput(page)).toHaveAttribute("placeholder", HERO_PLACEHOLDER_EN)

    const advancedLink = page.getByRole("link", { name: "Advanced search" })
    await expect(advancedLink).toHaveAttribute("href", "/search")

    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible()
    const servicesViewAll = page.getByRole("link", { name: "View all" }).first()
    await expect(servicesViewAll).toHaveAttribute("href", "/services")

    const newsAside = page.getByRole("complementary", { name: "Announcements" })
    await expect(newsAside.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/news")
  })

  test("S-TOP-03: hero keyword 検索 (scope=all) で `/search/results?q=` に遷移", async ({ page }) => {
    await page.goto("/")

    const input = heroInput(page)
    await input.fill("cancer")
    await input.press("Enter")

    await expect(page).toHaveURL(/\/search\/results\?q=cancer$/)
    // cross-DB results region (no db= since scope=all maps to null).
    const region = page.getByRole("region", { name: /検索結果|Search results/ })
    await expect(region).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("db-card").first()).toBeVisible({ timeout: 15_000 })
  })

  test("S-TOP-04: cookie 維持された en セッションでトップ再訪問が en を保持", async ({ page }) => {
    // First switch via ?lang=en so the db_portal_lang=en cookie is stored.
    await page.goto("/?lang=en")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    // Re-visit / with no lang param: no redirect, no new Set-Cookie, still en.
    const res = await page.request.get("/", { maxRedirects: 0 })
    expect(res.status()).toBe(200)
    const setCookie = (await res.headersArray())
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value)
    expect(setCookie).toHaveLength(0)

    await page.goto("/")
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(heroInput(page)).toHaveAttribute("placeholder", HERO_PLACEHOLDER_EN)
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible()
    await expect(page.getByRole("complementary", { name: "Announcements" })).toBeVisible()
  })

  test("S-TOP-05: 6 service tile と live services-mirror の FeaturedServices が描画", async ({ page }) => {
    const servicesResponse = page.waitForResponse(
      (r) => r.url().includes("/api/services") && r.status() === 200,
      { timeout: 20_000 },
    )
    await page.goto("/")
    await servicesResponse

    // 6 service-tile LinkCards visible.
    await expect(serviceTiles(page)).toHaveCount(6)
    await expect(serviceTiles(page).first()).toBeVisible()

    // FeaturedServices: "サービス" heading + ≥1 row + view-all → /services.
    await expect(page.getByRole("heading", { name: "サービス" })).toBeVisible()
    const servicesViewAll = page.getByRole("link", { name: "すべて見る" }).first()
    await expect(servicesViewAll).toHaveAttribute("href", "/services")

    // The featured list lives in a sibling <ul> after the grid; require ≥1 row.
    const featuredList = page.getByRole("main").getByRole("list").nth(1)
    await expect(featuredList.getByRole("listitem").first()).toBeVisible({ timeout: 15_000 })
  })

  test("S-TOP-06: DB scope 選択時の hero 検索が `db=` を results URL に伝播", async ({ page }) => {
    await page.goto("/")

    // Scope dropdown is the SearchBox scope trigger: a <button aria-haspopup="listbox"
    // aria-label=search.a11y.scope> (role=button, NOT combobox).
    await page.getByRole("button", { name: /検索対象データベース|Database scope/ }).click()
    await page.getByRole("option", { name: "BioProject", exact: true }).click()

    const input = heroInput(page)
    await input.fill("cancer")
    await input.press("Enter")

    await expect(page).toHaveURL(/\/search\/results\?q=cancer&db=bioproject$/)
    const region = page.getByRole("region", { name: /検索結果|Search results/ })
    await expect(region).toBeVisible({ timeout: 15_000 })
  })

  test("E-TOP-01: News mirror 未準備でも top が崩れず render", async ({ page }) => {
    await page.route("**/api/news**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    )
    await page.goto("/")

    // NewsAside renders its empty message; no error banner.
    const newsAside = page.getByRole("complementary", { name: "お知らせ" })
    await expect(newsAside).toBeVisible()
    await expect(newsAside.getByText("新着のお知らせはありません")).toBeVisible({ timeout: 15_000 })

    // Hero input, 6 service tiles, FeaturedServices section all render normally.
    await expect(heroInput(page)).toBeVisible()
    await expect(serviceTiles(page)).toHaveCount(6)
    await expect(page.getByRole("heading", { name: "サービス" })).toBeVisible()

    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("E-TOP-02: LLM unavailable のとき hero に AI モードトグルが現れない", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unset" }),
      }),
    )
    await page.goto("/")

    const input = heroInput(page)
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute("placeholder", HERO_PLACEHOLDER_JA)

    // AI モード toggle (a button with aria-pressed) must not exist.
    await expect(page.getByRole("button", { name: /AI モード|AI mode/ })).toHaveCount(0)

    await expect(page.getByRole("alert")).toHaveCount(0)
  })
})
