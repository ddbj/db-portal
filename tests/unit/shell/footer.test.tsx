import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import { createI18nInstance } from "~/lib/i18n"
import { Footer } from "~/shell/footer"

const renderFooter = (lang: "ja" | "en") => {
  const i18n = createI18nInstance(lang)
  return render(
    <I18nextProvider i18n={i18n}>
      <Footer />
    </I18nextProvider>,
  )
}

describe("Footer", () => {
  test("Footer_ja_rendersFourLinksWithJaLabels", () => {
    renderFooter("ja")
    expect(screen.getByRole("link", { name: "運営組織" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "利用規約" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "プライバシー" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "アクセシビリティ" })).toBeInTheDocument()
  })

  test("Footer_en_rendersFourLinksWithEnLabels", () => {
    renderFooter("en")
    expect(screen.getByRole("link", { name: "Operating organisation" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Terms of use" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Accessibility" })).toBeInTheDocument()
  })

  test("Footer_orgName_isShown", () => {
    renderFooter("ja")
    expect(screen.getByText("DDBJ — Bioinformation and DDBJ Center")).toBeInTheDocument()
  })
})
