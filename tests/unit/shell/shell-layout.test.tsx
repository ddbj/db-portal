import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { ShellLayout } from "~/shell/shell-layout"

import { renderWithStub } from "../_helpers/render"
import { server } from "../mocks/server"

const renderLayout = (lang: "ja" | "en" = "ja") => {
  server.use(http.get("*/api/news", () => HttpResponse.json([])))
  server.use(http.get("*/api/me", () => HttpResponse.json({ authenticated: false }, { status: 401 })))
  return renderWithStub({
    routes: [
      {
        path: "/",
        handle: { lang: "ja" as const },
        Component: () => <ShellLayout><span data-testid="body">content</span></ShellLayout>,
      },
      {
        path: "/en",
        handle: { lang: "en" as const },
        Component: () => <ShellLayout><span data-testid="body">content</span></ShellLayout>,
      },
    ],
    initialEntries: [lang === "en" ? "/en" : "/"],
    lang,
  })
}

describe("ShellLayout", () => {
  test("ShellLayout_renderChildrenInsideMain", () => {
    renderLayout()
    const body = screen.getByTestId("body")
    const main = body.closest("main")
    expect(main).not.toBeNull()
    expect(main).toHaveAttribute("id", "main")
  })

  test("ShellLayout_main_appliesMinHeight60vh", () => {
    renderLayout()
    expect(screen.getByTestId("body").closest("main"))
      .toHaveClass("min-h-[60vh]")
  })

  test("ShellLayout_skipLink_isFirstFocusableElement", () => {
    const { container } = renderLayout()
    const firstLink = container.querySelector("a")
    expect(firstLink).not.toBeNull()
    expect(firstLink).toHaveAttribute("href", "#main")
  })

  test("ShellLayout_header_isPresent", () => {
    renderLayout()
    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  test("ShellLayout_pageWrapper_appliesBaseTokens", () => {
    renderLayout()
    const main = screen.getByTestId("body").closest("main")
    const pageWrap = main?.parentElement
    expect(pageWrap).toHaveClass(
      "min-h-full",
      "w-full",
      "bg-surface",
      "text-ink",
      "font-sans",
      "leading-relaxed",
    )
  })
})
