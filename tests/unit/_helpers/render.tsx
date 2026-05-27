import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderResult } from "@testing-library/react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"

import { createI18nInstance, LangProvider } from "~/lib/i18n"
import { createQueryClient } from "~/lib/query/client"

type Routes = Parameters<typeof createRoutesStub>[0]

export type RenderWithStubOptions = {
  routes: Routes
  initialEntries: string[]
  lang?: "ja" | "en"
  withQuery?: boolean
  queryClient?: QueryClient
}

const wrap = (
  ui: ReactNode,
  lang: "ja" | "en",
  withQuery: boolean,
  queryClient: QueryClient | undefined,
): ReactNode => {
  const i18n = createI18nInstance(lang)
  const inner = (
    <LangProvider value={lang}>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </LangProvider>
  )
  if (!withQuery) return inner
  const qc = queryClient ?? createQueryClient()

  return <QueryClientProvider client={qc}>{inner}</QueryClientProvider>
}

export const renderWithStub = ({
  routes,
  initialEntries,
  lang = "ja",
  withQuery = true,
  queryClient,
}: RenderWithStubOptions): RenderResult => {
  const Stub = createRoutesStub(routes)

  return render(wrap(<Stub initialEntries={initialEntries} />, lang, withQuery, queryClient))
}

export const renderWithQueryClient = (
  ui: ReactNode,
  queryClient: QueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  }),
): RenderResult =>
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

export const createNoRetryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
