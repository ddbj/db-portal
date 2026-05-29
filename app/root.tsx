import "@fontsource-variable/noto-sans-jp"
import "./styles/tailwind.css"

import { QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { I18nextProvider } from "react-i18next"
import {
  data,
  isRouteErrorResponse,
  Links,
  type LoaderFunctionArgs,
  Meta,
  type MetaArgs,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useRouteLoaderData,
} from "react-router"

import { ErrorPage } from "~/features/errors"
import { createI18nInstance, LangProvider } from "~/lib/i18n"
import { parseLangCookie, serializeLangCookie } from "~/lib/i18n/lang-cookie.server"
import { detectLangHint, resolveLang } from "~/lib/i18n/resolve-lang.server"
import type { Lang } from "~/lib/i18n/use-lang"
import { createQueryClient } from "~/lib/query/client"
import { ShellLayout } from "~/shell"

const readDefaultLang = (): Lang => {
  const value = process.env.DB_PORTAL_DEFAULT_LANG
  return value === "en" ? "en" : "ja"
}

const isSecureRuntime = (): boolean => process.env.DB_PORTAL_ENV !== "dev"

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const hint = detectLangHint(url.searchParams)
  const cookieLang = parseLangCookie(request.headers.get("Cookie"))
  const cookieOpts = { secure: isSecureRuntime() }
  const portalOrigin = process.env.DB_PORTAL_PORTAL_ORIGIN ?? ""

  if (hint !== null) {
    url.searchParams.delete("lang")
    const cleaned = `${url.pathname}${url.search}${url.hash}`
    return redirect(cleaned, {
      status: 302,
      headers: { "Set-Cookie": serializeLangCookie(hint, cookieOpts) },
    })
  }

  const lang = resolveLang({
    cookieLang,
    acceptLanguage: request.headers.get("Accept-Language"),
    defaultLang: readDefaultLang(),
  })

  const payload = { lang, cspNonce: context.cspNonce, portalOrigin }
  if (cookieLang === undefined) {
    return data(payload, {
      headers: { "Set-Cookie": serializeLangCookie(lang, cookieOpts) },
    })
  }
  return data(payload)
}

export const meta = ({ data: loaderData, location }: MetaArgs<typeof loader>) => {
  const origin = loaderData?.portalOrigin ?? ""
  const path = location.pathname
  const href = (lang: Lang): string => `${origin}${path}?lang=${lang}`
  return [
    { title: "DDBJ 刷新 (仮)" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { charSet: "utf-8" },
    { tagName: "link", rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { tagName: "link", rel: "alternate", hrefLang: "ja", href: href("ja") },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: href("en") },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: href("ja") },
  ]
}

const useRootLoaderData = () => useRouteLoaderData<typeof loader>("root")

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const rootData = useRootLoaderData()
  const lang: Lang = rootData?.lang ?? "ja"
  const nonce = rootData?.cspNonce

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

const AppShell = ({ lang }: { lang: Lang }) => {
  const queryClient = useMemo(createQueryClient, [])
  const i18nInstance = useMemo(() => createI18nInstance(lang), [lang])

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider value={lang}>
        <I18nextProvider i18n={i18nInstance}>
          <ShellLayout>
            <Outlet />
          </ShellLayout>
        </I18nextProvider>
      </LangProvider>
    </QueryClientProvider>
  )
}

const App = () => {
  const rootData = useRootLoaderData()
  const lang: Lang = rootData?.lang ?? "ja"
  return <AppShell lang={lang} />
}

export default App

const ErrorBoundaryContent = () => {
  const error = useRouteError()
  const kind = isRouteErrorResponse(error) && error.status === 404 ? "not-found" : "generic"

  return <ErrorPage kind={kind} />
}

export const ErrorBoundary = () => {
  const rootData = useRootLoaderData()
  const lang: Lang = rootData?.lang ?? "ja"
  const queryClient = useMemo(createQueryClient, [])
  const i18nInstance = useMemo(() => createI18nInstance(lang), [lang])

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider value={lang}>
        <I18nextProvider i18n={i18nInstance}>
          <ShellLayout>
            <ErrorBoundaryContent />
          </ShellLayout>
        </I18nextProvider>
      </LangProvider>
    </QueryClientProvider>
  )
}
