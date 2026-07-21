import { expect, test } from "@playwright/test"

import { loginViaKeycloak } from "./helpers"

const LOGIN_LINK = /ログイン|sign\s*in|log\s*in/i
const LOGOUT_LINK = /ログアウト|sign\s*out|log\s*out/i

test.describe("Auth Domain (authenticated)", () => {
  test("S-AUTH-02: ログイン済 Header に user 名 + 「ログアウト」 button", async ({ page }) => {
    await page.goto("/")

    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(200)
    expect(meResponse.headers()["cache-control"]).toContain("no-store")
    const body = (await meResponse.json()) as { user: { sub: string; name: string; email: string } }
    expect(body.user.name).toBeTruthy()

    // logout は CSRF 対策で POST form の submit button になっている。
    const logoutButton = page.getByRole("button", { name: LOGOUT_LINK }).first()
    await expect(logoutButton).toBeVisible({ timeout: 10_000 })
    await expect(logoutButton).toContainText(body.user.name)
    const logoutForm = logoutButton.locator("xpath=ancestor::form")
    await expect(logoutForm).toHaveAttribute("action", "/api/auth/logout?return_to=%2F")
    await expect(logoutForm).toHaveAttribute("method", /post/i)

    await expect(page.getByRole("link", { name: LOGIN_LINK })).toHaveCount(0)
  })

  test("S-AUTH-03: ログアウトで Header が「ログイン」 に戻る", async ({ page }) => {
    // 共有 storageState session を logout で壊すと並行する他 user spec が連鎖失敗する
    // (S-AUTH-06 と同じ分離方針)。自前の fresh session を立ててから logout を検証する。
    await page.context().clearCookies()
    await loginViaKeycloak(page, "/")

    const logoutButton = page.getByRole("button", { name: LOGOUT_LINK }).first()
    await expect(logoutButton).toBeVisible({ timeout: 10_000 })
    await logoutButton.click()

    await page.waitForURL(/\/(en\/?)?$/, { timeout: 30_000 })

    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(401)

    await expect(page.getByRole("link", { name: LOGIN_LINK }).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole("link", { name: LOGOUT_LINK })).toHaveCount(0)
  })

  test("S-AUTH-05: Keycloak login 往復で sid cookie 発行と returnTo 着地", async ({ page }) => {
    await page.context().clearCookies()

    const callbackResponse = page.waitForResponse(
      (r) => r.url().includes("/api/auth/callback") && r.request().method() === "GET",
      { timeout: 30_000 },
    )
    await loginViaKeycloak(page, "/bioproject")
    const callback = await callbackResponse

    await expect(page).toHaveURL(/\/bioproject$/)

    const setCookie = (await callback.headersArray())
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value)
      .join("\n")
    expect(setCookie).toMatch(/sid=/)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/Secure/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Path=\//i)

    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(200)
    expect(meResponse.headers()["cache-control"]).toContain("no-store")
    const body = (await meResponse.json()) as { user: { sub: string; name: string; email: string } }
    expect(body.user.name).toBeTruthy()

    await expect(
      page.getByRole("button", { name: LOGOUT_LINK }).first(),
    ).toContainText(body.user.name, { timeout: 10_000 })
  })

  test("S-AUTH-06: `/api/auth/logout` が end_session_endpoint に 302 し session を破棄", async ({
    page,
  }) => {
    // user project は fullyParallel で 1 つの storageState session を共有するため、
    // logout で共有 session を壊すと並行する他 user spec が連鎖失敗する。自前の
    // fresh session を立ててから logout を検証し、順序非依存にする。
    await page.context().clearCookies()
    await loginViaKeycloak(page, "/")

    // logout は CSRF 対策で POST。
    const logoutResponse = await page.request.post("/api/auth/logout?return_to=/", {
      maxRedirects: 0,
    })
    expect(logoutResponse.status()).toBe(302)

    const location = logoutResponse.headers()["location"] ?? ""
    expect(location).toBeTruthy()
    const locationUrl = new URL(location)
    expect(locationUrl.origin).toBe("https://idp-staging.ddbj.nig.ac.jp")
    expect(locationUrl.pathname).toBe("/realms/master/protocol/openid-connect/logout")
    expect(locationUrl.searchParams.get("id_token_hint")).toBeTruthy()
    expect(locationUrl.searchParams.get("client_id")).toBe("db-portal-dev")
    const postLogoutRedirect = locationUrl.searchParams.get("post_logout_redirect_uri") ?? ""
    expect(postLogoutRedirect).toContain("/api/auth/logout-callback")
    expect(postLogoutRedirect).toContain("return_to=%2F")

    const callbackResponse = await page.request.get("/api/auth/logout-callback?return_to=/", {
      maxRedirects: 0,
    })
    const callbackSetCookie = (await callbackResponse.headersArray())
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value)
      .join("\n")
    expect(callbackSetCookie).toMatch(/sid=;/)
    expect(callbackSetCookie).toMatch(/Max-Age=0/i)
    expect(callbackSetCookie).toMatch(/HttpOnly/i)
    expect(callbackSetCookie).toMatch(/SameSite=Lax/i)
    expect(callbackSetCookie).toMatch(/Path=\//i)

    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(401)
  })

  test("E-AUTH-04: server 側 session 失効で `/api/me` が 401、Header が「ログイン」 に戻る", async ({
    page,
  }) => {
    await page.goto("/")
    const portalHost = new URL(page.url()).hostname
    const bogusSid = crypto.randomUUID()
    await page.context().clearCookies()
    await page.context().addCookies([
      {
        name: "sid",
        value: bogusSid,
        domain: portalHost,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ])

    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(401)
    const body = (await meResponse.json()) as { error: string }
    expect(body.error).toBe("unauthorized")

    await page.reload()
    await expect(page.getByRole("link", { name: LOGIN_LINK }).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole("link", { name: LOGOUT_LINK })).toHaveCount(0)
  })
})
