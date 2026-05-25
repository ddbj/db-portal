import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { useAuth } from "~/lib/auth/use-auth"

import { renderWithQueryClient } from "../../_helpers/render"
import { server } from "../../mocks/server"

const Probe = () => {
  const auth = useAuth()
  if (auth.status === "authenticated") {
    return <div data-testid="status">authenticated:{auth.user.name}</div>
  }

  return <div data-testid="status">{auth.status}</div>
}

describe("useAuth", () => {
  test("useAuth_200_returnsAuthenticatedUser", async () => {
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({ user: { sub: "u1", name: "Taro", email: "taro@example.test" } }),
      ),
    )
    renderWithQueryClient(<Probe />)
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:Taro")
    })
  })

  test("useAuth_401_returnsUnauthenticated", async () => {
    renderWithQueryClient(<Probe />)
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })

  test("useAuth_initialState_isLoading", () => {
    server.use(
      http.get("*/api/me", async () => {
        await new Promise((r) => setTimeout(r, 100))

        return new HttpResponse(null, { status: 401 })
      }),
    )
    renderWithQueryClient(<Probe />)
    expect(screen.getByTestId("status")).toHaveTextContent("loading")
  })

  test("useAuth_invalidPayload_settlesToUnauthenticated", async () => {
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({ user: { sub: "u1" } }),
      ),
    )
    renderWithQueryClient(<Probe />)
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })
})
