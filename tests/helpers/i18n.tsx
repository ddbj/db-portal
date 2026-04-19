import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { I18nextProvider } from "react-i18next"

import i18n from "@/i18n"

export const renderWithI18n = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  if (i18n.language !== "ja") {
    void i18n.changeLanguage("ja")
  }

  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    ),
    ...options,
  })
}
