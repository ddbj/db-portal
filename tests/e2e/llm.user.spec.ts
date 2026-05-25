import { expect, test } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test.describe("LLM Domain (authenticated)", () => {
  test("S-LLM-01: AI 検索アシスタントで proposal 受信", async ({ page }) => {
    const healthResponse = await page.request.get("/api/llm/health")
    const health = (await healthResponse.json()) as { status: string }
    test.skip(health.status !== "ok", `vLLM not ok: ${health.status}`)

    await page.goto("/search")

    const assistant = page.getByTestId("search-assistant")
    await assistant.getByRole("textbox").fill("human breast cancer rna-seq from 2023")
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200,
    )
    await assistant.getByRole("button", { name: /生成|generate/i }).click()
    await responsePromise

    await expect(assistant.getByTestId("search-assistant-proposal")).toBeVisible({
      timeout: 60_000,
    })
  })
})
