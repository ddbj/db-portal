import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { describe, expect, test } from "vitest"

import { createI18nInstance } from "~/lib/i18n"
import { TranslationUnavailable } from "~/shell/translation-unavailable"

const withEnHandle = (
  routes: Parameters<typeof createRoutesStub>[0],
): Parameters<typeof createRoutesStub>[0] =>
  routes.map((r) => {
    const existing = (typeof r.handle === "object" && r.handle !== null)
      ? r.handle as Record<string, unknown>
      : {}

    return { ...r, handle: { ...existing, lang: "en" as const } }
  })

const renderAt = (
  lang: "ja" | "en",
  routes: Parameters<typeof createRoutesStub>[0],
  initial: string,
) => {
  const i18n = createI18nInstance(lang)
  const Stub = createRoutesStub(lang === "en" ? withEnHandle(routes) : routes)

  return render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={[initial]} />
    </I18nextProvider>,
  )
}

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

  test("TranslationUnavailable_switchLink_pointsToJaCounterpart", () => {
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
    const link = screen.getByRole("link", { name: /Switch to Japanese/i })
    expect(link).toHaveAttribute("href", "/databases/bioproject")
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
