import { expect, test } from "@playwright/test"

import { clearBrowserState } from "./helpers"

test.describe("Auth Domain (anonymous)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page)
  })

  test("S-AUTH-01: 未認証で /api/me 401 + Header にログインボタン", async ({ page }) => {
    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(401)

    await page.goto("/")
    await expect(page.getByRole("link", { name: /ログイン|log\s*in|sign\s*in/i }).first()).toBeVisible()
  })

  test("E-AUTH-01: callback で state 不一致 → 400 invalid_state", async ({ page }) => {
    const res = await page.request.get(
      "/api/auth/callback?code=x&state=evil",
      { maxRedirects: 0 },
    )
    expect(res.status()).toBe(400)
    const text = await res.text()
    expect(text).toMatch(/invalid_state/)
    const setCookie = res.headers()["set-cookie"]
    expect(setCookie ?? "").not.toMatch(/sid=/)
  })
})
