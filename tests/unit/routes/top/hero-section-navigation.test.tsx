import { QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, test } from "vitest"

import { createI18nInstance, LangProvider } from "~/lib/i18n"
import { createQueryClient } from "~/lib/query/client"
import { HeroSection } from "~/routes/top/hero-section"

// The hero's only side effect is navigating to the results URL it builds from
// the trimmed keyword and the selected DB scope. A memory data router gives the
// hero its required useNavigation context; only `/` is defined, so the results
// navigation settles as a no-data location change whose pathname + search is the
// externally observable contract, read straight off the router state.
const renderHero = (): ReturnType<typeof createMemoryRouter> => {
  const router = createMemoryRouter(
    [{ path: "/", Component: () => <HeroSection /> }],
    { initialEntries: ["/"] },
  )
  render(
    <LangProvider value="ja">
      <I18nextProvider i18n={createI18nInstance("ja")}>
        <QueryClientProvider client={createQueryClient()}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </I18nextProvider>
    </LangProvider>,
  )

  return router
}

const typeKeyword = (value: string): void => {
  fireEvent.change(screen.getByRole("textbox"), { target: { value } })
}

const submitSearch = (): void => {
  fireEvent.submit(screen.getByRole("search"))
}

const selectScope = (optionPattern: RegExp): void => {
  fireEvent.click(screen.getByRole("button", { name: /検索対象/ }))
  fireEvent.click(screen.getByRole("option", { name: optionPattern }))
}

// The hero navigation resolves on a microtask, so settle before reading.
const navigatedHref = async (router: ReturnType<typeof createMemoryRouter>): Promise<string> => {
  await Promise.resolve()
  const { pathname, search } = router.state.location

  return `${pathname}${search}`
}

describe("HeroSection navigation", () => {
  test("HeroSection_keywordWithAllScope_navigatesWithoutDbParam", async () => {
    const router = renderHero()
    typeKeyword("cancer")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results?q=cancer")
  })

  test("HeroSection_keywordWithDbScope_navigatesWithDbSlug", async () => {
    const router = renderHero()
    selectScope(/BioProject/)
    typeKeyword("cancer")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results?q=cancer&db=bioproject")
  })

  test("HeroSection_biosampleScope_mapsToBiosampleSlug", async () => {
    const router = renderHero()
    selectScope(/^BioSample$/)
    typeKeyword("cancer")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results?q=cancer&db=biosample")
  })

  test("HeroSection_ddbjScope_mapsToTradSlug", async () => {
    const router = renderHero()
    selectScope(/^DDBJ$/)
    typeKeyword("cancer")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results?q=cancer&db=ddbj")
  })

  test("HeroSection_whitespaceOnlyKeyword_navigatesWithTrimmedEmptyQuery", async () => {
    const router = renderHero()
    typeKeyword("   ")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results")
  })

  test("HeroSection_whitespaceOnlyKeywordWithDbScope_keepsDbDropsQuery", async () => {
    const router = renderHero()
    selectScope(/BioProject/)
    typeKeyword("   ")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results?db=bioproject")
  })

  test("HeroSection_keywordSurroundedByWhitespace_isTrimmed", async () => {
    const router = renderHero()
    typeKeyword("  cancer  ")
    submitSearch()
    expect(await navigatedHref(router)).toBe("/search/results?q=cancer")
  })
})
