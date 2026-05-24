import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { describe, expect, test } from "vitest"

import { createI18nInstance } from "~/lib/i18n"
import { createQueryClient } from "~/lib/query/client"
import { LoginButton } from "~/shell/login-button"

import { server } from "../mocks/server"

const renderLoginButton = (path = "/search") => {
  const i18n = createI18nInstance("ja")
  const queryClient = createQueryClient()
  const Stub = createRoutesStub([
    { path: "/*", Component: () => <LoginButton /> },
  ])
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Stub initialEntries={[path]} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe("LoginButton", () => {
  test("LoginButton_unauthenticated_showsLoginLink", async () => {
    server.use(http.get("/api/me", () => HttpResponse.json(null, { status: 401 })))
    renderLoginButton("/search")
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ログイン/ })).toHaveAttribute(
        "href",
        "/api/auth/login?return_to=%2Fsearch",
      )
    })
  })

  test("LoginButton_authenticated_showsUserNameAndLogoutLink", async () => {
    server.use(
      http.get("/api/me", () =>
        HttpResponse.json({
          user: { sub: "u1", name: "Test User", email: "u@example.com" },
        })),
    )
    renderLoginButton("/news")
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /Test User/ })
      expect(link).toHaveAttribute("href", "/api/auth/logout?return_to=%2Fnews")
    })
  })

  test("LoginButton_returnToWithOpenRedirect_isSanitizedToRoot", async () => {
    server.use(http.get("/api/me", () => HttpResponse.json(null, { status: 401 })))
    renderLoginButton("//evil.example/")
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ログイン/ })).toHaveAttribute(
        "href",
        "/api/auth/login?return_to=%2F",
      )
    })
  })
})
