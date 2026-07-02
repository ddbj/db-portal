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

  test("resolvePageTitle_pageContentResolverKnownPath_usesPageTitle", () => {
    const matches = chain({
      handle: { titleResolver: "page-content" },
      params: { "*": "bioproject" },
    })
    expect(resolvePageTitle(matches)).toBe("BioProject | Contents | BSI")
  })

  test("resolvePageTitle_pageContentResolverNestedPath_usesPageTitle", () => {
    const matches = chain({
      handle: { titleResolver: "page-content" },
      params: { "*": "policy/term-of-use" },
    })
    // 末尾ページの title は page-contents 側で変わりうるので、ネストパスが
    // 解決されて "<leaf> | Contents | BSI" 形になること (未解決の brand-only
    // ではないこと) を検証する。
    const title = resolvePageTitle(matches)
    expect(title).not.toBe("BSI")
    expect(title.endsWith(" | Contents | BSI")).toBe(true)
  })

  test("resolvePageTitle_pageContentResolverUnknownPath_fallsBackToBrand", () => {
    const matches = chain({
      handle: { titleResolver: "page-content" },
      params: { "*": "does-not-exist" },
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
      handle: { titleSegments: ["Static"], titleResolver: "page-content" },
      params: { "*": "bioproject" },
    })
    expect(resolvePageTitle(matches)).toBe("Static | BSI")
  })
})
