import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { afterEach, describe, expect, test, vi } from "vitest"

import type * as I18nModule from "~/lib/i18n"
import { createI18nInstance, useLang } from "~/lib/i18n"
import { SwitchLang } from "~/shell/switch-lang"

vi.mock("~/lib/i18n", async () => {
  const actual = await vi.importActual<typeof I18nModule>("~/lib/i18n")
  return { ...actual, useLang: vi.fn(() => "ja" as const) }
})

afterEach(() => {
  vi.mocked(useLang).mockReturnValue("ja")
})

const renderAt = (path: string, lang: "ja" | "en") => {
  vi.mocked(useLang).mockReturnValue(lang)
  const i18n = createI18nInstance(lang)
  const Stub = createRoutesStub([
    { path: "/*", Component: () => <SwitchLang /> },
  ])
  return render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={[path]} />
    </I18nextProvider>,
  )
}

describe("SwitchLang", () => {
  test("SwitchLang_jaPath_linksToEnCounterpart", () => {
    renderAt("/search", "ja")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/en/search")
  })

  test("SwitchLang_jaRoot_linksToEnRoot", () => {
    renderAt("/", "ja")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/en")
  })

  test("SwitchLang_enPath_linksToJaCounterpart", () => {
    renderAt("/en/news", "en")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/news")
  })
})
