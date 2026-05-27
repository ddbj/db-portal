import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { ServiceCard } from "~/features/top/service-card"
import type { ServiceContent } from "~/schemas/content/service-content"

import { renderWithStub } from "../../_helpers/render"

const internalService: ServiceContent = {
  id: "search",
  title: { ja: "横断検索", en: "Cross-DB search" },
  description: { ja: "データから検索", en: "Search across databases" },
  link: { kind: "internal", to: "/search" },
  top: { category: "primary-service", order: 1 },
}

const externalService: ServiceContent = {
  id: "supercomputer",
  title: { ja: "遺伝研スパコン", en: "Supercomputer" },
  description: { ja: "計算機資源", en: "Computing resources" },
  link: { kind: "external", href: "https://sc.ddbj.nig.ac.jp/" },
  top: { category: "primary-service", order: 2 },
}

const noLinkService: ServiceContent = {
  id: "ghost",
  title: { ja: "リンク無し", en: "No link" },
  description: { ja: "x", en: "x" },
  submit: {
    service: "dra",
    externalUrl: "https://example.com",
    source: null,
    accessionPlaceholders: [],
  },
}

const renderCard = (
  service: ServiceContent,
  lang: "ja" | "en" = "ja",
) =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <ServiceCard service={service} lang={lang} /> },
      { path: "/search", Component: () => <span>search</span> },
      { path: "/en/search", Component: () => <span>search-en</span> },
    ],
    initialEntries: ["/"],
    lang,
  })

describe("ServiceCard", () => {
  test("ServiceCard_internalJa_buildsLinkWithoutLangPrefix", () => {
    renderCard(internalService, "ja")
    const link = screen.getByRole("link", { name: /横断検索/ })
    expect(link).toHaveAttribute("href", "/search")
    expect(link).not.toHaveAttribute("target")
  })

  test("ServiceCard_internalEn_buildsLinkWithEnPrefix", () => {
    renderCard(internalService, "en")
    const link = screen.getByRole("link", { name: /Cross-DB search/ })
    expect(link).toHaveAttribute("href", "/en/search")
  })

  test("ServiceCard_external_setsTargetAndRel", () => {
    renderCard(externalService)
    const link = screen.getByRole("link", { name: /遺伝研スパコン/ })
    expect(link).toHaveAttribute("href", "https://sc.ddbj.nig.ac.jp/")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("ServiceCard_external_rendersExternalIconInsideHeading", () => {
    renderCard(externalService)
    const heading = screen.getByRole("heading", { level: 3, name: /遺伝研スパコン/ })
    expect(heading.querySelector("svg")).not.toBeNull()
  })

  test("ServiceCard_internal_doesNotRenderExternalIcon", () => {
    renderCard(internalService)
    const heading = screen.getByRole("heading", { level: 3, name: /横断検索/ })
    expect(heading.querySelector("svg")).toBeNull()
  })

  test("ServiceCard_titleAndDescription_useGivenLang", () => {
    renderCard(internalService, "en")
    expect(screen.getByText("Cross-DB search")).toBeInTheDocument()
    expect(screen.getByText("Search across databases")).toBeInTheDocument()
    expect(screen.queryByText("横断検索")).toBeNull()
  })

  test("ServiceCard_noLink_rendersNull", () => {
    const { container } = renderCard(noLinkService)
    expect(container.querySelector("a")).toBeNull()
  })

  test("ServiceCard_serviceIcon_isAriaHidden", () => {
    renderCard(internalService)
    const link = screen.getByRole("link", { name: /横断検索/ })
    const innerSvgs = link.querySelectorAll("svg")
    expect(innerSvgs.length).toBeGreaterThan(0)
    for (const svg of innerSvgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true")
    }
  })

  test("ServiceCard_externalIcon_doesNotPollluteLinkName", () => {
    renderCard(externalService)
    const link = screen.getByRole("link", { name: /遺伝研スパコン/ })
    expect(link.getAttribute("aria-label")).toBeNull()
    const accessibleName = link.textContent ?? ""
    expect(accessibleName).not.toContain("external")
  })

  test("ServiceCard_iconWrapper_appliesBrandTokenClasses", () => {
    renderCard(internalService)
    const link = screen.getByRole("link", { name: /横断検索/ })
    const iconWrap = link.querySelector(".w-14")
    expect(iconWrap).not.toBeNull()
    expect(iconWrap).toHaveClass(
      "rounded-xl",
      "bg-surface-subtle",
      "border",
      "border-border-soft",
      "text-brand",
    )
  })
})
