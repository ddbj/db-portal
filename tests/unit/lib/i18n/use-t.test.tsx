import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import { initI18n } from "~/lib/i18n"
import { useT } from "~/lib/i18n/use-t"

const Probe = ({ k }: { k: string }) => {
  const t = useT()

  return <span data-testid="t">{t(k)}</span>
}

const renderProbe = (lang: "ja" | "en", k: string) => {
  const i18n = initI18n(lang)

  return render(<I18nextProvider i18n={i18n}><Probe k={k} /></I18nextProvider>)
}

describe("useT", () => {
  test("useT_jaKey_resolvesToJa", () => {
    renderProbe("ja", "common.appName")
    expect(screen.getByTestId("t")).toHaveTextContent("DDBJ ポータル")
  })

  test("useT_enKey_resolvesToEn", () => {
    renderProbe("en", "common.appName")
    expect(screen.getByTestId("t")).toHaveTextContent("DDBJ Portal")
  })

  test("useT_breadcrumbKey_resolvesPerLang", () => {
    renderProbe("ja", "breadcrumb.databases")
    expect(screen.getByTestId("t")).toHaveTextContent("データベース")
  })
})
