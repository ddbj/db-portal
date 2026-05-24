import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { useAuth } from "~/lib/auth/use-auth"

import { server } from "../../mocks/server"

const Probe = () => {
  const auth = useAuth()
  if (auth.status === "authenticated") {
    return <div data-testid="status">authenticated:{auth.user.name}</div>
  }

  return <div data-testid="status">{auth.status}</div>
}

const renderProbe = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>)
}

describe("useAuth", () => {
  test("useAuth_200_returnsAuthenticatedUser", async () => {
    server.use(
      http.get("/api/me", () =>
        HttpResponse.json({ user: { sub: "u1", name: "Taro", email: "taro@example.test" } }),
      ),
    )
    renderProbe()
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:Taro")
    })
  })

  test("useAuth_401_returnsUnauthenticated", async () => {
    server.use(
      http.get("/api/me", () =>
        new HttpResponse(null, { status: 401 }),
      ),
    )
    renderProbe()
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })

  test("useAuth_initialState_isLoading", () => {
    server.use(
      http.get("/api/me", async () => {
        await new Promise((r) => setTimeout(r, 100))

        return new HttpResponse(null, { status: 401 })
      }),
    )
    renderProbe()
    expect(screen.getByTestId("status")).toHaveTextContent("loading")
  })

  test("useAuth_invalidPayload_settlesToUnauthenticated", async () => {
    server.use(
      http.get("/api/me", () =>
        HttpResponse.json({ user: { sub: "u1" } }),
      ),
    )
    renderProbe()
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })
})
