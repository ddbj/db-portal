import { expect, type Page, test } from "@playwright/test"

const aiInputName = /AI クエリビルダーへの入力|AI Query Builder input/i
const proposalName = /AI クエリビルダーの生成結果|AI Query Builder result/i

// AI 生成は vLLM の生成揺れ/timeout に依存しないよう health=ok と SSE(done) を
// page.route で mock 固定する (llm.spec.ts の E-LLM-* と同流儀)。
const mockLlm = async (page: Page): Promise<void> => {
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
        + "event: message\ndata: {\"delta\":\"organism_name contains\"}\n\n"
        + `event: done\ndata: ${JSON.stringify({ op: "contains", field: "organism_name", value: "Homo sapiens" })}\n\n`,
    }),
  )
}

test.describe("LLM Domain (authenticated)", () => {
  test("S-LLM-01: /search で AI クエリビルダー生成 → proposal が in-place 表示される", async ({ page }) => {
    await mockLlm(page)
    await page.goto("/search")

    const toggle = page.getByRole("button", { name: /AI クエリビルダー|AI Query Builder/i })
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    await expect(toggle).toHaveAttribute("aria-pressed", "false")

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")

    const aiInput = page.getByRole("textbox", { name: aiInputName })
    await expect(aiInput).toBeVisible()
    await aiInput.fill("human breast cancer rna-seq from 2023")

    await page.getByRole("button", { name: /^生成$|^Generate$/ }).click()

    // SearchInputPanel は done で proposal を in-place 描画する (navigate しない)。
    const proposal = page.getByRole("region", { name: proposalName })
    await expect(proposal).toBeVisible({ timeout: 15_000 })
    await expect(proposal.getByRole("heading", { level: 2 })).toBeVisible()

    await expect(
      page.getByRole("button", {
        name: /クエリビルダーに追加|この内容で作成|Add to query builder|Create with this/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /再生成|Regenerate/i }),
    ).toBeVisible()
  })

  test("E-LLM-07: PII を含む prompt でも done が返り、proposal に redaction マーカーが出ない", async ({ page }) => {
    await mockLlm(page)
    await page.goto("/search")

    const toggle = page.getByRole("button", { name: /AI クエリビルダー|AI Query Builder/i })
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")

    const aiInput = page.getByRole("textbox", { name: aiInputName })
    await aiInput.fill("contact me at user@example.com about human cancer rna-seq")

    await page.getByRole("button", { name: /^生成$|^Generate$/ }).click()

    const proposal = page.getByRole("region", { name: proposalName })
    await expect(proposal).toBeVisible({ timeout: 15_000 })

    // redaction は server-log 専用: masking マーカーは描画された proposal に出てはならない
    // (redaction ロジック自体は server/llm/redaction の unit / PBT で担保)。
    const proposalText = (await proposal.textContent()) ?? ""
    expect(proposalText).not.toMatch(/\[REDACTED/i)
  })
})
