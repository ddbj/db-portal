import "@fontsource-variable/noto-sans-jp"
import "./styles/tailwind.css"

import { QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { I18nextProvider } from "react-i18next"
import {
  isRouteErrorResponse,
  Links,
  type LoaderFunctionArgs,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useRouteLoaderData,
} from "react-router"

import { ErrorPage } from "~/features/errors"
import { createI18nInstance } from "~/lib/i18n"
import { useLang } from "~/lib/i18n/use-lang"
import { createQueryClient } from "~/lib/query/client"
import { ShellLayout } from "~/shell"

export const meta = () => [
  { title: "DDBJ 刷新 (仮)" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { charSet: "utf-8" },
]

export const loader = ({ context }: LoaderFunctionArgs) => ({
  cspNonce: context.cspNonce,
})

const useCspNonce = (): string | undefined => {
  const data = useRouteLoaderData<typeof loader>("root")

  return data?.cspNonce
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const lang = useLang()
  const nonce = useCspNonce()

  return (
    <html lang={lang}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}

const AppShell = () => {
  const lang = useLang()
  const queryClient = useMemo(createQueryClient, [])
  const i18nInstance = useMemo(() => createI18nInstance(lang), [lang])

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18nInstance}>
        <ShellLayout>
          <Outlet />
        </ShellLayout>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

const App = () => <AppShell />

export default App

const ErrorBoundaryContent = () => {
  const error = useRouteError()
  const lang = useLang()
  const kind = isRouteErrorResponse(error) && error.status === 404 ? "not-found" : "generic"

  return <ErrorPage kind={kind} lang={lang} />
}

export const ErrorBoundary = () => {
  const lang = useLang()
  const queryClient = useMemo(createQueryClient, [])
  const i18nInstance = useMemo(() => createI18nInstance(lang), [lang])

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18nInstance}>
        <ShellLayout>
          <ErrorBoundaryContent />
        </ShellLayout>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
