import { screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { FeaturedServices } from "~/features/services"
import type { Lang } from "~/lib/i18n/use-lang"
import type { ServiceItem, ServiceList } from "~/schemas/api-bff/service"

import { createNoRetryClient, renderWithStub } from "../../_helpers/render"
import { servicesList } from "../../mocks/handlers"
import { server } from "../../mocks/server"

const buildItem = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "id",
  source: "ddbj",
  name: { ja: "名前", en: "Name" },
  description: { ja: "", en: "" },
  categories: [],
  rawCategories: [],
  featuredTop: true,
  ...overrides,
})

const featured = (
  id: string,
  en: string,
  overrides: Partial<ServiceItem> = {},
): ServiceItem =>
  buildItem({ id, name: { ja: en, en }, featuredTop: true, ...overrides })

// Drives the real FeaturedServices component against an msw-stubbed
// /api/services boundary and resolves once react-query has loaded the
// crafted items. A fresh no-retry client per render keeps the ["services"]
// query cache from leaking between tests.
const renderFeatured = async (items: ServiceItem[], lang: Lang = "en") => {
  server.use(servicesList(items))
  const result = renderWithStub({
    routes: [
      {
        path: "/",
        Component: () => <FeaturedServices lang={lang} />,
      },
    ],
    initialEntries: ["/"],
    lang,
    queryClient: createNoRetryClient(),
  })
  await waitFor(() => expect(result.container.querySelector("section")).not.toBeNull())

  return result
}

const renderedNames = (container: HTMLElement): string[] =>
  [...container.querySelectorAll("li")].map((li) => li.textContent ?? "")

// Serves /api/services while recording that the boundary was actually hit, so
// a "no list rendered" assertion can wait for the real data round-trip instead
// of racing the very first (pre-fetch) render where the <ul> is also absent.
const renderFeaturedTracked = async (items: ServiceList, lang: Lang = "en") => {
  let requested = false
  server.use(
    http.get("*/api/services", () => {
      requested = true

      return HttpResponse.json(items)
    }),
  )
  const result = renderWithStub({
    routes: [
      {
        path: "/",
        Component: () => <FeaturedServices lang={lang} />,
      },
    ],
    initialEntries: ["/"],
    lang,
    queryClient: createNoRetryClient(),
  })
  await waitFor(() => expect(requested).toBe(true))

  return result
}

describe("FeaturedServices filtering", () => {
  test("FeaturedServices_mixedFeaturedFlag_showsOnlyFeaturedTop", async () => {
    const items = [
      featured("a", "Alpha"),
      buildItem({ id: "b", name: { ja: "Beta", en: "Beta" }, featuredTop: false }),
      featured("c", "Gamma"),
    ]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(2))
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Gamma")).toBeInTheDocument()
    expect(screen.queryByText("Beta")).toBeNull()
  })

  test("FeaturedServices_mixedSources_keepsFeaturedAcrossDdbjAndDbcls", async () => {
    const items = [
      featured("a", "Repo", { source: "ddbj" }),
      featured("b", "Search", { source: "dbcls" }),
      buildItem({
        id: "c",
        source: "dbcls",
        name: { ja: "Hidden", en: "Hidden" },
        featuredTop: false,
      }),
    ]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(2))
    expect(screen.getByText("Repo")).toBeInTheDocument()
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.queryByText("Hidden")).toBeNull()
  })

  test("FeaturedServices_noFeaturedItems_rendersNoList", async () => {
    const items = [
      buildItem({ id: "a", name: { ja: "X", en: "X" }, featuredTop: false }),
      buildItem({ id: "b", name: { ja: "Y", en: "Y" }, featuredTop: false }),
    ]
    const { container } = await renderFeaturedTracked(items)
    // The boundary has answered with two non-featured items; the heading
    // section is always present, but the <ul> is gated on featured items.
    expect(container.querySelector("section")).not.toBeNull()
    expect(container.querySelector("ul")).toBeNull()
  })

  test("FeaturedServices_emptyData_rendersNoList", async () => {
    const { container } = await renderFeaturedTracked([])
    expect(container.querySelector("section")).not.toBeNull()
    expect(container.querySelector("ul")).toBeNull()
    expect(container.querySelector("li")).toBeNull()
  })
})

describe("FeaturedServices ordering", () => {
  test("FeaturedServices_unsortedNames_ordersByLocalizedNameAscending", async () => {
    const items = [featured("z", "Zebra"), featured("m", "Mango"), featured("a", "Apple")]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(3))
    expect(renderedNames(container)).toEqual(["Apple", "Mango", "Zebra"])
  })

  test("FeaturedServices_mixedCaseNames_comparesCaseInsensitively", async () => {
    // sensitivity:"base" treats "apple" and "BANANA" by their base letters,
    // so the alphabetical order ignores the difference in casing.
    const items = [featured("a", "BANANA"), featured("b", "apple"), featured("c", "Cherry")]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(3))
    expect(renderedNames(container)).toEqual(["apple", "BANANA", "Cherry"])
  })

  test("FeaturedServices_sameNameDifferentCase_treatedEqualSoInputOrderKept", async () => {
    // Under sensitivity:"base", "ALPHA" and "alpha" compare equal, so the
    // stable sort preserves the input order. A case-aware comparison would
    // instead pull the lowercase name ahead, which this pins against.
    const upperFirst = [featured("u", "ALPHA"), featured("l", "alpha")]
    const { container: c1 } = await renderFeatured(upperFirst)
    await waitFor(() => expect(c1.querySelectorAll("li")).toHaveLength(2))
    expect(renderedNames(c1)).toEqual(["ALPHA", "alpha"])

    const lowerFirst = [featured("l", "alpha"), featured("u", "ALPHA")]
    const { container: c2 } = await renderFeatured(lowerFirst)
    await waitFor(() => expect(c2.querySelectorAll("li")).toHaveLength(2))
    expect(renderedNames(c2)).toEqual(["alpha", "ALPHA"])
  })

  test("FeaturedServices_perLangName_sortsByRequestedLanguage", async () => {
    const items = [
      featured("x", "Zoo", { name: { ja: "あ", en: "Zoo" } }),
      featured("y", "Ant", { name: { ja: "ん", en: "Ant" } }),
    ]
    const { container } = await renderFeatured(items, "en")
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(2))
    // English sort: Ant before Zoo, independent of the Japanese names.
    expect(renderedNames(container)).toEqual(["Ant", "Zoo"])
  })
})

describe("FeaturedServices link rendering", () => {
  test("FeaturedServices_withUrl_rendersExternalLinkForName", async () => {
    const items = [
      featured("a", "Alpha", { url: { ja: "https://ja.example.com", en: "https://en.example.com" } }),
    ]
    await renderFeatured(items, "en")
    const link = await screen.findByRole("link", { name: /Alpha/ })
    expect(link).toHaveAttribute("href", "https://en.example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("FeaturedServices_withUrlJa_picksJaUrlInJaLang", async () => {
    const items = [
      featured("a", "Alpha", { url: { ja: "https://ja.example.com", en: "https://en.example.com" } }),
    ]
    await renderFeatured(items, "ja")
    const link = await screen.findByRole("link", { name: /Alpha/ })
    expect(link).toHaveAttribute("href", "https://ja.example.com")
  })

  test("FeaturedServices_withoutUrl_rendersPlainSpanNotLink", async () => {
    const items = [featured("a", "Alpha")]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(1))
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Alpha/ })).toBeNull()
  })

  test("FeaturedServices_mixedUrlPresence_linksOnlyItemsWithUrl", async () => {
    const items = [
      featured("a", "Linked", {
        url: { ja: "https://linked.example.com", en: "https://linked.example.com" },
      }),
      featured("b", "Plain"),
    ]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(2))
    expect(screen.getByRole("link", { name: /Linked/ })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Plain/ })).toBeNull()
    expect(screen.getByText("Plain")).toBeInTheDocument()
  })
})

describe("FeaturedServices descriptions", () => {
  test("FeaturedServices_withDescription_rendersDescriptionText", async () => {
    const items = [
      featured("a", "Alpha", { description: { ja: "説明文", en: "Alpha description" } }),
    ]
    await renderFeatured(items, "en")
    const item = await screen.findByText("Alpha")
    const li = item.closest("li")
    expect(li).not.toBeNull()
    // serviceDescription appends a trailing period when none is present.
    expect(within(li as HTMLElement).getByText("Alpha description.")).toBeInTheDocument()
  })

  test("FeaturedServices_emptyDescription_rendersNameOnly", async () => {
    const items = [featured("a", "Alpha", { description: { ja: "", en: "" } })]
    const { container } = await renderFeatured(items)
    await waitFor(() => expect(container.querySelectorAll("li")).toHaveLength(1))
    const li = container.querySelector("li")
    expect(li?.textContent).toBe("Alpha")
  })
})
