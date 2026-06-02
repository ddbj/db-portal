import { expect, test } from "./helpers"

test.describe("Content (Databases) Domain", () => {
  test("S-CONTENT-01: /databases/bioproject ja 表示と breadcrumb", async ({ page }) => {
    await page.goto("/databases/bioproject")

    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    await expect(page.getByRole("heading", { level: 1, name: "BioProject" })).toBeVisible()
    await expect(page.getByText(/BioProject とは/)).toBeVisible()

    const breadcrumb = page.getByRole("navigation", { name: "パンくずリスト" })
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb.locator("li")).toHaveCount(2)
    await expect(breadcrumb.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/")
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("BioProject")
    await expect(breadcrumb.getByText("データベース", { exact: true })).toHaveCount(0)

    await expect(page.getByRole("heading", { level: 2, name: "関連データベース" })).toBeVisible()
    await expect(page.getByRole("link", { name: "BioSample" })).toHaveAttribute(
      "href",
      "/databases/biosample",
    )

    await expect(page.getByRole("heading", { level: 2, name: "外部リンク" })).toBeVisible()
    await expect(page.getByRole("link", { name: "NCBI BioProject" })).toBeVisible()
    await expect(page.getByRole("link", { name: "EBI BioStudies" })).toBeVisible()
    await expect(page.getByRole("link", { name: "DDBJ BioProject 公式ページ" })).toBeVisible()

    await expect(page.getByText("最終更新")).toBeVisible()
    await expect(page.locator("time[datetime='2026-05-25T00:00:00Z']")).toHaveText("2026年5月25日")
  })

  test("S-CONTENT-02: ?lang=en で /databases/bioproject の en 表示", async ({ page }) => {
    const redirect = await page.request.get("/databases/bioproject?lang=en", {
      maxRedirects: 0,
    })
    expect(redirect.status()).toBe(302)
    expect(redirect.headers()["location"]).toBe("/databases/bioproject")
    const setCookie = redirect.headers()["set-cookie"] ?? ""
    expect(setCookie).toMatch(/db_portal_lang=en/)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Path=\//)
    expect(setCookie).toMatch(/Max-Age=31536000/)

    await page.goto("/databases/bioproject?lang=en")
    await expect(page).toHaveURL(/\/databases\/bioproject$/)

    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.getByRole("heading", { level: 1, name: "BioProject" })).toBeVisible()
    await expect(page.getByText(/What BioProject organises/)).toBeVisible()

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(breadcrumb.locator("li")).toHaveCount(2)
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")

    await expect(page.getByRole("heading", { level: 2, name: "Related databases" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "External links" })).toBeVisible()
    await expect(page.getByText("Last updated")).toBeVisible()
    await expect(page.locator("time[datetime='2026-05-25T00:00:00Z']")).toHaveText("May 25, 2026")

    await expect(page.getByTestId("translation-unavailable")).toHaveCount(0)

    // lang cookie は永続。?lang 無しで別 DB を訪問しても en が維持される
    await page.goto("/databases/biosample")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.getByRole("heading", { level: 2, name: "External links" })).toBeVisible()
  })

  test("S-CONTENT-03: /databases/biosample ja 表示", async ({ page }) => {
    await page.goto("/databases/biosample")

    await expect(page.getByRole("heading", { level: 1, name: "BioSample" })).toBeVisible()
    await expect(page.getByText(/BioSample とは/)).toBeVisible()
    await expect(page.getByText(/SAMD/).first()).toBeVisible()

    await expect(page.getByRole("heading", { level: 2, name: "関連データベース" })).toBeVisible()
    await expect(page.getByRole("link", { name: "BioProject" })).toHaveAttribute(
      "href",
      "/databases/bioproject",
    )

    await expect(page.getByRole("heading", { level: 2, name: "外部リンク" })).toBeVisible()
    await expect(page.getByRole("link", { name: "NCBI BioSample" })).toBeVisible()
    await expect(page.getByRole("link", { name: "EBI BioSamples" })).toBeVisible()
    await expect(page.getByRole("link", { name: "DDBJ BioSample 公式ページ" })).toBeVisible()

    await expect(page.locator("time[datetime='2026-05-25T00:00:00Z']")).toHaveText("2026年5月25日")
  })

  test("S-CONTENT-04: 実 route 構成どおりの breadcrumb chain", async ({ page }) => {
    await page.goto("/databases/bioproject")

    const jaCrumb = page.getByRole("navigation", { name: "パンくずリスト" })
    await expect(jaCrumb.locator("li")).toHaveCount(2)
    await expect(jaCrumb.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/")
    await expect(jaCrumb.locator('[aria-current="page"]')).toHaveText("BioProject")
    await expect(jaCrumb.getByRole("link", { name: "BioProject" })).toHaveCount(0)
    await expect(jaCrumb.getByText("データベース", { exact: true })).toHaveCount(0)

    await page.goto("/databases/bioproject?lang=en")
    await expect(page).toHaveURL(/\/databases\/bioproject$/)

    const enCrumb = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(enCrumb.locator("li")).toHaveCount(2)
    await expect(enCrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")
    await expect(enCrumb.locator('[aria-current="page"]')).toHaveText("BioProject")
    await expect(enCrumb.getByRole("link", { name: "BioProject" })).toHaveCount(0)
    await expect(enCrumb.getByText("Databases", { exact: true })).toHaveCount(0)
  })

  test("S-CONTENT-05: データベース詳細の document title が reverse-breadcrumb", async ({ page }) => {
    await page.goto("/databases/bioproject")
    expect(await page.title()).toBe("BioProject | Databases | BSI")

    await page.goto("/databases/bioproject?lang=en")
    await expect(page).toHaveURL(/\/databases\/bioproject$/)
    expect(await page.title()).toBe("BioProject | Databases | BSI")
  })

  test("S-CONTENT-06: 外部リンクの属性と最終更新日の locale 整形", async ({ page }) => {
    await page.goto("/databases/bioproject")

    const externalLinks: readonly (readonly [string, string])[] = [
      ["NCBI BioProject", "https://www.ncbi.nlm.nih.gov/bioproject/"],
      ["EBI BioStudies", "https://www.ebi.ac.uk/biostudies/"],
      ["DDBJ BioProject 公式ページ", "https://www.ddbj.nig.ac.jp/bioproject/index.html"],
    ]
    for (const [name, href] of externalLinks) {
      const link = page.getByRole("link", { name })
      await expect(link).toHaveAttribute("href", href)
      await expect(link).toHaveAttribute("target", "_blank")
      await expect(link).toHaveAttribute("rel", /noopener/)
      await expect(link).toHaveAttribute("rel", /noreferrer/)
    }

    await expect(page.locator("time[datetime='2026-05-25T00:00:00Z']")).toHaveText("2026年5月25日")

    await page.goto("/databases/bioproject?lang=en")
    await expect(page).toHaveURL(/\/databases\/bioproject$/)
    const enTime = page.locator("time[datetime='2026-05-25T00:00:00Z']")
    await expect(enTime).toHaveAttribute("datetime", "2026-05-25T00:00:00Z")
    await expect(enTime).toHaveText("May 25, 2026")
  })

  test("E-CONTENT-01: 未知 slug で 404", async ({ page }) => {
    const res = await page.request.get("/databases/unknown-slug")
    expect(res.status()).toBe(404)

    await page.goto("/databases/unknown-slug")
    await expect(
      page.getByRole("heading", { level: 1, name: /ページが見つかりません|not found/i }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /トップへ戻る|back to top/i })).toHaveAttribute(
      "href",
      "/",
    )
  })
})
