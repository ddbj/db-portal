import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router"
import { describe, expect, test } from "vitest"

import { RequireAuth } from "~/lib/auth/require-auth"

import { renderWithQueryClient } from "../../_helpers/render"
import { server } from "../../mocks/server"

const renderInRouter = (children: ReactNode, entry = "/protected") =>
  renderWithQueryClient(<MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>)

describe("RequireAuth", () => {
  test("requireAuth_unauthenticated_doesNotRenderChildren", async () => {
    renderInRouter(
      <RequireAuth><div data-testid="protected">SECRET</div></RequireAuth>,
    )
    await waitFor(() => {
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument()
    })
  })

  test("requireAuth_authenticated_rendersChildren", async () => {
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({ user: { sub: "u1", name: "T", email: "t@example.test" } }),
      ),
    )
    renderInRouter(
      <RequireAuth><div data-testid="protected">SECRET</div></RequireAuth>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("protected")).toBeInTheDocument()
    })
  })

  test("requireAuth_loading_rendersFallback", () => {
    server.use(
      http.get("*/api/me", async () => {
        await new Promise((r) => setTimeout(r, 200))

        return new HttpResponse(null, { status: 401 })
      }),
    )
    renderInRouter(
      <RequireAuth fallback={<div data-testid="fallback">loading</div>}>
        <div data-testid="protected">SECRET</div>
      </RequireAuth>,
    )
    expect(screen.getByTestId("fallback")).toBeInTheDocument()
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument()
  })

  test("requireAuth_loadingWithoutFallback_rendersNothing", () => {
    server.use(
      http.get("*/api/me", async () => {
        await new Promise((r) => setTimeout(r, 200))

        return new HttpResponse(null, { status: 401 })
      }),
    )
    renderInRouter(
      <RequireAuth><div data-testid="protected">SECRET</div></RequireAuth>,
    )
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument()
  })
})
