import { expect, test } from "@playwright/test"

import { TEST_USER } from "./fixtures/users"
import { getTestUserPassword } from "./helpers"

test.describe("Flow (cross-cutting) Domain", () => {
  test("S-FLOW-02: login → /submit → logout で Header が各遷移を反映", async ({ page }) => {
    // 画面からの login 動作を検証するため fresh (未認証) context で始める。
    await page.context().clearCookies()

    // 手順 1: fresh context で /submit を開く。Header 右は「ログイン」 link。
    await page.goto("/submit")

    const loginLink = page.getByRole("link", {
      name: /ログイン|Sign in/i,
    })
    await expect(loginLink).toBeVisible({ timeout: 10_000 })
    await expect(loginLink).toHaveAttribute(
      "href",
      "/api/auth/login?return_to=%2Fsubmit",
    )

    // 手順 2: 「ログイン」 link をクリック → /api/auth/login → Keycloak へ。
    await loginLink.click()

    // 手順 3: Keycloak のログインフォームに e2e テストユーザーの認証情報を入力して submit。
    await page.locator("#username").fill(TEST_USER.username)
    await page.locator("#password").fill(getTestUserPassword())
    await page.locator("#kc-login").click()

    // 手順 4: return_to の /submit に戻り、Header 右に user 名 + 「ログアウト」 が表示される。
    await page.waitForURL(/\/submit$/, { timeout: 30_000 })

    const me = await page.request.get("/api/me")
    expect(me.status()).toBe(200)

    // logout は CSRF 対策で POST form の submit button。
    const logoutButton = page.getByRole("button", {
      name: /ログアウト|Sign out/i,
    })
    await expect(logoutButton).toBeVisible({ timeout: 10_000 })
    const logoutForm = logoutButton.locator("xpath=ancestor::form")
    await expect(logoutForm).toHaveAttribute(
      "action",
      "/api/auth/logout?return_to=%2Fsubmit",
    )

    // 手順 5: 「ログアウト」 button をクリックして Keycloak の logout を経由する。
    await logoutButton.click()

    // logout-callback が return_to (= /submit) に戻し、session 削除後 Header 右が「ログイン」 link に戻る。
    await page.waitForURL(/\/submit$/, { timeout: 30_000 })

    await expect(
      page.getByRole("link", { name: /ログイン|Sign in/i }),
    ).toBeVisible({ timeout: 10_000 })

    const meAfterLogout = await page.request.get("/api/me")
    expect(meAfterLogout.status()).toBe(401)
  })
})
