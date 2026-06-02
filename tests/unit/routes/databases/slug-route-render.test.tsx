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

// Renders the real route component fed by the real loader's output. The loader
// runs to produce the hydrated data; the component then resolves its content via
// the same content loader the app uses, so this exercises the route's JSX exactly
// as production renders it for a given slug and language.
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
      screen.getByText(/研究プロジェクトと、そのプロジェクトに由来する/),
    ).toBeInTheDocument()
    expect(screen.getByText("BioProject とは")).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_biosampleEn_rendersEnglishTitleAndDescription", async () => {
    renderRoute("biosample", "en")
    expect(
      await screen.findByRole("heading", { name: "BioSample", level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/centrally captures attributes of the biological materials/),
    ).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_relatedDbsNonEmpty_rendersHeadingAndResolvedLink", async () => {
    renderRoute("bioproject", "ja")
    expect(
      await screen.findByRole("heading", { name: "関連データベース", level: 2 }),
    ).toBeInTheDocument()
    const link = screen.getByRole("link", { name: "BioSample" })
    expect(link).toHaveAttribute("href", "/databases/biosample")
  })

  test("DatabaseSlugRoute_relatedDbResolved_linkTextUsesTargetLangTitle", async () => {
    renderRoute("biosample", "en")
    await screen.findByRole("heading", { name: "BioSample", level: 1 })
    const link = screen.getByRole("link", { name: "BioProject" })
    expect(link).toHaveAttribute("href", "/databases/bioproject")
  })

  test("DatabaseSlugRoute_externalLinksNonEmpty_rendersHeadingAndExternalAnchors", async () => {
    renderRoute("bioproject", "ja")
    expect(
      await screen.findByRole("heading", { name: "外部リンク", level: 2 }),
    ).toBeInTheDocument()
    const ncbi = screen.getByRole("link", { name: /NCBI BioProject/ })
    expect(ncbi).toHaveAttribute("href", "https://www.ncbi.nlm.nih.gov/bioproject/")
    expect(ncbi).toHaveAttribute("target", "_blank")
    expect(ncbi).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("DatabaseSlugRoute_externalLinks_renderOneAnchorPerEntry", async () => {
    renderRoute("bioproject", "ja")
    await screen.findByRole("heading", { name: "外部リンク", level: 2 })
    expect(screen.getByRole("link", { name: /EBI BioStudies/ })).toHaveAttribute(
      "href",
      "https://www.ebi.ac.uk/biostudies/",
    )
    expect(
      screen.getByRole("link", { name: /DDBJ BioProject/ }),
    ).toHaveAttribute("href", "https://www.ddbj.nig.ac.jp/bioproject/index.html")
  })

  test("DatabaseSlugRoute_lastUpdatedJa_rendersJapaneseLocaleDateInTimeElement", async () => {
    renderRoute("bioproject", "ja")
    const time = await screen.findByText("2026年5月25日")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("dateTime", "2026-05-25T00:00:00Z")
  })

  test("DatabaseSlugRoute_lastUpdatedEn_rendersUsLocaleDateInTimeElement", async () => {
    renderRoute("bioproject", "en")
    const time = await screen.findByText("May 25, 2026")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("dateTime", "2026-05-25T00:00:00Z")
  })

  test("DatabaseSlugRoute_lastUpdatedJa_doesNotRenderEnLocaleString", async () => {
    renderRoute("bioproject", "ja")
    await screen.findByText("2026年5月25日")
    expect(screen.queryByText("May 25, 2026")).toBeNull()
  })

  test("DatabaseSlugRoute_lastUpdatedLabel_localizedPerLanguage", async () => {
    const { unmount } = renderRoute("bioproject", "ja")
    expect(await screen.findByText("最終更新")).toBeInTheDocument()
    unmount()
    renderRoute("bioproject", "en")
    expect(await screen.findByText("Last updated")).toBeInTheDocument()
  })

  test("DatabaseSlugRoute_singleDatabase_rendersExactlyOneTimeElement", async () => {
    const { container } = renderRoute("bioproject", "ja")
    await screen.findByRole("heading", { name: "BioProject", level: 1 })
    expect(container.querySelectorAll("time")).toHaveLength(1)
  })
})
