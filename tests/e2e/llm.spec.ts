import { expect, test } from "./helpers"

const enterMode = /AI モード|AI mode/
const assistantInput = /AI 検索アシスタントへの入力|AI search assistant input/
const generateError = /クエリの生成に失敗しました|Could not generate a query/
const retryGeneration = /再試行|Try again/
const fieldSelector = /検索フィールド|Search field/
const proposalHeading = /AI による生成結果|AI-generated query/

test.describe("LLM Domain", () => {
  test("S-LLM-02: /api/llm/health が ok のとき AI モードトグルが表示される", async ({ page }) => {
    const health = await page.request.get("/api/llm/health")
    expect(health.status()).toBe(200)
    expect(health.headers()["cache-control"]).toContain("no-store")
    const body = (await health.json()) as { status: string; model?: string }
    expect(["ok", "unreachable", "unset"]).toContain(body.status)

    await page.goto("/search")

    if (body.status === "ok") {
      expect(typeof body.model).toBe("string")
      const toggle = page.getByRole("button", { name: enterMode })
      await expect(toggle).toBeVisible()
      await expect(toggle).toHaveAttribute("aria-pressed", "false")
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-pressed", "true")
      await expect(page.getByRole("textbox", { name: assistantInput })).toBeVisible()
    } else {
      // Unreachable still surfaces the toggle (E-LLM-01); unset hides it
      // (E-LLM-04). Only the `ok` branch is asserted here per the scenario.
      expect(["unreachable", "unset"]).toContain(body.status)
    }
  })

  test("S-LLM-03: /search の proposal を Apply → Advanced builder が再構築される", async ({ page }) => {
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

    await page.goto("/search")

    const toggle = page.getByRole("button", { name: enterMode })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")

    const input = page.getByRole("textbox", { name: assistantInput })
    await input.fill("Homo sapiens single cell published between 2022 and 2024")

    await page.getByRole("button", { name: /^生成$|^Generate$/ }).click()

    const proposal = page.getByRole("region", { name: proposalHeading })
    await expect(proposal).toBeVisible({ timeout: 30_000 })

    await page.getByRole("button", { name: /この内容で作成|Create with this/ }).click()

    // Apply rebuilds the builder (replaceRoot) and returns to keyword mode.
    await expect(toggle).toHaveAttribute("aria-pressed", "false", { timeout: 10_000 })
    await expect(page.getByRole("textbox", { name: assistantInput })).toHaveCount(0)
    const rows = page.getByRole("combobox", { name: fieldSelector })
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThanOrEqual(1)
  })

  test("E-LLM-01: health=unreachable のとき AI モードトグルは表示される (送信時のみ失敗)", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unreachable", reason: "status 503" }),
      }),
    )
    await page.goto("/search")

    await expect(page.getByRole("button", { name: enterMode })).toBeVisible()
    // Before submitting nothing has failed: no error affordance is shown.
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("E-LLM-02: SSE 切断で inline alert + 入力欄保持", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", model: "e2e" }),
      }),
    )
    let assistantCalls = 0
    await page.route("**/api/llm/search-assistant", (route) => {
      assistantCalls += 1
      void route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": stream-open\n\nevent: error\ndata: {\"code\":\"upstream-disconnect\",\"message\":\"stream interrupted\"}\n\n",
      })
    })
    await page.goto("/search/results?q=cancer&db=bioproject")

    await page.getByRole("button", { name: enterMode }).click()

    const input = page.getByRole("textbox", { name: assistantInput })
    await input.fill("breast cancer rna-seq")
    await input.press("Enter")

    const alert = page.getByRole("alert")
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert).toHaveText(generateError)
    await expect(input).toHaveValue("breast cancer rna-seq")
    await expect(page).toHaveURL(/\/search\/results\?q=cancer&db=bioproject/)
    // The failure reads as a validation failure: the box turns invalid.
    await expect(input).toHaveAttribute("aria-invalid", "true")
    // The implementation surfaces errors inline, never via a toast/status node.
    await expect(page.getByRole("status")).toHaveCount(0)

    // 再試行 re-runs generation with the retained input.
    await page.getByRole("button", { name: retryGeneration }).click()
    await expect.poll(() => assistantCalls).toBe(2)
    await expect(input).toHaveValue("breast cancer rna-seq")
  })

  test("E-LLM-03: event:error が UI に inline alert として届き入力が保持される", async ({ page }) => {
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
        body: ": stream-open\n\nevent: error\ndata: {\"code\":\"upstream-disconnect\",\"message\":\"stream interrupted\"}\n\n",
      }),
    )
    await page.goto("/")

    await page.getByRole("button", { name: enterMode }).click()

    const input = page.getByRole("textbox", { name: assistantInput })
    await input.fill("single cell human pancreas")
    await input.press("Enter")

    const alert = page.getByRole("alert")
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert).toHaveText(generateError)
    await expect(input).toHaveValue("single cell human pancreas")
    await expect(page).toHaveURL(/\/$/)
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByRole("button", { name: retryGeneration })).toBeVisible()
    await expect(page.getByRole("status")).toHaveCount(0)
  })

  test("E-LLM-04: unset と unreachable のゲーティング差 (unset で非表示、unreachable で表示)", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unset" }),
      }),
    )

    await page.goto("/search")
    await expect(page.getByRole("search")).toBeVisible()
    // unset → toggle is not in the DOM (ready: false), and no error banner.
    await expect(page.getByRole("button", { name: enterMode })).toHaveCount(0)
    await expect(page.getByRole("alert")).toHaveCount(0)

    await page.unroute("**/api/llm/health")
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unreachable", reason: "status 503" }),
      }),
    )
    await page.reload()
    // unreachable → ready: true, the toggle is shown.
    await expect(page.getByRole("button", { name: enterMode })).toBeVisible()
  })

  test("E-LLM-05: top/results で done が proposal を出さず /search/results に遷移する", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", model: "e2e" }),
      }),
    )
    const doneAst = { op: "contains", field: "organism_name", value: "Homo sapiens" }
    await page.route("**/api/llm/search-assistant", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          ": stream-open\n\n"
          + "event: message\ndata: {\"delta\":\"organism_name\"}\n\n"
          + "event: message\ndata: {\"delta\":\" contains\"}\n\n"
          + `event: done\ndata: ${JSON.stringify(doneAst)}\n\n`,
      }),
    )
    await page.goto("/")

    await page.getByRole("button", { name: enterMode }).click()

    const input = page.getByRole("textbox", { name: assistantInput })
    await input.fill("human samples")
    await input.press("Enter")

    // NavigableSearchInput has no in-place proposal; done serializes + navigates.
    await page.waitForURL(/\/search\/results\?q=/, { timeout: 20_000 })
    expect(new URL(page.url()).searchParams.get("q")).toBeTruthy()
    await expect(page.getByRole("region", { name: proposalHeading })).toHaveCount(0)
  })

  test("E-LLM-06: 429 rate_limited が SSE 開始前に返り、UI がエラー affordance を出す", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", model: "e2e" }),
      }),
    )
    await page.route("**/api/llm/search-assistant", (route) =>
      route.fulfill({
        status: 429,
        headers: { "Retry-After": "30" },
        contentType: "application/json",
        body: JSON.stringify({ error: "rate_limited", axis: "ip" }),
      }),
    )
    await page.goto("/search/results?q=cancer")

    await page.getByRole("button", { name: enterMode }).click()

    const input = page.getByRole("textbox", { name: assistantInput })
    await input.fill("lung cancer")
    await input.press("Enter")

    const alert = page.getByRole("alert")
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert).toHaveText(generateError)
    await expect(input).toHaveValue("lung cancer")
    await expect(page).toHaveURL(/\/search\/results\?q=cancer/)
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByRole("button", { name: retryGeneration })).toBeVisible()
  })
})
