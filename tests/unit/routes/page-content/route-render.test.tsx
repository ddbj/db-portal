import { render, type RenderResult, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import {
  createMemoryRouter,
  type LoaderFunctionArgs,
  RouterProvider,
} from "react-router"
import { describe, expect, test } from "vitest"

import { createI18nInstance, LangProvider } from "~/lib/i18n"
import PageContentRoute, { loader } from "~/routes/page-content/route"

const callLoader = (splat: string | undefined): { urlPath: string } =>
  loader({
    params: splat === undefined ? {} : { "*": splat },
    request: new Request(`http://localhost/${splat ?? ""}`),
    context: {},
  } as unknown as LoaderFunctionArgs)

const renderRoute = (splat: string, lang: "ja" | "en" = "ja"): RenderResult => {
  const data = callLoader(splat)
  const router = createMemoryRouter(
    [{ path: "/*", id: "pc", loader, Component: PageContentRoute }],
    {
      initialEntries: [`/${splat}`],
      hydrationData: { loaderData: { pc: data } },
    },
  )
  const i18n = createI18nInstance(lang)

  return render(
    <LangProvider value={lang}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </LangProvider>,
  )
}

describe("page-content loader", () => {
  test("loader_knownPath_returnsUrlPath", () => {
    expect(callLoader("bioproject")).toEqual({ urlPath: "/bioproject" })
    expect(callLoader("biosample")).toEqual({ urlPath: "/biosample" })
  })

  test("loader_nestedKnownPath_returnsUrlPath", () => {
    expect(callLoader("policy/term-of-use")).toEqual({ urlPath: "/policy/term-of-use" })
  })

  test("loader_unknownPath_throws404Response", () => {
    let thrown: unknown
    try {
      callLoader("does-not-exist")
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(404)
  })

  test("loader_emptySplatParam_throws404Response", () => {
    let thrown: unknown
    try {
      callLoader(undefined)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(404)
  })
})

describe("page-content route render", () => {
  test("PageContentRoute_bioprojectJa_rendersTitleSubtitleAndBody", async () => {
    renderRoute("bioproject", "ja")
    expect(
      await screen.findByRole("heading", { name: "BioProject", level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/INSDC 共通のメタデータカタログ/).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole("heading", { name: "BioProject とは", level: 2 })).toBeInTheDocument()
  })

  test("PageContentRoute_biosampleEn_rendersEnglishTitle", async () => {
    renderRoute("biosample", "en")
    expect(
      await screen.findByRole("heading", { name: "BioSample", level: 1 }),
    ).toBeInTheDocument()
  })

  test("PageContentRoute_bioprojectJa_rendersHeadingsInBody", async () => {
    renderRoute("bioproject", "ja")
    expect(
      await screen.findByRole("heading", { name: "アクセッション番号", level: 2 }),
    ).toBeInTheDocument()
  })

  test("PageContentRoute_bioprojectJa_rendersCallout", async () => {
    renderRoute("bioproject", "ja")
    await screen.findByRole("heading", { name: "BioProject", level: 1 })
    expect(screen.getByText(/登録ナビ/)).toBeInTheDocument()
  })

  test("PageContentRoute_bioprojectJa_rendersInternalLinksInBody", async () => {
    renderRoute("bioproject", "ja")
    await screen.findByRole("heading", { name: "BioProject", level: 1 })
    const link = screen.getByRole("link", { name: "登録ナビ" })
    expect(link).toHaveAttribute("href", "/submit")
  })
})
