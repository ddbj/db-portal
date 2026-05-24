import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { describe, expect, test } from "vitest"

import { createI18nInstance } from "~/lib/i18n"
import { SwitchLang } from "~/shell/switch-lang"

const enHandle = { lang: "en" as const }

const renderAt = (path: string) => {
  const isEn = path === "/en" || path.startsWith("/en/")
  const i18n = createI18nInstance(isEn ? "en" : "ja")
  const Stub = createRoutesStub([
    { path: "/", Component: () => <SwitchLang /> },
    { path: "/search", Component: () => <SwitchLang /> },
    { path: "/en", handle: enHandle, Component: () => <SwitchLang /> },
    { path: "/en/news", handle: enHandle, Component: () => <SwitchLang /> },
  ])

  return render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={[path]} />
    </I18nextProvider>,
  )
}

describe("SwitchLang", () => {
  test("SwitchLang_jaPath_linksToEnCounterpart", () => {
    renderAt("/search")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/en/search")
  })

  test("SwitchLang_jaRoot_linksToEnRoot", () => {
    renderAt("/")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/en")
  })

  test("SwitchLang_enPath_linksToJaCounterpart", () => {
    renderAt("/en/news")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/news")
  })
})
