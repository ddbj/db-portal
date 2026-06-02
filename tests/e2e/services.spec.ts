import { expect, test } from "./helpers"

test.describe("Services Domain", () => {
  test("S-SERVICES-01: /services で一覧表示と facet group", async ({ page }) => {
    await page.goto("/services")

    await expect(
      page.getByRole("heading", { name: /サービス|Services/i, level: 1 }),
    ).toBeVisible({ timeout: 10_000 })

    const facetPanel = page.getByRole("region", { name: /絞り込み|Refine/i })
    await expect(facetPanel).toBeVisible({ timeout: 15_000 })

    // category (種別) と source (ソース) の 2 FacetGroup
    await expect(
      facetPanel.getByRole("checkbox", { name: /検索|Search/i }).first(),
    ).toBeVisible()
    await expect(
      facetPanel.getByRole("checkbox", { name: "DBCLS" }).first(),
    ).toBeVisible()

    // service row の external link が 1 件以上
    const serviceLinks = page.getByRole("link").filter({ has: page.locator("span") })
    expect(await serviceLinks.count()).toBeGreaterThan(0)
  })

  test("S-SERVICES-02: facet で絞り込み、URL に反映", async ({ page }) => {
    await page.goto("/services")

    const facetPanel = page.getByRole("region", { name: /絞り込み|Refine/i })
    await expect(facetPanel).toBeVisible({ timeout: 15_000 })

    await facetPanel.getByRole("checkbox", { name: /検索|Search/i }).first().click()
    await facetPanel.getByRole("checkbox", { name: "DBCLS" }).first().click()

    // params は source → category の順、値は alphabet sort
    await expect(page).toHaveURL(/\/services\?source=dbcls&category=search/, {
      timeout: 10_000,
    })

    // 一覧が source=dbcls に絞り込まれる (各 row の source Tag が DBCLS)。
    // facet region 内の "DDBJ" option label は対象外、result row の source Tag のみ照合する。
    const resultRows = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link") })
    expect(await resultRows.count()).toBeGreaterThan(0)
    await expect(resultRows.getByText("DDBJ")).toHaveCount(0)

    // AppliedFilters に「適用中 · 2」と解除 button が 2 件
    await expect(page.getByText(/適用中 · 2|Applied · 2/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /種別: 検索|Type: Search/ }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /ソース: DBCLS|Source: DBCLS/ }),
    ).toBeVisible()
  })

  test("S-SERVICES-03: トップに featuredTop の services list", async ({ page }) => {
    await page.goto("/")

    const servicesHeading = page.getByRole("heading", {
      name: /サービス|Services/i,
      level: 2,
    })
    await expect(servicesHeading.first()).toBeVisible({ timeout: 15_000 })

    // セクション見出し脇の「すべて見る」link が /services を指す
    const viewAll = page.getByRole("link", { name: /すべて見る|View all/i })
    await expect(viewAll.first()).toBeVisible()
    await expect(viewAll.first()).toHaveAttribute("href", "/services")

    // DDBJ whitelist 由来の名前 と DBCLS の Togo prefix link がともに 1 件以上
    const ddbjWhitelist
      = /^(BioProject|BioSample|DDBJ|JGA|DRA|GEA|MetaboBank|TogoVar-repository)/
    await expect(
      page.getByRole("link", { name: ddbjWhitelist }).first(),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("link", { name: /^Togo/ }).first(),
    ).toBeVisible()

    // facet / pagination / sort toolbar はこのセクションに描画されない
    await expect(page.getByRole("region", { name: /絞り込み|Refine/i })).toHaveCount(0)
  })

  test("E-SERVICES-01: /api/services 200 空配列でも UI 崩れない", async ({ page }) => {
    await page.route("**/api/services**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    )
    await page.goto("/services")

    // 一覧 0 件でも h1 が描画される
    await expect(
      page.getByRole("heading", { name: /サービス|Services/i, level: 1 }),
    ).toBeVisible({ timeout: 10_000 })

    // 空状態メッセージ (services.list.empty)
    await expect(
      page.getByText(
        /条件に一致するサービスはありません|No services match the selected filters/,
      ),
    ).toBeVisible()

    // error banner (role=alert) は描画されない
    await expect(page.getByRole("alert")).toHaveCount(0)

    // 種別 / ソース FacetGroup は値が無いため描画されない
    await expect(page.getByRole("checkbox")).toHaveCount(0)
  })
})
