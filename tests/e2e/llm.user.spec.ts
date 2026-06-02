import { expect, type Page, test } from "@playwright/test"

// Real-vLLM scenarios: rate-limited per notes.md §5.2, so run serially and skip
// when /api/llm/health is not "ok" (staging vLLM unreachable).
test.describe.configure({ mode: "serial" })

const healthOk = async (page: Page): Promise<boolean> => {
  const response = await page.request.get("/api/llm/health")
  if (!response.ok()) return false
  const body = (await response.json()) as { status?: string }
  return body.status === "ok"
}

test.describe("LLM Domain (authenticated)", () => {
  test("S-LLM-01: /search で AI モード生成 → proposal が in-place 表示される", async ({ page }) => {
    test.skip(!(await healthOk(page)), "vLLM not ok")

    await page.goto("/search")

    const toggle = page.getByRole("button", { name: /AI モード|AI mode/i })
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    await expect(toggle).toHaveAttribute("aria-pressed", "false")

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")

    const aiInput = page.getByRole("textbox", {
      name: /AI 検索アシスタントへの入力|AI search assistant input/i,
    })
    await expect(aiInput).toBeVisible()
    await aiInput.fill("human breast cancer rna-seq from 2023")

    const response = page.waitForResponse(
      (r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200,
      { timeout: 60_000 },
    )
    await page.getByRole("button", { name: /^生成$|^Generate$/ }).click()
    const sse = await response
    expect(sse.headers()["content-type"]).toContain("text/event-stream")

    // SSE screens never reach network idle (notes.md §4.3 / §6); poll for the
    // proposal region rendered in place once event: done arrives.
    const proposal = page.getByRole("region", { name: /AI による生成結果|AI-generated query/i })
    await expect(proposal).toBeVisible({ timeout: 60_000 })
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
    test.skip(!(await healthOk(page)), "vLLM not ok")

    await page.goto("/search")

    const toggle = page.getByRole("button", { name: /AI モード|AI mode/i })
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")

    const aiInput = page.getByRole("textbox", {
      name: /AI 検索アシスタントへの入力|AI search assistant input/i,
    })
    await aiInput.fill("contact me at user@example.com about human cancer rna-seq")

    const response = page.waitForResponse(
      (r) => r.url().includes("/api/llm/search-assistant") && r.status() === 200,
      { timeout: 60_000 },
    )
    await page.getByRole("button", { name: /^生成$|^Generate$/ }).click()
    await response

    const proposal = page.getByRole("region", { name: /AI による生成結果|AI-generated query/i })
    await expect(proposal).toBeVisible({ timeout: 60_000 })

    // Redaction is server-log only: masking markers must never surface in the
    // rendered proposal text.
    const proposalText = (await proposal.textContent()) ?? ""
    expect(proposalText).not.toContain("[REDACTED_EMAIL]")
    expect(proposalText).not.toContain("[REDACTED_PHONE]")
    expect(proposalText).not.toMatch(/\[REDACTED/i)
  })
})
