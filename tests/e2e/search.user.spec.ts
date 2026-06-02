import { expect, test } from "@playwright/test"

test.describe("Search Domain (authenticated)", () => {
  test("S-SEARCH-11: per-DB results の AI append 生成が現クエリを保持して navigate する", async ({ page }) => {
    // vLLM の生成揺れ/timeout に依存しないよう health=ok と SSE(done) を mock 固定する。
    // append は server 側で現クエリ (cancer) と融合した AST を done で返す設計なので、
    // mock も融合済み AND AST (free_text:cancer + organism_name:Homo sapiens) を返す。
    // この done AST の serialize → navigate (現クエリ保持) は実コードを通す。
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", model: "e2e" }),
      }),
    )
    const appendedAst = {
      op: "AND",
      rules: [
        { op: "free_text", value: "cancer" },
        { op: "contains", field: "organism_name", value: "Homo sapiens" },
      ],
    }
    await page.route("**/api/llm/search-assistant", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `: stream-open\n\nevent: done\ndata: ${JSON.stringify(appendedAst)}\n\n`,
      }),
    )

    await page.goto("/search/results?q=cancer&db=bioproject")

    // AI モード toggle (search.assistant.enterMode) は health=ok のときだけ出る。
    const aiToggle = page
      .getByRole("search")
      .getByRole("button", { name: /AI モード|AI mode/ })
    await expect(aiToggle).toBeVisible({ timeout: 15_000 })
    await expect(aiToggle).toHaveAttribute("aria-pressed", "false")
    await aiToggle.click()
    await expect(aiToggle).toHaveAttribute("aria-pressed", "true")

    // 生成モードセレクタ (search.assistant.modeGroupLabel) で「既存に追加」
    // (search.assistant.modeAppend) を選択する。現クエリ (cancer) が non-identity
    // なので append が有効。
    await page
      .getByRole("button", { name: /生成モード|Generation mode/ })
      .click()
    await page
      .getByRole("option", { name: /既存に追加|Add to existing/ })
      .click()

    const aiInput = page.getByRole("textbox", {
      name: /AI 検索アシスタントへの入力|AI search assistant input/,
    })
    await aiInput.fill("2023 年以降に公開されたものに限定する")

    // SSE の完了 (event: done) を network response で観測する。
    const response = page.waitForResponse(
      (r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200,
      { timeout: 60_000 },
    )
    await aiInput.press("Enter")
    await response

    // done 後、生成 AST を DSL 化し /search/results へ navigate(push)。元の cancer
    // (free_text) は残ったまま、新条件が AND 追加され、db=bioproject は保持される。
    // 初期 URL (q=cancer) ではなく、append 融合後 (cancer を含みつつ q !== "cancer")
    // へ navigate したことを待つ。db=bioproject は保持される。
    await page.waitForURL(
      (url) => {
        if (!url.pathname.endsWith("/search/results")) return false
        const q = url.searchParams.get("q") ?? ""

        return q.includes("cancer") && q !== "cancer"
          && url.searchParams.get("db") === "bioproject"
      },
      { timeout: 60_000 },
    )

    const navigated = new URL(page.url())
    expect(navigated.searchParams.get("db")).toBe("bioproject")
    expect(navigated.searchParams.get("q")).toContain("cancer")
    // append によって新条件 (date_published 等) が AND 融合される。元クエリ単独
    // (cancer だけ) ではなく、追加分が q に乗っていること。
    expect(navigated.searchParams.get("q")).not.toBe("cancer")
  })
})
