import { screen } from "@testing-library/react"
import type { createRoutesStub } from "react-router"
import { describe, expect, test } from "vitest"

import { TranslationUnavailable } from "~/shell/translation-unavailable"

import { renderWithStub } from "../_helpers/render"

type Routes = Parameters<typeof createRoutesStub>[0]

const withEnHandle = (routes: Routes): Routes =>
  routes.map((r) => {
    const existing = (typeof r.handle === "object" && r.handle !== null)
      ? r.handle as Record<string, unknown>
      : {}

    return { ...r, handle: { ...existing, lang: "en" as const } }
  })

const renderAt = (
  lang: "ja" | "en",
  routes: Routes,
  initial: string,
) =>
  renderWithStub({
    routes: lang === "en" ? withEnHandle(routes) : routes,
    initialEntries: [initial],
    lang,
    withQuery: false,
  })

describe("TranslationUnavailable", () => {
  test("TranslationUnavailable_jaLang_doesNotRender", () => {
    const { container } = renderAt(
      "ja",
      [
        {
          path: "/databases/:slug",
          handle: { i18n: { en: "missing" } },
          Component: () => <TranslationUnavailable />,
        },
      ],
      "/databases/bioproject",
    )
    expect(container.textContent).toBe("")
  })

  test("TranslationUnavailable_enLangCompleteHandle_doesNotRender", () => {
    const { container } = renderAt(
      "en",
      [
        {
          path: "/en/databases/:slug",
          handle: { i18n: { en: "complete" } },
          Component: () => <TranslationUnavailable />,
        },
      ],
      "/en/databases/bioproject",
    )
    expect(container.textContent).toBe("")
  })

  test("TranslationUnavailable_enLangMissingHandle_rendersBanner", () => {
    renderAt(
      "en",
      [
        {
          path: "/en/databases/:slug",
          handle: { i18n: { en: "missing" } },
          Component: () => <TranslationUnavailable />,
        },
      ],
      "/en/databases/bioproject",
    )
    expect(screen.getByText(/not yet translated/i)).toBeInTheDocument()
  })

  test("TranslationUnavailable_switchButton_postsJaToSetLang", () => {
    renderAt(
      "en",
      [
        {
          path: "/en/databases/:slug",
          handle: { i18n: { en: "partial" } },
          Component: () => <TranslationUnavailable />,
        },
      ],
      "/en/databases/bioproject",
    )
    const btn = screen.getByRole("button", { name: /Switch to Japanese/i })
    expect(btn.getAttribute("type")).toBe("submit")
    const form = btn.closest("form")
    expect(form).not.toBeNull()
    expect(form?.getAttribute("action")).toBe("/api/set-lang")
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post")
    const hidden = form?.querySelector('input[name="lang"]') as HTMLInputElement | null
    expect(hidden?.value).toBe("ja")
  })

  test("TranslationUnavailable_noI18nHandle_doesNotRender", () => {
    const { container } = renderAt(
      "en",
      [
        {
          path: "/en/databases/:slug",
          Component: () => <TranslationUnavailable />,
        },
      ],
      "/en/databases/bioproject",
    )
    expect(container.textContent).toBe("")
  })
})
