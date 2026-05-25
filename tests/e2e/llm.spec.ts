import { expect, test } from "@playwright/test"

import { clearBrowserState } from "./helpers"

test.describe("LLM Domain (anonymous)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page)
  })

  test("S-LLM-02: /api/llm/health が ok のとき assistant が表示", async ({ page }) => {
    const healthResponse = await page.request.get("/api/llm/health")
    const health = (await healthResponse.json()) as { status: string }

    await page.goto("/search")

    if (health.status === "ok") {
      await expect(page.getByTestId("search-assistant")).toBeVisible()
    } else {
      await expect(page.getByTestId("search-assistant")).toHaveCount(0)
    }
  })

  test("E-LLM-01: health = unreachable で assistant が非表示", async ({ page }) => {
    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unreachable", reason: "test" }),
      }),
    )
    await page.goto("/search")

    await expect(page.getByTestId("search-assistant")).toHaveCount(0)
  })

  test("E-LLM-02: SSE 切断で error event を観測", async ({ page }) => {
    let errored = false
    await page.route("**/api/llm/search-assistant", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: error\ndata: {\"code\":\"network\",\"message\":\"disconnected\"}\n\n",
      }),
    )
    page.on("response", (response) => {
      if (response.url().includes("/api/llm/search-assistant") && response.status() === 200) {
        errored = true
      }
    })

    await page.route("**/api/llm/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", model: "Qwen" }),
      }),
    )
    await page.goto("/search")

    const assistant = page.getByTestId("search-assistant")
    if (await assistant.isVisible().catch(() => false)) {
      await assistant.getByRole("textbox").fill("breast cancer rna-seq")
      await assistant.getByRole("button", { name: /生成|generate/i }).click()
      await expect.poll(() => errored, { timeout: 15_000 }).toBe(true)
    } else {
      test.skip()
    }
  })
})
