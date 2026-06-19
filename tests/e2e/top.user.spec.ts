import { expect, test } from "@playwright/test"

test.describe("Top Domain (authenticated)", () => {
  test("E-TOP-03: hero AI クエリビルダー generate → serialize → 結果ページ遷移", async ({ page }) => {
    // hero の AI 生成は vLLM 非依存にするため health=ok と SSE(done) を mock 固定する。
    // done AST の serialize (/db-portal/serialize、実) → navigate → 結果領域は実物を通す。
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", model: "e2e" }),
      }),
    )
    await page.route("**/api/llm/search-assistant", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          ": stream-open\n\n"
          + `event: done\ndata: ${JSON.stringify({ op: "contains", field: "organism_name", value: "Homo sapiens" })}\n\n`,
      }),
    )

    await page.goto("/")

    // hero の「AI クエリビルダー」 トグル: aria-pressed=false → click で true へ。
    const aiToggle = page.getByRole("button", { name: /AI クエリビルダー|AI Query Builder/i })
    await expect(aiToggle).toHaveAttribute("aria-pressed", "false")
    await aiToggle.click()
    await expect(aiToggle).toHaveAttribute("aria-pressed", "true")

    // AI クエリビルダーでは SearchBox の input が AI 入力欄 (aria-label = search.a11y.assistantInput) に切り替わる。
    const aiInput = page.getByRole("textbox", {
      name: /AI クエリビルダーへの入力|AI Query Builder input/i,
    })
    await expect(aiInput).toBeVisible()
    await aiInput.fill("human breast cancer rna-seq from 2023")

    // SSE 生成 (/api/llm/search-assistant) と、その AST を DSL 化する serialize 呼び出しを待つ。
    const assistantResponse = page.waitForResponse(
      (r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200,
    )
    const serializeResponse = page.waitForResponse(
      (r) => r.url().includes("/db-portal/serialize") && r.status() === 200,
    )

    // top の NavigableSearchInput では AI 送信ボタンは search.a11y.submit ラベルなので、
    // ラベル非依存で AI 入力欄上の Enter で submit する。
    await aiInput.press("Enter")

    await assistantResponse
    await serializeResponse

    // 生成 AST を serializeAstToDsl で DSL 化し、非空 DSL を q に載せて /search/results へ navigate する。
    await page.waitForURL(/\/search\/results\?q=.+/, { timeout: 60_000 })

    const url = new URL(page.url())
    expect((url.searchParams.get("q") ?? "").length).toBeGreaterThan(0)

    // 結果ページの cross-DB 検索結果領域 (role=region aria-label=検索結果) が描画される。
    await expect(
      page.getByRole("region", { name: /検索結果|Search results/i }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })
})
