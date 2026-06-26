import { render, type RenderResult, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import {
  createMemoryRouter,
  type LoaderFunctionArgs,
  RouterProvider,
} from "react-router"
import { describe, expect, test } from "vitest"

import { createI18nInstance, LangProvider } from "~/lib/i18n"
import DatabaseSlugRoute, { loader } from "~/routes/databases/$slug"

const callLoader = (slug: string | undefined): { slug: string } =>
  loader({
    params: slug === undefined ? {} : { slug },
    request: new Request(`http://localhost/databases/${slug ?? ""}`),
    context: {},
  } as unknown as LoaderFunctionArgs)

const renderRoute = (slug: string, lang: "ja" | "en" = "ja"): RenderResult => {
  const data = callLoader(slug)
  const router = createMemoryRouter(
    [{ path: "/databases/:slug", id: "db", loader, Component: DatabaseSlugRoute }],
    {
      initialEntries: [`/databases/${slug}`],
      hydrationData: { loaderData: { db: data } },
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

describe("databases/$slug loader", () => {
  test("loader_knownSlug_returnsSlug", () => {
    expect(callLoader("bioproject")).toEqual({ slug: "bioproject" })
    expect(callLoader("biosample")).toEqual({ slug: "biosample" })
  })

  test("loader_unknownSlug_throws404Response", () => {
    let thrown: unknown
    try {
      callLoader("does-not-exist")
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(404)
  })

  test("loader_emptySlugParam_throws404Response", () => {
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

describe("databases/$slug route render", () => {
  test("DatabaseSlugRoute_bioprojectJa_rendersTitleSubtitleAndBody", async () => {
    renderRoute("bioproject", "ja")
    expect(
      await screen.findByRole("heading", { name: "BioProject", level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/INSDC 共通のメタデータカタログ/).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole("heading", { name: "BioProject とは", level: 2 })).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_biosampleEn_rendersEnglishTitleAndDescription", async () => {
    renderRoute("biosample", "en")
    expect(
      await screen.findByRole("heading", { name: "BioSample", level: 1 }),
    ).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_bioprojectJa_rendersHeadingsInBody", async () => {
    renderRoute("bioproject", "ja")
    expect(
      await screen.findByRole("heading", { name: "アクセッション番号", level: 2 }),
    ).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_bioprojectJa_rendersCallout", async () => {
    renderRoute("bioproject", "ja")
    await screen.findByRole("heading", { name: "BioProject", level: 1 })
    expect(screen.getByText(/登録ナビ/)).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_bioprojectJa_rendersInternalLinksInBody", async () => {
    renderRoute("bioproject", "ja")
    await screen.findByRole("heading", { name: "BioProject", level: 1 })
    const link = screen.getByRole("link", { name: "登録ナビ" })
    expect(link).toHaveAttribute("href", "/submit")
  })
})
