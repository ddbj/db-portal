import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import { createI18nInstance } from "~/lib/i18n"
import { useT } from "~/lib/i18n/use-t"

const Probe = ({ k }: { k: string }) => {
  const t = useT()

  return <span data-testid="t">{t(k)}</span>
}

const renderProbe = (lang: "ja" | "en", k: string) => {
  const i18n = createI18nInstance(lang)

  return render(<I18nextProvider i18n={i18n}><Probe k={k} /></I18nextProvider>)
}

describe("useT", () => {
  test.each([
    ["ja" as const, "breadcrumb.home", "ホーム"],
    ["en" as const, "breadcrumb.home", "Home"],
    ["ja" as const, "breadcrumb.docs", "ナレッジベース"],
    ["en" as const, "breadcrumb.docs", "Knowledge Base"],
  ])("useT_%s_%s_resolvesToLocale", (lang, key, expected) => {
    renderProbe(lang, key)
    expect(screen.getByTestId("t")).toHaveTextContent(expected)
  })

  test("useT_missingKey_returnsKeyAsFallback", () => {
    renderProbe("ja", "definitely.not.a.real.key")
    expect(screen.getByTestId("t")).toHaveTextContent("definitely.not.a.real.key")
  })
})
