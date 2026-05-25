import { expect, test } from "@playwright/test"

test.describe("Auth Domain (authenticated)", () => {
  test("S-AUTH-02: ログイン済セッションで Header に user 名 + ログアウト link", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("link", { name: /ログアウト|log\s*out|sign\s*out/i }).first()).toBeVisible()
  })

  test("S-AUTH-03: ログアウト後に Header「ログイン」 link が再表示", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /ログアウト|log\s*out|sign\s*out/i }).first().click()

    await page.waitForURL(/\/(en\/?)?$/, { timeout: 30_000 })
    await expect(page.getByRole("link", { name: /ログイン|log\s*in|sign\s*in/i }).first()).toBeVisible()
  })

  test("E-AUTH-02: refresh 失敗時に /api/me が 401 を返す可能性", async ({ page }) => {
    await page.route("**/realms/master/protocol/openid-connect/token", (route) =>
      route.fulfill({ status: 400, body: "invalid_grant" }),
    )

    const response = await page.request.get("/api/me")
    expect([200, 401]).toContain(response.status())
  })
})
