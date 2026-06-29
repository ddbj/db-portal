import { expect, test } from "./helpers"

test.describe("Flow (cross-cutting) Domain", () => {
  test("S-FLOW-01: 検索 → DB 解説ページ → browser back で q= 保持", async ({ page }) => {
    // 手順 1: トップを開く。
    await page.goto("/")

    // 手順 2: Hero の SearchBox に cancer を入力し submit → /search/results?q=cancer。
    const keyword = page.getByRole("textbox", { name: /検索キーワード|Search keywords/ }).first()
    await keyword.fill("cancer")
    await keyword.press("Enter")

    await expect(page).toHaveURL(/\/search\/results\?q=cancer$/, { timeout: 15_000 })
    await expect(page.getByTestId("db-card").first()).toBeVisible({ timeout: 20_000 })

    // 手順 3: BioProject カードの「結果一覧」 link → /search/results?q=cancer&db=bioproject。
    await page
      .locator('[data-testid="db-card"][data-db="bioproject"]')
      .getByRole("link", { name: "結果一覧" })
      .click()

    await expect(page).toHaveURL(/\/search\/results\?q=cancer&db=bioproject$/, {
      timeout: 15_000,
    })

    // 手順 4: /bioproject を開く (検索結果 route とは loader を共有しないホップ)。
    await page.goto("/bioproject")
    await expect(
      page.getByRole("heading", { name: "BioProject", level: 1 }),
    ).toBeVisible({ timeout: 10_000 })
    // flat route のため Breadcrumb は ホーム > BioProject (中間 データベース segment は無い)。
    const breadcrumb = page.getByRole("navigation", { name: /パンくず|breadcrumb/i })
    await expect(breadcrumb).toContainText("ホーム")
    await expect(breadcrumb).not.toContainText("データベース")

    // 手順 5: ブラウザの戻る → /search/results?q=cancer&db=bioproject に復元、?q=cancer 保持。
    await page.goBack()
    await expect(page).toHaveURL(/\/search\/results\?q=cancer&db=bioproject$/, {
      timeout: 15_000,
    })
    await expect(
      page.getByRole("textbox", { name: /検索キーワード|Search keywords/ }).first(),
    ).toHaveValue(/cancer/, { timeout: 20_000 })
  })

  test("S-FLOW-03: サイト横断 i18n 一貫性 (?lang=en → cookie 永続、/en prefix 不在)", async ({ page }) => {
    // 手順 1: /?lang=en を開く。302 で lang param が除去され最終 URL は / (prefix 無し)。
    await page.goto("/?lang=en")
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    const nav = page.getByRole("navigation", { name: /Main navigation|メインナビゲーション/i })
    await expect(nav.getByRole("link", { name: "Search" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Submit" })).toBeVisible()

    // 手順 2: 続けて各 route を開く (クエリ無し)。/en prefix が一切付かないこと。
    for (const path of ["/search", "/news", "/services", "/bioproject"]) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`))
      await expect(page.locator("html")).toHaveAttribute("lang", "en")
      await expect(nav.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/search")
      await expect(nav.getByRole("link", { name: "Submit" })).toHaveAttribute("href", "/submit")
    }

    // 手順 3: 言語切替ボタンをクリックして ja に戻す。/api/set-lang → 303、cookie 更新。
    const setLang = page.waitForResponse(
      (r) => r.url().includes("/api/set-lang") && r.request().method() === "POST",
      { timeout: 10_000 },
    )
    await page.getByRole("button", { name: /言語切替|Language switcher/i }).click()
    await setLang

    await expect(page.locator("html")).toHaveAttribute("lang", "ja", { timeout: 10_000 })
    await expect(
      page.getByRole("navigation", { name: /メインナビゲーション|Main navigation/i })
        .getByRole("link", { name: "検索" }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("S-FLOW-04: Header nav の aria-current と SkipLink キーボード a11y", async ({ page }) => {
    // 手順 1: /search を開く。検索 nav link が aria-current="page"、登録 link は持たない。
    await page.goto("/search")
    const nav = page.getByRole("navigation", { name: /メインナビゲーション|Main navigation/i })
    await expect(nav.getByRole("link", { name: /検索|Search/ })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(nav.getByRole("link", { name: /登録|Submit/ })).not.toHaveAttribute(
      "aria-current",
      "page",
    )

    // 手順 2: 最上部から Tab を 1 回。最初の focusable 要素 (SkipLink) にフォーカスが移る。
    await page.keyboard.press("Tab")
    const skipLink = page.getByRole("link", {
      name: /メインコンテンツへスキップ|Skip to main content/i,
    })
    await expect(skipLink).toBeFocused()

    // 手順 3: Enter で SkipLink を実行 → フォーカスが <main id="main"> に移動、
    // または URL hash が #main になる (scenarios.md の OR 期待。<main> は tabindex を
    // 持たないため、ブラウザによっては activeElement が body のまま hash だけ更新される)。
    await page.keyboard.press("Enter")
    const activeId = await page.evaluate(() => document.activeElement?.id ?? "")
    const hash = new URL(page.url()).hash
    expect(activeId === "main" || hash === "#main").toBe(true)

    // 手順 4: /submit では 登録 link が aria-current="page"、検索 link は持たない。
    await page.goto("/submit")
    await expect(nav.getByRole("link", { name: /登録|Submit/ })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(nav.getByRole("link", { name: /検索|Search/ })).not.toHaveAttribute(
      "aria-current",
      "page",
    )
    // About us は外部 link で active 判定対象外 (aria-current を持たない)。
    await expect(nav.getByRole("link", { name: /About us/i })).not.toHaveAttribute(
      "aria-current",
      "page",
    )

    // トップ (computeActiveNav が null) では 検索・登録 どちらも aria-current を持たない。
    await page.goto("/")
    await expect(nav.getByRole("link", { name: /検索|Search/ })).not.toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(nav.getByRole("link", { name: /登録|Submit/ })).not.toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("E-FLOW-01: robots.txt / sitemap.xml エンドポイントの content-type と実 slug 反映", async ({ page }) => {
    // 手順 1: /robots.txt を取得。200 + text/plain + User-agent: *。
    const robots = await page.request.get("/robots.txt")
    expect(robots.status()).toBe(200)
    expect(robots.headers()["content-type"]).toContain("text/plain")
    const robotsBody = await robots.text()
    expect(robotsBody).toContain("User-agent: *")
    // 非 production (staging) では Disallow: / 側を確認する。
    // production の Sitemap: 行分岐は production deploy でのみ確認可能。
    expect(robotsBody).toContain("Disallow: /")

    // 手順 2: /sitemap.xml を取得。200 + application/xml + 実 slug 反映。
    const sitemap = await page.request.get("/sitemap.xml")
    expect(sitemap.status()).toBe(200)
    expect(sitemap.headers()["content-type"]).toContain("application/xml")
    const xml = await sitemap.text()
    expect(xml).toContain("<urlset")
    // app/content/databases の実 slug を反映した ja/en の <loc>。
    expect(xml).toMatch(/\/bioproject\?lang=ja/)
    expect(xml).toMatch(/\/bioproject\?lang=en/)
    // 各 url が ja/en/x-default の 3 alternates を持つ。
    expect(xml).toContain('hreflang="ja"')
    expect(xml).toContain('hreflang="en"')
    expect(xml).toContain('hreflang="x-default"')
    // 静的 path も ja/en 2 件ずつ含む。
    for (const staticPath of ["/", "/search", "/submit", "/news"]) {
      const tail = staticPath === "/" ? "" : staticPath
      expect(xml).toContain(`${tail}?lang=ja`)
      expect(xml).toContain(`${tail}?lang=en`)
    }
  })

  test("E-FLOW-02: 未知のトップレベル route で汎用 404 ErrorBoundary", async ({ page }) => {
    // 手順 1: 未知 route を直接 navigation。no-match → root ErrorBoundary の not-found kind。
    const response = await page.goto("/totally-unknown")
    expect(response?.status()).toBe(404)

    const errorPage = page.getByRole("alert")
    await expect(errorPage).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole("heading", { name: /ページが見つかりません|Page not found/i, level: 1 }),
    ).toBeVisible()

    // 「トップへ戻る」 TextLink が / を href に持つ。
    await expect(
      page.getByRole("link", { name: /トップへ戻る|Back to top/i }),
    ).toHaveAttribute("href", "/")

    // ErrorBoundary は ShellLayout でラップされ、Header / SkipLink を含む app shell ごと描画される。
    await expect(
      page.getByRole("navigation", { name: /メインナビゲーション|Main navigation/i }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /メインコンテンツへスキップ|Skip to main content/i }),
    ).toHaveCount(1)
  })
})
