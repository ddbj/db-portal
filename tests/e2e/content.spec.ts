import { expect, test } from "./helpers"

test.describe("Content (Databases) Domain", () => {
  test("S-CONTENT-01: /bioproject ja 表示と breadcrumb", async ({ page }) => {
    await page.goto("/bioproject")

    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    await expect(page.getByRole("heading", { level: 1, name: "BioProject" })).toBeVisible()
    // sidebar TOC が同名 link を持つので heading に scope する。
    await expect(page.getByRole("heading", { level: 2, name: "BioProject とは" })).toBeVisible()

    const breadcrumb = page.getByRole("navigation", { name: "パンくずリスト" })
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/docs")
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("BioProject")
    await expect(breadcrumb.getByText("データベース", { exact: true })).toHaveCount(0)

    // 「最終更新 YYYY/MM/DD」 が PageTitle meta に表示される (gen-last-updated.ts が
    // git log から作る gen/last-updated.json 駆動)。
    await expect(page.getByText(/最終更新\s+\d{4}\/\d{2}\/\d{2}/)).toBeVisible()
  })

  test("S-CONTENT-02: ?lang=en で /bioproject の en 表示", async ({ page }) => {
    const redirect = await page.request.get("/bioproject?lang=en", {
      maxRedirects: 0,
    })
    expect(redirect.status()).toBe(302)
    expect(redirect.headers()["location"]).toBe("/bioproject")
    const setCookie = redirect.headers()["set-cookie"] ?? ""
    expect(setCookie).toMatch(/db_portal_lang=en/)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Path=\//)
    expect(setCookie).toMatch(/Max-Age=31536000/)

    await page.goto("/bioproject?lang=en")
    await expect(page).toHaveURL(/\/bioproject$/)

    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.getByRole("heading", { level: 1, name: "BioProject" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "What is BioProject" })).toBeVisible()

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/docs")

    await expect(page.getByText(/Last updated\s+\d{4}\/\d{2}\/\d{2}/)).toBeVisible()

    await expect(page.getByTestId("translation-unavailable")).toHaveCount(0)

    // lang cookie は永続。?lang 無しで別 DB を訪問しても en が維持される
    await page.goto("/biosample")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.getByRole("heading", { level: 1, name: "BioSample" })).toBeVisible()
  })

  test("S-CONTENT-03: /biosample ja 表示", async ({ page }) => {
    await page.goto("/biosample")

    await expect(page.getByRole("heading", { level: 1, name: "BioSample" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "BioSample とは" })).toBeVisible()
    await expect(page.getByText(/SAMD/).first()).toBeVisible()

    await expect(page.getByText(/最終更新\s+\d{4}\/\d{2}\/\d{2}/)).toBeVisible()
  })

  test("S-CONTENT-04: 実 route 構成どおりの breadcrumb chain", async ({ page }) => {
    await page.goto("/bioproject")

    const jaCrumb = page.getByRole("navigation", { name: "パンくずリスト" })
    await expect(jaCrumb.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/docs")
    await expect(jaCrumb.locator('[aria-current="page"]')).toHaveText("BioProject")
    await expect(jaCrumb.getByRole("link", { name: "BioProject" })).toHaveCount(0)

    await page.goto("/bioproject?lang=en")
    await expect(page).toHaveURL(/\/bioproject$/)

    const enCrumb = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(enCrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/docs")
    await expect(enCrumb.locator('[aria-current="page"]')).toHaveText("BioProject")
    await expect(enCrumb.getByRole("link", { name: "BioProject" })).toHaveCount(0)
  })

  test("S-CONTENT-05: データベース詳細の document title が reverse-breadcrumb", async ({ page }) => {
    await page.goto("/bioproject")
    expect(await page.title()).toBe("BioProject | Contents | BSI")

    await page.goto("/bioproject?lang=en")
    await expect(page).toHaveURL(/\/bioproject$/)
    expect(await page.title()).toBe("BioProject | Contents | BSI")
  })

  test("S-CONTENT-06: 外部リンクの属性と最終更新日の locale 整形", async ({ page }) => {
    await page.goto("/bioproject")

    // 関連リソースに NCBI BioProject の外部リンクがあることを確認する。
    const ncbi = page.getByRole("link", { name: /NCBI BioProject/ }).first()
    await expect(ncbi).toHaveAttribute("href", /ncbi\.nlm\.nih\.gov\/bioproject/)
    await expect(ncbi).toHaveAttribute("target", "_blank")
    await expect(ncbi).toHaveAttribute("rel", /noopener/)
    await expect(ncbi).toHaveAttribute("rel", /noreferrer/)

    // formatDate は JST 固定で `YYYY/MM/DD` を返す (lang 非依存、 hydration 安定化のため)。
    await expect(page.getByText(/最終更新\s+\d{4}\/\d{2}\/\d{2}/)).toBeVisible()

    await page.goto("/bioproject?lang=en")
    await expect(page).toHaveURL(/\/bioproject$/)
    await expect(page.getByText(/Last updated\s+\d{4}\/\d{2}\/\d{2}/)).toBeVisible()
  })

  test("E-CONTENT-01: 未知 slug で 404", async ({ page }) => {
    const res = await page.request.get("/unknown-slug")
    expect(res.status()).toBe(404)

    await page.goto("/unknown-slug")
    await expect(
      page.getByRole("heading", { level: 1, name: /ページが見つかりません|not found/i }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /トップへ戻る|back to top/i })).toHaveAttribute(
      "href",
      "/",
    )
  })
})
