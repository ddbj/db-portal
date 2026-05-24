import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { afterEach, describe, expect, test, vi } from "vitest"

import type * as I18nModule from "~/lib/i18n"
import { createI18nInstance, useLang } from "~/lib/i18n"
import { TranslationUnavailable } from "~/shell/translation-unavailable"

vi.mock("~/lib/i18n", async () => {
  const actual = await vi.importActual<typeof I18nModule>("~/lib/i18n")
  return { ...actual, useLang: vi.fn(() => "ja" as const) }
})

afterEach(() => {
  vi.mocked(useLang).mockReturnValue("ja")
})

const renderAt = (
  lang: "ja" | "en",
  routes: Parameters<typeof createRoutesStub>[0],
  initial: string,
) => {
  vi.mocked(useLang).mockReturnValue(lang)
  const i18n = createI18nInstance(lang)
  const Stub = createRoutesStub(routes)
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
