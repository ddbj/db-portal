import "@fontsource-variable/noto-sans-jp"
import "./styles/tailwind.css"

import { QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { I18nextProvider } from "react-i18next"
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router"

import { initI18n } from "~/lib/i18n"
import { useLang } from "~/lib/i18n/use-lang"
import { useT } from "~/lib/i18n/use-t"
import { createQueryClient } from "~/lib/query/client"

export const meta = () => [
  { title: "DB Portal" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { charSet: "utf-8" },
]

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const lang = useLang()

  return (
    <html lang={lang}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

const AppShell = () => {
  const lang = useLang()
  const queryClient = useMemo(createQueryClient, [])
  const i18nInstance = useMemo(() => initI18n(lang), [lang])

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18nInstance}>
        <Outlet />
      </I18nextProvider>
    </QueryClientProvider>
  )
}

const App = () => <AppShell />

export default App

export const ErrorBoundary = () => {
  const error = useRouteError()
  initI18n("ja")
  const t = useT()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : t("common.error")

  return (
    <main className="mx-auto max-w-content-max px-page-gutter py-section-md">
      <h1 className="text-fs-h1 font-bold text-ink">{message}</h1>
    </main>
  )
}
