import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { LoginButton } from "~/shell/login-button"

import { createNoRetryClient, renderWithStub } from "../_helpers/render"
import { server } from "../mocks/server"

const renderLoginButton = (path = "/search") =>
  renderWithStub({
    routes: [{ path: "/*", Component: () => <LoginButton /> }],
    initialEntries: [path],
    queryClient: createNoRetryClient(),
  })

describe("LoginButton", () => {
  test("LoginButton_unauthenticated_showsLoginLink", async () => {
    renderLoginButton("/search")
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ログイン/ })).toHaveAttribute(
        "href",
        "/api/auth/login?return_to=%2Fsearch",
      )
    })
  })

  test("LoginButton_authenticated_showsUserNameAndLogoutForm", async () => {
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({
          user: { sub: "u1", name: "Test User", email: "u@example.com" },
        })),
    )
    renderLoginButton("/news")
    await waitFor(() => {
      // logout は SameSite=Lax + POST form で叩く (GET link は CSRF 経路になるため
      // 廃止した)。 test は form の action と button の accessible name を検証する。
      const btn = screen.getByRole("button", { name: /Test User/ })
      const form = btn.closest("form")
      expect(form).not.toBeNull()
      expect(form).toHaveAttribute("action", "/api/auth/logout?return_to=%2Fnews")
    })
  })

  test("LoginButton_returnToWithOpenRedirect_isSanitizedToRoot", async () => {
    renderLoginButton("//evil.example/")
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ログイン/ })).toHaveAttribute(
        "href",
        "/api/auth/login?return_to=%2F",
      )
    })
  })

  test("LoginButton_authPending_showsLoadingStatusWithAriaLive", async () => {
    server.use(http.get("*/api/me", () => new Promise<Response>(() => undefined)))
    renderLoginButton("/")
    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent("認証中…")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(screen.queryByRole("link", { name: /ログイン/ })).toBeNull()
  })
})
