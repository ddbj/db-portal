import { describe, expect, test } from "vitest"

import { resolvePageTitle, type TitleMatch } from "~/lib/content"

const rootMatch: TitleMatch = { handle: undefined, params: {} }

const chain = (...leaves: TitleMatch[]): TitleMatch[] => [rootMatch, ...leaves]

describe("resolvePageTitle", () => {
  test("resolvePageTitle_noTitleHandle_isBrandOnly", () => {
    expect(resolvePageTitle([rootMatch])).toBe("BSI")
  })

  test("resolvePageTitle_singleStaticSegment_readsLeafThenBrand", () => {
    const matches = chain({ handle: { titleSegments: ["Search"] }, params: {} })
    expect(resolvePageTitle(matches)).toBe("Search | BSI")
  })

  test("resolvePageTitle_multipleStaticSegments_isReverseBreadcrumb", () => {
    const matches = chain({ handle: { titleSegments: ["Search", "Results"] }, params: {} })
    expect(resolvePageTitle(matches)).toBe("Results | Search | BSI")
  })

  test("resolvePageTitle_databaseResolverKnownSlug_usesEnglishDbTitle", () => {
    const matches = chain({
      handle: { titleResolver: "database-content" },
      params: { slug: "bioproject" },
    })
    expect(resolvePageTitle(matches)).toBe("BioProject | Databases | BSI")
  })

  test("resolvePageTitle_databaseResolverUnknownSlug_fallsBackToBrand", () => {
    const matches = chain({
      handle: { titleResolver: "database-content" },
      params: { slug: "does-not-exist" },
    })
    expect(resolvePageTitle(matches)).toBe("BSI")
  })

  test("resolvePageTitle_unknownResolverName_fallsBackToBrand", () => {
    const matches = chain({ handle: { titleResolver: "nope" }, params: {} })
    expect(resolvePageTitle(matches)).toBe("BSI")
  })

  test("resolvePageTitle_deepestTitleHandleWins_ignoresAncestor", () => {
    const matches = chain(
      { handle: { titleSegments: ["Parent"] }, params: {} },
      { handle: { titleSegments: ["Child"] }, params: {} },
    )
    expect(resolvePageTitle(matches)).toBe("Child | BSI")
  })

  test("resolvePageTitle_staticAndDynamicOnSameHandle_staticWins", () => {
    const matches = chain({
      handle: { titleSegments: ["Static"], titleResolver: "database-content" },
      params: { slug: "bioproject" },
    })
    expect(resolvePageTitle(matches)).toBe("Static | BSI")
  })
})
