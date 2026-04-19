import "./app.css"

import { useEffect } from "react"
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router"

import { AppShell } from "@/components/layout"
import i18n, { pickLang } from "@/i18n"

import type { Route } from "./+types/root"

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )

  return { lang }
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const data = useRouteLoaderData<typeof loader>("root")
  const lang = data?.lang ?? "ja"

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

const App = () => {
  const { lang } = useLoaderData<typeof loader>()

  if (typeof document === "undefined" && i18n.language !== lang) {
    void i18n.changeLanguage(lang)
  }

  useEffect(() => {
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang)
    }
  }, [lang])

  return <AppShell />
}

export default App

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
