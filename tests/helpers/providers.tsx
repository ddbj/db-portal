import { QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { MemoryRouter } from "react-router"

import i18n from "@/i18n"
import { createQueryClient } from "@/lib/query-client"

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string
  lang?: "ja" | "en"
}

export const renderWithProviders = (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) => {
  const { route = "/", lang = "ja", ...rest } = options
  if (i18n.language !== lang) void i18n.changeLanguage(lang)
  const queryClient = createQueryClient()

  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    ),
    ...rest,
  })
}
